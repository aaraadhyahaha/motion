// #task #ui #anim task list: memo rows, stable keys, done rows linger ~600 ms → leave → siblings + card FLIP up.
// Recurring rows roll forward on the server (not done, new date): a done snapshot (ghost) lingers in their place.
import type { Task } from '@motion/core/schemas';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useComplete, useUncomplete } from '../data/mutations';
import { useLists } from '../data/queries';
import { useFlip } from '../lib/flip';
import { TaskRow } from './TaskRow';

const LINGER = 600;
type Ids = ReadonlySet<string>;
const plus = (s: Ids, id: string): Ids => (s.has(id) ? s : new Set(s).add(id));
const minus = (s: Ids, id: string): Ids => {
  if (!s.has(id)) return s;
  const n = new Set(s);
  n.delete(id);
  return n;
};

type Props = {
  tasks: Task[];
  title?: string;
  tone?: 'overdue';
  showDate?: boolean;
  /** Section title sticks under the nav bar (Upcoming day headers). */
  sticky?: boolean;
  /** Done rows stay put — no linger/leave (Logbook). */
  keepDone?: boolean;
  /** Current list view: rows of this list skip the redundant "• List" meta. */
  listId?: string;
};

export function TaskList({ tasks, title, tone, showDate, sticky, keepDone, listId }: Props) {
  const { data: lists } = useLists();
  const byId = useMemo(() => new Map(lists?.map((l) => [l.id, l])), [lists]);
  const { mutate: complete } = useComplete();
  const { mutate: uncomplete } = useUncomplete();
  const [leaving, setLeaving] = useState<Ids>(new Set());
  const [gone, setGone] = useState<Ids>(new Set());
  const ref = useRef<HTMLUListElement>(null);
  /** id → [done snapshot, index]: shown while the cache says rolled forward (or filtered out). */
  const ghosts = useRef(new Map<string, [Task, number]>());
  useFlip(ref);

  const view = useMemo(() => {
    if (keepDone) return tasks;
    const g = ghosts.current;
    const ids = new Set<string>();
    const v = tasks.map((t) => {
      ids.add(t.id);
      const s = g.get(t.id)?.[0];
      return s && !t.done && t.dueDate !== s.dueDate && !gone.has(t.id) ? s : t;
    });
    for (const [id, [s, i]] of g) if (!ids.has(id) && !gone.has(id)) v.splice(i, 0, s);
    return v;
  }, [tasks, gone, keepDone]);

  // Schedule the leave for freshly completed rows; forget ids that were un-completed (undo).
  useEffect(() => {
    if (keepDone) return;
    const timers: ReturnType<typeof setTimeout>[] = [];
    for (const [i, t] of view.entries()) {
      if (t.done && Date.now() - (t.doneAt ?? 0) < LINGER * 2) ghosts.current.set(t.id, [t, i]);
      if (!t.done) {
        ghosts.current.delete(t.id);
        setLeaving((s) => minus(s, t.id));
        setGone((s) => minus(s, t.id));
      } else if (!leaving.has(t.id) && !gone.has(t.id)) {
        const wait = Math.max(0, LINGER - (Date.now() - (t.doneAt ?? 0)));
        timers.push(setTimeout(() => setLeaving((s) => plus(s, t.id)), wait));
      }
    }
    return () => {
      for (const x of timers) clearTimeout(x);
    };
  }, [view, leaving, gone, keepDone]);

  const onToggle = useCallback(
    (id: string, done: boolean) => (done ? complete(id) : uncomplete(id)),
    [complete, uncomplete],
  );
  const onLeft = useCallback((id: string) => {
    ghosts.current.delete(id);
    setGone((s) => plus(s, id));
    setLeaving((s) => minus(s, id));
  }, []);

  const now = Date.now();
  const rows = keepDone
    ? tasks
    : view.filter(
        (t) => !t.done || leaving.has(t.id) || (!gone.has(t.id) && now - (t.doneAt ?? 0) < LINGER * 2),
      );
  if (!rows.length) return null;

  return (
    <section className="task-section" data-tone={tone} data-sticky={sticky || undefined}>
      {title && (
        <h2 className="task-section-title t-title3">
          {title} <span className="task-count mono">{rows.filter((t) => !t.done).length || ''}</span>
        </h2>
      )}
      <ul className="task-list" ref={ref}>
        {rows.map((t) => (
          <TaskRow
            key={t.id}
            task={t}
            list={t.listId === listId ? undefined : byId.get(t.listId)}
            showDate={showDate}
            leaving={leaving.has(t.id)}
            onToggle={onToggle}
            onLeft={onLeft}
          />
        ))}
      </ul>
    </section>
  );
}
