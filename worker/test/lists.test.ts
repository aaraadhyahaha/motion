import { describe, expect, it } from 'vitest';
import { createList, deleteList, listLists, updateList } from '../src/services/lists';
import { createTask, getTask } from '../src/services/tasks';
import { testCtx } from './helpers';

describe('lists', () => {
  it('seeds Inbox and appends new lists by position', async () => {
    const ctx = testCtx();
    const a = await createList(ctx, { name: 'Work' });
    const b = await createList(ctx, { name: 'Home', color: '#ff9500' });
    const all = await listLists(ctx);
    expect(all.map((l) => l.name)).toEqual(['Inbox', 'Work', 'Home']);
    expect(b.position).toBeGreaterThan(a.position);
    expect(all[2]).toMatchObject({ color: '#ff9500' });
    expect(all[1]).not.toHaveProperty('color');
  });

  it('updates name and position', async () => {
    const ctx = testCtx();
    const l = await createList(ctx, { name: 'Wrk' });
    ctx.tick();
    const u = await updateList(ctx, l.id, { name: 'Work', position: -1 });
    expect(u).toMatchObject({ name: 'Work', position: -1 });
    expect(u.updatedAt).toBeGreaterThan(l.updatedAt);
    expect((await listLists(ctx))[0]?.name).toBe('Work');
  });

  it('delete moves tasks to Inbox; Inbox is protected', async () => {
    const ctx = testCtx();
    const l = await createList(ctx, { name: 'Temp' });
    const t = await createTask(ctx, { title: 'x', listId: l.id });
    await deleteList(ctx, l.id);
    expect((await getTask(ctx, t.id)).listId).toBe('inbox');
    expect((await listLists(ctx)).some((x) => x.id === l.id)).toBe(false);
    await expect(deleteList(ctx, 'inbox')).rejects.toMatchObject({ code: 'conflict' });
    await expect(updateList(ctx, l.id, { name: 'y' })).rejects.toMatchObject({ code: 'not_found' });
  });
});
