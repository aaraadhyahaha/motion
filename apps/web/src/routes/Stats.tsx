// #sched #ui Stats: tiles (streak · today · week), 26-week heatmap, per-list bars (scaleX). Lazy chunk + stats.css.
import { addDays } from '@motion/core/dates';
import type { CSSProperties } from 'react';
import { Empty } from '../components/Empty';
import { PageHeader } from '../components/PageHeader';
import { useLists, useStats } from '../data/queries';
import { localToday } from '../lib/format';
import { Heatmap } from './Heatmap';
import '../styles/stats.css';

function Tile({ label, value, hint }: { label: string; value: number; hint?: string }) {
  return (
    <div className="tile">
      <span className="tile-label t-eyebrow">{label}</span>
      <span className="tile-value t-numeral">{value}</span>
      {hint && <span className="tile-hint t-caption1 mono">{hint}</span>}
    </div>
  );
}

export default function Stats() {
  const { data: s, isError, refetch } = useStats(182);
  const { data: lists } = useLists();
  const today = localToday();
  if (isError) return <Empty title="The ledger didn’t come through." onRetry={() => void refetch()} />;

  const week = Array.from({ length: 7 }, (_, i) => s?.perDay[addDays(today, -i)] ?? 0).reduce(
    (a, b) => a + b,
    0,
  );
  const per = Object.entries(s?.perList ?? {}).sort((a, b) => b[1] - a[1]);
  const top = per[0]?.[1] ?? 1;
  const byId = new Map(lists?.map((l) => [l.id, l]));

  return (
    <>
      <PageHeader title="Stats" />
      {s && !s.total && (
        <Empty icon="stats" title="Tiles at zero." hint="Finish one task and the streak begins." />
      )}
      {!!s?.total && (
        <>
          <div className="tiles">
            <Tile label="Streak" value={s.streak} hint={`Best ${s.best}`} />
            <Tile label="Today" value={s.perDay[today] ?? 0} />
            <Tile label="This week" value={week} />
          </div>
          <section className="task-section">
            <h2 className="task-section-title t-title3">Last 26 weeks</h2>
            <div className="stats-card">
              <Heatmap perDay={s.perDay} today={today} />
            </div>
          </section>
          {per.length > 0 && (
            <section className="task-section">
              <h2 className="task-section-title t-title3">By list</h2>
              <ul className="stats-card bars">
                {per.map(([id, n]) => {
                  const l = byId.get(id);
                  const style = {
                    '--k': n / top,
                    '--dot': l?.color ?? 'var(--list-purple)',
                  } as CSSProperties;
                  return (
                    <li key={id} className="bar-row" style={style}>
                      <span className="bar-label t-subhead">{l?.name ?? 'Inbox'}</span>
                      <span className="t-subhead mono">{n}</span>
                      <span className="bar" aria-hidden />
                    </li>
                  );
                })}
              </ul>
            </section>
          )}
        </>
      )}
    </>
  );
}
