# Motion — personal task + scheduling PWA with MCP for Claude Web

Stack: React 19 + Vite PWA (`apps/web`) · Cloudflare Worker + Hono + D1/Drizzle (`worker`) · shared zod/types (`packages/core`) · MCP at `/mcp` (OAuth, single user).
Full plan: `plans/2026-11-26-foundation.md`. Decisions: `docs/DECISIONS.md`.

## Start every task like this

1. Read `FEATURE_MAP.md` → find the keyword → open ONLY listed files. Don't explore the tree.
2. Need more? `grep`/Grep first, then Read with `offset`/`limit`. Never read lockfiles, `dist`, `node_modules`, `.wrangler`.
3. Check `docs/DECISIONS.md` before proposing alternatives to settled choices.

## Keywords (use in prompts, commits, FEATURE_MAP)

`#task` `#list` `#sched` `#recur` `#mcp` `#auth` `#db` `#api` `#ui` `#type` `#anim` `#pwa` `#perf` `#deploy` `#wf` (workflow)

## Commands (exact — don't search for them)

- `npm run dev` — web + worker locally (worker on :8787)
- `npm run test -- <path>` — run ONE test file; full suite only when asked
- `npm run typecheck` · `npm run check` (typecheck + lint + size-limit)
- `npm run db:generate` · `npm run db:migrate` (local D1)
- `npm run deploy` — ask before running
- `npm run lint` (Biome). Root `deploy` is blocked until Phase 5 (deploy).
(All commands live as of Step 1. Backend rules: `worker/CLAUDE.md`.)

## Rules

- Business logic lives in `worker/src/services/*`; REST routes and MCP tools are thin wrappers. Never duplicate.
- One component / route / MCP tool per file; keep files ≲200 lines.
- Added/moved/renamed a file → update its `FEATURE_MAP.md` row in the same change.
- New dependency → one line in `docs/DECISIONS.md` with gzipped size + why.
- Plans go in `./plans/YYYY-MM-DD-slug.md`, never `~/.claude`.
- Edit with diffs; don't rewrite whole files. Terse replies. No subagents unless asked.
- Commit only when asked; message prefix = keyword, e.g. `#mcp add reschedule_task`.

## Performance (budgets in plan §6b)

- Animate only `transform`/`opacity`; `motion` via `LazyMotion` + `m.*`.
- No idle timers/rAF loops; poll only when tab visible.
- Lazy-load heavy views & `celebrate/*`. Select only needed columns; paginate; index every filter.
- `backdrop-filter` only on fixed chrome.

## Design (details in `apps/web/CLAUDE.md` once created)

Apple HIG: system font → Inter fallback, HIG type scale tokens, semantic colors (light/dark), 44pt targets, springs from `tokens.css`, respect `prefers-reduced-motion`.
