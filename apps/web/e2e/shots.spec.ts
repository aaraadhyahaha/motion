// #wf #ui screenshots: Today / Upcoming / Stats / editor × project (phone|desktop) × light|dark → e2e/shots/.
import { expect, type Page, test } from '@playwright/test';
import { API, addDays, create, purge, today } from './seed';

const SEED = 'e2e·';
let editId = '';

test.beforeAll(async ({ request }) => {
  await purge(request, SEED);
  const d = await today(request);
  const lists = (await (await request.get(`${API}/lists`)).json()) as {
    items: { id: string; name: string }[];
  };
  // Legacy Apple hexes on purpose: the UI remaps them to Atelier inks.
  const list = async (name: string, color: string) =>
    lists.items.find((l) => l.name === name) ??
    ((await (await request.post(`${API}/lists`, { data: { name, color } })).json()) as { id: string });
  const work = await list('Work', '#007aff');
  const studio = await list('Studio', '#ff3b30');
  const home = await list('Home', '#34c759');
  const errands = await list('Errands', '#ffcc00');
  const health = await list('Health', '#32ade6');
  const t = (title: string, extra: Record<string, unknown> = {}) =>
    create(request, { title: `${SEED} ${title}`, ...extra });
  await t('Renew passport', { dueDate: addDays(d, -2), listId: errands.id });
  const e = await t('Write weekly review', {
    dueDate: d,
    dueTime: '09:30',
    durationMin: 45,
    listId: work.id,
    tags: ['focus'],
    notes: 'Wins, misses, next week’s three priorities.',
  });
  editId = e.id;
  await t('Morning run', { dueDate: d, dueTime: '07:00', durationMin: 30, listId: health.id });
  await t('Sketch onboarding flow', {
    dueDate: d,
    dueTime: '14:00',
    durationMin: 60,
    listId: studio.id,
    tags: ['deep'],
  });
  await t('Water the plants', { dueDate: d, rrule: 'FREQ=WEEKLY;BYDAY=MO,TH', listId: home.id });
  await t('Call the bank about the card', { dueDate: d, listId: errands.id, tags: ['phone'] });
  await t('Dentist', { dueDate: addDays(d, 1), dueTime: '14:00', durationMin: 60 });
  await t('Ship release notes', { dueDate: addDays(d, 3), listId: work.id });
  await t('Frame the prints', { dueDate: addDays(d, 3), listId: studio.id });
  await t('Groceries for the week', { dueDate: addDays(d, 5), tags: ['errands'] });
  for (let i = 0; i < 6; i++) {
    const x = await t(`Done ${i}`, { dueDate: d, listId: [work, studio, home][i % 3]?.id });
    await request.post(`${API}/tasks/${x.id}/complete`);
  }
});

const views: [string, string, (p: Page) => Promise<void>][] = [
  ['today', '/', (p) => expect(p.getByRole('checkbox', { name: `${SEED} Renew passport` })).toBeVisible()],
  [
    'upcoming',
    '/upcoming',
    (p) => expect(p.getByRole('checkbox', { name: `${SEED} Dentist` })).toBeVisible(),
  ],
  ['stats', '/stats', (p) => expect(p.getByText('This week')).toBeVisible()],
  [
    'editor',
    '/?t=EDIT',
    (p) =>
      expect(
        p.getByRole('dialog', { name: 'Edit task' }).getByRole('textbox', { name: 'Title' }),
      ).toBeVisible(),
  ],
];

for (const scheme of ['light', 'dark'] as const) {
  for (const [view, path, ready] of views) {
    test(`${view} ${scheme}`, async ({ page }, info) => {
      await page.emulateMedia({ colorScheme: scheme, reducedMotion: 'reduce' });
      await page.goto(path.replace('EDIT', editId));
      await ready(page);
      await page.evaluate(() => document.fonts.ready);
      await page.screenshot({
        path: `e2e/shots/${view}-${info.project.name}-${scheme}.png`,
        animations: 'disabled',
      });
    });
  }
}
