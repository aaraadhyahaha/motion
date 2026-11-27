// #api #perf paged task reads (infinite query). Lazy routes only (list/tag/search, Logbook) so
// useInfiniteQuery + InfiniteQueryObserver stay out of the initial chunk.
import type { Page, Task } from '@motion/core/schemas';
import { useInfiniteQuery } from '@tanstack/react-query';
import { api, qs } from './api';
import { keys, type TaskFilter } from './keys';

const PAGE = 50;

export const useTasks = (f: TaskFilter, enabled = true) =>
  useInfiniteQuery({
    queryKey: keys.tasks(f),
    enabled,
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam, signal }) =>
      api<Page<Task>>('GET', `/tasks${qs({ ...f, cursor: pageParam, limit: PAGE })}`, undefined, signal),
    getNextPageParam: (last) => last.next,
  });
