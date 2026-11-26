# FEATURE_MAP — keyword → files

Read this first. One row per feature. Update rows in the same change that adds/moves files.
Status: ⬜ planned · 🟨 in progress · ✅ done

## #wf — workflow

| Feature | Files | Tests | Status |
|---|---|---|---|
| Project rules | `CLAUDE.md`, `worker/CLAUDE.md`, `apps/web/CLAUDE.md` (HIG + motion + budgets + chunk prefixes) | — | ✅ |
| Plans | `plans/*.md` | — | ✅ |
| Decision log | `docs/DECISIONS.md` | — | ✅ |
| Claude settings | `.claude/settings.json` | — | ✅ |
| Workspaces + tooling | `package.json`, `tsconfig.base.json`, `biome.json`, `vitest.config.ts` (projects: core, worker, web), `apps/web/vitest.config.ts`, `.size-limit.js` (manifest-based budgets: initial/lazy/celebrate/SW/webmanifest), `*/package.json` | — | ✅ |

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
| Design tokens (type scale, semantic colors, materials, spacing/radii, springs, reduced-motion/-transparency) | `apps/web/src/styles/tokens.css` | — | ✅ |
| Base styles + Inter @font-face (preloaded via `preloadInter` in vite.config) | `apps/web/src/styles/base.css`, `apps/web/src/main.tsx` | — | ✅ |
| Icons (inline SVG paths) | `apps/web/src/components/Icon.tsx` | — | ✅ |
| Web scaffold (main: QueryClientProvider + startSync + ensureTz) | `apps/web/{index.html,package.json}`, `apps/web/src/{main,App}.tsx` | — | ✅ |
| Router (History API, `?t=` param) + spring mirror | `apps/web/src/lib/{router,springs}.ts` | `apps/web/src/lib/router.test.ts` | ✅ |
| Web data layer (fetch/ApiError, QueryClient, keys, queries, optimistic mutations, first-run tz) | `apps/web/src/data/{api,client,keys,queries,mutations,tz}.ts` | — | ✅ |
| Cache helpers (pure patchTask/removeTask) | `apps/web/src/data/cache.ts` | `apps/web/src/data/cache.test.ts` | ✅ |
| Changes poller (visibility-gated, backoff, echo dedupe) | `apps/web/src/data/sync.ts` | `apps/web/src/data/sync.test.ts` | ✅ |
| Toast store (undo) | `apps/web/src/ui/store.ts` | — | ✅ |
| Build + chunk naming (entry-/route-/editor-/celebrate-/vendor-motion- via `codeSplitting` group, deps not recursive) | `apps/web/vite.config.ts`, `.size-limit.js` | — | ✅ |
| App shell (layout, sidebar, tab bar, large→inline title, toast, empty) | `apps/web/src/components/{Shell,Sidebar,TabBar,PageHeader,Toast,Empty}.tsx`, `apps/web/src/styles/shell.css` | `apps/web/e2e/smoke.spec.ts` | ✅ |
| Task rows (memo list, linger → leave, WAAPI FLIP, checkbox spring/wipe/haptic; `sticky` day headers, `keepDone` for Logbook) | `apps/web/src/components/{TaskList,TaskRow,Checkbox}.tsx`, `apps/web/src/lib/flip.ts`, `apps/web/src/styles/row.css` | `apps/web/e2e/smoke.spec.ts` | ✅ |
| Quick add (core tokenize chips, ⌘K / N, dueDate=today on Today) | `apps/web/src/components/QuickAdd.tsx` | `apps/web/e2e/smoke.spec.ts` | ✅ |
| Row/date formatting (Intl) | `apps/web/src/lib/format.ts` | — | ✅ |
| Route switch + lazy routes + editor slot (`?t=`) + idle prefetch | `apps/web/src/App.tsx`, `apps/web/src/lib/prefetch.ts` | — | ✅ |
| Today view (overdue + today, entry chunk) | `apps/web/src/routes/Today.tsx` | `apps/web/e2e/smoke.spec.ts` | ✅ |
| Upcoming (13 days after today, sticky day headers, empty days collapse) | `apps/web/src/routes/Upcoming.tsx` | `apps/web/e2e/smoke.spec.ts`, shots | ✅ |
| List/tag view (open tasks, infinite pages) + sentinel hook | `apps/web/src/routes/TaskQueryView.tsx`, `apps/web/src/lib/useSentinel.ts` | — | ✅ |
| Lists tab (inset groups: lists, tags, Logbook) | `apps/web/src/routes/Lists.tsx`, `apps/web/src/styles/shell.css` (`.inset-*`) | — | ✅ |
| Logbook (done, grouped by completion day, uncheck = uncomplete) | `apps/web/src/routes/Logbook.tsx` | — | ✅ |
| Stats (tiles, 26-week heatmap, per-list bars; CSS lazy) | `apps/web/src/routes/{Stats,Heatmap}.tsx`, `apps/web/src/styles/stats.css` | shots | ✅ |
| Editor sheet (`?t=<id>`, LazyMotion, seeded from cached rows, save-on-close diff PATCH, delete) | `apps/web/src/editor/EditorSheet.tsx`, `apps/web/src/data/queries.ts` (`useTask` seed) | `apps/web/e2e/smoke.spec.ts` | ✅ |
| Sheet (bottom/centered, springs, drag-dismiss, focus trap, Esc, scrim) + pickers (dates, repeat, tags) | `apps/web/src/editor/{Sheet,DateFields,RepeatPicker,TagInput}.tsx`, `apps/web/src/styles/sheet.css`, `apps/web/src/styles/tokens.css` (`--scrim`, `--sheet-*`, `--grabber-*`) | `apps/web/e2e/smoke.spec.ts`, shots | ✅ |
| Completion celebration | `apps/web/src/celebrate/*` | — | ⬜ |
| PWA manifest + SW (precache shell · CacheFirst `/assets` · NetworkFirst `/api` GET) | `apps/web/vite.config.ts`, `apps/web/index.html` (metas), `apps/web/public/icons/*` | — | ✅ |
| E2E smoke + screenshots (isolated D1 `worker/.wrangler/e2e`, wrangler :8787 + vite :5173, phone/desktop, SW blocked; shots → `e2e/shots/` gitignored) | `apps/web/playwright.config.ts`, `apps/web/e2e/{seed,smoke.spec,shots.spec}.ts`, `apps/web/e2e/tsconfig.json` | `npm run test:e2e -w @motion/web` | ✅ |

## #sched / #recur

| Feature | Files | Tests | Status |
|---|---|---|---|
| Dates / timezone helpers | `packages/core/src/dates.ts` | `packages/core/src/dates.test.ts` | ✅ |
| Recurrence (RRULE subset) | `packages/core/src/recurrence.ts` | `packages/core/src/recurrence.test.ts` | ✅ |
| Quick-add parser | `packages/core/src/quickadd.ts`, `worker/src/services/quickadd.ts`, `worker/src/lib/nldate.ts` | `packages/core/src/quickadd.test.ts`, `worker/test/quickadd.test.ts` | ✅ |
| Agenda (today/upcoming/overdue) | `worker/src/services/agenda.ts` | `worker/test/agenda.test.ts` | ✅ |
| Reminders (Web Push + cron) | `worker/src/services/reminders.ts`, `worker/src/push/*` (schema: `push_subscriptions`, `tasks.remind_at`) | `worker/test/reminders.test.ts` | ⬜ |
| Stats & streaks | `worker/src/services/stats.ts` | `worker/test/stats.test.ts` | ✅ |
