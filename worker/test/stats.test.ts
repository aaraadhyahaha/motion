import { expect, it } from 'vitest';
import { completeTask } from '../src/services/complete';
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
  expect(s).toMatchObject({ streak: 3, best: 4, total: 8 });
  expect((await getStats(testCtx('UTC', at(27)), 7)).streak).toBe(3); // alive until a full day is missed
  expect((await getStats(testCtx('UTC', at(28)), 7)).streak).toBe(0);
});
