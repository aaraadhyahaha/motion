// #list #ui per-list (/list/:id) and per-tag (/tag/:name) open tasks, paginated via one sentinel. Lazy chunk.
import { Empty } from '../components/Empty';
import { PageHeader } from '../components/PageHeader';
import { TaskList } from '../components/TaskList';
import { useLists, useTasks } from '../data/queries';
import { useSentinel } from '../lib/useSentinel';

type Props = { list?: string; tag?: string };

export default function TaskQueryView({ list, tag }: Props) {
  const { data: lists } = useLists();
  const q = useTasks(tag ? { tag, status: 'open' } : { list, status: 'open' });
  const more = useSentinel(() => !q.isFetchingNextPage && void q.fetchNextPage(), !!q.hasNextPage);
  const tasks = q.data?.pages.flatMap((p) => p.items) ?? [];
  const title = tag ? `@${tag}` : (lists?.find((l) => l.id === list)?.name ?? 'List');

  return (
    <>
      <PageHeader title={title} />
      {q.isError ? (
        <Empty icon="close" title="Couldn’t load tasks" hint="Check your connection — it’ll retry." />
      ) : (
        <>
          <TaskList tasks={tasks} />
          {q.isSuccess && !tasks.some((t) => !t.done) && (
            <Empty icon={tag ? 'tag' : 'lists'} title="Nothing open." hint="Press N to add one." />
          )}
          <div ref={more} aria-hidden />
        </>
      )}
    </>
  );
}
