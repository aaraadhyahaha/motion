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
    // fresh page: the logged-out SPA's own /oauth/login redirect can't race this goto. Empty-body 4xx
    // (/mcp 401) makes goto throw ERR_HTTP_RESPONSE_CODE_FAILURE → read the navigation response event.
    const p = await context.newPage();
    const res = p.waitForResponse(
      (r) => new URL(r.url()).pathname === path && r.request().isNavigationRequest(),
    );
    await p.goto(path).catch((e: Error) => {
      if (!e.message.includes('ERR_HTTP_RESPONSE_CODE_FAILURE')) throw e;
    });
    const w = await res;
    // /api GETs pass through the SW's NetworkFirst route by design; the invariant is "never the shell"
    if (!path.startsWith('/api/')) expect(w.fromServiceWorker(), path).toBe(false);
    expect(await p.locator('#root').count(), `${path} got the SPA shell`).toBe(0);
    await p.close();
  }
});
