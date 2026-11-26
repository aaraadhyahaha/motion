// #api write hooks: optimistic patch across every task cache → server result replaces → rollback on error.
import type { QuickAdd, Task, TaskUpdate } from '@motion/core/schemas';
import { type QueryClient, type QueryKey, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '../ui/store';
import { api } from './api';
import { patchTask, removeTask } from './cache';
import { keys, TASK_CACHES } from './keys';
import { markDeleted, markSeen, pokeSync } from './sync';

type Snapshot = [QueryKey, unknown][];

async function optimistic(qc: QueryClient, edit: (d: unknown) => unknown): Promise<Snapshot> {
  await Promise.all(TASK_CACHES.map((k) => qc.cancelQueries({ queryKey: k })));
  const snap = TASK_CACHES.flatMap((k) => qc.getQueriesData({ queryKey: k }));
  for (const k of TASK_CACHES) qc.setQueriesData({ queryKey: k }, edit);
  return snap;
}

function rollback(qc: QueryClient, snap: Snapshot | undefined, msg: string) {
  for (const [k, d] of snap ?? []) qc.setQueryData(k, d);
  toast(msg);
}

/** Server copy wins everywhere; remember it so the poller ignores our own echo. */
function settle(qc: QueryClient, t: Task, invalidate: readonly QueryKey[]) {
  markSeen(t.id, t.updatedAt);
  for (const k of TASK_CACHES) qc.setQueriesData({ queryKey: k }, (d: unknown) => patchTask(d, t.id, t));
  for (const k of invalidate) void qc.invalidateQueries({ queryKey: k });
  pokeSync();
}

export function useUncomplete() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api<Task>('POST', `/tasks/${id}/uncomplete`),
    onMutate: (id) => optimistic(qc, (d) => patchTask(d, id, { done: false, doneAt: undefined })),
    onError: (_e, _id, snap) => rollback(qc, snap, 'Couldn’t undo'),
    // recurring tasks roll back to their previous date → agenda membership changes
    onSuccess: (t) => settle(qc, t, [keys.agendaAll, keys.statsAll]),
  });
}

export function useComplete() {
  const qc = useQueryClient();
  const undo = useUncomplete();
  return useMutation({
    mutationFn: (id: string) => api<Task>('POST', `/tasks/${id}/complete`),
    onMutate: (id) => {
      toast('Done. Nicely handled.', { label: 'Undo', run: () => undo.mutate(id) });
      return optimistic(qc, (d) => patchTask(d, id, { done: true, doneAt: Date.now() }));
    },
    onError: (_e, _id, snap) => rollback(qc, snap, 'Couldn’t complete task'),
    // recurring tasks come back rolled forward (not done) and reappear on their new day
    onSuccess: (t) => settle(qc, t, t.rrule ? [keys.agendaAll, keys.statsAll] : [keys.statsAll]),
  });
}

export function useUpdateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: TaskUpdate }) =>
      api<Task>('PATCH', `/tasks/${id}`, patch),
    onMutate: ({ id, patch }) => optimistic(qc, (d) => patchTask(d, id, nullsToUndefined(patch))),
    onError: (_e, _v, snap) => rollback(qc, snap, 'Couldn’t save changes'),
    onSuccess: (t) => settle(qc, t, [keys.agendaAll, keys.tasksAll]),
  });
}

export function useDeleteTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api<void>('DELETE', `/tasks/${id}`),
    onMutate: (id) => optimistic(qc, (d) => removeTask(d, id)),
    onError: (_e, _id, snap) => rollback(qc, snap, 'Couldn’t delete task'),
    onSuccess: (_r, id) => {
      markDeleted(id);
      void qc.invalidateQueries({ queryKey: keys.statsAll });
      pokeSync();
    },
  });
}

/** Not optimistic: placement depends on the server's parse. Invalidate so it appears where it belongs. */
export function useQuickAdd() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: QuickAdd) => api<Task>('POST', '/tasks/quick', input),
    onError: () => toast('Couldn’t add task'),
    onSuccess: (t) => settle(qc, t, [keys.agendaAll, keys.tasksAll, keys.tags]),
  });
}

/** Wire format uses null to clear; cached Task uses absent. */
function nullsToUndefined(p: TaskUpdate): Partial<Task> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(p)) out[k] = v ?? undefined;
  return out as Partial<Task>;
}
