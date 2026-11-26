// #api pure cache helpers. Each accepts any task-holding cache shape (agenda, infinite task pages, single task)
// and returns the SAME reference when nothing changed, so untouched queries don't re-render.
import type { Agenda, Page, Task } from '@motion/core/schemas';

type Pages = { pages: Page<Task>[]; pageParams: unknown[] };
type Edit = (t: Task) => Task | null; // null = remove

function mapList(list: Task[], id: string, edit: Edit): Task[] {
  const i = list.findIndex((t) => t.id === id);
  if (i < 0) return list;
  const next = edit(list[i] as Task);
  const out = list.slice();
  next ? (out[i] = next) : out.splice(i, 1);
  return out;
}

function apply<T>(data: T, id: string, edit: Edit): T {
  if (!data || typeof data !== 'object') return data;
  if ('overdue' in data) {
    const a = data as unknown as Agenda;
    const overdue = mapList(a.overdue, id, edit);
    let changed = overdue !== a.overdue;
    const days: Agenda['days'] = {};
    for (const [k, v] of Object.entries(a.days)) {
      days[k] = mapList(v, id, edit);
      changed ||= days[k] !== v;
    }
    return (changed ? { ...a, overdue, days } : data) as T;
  }
  if ('pages' in data) {
    const d = data as unknown as Pages;
    let changed = false;
    const pages = d.pages.map((p) => {
      const items = mapList(p.items, id, edit);
      if (items === p.items) return p;
      changed = true;
      return { ...p, items };
    });
    return (changed ? { ...d, pages } : data) as T;
  }
  if ('id' in data && (data as unknown as Task).id === id)
    return (edit(data as unknown as Task) ?? undefined) as T;
  return data;
}

/** Merge `patch` into task `id` wherever it appears. */
export const patchTask = <T>(data: T, id: string, patch: Partial<Task>): T =>
  apply(data, id, (t) => ({ ...t, ...patch }));

/** Drop task `id` wherever it appears (a single-task cache becomes undefined). */
export const removeTask = <T>(data: T, id: string): T => apply(data, id, () => null);
