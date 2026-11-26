# worker — backend notes (load only when working in worker/)

- Logic only in `src/services/*`. Each fn takes `ctx: Ctx` (`{ db, now(), tz }`, `services/ctx.ts`); never call `Date.now()` in a service.
- REST (`src/api/*`) and MCP tools (`src/mcp/tools/*`, `defineTool`) = `parse(Schema, input)` → service → JSON. Schemas come from `@motion/core` (zod/mini).
- Errors: throw `AppError('not_found'|'invalid'|'conflict')` (`lib/errors.ts`); `index.ts` maps them to 404/400/409.
- Output rows via `services/rows.ts` (`taskCols` + `toTask` etc.; nulls omitted). Raw SQL in a select from one table: qualify outer columns as `"tasks"."id"` (drizzle leaves them unqualified).
- Writes: bump `updated_at`; soft delete (`deleted_at`); several statements → one `db.batch()`.
- "Today" = `todayKey(ctx.tz, ctx.now())`. Dates are `YYYY-MM-DD` strings; times `HH:MM`.
- Schema change: edit `src/db/schema.ts` → `npm run db:generate` → `npm run db:migrate`. Add indexes for every new filter.
- Tests: `npm run test -- worker/test/<file>.test.ts`; use `testCtx(tz, now)` from `test/helpers.ts`. Migrations auto-apply (`test/setup.ts`).
- Auth: `/api/*` needs the owner cookie session (`auth/session.ts`); `/mcp` needs an OAuth Bearer token (provider in `index.ts`). REST tests: `sessionCookie()`; MCP/OAuth tests: `test/oauth.ts` (`fullFlow`, `rpc`). Test origin must be `http://localhost`.
- Secrets: `OWNER_PW_HASH` (`npm run auth:hash -w @motion/worker` → `worker/.dev.vars` / `wrangler secret put`). Root `deploy` blocked until Phase 5.
