import type * as z from 'zod/mini';
import { AppError } from './errors';

/** Parse once at the edge; throws AppError('invalid') with zod issues. */
export function parse<S extends z.ZodMiniType>(schema: S, data: unknown): z.infer<S> {
  const r = schema.safeParse(data);
  if (!r.success)
    throw new AppError(
      'invalid',
      'invalid input',
      r.error.issues.map((i) => ({ path: i.path.join('.'), msg: i.message })),
    );
  return r.data;
}

/** Request JSON body; malformed JSON → 400 instead of 500. */
export async function body(req: { json: () => Promise<unknown> }): Promise<unknown> {
  try {
    return await req.json();
  } catch {
    throw new AppError('invalid', 'body must be JSON');
  }
}
