# Phase 5 — Deploy (#deploy #auth #mcp #pwa)

Goal: Motion live on `https://motion.<subdomain>.workers.dev`, connected to claude.ai, with no budget regressions and a runbook to deploy again, migrate, rotate the password, and roll back.

**As built:** CSP via `securityHeaders()` vite plugin → `dist/_headers` (1 inline script hash); `apps/web/public/.assetsignore` hides `.vite/`; login rate limit fail-closed without `cf-connecting-ip` on https + global 30 fails/15 min (`rl:*`) in `worker/src/auth/routes.ts`; headers wrapper `worker/src/lib/headers.ts`; prod PWA spec `apps/web/e2e/prod/` (`PWA_URL=… npm run test:prod -w @motion/web`); worker tests `worker/test/prod.test.ts`; test binding `OAUTH_REDIRECT_ALLOW` in `worker/vitest.config.ts`. Trade-off: the global ceiling lets an attacker lock owner login for 15 min (existing sessions/tokens unaffected).

## 0. Starting state (as built)

- `wrangler.jsonc`: D1 `DB` + KV `OAUTH_KV` ids are `local-dev-placeholder`; vars `DEFAULT_TZ=UTC`, `OAUTH_REDIRECT_ALLOW` includes `http://localhost:6274` (Inspector); no `compatibility_flags`; assets = `apps/web/dist` with `run_worker_first` for worker paths.
- Root `deploy` is blocked (`exit 1`); `worker` `deploy` = bare `wrangler deploy` (no build or check).
- Cookie: `__Host-sid` already chosen when `protocol === 'https:'` (`auth/session.ts:13`). Login rate limit key `rl:${cf-connecting-ip ?? 'local'}` (`auth/routes.ts:66`). SSR pages already send strict CSP (`auth/routes.ts:15`).
- One KV namespace carries both OAuth (provider keys) and sessions (`sess:*`), separated by key prefix. **Keep it that way:** a second namespace adds a binding and config for no isolation gain with one user.
- Worker bundle ≈ 107 KB gz (DECISIONS). I'll re-measure the exact number as the "before" figure.

## 1. Config changes (local, no account access)

1. `compatibility_flags: ["global_fetch_strictly_public"]`. **Enable it.** CIMD (client_id = URL) makes the provider `fetch()` attacker-chosen URLs. The flag limits outbound fetch to the public internet, so it cannot reach CF-internal or zone origins (SSRF). The worker makes no other outbound fetches, so the flag costs nothing.
2. `"preview_urls": false`. Version preview URLs would serve the same KV and D1 under a different origin, so a second OAuth issuer would quietly exist. `workers_dev` stays `true`; that is the prod URL.
3. `OAUTH_REDIRECT_ALLOW` in prod is `https://claude.ai,https://claude.com` only. The Inspector origin moves to `worker/.dev.vars(.example)`, which overrides `vars` locally. Tests: if any read `localhost:6274` from config, they get it via the vitest plugin's `miniflare.bindings`, not from the prod vars.
4. Fill in the real `database_id` and KV `id` after step A2/A3 (§4). The ids are not secret; I'll record them in DECISIONS.
5. Dev-only audit: grep `worker/src` for `localhost`, `'local'`, and dev branches. Anything dev-only is gated on `http:` or removed. Known item: the rate-limit fallback `'local'` becomes fail-closed on https, so a missing `cf-connecting-ip` returns 400. This can't happen on the CF edge, but if the header were ever missing, every request would otherwise share one bucket. **Optional, +~60 B worker:** a global ceiling of 30 fails per 15 min across all IPs, against distributed guessing.

## 2. Prod hardening

- **Worker responses:** one Hono middleware adds `Strict-Transport-Security: max-age=31536000` (no `preload`/`includeSubDomains`, since it's a workers.dev subdomain), `X-Content-Type-Options: nosniff`, and `Referrer-Policy: strict-origin-when-cross-origin`. HTML responses also get `X-Frame-Options: DENY`. The headers are sent on https only.
  - ⚠ The Referrer policy must not be `no-referrer` or `same-origin`-stripped variants, because the login `next` reads a same-origin Referer.
- **Static HTML/assets (the PWA):** `apps/web/public/_headers` (Workers static-assets headers file; 0 JS bytes) with the same headers on `/*`, plus `Cache-Control: public, max-age=31536000, immutable` on `/assets/*`.
  - Optional SPA CSP: `default-src 'self'; script-src 'self' 'sha256-…'` (for the inline SW-registration script), `style-src 'self' 'unsafe-inline'`, `img-src 'self' data:`, `font-src 'self'`, `connect-src 'self'`, `frame-ancestors 'none'`, `base-uri 'none'`, `form-action 'self'`.
  - The hash needs a tiny build step (a vite plugin hook in `vite.config.ts` writes `_headers` into `dist`). **Recommend: do it;** it's build-time only.
- **SSR login/consent CSP:** already strict (`default-src 'none'`, inline styles, `form-action 'self'` + redirect origin, `frame-ancestors 'none'`). I'll verify it on prod with curl. No change planned.
- **Cookie:** `__Host-sid; Secure; HttpOnly; SameSite=Lax; Path=/`, verified on the real origin by the smoke script.
- **Logs:** `observability` stays on. Nothing logs request bodies or headers. I'll confirm with a grep for `console.` in `worker/src`.

## 3. Phase 4 carry-overs

- **Referer `next`:** the smoke script sends `GET /login` with `Referer: https://<origin>/list/x` and expects the form's `next=/list/x`. It also sends a cross-origin Referer and expects `/`.
- **SW `api` cache on logout:** `await caches?.delete('api')` (matching the runtime cache name in `vite.config.ts`) in the logout handler. That handler is in the lazy Settings/Lists chunk, which has ~210 B of headroom, so this costs ~30 B gz lazy and 0 B initial. I'll confirm the cost with `scripts/gz.mjs --changed`.
  - Not chosen: `Clear-Site-Data: "cache"` clears the HTTP cache but not reliably Cache Storage. `"storage"` would also wipe `localStorage` (the sound pref) and unregister the SW.
- **`clientsClaim`:** **enable it** (`workbox.clientsClaim: true`; SW cost ~+20 B of the 1.25 KB headroom). Without it, a first visit isn't controlled, so `/api` responses aren't cached until a reload, and going offline right after the first visit fails. The usual mid-session risk comes from `skipWaiting`, not `clientsClaim`; I'll check the current `registerType` and leave `skipWaiting` as is.

## 4. Cloudflare commands (in order; each one asks first, or approve them as a batch)

All of these run from `worker/`. Before each one, I post the exact command for your yes or no.

| # | Command | Touches | Notes |
|---|---|---|---|
| A1 | `npx wrangler whoami` | read | Confirms the account and login; you may need `! npx wrangler login`. |
| A2 | `npx wrangler d1 create motion` | create | The id goes into `wrangler.jsonc`. |
| A3 | `npx wrangler kv namespace create OAUTH_KV` | create | The id goes into `wrangler.jsonc`. |
| A4 | `npx wrangler d1 export motion --remote --output ../backups/2026-11-26-pre-migrate.sql` | read | Empty the first time; it's the habit for every later migration. `backups/` is gitignored. |
| A5 | `npx wrangler d1 migrations apply motion --remote` | write | Forward-only migrations already in `worker/migrations`. |
| A7 | `npx wrangler deploy --dry-run --outdir ../.wrangler-dry` | none (local) | Bundle check plus gz size; `.wrangler-dry` is gitignored. |
| A8 | `npm run deploy` (root) | deploy | See §5. |
| A6 | **You run in your own terminal** (not via `!`, so the password never lands in the transcript): `npm run -s auth:hash -w @motion/worker \| (cd worker && npx wrangler secret put OWNER_PW_HASH)`, type the password, Enter, Ctrl-D | secret | After A8: the worker must exist (wrangler can't prompt to create it with piped stdin). Until then a missing hash makes `verifyPassword` return false (fail closed). |
| A9 | `node scripts/smoke.mjs <url>` (public part) | read | No auth needed. |
| A10 | **You run:** `node scripts/smoke.mjs <url> --auth` in your own terminal | writes 1 DCR client + tokens to KV | It prompts for the password (hidden TTY input) and prints no tokens. |
| A11 | `npx wrangler versions list` / `deployments list` | read | Records the version id that rollback would target. |
| R | `npx wrangler rollback [<version-id>]` | deploy | Only if needed. |

## 5. Build + deploy pipeline

- Root `deploy` = `npm run check && npm run test && npm run deploy -w @motion/worker`. `check` already does typecheck, lint, web build, and size-limit.
  - The full test suite is included on purpose: a deploy is the one place it should always run. I'll drop it if you'd rather not.
- `worker` `deploy` stays `wrangler deploy`. The assets dir is `../apps/web/dist`, built by `check`, so a deploy never ships a stale or missing `dist`. Add the guard `test -f ../apps/web/dist/index.html ||` so a direct `-w` deploy fails loudly.
- Add `worker` `db:migrate:remote` = `wrangler d1 migrations apply motion --remote` and `db:export` = `wrangler d1 export motion --remote --output ../backups/$(date +%F-%H%M).sql`. The runbook uses both.
- Size: web via `scripts/gz.mjs` (exact bytes vs baseline) and size-limit. Worker via gzip of the A7 dry-run output, before → after.

## 6. Verification (deployed URL)

`scripts/smoke.mjs` uses Node 22 `fetch`, 0 deps, and prints only status codes, header names, and booleans, never token values or cookies.

- **Public part:**
  - `/.well-known/oauth-authorization-server`: issuer and all endpoints are absolute `https://<origin>`, with `S256` in `code_challenge_methods_supported`.
  - `/.well-known/oauth-protected-resource`: `resource` is absolute and `authorization_servers` points at the origin.
  - `POST /mcp` without a token returns 401 with `WWW-Authenticate: Bearer … resource_metadata=…`. `GET /api/tasks` without a cookie returns 401.
  - Security headers are present on `/`, `/login`, and `/mcp`. The login CSP is present. The Referer `next` cases pass.
  - Every denylisted path (`/api/x`, `/oauth/x`, `/.well-known/x`, `/token`, `/authorize`) returns non-SPA content.
- **Auth part (you run it):** DCR register → login (password prompt) → `/authorize` with PKCE S256 → consent → `/token` → `tools/list` (count = 13) → `list_tasks` (read) → refresh. After the refresh, the old refresh token is rejected (rotation). The new session cookie is `__Host-sid` with Secure/HttpOnly/Lax.
- **PWA on the real origin:** `pwa.spec.ts` gets a `PWA_URL` override, so the same spec runs against prod without login. It checks that the SW registers and controls the page on the first visit (`clientsClaim`), that the shell still renders offline after a reload, and that navigating to a denylisted path offline does not get `index.html`. Installability comes from the Lighthouse PWA/manifest audit.
- **Lighthouse (mobile):** `npx lighthouse <url> --preset=… --form-factor=mobile --chrome-flags=--headless` on system Chrome. It runs through npx and is not added as a dependency.
  - Unauthenticated, `/` resolves to the shell and then `/login`, so I'll report that run as is and record LCP, CLS, and TBT.
  - An authenticated run needs your cookie (a secret). If you want it, you run it yourself with `--extra-headers` and paste back the 3 numbers.
- **claude.ai connector test:** I'll hand you exact steps after deploy: Settings → Connectors → Add custom connector → URL `<origin>/mcp` → Connect → login → consent → "list today's tasks" → "quick add 'buy milk tomorrow 6pm'" → "complete it". Each step will say what to look for: tool name shown, args, compact result, the task appearing in the PWA on focus.

## 7. Rollback + migration safety

- **Code:** `wrangler rollback` returns to the previous version instantly. Every deploy records its version id via `versions list`.
- **D1 bindings and data aren't rolled back,** so migrations must be forward-compatible: additive only (new tables, columns, indexes). A destructive change ships in two deploys: first code that no longer reads the column, then a later migration that drops it.
- Run `db:export` before every `--remote` migrate. To restore, run `wrangler d1 execute motion --remote --file <backup>` into a fresh DB, or use D1 Time Travel (`wrangler d1 time-travel restore motion --timestamp …`, 30 days on the free plan). Both go in the runbook.
- **Password rotation:** `auth:hash` → `secret put OWNER_PW_HASH`, which takes effect on the next request with no deploy. To revoke the existing sessions as well, delete the `sess:*` keys in KV (runbook command).

## 8. Budgets (must hold)

| Bucket | Before | After | Limit |
|---|---|---|---|
| Initial JS (exact) | 89,795 B | ≤ 89,795 B expected (0 initial changes) | 90,000 B |
| Lazy JS | 44.79 KB | +~30 B | 45 KB |
| celebrate | 2.16 KB | = | 8 KB |
| SW | 8.75 KB | +~20 B | 10 KB |
| Worker (gz) | measure | +~0.3 KB (headers middleware) | report only |

No new dependencies.

## 9. Finish

- `FEATURE_MAP` rows: deploy pipeline, `_headers`, the security-headers middleware, `scripts/smoke.mjs`, and the `PWA_URL` override.
- DECISIONS lines: resource ids, `global_fetch_strictly_public`, `preview_urls: false`, the single KV namespace, `clientsClaim`, the logout cache clear, the Referer policy constraint.
- Runbook section in `worker/CLAUDE.md`. Foundation §7.5 gets ✅ and one line.
- Commit on branch `phase5-deploy` with prefix `#deploy`. I'll ask before pushing.

## Questions

1. Should the root `deploy` include the full test suite? (Recommended: yes.)
2. Should I add the SPA CSP with the build-time script hash? (Recommended: yes.)
3. Should I add the global login-fail ceiling? (Recommended: yes, ~60 B worker.)
