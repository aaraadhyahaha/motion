// #list #task #ui per-list (/list/:id), per-tag (/tag/:name) open tasks, and Search (/search?q=, open + done),
// paginated via one sentinel. One lazy chunk: search shares the list machinery instead of duplicating it.
import { useEffect, useState } from 'react';
import { Empty } from '../components/Empty';
import { PageHeader } from '../components/PageHeader';
import { TaskList } from '../components/TaskList';
import { useLists, useTasks } from '../data/queries';
import { setParam } from '../lib/router';
import { useSentinel } from '../lib/useSentinel';
import '../styles/views.css';

type Props = { list?: string; tag?: string; search?: string };

/** `/` lands here. Debounced: one timeout per keystroke burst, only while typing. */
function SearchField({ value, onQuery }: { value: string; onQuery: (q: string) => void }) {
  const [text, setText] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => {
      onQuery(text.trim());
      setParam('q', text.trim() || null, true);
    }, 250);
    return () => clearTimeout(t);
  }, [text, onQuery]);
  return (
    <form className="search" role="search" onSubmit={(e) => e.preventDefault()}>
      <input
        className="search-input t-body"
        type="search"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Titles and notes"
        aria-label="Search tasks"
        autoComplete="off"
        autoFocus
      />
    </form>
  );
}

export default function TaskQueryView({ list, tag, search }: Props) {
  const isSearch = search !== undefined;
  const [q, setQ] = useState(search?.trim() ?? '');
  const { data: lists } = useLists();
  const r = useTasks(
    isSearch ? { q, status: 'all' } : tag ? { tag, status: 'open' } : { list, status: 'open' },
    !isSearch || !!q,
  );
  const more = useSentinel(() => !r.isFetchingNextPage && void r.fetchNextPage(), !!r.hasNextPage);
  const tasks = r.data?.pages.flatMap((p) => p.items) ?? [];
  const name = lists?.find((l) => l.id === list)?.name;
  const title = isSearch ? 'Search' : tag ? `@${tag}` : (name ?? 'List');

  return (
    <>
      <PageHeader title={title} />
      {isSearch && <SearchField value={search} onQuery={setQ} />}
      {isSearch && !q ? (
        <Empty
          icon="search"
          title="Look for anything."
          hint="Titles and notes are searched, done ones too."
        />
      ) : r.isError ? (
        <Empty icon="close" title="Couldn’t load tasks" hint="Check your connection — it’ll retry." />
      ) : (
        <>
          <TaskList tasks={tasks} keepDone={isSearch} />
          {r.isSuccess &&
            !tasks.some((t) => isSearch || !t.done) &&
            (isSearch ? (
              <Empty
                icon="search"
                title={`No match for “${q}”.`}
                hint="Try fewer letters, or another word."
              />
            ) : tag ? (
              <Empty icon="tag" title="Nothing wears this tag." hint={`Add @${tag} in quick add.`} />
            ) : (
              <Empty
                icon="lists"
                title="A blank page."
                hint={`Add the first thing for ${name ?? 'this list'}.`}
              />
            ))}
          <div ref={more} aria-hidden />
        </>
      )}
    </>
  );
}
