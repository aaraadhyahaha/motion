// #list #ui phone Lists tab: paper inset groups of lists (ink dots), tags, then Search / Logbook / Settings.
// 44px ruled rows; leads share one column so labels align across groups. Lazy chunk.
import type { CSSProperties, ReactNode } from 'react';
import { Empty } from '../components/Empty';
import { Icon, type IconName } from '../components/Icon';
import { PageHeader } from '../components/PageHeader';
import { useLists, useTags } from '../data/queries';
import { Link } from '../lib/router';

export { default as Settings } from './Settings';

const CHEVRON = 'M9 5l7 7-7 7';

function Item({ href, lead, label }: { href: string; lead: ReactNode; label: string }) {
  return (
    <li>
      <Link href={href} className="inset-item t-body">
        <span className="inset-lead">{lead}</span>
        <span className="inset-label">{label}</span>
        <Icon d={CHEVRON} size={16} className="inset-chevron" />
      </Link>
    </li>
  );
}

const glyph = (name: IconName) => <Icon name={name} size={20} className="inset-icon" />;

export default function Lists() {
  const { data: lists } = useLists();
  const { data: tags } = useTags();
  return (
    <>
      <PageHeader title="Lists" />
      {!!lists?.length && (
        <section className="task-section" aria-label="Lists">
          <ul className="inset-group">
            {lists.map((l) => (
              <Item
                key={l.id}
                href={`/list/${l.id}`}
                label={l.name}
                lead={
                  <span
                    className="dot"
                    style={{ '--dot': l.color ?? 'var(--list-purple)' } as CSSProperties}
                  />
                }
              />
            ))}
          </ul>
        </section>
      )}
      {!!tags?.length && (
        <section className="task-section">
          <h2 className="task-section-title t-title3">Tags</h2>
          <ul className="inset-group">
            {tags.map((g) => (
              <Item
                key={g.id}
                href={`/tag/${encodeURIComponent(g.name)}`}
                label={g.name}
                lead={glyph('tag')}
              />
            ))}
          </ul>
        </section>
      )}
      {lists?.every((l) => l.id === 'inbox') && tags?.length === 0 && (
        <Empty icon="lists" title="No lists yet." hint="Type #name in quick add to start one." />
      )}
      <section className="task-section" aria-label="More">
        <ul className="inset-group">
          <Item href="/search" label="Search" lead={glyph('search')} />
          <Item href="/logbook" label="Logbook" lead={glyph('logbook')} />
          <Item href="/settings" label="Settings" lead={glyph('settings')} />
        </ul>
      </section>
    </>
  );
}
