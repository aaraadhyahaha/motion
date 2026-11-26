// #anim e2e: burst canvas, "Today's done" card, rAF stops after particles die, reduced motion, sound setting,
// and zero idle CPU (no rAF / intervals while nothing happens).
import { expect, type Page, test } from '@playwright/test';
import { clearToday, create, today } from './seed';

// count rAF / setInterval calls from page start (app code only)
const probe = () => {
  const w = window as unknown as { __raf: number; __int: number };
  w.__raf = 0;
  w.__int = 0;
  const raf = window.requestAnimationFrame.bind(window);
  window.requestAnimationFrame = (f) => (w.__raf++, raf(f));
  const si = window.setInterval.bind(window);
  window.setInterval = ((...a: Parameters<typeof setInterval>) =>
    (
      // Vite's dev client pings its HMR socket every 30 s; that's dev-only, not app code
      /@vite\/client/.test(new Error().stack ?? '') || w.__int++, si(...a)
    )) as typeof setInterval;
};
const counts = (page: Page) =>
  page.evaluate(() => {
    const w = window as unknown as { __raf: number; __int: number };
    return { raf: w.__raf, int: w.__int };
  });

test.beforeEach(async ({ page, request }) => {
  await clearToday(request);
  const d = await today(request);
  await create(request, { title: 'Party one', dueDate: d });
  await create(request, { title: 'Party two', dueDate: d });
  await page.addInitScript(probe);
  page.on('console', (m) => m.text().startsWith('INTERVAL') && console.log(m.text()));
});

test('burst, then Today’s done card; loop stops; idle is idle', async ({ page }) => {
  await page.goto('/');
  const main = page.getByRole('main');
  await main.getByRole('checkbox', { name: 'Party one' }).click();
  const canvas = page.locator('.celebrate-canvas');
  await expect(canvas).toBeVisible();
  await expect(canvas).toBeHidden({ timeout: 4000 }); // all particles dead → canvas hidden
  const settled = await counts(page);
  await page.waitForTimeout(1500);
  expect((await counts(page)).raf).toBe(settled.raf); // no rAF loop left running

  await main.getByRole('checkbox', { name: 'Party two' }).click();
  const card = page.getByRole('status').filter({ hasText: 'Today’s done.' });
  await expect(card).toBeVisible();
  await expect(card).toBeHidden({ timeout: 5000 }); // CSS hold → fade → removed

  await expect(canvas).toBeHidden({ timeout: 4000 });
  const idle = await counts(page);
  await page.waitForTimeout(2000);
  const after = await counts(page);
  expect(after.raf - idle.raf).toBe(0);
  expect(after.int).toBe(0); // the app never uses setInterval
});

test('reduced motion: no canvas, card still fades in', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  const main = page.getByRole('main');
  await main.getByRole('checkbox', { name: 'Party one' }).click();
  await main.getByRole('checkbox', { name: 'Party two' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Today’s done.' })).toBeVisible();
  await expect(page.locator('.celebrate-canvas')).toHaveCount(0);
});

test('sound is off by default and the setting persists', async ({ page }) => {
  await page.goto('/settings');
  const sw = page.getByRole('switch', { name: 'Completion sound' });
  await expect(sw).not.toBeChecked();
  await sw.click();
  await page.reload();
  await expect(sw).toBeChecked();
  expect(await page.evaluate(() => localStorage.getItem('motion.sound'))).toBe('1');
  await sw.click();
  await expect(sw).not.toBeChecked();
});
