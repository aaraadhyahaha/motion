// #wf e2e: isolated D1 (worker/.wrangler/e2e, wiped per fresh start) + wrangler dev :8787 + vite :5173 (/api proxy).
import { defineConfig, devices } from '@playwright/test';

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
    {
      name: 'phone',
      use: { ...devices['Desktop Chrome'], viewport: { width: 393, height: 852 }, hasTouch: true },
    },
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 } } },
  ],
  webServer: [
    {
      cwd: '../../worker',
      command: `rm -rf ${E2E_DB} && npx wrangler d1 migrations apply motion --local --persist-to ${E2E_DB} && npx wrangler dev --port 8787 --persist-to ${E2E_DB}`,
      url: 'http://localhost:8787/api/settings',
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
