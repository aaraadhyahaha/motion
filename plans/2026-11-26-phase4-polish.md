# Phase 4 — Celebrations & polish (#anim #ui #pwa #perf)

Status: **approved 2026-11-26** — Q1 add Search, Q2 milestones OK, Q3 idle-loaded keys OK. **Done 2026-11-26.**

**As built (deviations):** delete Undo needed `POST /tasks/:id/restore` (new service fn); Search lives in the TaskQueryView chunk and Settings in the Lists chunk (lazy budget); `modulePreload` lists CSS only (−304 B initial); lazy-only icons pass `d`; help is a native `<dialog>`, not `Sheet`; tools/list 6319 → 4858 chars (target 4.2k not reached without dropping fields); subagents not used (files small and coupled through the byte ledger).

## 0. Budget reality (drives every choice below)

| Bucket | Now | Limit | Headroom |
|---|---|---|---|
| Initial JS gz | 89.89 KB | 90 KB | ~110 B → treat as **0** |
| Lazy JS gz (routes/editor/chunks) | 41.56 KB | 45 KB | 3.44 KB for keys + help + settings + search + new empties |
| `celebrate-*` gz | 0 | 8 KB | own budget (not counted in the 45) |

Rules: measure exact gz bytes per chunk (script `scripts/gz.mjs`: gzip -9 each `dist/assets/*.js`, print bytes, diff vs a saved baseline `scripts/gz-baseline.json`) before and after every initial-chunk edit. Each initial addition is listed with its offsetting cut in §8.

## 1. Celebrations (`src/celebrate/*`, lazy, ≤8 KB)

**Trigger (initial, ~tens of bytes):** `Checkbox` on check → `celebrate(kind, x, y)` = `import('../celebrate/run').then(m => m.run(...))`. First completion fetches the chunk; `prefetch.ts` adds it to the idle prefetch list so the first burst isn't late. The existing `navigator.vibrate?.(10)` moves into the chunk (cut).

**Pure decision (`celebrate/decide.ts`, unit-tested):** `decide({ route, todayOpenBefore, completedTodayBefore, streak }) → 'burst' | 'today-done' | 'milestone'`
- `burst` — any single completion.
- `today-done` — completion on Today that takes Today's open count (overdue + today, from cache) from 1 → 0. Full-screen multi-origin burst + "Today's done" card.
- `milestone` — first completion of the day that extends the streak to 3, 7, 14, 30, 50, 100, 200, 365 (streak read from the cached `stats` query; if not cached, no milestone — never fetch just to celebrate). Burst + card "N-day streak". `today-done` and `milestone` together → one card with both lines.
- Uncomplete/undo never celebrates; bulk/remote (sync poller) completions never celebrate.

**Canvas engine (`celebrate/particles.ts`):** one `<canvas>` created on first use, `position:fixed; inset:0; pointer-events:none; aria-hidden`, DPR `min(devicePixelRatio, 2)`, resized only when a burst starts. Pool of 120 preallocated particle structs (typed arrays); bursts take free slots, excess dropped. rAF loop starts on the first spawn and stops when alive = 0 (then `clearRect` + `canvas.hidden = true`). Variants rotate per burst: confetti, sparkles, ring ripple (emoji pop dropped — font glyph rasterization is costly and inconsistent). Canvas paint only; no DOM per particle.

**Card (`celebrate/Card.tsx` or plain DOM):** CSS transform/opacity enter/exit from `--spring-*` tokens, no `motion` (avoids pulling the 32 KB vendor chunk). Dismiss on click/Esc/`animationend` of a 2.4 s hold (one CSS animation, no JS timer). Uses `--material-sheet` with the existing reduced-transparency fallback.

**Sound (`celebrate/sound.ts`):** WebAudio-synthesized chime (two sine partials + envelope, 0 asset bytes). `AudioContext` created on first play, `suspend()`ed after the note ends → no audio thread at idle. Setting `localStorage['motion.sound']`, default off; toggle in Settings (§5). Not server-synced (device preference).

**Reduced motion:** `matchMedia('(prefers-reduced-motion: reduce)')` checked per call → no canvas, no rAF; the card fades (opacity only, `--dur-fade`); checkbox keeps its checkmark (already token-collapsed). Sound still follows its own setting.

**Live region:** every completion announces "Completed ‹title›. Undo available." via the existing `.toast-region` (`aria-live=polite`); card text is announced once, not re-read.

## 2. Empty states (Atelier voice, inline SVG/CSS only)

Reuse `Empty` (teacup / Icon glyphs). Copy (final wording at review):

| View | Title | Hint |
|---|---|---|
| Today | Desk's clear. | Nothing due today. Go make something, or make tea. *(keep)* |
| Upcoming | Two quiet weeks. | Anything with a date lands here. Press N. |
| List | A blank page. | Add the first thing for ‹list›. |
| Tag | Nothing wears this tag. | Add @‹tag› in quick add. |
| Lists tab (no lists/tags) | No lists yet. | Type #name in quick add to start one. |
| Logbook | Nothing finished yet. | Ticked tasks are kept here, by day. |
| Stats (0 completions) | Tiles at zero. | Finish one task and the streak begins. |
| Search (no query / no hits) | Look for anything. / No match for "‹q›". | Titles and notes are searched. |

Lazy views' copy lives in their chunks (0 initial). Today keeps current text (0 bytes).

**Search gap:** there is no search UI in `apps/web` today. Proposal: a lazy `routes/Search.tsx` (`/search?q=`), opened by `/`, calling the existing REST search (thin over the service; add route if missing), ~1 KB lazy. **Alternative:** drop the search empty state from this phase. → *Your call (Q1).*

## 3. Keyboard shortcuts

**One listener**, registered from a lazy `keys/` chunk loaded by idle prefetch (and on first `keydown` if idle hasn't fired). QuickAdd's own `keydown` listener (⌘K/N) is **removed** from the initial chunk and folded into the map (byte cut, see §8). Trade-off: a shortcut pressed within the first idle window (~<1 s after load) is missed once.

**Map** (pure `keys/map.ts`: `resolve(event, ctx) → Action | null`, unit-tested):

| Keys | Action | Notes |
|---|---|---|
| `N`, `⌘K`/`Ctrl+K` | focus quick add | ⌘K `preventDefault` |
| `/` | search (if Q1 = yes) | |
| `G` then `T`/`U`/`L`/`B`/`S` | Today / Upcoming / Lists / Logbook / Stats | 1 s chord window; timer exists only while a chord is pending |
| `J`/`K` or `↓`/`↑` | next/prev row (roving focus on `[data-id]` rows) | |
| `X` | complete / uncomplete focused row | Space stays native on the checkbox |
| `Enter`/`E` | open editor for focused row | |
| `⌫`/`Delete` | delete focused row (undo toast, no confirm) | ignores `e.repeat` |
| `⌘Z`/`Ctrl+Z`, `U` | undo last toast action | |
| `?` | shortcuts help sheet (lazy) | |
| `Esc` | close sheet/help, else blur | |

**Guards:** skip when `e.isComposing || e.keyCode === 229` (IME); when target is `input/textarea/select/[contenteditable]` except `Esc` and `⌘K`; when `Alt` or unexpected modifiers are held; when a modal (`[aria-modal=true]`) is open, only `Esc`/`?`-close pass. No single-key binding collides with browser/AT defaults (no ⌘N/⌘T/⌘W/⌘L, no `H`/headings keys used by screen-reader browse mode because those are consumed by the AT first).

**Help sheet:** lazy `keys/Help.tsx`, rendered from the same map (single source), reuses `Sheet` only if it doesn't pull `motion`; otherwise a plain `<dialog>` with CSS transitions (preferred — keeps it ~1 KB).

## 4. Accessibility pass

Process: audit first, write findings into this file as a table (§4.1, filled during implementation: # · area · issue · WCAG · fix · bytes), then fix.

Checks:
- **Names/roles:** VoiceOver (Safari) + NVDA (Firefox) labels on checkbox ("Complete ‹title›"), row buttons, tab bar, sidebar, sheet (`aria-labelledby`), toast/undo, chips, heatmap (summary text, cells `aria-hidden`).
- **Focus order + rings:** logical DOM order; `:focus-visible` ring token (`--focus-ring`, ≥3:1 vs adjacent) on every control; no `outline:none` without replacement.
- **Focus return:** editor sheet, help, settings, celebration card return focus to the invoking element (or the next row if the task left).
- **Live region:** complete / undo / delete announced via the toast region (polite); errors assertive.
- **Targets:** e2e assertion that every visible interactive element's box is ≥44×44 (phone + desktop).
- **Contrast:** `styles/contrast.test.ts` parses `tokens.css` `light-dark()` pairs and asserts WCAG ratios for every fg/bg pair actually used: `--label*`, `--tint-ink`, `--red`, `--green`, `--list-*` on `--bg*`/`--bg-grouped*`/material solids (≥4.5 text, ≥3 large titles/UI glyphs/focus ring, white on `--tint` buttons). Stays in CI.
- **Reduced transparency:** verify bars, sheet, scrim, toast, celebration card fall back to solid.
- **axe:** `@axe-core/playwright` (dev only) on every view, fail on serious/critical.

### 4.1 Findings (audit before fixes)

| # | Area | Issue | WCAG | Fix |
|---|---|---|---|---|
| 1 | Logbook / Search done rows | title `--label3` ≈ 2.6:1 | 1.4.3 | → `--label2` |
| 2 | Quick add `⌘K` hint | `--label3` | 1.4.3 | → `--label2` |
| 3 | Task counts, inactive tab labels | `--label3` text | 1.4.3 | → `--label2` |
| 4 | `--label2` light on grouped bg / bars | 4.24 / 4.34 | 1.4.3 | α .72 → .76 (4.70 / 4.82) |
| 5 | Links, plain buttons, toast action | `--tint` text 4.10 on grouped bg | 1.4.3 | → `--tint-ink`; `--tint` glyph-only |
| 6 | `--list-yellow` light dot on grouped bg | 2.92 | 1.4.11 | #b9821a → #ad7914 (3.32) |
| 7 | Checkbox ring (light) | 2.47 | 1.4.11 | mix label3 85% → 45% with tint (≥ 3.0) |
| 8 | Editor sheet (axe) | false positives mid-enter animation | — | test waits for animations to settle |
| 9 | Focus after deleting from editor | returned to a removed row → `<body>` | 2.4.3 | Sheet falls back to first row |
| 10 | Switch focus ring | took `--r-button` shape | 2.4.7 | `--r-pill` on `.switch:focus-visible` |
| — | Targets | all ≥ 44×44 (phone + desktop) | 2.5.8 | — |
| — | Names / live regions | checkbox = title + role, toast region polite, card `role=status`, heatmap `role=img` summary | 4.1.2 / 4.1.3 | — (already OK) |
| — | Reduced transparency | card uses `--material-sheet-bg` → solid fallback; help/dialog solid | — | — |

## 5. Settings + logout

Lazy `routes/Settings.tsx` (or sheet): Sound toggle (§1), "Keyboard shortcuts" (opens help), **Log out** = plain `<form method="post" action="/oauth/logout">` (0 JS; worker route exists, CSRF via `Sec-Fetch-Site: same-origin` passes). Entry points: a row in the lazy Lists tab (phone, 0 initial bytes) and a gear in the sidebar footer (initial, est. +30–50 B, offset in §8).

## 6. Tests

- **Unit:** `keys/map.test.ts` (every binding, IME/input/modal guards, chord window), `celebrate/decide.test.ts` (burst/today-done/milestone/combined/undo/remote), particle pool cap (spawn 500 → alive ≤120; loop stops at 0), contrast test, MCP tools/list size test.
- **E2E (new `celebrate.spec`, `keys.spec`, `empty.spec`, `settings.spec`, `views.spec`, `pwa.spec`, `a11y.spec`):**
  - Celebrations: burst canvas appears; completing last Today task shows card; init-script counter on `requestAnimationFrame` stops increasing after particles die; reduced motion (`emulateMedia`) → no canvas, card fades; sound off by default, toggle persists across reload.
  - Idle CPU: after 2 s idle, 0 rAF calls and 0 `setInterval`; `setTimeout` only from the documented visible-only poller.
  - Shortcuts: navigation chords, quick add, complete/edit/delete/undo on focused row, `?` help; typing `n`/`x` inside quick add and IME composition do nothing.
  - Empty states: via `page.route` stubs returning empty pages (keeps shared seed intact).
  - Logout: own fresh login context → Settings → Log out → lands on `/oauth/login`, `/api` 401; shared storageState untouched.
  - Phase 2 gaps: Logbook (grouping, uncheck = uncomplete), Lists tab (lists/tags/Logbook links).
  - SW: separate Playwright project, `serviceWorkers: 'allow'`, against the built app served by the worker; wait for controller → offline reload renders shell; navigations to `/oauth/login`, `/authorize`, `/token`, `/.well-known/oauth-authorization-server`, `/mcp` have `fromServiceWorker() === false`.
  - axe on every view (phone + desktop, light + dark).

## 7. Housekeeping

- **npm audit (8 moderate):** try `overrides` for `esbuild` (≥0.25), `glob`, `minimatch` where the parent (drizzle-kit / workbox-build) tolerates it; run build + tests. Whatever can't be overridden → DECISIONS line: dev-only, not in any shipped bundle, esbuild advisory concerns its dev `serve` which we don't use.
- **MCP tools/list trim:** ~6.3k → target ≤4.2k chars: one-line tool descriptions, drop field descriptions that restate the name/type, shared date-format note stated once (in `get_agenda`/`create_task`), no duplicated defaults. Names + schemas unchanged; unit test pins the char budget.

## 8. Initial-chunk ledger (must net ≤ 0 B)

| Change | Est. Δ gz |
|---|---|
| `celebrate()` dynamic import trigger in Checkbox | +40–60 |
| Sidebar Settings gear | +30–50 |
| Keys chunk loader (idle + first-keydown) | +30 |
| Remove QuickAdd `keydown` listener (moves to keys chunk) | −60–90 |
| Move `navigator.vibrate` into celebrate | −15 |
| If still positive: lazy-load `Empty` teacup SVG for Today's empty state (Today renders it only after data loads) | −150–250 |

Exact bytes recorded before → after in the final budgets table.

## 9. Execution

1. gz baseline script → audit (§4.1 table) → decide/map pure modules + tests.
2. Parallel (Sonnet 5.5 subagents, disjoint files): **A** `celebrate/*` + its unit tests; **B** empty-state copy in `routes/*` + `contrast.test.ts`. I do keys, settings/logout, initial-chunk edits, a11y fixes, MCP trim, audit, e2e. I review both diffs.
3. `npm run check`, full unit + e2e once, budgets table, FEATURE_MAP rows, DECISIONS lines (`@axe-core/playwright` dev, overrides), foundation §7.4 ✅ + one-line summary, Phase 5 carry-overs, commit message (no commit).

## Questions

- **Q1:** Add a lazy Search route (`/`, ~1 KB lazy) so the search empty state has a home, or drop search from this phase?
- **Q2:** Milestones 3/7/14/30/50/100/200/365 OK?
- **Q3:** OK to make shortcuts load at idle (first <1 s keypress may be missed) to pay for the initial bytes?

## Result — budgets (gz)

| Bucket | Before | After | Limit |
|---|---|---|---|
| Initial JS (exact) | 89,888 B | 89,795 B | 90,000 B |
| Initial CSS | 5.73 KB | 5.75 KB | 15 KB |
| Lazy JS | 41.56 KB | 44.79 KB | 45 KB |
| `celebrate-*` | — | 2.16 KB (run 1.77 + sound 0.39) | 8 KB |
| Service worker | 8.75 KB | 8.75 KB | 10 KB |
| Manifest | 201 B | 201 B | 1 KB |
| MCP tools/list | 6,319 chars | 4,858 chars | 4,900 (test) |

Initial ledger: +celebrate trigger, +2 routes/loaders/sidebar items/icons, +keys/celebrate prefetch; −QuickAdd listener, −vibrate, −3 lazy-only icon paths, −unused `sidebar` icon, −modulePreload JS dep lists.

## Carry-overs → Phase 5

- Deploy + claude.ai connector smoke test (OAuth DCR/PKCE round trip, tools/list renders, a write tool confirms).
- Verify Referer-based login `next` on the real origin (dev proxy rewrites Host, so it falls back to `/`).
- Logout leaves the SW `api` runtime cache (NetworkFirst) on the device; consider clearing it on logout.
- First visit isn't SW-controlled until reload (no `clientsClaim`); fine for a PWA, decide if wanted.
- Lazy JS headroom is ~210 B; `vendor-motion` (33.5 KB) is the only big lever left.
- Manual VoiceOver (Safari) / NVDA (Firefox) pass on device — automated axe + role checks only so far.
