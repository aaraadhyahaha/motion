import { toKey, tzOffsetMs } from '@motion/core';

export interface NlDate {
  dueDate: string;
  dueTime?: string;
  /** Text with the matched date phrase removed. */
  rest: string;
}

const pad = (n: number) => String(n).padStart(2, '0');

/** First date/time phrase in `text`, resolved in `tz`. chrono-node is loaded only on this path. */
export async function parseNlDate(text: string, tz: string, now: number): Promise<NlDate | null> {
  const chrono = await import('chrono-node/en');
  const ref = { instant: new Date(now), timezone: tzOffsetMs(now, tz) / 60_000 };
  const [hit] = chrono.parse(text, ref, { forwardDate: true });
  if (!hit) return null;
  const s = hit.start;
  const rest = `${text.slice(0, hit.index)} ${text.slice(hit.index + hit.text.length)}`
    .replace(/\s+/g, ' ')
    .trim();
  const out: NlDate = { dueDate: toKey(s.get('year') ?? 0, s.get('month') ?? 1, s.get('day') ?? 1), rest };
  if (s.isCertain('hour')) out.dueTime = `${pad(s.get('hour') ?? 0)}:${pad(s.get('minute') ?? 0)}`;
  return out;
}
