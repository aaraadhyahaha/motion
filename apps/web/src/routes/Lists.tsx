// #list #ui phone Lists tab: inset groups of lists (color dots), tags, Logbook link. 44px rows. Lazy chunk.
import type { CSSProperties, ReactNode } from 'react';
import { Empty } from '../components/Empty';
import { Icon } from '../components/Icon';
import { PageHeader } from '../components/PageHeader';
import { useLists, useTags } from '../data/queries';
import { Link } from '../lib/router';

export { default as Settings } from './Settings';

const CHEVRON = 'M9 5l7 7-7 7';

function Item({ href, lead, label }: { href: string; lead: ReactNode; label: string }) {
  return (
    <li>
      <Link href={href} className="inset-item t-body">
        {lead}
        <span className="inset-label">{label}</span>
        <Icon d={CHEVRON} size={16} className="inset-chevron" />
      </Link>
    </li>
  );
}

export default function Lists() {
  const { data: lists } = useLists();
  const { data: tags } = useTags();
  return (
    <>
      <PageHeader title="Lists" />
      {!!lists?.length && (
        <section className="task-section">
          <h2 className="task-section-title t-headline">Lists</h2>
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
          <h2 className="task-section-title t-headline">Tags</h2>
          <ul className="inset-group">
            {tags.map((g) => (
              <Item
                key={g.id}
                href={`/tag/${encodeURIComponent(g.name)}`}
                label={g.name}
                lead={<Icon name="tag" size={18} className="inset-icon" />}
              />
            ))}
          </ul>
        </section>
      )}
      {lists?.every((l) => l.id === 'inbox') && tags?.length === 0 && (
        <Empty icon="lists" title="No lists yet." hint="Type #name in quick add to start one." />
      )}
      <ul className="inset-group">
        <Item href="/search" label="Search" lead={<Icon name="search" size={20} className="inset-icon" />} />
        <Item
          href="/logbook"
          label="Logbook"
          lead={<Icon name="logbook" size={20} className="inset-icon" />}
        />
        <Item
          href="/settings"
          label="Settings"
          lead={<Icon name="settings" size={20} className="inset-icon" />}
        />
      </ul>
    </>
  );
}
