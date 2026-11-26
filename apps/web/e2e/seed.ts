// #wf e2e helpers: REST seeding against the isolated worker (via vite proxy).
import type { APIRequestContext } from '@playwright/test';

export const API = 'http://localhost:8787/api';

type Agenda = { today: string };
type Task = { id: string; title: string };

export async function today(req: APIRequestContext): Promise<string> {
  await req.patch(`${API}/settings`, { data: { tz: 'UTC' } });
  return ((await (await req.get(`${API}/agenda?days=14`)).json()) as Agenda).today;
}

export const addDays = (d: string, n: number) => {
  const t = new Date(`${d}T00:00:00Z`);
  t.setUTCDate(t.getUTCDate() + n);
  return t.toISOString().slice(0, 10);
};

export async function create(req: APIRequestContext, data: Record<string, unknown>): Promise<Task> {
  const r = await req.post(`${API}/tasks`, { data });
  if (!r.ok()) throw new Error(`seed ${r.status()}: ${await r.text()}`);
  return (await r.json()) as Task;
}

/** Delete open tasks whose title matches (keeps reruns against a reused DB idempotent). */
export async function purge(req: APIRequestContext, q: string) {
  const r = await req.get(`${API}/tasks?status=all&q=${encodeURIComponent(q)}&limit=100`);
  const { items } = (await r.json()) as { items: Task[] };
  for (const t of items) await req.delete(`${API}/tasks/${t.id}`);
}

/** Delete every open task on Today (overdue + due today) so "Today's done" is reachable. */
export async function clearToday(req: APIRequestContext) {
  const d = await today(req);
  const a = (await (await req.get(`${API}/agenda?days=1`)).json()) as {
    overdue: Task[];
    days: Record<string, Task[]>;
  };
  for (const t of [...a.overdue, ...(a.days[d] ?? [])]) await req.delete(`${API}/tasks/${t.id}`);
}

/** True once the idle-loaded keyboard chunk has installed its listener. */
export const keysReady = `'keys' in document.documentElement.dataset`;
