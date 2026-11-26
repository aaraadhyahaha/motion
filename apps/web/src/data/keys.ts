// #api query keys. Prefix keys (`all`) are what invalidate/setQueriesData match on.
export interface TaskFilter {
  list?: string;
  tag?: string;
  status?: 'open' | 'done' | 'all';
  from?: string;
  to?: string;
  q?: string;
}

export const keys = {
  agendaAll: ['agenda'] as const,
  agenda: (days: number) => ['agenda', days] as const,
  tasksAll: ['tasks'] as const,
  tasks: (f: TaskFilter) => ['tasks', f] as const,
  taskAll: ['task'] as const,
  task: (id: string) => ['task', id] as const,
  lists: ['lists'] as const,
  tags: ['tags'] as const,
  statsAll: ['stats'] as const,
  stats: (days: number) => ['stats', days] as const,
  settings: ['settings'] as const,
};

/** Every cache that can hold a task row — cache.ts helpers handle each shape. */
export const TASK_CACHES = [keys.agendaAll, keys.tasksAll, keys.taskAll] as const;
