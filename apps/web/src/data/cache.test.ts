import type { Agenda, Page, Task } from '@motion/core/schemas';
import { describe, expect, it } from 'vitest';
import { patchTask, removeTask } from './cache';

const t = (id: string, extra: Partial<Task> = {}): Task => ({
  id,
  listId: 'inbox',
  title: id,
  done: false,
  tags: [],
  position: 0,
  createdAt: 1,
  updatedAt: 1,
  ...extra,
});
const agenda = (): Agenda => ({
  today: '2026-11-26',
  overdue: [t('a')],
  days: { '2026-11-26': [t('b'), t('c')], '2026-11-27': [t('d')] },
});
const pages = () => ({
  pages: [{ items: [t('a'), t('x')], next: 'c1' }, { items: [t('y')] }] as Page<Task>[],
  pageParams: [undefined, 'c1'],
});

describe('patchTask', () => {
  it('patches a task in agenda overdue and days, leaving untouched days by reference', () => {
    const a = agenda();
    const out = patchTask(a, 'b', { done: true });
    expect(out.days['2026-11-26']?.[0]?.done).toBe(true);
    expect(out.days['2026-11-27']).toBe(a.days['2026-11-27']);
    expect(out.overdue).toBe(a.overdue);
    expect(a.days['2026-11-26']?.[0]?.done).toBe(false); // immutable
    expect(patchTask(a, 'a', { title: 'A' }).overdue[0]?.title).toBe('A');
  });

  it('patches inside infinite pages; untouched pages keep identity', () => {
    const p = pages();
    const out = patchTask(p, 'y', { title: 'Y' });
    expect(out.pages[1]?.items[0]?.title).toBe('Y');
    expect(out.pages[0]).toBe(p.pages[0]);
    expect(out.pageParams).toBe(p.pageParams);
  });

  it('patches a single-task cache and ignores other ids', () => {
    const one = t('a');
    expect(patchTask(one, 'a', { done: true }).done).toBe(true);
    expect(patchTask(one, 'z', { done: true })).toBe(one);
  });

  it('returns the same reference when the task is absent from any shape', () => {
    const a = agenda();
    const p = pages();
    expect(patchTask(a, 'zz', { done: true })).toBe(a);
    expect(patchTask(p, 'zz', { done: true })).toBe(p);
    expect(patchTask(undefined, 'a', { done: true })).toBeUndefined();
  });
});

describe('removeTask', () => {
  it('removes across agenda days and pages', () => {
    const out = removeTask(agenda(), 'c');
    expect(out.days['2026-11-26']?.map((x) => x.id)).toEqual(['b']);
    expect(removeTask(pages(), 'a').pages[0]?.items.map((x) => x.id)).toEqual(['x']);
  });

  it('clears a matching single-task cache', () => {
    expect(removeTask(t('a'), 'a')).toBeUndefined();
  });
});
