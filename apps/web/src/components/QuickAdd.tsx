// #task #sched quick add: live chips (date preview from lib/when + core tokenize), Enter → POST /api/tasks/quick.
// ⌘K / N live in keys/map.

import { tokenize } from '@motion/core/quickadd';
import { describe, parseRule } from '@motion/core/recurrence';
import type { Agenda } from '@motion/core/schemas';
import { useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { keys } from '../data/keys';
import { useQuickAdd } from '../data/mutations';
import { localToday } from '../lib/format';
import { previewWhen } from '../lib/when';
import { Icon } from './Icon';

type Props = { listId?: string; dueToday?: boolean };

const hm = () => new Date().toTimeString().slice(0, 5);

/** [date preview, other chips] — one tokenize per keystroke. `today` is the owner's day. */
function parse(text: string, today: string): [string | null, string[]] {
  const t = tokenize(text);
  const out = t.tags.map((g) => `@${g}`);
  if (t.listName) out.unshift(`#${t.listName}`);
  if (t.rrule) {
    try {
      out.push(describe(parseRule(t.rrule)) + (t.recurFrom === 'done' ? ' after done' : ''));
    } catch {}
  }
  return [text.trim() ? previewWhen(t.text, today, hm()) : null, out];
}

export function QuickAdd({ listId, dueToday }: Props) {
  const qc = useQueryClient();
  const { mutate } = useQuickAdd();
  const [text, setText] = useState('');
  const today = (): string => qc.getQueryData<Agenda>(keys.agenda(14))?.today ?? localToday();
  const [when, chips] = useMemo(() => parse(text, today()), [text]);

  const submit = () => {
    const value = text.trim();
    if (!value) return;
    const dueDate = dueToday ? today() : undefined;
    setText('');
    mutate({ text: value, listId, dueDate }, { onError: () => setText((t) => t || value) });
  };

  return (
    <form
      className="quick-add"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <Icon name="plus" size={20} className="quick-add-icon" />
      <div className="quick-add-field">
        <input
          className="quick-add-input t-body"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === 'Escape' && e.currentTarget.blur()}
          placeholder="Jot it down — “call mom 5pm”"
          aria-label="New task"
          aria-describedby="quick-add-parsed"
          enterKeyHint="done"
          autoComplete="off"
        />
        {/* row is reserved while composing (CSS), so chips never resize the composer */}
        <ul id="quick-add-parsed" className="chips" aria-label="Will be added as" aria-live="polite">
          {when && (
            <li key={`w:${when}`} className="chip chip-when t-footnote">
              <Icon name="upcoming" size={12} />
              {when}
            </li>
          )}
          {chips.map((c) => (
            <li key={c} className="chip t-footnote">
              {c}
            </li>
          ))}
          {!when && !chips.length && (
            <li className="chips-hint t-footnote">Add a date, time, #list, @tag or “every …”</li>
          )}
        </ul>
      </div>
      <kbd className="quick-add-kbd t-caption1" aria-hidden>
        ⌘K
      </kbd>
    </form>
  );
}
