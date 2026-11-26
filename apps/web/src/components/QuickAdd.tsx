// #task #sched quick add: live chips from core tokenize, ⌘K / N to focus, Enter → POST /api/tasks/quick.

import { tokenize } from '@motion/core/quickadd';
import { describe, parseRule } from '@motion/core/recurrence';
import type { Agenda } from '@motion/core/schemas';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useRef, useState } from 'react';
import { keys } from '../data/keys';
import { useQuickAdd } from '../data/mutations';
import { localToday } from '../lib/format';
import { Icon } from './Icon';

type Props = { listId?: string; dueToday?: boolean };

const editable = (el: EventTarget | null) =>
  el instanceof HTMLElement && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName));

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
  const input = useRef<HTMLInputElement>(null);
  const chips = useMemo(() => chipsOf(text), [text]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const cmdK = e.key.toLowerCase() === 'k' && (e.metaKey || e.ctrlKey);
      const n = e.key === 'n' && !e.metaKey && !e.ctrlKey && !e.altKey && !editable(e.target);
      if (!cmdK && !n) return;
      e.preventDefault();
      input.current?.focus();
    };
    addEventListener('keydown', onKey);
    return () => removeEventListener('keydown', onKey);
  }, []);

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
          ref={input}
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
