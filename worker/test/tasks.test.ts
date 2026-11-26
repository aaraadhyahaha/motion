import { TaskQuery } from '@motion/core';
import { describe, expect, it } from 'vitest';
import { createList } from '../src/services/lists';
import { createTask, deleteTask, getTask, listTasks, updateTask } from '../src/services/tasks';
import { testCtx } from './helpers';

const q = (o: Partial<TaskQuery> = {}) => TaskQuery.parse(o);

describe('createTask', () => {
  it('defaults to Inbox, appends position, links tags', async () => {
    const ctx = testCtx();
    const a = await createTask(ctx, { title: 'a', tags: ['Home', 'urgent'] });
    const b = await createTask(ctx, { title: 'b', tags: ['home'] });
    expect(a).toMatchObject({ listId: 'inbox', done: false });
    expect(a.tags.sort()).toEqual(['Home', 'urgent']);
    expect(b.tags).toEqual(['Home']);
    expect(b.position).toBeGreaterThan(a.position);
    expect(a).not.toHaveProperty('dueDate');
  });

  it('validates schedule fields', async () => {
    const ctx = testCtx();
    await expect(createTask(ctx, { title: 'x', dueTime: '09:00' })).rejects.toMatchObject({
      code: 'invalid',
    });
    await expect(createTask(ctx, { title: 'x', listId: 'nope' })).rejects.toMatchObject({
      code: 'not_found',
    });
  });

  it('gives a recurring task its first occurrence and anchors the rule', async () => {
    const ctx = testCtx();
    const w = await createTask(ctx, { title: 'w', rrule: 'FREQ=WEEKLY;BYDAY=MO' });
    expect(w).toMatchObject({ dueDate: '2026-11-30', recurFrom: 'due' });
    const m = await createTask(ctx, { title: 'm', rrule: 'FREQ=MONTHLY', dueDate: '2027-01-31' });
    expect(m.rrule).toBe('FREQ=MONTHLY;BYMONTHDAY=31');
  });
});

describe('updateTask / deleteTask', () => {
  it('patches fields, replaces tags, bumps updatedAt', async () => {
    const ctx = testCtx();
    const t = await createTask(ctx, { title: 't', tags: ['a'] });
    ctx.tick();
    const u = await updateTask(ctx, t.id, {
      title: 'T',
      notes: 'n',
      tags: ['b', 'c'],
      dueDate: '2026-12-01',
    });
    expect(u).toMatchObject({ title: 'T', notes: 'n', dueDate: '2026-12-01' });
    expect(u.tags.sort()).toEqual(['b', 'c']);
    expect(u.updatedAt).toBeGreaterThan(t.updatedAt);
    const r = await updateTask(ctx, t.id, { rrule: 'FREQ=DAILY' });
    expect(r).toMatchObject({ rrule: 'FREQ=DAILY', recurFrom: 'due', dueDate: '2026-12-01' });
    const cleared = await updateTask(ctx, t.id, { notes: null, rrule: null });
    expect(cleared).not.toHaveProperty('notes');
    expect(cleared).not.toHaveProperty('recurFrom');
  });

  it('soft-deletes', async () => {
    const ctx = testCtx();
    const t = await createTask(ctx, { title: 'gone' });
    await deleteTask(ctx, t.id);
    await expect(getTask(ctx, t.id)).rejects.toMatchObject({ code: 'not_found' });
  });
});

describe('listTasks', () => {
  it('filters, orders by due then position, paginates', async () => {
    const ctx = testCtx();
    const { id: listId } = await createList(ctx, { name: 'Q' });
    const mk = (title: string, extra = {}) => createTask(ctx, { title, listId, ...extra });
    await mk('undated');
    await mk('later', { dueDate: '2026-12-05' });
    await mk('soon-untimed', { dueDate: '2026-11-27' });
    await mk('soon-timed', { dueDate: '2026-11-27', dueTime: '08:00', tags: ['x'] });
    await mk('50% off', { notes: 'sale' });
    const all = await listTasks(ctx, q({ list: listId }));
    expect(all.items.map((t) => t.title)).toEqual([
      'soon-timed',
      'soon-untimed',
      'later',
      'undated',
      '50% off',
    ]);

    expect((await listTasks(ctx, q({ list: listId, tag: 'X' }))).items.map((t) => t.title)).toEqual([
      'soon-timed',
    ]);
    expect((await listTasks(ctx, q({ list: listId, q: '%' }))).items.map((t) => t.title)).toEqual([
      '50% off',
    ]);
    expect((await listTasks(ctx, q({ list: listId, q: 'SALE' }))).items).toHaveLength(1);
    const range = await listTasks(ctx, q({ list: listId, from: '2026-11-28', to: '2026-12-31' }));
    expect(range.items.map((t) => t.title)).toEqual(['later']);

    const p1 = await listTasks(ctx, q({ list: listId, limit: 2 }));
    expect(p1.items).toHaveLength(2);
    const p2 = await listTasks(ctx, q({ list: listId, limit: 2, cursor: p1.next }));
    const p3 = await listTasks(ctx, q({ list: listId, limit: 2, cursor: p2.next }));
    expect([...p1.items, ...p2.items, ...p3.items].map((t) => t.title)).toEqual(
      all.items.map((t) => t.title),
    );
    expect(p3.next).toBeUndefined();
  });
});
