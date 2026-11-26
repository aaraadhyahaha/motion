import { expect, it } from 'vitest';
import { getAgenda } from '../src/services/agenda';
import { completeTask } from '../src/services/complete';
import { createTask } from '../src/services/tasks';
import { testCtx } from './helpers';

it('groups overdue and upcoming days, timed before untimed', async () => {
  const ctx = testCtx();
  const mk = (title: string, dueDate?: string, dueTime?: string) =>
    createTask(ctx, { title, ...(dueDate && { dueDate }), ...(dueTime && { dueTime }) });
  await mk('overdue', '2026-11-20');
  await mk('today-untimed', '2026-11-26');
  await mk('today-timed', '2026-11-26', '18:00');
  await mk('in3', '2026-11-29');
  await mk('beyond', '2026-12-10');
  await mk('undated');
  await completeTask(ctx, (await mk('done-today', '2026-11-26')).id);

  const a = await getAgenda(ctx, 7);
  expect(a.today).toBe('2026-11-26');
  expect(a.overdue.map((t) => t.title)).toEqual(['overdue']);
  expect(Object.keys(a.days)).toHaveLength(7);
  expect(a.days['2026-11-26']?.map((t) => t.title)).toEqual(['today-timed', 'today-untimed']);
  expect(a.days['2026-11-29']?.map((t) => t.title)).toEqual(['in3']);
  expect(a.days['2026-11-27']).toEqual([]);
  expect(JSON.stringify(a)).not.toContain('beyond');
});
