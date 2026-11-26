import {
  anchorRule,
  firstOnOrAfter,
  formatRule,
  type Page,
  parseRule,
  type Task,
  type TaskCreate,
  type TaskQuery,
  type TaskUpdate,
  todayKey,
} from '@motion/core';
import { and, asc, desc, eq, gte, isNull, lte, type SQL, sql } from 'drizzle-orm';
import { tasks, taskTags } from '../db/schema';
import { AppError, notFound } from '../lib/errors';
import { id } from '../lib/id';
import type { Ctx } from './ctx';
import { getList, INBOX } from './lists';
import { likeEscape, taskCols, toTask } from './rows';
import { ensureTags } from './tags';

const live = isNull(tasks.deletedAt);

export async function getTask(ctx: Ctx, taskId: string): Promise<Task> {
  const row = await ctx.db
    .select(taskCols)
    .from(tasks)
    .where(and(eq(tasks.id, taskId), live))
    .get();
  if (!row) throw notFound('task');
  return toTask(row);
}

/** Open tasks: by due date/time (undated last), then manual position. Done tasks: newest first. */
export async function listTasks(ctx: Ctx, q: TaskQuery): Promise<Page<Task>> {
  const where: (SQL | undefined)[] = [live];
  if (q.status !== 'all') where.push(eq(tasks.done, q.status === 'done'));
  if (q.list) where.push(eq(tasks.listId, q.list));
  if (q.from) where.push(gte(tasks.dueDate, q.from));
  if (q.to) where.push(lte(tasks.dueDate, q.to));
  if (q.q) {
    const pat = likeEscape(q.q);
    where.push(sql`(${tasks.title} like ${pat} escape '\\' or ${tasks.notes} like ${pat} escape '\\')`);
  }
  if (q.tag)
    where.push(
      sql`exists (select 1 from task_tags tt join tags tg on tg.id = tt.tag_id where tt.task_id = "tasks"."id" and lower(tg.name) = lower(${q.tag}))`,
    );
  const offset = q.cursor ? Number.parseInt(q.cursor, 36) || 0 : 0;
  const order =
    q.status === 'done'
      ? [desc(tasks.doneAt), asc(tasks.id)]
      : [
          sql`coalesce(${tasks.dueDate}, '9999-12-31')`,
          sql`coalesce(${tasks.dueTime}, '99:99')`,
          asc(tasks.position),
          asc(tasks.id),
        ];
  const rows = await ctx.db
    .select(taskCols)
    .from(tasks)
    .where(and(...where))
    .orderBy(...order)
    .limit(q.limit + 1)
    .offset(offset);
  const items = rows.slice(0, q.limit).map(toTask);
  return rows.length > q.limit ? { items, next: (offset + q.limit).toString(36) } : { items };
}

interface Sched {
  dueDate: string | null;
  dueTime: string | null;
  rrule: string | null;
}

/** Cross-field rules: time needs a date; a rule gets a date (first occurrence) and is anchored to it. */
function normalizeSchedule(ctx: Ctx, s: Sched): Sched {
  if (s.dueTime && !s.dueDate) throw new AppError('invalid', 'dueTime requires dueDate');
  if (!s.rrule) return s;
  const base = s.dueDate ?? todayKey(ctx.tz, ctx.now());
  const rule = anchorRule(parseRule(s.rrule), base);
  return { ...s, dueDate: firstOnOrAfter(rule, base), rrule: formatRule(rule) };
}

const tagLinks = (ctx: Ctx, taskId: string, tagIds: string[]) =>
  tagIds.map((tagId) => ctx.db.insert(taskTags).values({ taskId, tagId }));

export async function createTask(ctx: Ctx, input: TaskCreate): Promise<Task> {
  const listId = input.listId ?? INBOX;
  await getList(ctx, listId);
  const sched = normalizeSchedule(ctx, {
    dueDate: input.dueDate ?? null,
    dueTime: input.dueTime ?? null,
    rrule: input.rrule ?? null,
  });
  const max = await ctx.db
    .select({ p: sql<number>`coalesce(max(${tasks.position}), 0)` })
    .from(tasks)
    .where(and(eq(tasks.listId, listId), eq(tasks.done, false)))
    .get();
  const tagIds = await ensureTags(ctx, input.tags ?? []);
  const now = ctx.now();
  const taskId = id();
  await ctx.db.batch([
    ctx.db.insert(tasks).values({
      id: taskId,
      listId,
      title: input.title,
      notes: input.notes ?? null,
      ...sched,
      durationMin: input.durationMin ?? null,
      recurFrom: sched.rrule ? (input.recurFrom ?? 'due') : null,
      remindAt: input.remindAt ?? null,
      position: input.position ?? (max?.p ?? 0) + 1,
      createdAt: now,
      updatedAt: now,
    }),
    ...tagLinks(ctx, taskId, tagIds),
  ]);
  return getTask(ctx, taskId);
}

export async function updateTask(ctx: Ctx, taskId: string, patch: TaskUpdate): Promise<Task> {
  const cur = await getTask(ctx, taskId);
  if (patch.listId && patch.listId !== cur.listId) await getList(ctx, patch.listId);
  const { tags: tagNames, ...fields } = patch;
  const touchesSched = 'dueDate' in patch || 'dueTime' in patch || 'rrule' in patch;
  const sched = touchesSched
    ? normalizeSchedule(ctx, {
        dueDate: patch.dueDate !== undefined ? patch.dueDate : (cur.dueDate ?? null),
        dueTime: patch.dueTime !== undefined ? patch.dueTime : (cur.dueTime ?? null),
        rrule: patch.rrule !== undefined ? patch.rrule : (cur.rrule ?? null),
      })
    : {};
  const set = { ...fields, ...sched, updatedAt: ctx.now() } as Partial<typeof tasks.$inferInsert>;
  if ('rrule' in sched) set.recurFrom = sched.rrule ? (patch.recurFrom ?? cur.recurFrom ?? 'due') : null;
  if ('remindAt' in patch) set.remindedAt = null;
  const upd = ctx.db.update(tasks).set(set).where(eq(tasks.id, taskId));
  if (tagNames) {
    const tagIds = await ensureTags(ctx, tagNames);
    await ctx.db.batch([
      upd,
      ctx.db.delete(taskTags).where(eq(taskTags.taskId, taskId)),
      ...tagLinks(ctx, taskId, tagIds),
    ]);
  } else await upd;
  return getTask(ctx, taskId);
}

export async function deleteTask(ctx: Ctx, taskId: string): Promise<void> {
  await getTask(ctx, taskId);
  const now = ctx.now();
  await ctx.db.update(tasks).set({ deletedAt: now, updatedAt: now }).where(eq(tasks.id, taskId));
}
