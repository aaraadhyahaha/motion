import { describe, expect, it } from 'vitest';
import { GO, HELP, type KeyCtx, resolve } from './map';

const C: KeyCtx = { editable: false, modal: false, chord: false, row: false };
const r = (key: string, ctx: Partial<KeyCtx> = {}, mods: Record<string, unknown> = {}) =>
  resolve({ key, ...mods }, { ...C, ...ctx });

describe('keys/map', () => {
  it('plain keys', () => {
    expect(r('n')).toBe('quick');
    expect(r('N')).toBe('quick');
    expect(r('/')).toBe('search');
    expect(r('?')).toBe('help');
    expect(r('g')).toBe('chord');
    expect(r('u')).toBe('undo');
    expect(r('q')).toBeNull();
  });

  it('⌘K / Ctrl+K anywhere but a modal, ⌘Z outside inputs', () => {
    expect(r('k', {}, { metaKey: true })).toBe('quick');
    expect(r('K', { editable: true }, { ctrlKey: true })).toBe('quick');
    expect(r('k', { modal: true }, { metaKey: true })).toBeNull();
    expect(r('z', {}, { metaKey: true })).toBe('undo');
    expect(r('z', { editable: true }, { metaKey: true })).toBeNull();
    expect(r('n', {}, { metaKey: true })).toBeNull(); // ⌘N stays the browser's
    expect(r('n', {}, { altKey: true })).toBeNull();
  });

  it('G chords navigate; a chord swallows the next key', () => {
    for (const [k, a] of Object.entries(GO)) expect(r(k, { chord: true })).toBe(a);
    expect(r('n', { chord: true })).toBeNull();
  });

  it('rows: J/K always, arrows only with a focused row, row actions need a row', () => {
    expect(r('j')).toBe('next');
    expect(r('k')).toBe('prev');
    expect(r('ArrowDown')).toBeNull(); // page scroll untouched
    expect(r('ArrowDown', { row: true })).toBe('next');
    expect(r('ArrowUp', { row: true })).toBe('prev');
    expect(r('x')).toBeNull();
    expect(r('x', { row: true })).toBe('complete');
    expect(r('e', { row: true })).toBe('edit');
    expect(r('Backspace', { row: true })).toBe('delete');
    expect(r('Delete', { row: true })).toBe('delete');
    expect(r('Backspace', { row: true }, { repeat: true })).toBeNull(); // held key ≠ mass delete
    expect(r('Escape', { row: true })).toBe('blur');
    expect(r('Escape')).toBeNull();
  });

  it('inputs, modals and IME composition are left alone', () => {
    for (const k of ['n', 'x', '/', '?', 'g', 'j', 'Backspace', 'Escape'])
      expect(r(k, { editable: true, row: true })).toBeNull();
    for (const k of ['n', 'x', 'Escape', '?']) expect(r(k, { modal: true, row: true })).toBeNull();
    expect(r('n', {}, { isComposing: true })).toBeNull();
    expect(r('n', {}, { keyCode: 229 })).toBeNull();
  });

  it('help sheet lists every binding family', () => {
    const text = HELP.map((h) => h.join(' ')).join('\n');
    for (const s of ['⌘K', '/', 'G then', 'J / K', 'X', 'E', '⌫', '⌘Z', 'Esc', '?'])
      expect(text).toContain(s);
  });
});
