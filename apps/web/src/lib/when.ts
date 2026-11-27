// #sched quick-add date preview: a small mirror of the worker's chrono-node parse (forwardDate) for the
// phrases people actually type. Anything it doesn't know shows no chip rather than a wrong one.
import type { Day } from '@motion/core/dates';
import { fmtDay, fmtTime } from './format';

const DOW = 'sunmontuewedthufrisat';
// chrono's weekday spellings only (tue/tuesday, thu/thur/thurs/thursday; not "tues"/"weds")
const DAY =
  /\b(?:(today|tonight)|(tomorrow|tmrw?)|in (\d\d?) (day|week)s?|(?:(next|this|on) )?(sun|mon|tue|wed|thu|fri|sat)(?:day|sday|nesday|r|rs|rsday|urday)?)\b/;
const TIME = /\b(?:(\d\d?)(?::([0-5]\d))? ?([ap])m|([01]?\d|2[0-3]):([0-5]\d)|at (\d\d?)|(noon))\b/;
// the suffix must belong to that weekday (rejects "monurday")
const WEEKDAY = /^(sun|mon|fri)(day)?$|^tue(sday)?$|^wed(nesday)?$|^thu(r|rs|rsday)?$|^sat(urday)?$/;
const pad = (n: number) => String(n).padStart(2, '0');
// ISO date-only strings parse as UTC midnight; inlined so core/dates stays in its lazy chunk (#perf)
const addDays = (k: Day, n: number): Day => new Date(Date.parse(k) + n * 864e5).toISOString().slice(0, 10);

/** "call mom tomorrow 5pm" → "Tomorrow · 5:00 PM"; null when no date/time phrase is recognised.
 * `today` is the owner's day; `nowHm` ("HH:MM") pushes a bare past time to tomorrow, like chrono. */
export function previewWhen(text: string, today: Day, nowHm: string): string | null {
  const s = text.toLowerCase();
  const d = DAY.exec(s);
  const t = TIME.exec(s);
  let day: Day | null = null;
  if (d?.[1]) day = today;
  else if (d?.[2]) day = addDays(today, 1);
  else if (d?.[3]) day = addDays(today, +d[3] * (d[4] === 'week' ? 7 : 1));
  else if (d?.[6] && WEEKDAY.test(d[0].split(' ').pop() as string))
    day = addDays(
      today,
      ((DOW.indexOf(d[6] as string) / 3 - new Date(Date.parse(today)).getUTCDay() + 7) % 7) +
        (d[5] === 'next' ? 7 : 0),
    );
  let time: string | null = null;
  if (t) {
    let h = t[7] ? 12 : Number(t[6] ?? t[4] ?? t[1]);
    if (t[3]) h = h < 1 || h > 12 ? 99 : (h % 12) + (t[3] === 'p' ? 12 : 0);
    if (h < 24) time = `${pad(h)}:${t[5] ?? t[2] ?? '00'}`;
  }
  if (!day && !time) return null;
  day ??= time && time <= nowHm ? addDays(today, 1) : today;
  const label = day === today ? 'Today' : day === addDays(today, 1) ? 'Tomorrow' : fmtDay(day);
  return time ? `${label} · ${fmtTime(time)}` : label;
}
