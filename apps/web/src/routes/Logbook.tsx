// #task #ui Logbook: done tasks grouped by completion day (newest first); unchecking = uncomplete. Lazy chunk.
import type { Task } from '@motion/core/schemas';
import { useRef } from 'react';
import { Empty } from '../components/Empty';
import { PageHeader } from '../components/PageHeader';
import { TaskList } from '../components/TaskList';
import { useTasks } from '../data/queries';
import { fmtDayLong, localToday } from '../lib/format';
import { useSentinel } from '../lib/useSentinel';

const dayOf = (ms: number) => new Date(ms).toLocaleDateString('en-CA');

export default function Logbook() {
  const q = useTasks({ status: 'done' });
  const more = useSentinel(() => !q.isFetchingNextPage && void q.fetchNextPage(), !!q.hasNextPage);
  // Pin each row to the day first seen: unchecking clears doneAt optimistically, the row must not jump.
  const pinned = useRef(new Map<string, string>()).current;
  const groups = new Map<string, Task[]>();
  for (const t of q.data?.pages.flatMap((p) => p.items) ?? []) {
    let day = pinned.get(t.id);
    if (!day) {
      day = t.doneAt ? dayOf(t.doneAt) : localToday();
      pinned.set(t.id, day);
    }
    const g = groups.get(day);
    g ? g.push(t) : groups.set(day, [t]);
  }
  const today = localToday();

  return (
    <>
      <PageHeader title="Logbook" />
      {q.isError ? (
        <Empty icon="close" title="Couldn’t load Logbook" hint="Check your connection — it’ll retry." />
      ) : (
        <>
          {[...groups].map(([day, tasks]) => (
            <TaskList
              key={day}
              tasks={tasks}
              title={day === today ? 'Today' : fmtDayLong(day)}
              sticky
              keepDone
            />
          ))}
          {q.isSuccess && !groups.size && <Empty icon="logbook" title="Nothing completed yet" />}
          <div ref={more} aria-hidden />
        </>
      )}
    </>
  );
}
