// #ui pure keyboard map: (event, context) → action. One source for the listener and the `?` help sheet.
export type Action =
  | 'quick'
  | 'search'
  | 'chord'
  | 'today'
  | 'upcoming'
  | 'lists'
  | 'logbook'
  | 'stats'
  | 'next'
  | 'prev'
  | 'complete'
  | 'edit'
  | 'delete'
  | 'undo'
  | 'help'
  | 'blur';

export interface KeyLike {
  key: string;
  metaKey?: boolean;
  ctrlKey?: boolean;
  altKey?: boolean;
  isComposing?: boolean;
  keyCode?: number;
  repeat?: boolean;
}

export interface KeyCtx {
  /** Focus is in an input/textarea/select/contenteditable. */
  editable: boolean;
  /** An aria-modal sheet/dialog is open (it owns its own keys). */
  modal: boolean;
  /** `G` was pressed < 1 s ago. */
  chord: boolean;
  /** Focus is inside a task row. */
  row: boolean;
}

export const GO: Record<string, Action> = { t: 'today', u: 'upcoming', l: 'lists', b: 'logbook', s: 'stats' };

const PLAIN: Record<string, Action> = { n: 'quick', '/': 'search', g: 'chord', '?': 'help', u: 'undo' };
const NAV: Record<string, Action> = { j: 'next', arrowdown: 'next', k: 'prev', arrowup: 'prev' };
const ROW: Record<string, Action> = { x: 'complete', e: 'edit', backspace: 'delete', delete: 'delete' };

export function resolve(e: KeyLike, c: KeyCtx): Action | null {
  if (e.isComposing || e.keyCode === 229) return null; // IME composition
  const k = e.key.toLowerCase();
  const mod = e.metaKey || e.ctrlKey;
  if (c.modal) return null;
  if (mod && !e.altKey) {
    if (k === 'k') return 'quick';
    if (k === 'z' && !c.editable) return 'undo';
    return null;
  }
  if (mod || e.altKey) return null;
  if (k === 'escape') return c.editable || !c.row ? null : 'blur';
  if (c.editable) return null;
  if (c.chord) return GO[k] ?? null;
  const nav = NAV[k];
  // arrows only steal scrolling once a row has focus; J/K always start row navigation
  if (nav) return c.row || k.length === 1 ? nav : null;
  const row = ROW[k];
  if (row) return c.row && !(row === 'delete' && e.repeat) ? row : null;
  return PLAIN[k] ?? null;
}

/** Help sheet rows: [keys, description]. */
export const HELP: [string, string][] = [
  ['N  ·  ⌘K', 'New task'],
  ['/', 'Search'],
  ['G then T · U · L · B · S', 'Today · Upcoming · Lists · Logbook · Stats'],
  ['J / K  ·  ↓ / ↑', 'Next / previous task'],
  ['X', 'Complete or reopen'],
  ['E  ·  Enter', 'Open task'],
  ['⌫', 'Delete task'],
  ['U  ·  ⌘Z', 'Undo'],
  ['Esc', 'Close or leave the list'],
  ['?', 'This sheet'],
];
