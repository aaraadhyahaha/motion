// #auth Prints an OWNER_PW_HASH for `wrangler secret put OWNER_PW_HASH` / worker/.dev.vars.
// Usage: npm run auth:hash -w @motion/worker  (reads the password from stdin; nothing is stored)
import { pbkdf2Sync, randomBytes } from 'node:crypto';

export const hash = (pw, salt = randomBytes(16), iter = 100_000) =>
  `pbkdf2.${iter}.${salt.toString('base64url')}.${pbkdf2Sync(pw, salt, iter, 32, 'sha256').toString('base64url')}`;

if (import.meta.url === `file://${process.argv[1]}`) {
  process.stderr.write('Owner password: ');
  let pw = '';
  process.stdin.setEncoding('utf8');
  for await (const chunk of process.stdin) pw += chunk;
  pw = pw.replace(/\r?\n$/, '');
  if (pw.length < 12) throw new Error('use at least 12 characters');
  console.log(hash(pw));
}
