import { env } from 'cloudflare:workers';
import { makeDb } from '../src/db/client';
import type { Ctx } from '../src/services/ctx';

/** Thursday 2026-11-26 12:00 UTC. Advance with `ctx.tick(ms)`. */
export const T0 = Date.UTC(2026, 10, 26, 12);

export function testCtx(tz = 'UTC', start = T0): Ctx & { tick: (ms?: number) => void } {
  let t = start;
  const tick = (ms = 1) => {
    t += ms;
  };
  return { db: makeDb(env.DB), tz, now: () => t, tick };
}
