// #auth Owner password: PBKDF2-SHA256 via WebCrypto (Workers cap: 100k iterations). Zero deps.
const enc = new TextEncoder();
export const b64u = (b: Uint8Array) =>
  btoa(String.fromCharCode(...b))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
const unb64u = (s: string) =>
  Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0));

async function derive(pw: string, salt: Uint8Array, iter: number): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey('raw', enc.encode(pw), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt, iterations: iter },
    key,
    256,
  );
  return new Uint8Array(bits);
}

/** Constant-time check against `pbkdf2.<iter>.<salt>.<hash>`. Malformed config → false. */
export async function verifyPassword(pw: string, stored: string | undefined): Promise<boolean> {
  const [kind, it, s, h] = (stored ?? '').split('.');
  const iter = Number(it);
  if (kind !== 'pbkdf2' || !s || !h || !(iter > 0 && iter <= 100_000)) return false;
  const want = unb64u(h);
  const got = await derive(pw, unb64u(s), iter);
  let diff = want.length ^ got.length;
  for (let i = 0; i < got.length; i++) diff |= (got[i] ?? 0) ^ (want[i] ?? 0);
  return diff === 0;
}
