// #api /api/changes poller (plan §5). Visibility-gated; 15 s → ×2 per empty poll → 5 min cap.
// Zero work while hidden: the single timer is cleared and nothing is rescheduled.
import type { Changes, List, Tag } from '@motion/core/schemas';
import type { QueryClient } from '@tanstack/react-query';
import { api } from './api';
import { keys } from './keys';

export const MIN_MS = 15_000;
export const MAX_MS = 300_000;

export interface PollerDeps {
  fetch: (since: number) => Promise<Changes>;
  /** Apply a batch; return true if it held real (non-echo) changes. */
  apply: (c: Changes) => boolean;
  doc?: Pick<Document, 'visibilityState' | 'addEventListener' | 'removeEventListener'>;
  win?: Pick<Window, 'addEventListener' | 'removeEventListener'>;
}

export function createPoller({ fetch, apply, doc = document, win = window }: PollerDeps) {
  let since: number | null = null;
  let delay = MIN_MS;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let busy = false;
  let stopped = false;
  const visible = () => doc.visibilityState === 'visible';

  const schedule = () => {
    clearTimeout(timer);
    if (!stopped && visible()) timer = setTimeout(tick, delay);
  };

  async function tick() {
    clearTimeout(timer);
    if (busy || stopped || !visible()) return;
    busy = true;
    try {
      // Bootstrap from the server clock: since=MAX returns nothing but a fresh `next`.
      const c = await fetch(since ?? Number.MAX_SAFE_INTEGER);
      const first = since === null;
      since = c.next;
      delay = first || apply(c) ? MIN_MS : Math.min(delay * 2, MAX_MS);
    } catch {
      delay = Math.min(delay * 2, MAX_MS);
    } finally {
      busy = false;
    }
    schedule();
  }

  const now = () => void tick();
  const onVis = () => (visible() ? now() : clearTimeout(timer));

  return {
    start() {
      doc.addEventListener('visibilitychange', onVis);
      win.addEventListener('focus', now);
      win.addEventListener('online', now);
      now();
      return () => {
        stopped = true;
        clearTimeout(timer);
        doc.removeEventListener('visibilitychange', onVis);
        win.removeEventListener('focus', now);
        win.removeEventListener('online', now);
      };
    },
    /** User action / own mutation: back to the fast cadence. */
    poke() {
      delay = MIN_MS;
      if (!busy) schedule();
    },
    get delay() {
      return delay;
    },
  };
}

// ── echo + overlap dedupe: last updatedAt seen per task (own mutations + applied polls) ──
const seen = new Map<string, number>();
const SEEN_CAP = 500;
export function markSeen(id: string, updatedAt: number) {
  seen.delete(id);
  seen.set(id, updatedAt);
  if (seen.size > SEEN_CAP) seen.delete(seen.keys().next().value as string);
}
export const markDeleted = (id: string) => markSeen(`-${id}`, 0);
const fresh = (id: string, at: number) => (seen.get(id) ?? -1) < at;

function upsert<T extends { id: string }>(prev: T[] | undefined, add: T[], del: string[]): T[] | undefined {
  if (!prev || (!add.length && !del.length)) return prev;
  const m = new Map(prev.map((x) => [x.id, x]));
  for (const x of add) m.set(x.id, x);
  for (const id of del) m.delete(id);
  return [...m.values()];
}

export function applyChanges(qc: QueryClient, c: Changes): boolean {
  if (c.full) {
    void qc.invalidateQueries();
    return true;
  }
  qc.setQueryData<List[]>(keys.lists, (p) =>
    upsert(p, c.lists, c.deleted.lists)?.sort((a, b) => a.position - b.position),
  );
  qc.setQueryData<Tag[]>(keys.tags, (p) => upsert(p, c.tags, c.deleted.tags));
  const tasks = c.tasks.filter((t) => fresh(t.id, t.updatedAt));
  const gone = c.deleted.tasks.filter((id) => fresh(`-${id}`, 0));
  for (const t of tasks) markSeen(t.id, t.updatedAt);
  for (const id of gone) markDeleted(id);
  if (tasks.length || gone.length) {
    for (const t of tasks) qc.setQueryData(keys.task(t.id), (p: unknown) => (p ? t : p));
    for (const k of [keys.agendaAll, keys.tasksAll, keys.statsAll])
      void qc.invalidateQueries({ queryKey: k });
  }
  return !!(
    tasks.length ||
    gone.length ||
    c.lists.length ||
    c.tags.length ||
    c.deleted.lists.length ||
    c.deleted.tags.length
  );
}

let poller: ReturnType<typeof createPoller> | null = null;

export function startSync(qc: QueryClient): () => void {
  poller = createPoller({
    fetch: (since) => api<Changes>('GET', `/changes?since=${since}`),
    apply: (c) => applyChanges(qc, c),
  });
  return poller.start();
}
export const pokeSync = () => poller?.poke();
