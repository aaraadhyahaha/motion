import { sql } from 'drizzle-orm';
import { index, integer, primaryKey, real, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';

// Times are epoch ms. Rows are soft-deleted (deleted_at) so /changes can report tombstones.
const stamps = {
  updatedAt: integer('updated_at').notNull(),
  deletedAt: integer('deleted_at'),
};

export const lists = sqliteTable(
  'lists',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    color: text('color'),
    position: real('position').notNull(),
    createdAt: integer('created_at').notNull(),
    ...stamps,
  },
  (t) => [index('lists_live_pos').on(t.deletedAt, t.position), index('lists_updated').on(t.updatedAt)],
);

export const tags = sqliteTable(
  'tags',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    color: text('color'),
    ...stamps,
  },
  // Deleted tags keep their name; ensureTags revives them instead of inserting a duplicate.
  (t) => [uniqueIndex('tags_name').on(sql`lower(${t.name})`), index('tags_updated').on(t.updatedAt)],
);

export const tasks = sqliteTable(
  'tasks',
  {
    id: text('id').primaryKey(),
    listId: text('list_id')
      .notNull()
      .references(() => lists.id),
    title: text('title').notNull(),
    notes: text('notes'),
    done: integer('done', { mode: 'boolean' }).notNull().default(false),
    doneAt: integer('done_at'),
    dueDate: text('due_date'),
    dueTime: text('due_time'),
    durationMin: integer('duration_min'),
    rrule: text('rrule'),
    recurFrom: text('recur_from', { enum: ['due', 'done'] }),
    remindAt: integer('remind_at'),
    remindedAt: integer('reminded_at'),
    position: real('position').notNull(),
    createdAt: integer('created_at').notNull(),
    ...stamps,
  },
  (t) => [
    index('tasks_done_due').on(t.done, t.dueDate),
    index('tasks_list_pos').on(t.listId, t.done, t.position),
    index('tasks_updated').on(t.updatedAt),
    index('tasks_remind')
      .on(t.remindAt)
      .where(sql`${t.remindedAt} IS NULL AND ${t.done} = 0 AND ${t.deletedAt} IS NULL`),
  ],
);

export const taskTags = sqliteTable(
  'task_tags',
  {
    taskId: text('task_id')
      .notNull()
      .references(() => tasks.id),
    tagId: text('tag_id')
      .notNull()
      .references(() => tags.id),
  },
  (t) => [primaryKey({ columns: [t.taskId, t.tagId] }), index('task_tags_tag').on(t.tagId, t.taskId)],
);

export const completions = sqliteTable(
  'completions',
  {
    id: text('id').primaryKey(),
    taskId: text('task_id')
      .notNull()
      .references(() => tasks.id),
    day: text('day').notNull(),
    at: integer('at').notNull(),
    prevDueDate: text('prev_due_date'),
    prevDueTime: text('prev_due_time'),
    prevRemindAt: integer('prev_remind_at'),
  },
  (t) => [index('completions_day').on(t.day), index('completions_task_at').on(t.taskId, t.at)],
);

export const settings = sqliteTable('settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
});

// Schema only in Step 1; push sending arrives in Phase 3.
export const pushSubscriptions = sqliteTable('push_subscriptions', {
  endpoint: text('endpoint').primaryKey(),
  p256dh: text('p256dh').notNull(),
  auth: text('auth').notNull(),
  createdAt: integer('created_at').notNull(),
});
