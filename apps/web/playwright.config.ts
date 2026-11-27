// #wf e2e: isolated D1 (worker/.wrangler/e2e, wiped per fresh start) + wrangler dev :8787 + vite :5173 (/api proxy).
import { defineConfig, devices } from '@playwright/test';
// @ts-expect-error plain .mjs script
import { hash } from '../../worker/scripts/hash-password.mjs';
import { AUTH_STATE, E2E_PW } from './e2e/auth';

const CI = !!process.env.CI;
const E2E_DB = '.wrangler/e2e';

export default defineConfig({
  testDir: 'e2e',
  outputDir: 'test-results',
  // one shared DB → serial
  workers: 1,
  fullyParallel: false,
  forbidOnly: CI,
  retries: CI ? 1 : 0,
  reporter: CI ? 'github' : 'list',
  use: {
    baseURL: 'http://localhost:5173',
    serviceWorkers: 'block',
    timezoneId: 'UTC',
    locale: 'en-US',
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'setup', testMatch: /auth\.setup\.ts/ },
    {
      name: 'phone',
      dependencies: ['setup'],
      testIgnore: /pwa\.spec\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 393, height: 852 },
        hasTouch: true,
        storageState: AUTH_STATE,
      },
    },
    {
      name: 'desktop',
      dependencies: ['setup'],
      testIgnore: /pwa\.spec\.ts/,
      use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 }, storageState: AUTH_STATE },
    },
    // built app served by the worker (same origin), SW allowed — needs `vite build` first (test:e2e does it)
    {
      name: 'pwa',
      dependencies: ['setup'],
      testMatch: /e2e\/pwa\.spec\.ts$/, // not e2e/prod/ (deployed-origin config)
      use: {
        ...devices['Desktop Chrome'],
        baseURL: 'http://localhost:8787',
        serviceWorkers: 'allow',
        storageState: AUTH_STATE,
      },
    },
  ],
  webServer: [
    {
      cwd: '../../worker',
      command: `rm -rf ${E2E_DB} && npx wrangler d1 migrations apply motion --local --persist-to ${E2E_DB} && mkdir -p ../apps/web/dist && npx wrangler dev --port 8787 --persist-to ${E2E_DB} --var OWNER_PW_HASH:${hash(E2E_PW)}`,
      url: 'http://localhost:8787/oauth/login',
      reuseExistingServer: !CI,
      timeout: 60_000,
    },
    {
      command: 'npx vite --port 5173 --strictPort',
      url: 'http://localhost:5173',
      reuseExistingServer: !CI,
      timeout: 30_000,
    },
  ],
});
