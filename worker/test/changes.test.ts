import { expect, it } from 'vitest';
import { getChanges } from '../src/services/changes';
import { createList } from '../src/services/lists';
import { createTask, deleteTask, updateTask } from '../src/services/tasks';
import { T0, testCtx } from './helpers';

it('returns rows changed since a point, with tombstones', async () => {
  const ctx = testCtx();
  const old = await createTask(ctx, { title: 'old' });
  const gone = await createTask(ctx, { title: 'gone' });
  ctx.tick(5000);
  const since = ctx.now() - 1;
  await updateTask(ctx, old.id, { title: 'edited' });
  await deleteTask(ctx, gone.id);
  const list = await createList(ctx, { name: 'L' });
  const c = await getChanges(ctx, since);
  expect(c.tasks.map((t) => t.title)).toEqual(['edited']);
  expect(c.deleted.tasks).toEqual([gone.id]);
  expect(c.lists.map((l) => l.id)).toEqual([list.id]);
  expect(c.next).toBe(T0 + 5000 - 1000);
  expect((await getChanges(ctx, ctx.now())).tasks).toEqual([]);
});
