import { expect, it } from 'vitest';
import { completeTask } from '../src/services/complete';
import { createList } from '../src/services/lists';
import { getStats } from '../src/services/stats';
import { createTask } from '../src/services/tasks';
import { testCtx } from './helpers';

const at = (day: number) => Date.UTC(2026, 10, day, 12);

it('counts per day and computes current and best streaks', async () => {
  for (const day of [18, 19, 20, 21, 21, 24, 25, 26]) {
    const ctx = testCtx('UTC', at(day));
    await completeTask(ctx, (await createTask(ctx, { title: `d${day}` })).id);
  }
  const s = await getStats(testCtx('UTC', at(26)), 7);
  expect(s.perDay).toEqual({
    '2026-11-20': 1,
    '2026-11-21': 2,
    '2026-11-24': 1,
    '2026-11-25': 1,
    '2026-11-26': 1,
  });
  expect(s).toMatchObject({ perList: { inbox: 6 }, streak: 3, best: 4, total: 8 });
  expect((await getStats(testCtx('UTC', at(27)), 7)).streak).toBe(3); // alive until a full day is missed
  expect((await getStats(testCtx('UTC', at(28)), 7)).streak).toBe(0);
});

it('counts completions per list within the window only', async () => {
  const ctx0 = testCtx('UTC', at(10));
  const work = await createList(ctx0, { name: 'Work' });
  await completeTask(ctx0, (await createTask(ctx0, { title: 'old', listId: work.id })).id); // outside window
  for (const [day, listId] of [
    [24, work.id],
    [25, work.id],
    [26, 'inbox'],
  ] as const) {
    const ctx = testCtx('UTC', at(day));
    await completeTask(ctx, (await createTask(ctx, { title: `d${day}`, listId })).id);
  }
  const { perList } = await getStats(testCtx('UTC', at(26)), 7);
  expect(perList).toEqual({ [work.id]: 2, inbox: 7 }); // inbox: 6 from the first test + 1
});
