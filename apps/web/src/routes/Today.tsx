// #task #sched Today: overdue + due today, from the shared 14-day agenda. Entry chunk (not lazy).
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
  const { data, isPending, isError } = useAgenda(14);
  const today = data?.today ?? localToday();
  // Rolled-forward recurring tasks keep their old slot until the agenda refetches; hide them now.
  const overdue = data?.overdue.filter((t) => !t.dueDate || t.dueDate < today) ?? [];
  const due = data?.days[today]?.filter((t) => !t.dueDate || t.dueDate <= today) ?? [];
  const over = overdue.filter((t) => !t.done).length;
  const left = due.filter((t) => !t.done).length;
  const open = over + left > 0;

  return (
    <>
      <PageHeader title="Today" subtitle={`${fmtDayLong(today)}.${note(left, over)}`} />
      {isError ? (
        <Empty icon="close" title="Couldn’t load Today" hint="Check your connection — it’ll retry." />
      ) : (
        <>
          <TaskList tasks={overdue} title="Overdue" tone="overdue" showDate />
          <TaskList tasks={due} title={overdue.length ? 'Today' : undefined} />
          {!isPending && !open && (
            <Empty title="Desk’s clear." hint="Nothing due today. Go make something, or make tea." />
          )}
        </>
      )}
    </>
  );
}
