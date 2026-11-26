// zod/mini: ~4 KB gz vs ~90 KB for classic zod (see DECISIONS). Functional API: z.optional(x), .check(...).
import * as z from 'zod/mini';
import { isValidTz } from './dates';
import { isValidRule } from './recurrence';

const str = (min: number, max: number) => z.string().check(z.trim(), z.minLength(min), z.maxLength(max));
const int = (min: number, max: number) => z.int().check(z.minimum(min), z.maximum(max));
const qInt = (min: number, max: number) => z.coerce.number().check(z.int(), z.minimum(min), z.maximum(max));
const opt = z.optional;
const nul = z.nullable;

export const DayKey = z
  .string()
  .check(z.regex(/^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/, 'YYYY-MM-DD'));
export const TimeHM = z.string().check(z.regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'HH:MM'));
export const Id = z.string().check(z.regex(/^[a-z0-9]{1,32}$/));
const Color = z.string().check(z.regex(/^#[0-9a-f]{6}$/i));
const TagName = z.string().check(z.trim(), z.regex(/^[\p{L}\p{N}_-]{1,40}$/u, 'letters, digits, _ or -'));
const Rrule = z.string().check(z.maxLength(200), z.refine(isValidRule, 'unsupported RRULE'));

// Lists
export const ListCreate = z.object({ name: str(1, 100), color: opt(Color) });
export const ListUpdate = z.extend(z.partial(ListCreate), { position: opt(z.number()) });

// Tags
export const TagCreate = z.object({ name: TagName, color: opt(Color) });
export const TagUpdate = z.partial(TagCreate);

// Tasks
export const RecurFrom = z.enum(['due', 'done']);
const taskShape = {
  title: str(1, 500),
  listId: Id,
  notes: nul(z.string().check(z.maxLength(20_000))),
  dueDate: nul(DayKey),
  dueTime: nul(TimeHM),
  durationMin: nul(int(1, 1440)),
  rrule: nul(Rrule),
  recurFrom: RecurFrom,
  remindAt: nul(int(0, Number.MAX_SAFE_INTEGER)),
  tags: z.array(TagName).check(z.maxLength(20)),
  position: z.number(),
};
export const TaskUpdate = z.partial(z.object(taskShape));
export const TaskCreate = z.required(TaskUpdate, { title: true });

export const TaskQuery = z.object({
  list: opt(Id),
  tag: opt(TagName),
  status: z._default(z.enum(['open', 'done', 'all']), 'open'),
  from: opt(DayKey),
  to: opt(DayKey),
  q: opt(str(1, 100)),
  cursor: opt(z.string().check(z.maxLength(40))),
  limit: z._default(qInt(1, 100), 50),
});

export const QuickAdd = z.object({ text: str(1, 500), listId: opt(Id) });
export const AgendaQuery = z.object({ days: z._default(qInt(1, 60), 7) });
export const StatsQuery = z.object({ days: z._default(qInt(1, 366), 30) });
export const ChangesQuery = z.object({ since: qInt(0, Number.MAX_SAFE_INTEGER) });
export const SettingsUpdate = z.object({
  tz: z.string().check(z.maxLength(64), z.refine(isValidTz, 'unknown timezone')),
});

export type ListCreate = z.infer<typeof ListCreate>;
export type ListUpdate = z.infer<typeof ListUpdate>;
export type TagCreate = z.infer<typeof TagCreate>;
export type TagUpdate = z.infer<typeof TagUpdate>;
export type TaskCreate = z.infer<typeof TaskCreate>;
export type TaskUpdate = z.infer<typeof TaskUpdate>;
export type TaskQuery = z.infer<typeof TaskQuery>;
export type QuickAdd = z.infer<typeof QuickAdd>;
export type SettingsUpdate = z.infer<typeof SettingsUpdate>;

// Output shapes (optional = omitted when null)
export interface List {
  id: string;
  name: string;
  color?: string;
  position: number;
  updatedAt: number;
}
export interface Tag {
  id: string;
  name: string;
  color?: string;
  updatedAt: number;
}
export interface Task {
  id: string;
  listId: string;
  title: string;
  notes?: string;
  done: boolean;
  doneAt?: number;
  dueDate?: string;
  dueTime?: string;
  durationMin?: number;
  rrule?: string;
  recurFrom?: 'due' | 'done';
  remindAt?: number;
  tags: string[];
  position: number;
  createdAt: number;
  updatedAt: number;
}
export interface Page<T> {
  items: T[];
  next?: string;
}
export interface Agenda {
  today: string;
  overdue: Task[];
  days: Record<string, Task[]>;
}
export interface Stats {
  perDay: Record<string, number>;
  streak: number;
  best: number;
  total: number;
}
export interface Changes {
  /** Pass as `since` on the next poll. */
  next: number;
  /** Too many changes: refetch lists/tags/tasks instead. */
  full?: true;
  tasks: Task[];
  lists: List[];
  tags: Tag[];
  deleted: { tasks: string[]; lists: string[]; tags: string[] };
}
export interface Settings {
  tz: string;
}
