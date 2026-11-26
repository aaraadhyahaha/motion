// #anim WAAPI FLIP for a list: after each commit, rows whose offsetTop moved slide from old → new (compositor).
// Event-driven (runs on React commits only), no rAF loop. Durations come from tokens, so reduced motion → 0.
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
  useLayoutEffect(() => {
    const box = ref.current;
    if (!box) return;
    const prev = tops.current;
    const next = new Map<string, number>();
    let opts: KeyframeAnimationOptions | undefined;
    for (const el of box.children as HTMLCollectionOf<HTMLElement>) {
      const id = el.dataset.id;
      if (!id) continue;
      const top = el.offsetTop;
      next.set(id, top);
      const was = prev.get(id);
      if (was === undefined || was === top) continue;
      opts ??= spring();
      if (!opts.duration) continue;
      const kf = [{ transform: `translateY(${was - top}px)` }, { transform: 'none' }];
      try {
        el.animate(kf, opts);
      } catch {
        el.animate(kf, { ...opts, easing: 'ease-out' }); // linear() unsupported
      }
    }
    tops.current = next;
  });
}
