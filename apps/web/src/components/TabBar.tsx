// #ui phone tab bar (hidden ≥ 768 px): Today · Upcoming · Lists · Stats.
import { Link, type Route } from '../lib/router';
import { Icon, type IconName } from './Icon';

const TABS: { href: string; label: string; icon: IconName; on: Route['name'][] }[] = [
  { href: '/', label: 'Today', icon: 'today', on: ['today'] },
  { href: '/upcoming', label: 'Upcoming', icon: 'upcoming', on: ['upcoming'] },
  { href: '/lists', label: 'Lists', icon: 'lists', on: ['lists', 'list', 'tag', 'logbook'] },
  { href: '/stats', label: 'Stats', icon: 'stats', on: ['stats'] },
];

export function TabBar({ route }: { route: Route['name'] }) {
  return (
    <nav className="tab-bar" aria-label="Main">
      {TABS.map((t) => (
        <Link
          key={t.href}
          href={t.href}
          className="tab"
          aria-current={t.on.includes(route) ? 'page' : undefined}
        >
          <Icon name={t.icon} size={24} />
          <span className="t-caption2">{t.label}</span>
        </Link>
      ))}
    </nav>
  );
}
