// #ui #anim modal sheet (motion, editor chunk only): bottom sheet on phone, centered ≥768px.
// Enter/exit springs, drag-to-dismiss (pointer events → spring motion value), focus trap, Esc, backdrop tap.
import { AnimatePresence, m, useReducedMotion, useSpring } from 'motion/react';
import { type KeyboardEvent, type PointerEvent, type ReactNode, useEffect, useRef } from 'react';
import { springs } from '../lib/springs';

type Props = {
  open: boolean;
  label: string;
  onRequestClose: () => void;
  onExited: () => void;
  /** header content; it plus the grabber form the drag-to-dismiss zone */
  bar: ReactNode;
  children: ReactNode;
};

const { type: _t, ...dragSpring } = springs.smooth;
const DISMISS_PX = 120;
const DISMISS_V = 0.6; // px/ms
const FOCUSABLE =
  'a[href],button:not([disabled]),input:not([disabled]),select,textarea,[tabindex]:not([tabindex="-1"])';

export function Sheet({ open, label, onRequestClose, onExited, bar, children }: Props) {
  const reduced = useReducedMotion();
  const wide = useRef(matchMedia('(min-width: 768px)').matches).current;
  const ref = useRef<HTMLDivElement>(null);
  const dragY = useSpring(0, dragSpring);
  const drag = useRef<{ y0: number; y: number; t: number; v: number } | null>(null);

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
    if (d.y > DISMISS_PX || d.v > DISMISS_V) onRequestClose();
    else dragY.set(0);
  };

  const hidden = reduced ? { opacity: 0 } : wide ? { opacity: 0, scale: 0.94 } : { y: '100%' };
  const shown = reduced ? { opacity: 1 } : wide ? { opacity: 1, scale: 1 } : { y: 0 };
  const transition = reduced ? { duration: 0.15 } : springs.smooth;

  return (
    <AnimatePresence onExitComplete={onExited}>
      {open && (
        <m.div
          key="scrim"
          className="sheet-scrim"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={onRequestClose}
        />
      )}
      {open && (
        <m.div
          key="sheet"
          className="sheet-pos"
          initial={hidden}
          animate={shown}
          exit={hidden}
          transition={transition}
        >
          <m.div
            ref={ref}
            className="sheet"
            role="dialog"
            aria-modal="true"
            aria-label={label}
            tabIndex={-1}
            style={{ y: dragY }}
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
