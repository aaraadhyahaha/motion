// #perf exact gzip bytes per web chunk (size-limit rounds). `node scripts/gz.mjs [--save]` after `vite build`.
// Initial = entry + static imports from the Vite manifest; diff vs scripts/gz-baseline.json.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';

const dist = 'apps/web/dist';
const base = 'scripts/gz-baseline.json';
const man = JSON.parse(readFileSync(`${dist}/.vite/manifest.json`, 'utf8'));
const initial = new Set();
const walk = (k) => {
  const c = man[k];
  if (!c || initial.has(c.file)) return;
  initial.add(c.file);
  for (const i of c.imports ?? []) walk(i);
};
for (const [k, c] of Object.entries(man)) if (c.isEntry) walk(k);
const files = new Set(
  Object.values(man)
    .map((c) => c.file)
    .filter((f) => f.endsWith('.js')),
);
const gz = (f) => gzipSync(readFileSync(`${dist}/${f}`), { level: 9 }).length;
const key = (f) => f.replace(/^assets\//, '').replace(/-[\w-]{8}\.js$/, '');
const now = {};
for (const f of files) now[key(f)] = { gz: gz(f), initial: initial.has(f) };
const sum = (o, p) =>
  Object.values(o)
    .filter(p)
    .reduce((a, v) => a + v.gz, 0);
const old = existsSync(base) ? JSON.parse(readFileSync(base, 'utf8')) : {};
const rows = [...new Set([...Object.keys(old), ...Object.keys(now)])].sort();
for (const k of rows) {
  const a = old[k]?.gz ?? 0;
  const b = now[k]?.gz ?? 0;
  if (a !== b || !process.argv.includes('--changed'))
    console.log(
      `${(now[k] ?? old[k]).initial ? 'I' : ' '} ${k.padEnd(28)} ${String(b).padStart(6)}  ${b - a >= 0 ? '+' : ''}${b - a}`,
    );
}
const ini = (o) => sum(o, (v) => v.initial);
console.log(`initial: ${ini(now)} B (baseline ${ini(old)}, Δ ${ini(now) - ini(old)})`);
if (process.argv.includes('--save')) writeFileSync(base, `${JSON.stringify(now, null, 1)}\n`);
