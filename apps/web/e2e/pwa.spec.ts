// #pwa e2e: service worker on the built app — offline shell reload, and worker-owned paths never get the shell.
import { expect, test } from '@playwright/test';

test('offline shell + navigation denylist', async ({ page, context }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Today', level: 1 })).toBeVisible();
  // clientsClaim controls the first visit; the reload proves the precached shell serves it
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload();
  await page.waitForFunction(() => !!navigator.serviceWorker.controller);

  // a SPA route is answered by the SW (proves the check below can tell the difference)
  const spa = await page.goto('/upcoming');
  expect(spa?.fromServiceWorker()).toBe(true);

  await context.setOffline(true);
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Today', level: 1 })).toBeVisible();
  await context.setOffline(false);

  for (const path of [
    '/oauth/login',
    '/authorize',
    '/token',
    '/.well-known/oauth-authorization-server',
    '/mcp',
  ]) {
    const r = await page.goto(path);
    expect(r?.fromServiceWorker(), path).toBe(false);
    expect(await page.locator('#root').count(), `${path} got the SPA shell`).toBe(0);
  }
});
