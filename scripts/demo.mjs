#!/usr/bin/env node
// #wf local demo: fresh isolated D1 (worker/.wrangler/demo) + mock data + wrangler :8787 + vite :5173.
// Password "demo". Never touches the regular local DB or worker/.dev.vars. Dates are relative to today.
import { execSync, spawn } from 'node:child_process';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { hash } from '../worker/scripts/hash-password.mjs';

const W = new URL('../worker/', import.meta.url).pathname;
const DB = '.wrangler/demo';
const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
const now = Date.now();
const day = (n) => new Date(now + n * 864e5).toLocaleDateString('en-CA', { timeZone: tz });
const q = (v) => (v == null ? 'NULL' : typeof v === 'number' ? v : `'${String(v).replace(/'/g, "''")}'`);
const row = (t, o) =>
  `INSERT INTO ${t} (${Object.keys(o).join(',')}) VALUES (${Object.values(o).map(q).join(',')});`;

const lists = [
  ['work', 'Work', '#c2643c'],
  ['home', 'Home', '#5b7f5a'],
  ['errands', 'Errands', '#3f6e9e'],
  ['reading', 'Reading', '#8a5a9e'],
];
const tags = ['deep', 'quick', 'call', 'waiting'];
// [list, title, dueOffset|null, time|null, opts]
const T = [
  ['work', 'Send Q4 invoice to Acme', -2, null, { tags: ['quick'] }],
  ['home', 'Renew car insurance', -1, '10:00', {}],
  ['work', 'Standup', 0, '09:30', { dur: 15, rrule: 'FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR' }],
  ['work', 'Write deploy runbook review', 0, '11:00', { dur: 90, tags: ['deep'] }],
  ['errands', 'Pick up dry cleaning', 0, '17:30', {}],
  ['home', 'Water the plants', 0, null, { rrule: 'FREQ=DAILY;INTERVAL=3', recur: 'done' }],
  ['inbox', 'Reply to Maya about the weekend', 0, null, { tags: ['quick'] }],
  ['work', 'Call the bank re: card limit', 0, '14:00', { tags: ['call'] }],
  ['work', 'Sketch onboarding flow', 0, null, { done: true, tags: ['deep'] }],
  ['home', 'Morning run', 0, '07:00', { done: true }],
  ['work', '1:1 with Priya', 1, '15:00', { dur: 30 }],
  ['errands', 'Groceries: oats, lemons, coffee', 1, null, { notes: 'Oat milk if they have it' }],
  ['home', 'Book dentist appointment', 2, null, { tags: ['call'] }],
  [
    'work',
    'Quarterly planning doc',
    3,
    null,
    { tags: ['deep'], notes: 'Draft goals, then share for comments.' },
  ],
  ['reading', 'Finish "The Design of Everyday Things"', 5, null, {}],
  ['home', 'Pay rent', 6, null, { rrule: 'FREQ=MONTHLY;BYMONTHDAY=1' }],
  ['work', 'Waiting on legal sign-off', null, null, { tags: ['waiting'] }],
  ['inbox', 'Look into a standing desk', null, null, {}],
  ['reading', 'Read the Hono middleware docs', null, null, {}],
  ['errands', 'Return library books', 9, null, {}],
];

const sql = [`INSERT OR REPLACE INTO settings (key,value) VALUES ('tz',${q(tz)});`];
lists.forEach(([id, name, color], i) =>
  sql.push(row('lists', { id, name, color, position: i + 1, created_at: now, updated_at: now })),
);
tags.forEach((name, i) => sql.push(row('tags', { id: `tag${i}`, name, updated_at: now })));
T.forEach(([list, title, d, time, o], i) => {
  const id = `demo${i}`;
  const done = o.done ? 1 : 0;
  sql.push(
    row('tasks', {
      id,
      list_id: list,
      title,
      notes: o.notes ?? null,
      done,
      done_at: done ? now - 36e5 : null,
      due_date: d == null ? null : day(d),
      due_time: time,
      duration_min: o.dur ?? null,
      rrule: o.rrule ?? null,
      recur_from: o.rrule ? (o.recur ?? 'due') : null,
      position: i + 1,
      created_at: now - 864e5 * 3,
      updated_at: now,
    }),
  );
  if (done)
    sql.push(
      row('completions', { id: `c${id}`, task_id: id, day: day(0), at: now - 36e5, prev_due_date: day(d) }),
    );
  for (const t of o.tags ?? []) sql.push(row('task_tags', { task_id: id, tag_id: `tag${tags.indexOf(t)}` }));
});

rmSync(`${W}${DB}`, { recursive: true, force: true });
mkdirSync(`${W}../apps/web/dist`, { recursive: true }); // wrangler assets dir must exist
writeFileSync(`${W}.wrangler/demo-seed.sql`, sql.join('\n'));
const sh = (c) => execSync(c, { cwd: W, stdio: ['ignore', 'ignore', 'inherit'] });
sh(`npx wrangler d1 migrations apply motion --local --persist-to ${DB}`);
sh(`npx wrangler d1 execute motion --local --persist-to ${DB} --file .wrangler/demo-seed.sql`);
console.log(`\nDemo seeded (${T.length} tasks, tz ${tz}). Open http://localhost:5173 — password: demo\n`);

const run = (cmd, args, cwd) => spawn(cmd, args, { cwd, stdio: 'inherit' });
const kids = [
  run(
    'npx',
    ['wrangler', 'dev', '--port', '8787', '--persist-to', DB, '--var', `OWNER_PW_HASH:${hash('demo')}`],
    W,
  ),
  run('npm', ['run', 'dev', '-w', '@motion/web'], new URL('..', import.meta.url).pathname),
];
process.on('SIGINT', () => kids.forEach((k) => k.kill('SIGINT')));
