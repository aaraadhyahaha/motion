// pool cap + rAF lifecycle with a stubbed DOM (node env)
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

const frames: FrameRequestCallback[] = [];
beforeAll(() => {
  const ctx = new Proxy({}, { get: () => () => {} });
  const canvas = { style: {}, setAttribute() {}, getContext: () => ctx, hidden: true, width: 0, height: 0 };
  vi.stubGlobal('document', { createElement: () => canvas, body: { append() {} } });
  vi.stubGlobal('getComputedStyle', () => ({ color: 'rgb(1 2 3)' }));
  vi.stubGlobal('innerWidth', 400);
  vi.stubGlobal('innerHeight', 800);
  vi.stubGlobal('devicePixelRatio', 3);
  vi.stubGlobal('requestAnimationFrame', (f: FrameRequestCallback) => frames.push(f));
});
afterAll(() => vi.unstubAllGlobals());

describe('celebrate/particles', () => {
  it('caps at MAX, DPR ≤ 2, and stops the loop when every particle is dead', async () => {
    const p = await import('./particles');
    expect(p.burst(10, 10, 500)).toBe(p.MAX);
    expect(p.burst(10, 10, 5)).toBe(0); // pool full → dropped, no second loop
    expect(frames).toHaveLength(1);
    expect((document.createElement('canvas') as HTMLCanvasElement).width).toBe(800); // 400 × min(3, 2)
    let t = performance.now();
    while (frames.length) {
      t += 50;
      frames.shift()?.(t);
    }
    expect(p.aliveCount()).toBe(0);
    expect(p.running()).toBe(false);
    expect((document.createElement('canvas') as HTMLCanvasElement).hidden).toBe(true);
  });
});
