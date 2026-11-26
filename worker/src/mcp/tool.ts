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

/** JSON Schema for `tools/list` (input side: defaults make fields optional). `$schema` dropped to save tokens. */
export function inputSchema(s: z.ZodMiniType): Record<string, unknown> {
  const { $schema: _, ...rest } = z.toJSONSchema(s, { io: 'input', unrepresentable: 'any' }) as Record<
    string,
    unknown
  >;
  return rest;
}

export const READ = { readOnlyHint: true } as const;
export const WRITE = { readOnlyHint: false, destructiveHint: false } as const;
