// #auth Owner cookie session (PWA + login/consent pages). KV `sess:<id>` → issued-at ms; 30 d sliding.
import type { Context, MiddlewareHandler } from 'hono';
import { deleteCookie, getCookie, setCookie } from 'hono/cookie';
import type { Env } from '../env';
import { b64u } from './password';

type C = Context<{ Bindings: Env }>;
const TTL = 30 * 86_400;
const REFRESH_AFTER = 15 * 86_400_000;
const key = (id: string) => `sess:${id}`;

/** `__Host-` needs Secure, which needs https; plain http (dev/tests) uses `sid`. */
const cookieName = (c: C) => (new URL(c.req.url).protocol === 'https:' ? '__Host-sid' : 'sid');

export async function startSession(c: C): Promise<void> {
  const id = b64u(crypto.getRandomValues(new Uint8Array(16)));
  await c.env.OAUTH_KV.put(key(id), String(Date.now()), { expirationTtl: TTL });
  const secure = cookieName(c) !== 'sid';
  setCookie(c, cookieName(c), id, { httpOnly: true, secure, sameSite: 'Lax', path: '/', maxAge: TTL });
}

/** Session id if the cookie maps to a live session (slides the TTL at most every 15 d). */
export async function getSession(c: C): Promise<string | null> {
  const id = getCookie(c, cookieName(c));
  if (!id || id.length > 64) return null;
  const at = await c.env.OAUTH_KV.get(key(id));
  if (!at) return null;
  if (Date.now() - Number(at) > REFRESH_AFTER) {
    await c.env.OAUTH_KV.put(key(id), String(Date.now()), { expirationTtl: TTL });
    setCookie(c, cookieName(c), id, {
      httpOnly: true,
      secure: cookieName(c) !== 'sid',
      sameSite: 'Lax',
      path: '/',
      maxAge: TTL,
    });
  }
  return id;
}

export async function endSession(c: C): Promise<void> {
  const id = getCookie(c, cookieName(c));
  if (id) await c.env.OAUTH_KV.delete(key(id));
  deleteCookie(c, cookieName(c), { path: '/', secure: cookieName(c) !== 'sid' });
}

/** Consent-form CSRF token bound to the session (attacker can't read the httpOnly cookie). */
export async function csrfToken(sid: string): Promise<string> {
  const h = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`csrf:${sid}`));
  return b64u(new Uint8Array(h)).slice(0, 22);
}

/** Cross-site writes are rejected. `Sec-Fetch-Site` (browser-set, unforgeable by page JS) is authoritative and
 * survives the dev proxy; without it, fall back to Origin vs Host. Neither header = non-browser client (no CSRF risk). */
export const sameOrigin = (c: C): boolean => {
  if (c.req.method === 'GET' || c.req.method === 'HEAD') return true;
  const site = c.req.header('sec-fetch-site');
  if (site) return site === 'same-origin' || site === 'none';
  const o = c.req.header('origin');
  if (!o) return true;
  try {
    return new URL(o).host === (c.req.header('host') ?? new URL(c.req.url).host);
  } catch {
    return false;
  }
};

/** `/api/*` guard: 401 without a session, 403 on cross-origin writes. */
export const requireSession: MiddlewareHandler<{ Bindings: Env }> = async (c, next) => {
  if (!(await getSession(c))) return c.json({ error: { code: 'unauthorized', msg: 'login required' } }, 401);
  if (!sameOrigin(c)) return c.json({ error: { code: 'forbidden', msg: 'cross-origin request' } }, 403);
  await next();
};
