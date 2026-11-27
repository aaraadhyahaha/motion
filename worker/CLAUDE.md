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
- Secrets: `OWNER_PW_HASH` (`npm run auth:hash -w @motion/worker` → `worker/.dev.vars` / `wrangler secret put`).

## Runbook (prod) — run from `worker/` unless noted; ask before each

- **Prod:** `https://motion.motion-worker.workers.dev` · D1 `motion` `a8d19f38-…` · KV `OAUTH_KV` `3042f925…` (full ids in `wrangler.jsonc`). wrangler `secret`/`kv`/`d1` commands need `worker/` as cwd.
- **Deploy:** `npm run deploy` (root: check + test + deploy). Then `npx wrangler versions list` → note the version id (record it in `docs/DECISIONS.md`). Secret changes create versions too; roll back to a version that already has the current `OWNER_PW_HASH`.
- **Migrate** (root): `npm run db:export -w @motion/worker` (backup → `backups/`), then `npm run db:migrate:remote -w @motion/worker`. Additive only; destructive = two deploys (stop reading → later drop).
- **Rotate password** (from `worker/`, own terminal, not `!`; fish-safe, no pipe): `node scripts/hash-password.mjs > ~/.motion-hash` (type, Enter, Ctrl-D) → `npx wrangler secret put OWNER_PW_HASH < ~/.motion-hash` → `rm ~/.motion-hash`. Live immediately (makes a new version). Check: `npx wrangler secret list` → exactly one, `OWNER_PW_HASH`.
  - Revoke sessions: `npx wrangler kv key list --binding OAUTH_KV --remote --prefix sess:` → `npx wrangler kv key delete --binding OAUTH_KV --remote <key>` each.
- **Roll back:** `npx wrangler rollback [<version-id>]` — code only; D1 is not rolled back.
  - Data: `npx wrangler d1 time-travel restore motion --timestamp <ISO>`, or execute the export into a fresh DB (`npx wrangler d1 execute <db> --remote --file <backup>`).
- **Smoke:** `node scripts/smoke.mjs <ORIGIN> [--auth]` (root) · `PWA_URL=<ORIGIN> npm run test:prod -w @motion/web`.
