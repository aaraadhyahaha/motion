// #ui e2e: empty states per view, via API stubs (the shared seed DB stays untouched).
import { expect, test } from '@playwright/test';

const page0 = { items: [] };
test.beforeEach(async ({ page }) => {
  const day = new Date().toISOString().slice(0, 10);
  const json = (body: unknown) => ({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify(body),
  });
  await page.route(/\/api\/agenda/, (r) => r.fulfill(json({ today: day, overdue: [], days: {} })));
  await page.route(/\/api\/tasks\?/, (r) => r.fulfill(json(page0)));
  await page.route(/\/api\/stats/, (r) =>
    r.fulfill(json({ perDay: {}, perList: {}, streak: 0, best: 0, total: 0 })),
  );
  await page.route(/\/api\/lists$/, (r) =>
    r.fulfill(json({ items: [{ id: 'inbox', name: 'Inbox', position: 0, updatedAt: 0 }] })),
  );
  await page.route(/\/api\/tags$/, (r) => r.fulfill(json(page0)));
  await page.route(/\/api\/changes/, (r) =>
    r.fulfill(json({ next: 0, tasks: [], lists: [], tags: [], deleted: { tasks: [], lists: [], tags: [] } })),
  );
});

for (const [path, title] of [
  ['/', 'Desk’s clear.'],
  ['/upcoming', 'Two quiet weeks.'],
  ['/logbook', 'Nothing finished yet.'],
  ['/stats', 'Tiles at zero.'],
  ['/lists', 'No lists yet.'],
  ['/search', 'Look for anything.'],
  ['/search?q=zzz', 'No match for “zzz”.'],
  ['/tag/quiet', 'Nothing wears this tag.'],
  ['/list/inbox', 'A blank page.'],
]) {
  test(`empty ${path}`, async ({ page }) => {
    await page.goto(path as string);
    await expect(page.getByRole('status').filter({ hasText: title as string })).toBeVisible();
  });
}
