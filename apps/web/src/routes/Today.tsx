// #task #sched Today: overdue + due today, from the shared 14-day agenda. Entry chunk (not lazy).
import { Empty } from '../components/Empty';
import { PageHeader } from '../components/PageHeader';
import { TaskList } from '../components/TaskList';
import { useAgenda } from '../data/queries';
import { fmtDayLong, localToday } from '../lib/format';

export default function Today() {
  const { data, isPending, isError } = useAgenda(14);
  const today = data?.today ?? localToday();
  // Rolled-forward recurring tasks keep their old slot until the agenda refetches; hide them now.
  const overdue = data?.overdue.filter((t) => !t.dueDate || t.dueDate < today) ?? [];
  const due = data?.days[today]?.filter((t) => !t.dueDate || t.dueDate <= today) ?? [];
  const open = overdue.some((t) => !t.done) || due.some((t) => !t.done);

  return (
    <>
      <PageHeader title="Today" subtitle={fmtDayLong(today)} />
      {isError ? (
        <Empty icon="close" title="Couldn’t load Today" hint="Check your connection — it’ll retry." />
      ) : (
        <>
          <TaskList tasks={overdue} title="Overdue" tone="overdue" showDate />
          <TaskList tasks={due} title={overdue.length ? 'Today' : undefined} />
          {!isPending && !open && <Empty title="All done for today" hint="Press N to add a task." />}
        </>
      )}
    </>
  );
}
