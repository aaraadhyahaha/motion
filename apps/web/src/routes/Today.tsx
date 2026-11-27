// #task #sched Today: overdue + due today, from the shared 14-day agenda. Entry chunk (not lazy).
import { useRef } from 'react';
import { Empty } from '../components/Empty';
import { PageHeader } from '../components/PageHeader';
import { TaskList } from '../components/TaskList';
import { useAgenda } from '../data/queries';
import { fmtDayLong, localToday } from '../lib/format';

const W = 'no one two three four five six seven eight nine'.split(' ');
const w = (n: number) => W[n] ?? `${n}`;
/** "Four on the desk, one carried over." */
function note(due: number, over: number): string {
  const s = due
    ? `${w(due)} on the desk${over ? `, ${w(over)} carried over` : ''}.`
    : over
      ? `${w(over)} carried over.`
      : '';
  return s && ` ${s[0]?.toUpperCase()}${s.slice(1)}`;
}

export default function Today() {
  const { data, isPending, isError, refetch } = useAgenda(14);
  const today = data?.today ?? localToday();
  // Rolled-forward recurring tasks leave this slot; TaskList lingers a done snapshot of them (ghost) first.
  const overdue = data?.overdue.filter((t) => !t.dueDate || t.dueDate < today) ?? [];
  const due = data?.days[today]?.filter((t) => !t.dueDate || t.dueDate <= today) ?? [];
  const over = overdue.filter((t) => !t.done).length;
  const left = due.filter((t) => !t.done).length;
  const open = over + left > 0;
  // "Today's done": the desk emptied by a tick seen here (fresh doneAt). Latched until a row reopens or we leave.
  const done = useRef(false);
  if (open) done.current = false;
  else if ([...overdue, ...due].some((t) => t.done && Date.now() - (t.doneAt ?? 0) < 1500))
    done.current = true;

  return (
    <>
      <PageHeader title="Today" swash subtitle={`${fmtDayLong(today)}.${note(left, over)}`} />
      {isError ? (
        <Empty title="Today didn’t load." onRetry={refetch} />
      ) : (
        <>
          <TaskList tasks={overdue} title="Overdue" tone="overdue" showDate />
          <TaskList tasks={due} title={overdue.length ? 'Today' : undefined} />
          {!isPending && !open && (
            <Empty
              moment={done.current}
              title={done.current ? 'Today’s done.' : 'Desk’s clear.'}
              hint={
                done.current
                  ? 'Everything on the desk is handled. Make tea.'
                  : 'Nothing due today. Go make something, or make tea.'
              }
            />
          )}
        </>
      )}
    </>
  );
}
