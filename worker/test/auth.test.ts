import { env } from 'cloudflare:workers';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  approve,
  authorizeUrl,
  consent,
  fullFlow,
  login,
  loginCookie,
  pkce,
  REDIRECT,
  register,
  req,
  rpc,
  token,
} from './oauth';

afterEach(() => vi.useRealTimers());

describe('owner login + session', () => {
  it('login page is self-contained HTML with a strict CSP', async () => {
    const r = await req('/oauth/login');
    expect(r.status).toBe(200);
    expect(r.headers.get('content-security-policy')).toContain("default-src 'none'");
    expect(await r.text()).not.toMatch(/<script|<link/);
  });

  it('PWA 401 bounce: next comes from same-origin Referer only', async () => {
    const next = async (referer: string) =>
      (await (await req('/oauth/login', { headers: { referer, host: 'localhost' } })).text()).match(
        /name="next" value="([^"]*)"/,
      )?.[1];
    expect(await next('http://localhost/upcoming?t=1')).toBe('/upcoming?t=1');
    expect(await next('https://evil.com/x')).toBe('/');
  });

  it('wrong password → 403, right → httpOnly Lax cookie + redirect to safe next', async () => {
    expect((await login('nope')).status).toBe(403);
    const ok = await req('/oauth/login', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: 'password=correct+horse+battery&next=%2F%2Fevil.com',
    });
    expect(ok.status).toBe(303);
    expect(ok.headers.get('location')).toBe('/');
    expect(ok.headers.get('set-cookie')).toMatch(/^sid=.+HttpOnly.*SameSite=Lax/i);
    await Promise.all(['rl:local', 'rl:*'].map((k) => env.OAUTH_KV.delete(k)));
  });

  it('/api: no cookie → 401, session → 200, cross-origin write → 403, logout → 401', async () => {
    expect((await req('/api/lists')).status).toBe(401);
    const cookie = await loginCookie();
    expect((await req('/api/lists', { headers: { cookie } })).status).toBe(200);
    const cross = await req('/api/lists', {
      method: 'POST',
      headers: { cookie, origin: 'https://evil.com', 'content-type': 'application/json' },
      body: '{"name":"x"}',
    });
    expect(cross.status).toBe(403);
    const fetchMeta = await req('/api/lists', {
      method: 'POST',
      headers: { cookie, 'sec-fetch-site': 'cross-site', 'content-type': 'application/json' },
      body: '{"name":"x"}',
    });
    expect(fetchMeta.status).toBe(403);
    expect((await req('/oauth/logout', { method: 'POST', headers: { cookie } })).status).toBe(303);
    expect((await req('/api/lists', { headers: { cookie } })).status).toBe(401);
  });

  it('rate-limits after 5 failures', async () => {
    for (let i = 0; i < 5; i++) expect((await login('bad')).status).toBe(403);
    expect((await login()).status).toBe(429);
    await Promise.all(['rl:local', 'rl:*'].map((k) => env.OAUTH_KV.delete(k)));
    expect((await login()).status).toBe(303);
  });
});

describe('OAuth 2.1 + PKCE', () => {
  it('publishes authorization-server + protected-resource metadata', async () => {
    const as = (await (await req('/.well-known/oauth-authorization-server')).json()) as Record<
      string,
      unknown
    >;
    expect(as).toMatchObject({
      authorization_endpoint: 'http://localhost/authorize',
      token_endpoint: 'http://localhost/token',
    });
    expect(as.code_challenge_methods_supported).toContain('S256');
    const pr = await req('/.well-known/oauth-protected-resource/mcp');
    expect(pr.status).toBe(200);
    expect(await pr.json()).toMatchObject({ resource: 'http://localhost/mcp' });
  });

  it('full flow → token works on /mcp; refresh rotates', async () => {
    const t = await fullFlow();
    expect(t.access_token).toBeTruthy();
    expect((await rpc(t.access_token, 'ping')).status).toBe(200);
    const r = await token({
      grant_type: 'refresh_token',
      refresh_token: t.refresh_token,
      client_id: t.clientId,
    });
    expect(r.status).toBe(200);
    expect(r.body.refresh_token).not.toBe(t.refresh_token);
    expect((await rpc(r.body.access_token, 'ping')).status).toBe(200);
  });

  it('wrong code_verifier → token rejected', async () => {
    const clientId = await register();
    const cookie = await loginCookie();
    const { challenge } = await pkce();
    const c = await consent(authorizeUrl(clientId, challenge), cookie);
    const code =
      new URL((await approve(cookie, c.q, c.csrf)).headers.get('location') ?? '').searchParams.get('code') ??
      '';
    const t = await token({
      grant_type: 'authorization_code',
      code,
      redirect_uri: REDIRECT,
      client_id: clientId,
      code_verifier: 'x'.repeat(43),
    });
    expect(t.status).toBe(400);
  });

  it('authorize: no PKCE / plain PKCE / foreign redirect → 400; no session → login redirect', async () => {
    const clientId = await register();
    const cookie = await loginCookie();
    const { challenge } = await pkce();
    const noPkce = authorizeUrl(clientId, challenge).replace(/&code_challenge=[^&]*/, '');
    expect((await req(noPkce, { headers: { cookie } })).status).toBe(400);
    expect(
      (
        await req(authorizeUrl(clientId, challenge, { code_challenge_method: 'plain' }), {
          headers: { cookie },
        })
      ).status,
    ).toBe(400);
    const evil = await register('https://evil.com/cb');
    expect(
      (
        await req(authorizeUrl(evil, challenge, { redirect_uri: 'https://evil.com/cb' }), {
          headers: { cookie },
        })
      ).status,
    ).toBe(400);
    const anon = await req(authorizeUrl(clientId, challenge));
    expect(anon.status).toBe(303);
    expect(anon.headers.get('location')).toMatch(/^\/oauth\/login\?next=%2Fauthorize/);
  });

  it('consent: bad csrf → 403; deny → access_denied', async () => {
    const clientId = await register();
    const cookie = await loginCookie();
    const { challenge } = await pkce();
    const c = await consent(authorizeUrl(clientId, challenge), cookie);
    expect(c.html).toContain('Allow access');
    expect((await approve(cookie, c.q, 'forged')).status).toBe(403);
    const deny = new URL((await approve(cookie, c.q, c.csrf, 'deny')).headers.get('location') ?? '');
    expect(deny.searchParams.get('error')).toBe('access_denied');
    expect(deny.searchParams.get('state')).toBe('st8');
  });

  it('/mcp: missing, bad and expired tokens → 401 with WWW-Authenticate', async () => {
    const none = await rpc(null, 'ping');
    expect(none.status).toBe(401);
    expect(none.headers.get('www-authenticate')).toMatch(
      /Bearer.*resource_metadata="http:\/\/localhost\/.well-known\/oauth-protected-resource/,
    );
    expect((await rpc('owner:nope:nope', 'ping')).status).toBe(401);
    const t = await fullFlow();
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(Date.now() + 2 * 3600_000);
    expect((await rpc(t.access_token, 'ping')).status).toBe(401);
  });
});
