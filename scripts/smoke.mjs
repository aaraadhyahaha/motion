#!/usr/bin/env node
// #deploy smoke test against a deployed origin. 0 deps (Node ≥ 22 fetch). Prints only statuses, header
// names and booleans — never tokens, cookies, codes or the password.
//   node scripts/smoke.mjs https://<origin>          public checks (no auth)
//   node scripts/smoke.mjs https://<origin> --auth   + full OAuth round trip (prompts for the password, hidden)
// --auth writes one DCR client ("Motion smoke") + its tokens to KV; it lists, never changes, tasks.
const [origin, flag] = process.argv.slice(2);
if (!origin?.startsWith('https://'))
  throw new Error('usage: node scripts/smoke.mjs https://<origin> [--auth]');
const O = origin.replace(/\/$/, '');
const REDIRECT = 'https://claude.ai/api/mcp/auth_callback';
let fails = 0;
const ok = (name, pass, detail = '') => {
  if (!pass) fails++;
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
};
const go = (path, init = {}) => fetch(`${O}${path}`, { redirect: 'manual', ...init });
const formPost = (o, headers = {}) => ({
  method: 'POST',
  headers: { 'content-type': 'application/x-www-form-urlencoded', origin: O, ...headers },
  body: new URLSearchParams(o).toString(),
});
const abs = (v) => typeof v === 'string' && v.startsWith(`${O}/`);

// ── public ────────────────────────────────────────────────────────────────
const as = await (await go('/.well-known/oauth-authorization-server')).json();
ok('AS metadata: issuer = origin', as.issuer === O || as.issuer === `${O}/`, as.issuer);
ok(
  'AS metadata: endpoints absolute',
  ['authorization_endpoint', 'token_endpoint', 'registration_endpoint'].every((k) => abs(as[k])),
);
ok('AS metadata: S256', as.code_challenge_methods_supported?.includes('S256'));
const pr = await (await go('/.well-known/oauth-protected-resource/mcp')).json(); // RFC 9728 path-suffixed
ok('PR metadata: resource = /mcp', pr.resource === `${O}/mcp`, pr.resource);
ok(
  'PR metadata: authorization_servers',
  pr.authorization_servers?.some((s) => s.replace(/\/$/, '') === O),
);

const mcp = await go('/mcp', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' });
const wa = mcp.headers.get('www-authenticate') ?? '';
ok('/mcp no token → 401', mcp.status === 401, String(mcp.status));
ok(
  '/mcp WWW-Authenticate Bearer + resource_metadata',
  /^Bearer/i.test(wa) && wa.includes('resource_metadata'),
);
ok('/api no cookie → 401', (await go('/api/lists')).status === 401);

for (const p of ['/', '/oauth/login', '/mcp']) {
  const h = (await go(p)).headers;
  ok(
    `${p}: HSTS + nosniff`,
    !!h.get('strict-transport-security') && h.get('x-content-type-options') === 'nosniff',
  );
}
const login = await go('/oauth/login');
const csp = login.headers.get('content-security-policy') ?? '';
ok('login CSP strict', csp.includes("default-src 'none'") && csp.includes("frame-ancestors 'none'"));
const shell = (await go('/')).headers.get('content-security-policy') ?? '';
ok("shell CSP has script hash, no 'unsafe-inline' scripts", /script-src 'self' 'sha256-/.test(shell));
const nextOf = async (referer) =>
  (await (await go('/oauth/login', { headers: { referer } })).text()).match(
    /name="next" value="([^"]*)"/,
  )?.[1];
ok('Referer next: same origin kept', (await nextOf(`${O}/list/abc`)) === '/list/abc');
ok('Referer next: cross origin → /', (await nextOf('https://evil.example/x')) === '/');
for (const p of ['/api/x', '/oauth/x', '/.well-known/x', '/token', '/authorize']) {
  const r = await go(p);
  ok(`${p}: not the SPA shell`, !(await r.text()).includes('id="root"'), String(r.status));
}
const leak = await go('/.vite/manifest.json');
ok('/.vite/manifest.json not served', !(leak.headers.get('content-type') ?? '').includes('json'));

// ── auth round trip ──────────────────────────────────────────────────────
if (flag === '--auth') {
  const pw = await hidden('Owner password: ');
  const reg = await go('/oauth/register', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      redirect_uris: [REDIRECT],
      client_name: 'Motion smoke',
      token_endpoint_auth_method: 'none',
    }),
  });
  ok('DCR register → 201', reg.status === 201, String(reg.status));
  const clientId = (await reg.json()).client_id;

  const lr = await go('/oauth/login', formPost({ password: pw, next: '/' }));
  const sc = lr.headers.get('set-cookie') ?? '';
  ok('login → 303', lr.status === 303, String(lr.status));
  ok(
    'cookie __Host-sid; Secure; HttpOnly; SameSite=Lax',
    /^__Host-sid=/.test(sc) && /secure/i.test(sc) && /httponly/i.test(sc) && /samesite=lax/i.test(sc),
  );
  const cookie = sc.split(';')[0];

  const b64u = (b) => Buffer.from(b).toString('base64url');
  const verifier = b64u(crypto.getRandomValues(new Uint8Array(32)));
  const challenge = b64u(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier)));
  const q = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: REDIRECT,
    scope: 'tasks',
    state: 's',
    code_challenge: challenge,
    code_challenge_method: 'S256',
  });
  const page = await (await go(`/authorize?${q}`, { headers: { cookie } })).text();
  const field = (n) =>
    page.match(new RegExp(`name="${n}" value="([^"]*)"`))?.[1]?.replace(/&#38;/g, '&') ?? '';
  ok('consent page rendered', !!field('csrf'));
  const ap = await go(
    '/authorize',
    formPost({ q: field('q'), csrf: field('csrf'), action: 'allow' }, { cookie }),
  );
  const loc = new URL(ap.headers.get('location') ?? 'about:blank');
  ok(
    'approve → redirect to claude.ai with code',
    loc.origin === 'https://claude.ai' && !!loc.searchParams.get('code'),
  );

  const tok = async (p) => {
    const r = await go('/token', formPost(p));
    return { status: r.status, body: await r.json() };
  };
  const t1 = await tok({
    grant_type: 'authorization_code',
    code: loc.searchParams.get('code') ?? '',
    redirect_uri: REDIRECT,
    client_id: clientId,
    code_verifier: verifier,
  });
  ok('token (PKCE S256) → 200', t1.status === 200 && !!t1.body.access_token && !!t1.body.refresh_token);

  let id = 0;
  const rpc = (at, method, params) =>
    go('/mcp', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        accept: 'application/json, text/event-stream',
        authorization: `Bearer ${at}`,
      },
      body: JSON.stringify({ jsonrpc: '2.0', id: ++id, method, ...(params && { params }) }),
    }).then((r) => r.json());
  const tl = await rpc(t1.body.access_token, 'tools/list');
  ok('tools/list → 13 tools', tl.result?.tools?.length === 13, String(tl.result?.tools?.length));
  const lt = await rpc(t1.body.access_token, 'tools/call', { name: 'get_agenda', arguments: {} });
  ok('get_agenda (read) → result, no error', !!lt.result && !lt.result.isError);

  const t2 = await tok({
    grant_type: 'refresh_token',
    refresh_token: t1.body.refresh_token,
    client_id: clientId,
  });
  ok('refresh → new tokens', t2.status === 200 && t2.body.refresh_token !== t1.body.refresh_token);
  ok('new access token works', !!(await rpc(t2.body.access_token, 'ping')).result);
  // the provider keeps the previous refresh token valid for one overlap use; after t2 is used, t1 is dead
  const t3 = await tok({
    grant_type: 'refresh_token',
    refresh_token: t2.body.refresh_token,
    client_id: clientId,
  });
  const old = await tok({
    grant_type: 'refresh_token',
    refresh_token: t1.body.refresh_token,
    client_id: clientId,
  });
  ok('rotation: oldest refresh token rejected', t3.status === 200 && old.status >= 400, String(old.status));
  await go('/oauth/logout', formPost({}, { cookie }));
}

console.log(fails ? `\n${fails} FAILED` : '\nall passed');
process.exit(fails ? 1 : 0);

function hidden(prompt) {
  return new Promise((resolve) => {
    const { stdin, stderr } = process;
    stderr.write(prompt);
    if (!stdin.isTTY) throw new Error('--auth needs a terminal (hidden password prompt)');
    stdin.setRawMode(true);
    stdin.setEncoding('utf8');
    let s = '';
    const on = (ch) => {
      for (const c of ch) {
        if (c === '\r' || c === '\n') {
          stdin.setRawMode(false);
          stdin.pause();
          stdin.off('data', on);
          stderr.write('\n');
          return resolve(s);
        }
        if (c === '\u0003') process.exit(130);
        s = c === '\u007f' ? s.slice(0, -1) : s + c;
      }
    };
    stdin.on('data', on);
    stdin.resume();
  });
}
