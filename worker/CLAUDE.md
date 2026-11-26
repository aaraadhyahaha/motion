# worker — backend notes (load only when working in worker/)

- Logic only in `src/services/*`. Each fn takes `ctx: Ctx` (`{ db, now(), tz }`, `services/ctx.ts`); never call `Date.now()` in a service.
- REST (`src/api/*`) and MCP (Phase 3) = `parse(Schema, input)` → service → JSON. Schemas come from `@motion/core` (zod/mini).
- Errors: throw `AppError('not_found'|'invalid'|'conflict')` (`lib/errors.ts`); `index.ts` maps them to 404/400/409.
- Output rows via `services/rows.ts` (`taskCols` + `toTask` etc.; nulls omitted). Raw SQL in a select from one table: qualify outer columns as `"tasks"."id"` (drizzle leaves them unqualified).
- Writes: bump `updated_at`; soft delete (`deleted_at`); several statements → one `db.batch()`.
- "Today" = `todayKey(ctx.tz, ctx.now())`. Dates are `YYYY-MM-DD` strings; times `HH:MM`.
- Schema change: edit `src/db/schema.ts` → `npm run db:generate` → `npm run db:migrate`. Add indexes for every new filter.
- Tests: `npm run test -- worker/test/<file>.test.ts`; use `testCtx(tz, now)` from `test/helpers.ts`. Migrations auto-apply (`test/setup.ts`).
- REST has no auth until Phase 3 → `npm run deploy` is blocked at the root.
