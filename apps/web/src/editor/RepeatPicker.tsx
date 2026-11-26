// #recur #ui repeat presets + custom rule (freq, interval, weekdays, month day). RRULE via core/recurrence (no zod).
import { describe, type Freq, formatRule, parseRule, type Rule } from '@motion/core/recurrence';
import { useState } from 'react';
import { Icon } from '../components/Icon';

type Value = { rrule?: string; recurFrom?: 'due' | 'done' };
type Props = Value & { onChange: (v: Value) => void };

const PRESETS: [string, string][] = [
  ['Daily', 'FREQ=DAILY'],
  ['Weekdays', 'FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR'],
  ['Weekly', 'FREQ=WEEKLY'],
  ['Monthly', 'FREQ=MONTHLY'],
  ['Yearly', 'FREQ=YEARLY'],
];
const UNITS: [Freq, string][] = [
  ['DAILY', 'days'],
  ['WEEKLY', 'weeks'],
  ['MONTHLY', 'months'],
  ['YEARLY', 'years'],
];
const WEEK = [1, 2, 3, 4, 5, 6, 0]; // Monday first
const WD_SHORT = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const WD_LONG = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTH_DAYS = [...Array.from({ length: 31 }, (_, i) => i + 1), -1];

function safeParse(s?: string): Rule | null {
  if (!s) return null;
  try {
    return parseRule(s);
  } catch {
    return null;
  }
}

export function RepeatPicker({ rrule, recurFrom, onChange }: Props) {
  const rule = safeParse(rrule);
  const preset = rrule ? PRESETS.find(([, r]) => r === rrule)?.[1] : '';
  const [custom, setCustom] = useState(preset === undefined);
  const mode = custom ? 'custom' : (preset ?? 'custom');

  const setRule = (r: Rule) => onChange({ rrule: formatRule(r), recurFrom });
  const pick = (v: string) => {
    setCustom(v === 'custom');
    if (v === 'custom') setRule(rule ?? { freq: 'WEEKLY', interval: 1 });
    else onChange({ rrule: v || undefined, recurFrom: v ? recurFrom : undefined });
  };
  const toggleDay = (wd: number) => {
    if (!rule) return;
    const has = rule.byDay?.some((b) => b.wd === wd);
    const byDay = has ? rule.byDay?.filter((b) => b.wd !== wd) : [...(rule.byDay ?? []), { wd }];
    setRule({
      ...rule,
      byDay: byDay?.length ? byDay.sort((a, b) => WEEK.indexOf(a.wd) - WEEK.indexOf(b.wd)) : undefined,
    });
  };

  return (
    <div className="ed-group">
      <div className="inset-group">
        <label className="ed-row">
          <Icon name="repeat" className="ed-icon" />
          <span className="ed-label">Repeat</span>
          <select className="ed-native" value={mode} onChange={(e) => pick(e.target.value)}>
            <option value="">Never</option>
            {PRESETS.map(([label, r]) => (
              <option key={r} value={r}>
                {label}
              </option>
            ))}
            <option value="custom">Custom…</option>
          </select>
        </label>
        {rule && mode === 'custom' && (
          <label className="ed-row">
            <span className="ed-icon" />
            <span className="ed-label">Every</span>
            <input
              type="number"
              inputMode="numeric"
              min={1}
              max={99}
              className="ed-native ed-num tnum"
              value={rule.interval}
              onChange={(e) =>
                setRule({ ...rule, interval: Math.min(99, Math.max(1, Number(e.target.value) || 1)) })
              }
            />
            <select
              className="ed-native"
              aria-label="Unit"
              value={rule.freq}
              onChange={(e) => setRule({ freq: e.target.value as Freq, interval: rule.interval })}
            >
              {UNITS.map(([f, u]) => (
                <option key={f} value={f}>
                  {u}
                </option>
              ))}
            </select>
          </label>
        )}
        {rule && mode === 'custom' && rule.freq === 'WEEKLY' && (
          <div className="ed-row ed-days" role="group" aria-label="On days">
            {WEEK.map((wd) => (
              <button
                key={wd}
                type="button"
                className="ed-day"
                aria-label={WD_LONG[wd]}
                aria-pressed={!!rule.byDay?.some((b) => b.wd === wd)}
                onClick={() => toggleDay(wd)}
              >
                {WD_SHORT[wd]}
              </button>
            ))}
          </div>
        )}
        {rule && mode === 'custom' && rule.freq === 'MONTHLY' && (
          <label className="ed-row">
            <span className="ed-icon" />
            <span className="ed-label">On day</span>
            <select
              className="ed-native tnum"
              value={rule.byMonthDay?.[0] ?? ''}
              onChange={(e) =>
                setRule({
                  ...rule,
                  byDay: undefined,
                  byMonthDay: e.target.value ? [Number(e.target.value)] : undefined,
                })
              }
            >
              <option value="">Same as due date</option>
              {MONTH_DAYS.map((d) => (
                <option key={d} value={d}>
                  {d === -1 ? 'Last day' : d}
                </option>
              ))}
            </select>
          </label>
        )}
        {rule && (
          <label className="ed-row">
            <span className="ed-icon" />
            <span className="ed-label">From completion</span>
            <input
              type="checkbox"
              role="switch"
              className="ed-switch"
              checked={recurFrom === 'done'}
              onChange={(e) => onChange({ rrule, recurFrom: e.target.checked ? 'done' : 'due' })}
            />
          </label>
        )}
      </div>
      {rule && <p className="t-footnote ed-hint">{describe(rule)}</p>}
    </div>
  );
}
