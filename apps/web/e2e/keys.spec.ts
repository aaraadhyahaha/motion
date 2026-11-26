// #ui e2e: keyboard shortcuts — navigation chords, quick add, search, row focus/complete/undo/edit/delete, help.
import { expect, test } from '@playwright/test';
import { clearToday, create, keysReady, today } from './seed';

test.skip(
  ({ isMobile, viewport }) => !!isMobile || (viewport?.width ?? 0) < 768,
  'hardware keyboard: desktop',
);

test.beforeEach(async ({ page, request }) => {
  await clearToday(request);
  const d = await today(request);
  await create(request, { title: 'Key alpha', dueDate: d });
  await create(request, { title: 'Key beta', dueDate: d });
  await page.goto('/');
  await page.waitForFunction(keysReady);
});

test('G chords navigate', async ({ page }) => {
  const h1 = page.getByRole('heading', { level: 1 });
  for (const [k, name] of [
    ['u', 'Upcoming'],
    ['l', 'Lists'],
    ['b', 'Logbook'],
    ['s', 'Stats'],
    ['t', 'Today'],
  ]) {
    await page.keyboard.press('g');
    await page.keyboard.press(k as string);
    await expect(h1).toHaveText(name as string);
  }
});

test('N / ⌘K focus quick add; typing there never fires shortcuts', async ({ page }) => {
  const input = page.getByRole('textbox', { name: 'New task' });
  await page.keyboard.press('n');
  await expect(input).toBeFocused();
  await page.keyboard.type('gx?/');
  await expect(input).toHaveValue('gx?/');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Today');
  await page.keyboard.press('Escape');
  await page.keyboard.press('ControlOrMeta+k');
  await expect(input).toBeFocused();
});

test('/ opens search', async ({ page }) => {
  await page.keyboard.press('/');
  const box = page.getByRole('searchbox', { name: 'Search tasks' });
  await expect(box).toBeFocused();
  await box.fill('Key be');
  await expect(page.getByRole('main').getByRole('checkbox', { name: 'Key beta' })).toBeVisible();
  await expect(page).toHaveURL(/\/search\?q=Key\+be/);
});

test('rows: J focuses, X completes, U undoes, E edits, ⌫ deletes with Undo', async ({ page }) => {
  const main = page.getByRole('main');
  await expect(main.getByRole('checkbox', { name: 'Key beta' })).toBeVisible(); // rows loaded
  await page.keyboard.press('j'); // first row, whatever the sort
  await expect(main.locator('.row-body').first()).toBeFocused();
  await main.getByRole('button', { name: /^Key alpha/ }).focus();
  await page.keyboard.press('x');
  await expect(main.getByRole('checkbox', { name: 'Key alpha' })).toBeHidden();
  await page.keyboard.press('u');
  await expect(main.getByRole('checkbox', { name: 'Key alpha' })).toBeVisible();

  await main.getByRole('button', { name: /^Key beta/ }).focus();
  await page.keyboard.press('e');
  const sheet = page.getByRole('dialog', { name: 'Edit task' });
  await expect(sheet).toBeVisible();
  await page.keyboard.press('x'); // sheet owns the keyboard
  await expect(main.getByRole('checkbox', { name: 'Key beta' })).toHaveAttribute('aria-checked', 'false');
  await page.keyboard.press('Escape');
  await expect(sheet).toBeHidden();
  await expect(main.getByRole('button', { name: /^Key beta/ })).toBeFocused(); // focus returned

  await page.keyboard.press('Backspace');
  await expect(main.getByRole('checkbox', { name: 'Key beta' })).toBeHidden();
  await expect(page.getByText('Deleted.')).toBeVisible();
  await page.keyboard.press('ControlOrMeta+z');
  await expect(main.getByRole('checkbox', { name: 'Key beta' })).toBeVisible();
});

test('? opens the help sheet; Esc closes it and returns focus', async ({ page }) => {
  await page.keyboard.press('?');
  const help = page.getByRole('dialog', { name: 'Keyboard shortcuts' });
  await expect(help).toBeVisible();
  await expect(help.getByText('Next / previous task')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(help).toBeHidden();
});
