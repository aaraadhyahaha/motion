# Phase 2 — Interface (#ui #type #anim #pwa)

Foundation: `plans/2026-11-26-foundation.md` §4, §6b, §7.2. UI answers: `docs/DECISIONS.md` (2026-11-26 #ui rows).

## 0. Budget strategy (the hard constraint)

Initial JS ≤ 90 KB gz; React 19 = 67.7 KB → **~22 KB for everything else on the first route.**

| Initial-route item | Est. gz |
|---|---|
| `@tanstack/react-query` (QueryClient, useQuery, useMutation, useInfiniteQuery) | ~12 KB |
| App: router, shell, row, list, quick add, Today, data layer, sync | ~7 KB |
| `@motion/core` bits (types, `tokenize`, date helpers) — **no zod** | ~1.5 KB |
| Headroom | ~1.5 KB |

Consequences:
- **`motion` is not in the initial route.** Rows animate with CSS (`transform`/`opacity`) using spring curves encoded as CSS `linear()` tokens, plus a hand-rolled FLIP via WAAPI (compositor, no rAF loop). `motion` (`LazyMotion` + `domAnimation` + `m.*`) loads only inside the lazy editor sheet (enter/exit springs, drag-to-dismiss with pointer events → `useMotionValue`).
- **No router dependency:** ~40-line History-API router on `useSyncExternalStore`.
- **No zod in the browser:** web imports core through new subpath exports (`@motion/core/quickadd`, `/dates`, `/recurrence`) and `import type` for schemas. Server validates.
- **Routes:** Today is in the entry chunk; every other route + editor are `React.lazy`, prefetched once via a single `requestIdleCallback` after first paint (one-shot, not a timer loop).
- **Accurate size check:** `.size-limit.json` → `.size-limit.js` that reads `dist/.vite/manifest.json` and measures only the entry + its static imports (initial), plus a second budget for lazy chunks (≤ 45 KB total). Today's glob would count lazy chunks as initial.
- Measure `react-query` right after install; if it's > 13 KB, record it and stop to discuss (fallback: tiny custom query cache).

## 1. New dependencies (each gets a DECISIONS line with measured gz)

| Dep | Kind | Why |
|---|---|---|
| `@tanstack/react-query` | runtime, initial | settled in DECISIONS; caching, optimistic mutations, focus/reconnect refetch, offline-paused mutations |
| `motion` | runtime, **lazy (sheet only)** | springs + presence for the sheet |
| `vite-plugin-pwa` (+ workbox, build-time) | dev | manifest + generated SW; inline registration → 0 KB in app JS |
| `@playwright/test` | dev | smoke test + screenshots; uses system `google-chrome-stable` (`channel: 'chrome'`) → no browser download |
| `@fontsource-variable/inter` | dev | source of the latin-subset variable woff2 (emitted as hashed asset) |

Icons: hand-drawn SVG → PNGs via system `rsvg-convert` (one-off script, PNGs committed). No icon library: ~12 inline SVG paths in `Icon.tsx`.

## 2. Small backend changes (services first, routes stay thin)

1. **Stats per list** — `getStats` adds `perList: Record<listId, number>` for the window (join `completions` → `tasks`). Update `Stats` type + `worker/test/stats.test.ts`.
2. **Quick add default date** — `QuickAdd` gets optional `dueDate` (DayKey) used only when the parser finds no date, so adding from Today lands in Today. Update `worker/test/quickadd.test.ts`.
3. **Core subpath exports** — `packages/core/package.json` `exports` for `./dates`, `./recurrence`, `./quickadd`, `./schemas` (types).

## 3. Design system files

- **`apps/web/CLAUDE.md`** — design + animation rules: token-only values (no raw px/hex in components), HIG type styles via classes, 44pt targets, semantic colors, materials only on fixed chrome, transform/opacity only, durations/springs from tokens, reduced-motion + reduced-transparency behavior, CSS file per component area, budget rules (what may enter the initial chunk).
- **`src/styles/tokens.css`** (~150 lines)
  - Font stack: `-apple-system, BlinkMacSystemFont, "SF Pro Text", "Inter Variable", system-ui, sans-serif`; `@font-face` Inter latin woff2, `font-display: optional` (CLS 0; Apple devices never fetch it). `tnum` utility.
  - HIG type scale (`--t-large-title` … `--t-caption2`: size/line-height/weight/tracking) + `.t-*` classes; `text-wrap: balance` on headings, `pretty` on body.
  - Semantic colors with `light-dark()`: label (4 levels), fills, system/secondary/tertiary backgrounds, grouped backgrounds, separator (+opaque), tint = systemOrange `#FF9500` / `#FF9F0A`, red, green, plus the 6 list colors.
  - Materials: `--material-bar`, `--material-sheet` (bg + blur), solid fallback under `prefers-reduced-transparency: reduce` and `@supports not (backdrop-filter)`.
  - Radii (row-inset group 10, sheet 14, button 8, pill), spacing scale (4-pt), `--tap: 44px`, safe-area vars.
  - Springs: `--spring-snappy|smooth|bouncy` as `linear(...)` easing + duration; JS mirror `src/lib/springs.ts` (stiffness/damping for `motion`). Under `prefers-reduced-motion: reduce` durations → 0 except opacity fades (150 ms).
- **`src/styles/base.css`** — reset, body, focus ring, `.inset-group` list styling, buttons.

## 4. App structure (one component per file, ≲200 lines)

```
apps/web/src/
  main.tsx                 QueryClientProvider, startSync(), ensureTz(), idle prefetch
  App.tsx                  route switch + Suspense, editor mount (?t=<id>)
  lib/router.ts            useRoute(), navigate(), <Link>, search params
  lib/springs.ts           spring tokens for motion
  lib/prefetch.ts          one-shot idle import() of lazy chunks
  data/api.ts              fetch wrapper (json, errors → ApiError)
  data/client.ts           QueryClient (staleTime 30 s, refetchOnWindowFocus, retry 1)
  data/keys.ts             query keys
  data/queries.ts          useAgenda(14), useTasks(query, infinite), useLists, useTags, useStats, useSettings
  data/cache.ts            pure helpers: patchTask / removeTask across agenda + task-page caches
  data/mutations.ts        useComplete, useUncomplete, useUpdateTask, useDeleteTask, useQuickAdd (optimistic + rollback)
  data/sync.ts             /api/changes poller (see §5)
  data/tz.ts               first-run tz → PATCH /api/settings
  ui/store.ts              tiny useSyncExternalStore store: toast (undo)
  components/Shell.tsx     layout: sidebar | content | tab bar, quick-add slot
  components/Sidebar.tsx   views, lists (color dots, counts later), tags
  components/TabBar.tsx    Today · Upcoming · Lists · Stats
  components/PageHeader.tsx large title → inline title on scroll (IntersectionObserver sentinel)
  components/TaskList.tsx  memoized rows, stable keys, FLIP on removal (WAAPI)
  components/TaskRow.tsx   checkbox, title, meta line (time, duration, repeat icon, list dot, tags)
  components/Checkbox.tsx  CSS spring fill + stroke-draw check + haptic
  components/QuickAdd.tsx  input + live chips (core tokenize), ⌘K / N focus, POST /api/tasks/quick
  components/Toast.tsx     "Completed · Undo"
  components/Icon.tsx      inline SVG set
  components/Empty.tsx     empty states
  routes/Today.tsx         overdue + today (from agenda) — entry chunk
  routes/Upcoming.tsx      14 days grouped by day          (lazy)
  routes/TaskQueryView.tsx per-list (/list/:id) and per-tag (/tag/:name), paginated (lazy)
  routes/Lists.tsx         phone Lists tab: lists, tags, Logbook link (lazy)
  routes/Logbook.tsx       done tasks grouped by completion day; uncheck = uncomplete (lazy)
  routes/Stats.tsx         tiles + Heatmap + per-list bars (lazy)
  routes/Heatmap.tsx       26-week CSS grid, 5 tint levels via color-mix
  editor/EditorSheet.tsx   loads task, fields, save-on-close diff → PATCH, delete (lazy, owns LazyMotion)
  editor/Sheet.tsx         m.div sheet: bottom on phone / centered ≥ 768 px, drag-dismiss, Esc, focus trap
  editor/DateFields.tsx    date + time + duration, quick chips Today/Tomorrow/Next week/None
  editor/RepeatPicker.tsx  presets + custom (freq, interval, weekdays, month day), label via core describe(), "from completion" toggle
  editor/TagInput.tsx      token input with existing-tag suggestions
  styles/{tokens,base,shell,row,sheet,stats}.css   (sheet/stats CSS load with their lazy chunk)
```

Routes: `/` Today · `/upcoming` · `/list/:id` · `/tag/:name` · `/lists` · `/logbook` · `/stats`. Editor opens via `?t=<id>` so Back closes it.

## 5. Data layer behavior

- **Optimistic complete:** mark `done` in every cache holding the task (cache.ts) → row shows check + strike → after ~600 ms the row leaves (fade/scale) and siblings FLIP up. Toast with Undo (one 5 s timeout while visible). Server response replaces the row (recurring tasks come back rolled forward and reappear on their new day). Error → rollback + toast.
- **Undo:** `POST /:id/uncomplete`, optimistic restore.
- **Edit / reschedule:** `PATCH /:id` optimistic patch, then invalidate `agenda` (date membership changes).
- **Offline:** react-query pauses mutations while offline and replays on reconnect; reads come from the SW cache.
- **Sync (`data/sync.ts`):** bootstrap `since` from the server clock (`/changes?since=MAX` returns empty + `next`). Poll only while `document.visibilityState === 'visible'`: 15 s → ×2 per empty poll → cap 5 min; reset to 15 s on change or user action. Immediate poll on `visibilitychange`→visible, `focus`, `online`. Timer cleared when hidden — zero idle work in background tabs. On changes: upsert lists/tags caches; for tasks, ignore echoes of our own mutations (id+updatedAt map), otherwise invalidate agenda/task queries; `full` → invalidate all.
- **TZ:** on first run (no `localStorage.tzSet`) PATCH settings with `Intl.DateTimeFormat().resolvedOptions().timeZone` if it differs.

## 6. PWA

- `vite-plugin-pwa` `generateSW`, `registerType: 'autoUpdate'`, `injectRegister: 'inline'`.
- Manifest: name Motion, `display: standalone`, theme/background colors light+dark (`<meta name="theme-color" media=...>` in index.html), icons 192/512/maskable + apple-touch-icon, `apple-mobile-web-app-*` metas.
- Precache app shell only: `index.html`, entry chunks, CSS, icons. Lazy chunks (`assets/lazy/*` via `chunkFileNames`) and Inter → runtime CacheFirst (hashed, immutable). `/api/*` GET → NetworkFirst (3 s timeout, cached fallback). Navigation fallback `index.html`, denylist `/api`, `/mcp`.

## 7. Tests

- **Unit (vitest, new `apps/web` project):** `data/cache.test.ts` (optimistic patch/remove across caches), `data/sync.test.ts` (backoff + visibility gating with fake timers), `lib/router.test.ts` (path matching).
- **Worker:** updated stats + quickadd tests.
- **Playwright (`apps/web/e2e/`, `npm run test:e2e -w @motion/web`):** webServer = `wrangler dev` with isolated `--persist-to .wrangler/e2e` (migrations applied first) + `vite`. `smoke.spec.ts`: quick-add "Buy milk today @errands" → appears in Today; complete → leaves list, Undo brings it back, complete again; open editor → date Tomorrow → leaves Today, shows in Upcoming. `shots.spec.ts`: Today/Upcoming/Stats/editor in phone (393×852) + desktop (1280×800) × light/dark → `apps/web/e2e/shots/` (gitignored). I'll review the screenshots and iterate on design before calling it done.
- `npm run check` green (typecheck + lint + build + size-limit).

## 8. Order of work

1. Core subpath exports; backend tweaks (stats perList, quick-add dueDate) + tests.
2. Install deps, measure gz, DECISIONS lines; size-limit manifest config; vite chunk naming.
3. `apps/web/CLAUDE.md`, tokens.css, base.css, Icon, fonts.
4. Router, data layer (api, client, queries, cache, mutations, sync, tz) + unit tests.
5. Shell, Sidebar, TabBar, PageHeader, TaskList/Row/Checkbox, QuickAdd, Toast, Today.
6. Lazy routes: Upcoming, TaskQueryView, Lists, Logbook, Stats/Heatmap.
7. Editor sheet (motion) + pickers.
8. PWA (icons, manifest, SW).
9. Playwright smoke + screenshots → design pass.
10. `npm run check`, FEATURE_MAP rows, mark §7.2 in foundation plan. No commit until asked.

## 9. Out of scope (later phases)

Particle bursts / big-moment celebration / sound (Phase 4), swipe actions, keyboard shortcuts beyond ⌘K/N/Esc, drag reorder, list/tag management UI beyond create (rename/color/delete via editor-like sheet is Phase 4), push reminders UI, auth (Phase 3 — until then the app talks to an unauthenticated local worker).

## 10. Risks

- **Budget:** if initial JS lands > 88 KB, first move app code out of the entry (QuickAdd chips, Toast lazy), then discuss a custom query cache instead of react-query.
- **`light-dark()` / `linear()`** need Safari 17.5 / Chrome 123+; fine for a personal PWA. Fallbacks: plain light colors / `ease-out`.
- **Playwright on Arch:** uses system Chrome; if it misbehaves, fall back to `npx playwright install chromium`.
