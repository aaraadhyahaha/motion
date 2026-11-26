// #anim completion celebration entry (lazy; loaded by useComplete on first completion, idle-prefetched).
// Reads only cached data (agenda, stats) — never fetches to celebrate. Keys are literal (= data/keys.ts):
// importing shared entry modules here makes Rolldown split them into extra initial chunks.
import type { Agenda, Stats } from '@motion/core/schemas';
import type { QueryClient } from '@tanstack/react-query';
import { decide, lines } from './decide';
import { burst } from './particles';
import { chime, soundOn } from './sound';
import '../styles/celebrate.css';

const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

function card(text: string[]) {
  document.querySelector('.celebrate-card')?.remove();
  const el = document.createElement('div');
  el.className = 'celebrate-card';
  el.setAttribute('role', 'status');
  for (const [i, s] of text.entries()) {
    const p = document.createElement('p');
    p.className = i ? 't-headline' : 'celebrate-title';
    p.textContent = s;
    el.append(p);
  }
  const close = () => {
    removeEventListener('keydown', esc);
    el.remove();
  };
  const esc = (e: KeyboardEvent) => e.key === 'Escape' && close();
  addEventListener('keydown', esc);
  el.addEventListener('click', close);
  el.addEventListener('animationend', (e) => e.animationName === 'celebrate-out' && close());
  document.body.append(el);
}

export function run(qc: QueryClient, id: string) {
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
  const text = lines(m);
  if (soundOn()) chime(text.length > 0);
  if (!reduced()) {
    const box = document.querySelector(`[data-id="${CSS.escape(id)}"] .check`)?.getBoundingClientRect();
    if (box) burst(box.x + box.width / 2, box.y + box.height / 2, text.length ? 30 : 36);
    if (text.length) for (const f of [0.2, 0.5, 0.8]) burst(innerWidth * f, innerHeight * 0.75, 30, 0);
  }
  if (text.length) card(text);
}
