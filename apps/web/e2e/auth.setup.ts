// #auth e2e: log the owner in once; specs reuse the cookie via storageState.
import { expect, test as setup } from '@playwright/test';
import { AUTH_STATE, E2E_PW } from './auth';

setup('owner login', async ({ request }) => {
  const r = await request.post('http://localhost:8787/oauth/login', {
    form: { password: E2E_PW, next: '/' },
    maxRedirects: 0,
  });
  expect(r.status()).toBe(303);
  await request.storageState({ path: AUTH_STATE });
});
