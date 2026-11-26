// #sched #ui date + time + duration with quick chips (Today / Tomorrow / Next week / None).
import { addDays, type Day, dayOfWeek } from '@motion/core/dates';
import { Icon } from '../components/Icon';
import { fmtDuration } from '../lib/format';

type Value = { dueDate?: string; dueTime?: string; durationMin?: number };
type Props = Value & { today: Day; onChange: (v: Value) => void };

const DURATIONS = [5, 15, 30, 45, 60, 90, 120, 180, 240];

export function DateFields({ today, dueDate, dueTime, durationMin, onChange }: Props) {
  const set = (p: Value) => onChange({ dueDate, dueTime, durationMin, ...p });
  const chips: [string, Day | undefined][] = [
    ['Today', today],
    ['Tomorrow', addDays(today, 1)],
    ['Next week', addDays(today, (8 - dayOfWeek(today)) % 7 || 7)], // next Monday
    ['None', undefined],
  ];
  const durs = durationMin && !DURATIONS.includes(durationMin) ? [durationMin, ...DURATIONS] : DURATIONS;

  return (
    <div className="ed-group">
      <div className="ed-chips" role="group" aria-label="Quick dates">
        {chips.map(([label, d]) => (
          <button
            key={label}
            type="button"
            className="ed-chip"
            aria-pressed={dueDate === d}
            // clearing the date clears the time too (time without a day is meaningless)
            onClick={() => set(d ? { dueDate: d } : { dueDate: undefined, dueTime: undefined })}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="inset-group">
        <label className="ed-row">
          <Icon name="today" className="ed-icon" />
          <span className="ed-label">Date</span>
          <input
            type="date"
            className="ed-native"
            value={dueDate ?? ''}
            onChange={(e) =>
              set(e.target.value ? { dueDate: e.target.value } : { dueDate: undefined, dueTime: undefined })
            }
          />
        </label>
        <label className="ed-row">
          <Icon name="clock" className="ed-icon" />
          <span className="ed-label">Time</span>
          <input
            type="time"
            className="ed-native mono"
            value={dueTime ?? ''}
            disabled={!dueDate}
            onChange={(e) => set({ dueTime: e.target.value || undefined })}
          />
        </label>
        <label className="ed-row">
          <span className="ed-icon" />
          <span className="ed-label">Duration</span>
          <select
            className="ed-native"
            value={durationMin ?? ''}
            onChange={(e) => set({ durationMin: e.target.value ? Number(e.target.value) : undefined })}
          >
            <option value="">None</option>
            {durs.map((n) => (
              <option key={n} value={n}>
                {fmtDuration(n)}
              </option>
            ))}
          </select>
        </label>
      </div>
    </div>
  );
}
