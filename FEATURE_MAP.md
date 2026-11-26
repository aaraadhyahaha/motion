# FEATURE_MAP — keyword → files

Read this first. One row per feature. Update rows in the same change that adds/moves files.
Status: ⬜ planned · 🟨 in progress · ✅ done

## #wf — workflow

| Feature | Files | Tests | Status |
|---|---|---|---|
| Project rules | `CLAUDE.md`, `worker/CLAUDE.md` | — | ✅ |
| Plans | `plans/*.md` | — | ✅ |
| Decision log | `docs/DECISIONS.md` | — | ✅ |
| Claude settings | `.claude/settings.json` | — | ✅ |
| Workspaces + tooling | `package.json`, `tsconfig.base.json`, `biome.json`, `vitest.config.ts`, `.size-limit.json`, `*/package.json` | — | ✅ |

## #db — data

| Feature | Files | Tests | Status |
|---|---|---|---|
| Schema + migrations | `worker/src/db/schema.ts`, `worker/migrations/`, `worker/drizzle.config.ts` | `worker/test/setup.ts` | ✅ |
| D1 client + config | `worker/src/db/client.ts`, `worker/wrangler.jsonc`, `worker/src/env.ts` | — | ✅ |

## #task / #list — domain

| Feature | Files | Tests | Status |
|---|---|---|---|
| Shared schemas/types (zod/mini) | `packages/core/src/schemas.ts`, `packages/core/src/index.ts` | `packages/core/src/schemas.test.ts` | ✅ |
| Task service (CRUD, query) | `worker/src/services/tasks.ts`, `worker/src/services/rows.ts` | `worker/test/tasks.test.ts` | ✅ |
| Complete / undo | `worker/src/services/complete.ts` | `worker/test/complete.test.ts` | ✅ |
| Service context (db, now, tz) | `worker/src/services/ctx.ts` | `worker/test/helpers.ts` | ✅ |
| Settings (timezone) | `worker/src/services/settings.ts` | `worker/test/api.test.ts` | ✅ |
| Changes feed (polling) | `worker/src/services/changes.ts` | `worker/test/changes.test.ts` | ✅ |
| List service | `worker/src/services/lists.ts` | `worker/test/lists.test.ts` | ✅ |
| Tag service | `worker/src/services/tags.ts` | `worker/test/tags.test.ts` | ✅ |

## #api — REST

| Feature | Files | Tests | Status |
|---|---|---|---|
| Routes | `worker/src/api/{index,types,lists,tags,tasks,views}.ts`, `worker/src/index.ts` | `worker/test/api.test.ts` | ✅ |
| Errors / validation / ids | `worker/src/lib/{errors,validate,id}.ts` | `worker/test/api.test.ts` | ✅ |

## #mcp / #auth

| Feature | Files | Tests | Status |
|---|---|---|---|
| MCP server | `worker/src/mcp/server.ts` | — | ⬜ |
| MCP tools | `worker/src/mcp/tools/*.ts` | `worker/test/mcp.test.ts` | ⬜ |
| OAuth + owner login | `worker/src/auth/*.ts` | — | ⬜ |

## #ui / #type / #anim / #pwa

| Feature | Files | Tests | Status |
|---|---|---|---|
| Design tokens | `apps/web/src/styles/tokens.css` (stub) | — | ⬜ |
| Web scaffold (placeholder) | `apps/web/{index.html,vite.config.ts}`, `apps/web/src/{main,App}.tsx` | — | ✅ |
| App shell | `apps/web/src/components/Shell*.tsx` | `apps/web/e2e/` | ⬜ |
| Completion celebration | `apps/web/src/celebrate/*` | — | ⬜ |
| PWA manifest + SW | `apps/web/vite.config.ts` | — | ⬜ |

## #sched / #recur

| Feature | Files | Tests | Status |
|---|---|---|---|
| Dates / timezone helpers | `packages/core/src/dates.ts` | `packages/core/src/dates.test.ts` | ✅ |
| Recurrence (RRULE subset) | `packages/core/src/recurrence.ts` | `packages/core/src/recurrence.test.ts` | ✅ |
| Quick-add parser | `packages/core/src/quickadd.ts`, `worker/src/services/quickadd.ts`, `worker/src/lib/nldate.ts` | `packages/core/src/quickadd.test.ts`, `worker/test/quickadd.test.ts` | ✅ |
| Agenda (today/upcoming/overdue) | `worker/src/services/agenda.ts` | `worker/test/agenda.test.ts` | ✅ |
| Reminders (Web Push + cron) | `worker/src/services/reminders.ts`, `worker/src/push/*` (schema: `push_subscriptions`, `tasks.remind_at`) | `worker/test/reminders.test.ts` | ⬜ |
| Stats & streaks | `worker/src/services/stats.ts` | `worker/test/stats.test.ts` | ✅ |
