// #wf #task smoke: quick-add → complete → undo → complete; editor date → Tomorrow moves Today → Upcoming.
import { expect, test } from '@playwright/test';
import { purge } from './seed';

test.beforeEach(async ({ request }) => {
  for (const q of ['Buy milk', 'Call dentist']) await purge(request, q);
});

test('quick add, complete, undo, reschedule', async ({ page }) => {
  await page.goto('/');
  const main = page.getByRole('main');
  await expect(main.getByRole('heading', { name: 'Today', level: 1 })).toBeVisible();

  const input = page.getByRole('textbox', { name: 'New task' });
  await input.fill('Buy milk today @errands');
  await input.press('Enter');

  const milk = main.getByRole('checkbox', { name: 'Buy milk' });
  await expect(milk).toBeVisible();
  await expect(main.getByRole('button', { name: /^Buy milk.*@errands/ })).toBeVisible();

  await milk.click();
  await expect(milk).toBeHidden();
  await page.getByRole('button', { name: 'Undo' }).click();
  await expect(milk).toBeVisible();
  await expect(milk).toHaveAttribute('aria-checked', 'false');
  await milk.click();
  await expect(milk).toBeHidden();

  await input.fill('Call dentist');
  await input.press('Enter');
  await expect(main.getByRole('checkbox', { name: 'Call dentist' })).toBeVisible();
  await main.getByRole('button', { name: /^Call dentist/ }).click();

  const sheet = page.getByRole('dialog', { name: 'Edit task' });
  await expect(sheet.getByRole('textbox', { name: 'Title' })).toHaveValue('Call dentist');
  await sheet.getByRole('button', { name: 'Tomorrow' }).click();
  await expect(sheet.getByRole('button', { name: 'Tomorrow' })).toHaveAttribute('aria-pressed', 'true');
  await sheet.getByRole('button', { name: 'Done' }).click();
  await expect(sheet).toBeHidden();
  await expect(main.getByRole('checkbox', { name: 'Call dentist' })).toBeHidden();

  await page.getByRole('link', { name: 'Upcoming' }).click();
  await expect(main.getByRole('heading', { name: 'Upcoming', level: 1 })).toBeVisible();
  await expect(main.getByRole('checkbox', { name: 'Call dentist' })).toBeVisible();
});
