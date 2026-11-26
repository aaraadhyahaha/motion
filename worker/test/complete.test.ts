import { zonedToEpoch } from '@motion/core';
import { describe, expect, it } from 'vitest';
import { completeTask, uncompleteTask } from '../src/services/complete';
import { createTask } from '../src/services/tasks';
import { T0, testCtx } from './helpers';

describe('completeTask', () => {
  it('marks one-off tasks done, idempotently, and undo reopens', async () => {
    const ctx = testCtx();
    const t = await createTask(ctx, { title: 'once' });
    const d = await completeTask(ctx, t.id);
    expect(d).toMatchObject({ done: true, doneAt: T0 });
    ctx.tick();
    expect((await completeTask(ctx, t.id)).doneAt).toBe(T0);
    const u = await uncompleteTask(ctx, t.id);
    expect(u.done).toBe(false);
    expect(u).not.toHaveProperty('doneAt');
  });

  it('rolls an overdue recurring task past today and shifts the reminder', async () => {
    const ctx = testCtx('America/New_York');
    const remindAt = zonedToEpoch('2026-11-23', '09:00', ctx.tz) - 600_000;
    const t = await createTask(ctx, {
      title: 'weekly',
      rrule: 'FREQ=WEEKLY;BYDAY=MO',
      dueDate: '2026-11-23',
      dueTime: '09:00',
      remindAt,
    });
    const c = await completeTask(ctx, t.id);
    expect(c).toMatchObject({ done: false, dueDate: '2026-11-30', dueTime: '09:00' });
    expect(c.remindAt).toBe(remindAt + 7 * 86_400_000);
    const u = await uncompleteTask(ctx, t.id);
    expect(u).toMatchObject({ dueDate: '2026-11-23', remindAt });
  });

  it('daily overdue task moves to tomorrow; every! counts from completion', async () => {
    const ctx = testCtx();
    const daily = await createTask(ctx, { title: 'd', rrule: 'FREQ=DAILY', dueDate: '2026-11-20' });
    expect((await completeTask(ctx, daily.id)).dueDate).toBe('2026-11-27');
    const fromDone = await createTask(ctx, {
      title: 'water',
      rrule: 'FREQ=DAILY;INTERVAL=3',
      recurFrom: 'done',
      dueDate: '2026-11-20',
    });
    expect((await completeTask(ctx, fromDone.id)).dueDate).toBe('2026-11-29');
  });

  it('uses the owner timezone for "today"', async () => {
    const ctx = testCtx('Asia/Kolkata', Date.UTC(2026, 10, 26, 20)); // 01:30 on the 27th in IST
    const t = await createTask(ctx, { title: 'd', rrule: 'FREQ=DAILY', dueDate: '2026-11-26' });
    expect((await completeTask(ctx, t.id)).dueDate).toBe('2026-11-28');
  });
});
