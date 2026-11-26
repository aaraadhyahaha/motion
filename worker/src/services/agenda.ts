import { type Agenda, addDays, todayKey } from '@motion/core';
import { and, asc, eq, isNotNull, isNull, lte, sql } from 'drizzle-orm';
import { tasks } from '../db/schema';
import type { Ctx } from './ctx';
import { taskCols, toTask } from './rows';

const MAX = 500;

/** Overdue + every day from today for `days` days (empty days included). One range scan on (done, due_date). */
export async function getAgenda(ctx: Ctx, days: number): Promise<Agenda> {
  const today = todayKey(ctx.tz, ctx.now());
  const end = addDays(today, days - 1);
  const rows = await ctx.db
    .select(taskCols)
    .from(tasks)
    .where(
      and(eq(tasks.done, false), isNotNull(tasks.dueDate), lte(tasks.dueDate, end), isNull(tasks.deletedAt)),
    )
    .orderBy(asc(tasks.dueDate), sql`coalesce(${tasks.dueTime}, '99:99')`, asc(tasks.position))
    .limit(MAX);
  const out: Agenda = { today, overdue: [], days: {} };
  for (let i = 0; i < days; i++) out.days[addDays(today, i)] = [];
  for (const r of rows) {
    const t = toTask(r);
    if ((t.dueDate as string) < today) out.overdue.push(t);
    else out.days[t.dueDate as string]?.push(t);
  }
  return out;
}
