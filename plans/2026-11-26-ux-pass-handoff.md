# UX pass handoff (#ui #anim #type #a11y), 2026-11-26

This note picks up the UX pass after a `/clear`. The critique is done and the owner has made the decisions below. Next: **launch 4 parallel subagents to make the edits** (the owner asked for subagents), then integrate and verify.

## State
- Branch `phase5-deploy`. Last commit `18247e9`. Deploy is blocked on the Cloudflare API outage; see `plans/2026-11-26-phase5-deploy.md` §4.
- Uncommitted: `scripts/demo.mjs`, a `demo` script in `package.json`, and a `FEATURE_MAP.md` row for them. **Commit before the UX edits:** `#wf add local demo with mock data`.
- Demo: `npm run demo` runs at http://localhost:5173 with password `demo`. It uses a fresh, isolated D1 at `worker/.wrangler/demo`. To log in from a script, POST `http://localhost:8787/oauth/login` with form `password=demo&next=/` (expect 303). It is stopped, so start it in the background before the agents need it.
- Critique snapshot: `.impeccable/critique/2026-11-26T16-38-55Z__apps-web.md`. Scores: heuristics 24/40, technical audit 14/20.
- Evidence screenshots and frames, possibly wiped by a reboot: `/tmp/claude-1000/-home-aaraadhya-Projects-motion/0a06e06c-875d-4ae4-8d4b-f1a04b58dae7/scratchpad/critA/{shots,frames}`. The Playwright scripts `shots.mjs` and `motion.mjs` in that folder are reusable for before/after comparisons.

## Owner decisions
1. **Completion = "ink stamp".** A routine tick gets only the clay ring bloom plus an animated ink strike. **No confetti on routine ticks.** There is one authored "Today's done" moment, built *into* the teacup empty state (steam via scaleY/opacity, the serif title inked in with a clip-path wipe of about 600–700 ms). The current floating card that overlaps "Desk's clear." goes away.
2. **Scope: all issues**, P1 through P3.
3. **Extend Atelier** into the editor sheet, Settings and Lists: a paper-card editor, serif section headings everywhere, ink-ruled fields. This is a bigger visual change, not just consistency.

## Rules every agent follows
- Read first: root `CLAUDE.md`, `apps/web/CLAUDE.md`, and `/home/aaraadhya/.claude/plugins/cache/impeccable/impeccable/4.8.0/skills/impeccable/reference/craft-floor.md` (required before any UI edit). Each agent also reads its command reference(s) from the same `reference/` folder.
- Tokens only (add tokens instead of raw values). Animate only transform/opacity. `motion` only inside `editor/*`. Respect reduced motion: durations collapse to 0 but fades stay, and check fill and strike keep a 150 ms cross-fade. No rAF loops.
- Budgets: initial JS ≤ 90 KB gz. It is currently **89.8 KB**, so check with `node scripts/gz.mjs --changed` after `vite build`. Initial CSS ≤ 15 KB; celebrate ≤ 8 KB; lazy ≤ 45 KB.
- Files ≲ 200 lines; one component per file; update the `FEATURE_MAP.md` row when adding, moving or renaming a file. A new dependency needs a line in DECISIONS (avoid adding one).
- **Ownership:** edit only your owned files and regions. `tokens.css` is shared: append new tokens only inside a block commented `/* <agent> tokens */`, and change existing tokens only where listed as yours. If you need something outside your ownership, put it in your report; don't edit it.
- Don't commit. Don't run `npm run deploy`. Run your own unit tests (`npm run test -- <file>`), and visually verify in the demo at 390×844 and 1440×900, light and dark.
- Report: files changed, before/after notes, budget bytes, and any cross-agent requests.

## Agent 1: Completion + navigation (`animate`, `delight`)
Owns `styles/row.css`, `styles/celebrate.css`, `components/{TaskRow,Checkbox,TaskList,Empty}.tsx`, `lib/flip.ts`, `celebrate/*`, `routes/{Today,Upcoming,Logbook,TaskQueryView}.tsx`, `App.tsx`, `lib/router.ts`, `lib/prefetch.ts`, and the complete-toast copy in `data/mutations.ts`.
- **Row leave:**
  - `TaskRow.tsx:54` currently unmounts on the *opacity* transitionend, which cuts off the scale. Unmount on `transform` instead.
  - Leave animation: 200 ms ease-in, opacity, `scale(.98) translateX(8px)`.
- **Card height:** the `.task-list` card height currently snaps in one frame. FLIP it (scaleY on a `::before` bg layer, origin top) or use View Transitions.
- **New rows** enter with opacity and translateY(-6px→0) over 250 ms (`flip.ts:27` skips new ids today).
- **Recurring tasks** vanish on the tap frame (`Today.tsx:25`, `Upcoming.tsx:15` filter on `dueDate`). They should linger like other rows: filter on a leaving/gone set, the way `TaskList` does.
- **Strike:** a clay `::after` line, `scaleX` 0→1 from the left, 220 ms ease-out, ~80 ms after the fill.
  - Done rows get a quieter style: `--label3` strike and text; clay stays on the check only (Logbook/Search currently read as walls of errors).
  - Search: open rows first, then a "Done" group.
- **Checkbox fill:** shorten to ~350 ms (k500/c30). Keep the ring bloom; it becomes the routine reward.
- **Celebrate:**
  - Remove confetti from routine ticks (`run.ts:58`).
  - Build "Today's done" into the teacup empty state per decision 1, and fix the role=status double announcement.
  - Reconsider the "Done. Nicely handled." toast on every complete; the Undo affordance must remain.
  - Stay ≤ 8 KB.
- **Navigation:**
  - Wrap `navigate`/`setParam` in `startTransition` (`App.tsx:59` uses `Suspense fallback={null}`, which flashes blank).
  - Route cross-fade: 120 ms out, 200 ms in with a 4px rise (View Transitions where supported).
  - Row press state: `.row-body:active` fill4 over 100 ms, plus `:hover` under `(hover:hover)`.
  - Prefetch `loaders.editor()` on row `pointerdown`.
- In list views, suppress the "• Work" meta when the row's list is the current list (`TaskRow.tsx:36-44`).

## Agent 2: Overlay motion system (`animate`, `adapt`)
Owns `editor/Sheet.tsx`, `lib/springs.ts`, `components/Toast.tsx`, the toast block in `styles/shell.css` (~lines 300–330), the help dialog CSS in `styles/views.css` (~70–103) and its component, the motion and duration tokens in `tokens.css`, and the delete-toast copy in `data/remove.ts`.
- **Overlay tokens:** `--dur-overlay-in` ~300 ms on `--ease-spring` and `--dur-overlay-out` ~200 ms ease-in. Mirror them in `springs.ts`.
- **Sheet:**
  - Open: k400/c40 (~350 ms).
  - Close: a 200 ms ease-in tween. Today the exit is slower than the entry and hangs above the tab bar.
  - Scrim uses the same duration as the sheet (it's a raw `0.2` today), with linear opacity.
  - Drag release passes `velocity` (`Sheet.tsx:77-82` drops it).
  - Desktop: replace the raw `scale:.94` with a token; ~.96 at 250 ms.
  - The raw `0.15`/`0.2` values become tokens.
  - Make the `wide` mode reactive to matchMedia (`Sheet.tsx:25` freezes it at mount).
- **Help dialog:**
  - Its backdrop should fade over 200 ms instead of appearing instantly.
  - Add a 150 ms exit (closing class before `close()`).
  - On phone, consider a bottom sheet to match the editor.
- **Toast:**
  - Entry: 250 ms ease-out, not bouncy.
  - Exit: 150 ms fade plus an 8px drop.
  - Contrast: replace the literal `light-dark(#2b2520,#efe4d2)` with `--toast-bg/-label/-action` tokens so Undo reaches ≥ 4.5:1 (today 2.45 light / 1.74 dark).
  - Add the pairs to `contrast.test.ts`.
  - Copy consistency: every message ends with a period, in the Atelier voice.
- Press feedback lands in ≤ 120 ms (`:active` 100 ms ease-out, release on snappy). Add a `--press` duration token for Agent 3 to apply.

## Agent 3: Atelier extension + consistency (`polish`, `typeset`)
Owns `styles/{base,sheet,stats}.css`, everything in `styles/views.css` except the help dialog, everything in `styles/shell.css` except the toast and quick-add blocks, the type-scale tokens in `tokens.css`, `editor/{EditorSheet,DateFields,RepeatPicker,TagInput}.tsx`, `routes/{Lists,Settings,Stats,Heatmap}.tsx`, and `components/{Sidebar,PageHeader,Icon,TabBar}.tsx`.
- **One `.inset-group`:**
  - Today there are two: `base.css:112-133` and `shell.css:378-401` (`.inset-item`). This breaks Lists and Settings: chevrons hug labels, separators double up, the switch floats mid-row, rows are indented 32px.
  - Choose one separator style. Today there are 4: `row.css:41`, `base.css:132`, `shell.css:400`, `sheet.css:127`.
  - Coordinate the row separator by noting it in your report; Agent 1 owns `row.css`.
- **One switch:**
  - Merge `.switch` (`views.css:34-64`) and `.ed-switch` (`sheet.css:213-248`).
  - Animate the off/on track with opacity, not background-color.
  - The off track needs a visible boundary (1.32:1 today).
- **One chip style:** `.chip` (`shell.css:284`, owned by Agent 4; Agent 3 defines the shared look), `.ed-chip`, `.ed-token`.
- **One "Done"/primary/secondary button rule:** the help sheet uses `btn-tint`, the editor a plain button, Log out a red row.
- **Press scale:** use `--press-scale` everywhere. Today there's a raw `.97` at `base.css:152`, a raw `.96` at `views.css:101`, and `--leave-scale` reused on the checkbox.
- `::selection` is defined twice (`base.css:107`, `:177`).
- **Type:**
  - Section headings: serif `t-title3` everywhere. Lists/Settings use sans `t-headline` today.
  - Fix the scale's family switch (`tokens.css:19-30`, where title1 is sans 700 and title2/3 are serif).
  - Fix the editor title override (raw `26px` at `sheet.css:107`).
  - Replace raw sizes: `sheet.css:186` 15px, `stats.css:22` 40px.
  - The sidebar `.side-heading` has conflicting classes (`Sidebar.tsx:35,52`).
- **Atelier extension:**
  - Editor as a paper card: serif title, ink-ruled fields.
  - Progressive disclosure: hide duration and "From completion" until relevant (the editor shows about 15 decisions today).
  - Settings and Lists get the same paper and ink treatment.
  - Earn the swash: don't stamp the identical 140px swash on all 9 titles; for example Today only, or vary it.
- **Lists tab:** drop the "Lists" heading that duplicates the page title.
- **Settings:** one switch in its own section; the note is misaligned.
- **Raw values:**
  - `stats.css:43` 3px: use the unused `--r-heat`.
  - `shell.css:88-89` swash size, `:129-131` tab dot: the dot collides with the active tab label.
  - The editor trash icon is an inline path (`EditorSheet.tsx:18`); move it to `Icon.tsx`.
  - Demo list colors don't adapt in dark mode (legacy remap at `tokens.css:217-235`).
- **Stats:** the serif "1" reads as "l" in tiles; use tnum or sans numerals. Give the heatmap a muted state when data is sparse.
- **Error states:** Atelier voice, a retry action, and not the ✕ close icon (`Empty.tsx` is Agent 1's, so request it).

## Agent 4: Accessibility + quick-add (`harden`, `clarify`)
Owns `components/QuickAdd.tsx`, the quick-add and `.chip` blocks in `styles/shell.css` (~230–295), **every** `:focus` / `:focus-visible` rule in any CSS file (`base.css:99-105`, `views.css:17-19`, `sheet.css:156`, `shell.css:262`), the `--focus-ring` and placeholder tokens, `contrast.test.ts`, and the initial-JS headroom work.
- **Focus ring:**
  - Today it's 50% tint: 2.04:1 light, 2.59:1 dark, and invisible in forced-colors.
  - Make it opaque `--tint-ink` with ≥ 3:1, and replace `outline:none` with `outline: 2px solid transparent`.
  - It must follow each element's radius; today it forces 10px onto pills and switches.
  - Add the ring pair to `contrast.test.ts`; the test's header already claims this coverage.
- **Placeholders:** `--label3` is 2.2:1. Add a `--placeholder` token at ≥ 4.5:1 for instructional hints: quick-add, tags, search.
- **Search:** restyle the native search cancel "×" (Chrome blue today).
- **Quick-add:**
  - Preview the parsed date/time as a chip via the `@motion/core/quickadd`/`dates` subpaths, which are allowed in the initial chunk (watch the budget).
  - Focus style on `.quick-add:focus-within` (today the ring is clipped inside the pill).
  - Reserve the chip row height so the composer doesn't jump.
  - Chip pop: not bouncy for UI feedback; ≤ 200 ms ease-out.
- **Headroom:** find out why `chunk-api` (8.8 KB) loads initially and move anything not needed for Today behind lazy loading or idle prefetch.

## After the agents (main thread)
1. Merge the agents' cross-agent requests and apply the small leftovers.
2. Run `npm run check`, the full `npm run test`, and `npm run test:e2e -w @motion/web`.
3. Run `impeccable detect --json apps/web/src`.
4. Retake before/after screenshots and motion frames with the critA scripts.
5. Update FEATURE_MAP, DECISIONS (new tokens, the motion system, the celebration change) and `apps/web/CLAUDE.md` if any rules changed.
6. Re-run the critique (`/impeccable critique apps/web`) to compare scores.
7. Commit only when asked, with prefix `#ui #anim`.
