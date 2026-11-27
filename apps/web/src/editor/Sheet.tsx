// #ui #anim modal sheet (motion, editor chunk only): bottom sheet on phone, centered ≥768px.
// Enter spring / exit ease-in tween (tokens --overlay-in/-out/-pop), drag-to-dismiss with release velocity,
// focus trap, Esc, backdrop tap. Layout (phone vs centered) follows matchMedia live.
import { AnimatePresence, m, useAnimationControls, useMotionValue, useReducedMotion } from 'motion/react';
import { type KeyboardEvent, type PointerEvent, type ReactNode, useEffect, useRef, useState } from 'react';
import { dur, overlayOut, overlayScale, springs } from '../lib/springs';

type Props = {
  open: boolean;
  label: string;
  onRequestClose: () => void;
  onExited: () => void;
  /** header content; it plus the grabber form the drag-to-dismiss zone */
  bar: ReactNode;
  children: ReactNode;
};

const WIDE = '(min-width: 768px)';
const DISMISS_PX = 120;
const DISMISS_V = 0.6; // px/ms
const FOCUSABLE =
  'a[href],button:not([disabled]),input:not([disabled]),select,textarea,[tabindex]:not([tabindex="-1"])';

export function Sheet({ open, label, onRequestClose, onExited, bar, children }: Props) {
  const reduced = useReducedMotion();
  const [wide, setWide] = useState(() => matchMedia(WIDE).matches);
  const ref = useRef<HTMLDivElement>(null);
  const dragY = useMotionValue(0);
  const settle = useAnimationControls(); // drives dragY (bound via style) with release velocity
  const drag = useRef<{ y0: number; y: number; t: number; v: number } | null>(null);

  useEffect(() => {
    const mq = matchMedia(WIDE);
    const on = () => {
      setWide(mq.matches);
      dragY.jump(0);
    };
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, [dragY]);

  // focus in on open, restore on unmount
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    ref.current?.focus({ preventScroll: true });
    // the invoking row may be gone (deleted) → land on the first row instead of <body>
    return () =>
      (prev?.isConnected ? prev : document.querySelector<HTMLElement>('.row-body'))?.focus?.({
        preventScroll: true,
      });
  }, []);

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      onRequestClose();
    } else if (e.key === 'Tab' && ref.current) {
      const f = ref.current.querySelectorAll<HTMLElement>(FOCUSABLE);
      const first = f[0];
      const last = f[f.length - 1];
      if (!first || !last) return;
      const a = document.activeElement;
      if (e.shiftKey && (a === first || a === ref.current)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && a === last) {
        e.preventDefault();
        first.focus();
      }
    }
  };

  const down = (e: PointerEvent) => {
    if (wide || (e.target as Element).closest('button,input,select')) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { y0: e.clientY, y: 0, t: e.timeStamp, v: 0 };
  };
  const move = (e: PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    const raw = e.clientY - d.y0;
    const y = raw < 0 ? raw * 0.15 : raw; // rubber-band upward
    const dt = e.timeStamp - d.t;
    if (dt > 0) d.v = (y - d.y) / dt;
    d.y = y;
    d.t = e.timeStamp;
    dragY.jump(y);
  };
  const up = () => {
    const d = drag.current;
    drag.current = null;
    if (!d) return;
    const velocity = d.v * 1000; // px/ms → px/s
    const flung = d.y > DISMISS_PX || d.v > DISMISS_V;
    // flung: dragY keeps falling with the release velocity while the 200ms exit tween takes over.
    // reduced: the exit is a fade in place.
    const to = flung && !reduced ? (ref.current?.offsetHeight ?? 0) + d.y : 0;
    if (reduced) dragY.jump(0);
    else
      void settle.start({ y: to, transition: { ...(flung ? springs.overlayIn : springs.smooth), velocity } });
    if (flung) onRequestClose();
  };

  const hidden = reduced ? { opacity: 0 } : wide ? { opacity: 0, scale: overlayScale } : { y: '100%' };
  const shown = reduced ? { opacity: 1 } : wide ? { opacity: 1, scale: 1 } : { y: 0 };
  const fade = { duration: dur.fade };
  const enter = reduced ? fade : wide ? springs.overlayPop : springs.overlayIn;
  const exit = reduced ? fade : overlayOut;
  // scrim tracks the sheet's duration, linear opacity
  const scrimIn = { duration: reduced ? dur.fade : wide ? dur.pop : dur.overlayIn, ease: 'linear' } as const;
  const scrimOut = { duration: reduced ? dur.fade : dur.overlayOut, ease: 'linear' } as const;

  return (
    <AnimatePresence onExitComplete={onExited}>
      {open && (
        <m.div
          key="scrim"
          className="sheet-scrim"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1, transition: scrimIn }}
          exit={{ opacity: 0, transition: scrimOut }}
          onClick={onRequestClose}
        />
      )}
      {open && (
        <m.div
          key="sheet"
          className="sheet-pos"
          initial={hidden}
          animate={{ ...shown, transition: enter }}
          exit={{ ...hidden, transition: exit }}
        >
          <m.div
            ref={ref}
            className="sheet"
            role="dialog"
            aria-modal="true"
            aria-label={label}
            tabIndex={-1}
            style={{ y: dragY }}
            animate={settle}
            onKeyDown={onKeyDown}
          >
            <div
              className="sheet-grab"
              onPointerDown={down}
              onPointerMove={move}
              onPointerUp={up}
              onPointerCancel={up}
            >
              <span className="sheet-grabber" />
              {bar}
            </div>
            {children}
          </m.div>
        </m.div>
      )}
    </AnimatePresence>
  );
}
