// #ui e2e (Phase 2 gaps): Logbook grouping + uncheck = uncomplete; Lists tab links.
import { expect, test } from '@playwright/test';
import { API, create, purge, today } from './seed';

test('Logbook shows done tasks by day; unchecking reopens', async ({ page, request }) => {
  await purge(request, 'Logged');
  const t = await create(request, { title: 'Logged thing', dueDate: await today(request) });
  await request.post(`${API}/tasks/${t.id}/complete`);
  await page.goto('/logbook');
  const main = page.getByRole('main');
  await expect(main.getByRole('heading', { name: /^Today/, level: 2 }).first()).toBeVisible();
  const box = main.getByRole('checkbox', { name: 'Logged thing' });
  await expect(box).toHaveAttribute('aria-checked', 'true');
  await box.click();
  await expect(box).toHaveAttribute('aria-checked', 'false');
  await expect(box).toBeVisible(); // stays put (keepDone), no leave animation
  expect((await (await request.get(`${API}/tasks/${t.id}`)).json()).done).toBe(false);
});

test('Lists tab: lists, tags, Search, Logbook, Settings', async ({ page, request }) => {
  await purge(request, 'Listed');
  const l = await request.post(`${API}/lists`, { data: { name: 'Errands e2e' } });
  const list = (await l.json()) as { id: string };
  await create(request, { title: 'Listed one', listId: list.id, tags: ['e2etag'] });
  await page.goto('/lists');
  const main = page.getByRole('main');
  await main.getByRole('link', { name: 'Errands e2e' }).click();
  await expect(page.getByRole('heading', { name: 'Errands e2e', level: 1 })).toBeVisible();
  await expect(main.getByRole('checkbox', { name: 'Listed one' })).toBeVisible();
  await page.goBack();
  await main.getByRole('link', { name: 'e2etag' }).click();
  await expect(page.getByRole('heading', { name: '@e2etag', level: 1 })).toBeVisible();
  await page.goBack();
  for (const name of ['Search', 'Logbook', 'Settings']) {
    await main.getByRole('link', { name }).click();
    await expect(page.getByRole('heading', { name, level: 1 })).toBeVisible();
    await page.goBack();
  }
  await request.delete(`${API}/lists/${list.id}`);
});
