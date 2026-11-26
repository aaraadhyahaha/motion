/** Quick-add tokenizer: pulls `#list`, `@tag` and `every …` / `every! …` out of the text.
 * Date/time words and the `#list` word stay in `text`; the worker strips `#list` only if that list exists. */
import { formatRule, type Rule } from './recurrence';

export interface QuickTokens {
  text: string;
  listName?: string;
  tags: string[];
  rrule?: string;
  recurFrom?: 'due' | 'done';
}

// biome-ignore format: compact lookup table
const DAYS: Record<string, number> = {
  sun: 0, sunday: 0, mon: 1, monday: 1, tue: 2, tues: 2, tuesday: 2, wed: 3, wednesday: 3,
  thu: 4, thur: 4, thurs: 4, thursday: 4, fri: 5, friday: 5, sat: 6, saturday: 6,
};
const UNITS: Record<string, Rule['freq']> = {
  day: 'DAILY',
  week: 'WEEKLY',
  month: 'MONTHLY',
  year: 'YEARLY',
};
// biome-ignore format: compact lookup table
const ORDS: Record<string, number> = {
  first: 1, '1st': 1, second: 2, '2nd': 2, third: 3, '3rd': 3, fourth: 4, '4th': 4, fifth: 5, '5th': 5, last: -1,
};
const WORDNUM: Record<string, number> = { other: 2, two: 2, three: 3, four: 4, five: 5, six: 6 };

const unit = (w = '') => UNITS[w.replace(/s$/, '')];
const monthDay = (w = '') => {
  const m = /^(\d{1,2})(st|nd|rd|th)?$/.exec(w);
  const n = m ? Number(m[1]) : 0;
  return n >= 1 && n <= 31 ? n : undefined;
};

/** Parse words after "every". Returns rule + number of words consumed, or null. */
export function parseEvery(words: string[]): { rule: Rule; used: number } | null {
  let i = 0;
  const w = () => words[i]?.toLowerCase().replace(/,$/, '');
  let interval = 1;
  if (/^\d{1,3}$/.test(w() ?? '') || WORDNUM[w() ?? '']) {
    interval = Number(w()) || (WORDNUM[w() ?? ''] as number);
    i++;
  }
  const first = w();
  if (!first) return null;
  if (first === 'weekday' || first === 'weekdays' || first === 'weekend' || first === 'weekends') {
    const byDay = (first.startsWith('weekend') ? [6, 0] : [1, 2, 3, 4, 5]).map((wd) => ({ wd }));
    return { rule: { freq: 'WEEKLY', interval: 1, byDay }, used: i + 1 };
  }
  if (ORDS[first] && DAYS[words[i + 1]?.toLowerCase() ?? ''] !== undefined) {
    const n = ORDS[first] as number;
    const wd = DAYS[(words[i + 1] as string).toLowerCase()] as number;
    return { rule: { freq: 'MONTHLY', interval, byDay: [{ wd, n }] }, used: i + 2 };
  }
  const md = monthDay(first);
  if (md && interval === 1) return { rule: { freq: 'MONTHLY', interval: 1, byMonthDay: [md] }, used: i + 1 };
  if (DAYS[first] !== undefined) {
    const byDay: { wd: number }[] = [];
    while (w() && (DAYS[w() as string] !== undefined || w() === 'and')) {
      if (w() !== 'and') byDay.push({ wd: DAYS[w() as string] as number });
      i++;
    }
    return { rule: { freq: 'WEEKLY', interval, byDay }, used: i };
  }
  const freq = unit(first);
  if (!freq) return null;
  i++;
  const rule: Rule = { freq, interval };
  // "every month on the 1st" / "every month on the last day" / "every 2 weeks on mon, thu"
  if (w() === 'on') {
    let j = i + 1;
    if (words[j]?.toLowerCase() === 'the') j++;
    const t = words[j]?.toLowerCase().replace(/,$/, '');
    if (freq === 'MONTHLY' && t === 'last' && /^day$/i.test(words[j + 1] ?? '')) {
      rule.byMonthDay = [-1];
      i = j + 2;
    } else if (freq === 'MONTHLY' && monthDay(t)) {
      rule.byMonthDay = [monthDay(t) as number];
      i = j + 1;
    } else if (freq === 'WEEKLY' && t && DAYS[t] !== undefined) {
      const sub = parseEvery(words.slice(j));
      if (sub?.rule.byDay) {
        rule.byDay = sub.rule.byDay;
        i = j + sub.used;
      }
    }
  }
  return { rule, used: i };
}

export function tokenize(input: string): QuickTokens {
  const tags: string[] = [];
  let listName: string | undefined;
  let rrule: string | undefined;
  let recurFrom: QuickTokens['recurFrom'];
  const kept: string[] = [];
  const words = input.trim().split(/\s+/).filter(Boolean);
  for (let i = 0; i < words.length; i++) {
    const word = words[i] as string;
    const tag = /^@([\p{L}\p{N}_-]+)$/u.exec(word);
    const list = /^#([\p{L}\p{N}_-]+)$/u.exec(word);
    if (tag) {
      const name = tag[1] as string;
      if (!tags.some((t) => t.toLowerCase() === name.toLowerCase())) tags.push(name);
    } else if (list) {
      listName ??= list[1];
      kept.push(word);
    } else if (!rrule && /^every!?$/i.test(word)) {
      const parsed = parseEvery(words.slice(i + 1));
      if (!parsed) {
        kept.push(word);
        continue;
      }
      rrule = formatRule(parsed.rule);
      recurFrom = word.endsWith('!') ? 'done' : 'due';
      i += parsed.used;
    } else kept.push(word);
  }
  const out: QuickTokens = { text: kept.join(' '), tags };
  if (listName) out.listName = listName;
  if (rrule) Object.assign(out, { rrule, recurFrom });
  return out;
}
