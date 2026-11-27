// #ui WCAG contrast for every Atelier token pair we actually render, light + dark. Parses tokens.css,
// composites translucent colors over their surface. Text ≥ 4.5, large text / UI glyphs / focus ring ≥ 3.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const css = readFileSync(new URL('./tokens.css', import.meta.url), 'utf8');
const root = css.slice(0, css.indexOf('@media')); // light/dark values; media blocks are fallbacks
type RGBA = [number, number, number, number];

const raw = (name: string, mode: 0 | 1): string => {
  const m = root.match(new RegExp(`${name}:\\s*([^;]+);`));
  if (!m?.[1]) throw new Error(`no token ${name}`);
  const v = m[1].trim();
  const ld = v.match(/^light-dark\((.+)\)$/s);
  if (!ld?.[1]) return v;
  // split on the top-level comma
  let depth = 0;
  const s = ld[1];
  for (let i = 0; i < s.length; i++) {
    if (s[i] === '(') depth++;
    else if (s[i] === ')') depth--;
    else if (s[i] === ',' && !depth) return (mode ? s.slice(i + 1) : s.slice(0, i)).trim();
  }
  throw new Error(`bad light-dark ${name}`);
};

function color(name: string, mode: 0 | 1): RGBA {
  const v = raw(name, mode);
  const ref = v.match(/^var\((--[\w-]+)\)$/);
  if (ref?.[1]) return color(ref[1], mode);
  const hex = v.match(/^#([0-9a-f]{6})$/i);
  if (hex?.[1]) return [0, 2, 4].map((i) => Number.parseInt(hex[1]!.slice(i, i + 2), 16)).concat(1) as RGBA;
  const rgb = v.match(/^rgb\((\d+) (\d+) (\d+)(?: \/ ([\d.]+))?\)$/);
  if (rgb) return [+rgb[1]!, +rgb[2]!, +rgb[3]!, rgb[4] ? +rgb[4] : 1];
  throw new Error(`unparsed ${name}: ${v}`);
}

const over = (fg: RGBA, bg: RGBA): RGBA =>
  [0, 1, 2].map((i) => fg[i]! * fg[3] + bg[i]! * (1 - fg[3])).concat(1) as RGBA;
const lum = (c: RGBA) => {
  const [r, g, b] = c.slice(0, 3).map((x) => {
    const s = x / 255;
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
};
export const ratio = (fg: RGBA, bg: RGBA) => {
  const [a, b] = [lum(over(fg, bg)), lum(bg)].sort((x, y) => y - x);
  return (a! + 0.05) / (b! + 0.05);
};

const TEXT = ['--bg', '--bg-grouped', '--bg-grouped2', '--bg3'];
const BARS = ['--material-bar-bg', '--material-sheet-bg'];
// [fg, surfaces, min] — surfaces: solid tokens, or translucent materials composited over --bg
const PAIRS: [string, string[], number][] = [
  ['--label', [...TEXT, ...BARS], 4.5],
  ['--label2', [...TEXT, ...BARS], 4.5], // secondary text, hints, kbd, done rows
  ['--tint-ink', [...TEXT, ...BARS], 4.5], // small tinted text
  ['--placeholder', [...TEXT, ...BARS], 4.5], // instructional hints: quick add, tags, search
  ['--focus-ring', [...TEXT, ...BARS], 3], // keyboard ring (outline, sits on the surrounding surface)
  ['--tint', [...TEXT, ...BARS], 3], // glyphs only (icons, checkbox fill); tinted text uses --tint-ink
  ['--red', TEXT, 4.5], // overdue dates, Log out
  ['--on-tint', ['--tint'], 4.5], // filled button label
  ['--green', TEXT, 3], // switch on-state (UI)
  ['--list-red', TEXT, 3], // list ink dots / row-list glyph (UI)
  ['--list-yellow', TEXT, 3],
  ['--list-green', TEXT, 3],
  ['--list-cyan', TEXT, 3],
  ['--list-blue', TEXT, 3],
  ['--list-purple', TEXT, 3],
];

/** CSS `color-mix(in srgb, a w%, b)` with premultiplied alpha. */
const mix = (a: RGBA, b: RGBA, w: number): RGBA => {
  const al = w * a[3] + (1 - w) * b[3];
  return [0, 1, 2].map((i) => (w * a[3] * a[i]! + (1 - w) * b[3] * b[i]!) / al).concat(al) as RGBA;
};

describe('contrast (tokens.css)', () => {
  it.each([0, 1] as const)('checkbox ring (label3 45%% + tint) ≥ 3 on row surfaces, mode %i', (mode) => {
    const ring = mix(color('--label3', mode), color('--tint', mode), 0.45);
    for (const bg of TEXT)
      expect(ratio(ring, over(color(bg, mode), color('--bg', mode)))).toBeGreaterThanOrEqual(3);
  });
  it.each([0, 1] as const)(
    'placeholder ≥ 4.5 inside --fill3 fields (search) on every surface, mode %i',
    (mode) => {
      for (const bg of TEXT) {
        const field = over(color('--fill3', mode), over(color(bg, mode), color('--bg', mode)));
        expect(ratio(color('--placeholder', mode), field)).toBeGreaterThanOrEqual(4.5);
      }
    },
  );
  for (const [mode, name] of [
    [0, 'light'],
    [1, 'dark'],
  ] as const) {
    for (const [fg, bgs, min] of PAIRS)
      for (const bg of bgs)
        it(`${name} ${fg} on ${bg} ≥ ${min}`, () => {
          const base = color('--bg', mode);
          const surface = over(color(bg, mode), base);
          expect(ratio(color(fg, mode), surface)).toBeGreaterThanOrEqual(min);
        });
  }
});

// Agent 2: toast (inverted surface) — message + Undo action ≥ 4.5 on --toast-bg, light + dark.
describe('contrast: toast', () => {
  for (const mode of [0, 1] as const)
    for (const fg of ['--toast-label', '--toast-action'])
      it(`${mode ? 'dark' : 'light'} ${fg} on --toast-bg ≥ 4.5`, () => {
        // light 13.24 / 7.55 · dark 13.27 / 5.46
        expect(ratio(color(fg, mode), color('--toast-bg', mode))).toBeGreaterThanOrEqual(4.5);
      });
});
