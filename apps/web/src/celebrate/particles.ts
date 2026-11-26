// #anim #perf one shared canvas, 120 pooled particles (typed arrays), DPR ≤ 2. rAF runs only while any are alive.
export const MAX = 120;
const px = new Float32Array(MAX);
const py = new Float32Array(MAX);
const vx = new Float32Array(MAX);
const vy = new Float32Array(MAX);
const rot = new Float32Array(MAX);
const life = new Float32Array(MAX); // seconds left; ≤ 0 = free slot
const span = new Float32Array(MAX);
const kind = new Uint8Array(MAX); // 0 confetti · 1 sparkle · 2 ring
const hue = new Uint8Array(MAX);

const INKS = ['--tint', '--list-yellow', '--list-green', '--list-cyan', '--list-blue', '--list-purple'];
let cv: HTMLCanvasElement | undefined;
let g: CanvasRenderingContext2D | null = null;
let colors: string[] = [];
let raf = 0;
let last = 0;
let turn = 0;
let alive = 0;

export const aliveCount = () => alive;
export const running = () => raf !== 0;

function setup() {
  if (!cv) {
    cv = document.createElement('canvas');
    cv.className = 'celebrate-canvas';
    cv.setAttribute('aria-hidden', 'true');
    document.body.append(cv);
    g = cv.getContext('2d');
  }
  const d = Math.min(devicePixelRatio || 1, 2);
  const w = Math.round(innerWidth * d);
  const h = Math.round(innerHeight * d);
  if (cv.width !== w || cv.height !== h) {
    cv.width = w;
    cv.height = h;
  }
  g?.setTransform(d, 0, 0, d, 0, 0);
  // tokens are light-dark(); let CSS resolve them, then read back rgb() for the canvas
  colors = INKS.map((v) => {
    cv!.style.color = `var(${v})`;
    return getComputedStyle(cv!).color;
  });
  cv.hidden = false;
}

/** Spawn up to `n` particles at (x, y). Excess beyond the pool is dropped. Returns how many spawned. */
export function burst(x: number, y: number, n: number, variant = turn++ % 3): number {
  setup();
  let made = 0;
  for (let i = 0; i < MAX && made < n; i++) {
    if (life[i]! > 0) continue;
    const a = variant === 2 ? (made / n) * Math.PI * 2 : -Math.PI / 2 + (Math.random() - 0.5) * 2.4;
    const s = variant === 2 ? 60 : 260 + Math.random() * 380;
    px[i] = x;
    py[i] = y;
    vx[i] = Math.cos(a) * s;
    vy[i] = Math.sin(a) * s;
    rot[i] = Math.random() * 6.3;
    span[i] = life[i] = variant === 2 ? 0.6 : 0.9 + Math.random() * 0.7;
    kind[i] = variant;
    hue[i] = (Math.random() * colors.length) | 0;
    made++;
  }
  if (made && !raf) {
    last = performance.now();
    raf = requestAnimationFrame(tick);
  }
  return made;
}

function tick(t: number) {
  const dt = Math.min((t - last) / 1000, 0.05);
  last = t;
  if (!g || !cv) return;
  g.clearRect(0, 0, cv.width, cv.height);
  alive = 0;
  for (let i = 0; i < MAX; i++) {
    if (life[i]! <= 0) continue;
    const l = (life[i]! -= dt);
    if (l <= 0) continue;
    alive++;
    const k = kind[i]!;
    const p = l / span[i]!; // 1 → 0
    vy[i]! += (k === 0 ? 900 : k === 1 ? 240 : 0) * dt;
    vx[i]! *= 1 - 1.6 * dt;
    px[i]! += vx[i]! * dt;
    py[i]! += vy[i]! * dt;
    rot[i]! += 8 * dt;
    g.globalAlpha = Math.min(1, p * 2);
    g.fillStyle = g.strokeStyle = colors[hue[i]!] ?? '#c63';
    if (k === 0) {
      g.save();
      g.translate(px[i]!, py[i]!);
      g.rotate(rot[i]!);
      g.fillRect(-4, -2.5, 8, 5 * Math.abs(Math.cos(rot[i]!)) + 1);
      g.restore();
    } else if (k === 1) {
      const r = 1.5 + 2.5 * Math.abs(Math.sin(rot[i]! * 2));
      g.beginPath();
      g.arc(px[i]!, py[i]!, r, 0, 6.3);
      g.fill();
    } else {
      g.lineWidth = 2;
      g.beginPath();
      g.arc(px[i]!, py[i]!, 3 + (1 - p) * 26, 0, 6.3);
      g.stroke();
    }
  }
  g.globalAlpha = 1;
  if (alive) raf = requestAnimationFrame(tick);
  else {
    raf = 0;
    g.clearRect(0, 0, cv.width, cv.height);
    cv.hidden = true;
  }
}
