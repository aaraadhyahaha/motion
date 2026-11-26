// #perf infinite-scroll sentinel: one IntersectionObserver (no scroll listeners). Lazy-route only.
import { useEffect, useRef } from 'react';

/** Attach the returned ref to an empty element after the list; `load` fires when it nears the viewport. */
export function useSentinel(load: () => void, enabled: boolean) {
  const ref = useRef<HTMLDivElement>(null);
  const fn = useRef(load);
  fn.current = load;
  useEffect(() => {
    const el = ref.current;
    if (!el || !enabled) return;
    const io = new IntersectionObserver(([e]) => e?.isIntersecting && fn.current(), {
      rootMargin: '0px 0px 600px 0px',
    });
    io.observe(el);
    return () => io.disconnect();
  }, [enabled]);
  return ref;
}
