// #task #api delete with Undo (soft delete → POST /restore). Lazy-only: editor + keyboard shortcuts import it.
import type { Task } from '@motion/core/schemas';
import { type QueryClient, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '../ui/store';
import { api } from './api';
import { removeTask } from './cache';
import { keys } from './keys';
import { optimistic, rollback, settle } from './mutations';
import { markDeleted, pokeSync } from './sync';

const restore = (qc: QueryClient, id: string) =>
  api<Task>('POST', `/tasks/${id}/restore`).then(
    (t) => settle(qc, t, [keys.agendaAll, keys.tasksAll, keys.statsAll]),
    () => toast('Couldn’t bring that task back. Try again.'),
  );

/** Options shared by the hook and the shortcut (`new MutationObserver(qc, deleteOptions(qc))`). */
export const deleteOptions = (qc: QueryClient) => ({
  mutationFn: (id: string) => api<void>('DELETE', `/tasks/${id}`),
  onMutate: (id: string) => optimistic(qc, (d) => removeTask(d, id)),
  onError: (_e: unknown, _id: string, snap: Awaited<ReturnType<typeof optimistic>> | undefined) =>
    rollback(qc, snap, 'Couldn’t delete that task. Try again.'),
  onSuccess: (_r: void, id: string) => {
    markDeleted(id);
    void qc.invalidateQueries({ queryKey: keys.statsAll });
    pokeSync();
    toast('Deleted.', { label: 'Undo', run: () => void restore(qc, id) });
  },
});

export const useDeleteTask = () => useMutation(deleteOptions(useQueryClient()));
