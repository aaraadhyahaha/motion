// #mcp Stateless Streamable-HTTP MCP endpoint (hand-rolled JSON-RPC, no SDK — see DECISIONS).
// POST → one JSON-RPC message → `application/json` reply. No sessions, no SSE (GET/DELETE → 405).

import type { Env } from '../env';
import { AppError } from '../lib/errors';
import { makeCtx } from '../services/ctx';
import { inputSchema } from './tool';
import { tools } from './tools';

const VERSIONS = ['2025-11-25', '2025-06-18', '2025-03-26'];
const byName = new Map(tools.map((t) => [t.name, t]));
let listed: unknown[] | undefined; // built once per isolate
const list = () =>
  (listed ??= tools.map((t) => ({
    name: t.name,
    description: t.description,
    inputSchema: inputSchema(t.input),
    ...(t.annotations && { annotations: t.annotations }),
  })));

type Id = string | number | null;
interface Msg {
  jsonrpc?: string;
  id?: Id;
  method?: string;
  params?: Record<string, unknown>;
}

const reply = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
const ok = (id: Id, result: unknown) => reply({ jsonrpc: '2.0', id, result });
const fail = (id: Id, code: number, message: string, status = 200) =>
  reply({ jsonrpc: '2.0', id, error: { code, message } }, status);
const text = (v: unknown, isError = false) => ({
  content: [{ type: 'text', text: typeof v === 'string' ? v : JSON.stringify(v) }],
  ...(isError && { isError }),
});

async function call(env: Env, p: Record<string, unknown> = {}) {
  const tool = byName.get(String(p.name));
  if (!tool) return null;
  const parsed = tool.input.safeParse(p.arguments ?? {});
  // Bad arguments are tool errors (not protocol errors) so the model can correct itself.
  if (!parsed.success)
    return text(
      {
        error: 'invalid',
        issues: parsed.error.issues.map((i) => ({ path: i.path.join('.'), msg: i.message })),
      },
      true,
    );
  try {
    return text((await tool.run(await makeCtx(env), parsed.data)) ?? { ok: true });
  } catch (e) {
    if (e instanceof AppError) return text({ error: e.code, msg: e.message, issues: e.issues }, true);
    throw e;
  }
}

export const mcpHandler = {
  async fetch(req: Request, env: Env): Promise<Response> {
    if (req.method !== 'POST') return new Response(null, { status: 405, headers: { allow: 'POST' } });
    let m: Msg;
    try {
      m = await req.json();
    } catch {
      return fail(null, -32700, 'parse error', 400);
    }
    if (
      !m ||
      typeof m !== 'object' ||
      Array.isArray(m) ||
      m.jsonrpc !== '2.0' ||
      typeof m.method !== 'string'
    )
      return fail(null, -32600, 'invalid request', 400);
    if (m.id === undefined) return new Response(null, { status: 202 }); // notification
    const id = m.id;
    switch (m.method) {
      case 'initialize': {
        const want = String(m.params?.protocolVersion ?? '');
        return ok(id, {
          protocolVersion: VERSIONS.includes(want) ? want : VERSIONS[0],
          capabilities: { tools: { listChanged: false } },
          serverInfo: { name: 'motion', version: '0.3.0' },
          instructions:
            'Personal tasks. Dates are YYYY-MM-DD in the owner timezone, times HH:MM. Prefer quick_add for natural language; get_agenda for "today/this week".',
        });
      }
      case 'ping':
        return ok(id, {});
      case 'tools/list':
        return ok(id, { tools: list() });
      case 'tools/call': {
        try {
          const r = await call(env, m.params);
          return r ? ok(id, r) : fail(id, -32602, `unknown tool: ${String(m.params?.name)}`);
        } catch (e) {
          console.error(e);
          return fail(id, -32603, 'internal error');
        }
      }
      default:
        return fail(id, -32601, `method not found: ${m.method}`);
    }
  },
};
