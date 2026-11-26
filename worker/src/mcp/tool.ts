// #mcp Tool definition helper. A tool = zod/mini input schema + a call into services/* (no logic here).
import * as z from 'zod/mini';
import type { Ctx } from '../services/ctx';

export interface Tool<S extends z.ZodMiniType = z.ZodMiniType> {
  name: string;
  description: string;
  input: S;
  /** readOnlyHint / destructiveHint for clients that confirm writes. */
  annotations?: { readOnlyHint?: boolean; destructiveHint?: boolean; idempotentHint?: boolean };
  run: (ctx: Ctx, args: z.infer<S>) => Promise<unknown>;
}

export const defineTool = <S extends z.ZodMiniType>(t: Tool<S>): Tool => t as unknown as Tool;

/**
 * JSON Schema for `tools/list` (input side: defaults make fields optional), compacted for tokens:
 * `$schema` dropped, nullable `anyOf` → `type: [t, "null"]`, date/time regexes → `format`/a short hint,
 * id/tag regexes and length bounds dropped. Display only — zod still validates every call (errors → isError).
 */
export function inputSchema(s: z.ZodMiniType): Record<string, unknown> {
  const { $schema: _, ...rest } = z.toJSONSchema(s, { io: 'input', unrepresentable: 'any' }) as Record<
    string,
    unknown
  >;
  return compact(rest) as Record<string, unknown>;
}

type Node = Record<string, unknown>;
function compact(v: unknown): unknown {
  if (Array.isArray(v)) return v.map(compact);
  if (!v || typeof v !== 'object') return v;
  let n = { ...(v as Node) };
  const any = n.anyOf as Node[] | undefined;
  if (any?.length === 2 && any.some((x) => x.type === 'null')) {
    const { anyOf: _, ...own } = n;
    const t = any.find((x) => x.type !== 'null') ?? {};
    n = { ...own, ...t, type: [t.type, 'null'] };
  }
  const p = n.pattern as string | undefined;
  if (p) {
    delete n.pattern;
    if (p.includes('\\d{4}-')) n.format = 'date';
    else if (p.includes(':[0-5]')) n.description = 'HH:MM';
    else if (p.startsWith('^#')) n.description = '#rrggbb';
  }
  delete n.maxLength;
  delete n.minLength;
  delete n.maxItems;
  if (typeof n.maximum === 'number' && n.maximum > 1e6) delete n.maximum;
  for (const [k, x] of Object.entries(n)) n[k] = compact(x);
  return n;
}

export const READ = { readOnlyHint: true } as const;
// readOnlyHint defaults to false; destructiveHint defaults to true, so writes must say false
export const WRITE = { destructiveHint: false } as const;
