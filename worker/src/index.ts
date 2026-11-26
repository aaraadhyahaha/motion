import { Hono } from 'hono';
import { api } from './api';
import type { Env } from './env';
import { AppError } from './lib/errors';

const app = new Hono<{ Bindings: Env }>();

app.route('/api', api);

app.onError((err, c) => {
  if (err instanceof AppError)
    return c.json({ error: { code: err.code, msg: err.message, issues: err.issues } }, err.status);
  console.error(err);
  return c.json({ error: { code: 'internal', msg: 'internal error' } }, 500);
});

app.notFound((c) => c.json({ error: { code: 'not_found', msg: 'route not found' } }, 404));

export default app;
