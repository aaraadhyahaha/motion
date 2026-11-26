import { describe, expect, it } from 'vitest';
import { addDays, dayOfWeek, diffDays, isValidTz, todayKey, tzOffsetMs, zonedToEpoch } from './dates';

describe('day math', () => {
  it('adds days across month, year and leap boundaries', () => {
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
  });
  it('weekday and diff', () => {
    expect(dayOfWeek('2026-11-26')).toBe(4);
    expect(diffDays('2026-11-26', '2026-12-03')).toBe(7);
  });
});

describe('timezones', () => {
  const now = Date.UTC(2026, 10, 26, 20, 0);
  it('todayKey depends on tz', () => {
    expect(todayKey('Asia/Kolkata', now)).toBe('2026-11-27');
    expect(todayKey('America/New_York', now)).toBe('2026-11-26');
    expect(tzOffsetMs(now, 'Asia/Kolkata')).toBe(5.5 * 3600_000);
  });
  it('zonedToEpoch handles fixed offsets and DST', () => {
    expect(zonedToEpoch('2026-11-26', '09:00', 'Asia/Kolkata')).toBe(Date.UTC(2026, 10, 26, 3, 30));
    expect(zonedToEpoch('2026-07-01', '09:00', 'America/New_York')).toBe(Date.UTC(2026, 6, 1, 13));
    expect(zonedToEpoch('2026-11-26', null, 'America/New_York')).toBe(Date.UTC(2026, 10, 26, 5));
    expect(zonedToEpoch('2026-03-08', '05:00', 'America/New_York')).toBe(Date.UTC(2026, 2, 8, 9));
  });
  it('DST gap resolves forward, overlap picks first', () => {
    expect(zonedToEpoch('2026-03-08', '02:30', 'America/New_York')).toBe(Date.UTC(2026, 2, 8, 7, 30));
    expect(zonedToEpoch('2026-11-01', '01:30', 'America/New_York')).toBe(Date.UTC(2026, 10, 1, 5, 30));
  });
  it('validates tz names', () => {
    expect(isValidTz('Europe/London')).toBe(true);
    expect(isValidTz('Mars/Olympus')).toBe(false);
  });
});
