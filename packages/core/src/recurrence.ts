/** RRULE subset: FREQ, INTERVAL, BYDAY (MO, 2TU, -1FR), BYMONTHDAY (1..31, -1), BYMONTH (YEARLY only).
 * Week starts Monday. Month days beyond month end clamp to the last day. */
import { addDays, type Day, dayOfWeek, daysInMonth, parseKey, toKey } from './dates';

export type Freq = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';
export interface ByDay {
  wd: number; // 0 = SU … 6 = SA
  n?: number; // ±1..5, MONTHLY/YEARLY only
}
export interface Rule {
  freq: Freq;
  interval: number;
  byDay?: ByDay[];
  byMonthDay?: number[];
  byMonth?: number;
}

export const WD = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'] as const;
const FREQS: Freq[] = ['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY'];

export function parseRule(s: string): Rule {
  const rule: Partial<Rule> = { interval: 1 };
  for (const part of s.replace(/^RRULE:/i, '').split(';')) {
    const [k, v = ''] = part.toUpperCase().split('=');
    if (k === 'FREQ' && FREQS.includes(v as Freq)) rule.freq = v as Freq;
    else if (k === 'INTERVAL' && /^\d{1,3}$/.test(v) && Number(v) > 0) rule.interval = Number(v);
    else if (k === 'BYDAY') {
      rule.byDay = v.split(',').map((t) => {
        const m = /^([+-]?[1-5])?(SU|MO|TU|WE|TH|FR|SA)$/.exec(t);
        if (!m) throw new Error(`bad BYDAY ${t}`);
        const wd = WD.indexOf(m[2] as (typeof WD)[number]);
        return m[1] ? { wd, n: Number(m[1]) } : { wd };
      });
    } else if (k === 'BYMONTHDAY') {
      rule.byMonthDay = v.split(',').map((t) => {
        const n = Number(t);
        if (!Number.isInteger(n) || n === 0 || n < -1 || n > 31) throw new Error(`bad BYMONTHDAY ${t}`);
        return n;
      });
    } else if (k === 'BYMONTH' && /^\d{1,2}$/.test(v) && +v >= 1 && +v <= 12) rule.byMonth = Number(v);
    else throw new Error(`unsupported RRULE part ${part}`);
  }
  if (!rule.freq) throw new Error('RRULE needs FREQ');
  if (rule.byDay?.some((b) => b.n) && (rule.freq === 'DAILY' || rule.freq === 'WEEKLY'))
    throw new Error('nth BYDAY needs MONTHLY/YEARLY');
  return rule as Rule;
}

export function formatRule(r: Rule): string {
  const parts = [`FREQ=${r.freq}`];
  if (r.interval > 1) parts.push(`INTERVAL=${r.interval}`);
  if (r.byMonth) parts.push(`BYMONTH=${r.byMonth}`);
  if (r.byDay?.length) parts.push(`BYDAY=${r.byDay.map((b) => `${b.n ?? ''}${WD[b.wd]}`).join(',')}`);
  if (r.byMonthDay?.length) parts.push(`BYMONTHDAY=${r.byMonthDay.join(',')}`);
  return parts.join(';');
}

export function isValidRule(s: string): boolean {
  try {
    parseRule(s);
    return true;
  } catch {
    return false;
  }
}

/** Pin implicit parts to the first due date so clamping (Jan 31 → Feb 28) never drifts. */
export function anchorRule(r: Rule, due: Day): Rule {
  const [, m, d] = parseKey(due);
  const out = { ...r };
  if (r.freq === 'WEEKLY' && !r.byDay?.length) out.byDay = [{ wd: dayOfWeek(due) }];
  if ((r.freq === 'MONTHLY' || r.freq === 'YEARLY') && !r.byDay?.length && !r.byMonthDay?.length)
    out.byMonthDay = [d];
  if (r.freq === 'YEARLY' && !r.byMonth) out.byMonth = m;
  return out;
}

const clampDay = (y: number, m: number, d: number) => {
  const dim = daysInMonth(y, m);
  return toKey(y, m, d === -1 ? dim : Math.min(d, dim));
};

function nthWeekday(y: number, m: number, wd: number, n: number): Day | null {
  const dim = daysInMonth(y, m);
  if (n > 0) {
    const day = 1 + ((wd - dayOfWeek(toKey(y, m, 1)) + 7) % 7) + (n - 1) * 7;
    return day <= dim ? toKey(y, m, day) : null;
  }
  const day = dim - ((dayOfWeek(toKey(y, m, dim)) - wd + 7) % 7) + (n + 1) * 7;
  return day >= 1 ? toKey(y, m, day) : null;
}

function monthDays(r: Rule, y: number, m: number, fallbackDay: number): Day[] {
  if (r.byMonthDay?.length) return r.byMonthDay.map((d) => clampDay(y, m, d));
  if (r.byDay?.length) {
    const out: Day[] = [];
    for (const b of r.byDay) {
      if (b.n) {
        const k = nthWeekday(y, m, b.wd, b.n);
        if (k) out.push(k);
      } else
        for (let n = 1; n <= 5; n++) {
          const k = nthWeekday(y, m, b.wd, n);
          if (k) out.push(k);
        }
    }
    return out;
  }
  return [clampDay(y, m, fallbackDay)];
}

function candidates(r: Rule, from: Day, p: number): Day[] {
  const [fy, fm, fd] = parseKey(from);
  switch (r.freq) {
    case 'DAILY': {
      const k = addDays(from, p);
      return !r.byDay?.length || r.byDay.some((b) => b.wd === dayOfWeek(k)) ? [k] : [];
    }
    case 'WEEKLY': {
      const monday = addDays(from, -((dayOfWeek(from) + 6) % 7) + p * 7);
      const wds = r.byDay?.length ? r.byDay.map((b) => b.wd) : [dayOfWeek(from)];
      return wds.map((wd) => addDays(monday, (wd + 6) % 7));
    }
    case 'MONTHLY': {
      const idx = fm - 1 + p;
      return monthDays(r, fy + Math.floor(idx / 12), (idx % 12) + 1, fd);
    }
    case 'YEARLY':
      return monthDays(r, fy + p, r.byMonth ?? fm, fd);
  }
}

/** First occurrence strictly after `from`; periods step by INTERVAL counted from `from`'s period. */
export function nextOccurrence(r: Rule, from: Day): Day {
  const step = r.freq === 'DAILY' && r.byDay?.length ? 1 : r.interval;
  for (let p = 0, i = 0; i < 2000; p += step, i++) {
    const hit = candidates(r, from, p)
      .filter((k) => k > from)
      .sort()[0];
    if (hit) return hit;
  }
  throw new Error('no occurrence found');
}

/** First occurrence on or after `day` (used when a recurring task is created without a date). */
export const firstOnOrAfter = (r: Rule, day: Day): Day => nextOccurrence(r, addDays(day, -1));

const ORD = ['last', '', '1st', '2nd', '3rd', '4th', '5th'];
const NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const UNIT = { DAILY: 'day', WEEKLY: 'week', MONTHLY: 'month', YEARLY: 'year' } as const;

export function describe(r: Rule): string {
  let s = r.interval > 1 ? `Every ${r.interval} ${UNIT[r.freq]}s` : `Every ${UNIT[r.freq]}`;
  if (r.byDay?.length) {
    const days = r.byDay.map((b) => `${b.n ? `${ORD[b.n < 0 ? 0 : b.n + 1]} ` : ''}${NAMES[b.wd]}`);
    s += ` on ${days.join(', ')}`;
  } else if (r.byMonthDay?.length) {
    s += ` on day ${r.byMonthDay.map((d) => (d === -1 ? 'last' : d)).join(', ')}`;
  }
  return s;
}
