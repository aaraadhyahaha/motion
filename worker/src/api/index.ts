import { Hono } from 'hono';
import { requireSession } from '../auth/session';
import { makeCtx } from '../services/ctx';
import { listsApi } from './lists';
import { tagsApi } from './tags';
import { tasksApi } from './tasks';
import type { AppEnv } from './types';
import { viewsApi } from './views';

export const api = new Hono<AppEnv>();

api.use(requireSession);
api.use(async (c, next) => {
  c.set('ctx', await makeCtx(c.env));
  await next();
});

api.route('/lists', listsApi).route('/tags', tagsApi).route('/tasks', tasksApi).route('/', viewsApi);
