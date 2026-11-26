// #ui a11y: axe (WCAG 2.2 A/AA) on every view in light + dark, plus 44pt targets. Fails on serious/critical.
import AxeBuilder from '@axe-core/playwright';
import { expect, type Page, test } from '@playwright/test';
import { API, create, purge, today } from './seed';

const VIEWS = [
  '/',
  '/upcoming',
  '/lists',
  '/logbook',
  '/stats',
  '/search',
  '/search?q=A11y',
  '/settings',
  '/tag/a11y',
];

test.beforeAll(async ({ request }) => {
  await purge(request, 'A11y');
  const d = await today(request);
  await create(request, { title: 'A11y row', dueDate: d, dueTime: '09:30', tags: ['a11y'] });
  const done = await create(request, { title: 'A11y done', dueDate: d });
  await request.post(`${API}/tasks/${done.id}/complete`);
});

/** Wait until no animation runs (axe measures contrast through in-flight opacity). */
const settle = (page: Page) =>
  page.waitForFunction(() => document.getAnimations().every((a) => a.playState !== 'running'));

async function axe(page: Page, label: string) {
  const r = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
  const bad = r.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
  const report = bad.map((v) => `${label} ${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`);
  expect.soft(report, report.join('\n')).toEqual([]);
}

/** Every visible control's box is ≥ 44×44 (the hit area, not the glyph). */
async function targets(page: Page) {
  const small = await page.evaluate(() =>
    [...document.querySelectorAll<HTMLElement>('a[href], button, input, [role="checkbox"], [role="switch"]')]
      .filter((el) => el.offsetParent && !el.closest('[aria-hidden="true"]'))
      .map((el) => {
        const r = (el.closest('label') ?? el).getBoundingClientRect();
        return {
          el: el.getAttribute('aria-label') ?? el.textContent?.trim() ?? el.tagName,
          w: r.width,
          h: r.height,
        };
      })
      .filter((b) => b.w < 43.5 || b.h < 43.5)
      .map((b) => `${b.el} ${Math.round(b.w)}×${Math.round(b.h)}`),
  );
  expect.soft(small, `${page.url()}\n${small.join('\n')}`).toEqual([]);
}

for (const scheme of ['light', 'dark'] as const) {
  test(`axe + targets, ${scheme}`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: scheme });
    for (const v of VIEWS) {
      await page.goto(v);
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      await page.waitForLoadState('networkidle');
      await settle(page);
      await axe(page, `${scheme} ${v}`);
      await targets(page);
    }
    await page.goto('/');
    await page.getByRole('button', { name: /^A11y row/ }).click();
    await expect(page.getByRole('dialog', { name: 'Edit task' })).toBeVisible();
    await settle(page);
    await axe(page, `${scheme} editor`);
  });
}
