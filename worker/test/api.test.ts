import { exports } from 'cloudflare:workers';
import { beforeAll, describe, expect, it } from 'vitest';
import { sessionCookie } from './helpers';

let cookie = '';
beforeAll(async () => {
  cookie = await sessionCookie();
});

const call = (method: string, path: string, body?: unknown) =>
  exports.default.fetch(`http://localhost/api${path}`, {
    method,
    headers: { 'content-type': 'application/json', cookie },
    ...(body !== undefined && { body: typeof body === 'string' ? body : JSON.stringify(body) }),
  });
const json = async (res: Response) => (await res.json()) as Record<string, any>;

describe('REST', () => {
  it('task lifecycle: create → list → patch → complete → undo → delete → restore', async () => {
    const created = await call('POST', '/tasks', {
      title: 'Buy milk',
      dueDate: '2030-01-02',
      tags: ['shop'],
    });
    expect(created.status).toBe(201);
    const t = await json(created);
    expect((await json(await call('GET', '/tasks?tag=shop'))).items).toHaveLength(1);
    expect(await json(await call('PATCH', `/tasks/${t.id}`, { title: 'Buy oat milk' }))).toMatchObject({
      title: 'Buy oat milk',
    });
    expect(await json(await call('POST', `/tasks/${t.id}/complete`))).toMatchObject({ done: true });
    expect(await json(await call('POST', `/tasks/${t.id}/uncomplete`))).toMatchObject({ done: false });
    expect((await call('DELETE', `/tasks/${t.id}`)).status).toBe(204);
    expect((await call('GET', `/tasks/${t.id}`)).status).toBe(404);
    expect(await json(await call('POST', `/tasks/${t.id}/restore`))).toMatchObject({ title: 'Buy oat milk' });
    expect((await call('POST', `/tasks/${t.id}/restore`)).status).toBe(404);
  });

  it('validation and error mapping', async () => {
    const bad = await call('POST', '/tasks', { title: '', dueDate: '2026-13-01' });
    expect(bad.status).toBe(400);
    const err = (await json(bad)).error;
    expect(err.code).toBe('invalid');
    expect(err.issues.map((i: { path: string }) => i.path).sort()).toEqual(['dueDate', 'title']);
    expect((await call('POST', '/tasks', '{nope')).status).toBe(400);
    expect((await call('GET', '/tasks?limit=500')).status).toBe(400);
    expect((await call('DELETE', '/lists/inbox')).status).toBe(409);
    expect((await call('PATCH', '/lists/missing', { name: 'x' })).status).toBe(404);
    expect((await call('GET', '/nope')).status).toBe(404);
    expect((await call('PATCH', '/settings', { tz: 'Mars/Base' })).status).toBe(400);
  });

  it('lists, tags, quick add, views, settings', async () => {
    const list = await json(await call('POST', '/lists', { name: 'Work' }));
    expect((await json(await call('GET', '/lists'))).items.map((l: { name: string }) => l.name)).toContain(
      'Work',
    );
    expect((await call('POST', '/tags', { name: 'deep' })).status).toBe(201);
    const q = await json(await call('POST', '/tasks/quick', { text: 'ship it #work @deep' }));
    expect(q).toMatchObject({ title: 'ship it', listId: list.id, tags: ['deep'] });
    expect(await json(await call('GET', '/agenda?days=3'))).toHaveProperty('overdue');
    expect(await json(await call('GET', '/stats'))).toHaveProperty('streak');
    expect((await json(await call('GET', '/changes?since=0'))).tasks.length).toBeGreaterThan(0);
    expect(await json(await call('PATCH', '/settings', { tz: 'Europe/London' }))).toEqual({
      tz: 'Europe/London',
    });
    expect(await json(await call('GET', '/settings'))).toEqual({ tz: 'Europe/London' });
  });
});
