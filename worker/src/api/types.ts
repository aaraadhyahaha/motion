import type { Env } from '../env';
import type { Ctx } from '../services/ctx';

export type AppEnv = { Bindings: Env; Variables: { ctx: Ctx } };
