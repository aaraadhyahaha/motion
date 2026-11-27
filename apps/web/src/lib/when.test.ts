// #sched preview must agree with the worker's chrono parse (forwardDate) — cases probed against chrono-node.
import { describe, expect, it } from 'vitest';
import { fmtDay, fmtTime } from './format';
import { previewWhen } from './when';

const T = '2026-11-26'; // Thursday
const at = (t: string) => previewWhen(t, T, '15:00');

describe('previewWhen', () => {
  it('relative days', () => {
    expect(at('call mom today')).toBe('Today');
    expect(at('tonight')).toBe('Today');
    expect(at('gym tomorrow')).toBe('Tomorrow');
    expect(at('tmrw')).toBe('Tomorrow');
    expect(at('in 3 days')).toBe(fmtDay('2026-11-29'));
    expect(at('in 2 weeks')).toBe(fmtDay('2026-12-10'));
  });
  it('weekdays: same day is today, next adds a week, unknown spellings show nothing', () => {
    expect(at('call friday')).toBe('Tomorrow');
    expect(at('thursday')).toBe('Today');
    expect(at('mon')).toBe(fmtDay('2026-11-30'));
    expect(at('on sat')).toBe(fmtDay('2026-11-28'));
    expect(at('next friday')).toBe(fmtDay('2026-12-04'));
    expect(at('next thursday')).toBe(fmtDay('2026-12-03'));
    expect(at('tues')).toBeNull();
    expect(at('monster truck')).toBeNull();
  });
  it('phrases it does not mirror show no chip (the worker may still parse them)', () => {
    expect(at('dec 3')).toBeNull();
    expect(at('monurday')).toBeNull();
  });
  it('times; a bare past time moves to tomorrow', () => {
    expect(at('5pm')).toBe(`Today · ${fmtTime('17:00')}`);
    expect(at('9am')).toBe(`Tomorrow · ${fmtTime('09:00')}`);
    expect(at('17:30')).toBe(`Today · ${fmtTime('17:30')}`);
    expect(at('noon')).toBe(`Tomorrow · ${fmtTime('12:00')}`);
    expect(at('tomorrow at 5')).toBe(`Tomorrow · ${fmtTime('05:00')}`);
    expect(at('fri 5:30pm')).toBe(`Tomorrow · ${fmtTime('17:30')}`);
    expect(at('13pm')).toBeNull();
  });
  it('no date words → null', () => {
    expect(at('buy milk')).toBeNull();
  });
});
