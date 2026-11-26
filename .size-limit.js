// #perf budgets (foundation plan §6b, phase-2 plan §0). Runs after `vite build` in `npm run check`.
// Initial = entry chunk + its static imports, read from Vite's build manifest (globs can't tell lazy apart).
import { existsSync, globSync, readFileSync } from 'node:fs';

const dist = 'apps/web/dist';
const manifest = JSON.parse(readFileSync(`${dist}/.vite/manifest.json`, 'utf8'));

const initial = new Set();
const initialCss = new Set();
const walk = (key) => {
  const c = manifest[key];
  if (!c || initial.has(c.file)) return;
  initial.add(c.file);
  for (const f of c.css ?? []) initialCss.add(f);
  for (const k of c.imports ?? []) walk(k);
};
for (const [key, c] of Object.entries(manifest)) if (c.isEntry) walk(key);

const js = globSync(`${dist}/assets/*.js`).map((p) => p.slice(dist.length + 1));
const celebrate = js.filter((f) => f.startsWith('assets/celebrate-'));
const lazy = js.filter((f) => !initial.has(f) && !celebrate.includes(f));
const abs = (files) => [...files].map((f) => `${dist}/${f}`);

const budgets = [
  { name: 'initial JS', path: abs(initial), limit: '90 KB' },
  { name: 'initial CSS', path: abs(initialCss), limit: '15 KB' },
  { name: 'lazy JS (routes + editor + motion, total)', path: abs(lazy), limit: '45 KB' },
  { name: 'celebrate/* JS (total)', path: abs(celebrate), limit: '8 KB' },
  { name: 'service worker', path: [`${dist}/sw.js`, ...globSync(`${dist}/workbox-*.js`)], limit: '10 KB' },
  { name: 'web manifest', path: [`${dist}/manifest.webmanifest`], limit: '1 KB' },
];

// A budget with no files yet (e.g. before celebrate/* or the SW exist) is skipped, not failed.
export default budgets
  .filter((b) => b.path.length && b.path.every((p) => existsSync(p)))
  .map((b) => ({ ...b, gzip: true }));
