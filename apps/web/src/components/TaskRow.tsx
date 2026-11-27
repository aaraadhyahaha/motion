// #task #ui one task row: checkbox · title · meta (date, time, duration, repeat, list, tags). Memoized.
import type { List, Task } from '@motion/core/schemas';
import { type CSSProperties, memo } from 'react';
import { fmtDay, fmtDuration, fmtTime } from '../lib/format';
import { loaders } from '../lib/prefetch';
import { setParam } from '../lib/router';
import { Checkbox } from './Checkbox';
import { Icon } from './Icon';

const FRESH = 1500;

type Props = {
  task: Task;
  list?: List;
  showDate?: boolean;
  leaving?: boolean;
  onToggle: (id: string, done: boolean) => void;
  onLeft: (id: string) => void;
};

export const TaskRow = memo(function TaskRow({ task: t, list, showDate, leaving, onToggle, onLeft }: Props) {
  const meta = [
    showDate && t.dueDate && (
      <span key="d" className="row-overdue">
        {fmtDay(t.dueDate)}
      </span>
    ),
    t.dueTime && (
      <span key="t" className="mono">
        {fmtTime(t.dueTime)}
      </span>
    ),
    t.durationMin && (
      <span key="m" className="mono">
        {fmtDuration(t.durationMin)}
      </span>
    ),
    t.rrule && <Icon key="r" name="repeat" size={13} label="Repeats" />,
    list && (
      <span
        key="l"
        className="row-list"
        style={{ '--dot': list.color ?? 'var(--list-purple)' } as CSSProperties}
      >
        {list.name}
      </span>
    ),
    ...t.tags.map((g) => <span key={`g${g}`}>@{g}</span>),
  ].filter(Boolean);

  return (
    <li
      className="row"
      data-id={t.id}
      data-done={t.done || undefined}
      // clay strike only for a tick seen in this view; settled done rows (Logbook, Search) stay quiet
      data-fresh={(t.done && Date.now() - (t.doneAt ?? 0) < FRESH) || undefined}
      data-leaving={leaving || undefined}
      // the row's own opacity + transform share --row-leave, so either end is the last; ignore bubbling child ends
      onTransitionEnd={(e) => leaving && e.target === e.currentTarget && onLeft(t.id)}
    >
      <Checkbox checked={t.done} onChange={(d) => onToggle(t.id, d)} label={t.title} />
      <button
        type="button"
        className="row-body"
        onPointerDown={loaders.editor}
        onClick={() => setParam('t', t.id)}
      >
        <span className="row-title t-body">{t.title}</span>
        {meta.length > 0 && <span className="row-meta t-footnote">{meta}</span>}
      </button>
    </li>
  );
});
