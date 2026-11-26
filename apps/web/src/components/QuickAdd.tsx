// #task #sched quick add: live chips from core tokenize, Enter → POST /api/tasks/quick. ⌘K / N live in keys/map.

import { tokenize } from '@motion/core/quickadd';
import { describe, parseRule } from '@motion/core/recurrence';
import type { Agenda } from '@motion/core/schemas';
import { useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { keys } from '../data/keys';
import { useQuickAdd } from '../data/mutations';
import { localToday } from '../lib/format';
import { Icon } from './Icon';

type Props = { listId?: string; dueToday?: boolean };

function chipsOf(text: string): string[] {
  const t = tokenize(text);
  const out = t.tags.map((g) => `@${g}`);
  if (t.listName) out.unshift(`#${t.listName}`);
  if (t.rrule) {
    try {
      out.push(describe(parseRule(t.rrule)) + (t.recurFrom === 'done' ? ' after done' : ''));
    } catch {}
  }
  return out;
}

export function QuickAdd({ listId, dueToday }: Props) {
  const qc = useQueryClient();
  const { mutate } = useQuickAdd();
  const [text, setText] = useState('');
  const chips = useMemo(() => chipsOf(text), [text]);

  const submit = () => {
    const value = text.trim();
    if (!value) return;
    const dueDate = dueToday ? (qc.getQueryData<Agenda>(keys.agenda(14))?.today ?? localToday()) : undefined;
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
          placeholder="Jot it down — “call mom tomorrow 5pm @home”"
          aria-label="New task"
          enterKeyHint="done"
          autoComplete="off"
        />
        {chips.length > 0 && (
          <ul className="chips" aria-label="Parsed">
            {chips.map((c) => (
              <li key={c} className="chip t-caption1">
                {c}
              </li>
            ))}
          </ul>
        )}
      </div>
      <kbd className="quick-add-kbd t-caption1" aria-hidden>
        ⌘K
      </kbd>
    </form>
  );
}
