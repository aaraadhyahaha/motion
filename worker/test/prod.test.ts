// #deploy prod hardening: https-only security headers, login rate-limit ceiling, fail-closed client IP.
import { env, exports } from 'cloudflare:workers';
import { describe, expect, it } from 'vitest';
import { login, req } from './oauth';

const HTTPS = 'https://motion.test';
const post = (pw: string, ip?: string) =>
  exports.default.fetch(`${HTTPS}/oauth/login`, {
    method: 'POST',
    redirect: 'manual',
    headers: {
      'content-type': 'application/x-www-form-urlencoded',
      'sec-fetch-site': 'same-origin',
      ...(ip ? { 'cf-connecting-ip': ip } : {}),
    },
    body: new URLSearchParams({ password: pw, next: '/' }).toString(),
  });

describe('security headers', () => {
  it('https: HSTS + nosniff on every worker response; HTML adds DENY; route values win', async () => {
    for (const path of ['/oauth/login', '/.well-known/oauth-authorization-server', '/mcp', '/api/lists']) {
      const r = await exports.default.fetch(`${HTTPS}${path}`, { method: path === '/mcp' ? 'POST' : 'GET' });
      expect(r.headers.get('strict-transport-security'), path).toBe('max-age=31536000');
      expect(r.headers.get('x-content-type-options'), path).toBe('nosniff');
    }
    const page = await exports.default.fetch(`${HTTPS}/oauth/login`);
    expect(page.headers.get('x-frame-options')).toBe('DENY');
    expect(page.headers.get('referrer-policy')).toBe('no-referrer'); // SSR page's own policy kept
    expect((await exports.default.fetch(`${HTTPS}/api/lists`)).headers.get('referrer-policy')).toBe(
      'strict-origin-when-cross-origin',
    );
  });

  it('http (dev/tests): no HSTS', async () => {
    expect((await req('/oauth/login')).headers.get('strict-transport-security')).toBeNull();
  });
});

describe('login rate limit', () => {
  it('https without cf-connecting-ip fails closed', async () => {
    expect((await post('bad')).status).toBe(400);
  });

  it('global ceiling: 30 fails across IPs blocks everyone (incl. right password)', async () => {
    for (let i = 0; i < 30; i++) expect((await post('bad', `10.0.${i >> 2}.${i}`)).status).toBe(403);
    expect((await post('bad', '10.9.9.9')).status).toBe(429);
    expect((await login()).status).toBe(429);
    await env.OAUTH_KV.delete('rl:*');
    expect((await login()).status).toBe(303);
  });
});
