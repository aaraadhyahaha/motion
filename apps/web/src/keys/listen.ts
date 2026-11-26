// #ui the one global keydown listener (lazy: installed when this chunk loads at idle, via lib/prefetch).
// Row actions click the row's own controls, so they reuse the same mutations, toasts and celebrations.
import { MutationObserver } from '@tanstack/react-query';
import { queryClient } from '../data/client';
import { deleteOptions } from '../data/remove';
import { navigate } from '../lib/router';
import { type Action, HELP, resolve } from './map';
import '../styles/views.css';

const PATH: Partial<Record<Action, string>> = {
  today: '/',
  upcoming: '/upcoming',
  lists: '/lists',
  logbook: '/logbook',
  stats: '/stats',
};

let chordUntil = 0;
let help: HTMLDialogElement | undefined;

const editable = (el: Element | null) =>
  el instanceof HTMLElement && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName));
const rows = () => [...document.querySelectorAll<HTMLElement>('.row:not([data-leaving]) .row-body')];
const curRow = () => document.activeElement?.closest<HTMLElement>('.row') ?? null;

function step(by: number) {
  const all = rows();
  const cur = curRow()?.querySelector('.row-body');
  const i = cur ? all.indexOf(cur as HTMLElement) : by > 0 ? -1 : all.length;
  const next = all[Math.max(0, Math.min(all.length - 1, i + by))];
  next?.focus();
  next?.scrollIntoView({ block: 'nearest' });
}

export function showHelp() {
  if (!help) {
    help = document.createElement('dialog');
    help.className = 'help';
    help.setAttribute('aria-labelledby', 'help-title');
    // HELP is a static constant (no user text), so string HTML is safe and smallest
    help.innerHTML = `<h2 id="help-title" class="t-title2">Keyboard shortcuts</h2><dl>${HELP.map(
      ([k, d]) => `<dt class="mono t-subhead">${k}</dt><dd class="t-subhead">${d}</dd>`,
    ).join('')}</dl><form method="dialog"><button class="btn btn-tint">Done</button></form>`;
    help.addEventListener('click', (e) => e.target === help && help?.close());
    document.body.append(help);
  }
  if (!help.open) help.showModal(); // native: focus trap, Esc, focus return
}

function act(a: Action, row: HTMLElement | null) {
  const path = PATH[a];
  if (path) return navigate(path);
  switch (a) {
    case 'chord':
      chordUntil = performance.now() + 1000;
      return;
    case 'quick':
      return document.querySelector<HTMLElement>('.quick-add-input')?.focus();
    case 'search':
      return navigate('/search');
    case 'help':
      return showHelp();
    case 'next':
    case 'prev':
      return step(a === 'next' ? 1 : -1);
    case 'undo':
      return document.querySelector<HTMLElement>('.toast-action')?.click();
    case 'blur':
      return (document.activeElement as HTMLElement | null)?.blur();
  }
  if (!row) return;
  if (a === 'edit') return row.querySelector<HTMLElement>('.row-body')?.click();
  const id = row.dataset.id;
  step(1); // the row is about to leave (complete/delete) → keep focus in the list
  if (a === 'complete') return row.querySelector<HTMLElement>('.check')?.click();
  if (a === 'delete' && id) void new MutationObserver(queryClient, deleteOptions(queryClient)).mutate(id);
}

function onKey(e: KeyboardEvent) {
  const row = curRow();
  const chord = performance.now() < chordUntil;
  chordUntil = 0;
  const a = resolve(e, {
    editable: editable(document.activeElement),
    modal: !!document.querySelector('[aria-modal="true"], dialog[open]'),
    chord,
    row: !!row,
  });
  if (!a) return;
  e.preventDefault();
  act(a, row);
}

addEventListener('keydown', onKey);
document.documentElement.dataset.keys = ''; // ready marker (e2e waits on it)
