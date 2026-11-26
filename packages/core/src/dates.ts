/** Civil-date helpers. A Day is a local calendar date `YYYY-MM-DD`; all day math is done in UTC
 * on these keys so host timezone never leaks in. Timezone conversion uses Intl only. */
export type Day = string; // YYYY-MM-DD

const pad = (n: number, w = 2) => String(n).padStart(w, '0');

export function toKey(y: number, m: number, d: number): Day {
  return `${pad(y, 4)}-${pad(m)}-${pad(d)}`;
}

export function parseKey(k: Day): [y: number, m: number, d: number] {
  return [Number(k.slice(0, 4)), Number(k.slice(5, 7)), Number(k.slice(8, 10))];
}

const keyFromUTC = (ms: number) => {
  const dt = new Date(ms);
  return toKey(dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate());
};

const utcOf = (k: Day) => {
  const [y, m, d] = parseKey(k);
  return Date.UTC(y, m - 1, d);
};

export const addDays = (k: Day, n: number): Day => keyFromUTC(utcOf(k) + n * 86_400_000);

/** 0 = Sunday … 6 = Saturday */
export const dayOfWeek = (k: Day): number => new Date(utcOf(k)).getUTCDay();

export const daysInMonth = (y: number, m: number): number => new Date(Date.UTC(y, m, 0)).getUTCDate();

/** Whole days from a to b (b − a). */
export const diffDays = (a: Day, b: Day): number => Math.round((utcOf(b) - utcOf(a)) / 86_400_000);

const fmtCache = new Map<string, Intl.DateTimeFormat>();
function fmt(tz: string) {
  let f = fmtCache.get(tz);
  if (!f) {
    f = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      hourCycle: 'h23',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    fmtCache.set(tz, f);
  }
  return f;
}

function wall(ms: number, tz: string) {
  const p: Record<string, number> = {};
  for (const { type, value } of fmt(tz).formatToParts(ms)) if (type !== 'literal') p[type] = Number(value);
  return p as Record<'year' | 'month' | 'day' | 'hour' | 'minute' | 'second', number>;
}

/** Offset of `tz` from UTC at instant `ms`, in ms (e.g. +05:30 → 19_800_000). */
export function tzOffsetMs(ms: number, tz: string): number {
  const w = wall(ms, tz);
  const asUTC = Date.UTC(w.year, w.month - 1, w.day, w.hour, w.minute, w.second);
  return asUTC - (ms - (ms % 1000));
}

export function epochToDayKey(ms: number, tz: string): Day {
  const w = wall(ms, tz);
  return toKey(w.year, w.month, w.day);
}

export const todayKey = (tz: string, now: number): Day => epochToDayKey(now, tz);

/** Local wall time (`day` + optional `HH:MM`) in `tz` → epoch ms. Gaps (DST spring-forward) resolve forward. */
export function zonedToEpoch(day: Day, time: string | null | undefined, tz: string): number {
  const [y, m, d] = parseKey(day);
  const [h, mi] = time ? time.split(':').map(Number) : [0, 0];
  const guess = Date.UTC(y, m - 1, d, h ?? 0, mi ?? 0);
  const t = guess - tzOffsetMs(guess, tz);
  const off2 = tzOffsetMs(t, tz);
  const t2 = guess - off2;
  // t2 is exact when its offset is self-consistent; otherwise the wall time is in a DST gap → t (later).
  return tzOffsetMs(t2, tz) === off2 ? t2 : t;
}

export function isValidTz(tz: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}
