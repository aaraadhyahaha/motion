import type { Settings, SettingsUpdate } from '@motion/core';
import { settings } from '../db/schema';
import { type Ctx, setCachedTz } from './ctx';

export const getSettings = (ctx: Ctx): Settings => ({ tz: ctx.tz });

export async function setSettings(ctx: Ctx, input: SettingsUpdate): Promise<Settings> {
  await ctx.db
    .insert(settings)
    .values({ key: 'tz', value: input.tz })
    .onConflictDoUpdate({ target: settings.key, set: { value: input.tz } });
  setCachedTz(input.tz);
  ctx.tz = input.tz;
  return { tz: input.tz };
}
