# Step 1 — Scaffold, core, data, services, REST
Status: ✅ done 2026-11-26 (50 tests; `npm run check` green). Deviations: `zod/mini`, `@cloudflare/vitest-plugin`, `chrono-node/en`, `api/views.ts` groups agenda/stats/changes/settings, `Changes.next` replaces `now`.

Parent: `plans/2026-11-26-foundation.md` §7.1 · Feature answers: `docs/DECISIONS.md` (2026-11-26 #list…#ui).
Scope: no UI design, no auth, no MCP, no push sending. **REST is unauthenticated until Phase 3 → do not deploy.**

## 1. Workspaces

```
package.json            # workspaces: packages/*, worker, apps/web; scripts below
tsconfig.base.json      # strict, ES2022, moduleResolution bundler, noUncheckedIndexedAccess
biome.json              # lint + format (one binary, replaces eslint+prettier)
vitest.config.ts        # test.projects: ['packages/core', 'worker']
packages/core           # @motion/core — consumed as TS source (exports → src/index.ts), no build
worker                  # @motion/worker — wrangler.jsonc, Hono, Drizzle, vitest-pool-workers
apps/web                # @motion/web — minimal Vite+React placeholder (real UI = Phase 2), /api proxy → :8787
.size-limit.json        # apps/web/dist JS ≤90 KB gz, CSS ≤15 KB gz
```
Root scripts: `dev` (worker & web), `test` (`vitest run`, so `npm run test -- <path>` runs one file), `typecheck` (tsc -b per workspace), `lint` (biome), `check` (typecheck+lint+build web+size-limit), `db:generate` (drizzle-kit), `db:migrate` (`wrangler d1 migrations apply motion --local`), `deploy` (guarded).
Also create `worker/CLAUDE.md` (backend rules: Ctx pattern, error codes, migration workflow).

## 2. Dependencies (each gets a DECISIONS line with measured gz size)

Runtime: `zod` (v4, core) · `hono` (worker) · `drizzle-orm` (worker) · `chrono-node` (worker, dynamic import only in quick-add path) · `react`, `react-dom` (web).
Dev: `typescript`, `vitest`, `@cloudflare/vitest-pool-workers`, `wrangler`, `@cloudflare/workers-types`, `drizzle-kit`, `@biomejs/biome`, `vite`, `@vitejs/plugin-react`, `size-limit`, `@size-limit/file`.
Not added: `@hono/zod-validator` (10-line own helper), `nanoid`/`ulid` (own `id()` via `crypto.getRandomValues`), `rrule` (own subset), `date-fns-tz` (Intl).

## 3. `packages/core/src`

| File | Contents |
|---|---|
| `schemas.ts` | zod: `List`, `ListCreate/Update`, `Tag`, `TagCreate/Update`, `Task`, `TaskCreate/Update`, `TaskQuery` (list, tag, done, from, to, q, cursor, limit≤100 default 50), `QuickAdd`, `Settings`; `DayKey` (`YYYY-MM-DD`), `TimeHM` (`HH:MM`). Exported inferred types. |
| `dates.ts` | `todayKey(tz, now)`, `addDays(key, n)`, `dayOfWeek(key)`, `daysInMonth`, `zonedToEpoch(day, time, tz)` (Intl offset trick, DST-safe), `epochToDayKey(ms, tz)`. Civil-date math on day keys only — no Date timezone bugs. |
| `recurrence.ts` | RRULE subset parse/serialize: `FREQ=DAILY | WEEKLY | MONTHLY | YEARLY`, `INTERVAL`, `BYDAY` (`MO`, `2TU`, `-1FR`), `BYMONTHDAY`(1..31, -1).`next(rule, fromDay, mode)`: mode `due`= next after current due;`done`= next after completion day. Day 31 in short months → clamp to month end (documented).`describe(rule)` → "Every 2 weeks on Mon, Wed". |
| `quickadd.ts` | Pure tokenizer: extracts `#list`, `@tag`, recurrence phrases (`every day/weekday/mon, wed/2 weeks/month on the 1st/2nd tue/last fri/year`, `every!` = from completion) → `{title, listName?, tags[], rrule?, recurFrom?, dateText}`. Date/time parsing is NOT here (chrono lives in worker). |
| `index.ts` | re-exports |
| Tests: `dates.test.ts`, `recurrence.test.ts`, `quickadd.test.ts`. |

## 4. D1 schema (`worker/src/db/schema.ts`, Drizzle sqlite)

All ids: 10-char base36 TEXT. Times: INTEGER epoch ms. Soft delete via `deleted_at` so polling sees tombstones.

| Table | Columns | Indexes |
|---|---|---|
| `lists` | id, name, color, position REAL, created_at, updated_at, deleted_at | (deleted_at, position), (updated_at) |
| `tags` | id, name COLLATE NOCASE UNIQUE, color, updated_at, deleted_at | (updated_at) |
| `tasks` | id, list_id→lists, title, notes, done 0/1, done_at, due_date TEXT, due_time TEXT, duration_min, rrule, recur_from ('due'/'done'), remind_at, reminded_at, position REAL, created_at, updated_at, deleted_at | (done, due_date), (list_id, done, position), (updated_at), partial (remind_at) WHERE reminded_at IS NULL AND done=0 |
| `task_tags` | task_id, tag_id · PK(task_id, tag_id) | (tag_id, task_id) |
| `completions` | id, task_id, day TEXT (local), at, prev_due_date, prev_due_time, prev_remind_at | (day), (task_id, at) |
| `settings` | key PK, value | — |
| `push_subscriptions` | endpoint PK, p256dh, auth, created_at | — (schema only; sending = Phase 3) |
| Migrations: `drizzle-kit generate` → `worker/migrations/0000_*.sql`; custom `0001_seed.sql` inserts list `inbox` ("Inbox", position 0) and `settings.tz` from default. Inbox can't be deleted. |
| Search: `LIKE` on title/notes (single user, small data); FTS5 only if it gets slow. |

## 5. Services (`worker/src/services/*`) — the only place with logic

Each fn takes `ctx: Ctx = { db, now(): number, tz }` (built per request in `ctx.ts`; tests inject fixed `now`). Throw `AppError(code: 'not_found'|'invalid'|'conflict', msg)`.

| File | Functions |
|---|---|
| `ctx.ts` | `makeCtx(env, req)` — reads tz from settings (cached per isolate, invalidated on set) |
| `lists.ts` | `listLists`, `createList` (position = max+1), `updateList` (name/color/position), `deleteList` (moves tasks → inbox, soft delete; inbox → conflict) |
| `tags.ts` | `listTags`, `ensureTags(names)` (upsert, one `db.batch`), `updateTag`, `deleteTag` |
| `tasks.ts` | `listTasks(query)` (only needed columns; tags via one grouped join; opaque cursor, offset-backed for now), `getTask`, `createTask`, `updateTask` (incl. tags replace, position), `deleteTask` (soft) |
| `complete.ts` | `completeTask` → writes completion row; recurring: advance `due_date` via `recurrence.next`, shift `remind_at` by same delta, keep `done=0`; else `done=1`. `uncompleteTask` → reverts the latest completion (undo). |
| `agenda.ts` | `getAgenda(days=7)` → `{overdue, today, upcoming: {day: Task[]}}` from one query on `(done, due_date)`; order due_time NULLS LAST, position |
| `stats.ts` | `getStats(days=30)` → `{perDay: {day: n}, streak, best}` from `completions.day` |
| `quickadd.ts` | `quickAdd(text)` → core tokenizer → `await import('chrono-node')` for dateText → resolve `#list` (existing only, else left in title), `ensureTags` → `createTask`. Recurring without date → first occurrence ≥ today. |
| `settings.ts` | `getSettings`, `setSettings({tz})` (validated with `Intl.supportedValuesOf`) |
| `changes.ts` | `getChanges(since)` → `{now, tasks, lists, tags, deleted: {tasks, lists, tags}}` via `updated_at > since` (cheap visible-tab polling) |
| Every write bumps `updated_at`; multi-row writes use `db.batch()`. |

## 6. REST (`worker/src/api/*.ts`, mounted in `src/index.ts` under `/api`) — thin: parse → service → JSON

- `lists.ts`: `GET/POST /lists`, `PATCH/DELETE /lists/:id`
- `tags.ts`: `GET/POST /tags`, `PATCH/DELETE /tags/:id`
- `tasks.ts`: `GET /tasks?…`, `POST /tasks`, `POST /tasks/quick`, `GET/PATCH/DELETE /tasks/:id`, `POST /tasks/:id/complete`, `POST /tasks/:id/uncomplete`
- `agenda.ts` `GET /agenda?days=` · `stats.ts` `GET /stats?days=` · `settings.ts` `GET/PATCH /settings` · `changes.ts` `GET /changes?since=`
- `lib/validate.ts` (zod parse → 400 `{error:{code,msg,issues}}`), `lib/errors.ts` (AppError → 404/400/409), `lib/id.ts`.
  Responses: camelCase, nulls omitted. (MCP compact short-key format is Phase 3, built on the same services.)

## 7. Tests (targeted, run one file at a time)

- core: recurrence (weekly BYDAY, nth/last weekday, interval, day-31 clamp, leap year, from-completion), dates (DST in America/New_York + Asia/Kolkata), quickadd (tokens, `every!`, unknown `#x` stays in title).
- worker (Miniflare D1, migrations applied in setup via `applyD1Migrations`): `lists`, `tags`, `tasks` (CRUD, filters, pagination, soft delete), `complete` (recurring advance + undo), `agenda`, `stats` (streak across gaps), `quickadd`, `api` (400 on bad body, 404, 409 inbox delete, happy path via `SELF.fetch`).

## 8. Order of work

1. Scaffold root + 3 workspaces, deps, configs; `npm run typecheck` green on empty stubs.
2. core: dates → recurrence → quickadd → schemas (+ tests each).
3. db schema → generate migrations → seed → `db:migrate` locally.
4. services + tests, one file at a time.
5. REST routes + `api.test.ts`.
6. `npm run check`; update `FEATURE_MAP.md` rows (✅/new files: `complete.ts`, `settings.ts`, `changes.ts`, `ctx.ts`, `lib/*`), DECISIONS dependency lines, CLAUDE.md commands if changed.

## Deferred (noted so nothing is lost)

Push sending + cron + VAPID → Phase 3 (needs SW from Phase 2). Completion sound + stats UI → Phase 4. Tombstone purge cron → Phase 3.
