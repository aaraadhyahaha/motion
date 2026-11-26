/** Shared column selections + row → API shape mappers (nulls omitted). */
import type { List, Tag, Task } from '@motion/core';
import { sql } from 'drizzle-orm';
import { lists, tags, tasks } from '../db/schema';

export const taskCols = {
  id: tasks.id,
  listId: tasks.listId,
  title: tasks.title,
  notes: tasks.notes,
  done: tasks.done,
  doneAt: tasks.doneAt,
  dueDate: tasks.dueDate,
  dueTime: tasks.dueTime,
  durationMin: tasks.durationMin,
  rrule: tasks.rrule,
  recurFrom: tasks.recurFrom,
  remindAt: tasks.remindAt,
  position: tasks.position,
  createdAt: tasks.createdAt,
  updatedAt: tasks.updatedAt,
  deletedAt: tasks.deletedAt,
  // Correlated subquery; names are spelled out because drizzle leaves single-table columns unqualified.
  tags: sql<string>`(select json_group_array(tg.name) from task_tags tt join tags tg on tg.id = tt.tag_id where tt.task_id = "tasks"."id" and tg.deleted_at is null)`,
};

export const listCols = {
  id: lists.id,
  name: lists.name,
  color: lists.color,
  position: lists.position,
  updatedAt: lists.updatedAt,
  deletedAt: lists.deletedAt,
};

export const tagCols = {
  id: tags.id,
  name: tags.name,
  color: tags.color,
  updatedAt: tags.updatedAt,
  deletedAt: tags.deletedAt,
};

function compact<T extends object>(row: Record<string, unknown>): T {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(row))
    if (v !== null && v !== undefined && k !== 'deletedAt') out[k] = v;
  return out as T;
}

export type TaskRow = Record<string, unknown> & { tags: string | null };

export const toTask = (r: TaskRow): Task => compact<Task>({ ...r, tags: JSON.parse(r.tags ?? '[]') });
export const toList = (r: Record<string, unknown>): List => compact<List>(r);
export const toTag = (r: Record<string, unknown>): Tag => compact<Tag>(r);

/** Escape LIKE wildcards; use with `ESCAPE '\'`. */
export const likeEscape = (s: string) => `%${s.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
