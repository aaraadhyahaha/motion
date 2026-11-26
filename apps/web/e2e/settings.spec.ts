// #auth #ui e2e: Settings → Log out ends the session (own login, so the shared storageState survives).
import { expect, test } from '@playwright/test';
import { E2E_PW } from './auth';

test.use({ storageState: { cookies: [], origins: [] } });

test('log out from Settings', async ({ page }) => {
  await page.goto('/settings');
  await expect(page).toHaveURL(/\/oauth\/login/);
  await page.getByLabel('Password').fill(E2E_PW);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible();
  // dev: the Vite proxy rewrites Host, so the Referer-based `next` falls back to `/` (prod is same-origin)
  await page.goto('/settings');
  await expect(page.getByRole('heading', { name: 'Settings', level: 1 })).toBeVisible();
  await page.getByRole('button', { name: 'Log out' }).click();
  await expect(page).toHaveURL(/\/oauth\/login/);
  expect((await page.request.get('/api/lists')).status()).toBe(401);
});
