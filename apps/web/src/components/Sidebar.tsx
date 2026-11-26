// #ui #list desktop sidebar (≥ 768 px): views, lists (color dots), tags.
import type { CSSProperties } from 'react';
import { useLists, useTags } from '../data/queries';
import { Link, type Route } from '../lib/router';
import { Icon, type IconName } from './Icon';

const VIEWS: { href: string; label: string; icon: IconName; name: Route['name'] }[] = [
  { href: '/', label: 'Today', icon: 'today', name: 'today' },
  { href: '/upcoming', label: 'Upcoming', icon: 'upcoming', name: 'upcoming' },
  { href: '/logbook', label: 'Logbook', icon: 'logbook', name: 'logbook' },
  { href: '/stats', label: 'Stats', icon: 'stats', name: 'stats' },
  { href: '/search', label: 'Search', icon: 'search', name: 'search' },
  { href: '/settings', label: 'Settings', icon: 'settings', name: 'settings' },
];

const cur = (on: boolean) => (on ? ('page' as const) : undefined);

export function Sidebar({ route }: { route: Route }) {
  const { data: lists } = useLists();
  const { data: tags } = useTags();
  return (
    <nav className="sidebar" aria-label="Sidebar">
      <ul className="side-group">
        {VIEWS.map((v) => (
          <li key={v.href}>
            <Link href={v.href} className="side-item" aria-current={cur(route.name === v.name)}>
              <Icon name={v.icon} size={20} />
              <span>{v.label}</span>
            </Link>
          </li>
        ))}
      </ul>
      {!!lists?.length && (
        <ul className="side-group" aria-label="Lists">
          <li className="side-heading t-footnote">Lists</li>
          {lists.map((l) => (
            <li key={l.id}>
              <Link
                href={`/list/${l.id}`}
                className="side-item"
                aria-current={cur(route.name === 'list' && route.id === l.id)}
              >
                <span className="dot" style={{ '--dot': l.color ?? 'var(--list-purple)' } as CSSProperties} />
                <span>{l.name}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
      {!!tags?.length && (
        <ul className="side-group" aria-label="Tags">
          <li className="side-heading t-footnote">Tags</li>
          {tags.map((g) => (
            <li key={g.id}>
              <Link
                href={`/tag/${encodeURIComponent(g.name)}`}
                className="side-item"
                aria-current={cur(route.name === 'tag' && route.tag === g.name)}
              >
                <Icon name="tag" size={18} />
                <span>{g.name}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </nav>
  );
}
