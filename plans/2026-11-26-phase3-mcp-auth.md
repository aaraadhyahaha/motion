# Phase 3 — MCP + auth (#mcp #auth #api)

Parent: `plans/2026-11-26-foundation.md` §6, §6b, §7.3. Status: **✅ done (2026-11-26).** Approved: password, hand-rolled MCP, same-origin PWA, tool list.

**As built (deviations):** `quick_add` split out of `create_task` (13 tools); bad tool args → `isError` not -32602; `get_agenda` takes `days` (service signature); login `next` from same-origin Referer (saves web bytes); CSRF via `Sec-Fetch-Site` (Vite proxy rewrites Host); RFC 9728 needs absolute `resource` → one provider instance per origin; provider is ~45 KB gz, not 8–10; `allowPlainPKCE` doesn't exist in 1.4 → S256 enforced in `/authorize`; subagents not used (tool files ~15 lines each).

## 0. Shape

```
worker fetch ─► OAuthProvider (@cloudflare/workers-oauth-provider)
                 ├─ apiRoute "/mcp"  (Bearer access token) ─► mcp/server.ts ─► mcp/tools/* ─► services/*
                 └─ defaultHandler (Hono app)
                      ├─ /.well-known/*, /authorize, /token, /oauth/register   (provider-owned)
                      ├─ /oauth/login, /oauth/consent, /oauth/logout          (auth/pages.ts, SSR HTML)
                      └─ /api/*  ─► requireSession (cookie) ─► existing routes ─► services/*
```

One owner, one KV namespace (`OAUTH_KV`) holding provider state (clients, grants, hashed tokens) + `sess:<id>` cookie sessions. No D1 schema change.

## 1. OAuth 2.1 provider

- `@cloudflare/workers-oauth-provider` (already settled in DECISIONS). Gives: PKCE (S256 only — `allowPlainPKCE: false`), RFC 7591 dynamic client registration (claude.ai registers itself), RFC 8414 metadata + RFC 9728 protected-resource metadata, tokens stored **hashed** in KV, refresh-token rotation.
- Config: `authorizeEndpoint: '/authorize'`, `tokenEndpoint: '/token'`, `clientRegistrationEndpoint: '/oauth/register'`, `accessTokenTTL: 3600` (1 h), refresh TTL 30 d (rotated on use), `scopesSupported: ['tasks']`.
- Hardening (single user):
  - DCR open (claude.ai needs it), but `/authorize` rejects redirect URIs whose origin isn't in `OAUTH_REDIRECT_ALLOW` (var: `https://claude.ai,https://claude.com,http://localhost:6274` — last one = MCP Inspector, dev only).
  - Consent page names the client + redirect host; "Allow" is a POST with a CSRF token bound to the session.
  - `props` on the grant = `{ owner: true }` only; nothing secret.
- Flow: claude.ai → `/authorize` → no session → 302 `/oauth/login?next=…` → password → session cookie → back to `/authorize` → consent → `completeAuthorization()` → redirect with code → `/token` (PKCE verified by provider).

## 2. Owner login — **recommend password** (passkey later, optional)

| | Password (PBKDF2) | Passkey (WebAuthn) |
|---|---|---|
| Deps | 0 (WebCrypto) | `@simplewebauthn/server` (~20 KB gz worker) + login-page JS for `navigator.credentials` |
| Bootstrap | `wrangler secret put OWNER_PW_HASH` | needs a register-first flow (itself needs auth → chicken/egg, bootstrap token) |
| Works in claude.ai popup on any device | yes | only where the passkey is synced; rpID tied to domain (dev vs prod differ) |
| Phishing resistance | weaker | strong |

Password: `OWNER_PW_HASH = pbkdf2$sha256$100000$<salt>$<hash>` (100k = Workers' PBKDF2 cap). `npm run auth:hash` script (node, prints the string; never stored in repo). Constant-time compare. Rate limit: 5 failures / 15 min per IP in KV (`rl:<ip>`, TTL). Passkey can be added in Phase 4+ without changing sessions.

## 3. Session for the PWA (REST protection)

- On login: `sess:<128-bit random>` → `{ created }` in KV, TTL 30 d, sliding (refresh TTL when <15 d left, at most once a day → ~no KV writes).
- Cookie `__Host-motion_sid` — `HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=2592000`. (`__Host-` needs Secure; on `http://localhost` dev use plain `motion_sid` — chosen by `env.DEV`.) Lax (not Strict) so the top-level redirect back from claude.ai's popup still carries it.
- `requireSession` Hono middleware on `/api/*` → 401 `{"error":"unauthorized"}`. CSRF for mutations: require `Origin` == self (or absent on same-origin GET). JSON-only bodies already block form posts.
- **Same origin required** for zero JS change: in prod the worker also serves `apps/web/dist` via Workers static assets (`assets.directory`, `not_found_handling: "single-page-application"`, `run_worker_first: ["/api/*","/mcp","/oauth/*","/authorize","/token","/.well-known/*"]`). New DECISIONS line. In dev, `vite.config` proxy gains the same paths → `:8787` (config only, 0 bundle bytes).
- Gate the app shell: navigation to the SPA without a session → worker can't see it once the SW serves the cached shell, so the web needs one 401 hook: in `data/api.ts`, `if (r.status === 401) location.assign('/oauth/login?next=' + encodeURIComponent(location.pathname))`. ≈ +40 B gz → paired with an equal cut found at implementation (measured by size-limit; must end ≤ 89.91 KB). If no clean cut exists I stop and ask.
- Logout: `POST /oauth/logout` deletes KV session + clears cookie. Link from Settings deferred (would cost bytes) — reachable directly for now.

## 4. Server-rendered pages (`worker/src/auth/pages.ts`)

- Login, consent, error: one `layout(title, body)` template literal. Inlined `<style>` with the Atelier subset (paper/ink/clay semantic colors light+dark via `prefers-color-scheme`, system font stack, HIG body/title sizes, 44 px targets, focus ring). Target < 2 KB gz per page, no JS, no external requests, `Content-Security-Policy: default-src 'none'; style-src 'unsafe-inline'; form-action 'self' <allowed redirect origins>; frame-ancestors 'none'`.
- All interpolated values HTML-escaped (`esc()`).

## 5. MCP server at `/mcp` (Streamable HTTP)

**Recommend a hand-rolled stateless JSON-RPC handler (0 deps)** over `@modelcontextprotocol/sdk` / `agents`:
- SDK pulls classic `zod` (DECISIONS: ~93 KB gz; we use `zod/mini`) + its own transport; `agents/McpAgent` adds a Durable Object we don't need.
- Surface we need is small: `initialize`, `notifications/initialized`, `ping`, `tools/list`, `tools/call`. Stateless: POST → `application/json` response (no SSE, no session id); GET → 405; DELETE → 405. Protocol version negotiated (`2025-06-18`, accept `2025-03-26`).
- `tools/list` input schemas = `z.toJSONSchema(schema)` from `zod/mini`, computed once at module load.
- Risk: spec drift. Mitigation: verified with MCP Inspector + a claude.ai connector smoke test before Phase 5; swapping in the SDK later only touches `mcp/server.ts`.

Files:
- `worker/src/mcp/server.ts` — JSON-RPC dispatch, error mapping (`AppError` → tool result `isError: true` with short message; bad params → JSON-RPC `-32602`).
- `worker/src/mcp/tool.ts` — `defineTool({ name, description, input, run(ctx, args) })` helper + compact-JSON output (`content:[{type:'text',text:JSON.stringify(out)}]`, nulls already omitted by `rows.ts`).
- `worker/src/mcp/tools/index.ts` — registry array.
- `worker/src/mcp/tools/<tool>.ts` — one per tool:

| Tool | Input (zod/mini, mostly reused from `@motion/core`) | Service |
|---|---|---|
| `list_tasks` | `TaskQuery` (status, list, from, to, limit, cursor) | `listTasks` |
| `search_tasks` | `{ q, status?, limit?, cursor? }` | `listTasks` (q) |
| `get_agenda` | `{ from?, to? }` (default today..+7) | `getAgenda` |
| `get_task` | `{ id }` | `getTask` |
| `create_task` | `TaskCreate` **or** `{ text }` quick-add (NL dates, `#list`, `@tag`, recurrence) | `createTask` / `quickAdd` |
| `update_task` | `{ id } + TaskPatch` | `updateTask` |
| `reschedule_task` | `{ id, when }` (NL or `YYYY-MM-DD[ HH:MM]`) | `quickAdd` date parse path → `updateTask` (no new parser) |
| `complete_task` | `{ id, undo? }` | `completeTask` / `uncompleteTask` |
| `delete_task` | `{ id }` | `deleteTask` |
| `list_lists` | `{}` | `listLists` |
| `create_list` | `ListCreate` | `createList` |
| `list_tags` | `{}` | `listTags` |

If `reschedule_task` needs a date-only parser export from `quickadd.ts`, I extract it there (service layer), not in the tool. Each tool file ≲40 lines. `ctx` from `makeCtx(env)` (owner tz).

## 6. Service worker

`navigateFallbackDenylist` += `/^\/oauth/`, `/^\/authorize/`, `/^\/token/`, `/^\/\.well-known\//`, `/^\/mcp/` (plus existing `/api`). SW budget unaffected (regex literals, few bytes; SW has headroom 8.73/10 KB).

## 7. Config / secrets

- `wrangler.jsonc`: `kv_namespaces: [{ binding: "OAUTH_KV" }]`, vars `OAUTH_REDIRECT_ALLOW`, assets block (§3).
- Secrets: `OWNER_PW_HASH` (wrangler secret / `worker/.dev.vars`). `.dev.vars` already gitignored? → verify, add if not. `.dev.vars.example` committed with placeholder.
- Root `deploy` stays blocked until Phase 5 (only lifted after you confirm).

## 8. New deps (DECISIONS lines)

- `@cloudflare/workers-oauth-provider` — worker only, ~8–10 KB gz (measured on install; recorded exact). Already decided; adds size line.
- No MCP SDK, no WebAuthn lib, no cookie lib (Hono `hono/cookie` already in Hono).
- Web: 0 deps, net 0 B.

## 9. Tests

- `worker/test/mcp.test.ts` — `initialize` handshake, `tools/list` (names + JSON schemas present), each tool via `tools/call` hits the service and the D1 state changes (create→list→update→reschedule→complete/undo→delete), bad args → `-32602`, `not_found` → `isError`.
- `worker/test/auth.test.ts` — full PKCE flow through `SELF.fetch` (register client → authorize → login → consent → code → token → `/mcp` 200); wrong `code_verifier` → 400; no/bad/expired token on `/mcp` → 401 + `WWW-Authenticate` with resource metadata; refresh rotates; disallowed redirect URI → 400; login rate limit; `/api/*` without cookie → 401, with cookie → 200, cross-origin mutation → 403.
- Existing `api.test.ts` etc.: add a `withSession()` helper in `test/helpers.ts` so suites stay green unchanged in logic.
- e2e (Playwright): global setup logs in once (storageState) so the 18 specs run authenticated; one spec: 401 → redirected to login.
- Manual: `npx @modelcontextprotocol/inspector` against `http://localhost:8787/mcp` (OAuth flow + every tool).

## 10. Order of work

1. Deps + wrangler/KV + `.dev.vars` + hash script.
2. `auth/` (provider config, session, pages, login/consent/logout) + `requireSession` + auth tests.
3. `mcp/server.ts`, `tool.ts`, registry + mcp tests skeleton.
4. Tools — parallel Sonnet 5.5 subagents on disjoint `tools/*.ts` (3 groups: read / task writes / lists+tags), I integrate; you review.
5. Web: `api.ts` 401 hook + equal cut; SW denylist; vite proxy; e2e auth setup.
6. Inspector check → `npm run check` → full test + e2e → FEATURE_MAP, DECISIONS, foundation §7.3 ✅ → carry-over list + commit message.

## 11. Open questions for you

1. Password login (recommended) vs passkey?
2. Hand-rolled MCP handler (recommended) vs `@modelcontextprotocol/sdk` (heavier, spec-tracked)?
3. OK to serve the PWA from the worker (same origin) — required for the cookie/zero-JS approach?
4. Tool list above OK (adds `get_task`, `list_tags` to §6's list)?
