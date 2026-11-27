// #deploy PWA checks against a deployed origin, logged out (no secrets): `PWA_URL=https://… npm run test:prod -w @motion/web`
import { defineConfig, devices } from '@playwright/test';

const baseURL = process.env.PWA_URL;
if (!baseURL?.startsWith('https://')) throw new Error('set PWA_URL=https://<origin>');

export default defineConfig({
  testDir: '.',
  outputDir: '../../test-results/prod',
  workers: 1,
  reporter: 'list',
  use: { ...devices['Desktop Chrome'], channel: 'chrome', baseURL, serviceWorkers: 'allow' },
});
