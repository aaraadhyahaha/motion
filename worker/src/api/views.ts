// Read-only views + settings: agenda, stats, changes (polling), settings.
import { AgendaQuery, ChangesQuery, SettingsUpdate, StatsQuery } from '@motion/core';
import { Hono } from 'hono';
import { body, parse } from '../lib/validate';
import { getAgenda } from '../services/agenda';
import { getChanges } from '../services/changes';
import { getSettings, setSettings } from '../services/settings';
import { getStats } from '../services/stats';
import type { AppEnv } from './types';

export const viewsApi = new Hono<AppEnv>()
  .get('/agenda', async (c) => c.json(await getAgenda(c.var.ctx, parse(AgendaQuery, c.req.query()).days)))
  .get('/stats', async (c) => c.json(await getStats(c.var.ctx, parse(StatsQuery, c.req.query()).days)))
  .get('/changes', async (c) => c.json(await getChanges(c.var.ctx, parse(ChangesQuery, c.req.query()).since)))
  .get('/settings', (c) => c.json(getSettings(c.var.ctx)))
  .patch('/settings', async (c) =>
    c.json(await setSettings(c.var.ctx, parse(SettingsUpdate, await body(c.req)))),
  );
