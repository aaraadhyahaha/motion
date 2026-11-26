import { addDays, diffDays, type Stats, todayKey } from '@motion/core';
import { asc, between, eq, sql } from 'drizzle-orm';
import { completions, tasks } from '../db/schema';
import type { Ctx } from './ctx';

/** Completions per day and per list for the last `days` days, current streak (alive if today or yesterday counted), best streak. */
export async function getStats(ctx: Ctx, days: number): Promise<Stats> {
  const today = todayKey(ctx.tz, ctx.now());
  const start = addDays(today, -(days - 1));
  const rows = await ctx.db
    .select({ day: completions.day, n: sql<number>`count(*)` })
    .from(completions)
    .groupBy(completions.day)
    .orderBy(asc(completions.day));
  // Range on completions_day, then tasks PK lookup.
  const listRows = await ctx.db
    .select({ listId: tasks.listId, n: sql<number>`count(*)` })
    .from(completions)
    .innerJoin(tasks, eq(tasks.id, completions.taskId))
    .where(between(completions.day, start, today))
    .groupBy(tasks.listId);
  const perList = Object.fromEntries(listRows.map((r) => [r.listId, r.n]));
  const perDay: Record<string, number> = {};
  let total = 0;
  let best = 0;
  let run = 0;
  let prev: string | undefined;
  for (const { day, n } of rows) {
    total += n;
    if (day >= start && day <= today) perDay[day] = n;
    run = prev && diffDays(prev, day) === 1 ? run + 1 : 1;
    best = Math.max(best, run);
    prev = day;
  }
  const alive = prev === today || (prev !== undefined && diffDays(prev, today) === 1);
  return { perDay, perList, streak: alive ? run : 0, best, total };
}
