// #sched #ui Upcoming: next 13 days after today from the shared 14-day agenda; sticky day headers, empty days collapse.
import { addDays } from '@motion/core/dates';
import { Empty } from '../components/Empty';
import { PageHeader } from '../components/PageHeader';
import { TaskList } from '../components/TaskList';
import { useAgenda } from '../data/queries';
import { fmtDay, fmtDayLong, localToday } from '../lib/format';

export default function Upcoming() {
  const { data, isPending, isError, refetch } = useAgenda(14);
  const today = data?.today ?? localToday();
  const days = Array.from({ length: 13 }, (_, i) => addDays(today, i + 1)).map((day) => ({
    day,
    // rolled-forward recurring tasks leave their old slot; TaskList lingers a done snapshot (ghost) first
    tasks: data?.days[day]?.filter((t) => !t.dueDate || t.dueDate === day) ?? [],
  }));
  const any = days.some((d) => d.tasks.some((t) => !t.done));

  return (
    <>
      <PageHeader
        title="Upcoming"
        subtitle={`${fmtDay(addDays(today, 1))} – ${fmtDay(addDays(today, 13))}`}
      />
      {isError ? (
        <Empty title="Upcoming didn’t load." onRetry={refetch} />
      ) : (
        <>
          {days.map(({ day, tasks }, i) => (
            <TaskList key={day} tasks={tasks} title={i ? fmtDayLong(day) : 'Tomorrow'} sticky />
          ))}
          {!isPending && !any && (
            <Empty
              icon="upcoming"
              title="Two quiet weeks."
              hint="Anything with a date lands here. Press N to add one."
            />
          )}
        </>
      )}
    </>
  );
}
