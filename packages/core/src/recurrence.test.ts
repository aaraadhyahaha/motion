import { describe, expect, it } from 'vitest';
import {
  anchorRule,
  describe as describeRule,
  firstOnOrAfter,
  formatRule,
  nextOccurrence,
  parseRule,
} from './recurrence';

const next = (s: string, from: string) => nextOccurrence(parseRule(s), from);

describe('parse/format', () => {
  it('round-trips', () => {
    for (const s of [
      'FREQ=WEEKLY;INTERVAL=2;BYDAY=MO,WE',
      'FREQ=MONTHLY;BYDAY=-1FR',
      'FREQ=YEARLY;BYMONTH=2;BYMONTHDAY=29',
    ])
      expect(formatRule(parseRule(s))).toBe(s);
  });
  it('rejects unsupported rules', () => {
    for (const s of [
      'FREQ=HOURLY',
      'FREQ=WEEKLY;BYDAY=2MO',
      'FREQ=DAILY;COUNT=3',
      'INTERVAL=2',
      'FREQ=MONTHLY;BYMONTHDAY=0',
    ])
      expect(() => parseRule(s)).toThrow();
  });
});

describe('nextOccurrence', () => {
  it('daily with interval and weekday filter', () => {
    expect(next('FREQ=DAILY', '2026-11-26')).toBe('2026-11-27');
    expect(next('FREQ=DAILY;INTERVAL=3', '2026-11-26')).toBe('2026-11-29');
    expect(next('FREQ=DAILY;BYDAY=SA,SU', '2026-11-26')).toBe('2026-11-28');
  });
  it('weekdays skip the weekend', () => {
    expect(next('FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR', '2026-11-27')).toBe('2026-11-30');
  });
  it('weekly interval steps whole weeks', () => {
    expect(next('FREQ=WEEKLY;INTERVAL=2;BYDAY=MO,WE', '2026-11-23')).toBe('2026-11-25');
    expect(next('FREQ=WEEKLY;INTERVAL=2;BYDAY=MO,WE', '2026-11-25')).toBe('2026-12-07');
  });
  it('nth and last weekday of month', () => {
    expect(next('FREQ=MONTHLY;BYDAY=2TU', '2026-11-26')).toBe('2026-12-08');
    expect(next('FREQ=MONTHLY;BYDAY=-1FR', '2026-11-26')).toBe('2026-11-27');
  });
  it('month day clamps without drifting', () => {
    expect(next('FREQ=MONTHLY;BYMONTHDAY=31', '2027-01-31')).toBe('2027-02-28');
    expect(next('FREQ=MONTHLY;BYMONTHDAY=31', '2027-02-28')).toBe('2027-03-31');
    expect(next('FREQ=MONTHLY;BYMONTHDAY=-1', '2026-11-26')).toBe('2026-11-30');
  });
  it('yearly leap day', () => {
    const r = anchorRule(parseRule('FREQ=YEARLY'), '2028-02-29');
    expect(formatRule(r)).toBe('FREQ=YEARLY;BYMONTH=2;BYMONTHDAY=29');
    expect(nextOccurrence(r, '2028-02-29')).toBe('2029-02-28');
    expect(nextOccurrence(r, '2031-02-28')).toBe('2032-02-29');
  });
  it('anchorRule pins weekly/monthly defaults', () => {
    expect(formatRule(anchorRule(parseRule('FREQ=WEEKLY'), '2026-11-26'))).toBe('FREQ=WEEKLY;BYDAY=TH');
    expect(formatRule(anchorRule(parseRule('FREQ=MONTHLY'), '2027-01-31'))).toBe(
      'FREQ=MONTHLY;BYMONTHDAY=31',
    );
  });
  it('firstOnOrAfter includes the day itself', () => {
    expect(firstOnOrAfter(parseRule('FREQ=WEEKLY;BYDAY=MO'), '2026-11-26')).toBe('2026-11-30');
    expect(firstOnOrAfter(parseRule('FREQ=WEEKLY;BYDAY=MO'), '2026-11-30')).toBe('2026-11-30');
  });
});

it('describes rules', () => {
  expect(describeRule(parseRule('FREQ=WEEKLY;INTERVAL=2;BYDAY=MO,WE'))).toBe('Every 2 weeks on Mon, Wed');
  expect(describeRule(parseRule('FREQ=MONTHLY;BYDAY=-1FR'))).toBe('Every month on last Fri');
  expect(describeRule(parseRule('FREQ=MONTHLY;BYDAY=2TU'))).toBe('Every month on 2nd Tue');
});
