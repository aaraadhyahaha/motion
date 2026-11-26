import { type Task, TaskUpdate } from '@motion/core';
import { AppError } from '../lib/errors';
import { parseNlDate } from '../lib/nldate';
import { parse } from '../lib/validate';
import type { Ctx } from './ctx';
import { updateTask } from './tasks';

const ISO = /^(\d{4}-\d{2}-\d{2})(?:[ T](\d{2}:\d{2}))?$/;

/** Move a task to `when`: `YYYY-MM-DD[ HH:MM]` or natural language ("next fri 3pm"). No time given → time cleared. */
export async function rescheduleTask(ctx: Ctx, id: string, when: string): Promise<Task> {
  const m = ISO.exec(when.trim());
  const d = m ? { dueDate: m[1], dueTime: m[2] } : await parseNlDate(when, ctx.tz, ctx.now());
  if (!d) throw new AppError('invalid', `could not read a date from "${when}"`);
  return updateTask(ctx, id, parse(TaskUpdate, { dueDate: d.dueDate, dueTime: d.dueTime ?? null }));
}
