// #ui tiny toast store (useSyncExternalStore). One toast at a time; one 5 s timer only while shown.
import { useSyncExternalStore } from 'react';

export interface Toast {
  id: number;
  msg: string;
  action?: { label: string; run: () => void };
}

const TTL = 5_000;
let cur: Toast | null = null;
let seq = 0;
let timer: ReturnType<typeof setTimeout> | undefined;
const subs = new Set<() => void>();

function set(t: Toast | null) {
  clearTimeout(timer);
  cur = t;
  if (t) timer = setTimeout(() => dismiss(t.id), TTL);
  for (const f of subs) f();
}

export function toast(msg: string, action?: Toast['action']): number {
  const id = ++seq;
  set({ id, msg, action });
  return id;
}

/** Dismiss the current toast (or only if it is still `id`). */
export function dismiss(id?: number) {
  if (cur && (id === undefined || cur.id === id)) set(null);
}

const subscribe = (f: () => void) => (subs.add(f), () => subs.delete(f));
export const useToast = () =>
  useSyncExternalStore(
    subscribe,
    () => cur,
    () => null,
  );
