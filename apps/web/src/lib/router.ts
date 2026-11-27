// #ui ~40-line History-API router; URL changes render in startTransition (no dependency; plan §0).
import {
  type AnchorHTMLAttributes,
  createElement,
  type MouseEvent,
  startTransition,
  useEffect,
  useMemo,
  useState,
} from 'react';

export type Route =
  | { name: 'today' | 'upcoming' | 'lists' | 'logbook' | 'stats' | 'search' | 'settings' | 'notFound' }
  | { name: 'list'; id: string }
  | { name: 'tag'; tag: string };

const STATIC: Record<string, Route['name']> = {
  '/': 'today',
  '/upcoming': 'upcoming',
  '/lists': 'lists',
  '/logbook': 'logbook',
  '/stats': 'stats',
  '/search': 'search',
  '/settings': 'settings',
};

/** Pure path → route. */
export function matchRoute(path: string): Route {
  const p = path.length > 1 ? path.replace(/\/+$/, '') : path;
  const s = STATIC[p];
  if (s) return { name: s } as Route;
  const m = p.match(/^\/(list|tag)\/([^/]+)$/);
  if (!m?.[2]) return { name: 'notFound' };
  const v = decodeURIComponent(m[2]);
  return m[1] === 'list' ? { name: 'list', id: v } : { name: 'tag', tag: v };
}

/** Pure: `href` with one search param set (or removed when `value` is null). */
export function withParam(href: string, key: string, value: string | null): string {
  const u = new URL(href, 'http://x');
  value == null ? u.searchParams.delete(key) : u.searchParams.set(key, value);
  return u.pathname + u.search;
}

const subs = new Set<() => void>();
const emit = () => {
  for (const f of subs) f();
};
const subscribe = (f: () => void) => {
  subs.add(f);
  if (subs.size === 1) addEventListener('popstate', emit);
  return () => {
    subs.delete(f);
    if (!subs.size) removeEventListener('popstate', emit);
  };
};
const snap = () => location.pathname + location.search;

export function navigate(to: string, opts: { replace?: boolean } = {}) {
  if (to === snap()) return;
  history[opts.replace ? 'replaceState' : 'pushState'](null, '', to);
  emit();
}
/** Set/clear one search param, e.g. `setParam('t', id)` opens the editor; Back closes it. */
export const setParam = (key: string, value: string | null, replace?: boolean) =>
  navigate(withParam(snap(), key, value), { replace });

/** URL changes render as a transition (not useSyncExternalStore, which can't): a lazy route that suspends
 * keeps the current view on screen instead of flashing the blank Suspense fallback. */
export function useRoute(): { route: Route; params: URLSearchParams } {
  const [s, set] = useState(snap);
  useEffect(() => {
    const sync = () => startTransition(() => set(snap()));
    sync(); // a change between first render and subscribe
    return subscribe(sync);
  }, []);
  return useMemo(() => {
    const i = s.indexOf('?');
    return {
      route: matchRoute(i < 0 ? s : s.slice(0, i)),
      params: new URLSearchParams(i < 0 ? '' : s.slice(i)),
    };
  }, [s]);
}

export function Link({ href, onClick, ...rest }: AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) {
  const click = (e: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(e);
    if (e.defaultPrevented || e.button || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    navigate(href);
  };
  return createElement('a', { ...rest, href, onClick: click });
}
