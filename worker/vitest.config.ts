import { cloudflareTest, readD1Migrations } from '@cloudflare/vitest-plugin';
import { defineProject } from 'vitest/config';
// @ts-expect-error plain .mjs script
import { hash } from './scripts/hash-password.mjs';

/** Test-only owner password (auth.test.ts). */
export const TEST_PW = 'correct horse battery';

export default defineProject(async () => {
  const migrations = await readD1Migrations(new URL('./migrations', import.meta.url).pathname);
  return {
    plugins: [
      cloudflareTest({
        wrangler: { configPath: './wrangler.jsonc' },
        miniflare: {
          bindings: {
            TEST_MIGRATIONS: migrations,
            OWNER_PW_HASH: hash(TEST_PW, Buffer.alloc(16, 1), 1000),
            // test/oauth.ts REDIRECT (Inspector origin) — not allowed in prod vars
            OAUTH_REDIRECT_ALLOW: 'https://claude.ai,https://claude.com,http://localhost:6274',
          },
        },
      }),
    ],
    test: { name: 'worker', include: ['test/**/*.test.ts'], setupFiles: ['./test/setup.ts'] },
  };
});
