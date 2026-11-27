// #sched #ui 26-week completion heatmap: CSS grid (weeks = columns, Sun→Sat rows), 5 tint levels via color-mix.
import { addDays, dayOfWeek } from '@motion/core/dates';
import { memo } from 'react';
import { fmtDay } from '../lib/format';

const WEEKS = 26;

type Props = { perDay: Record<string, number>; today: string };

export const Heatmap = memo(function Heatmap({ perDay, today }: Props) {
  const start = addDays(today, -((WEEKS - 1) * 7 + dayOfWeek(today)));
  const n = (WEEKS - 1) * 7 + dayOfWeek(today) + 1;
  const max = Math.max(1, ...Object.values(perDay));
  const cells = Array.from({ length: n }, (_, i) => {
    const day = addDays(start, i);
    const c = perDay[day] ?? 0;
    return { day, c, l: c && Math.min(4, Math.ceil((c / max) * 4)) };
  });
  const total = cells.reduce((s, x) => s + x.c, 0);
  const active = cells.filter((x) => x.c).length;
  const sparse = active < 14; // fewer than two weeks of marks

  return (
    <>
      <div
        className="heatmap"
        role="img"
        aria-label={`${total} completions in the last ${WEEKS} weeks`}
        data-sparse={sparse || undefined}
      >
        {cells.map(({ day, c, l }) => (
          <span key={day} className="heat" data-l={l || undefined} title={`${c} · ${fmtDay(day)}`} />
        ))}
      </div>
      {sparse && (
        <p className="heat-note t-footnote">A few marks so far. The grid fills in as you finish things.</p>
      )}
    </>
  );
});
