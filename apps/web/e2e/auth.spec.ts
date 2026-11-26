// #auth e2e: no session → API 401 → worker login page → back into the app.
import { expect, test } from '@playwright/test';
import { E2E_PW } from './auth';

test.use({ storageState: { cookies: [], origins: [] } });

test('signed-out user is sent to login and back', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveURL(/\/oauth\/login/);
  await page.getByLabel('Password').fill(E2E_PW);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).toHaveURL('http://localhost:5173/');
  await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible();
});
