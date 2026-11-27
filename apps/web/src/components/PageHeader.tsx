// #ui HIG large title that hands off to an inline title in the fixed nav bar once scrolled under it.
// One IntersectionObserver on the large title — no scroll listeners.
import { type ReactNode, useEffect, useRef, useState } from 'react';

/** `swash`: the hand-drawn clay underline — Today only, so it stays a signature, not a stamp. */
type Props = { title: string; subtitle?: string; actions?: ReactNode; swash?: boolean };

export function PageHeader({ title, subtitle, actions, swash }: Props) {
  const bar = useRef<HTMLDivElement>(null);
  const big = useRef<HTMLHeadingElement>(null);
  const [stuck, setStuck] = useState(false);

  useEffect(() => {
    const el = big.current;
    if (!el) return;
    const h = bar.current?.offsetHeight ?? 0;
    const io = new IntersectionObserver(([e]) => setStuck(!!e && !e.isIntersecting), {
      rootMargin: `-${h}px 0px 0px 0px`,
    });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <header className="page-header">
      <div className="nav-bar" ref={bar} data-stuck={stuck || undefined}>
        <span className="nav-bar-title t-headline" aria-hidden={!stuck}>
          {title}
        </span>
        {actions && <div className="nav-bar-actions">{actions}</div>}
      </div>
      <h1 className="page-title t-large-title" ref={big} data-swash={swash || undefined}>
        {title}
      </h1>
      {subtitle && <p className="page-subtitle t-subhead">{subtitle}</p>}
    </header>
  );
}
