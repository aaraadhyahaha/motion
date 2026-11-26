import { describe, expect, it } from 'vitest';
import { createList } from '../src/services/lists';
import { quickAdd } from '../src/services/quickadd';
import { testCtx } from './helpers';

describe('quickAdd', () => {
  it('parses date, time, existing #list and @tags', async () => {
    const ctx = testCtx();
    const list = await createList(ctx, { name: 'Health' });
    const t = await quickAdd(ctx, { text: 'gym tomorrow 7am #health @fitness' });
    expect(t).toMatchObject({
      title: 'gym',
      dueDate: '2026-11-27',
      dueTime: '07:00',
      listId: list.id,
      tags: ['fitness'],
    });
  });

  it('keeps unknown #list in the title and defaults to Inbox', async () => {
    const t = await quickAdd(testCtx(), { text: 'buy #groceries milk' });
    expect(t).toMatchObject({ title: 'buy #groceries milk', listId: 'inbox' });
    expect(t).not.toHaveProperty('dueDate');
  });

  it('recurrence phrases set a rule and first occurrence', async () => {
    const ctx = testCtx(); // Thu 2026-11-26 12:00 UTC
    expect(await quickAdd(ctx, { text: 'pay rent every month on the 1st' })).toMatchObject({
      title: 'pay rent',
      rrule: 'FREQ=MONTHLY;BYMONTHDAY=1',
      dueDate: '2026-12-01',
    });
    expect(await quickAdd(ctx, { text: 'standup every weekday 9am' })).toMatchObject({
      title: 'standup',
      dueDate: '2026-11-27',
      dueTime: '09:00',
    });
    expect(await quickAdd(ctx, { text: 'water plants every! 3 days' })).toMatchObject({ recurFrom: 'done' });
  });

  it('resolves relative dates in the owner timezone', async () => {
    const now = Date.UTC(2026, 10, 26, 20); // 01:30 on the 27th in IST
    expect((await quickAdd(testCtx('UTC', now), { text: 'call today' })).dueDate).toBe('2026-11-26');
    expect((await quickAdd(testCtx('Asia/Kolkata', now), { text: 'call today' })).dueDate).toBe('2026-11-27');
  });
});
