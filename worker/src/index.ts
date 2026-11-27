import { OAuthProvider } from '@cloudflare/workers-oauth-provider';
import { Hono } from 'hono';
import { api } from './api';
import { auth } from './auth/routes';
import type { Env } from './env';
import { AppError } from './lib/errors';
import { secure } from './lib/headers';
import { mcpHandler } from './mcp/server';

const app = new Hono<{ Bindings: Env }>();

app.route('/', auth);
app.route('/api', api);

app.onError((err, c) => {
  if (err instanceof AppError)
    return c.json({ error: { code: err.code, msg: err.message, issues: err.issues } }, err.status);
  console.error(err);
  return c.json({ error: { code: 'internal', msg: 'internal error' } }, 500);
});

app.notFound((c) => c.json({ error: { code: 'not_found', msg: 'route not found' } }, 404));

/** OAuth 2.1 (PKCE, DCR, metadata, /token) wraps everything; `/mcp` needs a Bearer token, the rest goes to Hono.
 * RFC 9728 `resource` must be the absolute /mcp URL, so one provider per origin (prod: one; dev: :8787 + proxy). */
const make = (origin: string) =>
  new OAuthProvider<Env>({
    apiRoute: '/mcp',
    apiHandler: mcpHandler,
    defaultHandler: app,
    authorizeEndpoint: '/authorize',
    tokenEndpoint: '/token',
    clientRegistrationEndpoint: '/oauth/register',
    scopesSupported: ['tasks'],
    resourceMetadata: { resource: `${origin}/mcp`, resource_name: 'Motion' },
    accessTokenTTL: 3600,
    refreshTokenTTL: 30 * 86_400,
  });
const providers = new Map<string, OAuthProvider<Env>>();

export default {
  fetch(req: Request, env: Env, ctx: ExecutionContext) {
    const origin = new URL(req.url).origin;
    let p = providers.get(origin);
    if (!p) {
      if (providers.size > 8) providers.clear(); // hosts are bounded by routes; belt and braces
      providers.set(origin, (p = make(origin)));
    }
    return p.fetch(req, env, ctx).then((res) => secure(req, res));
  },
} satisfies ExportedHandler<Env>;
