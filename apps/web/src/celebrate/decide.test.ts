import { describe, expect, it } from 'vitest';
import { decide, type Facts, MILESTONES, note } from './decide';

const F: Facts = { onToday: true, inToday: true, openToday: 2 };

describe('celebrate/decide', () => {
  it('plain completion → nothing extra (ring bloom + strike are CSS)', () => {
    const m = decide(F);
    expect(m).toEqual({ todayDone: false, milestone: 0 });
    expect(note(m)).toBe('');
  });

  it('last open Today row on Today → today-done', () => {
    expect(decide({ ...F, openToday: 0 }).todayDone).toBe(true);
    expect(decide({ ...F, openToday: 0, onToday: false }).todayDone).toBe(false); // from another view
    expect(decide({ ...F, openToday: 0, inToday: false }).todayDone).toBe(false); // not a Today task
  });

  it('first completion of the day that lands the streak on a milestone', () => {
    for (const n of MILESTONES) expect(decide({ ...F, streak: n - 1, doneToday: 0 }).milestone).toBe(n);
    expect(decide({ ...F, streak: 6 }).milestone).toBe(7); // doneToday absent = 0
    expect(decide({ ...F, streak: 3, doneToday: 0 }).milestone).toBe(0); // 4 is not one
    expect(decide({ ...F, streak: 7, doneToday: 2 }).milestone).toBe(0); // already counted today
    expect(decide({ ...F }).milestone).toBe(0); // stats not cached → never guess
  });

  it('milestone → a toast line; today-done alone → none (the teacup carries it)', () => {
    expect(note(decide({ ...F, openToday: 0, streak: 29 }))).toBe('30-day streak. Nicely kept.');
    expect(note(decide({ ...F, openToday: 0 }))).toBe('');
  });
});
