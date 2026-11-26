import { nextOccurrence, parseRule, type Task, todayKey, zonedToEpoch } from '@motion/core';
import { desc, eq } from 'drizzle-orm';
import { completions, tasks } from '../db/schema';
import { id } from '../lib/id';
import type { Ctx } from './ctx';
import { getTask } from './tasks';

/** Next due date for a recurring task. `due` mode keeps the cadence but always lands after today. */
function advance(t: Task, today: string): string {
  const rule = parseRule(t.rrule as string);
  if (t.recurFrom === 'done') return nextOccurrence(rule, today);
  let next = nextOccurrence(rule, t.dueDate as string);
  while (next <= today) next = nextOccurrence(rule, next);
  return next;
}

/** Logs a completion. Recurring tasks roll forward (stay open); others are marked done. Idempotent for done tasks. */
export async function completeTask(ctx: Ctx, taskId: string): Promise<Task> {
  const t = await getTask(ctx, taskId);
  if (t.done) return t;
  const now = ctx.now();
  const today = todayKey(ctx.tz, now);
  const log = ctx.db.insert(completions).values({
    id: id(),
    taskId,
    day: today,
    at: now,
    prevDueDate: t.dueDate ?? null,
    prevDueTime: t.dueTime ?? null,
    prevRemindAt: t.remindAt ?? null,
  });
  if (t.rrule && t.dueDate) {
    const next = advance(t, today);
    const delta = zonedToEpoch(next, t.dueTime, ctx.tz) - zonedToEpoch(t.dueDate, t.dueTime, ctx.tz);
    await ctx.db.batch([
      ctx.db
        .update(tasks)
        .set({
          dueDate: next,
          remindAt: t.remindAt ? t.remindAt + delta : null,
          remindedAt: null,
          updatedAt: now,
        })
        .where(eq(tasks.id, taskId)),
      log,
    ]);
  } else {
    await ctx.db.batch([
      ctx.db.update(tasks).set({ done: true, doneAt: now, updatedAt: now }).where(eq(tasks.id, taskId)),
      log,
    ]);
  }
  return getTask(ctx, taskId);
}

/** Undo the latest completion: reopen a done task, or roll a recurring task back to its previous date. */
export async function uncompleteTask(ctx: Ctx, taskId: string): Promise<Task> {
  const t = await getTask(ctx, taskId);
  const last = await ctx.db
    .select()
    .from(completions)
    .where(eq(completions.taskId, taskId))
    .orderBy(desc(completions.at))
    .limit(1)
    .get();
  if (!last || (!t.done && !t.rrule)) return t;
  const now = ctx.now();
  const restore = t.done
    ? { done: false, doneAt: null }
    : { dueDate: last.prevDueDate, dueTime: last.prevDueTime, remindAt: last.prevRemindAt, remindedAt: null };
  await ctx.db.batch([
    ctx.db
      .update(tasks)
      .set({ ...restore, updatedAt: now })
      .where(eq(tasks.id, taskId)),
    ctx.db.delete(completions).where(eq(completions.id, last.id)),
  ]);
  return getTask(ctx, taskId);
}
