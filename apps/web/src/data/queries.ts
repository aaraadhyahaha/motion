// #api read hooks. Types only from core (no zod in the browser).
import type { Agenda, List, Page, Settings, Stats, Tag, Task } from '@motion/core/schemas';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { api, qs } from './api';
import { keys, type TaskFilter } from './keys';

const PAGE = 50;

export const useAgenda = (days = 14) =>
  useQuery({
    queryKey: keys.agenda(days),
    queryFn: ({ signal }) => api<Agenda>('GET', `/agenda${qs({ days })}`, undefined, signal),
  });

export const useTasks = (f: TaskFilter) =>
  useInfiniteQuery({
    queryKey: keys.tasks(f),
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam, signal }) =>
      api<Page<Task>>('GET', `/tasks${qs({ ...f, cursor: pageParam, limit: PAGE })}`, undefined, signal),
    getNextPageParam: (last) => last.next,
  });

/** `seed` (a cached row) renders instantly; it's marked stale so the full task still loads. */
export const useTask = (id: string | null, seed?: Task) =>
  useQuery({
    queryKey: keys.task(id ?? ''),
    queryFn: ({ signal }) => api<Task>('GET', `/tasks/${id}`, undefined, signal),
    enabled: !!id,
    initialData: seed,
    initialDataUpdatedAt: 0,
  });

const items =
  <T>(path: string) =>
  (o: { signal: AbortSignal }) =>
    api<{ items: T[] }>('GET', path, undefined, o.signal).then((r) => r.items);

export const useLists = () =>
  useQuery({ queryKey: keys.lists, queryFn: items<List>('/lists'), staleTime: 300_000 });
export const useTags = () =>
  useQuery({ queryKey: keys.tags, queryFn: items<Tag>('/tags'), staleTime: 300_000 });

export const useStats = (days = 182) =>
  useQuery({
    queryKey: keys.stats(days),
    queryFn: ({ signal }) => api<Stats>('GET', `/stats${qs({ days })}`, undefined, signal),
  });

export const useSettings = () =>
  useQuery({
    queryKey: keys.settings,
    queryFn: ({ signal }) => api<Settings>('GET', '/settings', undefined, signal),
    staleTime: Infinity,
  });
