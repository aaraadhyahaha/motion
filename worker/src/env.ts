import type { OAuthHelpers } from '@cloudflare/workers-oauth-provider';

export interface Env {
  DB: D1Database;
  DEFAULT_TZ: string;
  /** OAuth provider state (clients, grants, hashed tokens) + `sess:*` / `rl:*`. */
  OAUTH_KV: KVNamespace;
  /** `pbkdf2.<iter>.<salt>.<hash>` (base64url) — `npm run auth:hash -w @motion/worker`. Secret. */
  OWNER_PW_HASH: string;
  /** Comma-separated origins allowed as OAuth redirect targets. */
  OAUTH_REDIRECT_ALLOW: string;
  /** Injected by OAuthProvider. */
  OAUTH_PROVIDER: OAuthHelpers;
}
