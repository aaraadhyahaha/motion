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
- 2026-11-26 · #ui · Phase 2 views: Today (+overdue), Upcoming (14 d), per-list, per-tag, Logbook, Stats — all except Today lazy-loaded.
- 2026-11-26 · #ui · Nav: frosted sidebar (views + lists + tags) on wide screens; bottom tab bar (Today · Upcoming · Lists · Stats) + large titles on phones.
- 2026-11-26 · #ui · Quick add: pinned bottom bar (above tab bar on phone), focused by ⌘K / N; live chips for #list/@tag/repeat.
- 2026-11-26 · #ui · Task editor is a lazy-loaded sheet (bottom sheet on phone, centered sheet on desktop).
- ~~2026-11-26 · #ui · Accent = systemOrange (#FF9500 light / #FF9F0A dark).~~ Superseded below.
- 2026-11-26 · #ui · Stats: streak/today/week tiles + CSS-grid completion heatmap + per-list bars; no chart library.
- 2026-11-26 · #sched · `Stats.perList`: `Record<listId, count>` over the same `days` window, zero lists omitted; counts by the task's current list (not list at completion time).
- 2026-11-26 · #task · `QuickAdd.dueDate` is a fallback only; a date in the text always wins.
- 2026-11-26 · #type · `@motion/core` subpath exports (`/dates`, `/recurrence`, `/quickadd`, `/schemas`) so the web app imports helpers without zod.
- 2026-11-26 · #ui · Visual layer "Atelier" on top of the HIG base: warm paper surfaces + static grain, clay accent (`--tint` #BD5430/#E8845F; small text uses `--tint-ink`), Instrument Serif for large/section titles, list "inks", card shadows over hairlines. Mono numerals for times/counts (from "Almanac"); time-of-day header tint deferred. Spec: `plans/2026-11-26-atelier.md`.

## Dependencies (name · gz size · why)

Measured with esbuild minify + gzip, tree-shaken to what we import.
- `zod` (via `zod/mini`) · ~4.4 KB · schemas shared by REST, MCP, UI. Runtime (core).
- `hono` · ~8.4 KB · router for the Worker. Runtime (worker).
- `drizzle-orm` · ~18.8 KB · typed D1 queries + migrations. Runtime (worker).
- `chrono-node` (`/en`) · ~13.5 KB · natural-language dates in quick add; dynamic import. Runtime (worker).
- `react` + `react-dom` 19 · ~67.7 KB · UI (settled). ⚠ That's 75% of the 90 KB JS budget — Phase 2 must keep the rest ≤ ~22 KB.
- `@tanstack/react-query` 5.108.4 · ~10.6 KB · server cache, optimistic/offline-paused mutations, focus/reconnect refetch (QueryClient, Provider, useQuery, useMutation, useInfiniteQuery, useQueryClient, online/focusManager). Runtime, initial — under the 13 KB stop line.
- `motion` 14.14.0 · ~39.5 KB (m.div + LazyMotion + domAnimation + AnimatePresence + useMotionValue + animate; `domAnimation` alone 28.3 KB, core w/o features 9.2 KB; Vite chunk `vendor-motion` 32.2 KB) · sheet springs, presence, drag-dismiss. Runtime, **lazy only** (editor). ⚠ Plan's "~5 KB" was wrong for v14; eats most of the 45 KB lazy budget.
- `vite-plugin-pwa` 2.0.0 · 0 KB app JS (inline registration) · manifest + generated SW (workbox, build time; SW budget 10 KB gz in `.size-limit.js`). Dev. npm audit: 8 moderate in its build-time workbox deps.
- `@playwright/test` 1.65.1 · 0 KB · smoke test + screenshots on system Chrome (`channel: 'chrome'`, no browser download). Dev.
- `@fontsource-variable/inter` 5.3.0 · 0 KB JS; one asset `inter-latin-wght-normal.woff2` 47.1 KB (already compressed) · Inter fallback font, latin subset. Dev.
- `@fontsource/instrument-serif` 5.2.5 · 0 KB JS; one asset `instrument-serif-latin-400-normal.woff2` 21.0 KB, not preloaded (`swap`, Georgia fallback) · Atelier display serif for large/section titles. Dev.
- Dev only (no runtime cost): `typescript`, `vitest`, `@cloudflare/vitest-plugin`, `wrangler`, `@cloudflare/workers-types`, `drizzle-kit`, `@biomejs/biome`, `vite`, `@vitejs/plugin-react`, `size-limit`, `@size-limit/file`, `@types/react*`. Phase 2 dev deps listed above.
- 2026-11-26 · #auth · Dep `@cloudflare/workers-oauth-provider` 1.4 — worker bundle 60→107 KB gz (~45 KB is the provider; worker-only, 0 web bytes). Gives PKCE, DCR, RFC 8414/9728 metadata, hashed tokens in KV, refresh rotation.
- 2026-11-26 · #auth · Owner login = password (PBKDF2-SHA256 100k via WebCrypto, `OWNER_PW_HASH` secret; 5 fails/15 min/IP). Passkey deferred — needs a lib + bootstrap flow, ties to rpID.
- 2026-11-26 · #auth · Tokens: access 1 h, refresh 30 d rotated; PKCE S256 enforced in `/authorize`; redirect origins allow-listed (`OAUTH_REDIRECT_ALLOW`: claude.ai, claude.com, Inspector localhost:6274).
- 2026-11-26 · #auth · PWA session = KV `sess:*` + httpOnly `SameSite=Lax` cookie (`__Host-sid` on https). Lax so the claude.ai popup's top-level return carries it. CSRF: `Sec-Fetch-Site` (works behind the Vite proxy), Origin fallback.
- 2026-11-26 · #deploy · PWA served by the worker (static assets, SPA fallback, `run_worker_first` for worker paths) — one origin so the cookie needs zero web JS.
- 2026-11-26 · #mcp · Hand-rolled stateless MCP (JSON-RPC over POST → JSON, no SSE/sessions, 0 deps) instead of `@modelcontextprotocol/sdk` (pulls classic zod) / `agents` (Durable Object). Swap is local to `mcp/server.ts`.
- 2026-11-26 · #mcp · Invalid tool arguments → tool result `isError` (model can self-correct), not JSON-RPC -32602; unknown tool → -32602.
- 2026-11-26 · #mcp · `quick_add` is its own tool (NL text) next to structured `create_task` — one schema each beats a union.
- 2026-11-26 · #perf · Web 401 hook (+52 B gz) offset by moving Icon stroke attrs to CSS + Referer-based login `next`: initial JS 89.91 → 89.89 KB.
