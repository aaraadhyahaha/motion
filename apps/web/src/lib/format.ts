// #ui display formatting for row meta. Intl formatters built once.
import type { Day } from '@motion/core/dates';

const time = new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit', timeZone: 'UTC' });
const day = new Intl.DateTimeFormat(undefined, {
  weekday: 'short',
  month: 'short',
  day: 'numeric',
  timeZone: 'UTC',
});
const full = new Intl.DateTimeFormat(undefined, {
  weekday: 'long',
  month: 'long',
  day: 'numeric',
  timeZone: 'UTC',
});

/** "14:30" → "2:30 PM" (locale). */
export function fmtTime(hhmm: string): string {
  const [h = 0, m = 0] = hhmm.split(':').map(Number);
  return time.format(Date.UTC(2000, 0, 1, h, m));
}

const utc = (k: Day) => {
  const [y = 0, m = 1, d = 1] = k.split('-').map(Number);
  return Date.UTC(y, m - 1, d);
};
/** "2026-11-24" → "Tue, Nov 24". */
export const fmtDay = (k: Day) => day.format(utc(k));
/** "2026-11-26" → "Thursday, November 26". */
export const fmtDayLong = (k: Day) => full.format(utc(k));

/** 90 → "1h 30m". */
export function fmtDuration(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h ? (m ? `${h}h ${m}m` : `${h}h`) : `${m}m`;
}

/** Client-side today (YYYY-MM-DD in the device tz); server agenda.today wins when known. */
export const localToday = (): Day => new Date().toLocaleDateString('en-CA');
