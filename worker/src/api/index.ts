import { Hono } from 'hono';
import { makeCtx } from '../services/ctx';
import { listsApi } from './lists';
import { tagsApi } from './tags';
import { tasksApi } from './tasks';
import type { AppEnv } from './types';
import { viewsApi } from './views';

export const api = new Hono<AppEnv>();

// Phase 3 adds owner auth here. Until then: never deploy.
api.use(async (c, next) => {
  c.set('ctx', await makeCtx(c.env));
  await next();
});

api.route('/lists', listsApi).route('/tags', tagsApi).route('/tasks', tasksApi).route('/', viewsApi);
