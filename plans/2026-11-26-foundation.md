# Motion — Foundation Plan

## Context

You want a personal app for scheduling and managing tasks, called **Motion**. It should:

- look and behave like an Apple app (following Apple's Human Interface Guidelines, HIG), with careful typography
- play a fun animation when you complete a task
- have its own MCP server, so Claude Web (claude.ai) can read and change your tasks at any time

Decisions so far: **web app / PWA**, **hosted on Cloudflare Workers with a D1 database**, **single user (you)**.

The project directory is empty and this machine runs Arch Linux, so there is no native Apple build. The project's workflow files (CLAUDE.md, FEATURE_MAP.md) are set up to keep token use low.

This plan covers the architecture and the build process. **The feature list is still to come**: section 8 holds the questions I'll ask once you approve this.

> Note: plan mode only lets me save this draft to `~/.claude/plans/`. The first build step copies it to `./plans/` and sets the `plansDirectory` setting, so every plan after this one is saved in the project.

---

## 1. Stack

| Layer | Choice | Why |
|---|---|---|
| Monorepo | npm workspaces | Node is already installed, so no extra tooling |
| Frontend | React 19 + Vite + TypeScript, `vite-plugin-pwa` | Installable on phone and desktop, works offline |
| Animation | `motion` (formerly Framer Motion): spring physics; a small custom canvas for particles | Close to Apple's spring feel |
| Server data | TanStack Query | Caching and optimistic updates (your ticks show instantly) |
| Backend | One Cloudflare Worker running Hono (REST API at `/api/*`) that also serves the static app | One deploy, one domain |
| Database | Cloudflare D1 (SQLite-compatible) + Drizzle ORM, with migrations | Typed queries, free tier |
| MCP | `@modelcontextprotocol/sdk` over Streamable HTTP at `/mcp` (via Cloudflare `agents` `McpAgent`) | What Claude.ai custom connectors use |
| Auth | `@cloudflare/workers-oauth-provider` (OAuth 2.1 with dynamic client registration) plus an owner-only login (password stored as a Worker secret; a passkey can come later) | Claude.ai signs in as you; nobody else can |
| Shared | `packages/core`: zod schemas, types, date and recurrence logic | One source of truth for the UI, REST and MCP |
| Tests | Vitest (core), `@cloudflare/vitest-pool-workers` (worker), Playwright (UI smoke tests and screenshots) |  |

**Key rule:** the REST routes and the MCP tools both call the same service layer (`worker/src/services/*`). Business logic is never duplicated.

## 2. Repo layout

```
motion/
  CLAUDE.md               # short, imperative, keyword-indexed
  FEATURE_MAP.md          # feature keyword → files (read before exploring)
  plans/                  # all plans: YYYY-MM-DD-slug.md
  docs/DECISIONS.md       # one-line decision records (stops re-litigating)
  .claude/settings.json   # plansDirectory + Read denies
  packages/core/src/      # schemas.ts, dates.ts, recurrence.ts
  worker/
    CLAUDE.md             # backend-only notes (loaded only when working here)
    wrangler.jsonc
    src/index.ts          # Hono app, OAuth provider wiring
    src/services/         # tasks.ts, lists.ts (shared by REST + MCP)
    src/api/              # REST routes
    src/mcp/              # server.ts + tools/*.ts (one tool per file)
    src/db/schema.ts + migrations/
  apps/web/
    CLAUDE.md             # UI-only notes (design tokens, animation rules)
    src/styles/tokens.css # all colors, type scale, radii, springs
    src/components/       # one component per file, at most ~200 lines
    src/features/<name>/  # feature folders
    src/celebrate/        # completion animations
```

## 3. Token-efficient workflow (CLAUDE.md design)

**Root `CLAUDE.md` (aim for under 80 lines):**

- **Session start:** read `FEATURE_MAP.md`, find the keyword, and open only the files listed for it. Don't explore the tree.
- **Keywords** (shorthand used in prompts, commits and the map): `#task #list #sched #recur #mcp #auth #db #ui #type #anim #pwa #deploy`
- **Commands** (exact, so nobody has to look them up): `npm run dev`, `npm run test -- <path>`, `npm run typecheck`, `npm run db:migrate`, `npm run deploy`
- **Rules:**
  - Search before reading. Read large files in ranges using `offset`/`limit`.
  - Run only the targeted test, never the whole suite, unless asked.
  - Keep files under ~200 lines, so every read is cheap.
  - Put each MCP tool, component and route in its own file.
  - After adding, moving or renaming a file, update its line in `FEATURE_MAP.md` in the same change.
  - Settled decisions live in `docs/DECISIONS.md`. Check there before proposing alternatives.
  - Plans go in `./plans/`, named by date and slug.
  - No subagents unless asked.
  - Keep replies terse, and give diffs rather than whole-file rewrites.
- **Nested `CLAUDE.md` files** in `worker/` and `apps/web/` hold area-specific rules. Claude only loads one when it works in that folder, so the root file stays small.

**`FEATURE_MAP.md` format:** one table per keyword, with columns feature | files | tests | notes. One line per feature, and no prose.

**`.claude/settings.json`:**

- `"plansDirectory": "./plans"`. I'll confirm the exact key against the Claude Code docs while building.
- `permissions.deny` for reading `node_modules/**`, `**/dist/**`, `package-lock.json`, `.wrangler/**` and `worker/migrations/meta/**`.

**Memory:** save a feedback note that plans always go in `./plans/` for this project.

## 4. Design system (Apple HIG on the web)

- **Font:** the system font stack `-apple-system, BlinkMacSystemFont, "SF Pro Text", …`, which gives real SF Pro on Apple devices.
  - Everywhere else it falls back to a self-hosted **Inter Variable** with optical sizing.
  - `font-feature-settings`: `ss01`/`cv11` where they look right, and `tnum` for times and counts.
- **HIG type scale as tokens:**

  | Style       | Size / line height |
  | ----------- | ------------------ |
  | Large Title | 34/41              |
  | Title 1     | 28/34              |
  | Title 2     | 22/28              |
  | Title 3     | 20/25              |
  | Headline    | 17/22, semibold    |
  | Body        | 17/22              |
  | Callout     | 16/21              |
  | Subhead     | 15/20              |
  | Footnote    | 13/18              |
  | Caption 1   | 12/16              |
  | Caption 2   | 11/13              |

  Each style gets its own letter-spacing (HIG tracking), plus `text-wrap: balance` on headings and `pretty` on body text.
- **Colors:** Apple's semantic colors (label, secondaryLabel, systemBackground, grouped backgrounds, separator, systemBlue tint and the rest) in light and dark, following the OS setting.
- **Materials:** frosted glass via `backdrop-filter` on the sidebar, toolbars and sheets, which degrades gracefully on browsers without it.
- **Layout:**
  - iPad/Mac-style sidebar plus content on wide screens.
  - Tab bar and large-title navigation on phones.
  - Bottom sheets for the task editor.
  - Inset grouped lists.
  - Touch targets of at least 44pt; safe-area insets respected.
- **Motion tokens:** springs (`stiffness`/`damping`) named `snappy`, `smooth` and `bouncy`. Everything honors `prefers-reduced-motion`.

## 5. Completion animations (for fun)

- **Checkbox:** the circle fills with a spring, the checkmark draws itself (SVG stroke), the row's strikethrough sweeps left to right, and the row then collapses away with a spring.
- **Particle burst:** confetti bursts from the checkbox on a pooled canvas (no DOM churn). Several variants rotate: confetti, sparkles, emoji pop, ring ripple.
- **Big moment:** clearing every task for the day plays a full-screen celebration and a "Today's done" card.
- **Haptics:** `navigator.vibrate` where the device supports it.
- **Optional:** a subtle sound that you can turn off.
- **Reduced motion:** only a gentle fade and the checkmark.

## 6. MCP server (for Claude Web)

- **Endpoint:** `https://<app>.workers.dev/mcp` (Streamable HTTP), protected by OAuth.
- **Connecting:** you add it in claude.ai under Settings → Connectors, log in once, and Claude can then use it in any chat.
- **Starting tools** (final list depends on the features you choose): `list_tasks` (filters), `get_agenda` (date range), `search_tasks`, `create_task`, `update_task`, `complete_task`, `reschedule_task`, `delete_task`, `list_lists`, `create_list`.
- **Tool design:**
  - Tight descriptions and zod input schemas.
  - Compact JSON output, because it costs Claude tokens too.
  - Natural-language dates are parsed on the server (using `chrono-node`).
- **Keeping the app in sync:** changes Claude makes show up when the app regains focus or on a periodic refresh. Live push is an optional feature (question 8.9).

## 6b. Performance and resource budget (applies to every phase)

**Budgets** (checked in Phase 4 and on every UI change):

| Metric | Budget |
|---|---|
| Initial JS (gzipped) | under 90 KB |
| Initial CSS (gzipped) | under 15 KB |
| Largest Contentful Paint (LCP, mid-range phone) | under 1.5 s |
| Interaction to Next Paint (INP) | under 100 ms |
| Cumulative Layout Shift (CLS) | 0 |
| Idle CPU | about 0% (no timers or animation loops running while idle) |

`size-limit` runs in `npm run check`, so the build fails when it goes over.

**Frontend**

- Split code by route. Lazy-load the editor sheet, the calendar views and `src/celebrate/*`; these load on first use and are prefetched when the browser is idle.
- `motion` via `LazyMotion` + `domAnimation` with `m.*` components (about 5 KB instead of about 34 KB). Animate only `transform` and `opacity`. Set `will-change` only while an animation runs.
- Particles: one shared canvas with pooled objects. The `requestAnimationFrame` loop runs only while particles are alive. Device pixel ratio is capped at 2, with at most about 120 particles.
- Lists: memoized rows with stable keys. Virtualize with `@tanstack/react-virtual` above about 150 rows. Optimistic updates, so ticking a task never waits on the network.
- State: TanStack Query for server data plus a tiny `useSyncExternalStore` store for UI state. No Redux, no context-wide re-renders.
- Data fetching: refetch on focus and reconnect. Polling runs only while the tab is visible (Page Visibility API), and the interval backs off.
- Frosted glass (`backdrop-filter`) only on fixed toolbars and sheets, never on scrolling rows. Fall back to solid colors under `prefers-reduced-transparency`.
- Fonts: the system font first. Inter is one latin-subset variable `woff2` file, preloaded, with `font-display: swap`.
- Small dependencies only:
  - dates: `date-fns`, imported per function, with native `Intl` for formatting
  - no lodash or moment
  - every new dependency must justify its size in `docs/DECISIONS.md`
- Service worker: precache only the app shell. API calls use network-first with a cached fallback. Hashed assets are cached as `immutable`.

**Worker and database**

- D1 indexes match the queries, for example `(done, due_at)` and `(list_id, position)`.
- Select only the columns needed. Use `db.batch()` for multi-row writes. Paginate every list, with a default page size of 50.
- No heavy work in each request. Validate with zod once at the edge. Keep the Worker bundle small: dynamic import of `chrono-node` only in the NL-date path.
- MCP responses are compact JSON (short keys, no nulls) with `limit`/`cursor` parameters. This saves Claude's tokens as well as Worker CPU.

## 7. Build phases

0. **Workflow setup ✅ done (2026-11-26):** `git init`; this plan copied into `plans/`; `CLAUDE.md`, `FEATURE_MAP.md`, `docs/DECISIONS.md`, `.claude/settings.json` and the memory note written.
1. **Features, scaffold, core and data ✅ done (2026-11-26):** detail in `plans/2026-11-26-step1-core-data.md`.
   - Ask the questions in section 8, then record the answers in `docs/DECISIONS.md` and `FEATURE_MAP.md`.
   - Scaffold the npm workspaces, then build the schemas in `packages/core`, the D1 schema and migrations, the services and the REST routes.
   - Add unit and worker tests.
2. **Interface ✅ done (2026-11-26):** detail in `plans/2026-11-26-phase2-interface.md`. HIG tokens, shell, Today + lazy views, motion sheet editor, PWA; check + 76 unit + 18 e2e green. Budgets (gz): initial JS 89.69/90 KB · CSS 4.3/15 KB · lazy 41.56/45 KB · SW 8.73/10 KB · manifest 201 B/1 KB.
   - Tokens, typography and the app shell (sidebar and tab bar), then the task list, editor sheet and the views you choose. Dark mode, PWA manifest and offline cache.
3. **MCP and auth ✅ done (2026-11-26):** detail in `plans/2026-11-26-phase3-mcp-auth.md`. OAuth 2.1 (workers-oauth-provider, PKCE/DCR) + password login + cookie session on `/api`; hand-rolled stateless MCP with 13 tools over services; SSR login/consent; 92 unit + 21 e2e green; initial JS 89.89/90 KB.
4. **Celebrations and polish:** completion animations, empty states, keyboard shortcuts, accessibility pass (VoiceOver labels, focus rings, contrast).
5. **Deploy:** `wrangler d1 create`, set secrets, `wrangler deploy`, then connect to claude.ai.

## 8. Feature questions (I'll ask these after you approve)

1. **Organizing:** lists/projects, tags, priorities, subtasks?
2. **Time:** due dates only, or scheduled time blocks on a day/week calendar timeline?
3. **Recurring tasks:** what rules ("every weekday", "monthly on the 1st")?
4. **Reminders:** push notifications through the PWA (on iOS this needs the app installed to the home screen)?
5. **Quick add:** natural-language entry ("gym tomorrow 7am #health !1")?
6. **Auto-scheduling:** fit tasks into free time automatically?
7. **Calendar:** Google Calendar sync or overlay?
8. **Import:** bring in your existing Todoist tasks? Your Todoist connector is available.
9. **Live updates:** should Claude's MCP changes appear instantly in an open app (needs a Durable Object WebSocket)?
10. **Extras:** focus timer, notes or attachments, stats and streaks, sound on completion?

## 9. Verification

- `npm run typecheck` and Vitest for `packages/core`. Worker tests run against local D1 (Miniflare).
- `wrangler dev`, then `npx @modelcontextprotocol/inspector` pointed at `http://localhost:8787/mcp`. Call every tool and check that the OAuth flow completes.
- Playwright smoke tests: create, complete (the animation runs), reschedule. Screenshots in light and dark mode on phone and desktop for a visual check against HIG.
- Lighthouse PWA check that the app installs.
- After deploy: add the connector in claude.ai and ask Claude to "add 'buy milk' tomorrow 6pm", then confirm the task shows up in the app.
