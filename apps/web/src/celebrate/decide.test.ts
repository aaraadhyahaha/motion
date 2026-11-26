import { describe, expect, it } from 'vitest';
import { decide, type Facts, lines, MILESTONES } from './decide';

const F: Facts = { onToday: true, inToday: true, openToday: 2 };

describe('celebrate/decide', () => {
  it('plain completion → burst only', () => {
    const m = decide(F);
    expect(m).toEqual({ todayDone: false, milestone: 0 });
    expect(lines(m)).toEqual([]);
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

  it('both at once → one card, two lines', () => {
    expect(lines(decide({ ...F, openToday: 0, streak: 29 }))).toEqual(['Today’s done.', '30-day streak.']);
  });
});
