# Decisions (one line each — don't re-litigate without new info)

Format: `YYYY-MM-DD · #keyword · decision — why`

- 2026-11-26 · #wf · Web app / PWA, not native — dev machine is Arch Linux (no Xcode); installable everywhere.
- 2026-11-26 · #deploy · Cloudflare Workers + D1 — claude.ai connectors need public HTTPS; free, always on.
- 2026-11-26 · #auth · Single user (owner) behind OAuth 2.1 via `@cloudflare/workers-oauth-provider`.
- 2026-11-26 · #api · REST + MCP share `worker/src/services/*` — single source of business logic.
- 2026-11-26 · #ui · React 19 + Vite + TanStack Query; `motion` via LazyMotion for springs.
- 2026-11-26 · #perf · Budgets in plan §6b (≤90 KB JS gz, LCP <1.5s, zero idle CPU) enforced by size-limit.
- 2026-11-26 · #wf · Plans stored in `./plans/`, never `~/.claude`.
- 2026-11-26 · #list · Lists + tags (many-to-many); no priorities, no subtasks — keep model flat and simple.
- 2026-11-26 · #sched · Due date + optional time + optional duration; no calendar time blocks.
- 2026-11-26 · #recur · RRULE subset (FREQ D/W/M/Y, INTERVAL, BYDAY incl. nth, BYMONTHDAY; from-due or from-completion) stored as string; own parser in core, no `rrule` dep.
- 2026-11-26 · #sched · Reminders via Web Push (VAPID + Worker cron); iOS requires home-screen install.
- 2026-11-26 · #task · Quick add full syntax: dates/times, `#list`, `@tag`, recurrence phrases; parsed server-side, `chrono-node` lazy-imported.
- 2026-11-26 · #sched · No auto-scheduling; no Google Calendar; no Todoist import.
- 2026-11-26 · #perf · Live sync = refetch on focus/reconnect + visible-only backoff polling; no Durable Object WS.
- 2026-11-26 · #ui · Extras: task notes, stats & streaks, completion sound (lazy, mutable). No focus timer.
- 2026-11-26 · #type · `zod/mini` (functional API), not classic `zod` — classic is ~93 KB gz even for one schema vs ~4 KB.
- 2026-11-26 · #wf · Biome for lint+format (not eslint/prettier); Markdown excluded so tables stay compact.
- 2026-11-26 · #wf · Worker tests use `@cloudflare/vitest-plugin` (renamed from vitest-pool-workers); `env`/`exports` from `cloudflare:workers`.
- 2026-11-26 · #perf · Worker: `minify: true`, `chrono-node/en` only (all-locale build was +1 MB). Bundle 60 KB gz.
- 2026-11-26 · #db · Ids are 10-char base36; soft delete via `deleted_at` (tombstones for `/changes`); tag names unique via `lower(name)`, deleted tags revive.
- 2026-11-26 · #api · Pagination cursor is opaque (offset-backed for now) — single user, small data; can swap to keyset without API change.
- 2026-11-26 · #api · Search = `LIKE` on title/notes; FTS5 only if it gets slow.
- 2026-11-26 · #recur · Completing a recurring task rolls `due_date` forward (same row), always to a date after today; `every!` counts from completion. Undo restores from `completions.prev_*`.
- 2026-11-26 · #recur · Implicit rule parts are pinned to the first due date (`anchorRule`); month day 31 clamps to month end without drift.
- 2026-11-26 · #task · Quick add: `#list` must match an existing list, otherwise it stays in the title; `@tag` creates tags.
- 2026-11-26 · #db · Owner timezone in `settings.tz` (fallback var `DEFAULT_TZ`); every "today" is computed in it.

## Dependencies (name · gz size · why)

Measured with esbuild minify + gzip, tree-shaken to what we import.
- `zod` (via `zod/mini`) · ~4.4 KB · schemas shared by REST, MCP, UI. Runtime (core).
- `hono` · ~8.4 KB · router for the Worker. Runtime (worker).
- `drizzle-orm` · ~18.8 KB · typed D1 queries + migrations. Runtime (worker).
- `chrono-node` (`/en`) · ~13.5 KB · natural-language dates in quick add; dynamic import. Runtime (worker).
- `react` + `react-dom` 19 · ~67.7 KB · UI (settled). ⚠ That's 75% of the 90 KB JS budget — Phase 2 must keep the rest ≤ ~22 KB.
- Dev only (no runtime cost): `typescript`, `vitest`, `@cloudflare/vitest-plugin`, `wrangler`, `@cloudflare/workers-types`, `drizzle-kit`, `@biomejs/biome`, `vite`, `@vitejs/plugin-react`, `size-limit`, `@size-limit/file`, `@types/react*`.
