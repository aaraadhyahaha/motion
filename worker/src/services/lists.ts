import type { List, ListCreate, ListUpdate } from '@motion/core';
import { and, asc, eq, isNull, sql } from 'drizzle-orm';
import { lists, tasks } from '../db/schema';
import { AppError, notFound } from '../lib/errors';
import { id } from '../lib/id';
import type { Ctx } from './ctx';
import { listCols, toList } from './rows';

export const INBOX = 'inbox';

export async function listLists(ctx: Ctx): Promise<List[]> {
  const rows = await ctx.db
    .select(listCols)
    .from(lists)
    .where(isNull(lists.deletedAt))
    .orderBy(asc(lists.position));
  return rows.map(toList);
}

export async function getList(ctx: Ctx, listId: string): Promise<List> {
  const row = await ctx.db
    .select(listCols)
    .from(lists)
    .where(and(eq(lists.id, listId), isNull(lists.deletedAt)))
    .get();
  if (!row) throw notFound('list');
  return toList(row);
}

export async function createList(ctx: Ctx, input: ListCreate): Promise<List> {
  const now = ctx.now();
  const max = await ctx.db
    .select({ p: sql<number>`coalesce(max(${lists.position}), 0)` })
    .from(lists)
    .where(isNull(lists.deletedAt))
    .get();
  const row = {
    id: id(),
    name: input.name,
    color: input.color ?? null,
    position: (max?.p ?? 0) + 1,
    createdAt: now,
    updatedAt: now,
  };
  await ctx.db.insert(lists).values(row);
  return toList(row);
}

export async function updateList(ctx: Ctx, listId: string, patch: ListUpdate): Promise<List> {
  await getList(ctx, listId);
  await ctx.db
    .update(lists)
    .set({ ...patch, updatedAt: ctx.now() })
    .where(eq(lists.id, listId));
  return getList(ctx, listId);
}

/** Soft-deletes the list and moves all its tasks to Inbox. */
export async function deleteList(ctx: Ctx, listId: string): Promise<void> {
  if (listId === INBOX) throw new AppError('conflict', 'Inbox cannot be deleted');
  await getList(ctx, listId);
  const now = ctx.now();
  await ctx.db.batch([
    ctx.db.update(tasks).set({ listId: INBOX, updatedAt: now }).where(eq(tasks.listId, listId)),
    ctx.db.update(lists).set({ deletedAt: now, updatedAt: now }).where(eq(lists.id, listId)),
  ]);
}

/** Case-insensitive lookup of a live list by name (quick-add `#list`). */
export async function findListByName(ctx: Ctx, name: string): Promise<string | undefined> {
  const row = await ctx.db
    .select({ id: lists.id })
    .from(lists)
    .where(and(sql`lower(${lists.name}) = lower(${name})`, isNull(lists.deletedAt)))
    .get();
  return row?.id;
}
