// #task #ui token input: Enter/comma adds, Backspace on empty removes last, existing-tag suggestions.
import { useState } from 'react';
import { Icon } from '../components/Icon';
import { useTags } from '../data/queries';

type Props = { tags: string[]; onChange: (tags: string[]) => void };

const MAX = 20;
const clean = (s: string) =>
  s
    .trim()
    .replace(/^[@#]/, '')
    .replace(/[^\p{L}\p{N}_-]/gu, '')
    .slice(0, 40);

export function TagInput({ tags, onChange }: Props) {
  const [text, setText] = useState('');
  const all = useTags().data;
  const q = clean(text).toLowerCase();
  const suggestions = (all ?? [])
    .filter((t) => !tags.includes(t.name) && (!q || t.name.toLowerCase().includes(q)))
    .slice(0, 6);

  const add = (raw: string) => {
    const t = clean(raw);
    setText('');
    if (t && !tags.includes(t) && tags.length < MAX) onChange([...tags, t]);
  };

  return (
    <div className="ed-group">
      <div className="inset-group">
        <div className="ed-row ed-tags">
          <Icon name="tag" className="ed-icon" />
          {tags.map((t) => (
            <button
              key={t}
              type="button"
              className="ed-token"
              aria-label={`Remove tag ${t}`}
              onClick={() => onChange(tags.filter((x) => x !== t))}
            >
              @{t}
              <Icon name="close" size={14} />
            </button>
          ))}
          <input
            className="ed-tag-input"
            placeholder={tags.length ? '' : 'Add tags'}
            aria-label="Add tag"
            enterKeyHint="done"
            value={text}
            onChange={(e) =>
              e.target.value.endsWith(',') ? add(e.target.value.slice(0, -1)) : setText(e.target.value)
            }
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                add(text);
              } else if (e.key === 'Backspace' && !text && tags.length) {
                onChange(tags.slice(0, -1));
              }
            }}
            onBlur={() => text && add(text)}
          />
        </div>
      </div>
      {suggestions.length > 0 && (
        <div className="ed-chips" role="group" aria-label="Suggested tags">
          {suggestions.map((t) => (
            <button
              key={t.id}
              type="button"
              className="ed-chip"
              // keep focus in the input so typing continues
              onPointerDown={(e) => e.preventDefault()}
              onClick={() => add(t.name)}
            >
              @{t.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
