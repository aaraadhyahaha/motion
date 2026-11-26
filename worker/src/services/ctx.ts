import { eq } from 'drizzle-orm';
import { type Db, makeDb } from '../db/client';
import { settings } from '../db/schema';
import type { Env } from '../env';

/** Everything a service needs. Tests build one directly with a fixed `now`. */
export interface Ctx {
  db: Db;
  now: () => number;
  tz: string;
}

let cachedTz: string | undefined; // per isolate; settings.setSettings refreshes it

export const setCachedTz = (tz: string) => {
  cachedTz = tz;
};

export async function makeCtx(env: Env, now: () => number = Date.now): Promise<Ctx> {
  const db = makeDb(env.DB);
  if (!cachedTz) {
    const row = await db.select({ value: settings.value }).from(settings).where(eq(settings.key, 'tz')).get();
    cachedTz = row?.value ?? env.DEFAULT_TZ;
  }
  return { db, now, tz: cachedTz };
}
