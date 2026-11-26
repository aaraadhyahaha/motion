# apps/web — design + perf rules (#ui #type #anim #perf)

Plan: `plans/2026-11-26-phase2-interface.md`. Tokens: `src/styles/tokens.css`. Root rules still apply.

## Design (Apple HIG base + Atelier layer — `plans/2026-11-26-atelier.md`)

- **Tokens only.** No raw px/hex/ms/cubic-bezier in components or component CSS — use `var(--…)` from `tokens.css`. Add a token before inventing a value.
- **Font:** system stack first (`-apple-system`, SF Pro), `Inter Variable` fallback (latin subset, self-hosted, preloaded). `--font-serif` (Instrument Serif, not preloaded) only for large/section titles + wordmark. Times/durations/counts → `.mono`; other aligned numbers → `.tnum`.
- **Type:** HIG scale via `.t-large-title` … `.t-caption2` classes (or `--t-*-size/-lh/-wt/-ls` vars). Headings `text-wrap: balance`, body `pretty`.
- **Color:** semantic only — `--label*`, `--fill*`, `--bg*`, `--bg-grouped*`, `--separator*`, `--tint` (clay; small tinted text → `--tint-ink`), `--red`, `--green`, `--list-*`. All use `light-dark()`; never branch on theme in JS.
- **Targets:** every interactive element ≥ `--tap` (44px) in both axes (pad the hit area, not the glyph).
- **Materials** (`--material-bar`, `--material-sheet`, `backdrop-filter`) only on fixed chrome (bars, sheet). Solid fallback under `prefers-reduced-transparency: reduce` and `@supports not (backdrop-filter)` — already in tokens.
- **Radii/spacing:** `--r-*`, `--s-*` (4-pt grid), safe areas via `--safe-*`.
- One CSS file per component area (`styles/{base,shell,row,sheet,stats}.css`); sheet/stats CSS imported from their lazy chunk.

## Motion

- Animate **only `transform` / `opacity`**. No layout-property transitions.
- Easing/duration from tokens: `--spring-snappy|smooth|bouncy` (+ `--dur-*`). JS (`motion`) uses `src/lib/springs.ts` — keep both in sync.
- Initial route animates with CSS + WAAPI FLIP. `motion` (`LazyMotion` + `domAnimation` + `m.*`) only inside `editor/*`.
- `prefers-reduced-motion: reduce` → token durations collapse to 0, opacity fades stay at `--dur-fade`. Don't hard-code durations that bypass this.
- No idle timers / rAF loops. Poll only while visible.

## Perf / budgets (`.size-limit.js`, `npm run check`)

- Initial JS ≤ 90 KB gz · initial CSS ≤ 15 KB · lazy JS total ≤ 45 KB · `celebrate/*` ≤ 8 KB · SW ≤ 10 KB.
- Initial chunk may contain: React, react-query, router, shell, Today, data layer, core helpers (**no zod** — `import type` only; subpaths `@motion/core/{dates,quickadd,recurrence}`).
- Everything else is `React.lazy`: `routes/*` (except Today), `editor/*`, `celebrate/*`.
- Icons: `components/Icon.tsx` inline paths — no icon library.
- Select only needed fields; paginate lists; memoize rows with stable keys.

## Chunk prefixes (set in `vite.config.ts`, read by `.size-limit.js`)

| Prefix | Source |
|---|---|
| `entry-` | entry + static imports (initial) |
| `route-` | `src/routes/*` lazy chunks |
| `editor-` | `src/editor/*` |
| `celebrate-` | `src/celebrate/*` (own budget) |
| `vendor-motion-` | `motion` / `framer-motion` / `motion-dom` / `motion-utils` |
| `chunk-` | shared lazy chunks |

Put a file in the right folder and its chunk name follows; don't rename chunks by hand.
