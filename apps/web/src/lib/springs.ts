// #anim JS mirror of the spring tokens in styles/tokens.css — keep both in sync.
// Use with `motion` (editor/* only). Reduced motion: wrap in <MotionConfig reducedMotion="user">.
export const springs = {
  /** critically damped — taps, toggles, small moves */
  snappy: { type: 'spring', stiffness: 700, damping: 53, mass: 1 },
  /** critically damped — sheets, larger moves */
  smooth: { type: 'spring', stiffness: 260, damping: 32, mass: 1 },
  /** ζ≈0.69, ~5% overshoot — celebratory/playful */
  bouncy: { type: 'spring', stiffness: 300, damping: 24, mass: 1 },
} as const;

export type SpringName = keyof typeof springs;
