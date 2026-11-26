import type { Tag, TagCreate, TagUpdate } from '@motion/core';
import { and, asc, eq, inArray, isNull, ne, sql } from 'drizzle-orm';
import { tags, tasks, taskTags } from '../db/schema';
import { AppError, notFound } from '../lib/errors';
import { id } from '../lib/id';
import type { Ctx } from './ctx';
import { tagCols, toTag } from './rows';

export async function listTags(ctx: Ctx): Promise<Tag[]> {
  const rows = await ctx.db.select(tagCols).from(tags).where(isNull(tags.deletedAt)).orderBy(asc(tags.name));
  return rows.map(toTag);
}

async function getTag(ctx: Ctx, tagId: string): Promise<Tag> {
  const row = await ctx.db
    .select(tagCols)
    .from(tags)
    .where(and(eq(tags.id, tagId), isNull(tags.deletedAt)))
    .get();
  if (!row) throw notFound('tag');
  return toTag(row);
}

const byName = (names: string[]) =>
  inArray(
    sql`lower(${tags.name})`,
    names.map((n) => n.toLowerCase()),
  );

/** Returns tag ids for `names`, creating missing tags and reviving deleted ones. */
export async function ensureTags(ctx: Ctx, names: string[]): Promise<string[]> {
  if (!names.length) return [];
  const now = ctx.now();
  const existing = await ctx.db
    .select({ id: tags.id, name: tags.name, deletedAt: tags.deletedAt })
    .from(tags)
    .where(byName(names));
  const found = new Map(existing.map((t) => [t.name.toLowerCase(), t]));
  const ids: string[] = [];
  const writes = [];
  for (const name of names) {
    const hit = found.get(name.toLowerCase());
    if (hit) {
      ids.push(hit.id);
      if (hit.deletedAt)
        writes.push(ctx.db.update(tags).set({ deletedAt: null, updatedAt: now }).where(eq(tags.id, hit.id)));
    } else {
      const tagId = id();
      found.set(name.toLowerCase(), { id: tagId, name, deletedAt: null });
      ids.push(tagId);
      writes.push(ctx.db.insert(tags).values({ id: tagId, name, updatedAt: now }));
    }
  }
  const [first, ...rest] = writes;
  if (first) await ctx.db.batch([first, ...rest]);
  return [...new Set(ids)];
}

export async function createTag(ctx: Ctx, input: TagCreate): Promise<Tag> {
  const live = await ctx.db
    .select({ id: tags.id })
    .from(tags)
    .where(and(byName([input.name]), isNull(tags.deletedAt)))
    .get();
  if (live) throw new AppError('conflict', 'tag exists');
  const [tagId] = (await ensureTags(ctx, [input.name])) as [string];
  await ctx.db
    .update(tags)
    .set({ name: input.name, color: input.color ?? null })
    .where(eq(tags.id, tagId));
  return getTag(ctx, tagId);
}

/** Tasks carrying this tag change shape, so bump them for /changes. */
const touchTagged = (ctx: Ctx, tagId: string, now: number) =>
  ctx.db
    .update(tasks)
    .set({ updatedAt: now })
    .where(
      inArray(
        tasks.id,
        ctx.db.select({ id: taskTags.taskId }).from(taskTags).where(eq(taskTags.tagId, tagId)),
      ),
    );

export async function updateTag(ctx: Ctx, tagId: string, patch: TagUpdate): Promise<Tag> {
  await getTag(ctx, tagId);
  if (patch.name) {
    const clash = await ctx.db
      .select({ id: tags.id })
      .from(tags)
      .where(and(byName([patch.name]), ne(tags.id, tagId)))
      .get();
    if (clash) throw new AppError('conflict', 'tag name taken');
  }
  const now = ctx.now();
  await ctx.db.batch([
    ctx.db
      .update(tags)
      .set({ ...patch, updatedAt: now })
      .where(eq(tags.id, tagId)),
    touchTagged(ctx, tagId, now),
  ]);
  return getTag(ctx, tagId);
}

export async function deleteTag(ctx: Ctx, tagId: string): Promise<void> {
  await getTag(ctx, tagId);
  const now = ctx.now();
  await ctx.db.batch([
    touchTagged(ctx, tagId, now),
    ctx.db.delete(taskTags).where(eq(taskTags.tagId, tagId)),
    ctx.db.update(tags).set({ deletedAt: now, updatedAt: now }).where(eq(tags.id, tagId)),
  ]);
}
