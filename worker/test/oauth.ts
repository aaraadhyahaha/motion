// Test helper: drive the real OAuth 2.1 flow (DCR → login → consent → code → token) through the worker.
import { exports } from 'cloudflare:workers';

export const BASE = 'http://localhost';
export const PW = 'correct horse battery'; // = TEST_PW in vitest.config.ts
export const REDIRECT = 'http://localhost:6274/oauth/callback';

export const req = (path: string, init: RequestInit = {}) =>
  exports.default.fetch(`${BASE}${path}`, { redirect: 'manual', ...init });
const form = (o: Record<string, string>) => ({
  method: 'POST',
  headers: { 'content-type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams(o).toString(),
});
const b64u = (b: ArrayBuffer | Uint8Array) =>
  btoa(String.fromCharCode(...new Uint8Array(b)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

export async function register(redirect = REDIRECT): Promise<string> {
  const r = await req('/oauth/register', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      redirect_uris: [redirect],
      client_name: 'Test',
      token_endpoint_auth_method: 'none',
    }),
  });
  if (r.status !== 201) throw new Error(`register ${r.status}: ${await r.text()}`);
  return ((await r.json()) as { client_id: string }).client_id;
}

export async function login(pw = PW): Promise<Response> {
  return req('/oauth/login', form({ password: pw, next: '/' }));
}

export async function loginCookie(): Promise<string> {
  const r = await login();
  const sc = r.headers.get('set-cookie') ?? '';
  return sc.split(';')[0] ?? '';
}

export async function pkce() {
  const verifier = b64u(crypto.getRandomValues(new Uint8Array(32)));
  const challenge = b64u(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier)));
  return { verifier, challenge };
}

export const authorizeUrl = (clientId: string, challenge: string, extra: Record<string, string> = {}) =>
  `/authorize?${new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: REDIRECT,
    scope: 'tasks',
    state: 'st8',
    code_challenge: challenge,
    code_challenge_method: 'S256',
    ...extra,
  })}`;

/** Consent page → hidden fields. */
export async function consent(url: string, cookie: string) {
  const r = await req(url, { headers: { cookie } });
  const html = await r.text();
  const q = html.match(/name="q" value="([^"]*)"/)?.[1]?.replace(/&#38;/g, '&') ?? '';
  const csrf = html.match(/name="csrf" value="([^"]*)"/)?.[1] ?? '';
  return { status: r.status, html, q, csrf };
}

export async function approve(cookie: string, q: string, csrf: string, action = 'allow') {
  return req('/authorize', { ...form({ q, csrf, action }), headers: { ...form({}).headers, cookie } });
}

export async function token(params: Record<string, string>) {
  const r = await req('/token', form(params));
  return { status: r.status, body: (await r.json()) as Record<string, any> };
}

/** Full flow → { access_token, refresh_token, clientId }. */
export async function fullFlow() {
  const clientId = await register();
  const cookie = await loginCookie();
  const { verifier, challenge } = await pkce();
  const c = await consent(authorizeUrl(clientId, challenge), cookie);
  const loc = new URL((await approve(cookie, c.q, c.csrf)).headers.get('location') ?? '');
  const code = loc.searchParams.get('code') ?? '';
  const t = await token({
    grant_type: 'authorization_code',
    code,
    redirect_uri: REDIRECT,
    client_id: clientId,
    code_verifier: verifier,
  });
  return { ...t.body, clientId } as { access_token: string; refresh_token: string; clientId: string };
}

let rpcId = 0;
export async function rpc(tokenStr: string | null, method: string, params?: unknown) {
  return req('/mcp', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      accept: 'application/json, text/event-stream',
      ...(tokenStr && { authorization: `Bearer ${tokenStr}` }),
    },
    body: JSON.stringify({ jsonrpc: '2.0', id: ++rpcId, method, ...(params !== undefined && { params }) }),
  });
}
