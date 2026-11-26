import { env } from 'cloudflare:workers';
import { beforeAll, describe, expect, it } from 'vitest';
import { getTask } from '../src/services/tasks';
import { testCtx } from './helpers';
import { fullFlow, req, rpc } from './oauth';

let tok = '';
beforeAll(async () => {
  tok = (await fullFlow()).access_token;
});

type Res = { result?: any; error?: { code: number; message: string } };
const send = async (method: string, params?: unknown) =>
  (await (await rpc(tok, method, params)).json()) as Res;
/** tools/call → parsed JSON payload (+ isError flag). */
const tool = async (name: string, args: Record<string, unknown> = {}) => {
  const r = await send('tools/call', { name, arguments: args });
  if (r.error) throw new Error(r.error.message);
  return { data: JSON.parse(r.result.content[0].text), isError: !!r.result.isError };
};
const ctx = () => testCtx('UTC', Date.now());

describe('MCP protocol', () => {
  it('initialize negotiates version; notifications → 202; GET → 405', async () => {
    const init = await send('initialize', {
      protocolVersion: '2025-06-18',
      capabilities: {},
      clientInfo: { name: 't', version: '1' },
    });
    expect(init.result).toMatchObject({
      protocolVersion: '2025-06-18',
      capabilities: { tools: {} },
      serverInfo: { name: 'motion' },
    });
    expect((await send('initialize', { protocolVersion: '1999-01-01' })).result.protocolVersion).toBe(
      '2025-11-25',
    );
    const note = await req('/mcp', {
      method: 'POST',
      headers: { authorization: `Bearer ${tok}`, 'content-type': 'application/json' },
      body: '{"jsonrpc":"2.0","method":"notifications/initialized"}',
    });
    expect(note.status).toBe(202);
    expect((await req('/mcp', { headers: { authorization: `Bearer ${tok}` } })).status).toBe(405);
    expect((await send('nope/nope')).error?.code).toBe(-32601);
    expect((await send('tools/call', { name: 'nope' })).error?.code).toBe(-32602);
  });

  it('tools/list: every tool has an object JSON schema, compact (no $schema/anyOf/regex noise)', async () => {
    const { tools } = (await send('tools/list')).result;
    // token budget for the whole list: 6319 → 4858 chars (Phase 4 compaction)
    expect(JSON.stringify(tools).length).toBeLessThanOrEqual(4900);
    expect(JSON.stringify(tools)).not.toMatch(/anyOf|pattern|maxLength|9007199254740991/);
    expect(tools.map((t: { name: string }) => t.name).sort()).toEqual([
      'complete_task',
      'create_list',
      'create_task',
      'delete_task',
      'get_agenda',
      'get_task',
      'list_lists',
      'list_tags',
      'list_tasks',
      'quick_add',
      'reschedule_task',
      'search_tasks',
      'update_task',
    ]);
    for (const t of tools) {
      expect(t.inputSchema.type).toBe('object');
      expect(t.inputSchema.$schema).toBeUndefined();
      expect(t.description.length).toBeGreaterThan(10);
    }
    const create = tools.find((t: { name: string }) => t.name === 'create_task');
    expect(create.inputSchema.required).toEqual(['title']);
  });
});

describe('MCP tools hit services', () => {
  it('task lifecycle through tools; D1 state matches', async () => {
    const list = (await tool('create_list', { name: 'Errands' })).data;
    expect((await tool('list_lists')).data.map((l: { id: string }) => l.id)).toContain(list.id);

    const t = (await tool('create_task', { title: 'Post parcel', listId: list.id, tags: ['out'] })).data;
    expect(await getTask(ctx(), t.id)).toMatchObject({
      title: 'Post parcel',
      listId: list.id,
      tags: ['out'],
    });
    expect((await tool('list_tags')).data.map((g: { name: string }) => g.name)).toContain('out');

    await tool('update_task', { id: t.id, notes: 'blue box' });
    expect((await getTask(ctx(), t.id)).notes).toBe('blue box');

    await tool('reschedule_task', { id: t.id, when: '2031-03-04 09:30' });
    expect(await getTask(ctx(), t.id)).toMatchObject({ dueDate: '2031-03-04', dueTime: '09:30' });
    await tool('reschedule_task', { id: t.id, when: 'tomorrow' });
    expect((await getTask(ctx(), t.id)).dueTime).toBeUndefined();

    expect((await tool('list_tasks', { list: list.id })).data.items).toHaveLength(1);
    expect((await tool('search_tasks', { q: 'parcel' })).data.items[0].id).toBe(t.id);
    expect((await tool('get_task', { id: t.id })).data.title).toBe('Post parcel');
    expect((await tool('get_agenda', { days: 3 })).data).toHaveProperty('overdue');

    expect((await tool('complete_task', { id: t.id })).data.done).toBe(true);
    expect((await tool('complete_task', { id: t.id, undo: true })).data.done).toBe(false);
    expect((await tool('delete_task', { id: t.id })).data).toEqual({ ok: true });
    expect((await tool('get_task', { id: t.id })).isError).toBe(true);
  });

  it('quick_add parses natural language server-side', async () => {
    const t = (await tool('quick_add', { text: 'water plants tomorrow 8am @home' })).data;
    expect(t).toMatchObject({ title: 'water plants', dueTime: '08:00', tags: ['home'] });
    expect((await env.DB.prepare('select title from tasks where id = ?').bind(t.id).first())?.title).toBe(
      'water plants',
    );
  });

  it('bad arguments and service errors are tool errors (isError), not protocol errors', async () => {
    const bad = await tool('create_task', { title: '' });
    expect(bad).toMatchObject({ isError: true, data: { error: 'invalid' } });
    expect((await tool('update_task', { id: 'missing', title: 'x' })).data.error).toBe('not_found');
    expect((await tool('reschedule_task', { id: 'missing', when: 'blorp' })).data.error).toBe('invalid');
  });
});
