// #anim WAAPI FLIP for a list: after each commit, rows whose offsetTop moved slide from old → new (compositor).
// The card surface (::before) scales from the old height (scaleY, origin top) so it never snaps in one frame.
// New rows enter via CSS @starting-style (row.css). Event-driven (React commits only), no rAF loop.
// Durations come from tokens, so reduced motion → 0.
import { type RefObject, useLayoutEffect, useRef } from 'react';

function spring(): KeyframeAnimationOptions {
  const s = getComputedStyle(document.documentElement);
  const d = s.getPropertyValue('--dur-smooth').trim();
  const ms = d.endsWith('ms') ? Number.parseFloat(d) : Number.parseFloat(d) * 1000;
  return { duration: ms || 0, easing: s.getPropertyValue('--ease-spring').trim() || 'ease-out' };
}

/** Children of `ref` must carry `data-id`; the container should be `position: relative`. */
export function useFlip(ref: RefObject<HTMLElement | null>) {
  const tops = useRef(new Map<string, number>());
  const height = useRef(0);
  useLayoutEffect(() => {
    const box = ref.current;
    if (!box) {
      height.current = 0; // list unmounted (empty): its next mount starts fresh
      return;
    }
    const prev = tops.current;
    const next = new Map<string, number>();
    let opts: KeyframeAnimationOptions | undefined;
    const play = (el: Element, kf: Keyframe[], o: KeyframeAnimationOptions) => {
      try {
        el.animate(kf, o);
      } catch {
        el.animate(kf, { ...o, easing: 'ease-out' }); // linear() unsupported
      }
    };
    const h = box.offsetHeight;
    const was = height.current;
    height.current = h;
    if (was && h && was !== h) {
      opts = spring();
      if (opts.duration)
        // shrinking: content below already jumped up, so catch up fast (≈ --dur-leave) to limit overlap
        play(box, [{ transform: `scaleY(${was / h})` }, { transform: 'none' }], {
          ...opts,
          duration: (opts.duration as number) / (h < was ? 3 : 1),
          pseudoElement: '::before',
        });
    }
    for (const el of box.children as HTMLCollectionOf<HTMLElement>) {
      const id = el.dataset.id;
      if (!id) continue;
      const top = el.offsetTop;
      next.set(id, top);
      const was = prev.get(id);
      if (was === undefined || was === top) continue;
      opts ??= spring();
      if (!opts.duration) continue;
      play(el, [{ transform: `translateY(${was - top}px)` }, { transform: 'none' }], opts);
    }
    tops.current = next;
  });
}
