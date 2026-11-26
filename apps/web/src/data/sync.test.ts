import type { Changes } from '@motion/core/schemas';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createPoller, MAX_MS, MIN_MS } from './sync';

const empty = (next: number): Changes => ({
  next,
  tasks: [],
  lists: [],
  tags: [],
  deleted: { tasks: [], lists: [], tags: [] },
});

function setup(applyResult = () => false) {
  const listeners: Record<string, () => void> = {};
  const target = {
    addEventListener: (ev: string, f: () => void) => void (listeners[ev] = f),
    removeEventListener: (ev: string) => void delete listeners[ev],
  };
  const doc = { ...target, visibilityState: 'visible' as DocumentVisibilityState };
  let n = 100;
  const fetch = vi.fn(async (_since: number) => empty(n++));
  const apply = vi.fn(applyResult);
  const p = createPoller({ fetch, apply, doc: doc as never, win: target as never });
  const fire = (ev: string) => listeners[ev]?.();
  return { p, doc, fetch, apply, fire, listeners };
}

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe('createPoller', () => {
  it('bootstraps from the server clock, then polls with `next`', async () => {
    const { p, fetch, apply } = setup();
    p.start();
    await vi.advanceTimersByTimeAsync(0);
    expect(fetch).toHaveBeenLastCalledWith(Number.MAX_SAFE_INTEGER);
    expect(apply).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(MIN_MS);
    expect(fetch).toHaveBeenLastCalledWith(100);
    expect(apply).toHaveBeenCalledOnce();
  });

  it('backs off ×2 per empty poll up to the cap', async () => {
    const { p, fetch } = setup();
    p.start();
    await vi.advanceTimersByTimeAsync(0); // bootstrap → MIN
    const seen: number[] = [];
    for (let i = 0; i < 7; i++) {
      await vi.advanceTimersByTimeAsync(p.delay);
      seen.push(p.delay);
    }
    expect(seen).toEqual([30_000, 60_000, 120_000, 240_000, MAX_MS, MAX_MS, MAX_MS]);
    expect(fetch).toHaveBeenCalledTimes(8);
  });

  it('resets to 15 s on real changes and on poke()', async () => {
    let changed = false;
    const { p } = setup(() => changed);
    p.start();
    await vi.advanceTimersByTimeAsync(0);
    await vi.advanceTimersByTimeAsync(MIN_MS);
    await vi.advanceTimersByTimeAsync(30_000);
    expect(p.delay).toBe(60_000);
    p.poke();
    expect(p.delay).toBe(MIN_MS);
    await vi.advanceTimersByTimeAsync(MIN_MS);
    expect(p.delay).toBe(30_000);
    changed = true;
    await vi.advanceTimersByTimeAsync(30_000);
    expect(p.delay).toBe(MIN_MS);
  });

  it('does nothing while hidden and polls immediately when visible again', async () => {
    const { p, doc, fetch, fire } = setup();
    p.start();
    await vi.advanceTimersByTimeAsync(0);
    doc.visibilityState = 'hidden';
    fire('visibilitychange');
    await vi.advanceTimersByTimeAsync(60 * 60_000);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
    doc.visibilityState = 'visible';
    fire('visibilitychange');
    await vi.advanceTimersByTimeAsync(0);
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('polls on focus/online without double-fetching while one is in flight', async () => {
    const { p, fetch, fire } = setup();
    p.start();
    fire('focus');
    fire('online');
    await vi.advanceTimersByTimeAsync(0);
    expect(fetch).toHaveBeenCalledTimes(1);
    fire('online');
    await vi.advanceTimersByTimeAsync(0);
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('backs off on errors and stops cleanly', async () => {
    const { p, fetch, listeners } = setup();
    fetch.mockRejectedValue(new Error('offline'));
    const stop = p.start();
    await vi.advanceTimersByTimeAsync(0);
    expect(p.delay).toBe(30_000);
    stop();
    expect(vi.getTimerCount()).toBe(0);
    expect(Object.keys(listeners)).toEqual([]);
  });
});
