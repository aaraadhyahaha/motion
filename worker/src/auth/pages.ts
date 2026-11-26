// #auth Server-rendered login / consent / error pages. Atelier tokens inlined; no JS, no external requests.
const esc = (s: string) => s.replace(/[&<>"']/g, (ch) => `&#${ch.charCodeAt(0)};`);

const CSS = `:root{color-scheme:light dark;--bg:light-dark(#f4efe6,#1a1815);--card:light-dark(#fffdf8,#25221d);--label:light-dark(#231d16,#f3ede3);--label2:light-dark(rgb(76 62 48/.72),rgb(243 236 226/.64));--sep:light-dark(#e2d9c9,#3a352d);--tint:light-dark(#bd5430,#e8845f);--fill:light-dark(rgb(120 96 70/.1),rgb(243 230 210/.09))}
*{box-sizing:border-box}body{margin:0;min-height:100dvh;display:grid;place-items:center;padding:24px;background:var(--bg);color:var(--label);font:17px/1.4 -apple-system,BlinkMacSystemFont,"SF Pro Text",system-ui,sans-serif;-webkit-font-smoothing:antialiased}
main{width:100%;max-width:360px;background:var(--card);border:1px solid var(--sep);border-radius:16px;padding:28px 24px;box-shadow:0 1px 2px rgb(60 40 20/.06),0 8px 24px rgb(60 40 20/.06)}
h1{font:400 34px/1.1 "Instrument Serif","Iowan Old Style",Georgia,serif;margin:0 0 8px}p{margin:0 0 20px;color:var(--label2);font-size:15px}b{color:var(--label);font-weight:600}
label{display:block;font-size:13px;color:var(--label2);margin-bottom:6px}input{width:100%;min-height:44px;padding:10px 12px;font:inherit;color:inherit;background:var(--fill);border:1px solid var(--sep);border-radius:10px}
button{width:100%;min-height:44px;margin-top:16px;font:600 17px/1 inherit;font-family:inherit;border:0;border-radius:12px;background:var(--tint);color:#fff;cursor:pointer}button.alt{background:var(--fill);color:var(--label)}
:focus-visible{outline:3px solid var(--tint);outline-offset:2px}.err{color:var(--tint);font-size:15px;margin:12px 0 0}`;

export const page = (title: string, body: string) =>
  `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>${esc(title)} · Motion</title><style>${CSS}</style><main>${body}</main></html>`;

export const loginPage = (next: string, error?: string) =>
  page(
    'Sign in',
    `<h1>Motion</h1><p>Sign in to continue.</p><form method="post" action="/oauth/login"><input type="hidden" name="next" value="${esc(next)}"><label for="pw">Password</label><input id="pw" name="password" type="password" autocomplete="current-password" required autofocus><button>Sign in</button>${error ? `<p class="err" role="alert">${esc(error)}</p>` : ''}</form>`,
  );

export const consentPage = (o: { client: string; host: string; query: string; csrf: string }) =>
  page(
    'Allow access',
    `<h1>Allow access?</h1><p><b>${esc(o.client)}</b> wants to read and change your tasks and lists. It will return to <b>${esc(o.host)}</b>.</p><form method="post" action="/authorize"><input type="hidden" name="q" value="${esc(o.query)}"><input type="hidden" name="csrf" value="${esc(o.csrf)}"><button name="action" value="allow">Allow</button><button class="alt" name="action" value="deny">Deny</button></form>`,
  );

export const errorPage = (msg: string) => page('Error', `<h1>Can’t continue</h1><p>${esc(msg)}</p>`);
