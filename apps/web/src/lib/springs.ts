// #anim JS mirror of the spring/duration tokens in styles/tokens.css — keep both in sync.
// Use with `motion` (editor/* only). Reduced motion: wrap in <MotionConfig reducedMotion="user">.
export const springs = {
  /** critically damped — taps, toggles, small moves */
  snappy: { type: 'spring', stiffness: 700, damping: 53, mass: 1 },
  /** critically damped — sheets, larger moves */
  smooth: { type: 'spring', stiffness: 260, damping: 32, mass: 1 },
  /** ζ≈0.69, ~5% overshoot — celebratory/playful */
  bouncy: { type: 'spring', stiffness: 300, damping: 24, mass: 1 },
  /** overlay enter (bottom sheet): ζ=1, settles ≈ --dur-overlay-in (350ms) */
  overlayIn: { type: 'spring', stiffness: 400, damping: 40, mass: 1 },
  /** centered sheet scale-in ≈ --dur-overlay-pop (250ms), no overshoot */
  overlayPop: { type: 'spring', visualDuration: 0.25, bounce: 0 },
} as const;

/** seconds — mirrors --dur-overlay-out / --dur-scrim / --dur-fade */
export const dur = { overlayIn: 0.35, overlayOut: 0.2, pop: 0.25, scrim: 0.2, fade: 0.15 } as const;
/** --ease-in */
export const easeIn = [0.4, 0, 1, 1] as const;
/** --overlay-scale */
export const overlayScale = 0.96;
/** overlay exit — --overlay-out: 200ms ease-in tween (exits faster than entries) */
export const overlayOut = { type: 'tween', duration: dur.overlayOut, ease: easeIn } as const;

export type SpringName = keyof typeof springs;
