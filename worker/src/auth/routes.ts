// #auth Owner login/logout + OAuth authorize/consent. Token, register, metadata endpoints belong to OAuthProvider.
import type { AuthRequest } from '@cloudflare/workers-oauth-provider';
import { type Context, Hono } from 'hono';
import type { Env } from '../env';
import { consentPage, errorPage, loginPage } from './pages';
import { verifyPassword } from './password';
import { csrfToken, endSession, getSession, sameOrigin, startSession } from './session';

type C = Context<{ Bindings: Env }>;
const MAX_FAILS = 5;
const WINDOW_S = 900;

const html = (c: C, body: string, status: 200 | 400 | 403 | 429 = 200, formTo = '') =>
  c.html(body, status, {
    'content-security-policy': `default-src 'none'; style-src 'unsafe-inline'; form-action 'self'${formTo}; frame-ancestors 'none'; base-uri 'none'`,
    'cache-control': 'no-store',
    'referrer-policy': 'no-referrer',
  });

/** Only same-site relative paths (no `//host`, no `/\host`). */
const safeNext = (n: unknown) => (typeof n === 'string' && /^\/(?![/\\])/.test(n) ? n : '/');

/** The PWA sends users here with no `next` on a 401; return them to the same-origin page they were on. */
const refererPath = (c: C) => {
  try {
    const r = new URL(c.req.header('referer') ?? '');
    return r.host === c.req.header('host') && !r.pathname.startsWith('/oauth/')
      ? r.pathname + r.search
      : undefined;
  } catch {
    return undefined;
  }
};

const allowed = (env: Env, uri: string) => {
  try {
    const origin = new URL(uri).origin;
    return env.OAUTH_REDIRECT_ALLOW.split(',').some((o) => o.trim() === origin);
  } catch {
    return false;
  }
};

/** Parsed + policy-checked auth request (PKCE S256 required, redirect origin allow-listed). */
async function authRequest(c: C, url: string): Promise<{ req: AuthRequest; client: string } | string> {
  let req: AuthRequest;
  try {
    req = await c.env.OAUTH_PROVIDER.parseAuthRequest(new Request(url));
  } catch (e) {
    return e instanceof Error ? e.message : 'invalid request';
  }
  if (req.responseType !== 'code') return 'unsupported response type';
  if (!req.codeChallenge || req.codeChallengeMethod !== 'S256') return 'PKCE (S256) required';
  if (!allowed(c.env, req.redirectUri)) return 'redirect URI not allowed';
  const info = await c.env.OAUTH_PROVIDER.lookupClient(req.clientId);
  if (!info) return 'unknown client';
  return { req, client: info.clientName || req.clientId };
}

export const auth = new Hono<{ Bindings: Env }>()
  .get('/oauth/login', (c) => html(c, loginPage(safeNext(c.req.query('next') ?? refererPath(c)))))
  .post('/oauth/login', async (c) => {
    if (!sameOrigin(c)) return html(c, errorPage('Cross-origin sign-in blocked.'), 403);
    const form = await c.req.parseBody();
    const next = safeNext(form.next);
    const rl = `rl:${c.req.header('cf-connecting-ip') ?? 'local'}`;
    const fails = Number((await c.env.OAUTH_KV.get(rl)) ?? 0);
    if (fails >= MAX_FAILS)
      return html(c, loginPage(next, 'Too many attempts. Try again in 15 minutes.'), 429);
    if (!(await verifyPassword(String(form.password ?? ''), c.env.OWNER_PW_HASH))) {
      await c.env.OAUTH_KV.put(rl, String(fails + 1), { expirationTtl: WINDOW_S });
      return html(c, loginPage(next, 'Wrong password.'), 403);
    }
    await c.env.OAUTH_KV.delete(rl);
    await startSession(c);
    return c.redirect(next, 303);
  })
  .post('/oauth/logout', async (c) => {
    if (!sameOrigin(c)) return c.body(null, 403);
    await endSession(c);
    return c.redirect('/oauth/login', 303);
  })
  .get('/authorize', async (c) => {
    const r = await authRequest(c, c.req.url);
    if (typeof r === 'string') return html(c, errorPage(r), 400);
    const sid = await getSession(c);
    const url = new URL(c.req.url);
    if (!sid) return c.redirect(`/oauth/login?next=${encodeURIComponent(url.pathname + url.search)}`, 303);
    const host = new URL(r.req.redirectUri).host;
    const page = consentPage({
      client: r.client,
      host,
      query: url.search.slice(1),
      csrf: await csrfToken(sid),
    });
    return html(c, page, 200, ` ${new URL(r.req.redirectUri).origin}`);
  })
  .post('/authorize', async (c) => {
    const sid = await getSession(c);
    const form = await c.req.parseBody();
    if (!sid || !sameOrigin(c) || form.csrf !== (await csrfToken(sid)))
      return html(c, errorPage('Session expired — start again from the app.'), 403);
    const r = await authRequest(c, `${new URL(c.req.url).origin}/authorize?${String(form.q ?? '')}`);
    if (typeof r === 'string') return html(c, errorPage(r), 400);
    if (form.action !== 'allow') {
      const to = new URL(r.req.redirectUri);
      to.searchParams.set('error', 'access_denied');
      if (r.req.state) to.searchParams.set('state', r.req.state);
      return c.redirect(to.toString(), 302);
    }
    const { redirectTo } = await c.env.OAUTH_PROVIDER.completeAuthorization({
      request: r.req,
      userId: 'owner',
      metadata: { client: r.client },
      scope: r.req.scope,
      props: { owner: true },
    });
    return c.redirect(redirectTo, 302);
  });
