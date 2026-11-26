import { describe, expect, it } from 'vitest';
import { SettingsUpdate, TaskCreate, TaskQuery, TaskUpdate } from './schemas';

describe('schemas', () => {
  it('query coercion, defaults and integer bounds', () => {
    expect(TaskQuery.parse({})).toEqual({ status: 'open', limit: 50 });
    expect(TaskQuery.parse({ limit: '20' }).limit).toBe(20);
    for (const limit of ['2.5', '0', '101', 'x']) expect(TaskQuery.safeParse({ limit }).success).toBe(false);
  });
  it('task create/update', () => {
    expect(TaskCreate.parse({ title: '  hi  ', tags: [' a '] })).toEqual({ title: 'hi', tags: ['a'] });
    expect(TaskCreate.safeParse({ title: '   ' }).success).toBe(false);
    expect(TaskCreate.safeParse({}).success).toBe(false);
    expect(TaskUpdate.parse({ dueDate: null })).toEqual({ dueDate: null });
    expect(TaskUpdate.safeParse({ durationMin: 1.5 }).success).toBe(false);
    expect(TaskUpdate.safeParse({ rrule: 'FREQ=HOURLY' }).success).toBe(false);
    expect(TaskUpdate.safeParse({ dueDate: '2026-02-30x' }).success).toBe(false);
  });
  it('settings tz', () => {
    expect(SettingsUpdate.safeParse({ tz: 'Asia/Kolkata' }).success).toBe(true);
    expect(SettingsUpdate.safeParse({ tz: 'Nope/Nope' }).success).toBe(false);
  });
});
