import type { Changes } from '@motion/core';
import { asc, gt } from 'drizzle-orm';
import { lists, tags, tasks } from '../db/schema';
import type { Ctx } from './ctx';
import { listCols, tagCols, taskCols, toList, toTag, toTask } from './rows';

const CAP = 1000;
/** `next` overlaps by this much so writes racing the read are re-sent, never lost (clients upsert). */
const OVERLAP_MS = 1000;

/** Everything changed since `since` (ms). If `full`, the client should refetch instead. */
export async function getChanges(ctx: Ctx, since: number): Promise<Changes> {
  const next = ctx.now() - OVERLAP_MS;
  const [t, l, g] = await ctx.db.batch([
    ctx.db
      .select(taskCols)
      .from(tasks)
      .where(gt(tasks.updatedAt, since))
      .orderBy(asc(tasks.updatedAt))
      .limit(CAP + 1),
    ctx.db
      .select(listCols)
      .from(lists)
      .where(gt(lists.updatedAt, since))
      .limit(CAP + 1),
    ctx.db
      .select(tagCols)
      .from(tags)
      .where(gt(tags.updatedAt, since))
      .limit(CAP + 1),
  ]);
  const out: Changes = { next, tasks: [], lists: [], tags: [], deleted: { tasks: [], lists: [], tags: [] } };
  if (t.length > CAP || l.length > CAP || g.length > CAP) return { ...out, full: true };
  for (const r of t) r.deletedAt ? out.deleted.tasks.push(r.id) : out.tasks.push(toTask(r));
  for (const r of l) r.deletedAt ? out.deleted.lists.push(r.id) : out.lists.push(toList(r));
  for (const r of g) r.deletedAt ? out.deleted.tags.push(r.id) : out.tags.push(toTag(r));
  return out;
}
