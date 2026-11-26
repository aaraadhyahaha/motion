// #deploy #pwa on the real origin, logged out: SW controls the first visit (clientsClaim), SPA routes come
// from the SW (also offline), worker-owned paths never do, security headers + CSP are on the shell.
import { expect, test } from '@playwright/test';

const WORKER_PATHS = [
  '/oauth/login',
  '/authorize',
  '/token',
  '/.well-known/oauth-authorization-server',
  '/mcp',
  '/api/lists',
];

test('first visit is SW-controlled; headers on the shell', async ({ page }) => {
  const r = await page.goto('/', { waitUntil: 'commit' });
  const h = r?.headers() ?? {};
  expect(h['strict-transport-security']).toBe('max-age=31536000');
  expect(h['content-security-policy']).toMatch(/script-src 'self' 'sha256-/);
  expect(h['referrer-policy']).toBe('strict-origin-when-cross-origin');
  await page.waitForFunction(() => !!navigator.serviceWorker.controller, null, { timeout: 15_000 });
  // logged out → the 401 hook bounces to the SSR login page
  await page.waitForURL(/\/oauth\/login/);
});

test('SPA routes from the SW (online + offline); denylist holds', async ({ page, context }) => {
  await page.goto('/', { waitUntil: 'commit' });
  await page.waitForFunction(() => !!navigator.serviceWorker.controller, null, { timeout: 15_000 });
  const spa = await page.goto('/upcoming', { waitUntil: 'commit' });
  expect(spa?.fromServiceWorker()).toBe(true);

  await context.setOffline(true);
  const off = await page.goto('/list/x', { waitUntil: 'commit' });
  expect(off?.fromServiceWorker()).toBe(true);
  expect(off?.status()).toBe(200);
  await context.setOffline(false);

  for (const path of WORKER_PATHS) {
    const w = await page.goto(path);
    expect(w?.fromServiceWorker(), path).toBe(false);
    expect(await page.locator('#root').count(), `${path} got the SPA shell`).toBe(0);
  }
});
