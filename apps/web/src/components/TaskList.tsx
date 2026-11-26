// #task #ui #anim task list: memo rows, stable keys, done rows linger ~600 ms → fade/scale out → siblings FLIP up.
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
};

export function TaskList({ tasks, title, tone, showDate, sticky, keepDone }: Props) {
  const { data: lists } = useLists();
  const byId = useMemo(() => new Map(lists?.map((l) => [l.id, l])), [lists]);
  const { mutate: complete } = useComplete();
  const { mutate: uncomplete } = useUncomplete();
  const [leaving, setLeaving] = useState<Ids>(new Set());
  const [gone, setGone] = useState<Ids>(new Set());
  const ref = useRef<HTMLUListElement>(null);
  useFlip(ref);

  // Schedule the leave for freshly completed rows; forget ids that were un-completed (undo).
  useEffect(() => {
    if (keepDone) return;
    const timers: ReturnType<typeof setTimeout>[] = [];
    for (const t of tasks) {
      if (!t.done) {
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
  }, [tasks, leaving, gone, keepDone]);

  const onToggle = useCallback(
    (id: string, done: boolean) => (done ? complete(id) : uncomplete(id)),
    [complete, uncomplete],
  );
  const onLeft = useCallback((id: string) => {
    setGone((s) => plus(s, id));
    setLeaving((s) => minus(s, id));
  }, []);

  const now = Date.now();
  const rows = keepDone
    ? tasks
    : tasks.filter(
        (t) => !t.done || leaving.has(t.id) || (!gone.has(t.id) && now - (t.doneAt ?? 0) < LINGER * 2),
      );
  if (!rows.length) return null;

  return (
    <section className="task-section" data-tone={tone} data-sticky={sticky || undefined}>
      {title && <h2 className="task-section-title t-headline">{title}</h2>}
      <ul className="task-list" ref={ref}>
        {rows.map((t) => (
          <TaskRow
            key={t.id}
            task={t}
            list={byId.get(t.listId)}
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
