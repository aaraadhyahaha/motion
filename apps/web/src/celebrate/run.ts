// #anim completion feedback entry (lazy; loaded by useComplete on first completion, idle-prefetched).
// Ink stamp: a routine tick is ring bloom + strike (CSS) + haptic. No confetti on routine ticks.
// "Today's done" is authored in the teacup empty state (Empty + celebrate.css). Streak milestones earn the
// one burst plus a toast line (via `say`, injected so no entry module is imported here).
// Reads only cached data (agenda, stats) — never fetches. Keys are literal (= data/keys.ts):
// importing shared entry modules here makes Rolldown split them into extra initial chunks.
import type { Agenda, Stats } from '@motion/core/schemas';
import type { QueryClient } from '@tanstack/react-query';
import { decide, note } from './decide';
import { burst } from './particles';
import { chime, soundOn } from './sound';
import '../styles/celebrate.css';

export function run(qc: QueryClient, id: string, say: (msg: string) => void) {
  navigator.vibrate?.(10);
  const a = qc.getQueryData<Agenda>(['agenda', 14]);
  const today = a?.today ?? '';
  // same membership rule as routes/Today.tsx
  const rows = a
    ? [
        ...a.overdue.filter((t) => !t.dueDate || t.dueDate < today),
        ...(a.days[today]?.filter((t) => !t.dueDate || t.dueDate <= today) ?? []),
      ]
    : [];
  const st = qc.getQueriesData<Stats>({ queryKey: ['stats'] }).find(([, d]) => d)?.[1];
  const m = decide({
    onToday: location.pathname === '/',
    inToday: rows.some((t) => t.id === id),
    openToday: rows.filter((t) => !t.done).length,
    doneToday: st?.perDay[today],
    streak: st?.streak,
  });
  if (soundOn()) chime(m.todayDone || m.milestone > 0);
  const line = note(m);
  if (!line) return;
  say(line);
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const box = document.querySelector(`[data-id="${CSS.escape(id)}"] .check`)?.getBoundingClientRect();
  if (box) burst(box.x + box.width / 2, box.y + box.height / 2, 36);
}
