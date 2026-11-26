// #task #ui task editor (lazy chunk, owns LazyMotion). Seeds from cached rows, saves ONE diff PATCH on close.
import type { Agenda, Task, TaskUpdate } from '@motion/core/schemas';
import { useQueryClient } from '@tanstack/react-query';
import { domAnimation, LazyMotion } from 'motion/react';
import { type CSSProperties, useCallback, useEffect, useRef, useState } from 'react';
import '../styles/sheet.css';
import { Icon } from '../components/Icon';
import { keys } from '../data/keys';
import { useDeleteTask, useUpdateTask } from '../data/mutations';
import { useLists, useTask } from '../data/queries';
import { localToday } from '../lib/format';
import { DateFields } from './DateFields';
import { RepeatPicker } from './RepeatPicker';
import { Sheet } from './Sheet';
import { TagInput } from './TagInput';

const FIELDS = [
  'title',
  'notes',
  'listId',
  'dueDate',
  'dueTime',
  'durationMin',
  'rrule',
  'recurFrom',
  'tags',
] as const;
type Draft = Pick<Task, (typeof FIELDS)[number]>;

const pick = (t: Task): Draft => ({
  title: t.title,
  notes: t.notes,
  listId: t.listId,
  dueDate: t.dueDate,
  dueTime: t.dueTime,
  durationMin: t.durationMin,
  rrule: t.rrule,
  recurFrom: t.recurFrom,
  tags: t.tags,
});

/** Changed fields only; cleared optionals → null. Empty title keeps the old one. */
function diff(a: Draft, b: Draft): TaskUpdate | null {
  const out: Record<string, unknown> = {};
  for (const k of FIELDS) {
    const x = a[k];
    let y = b[k];
    if (k === 'notes' && typeof y === 'string' && !y.trim()) y = undefined;
    if (k === 'title' && !(y as string).trim()) continue;
    if (k === 'recurFrom' && !y) continue; // not nullable on the wire
    if (k === 'tags' ? (x as string[]).join() === (y as string[]).join() : x === y) continue;
    out[k] = k === 'title' ? (y as string).trim() : (y ?? null);
  }
  return Object.keys(out).length ? (out as TaskUpdate) : null;
}

/** First cached row for `id` across agenda + task pages (instant open, no spinner). */
function seedFrom(qc: ReturnType<typeof useQueryClient>, id: string): Task | undefined {
  for (const [, d] of qc.getQueriesData<unknown>({ queryKey: keys.agendaAll })) {
    const a = d as Agenda | undefined;
    const hit = a && [a.overdue, ...Object.values(a.days)].flat().find((t) => t.id === id);
    if (hit) return hit;
  }
  for (const [, d] of qc.getQueriesData<{ pages: { items: Task[] }[] }>({ queryKey: keys.tasksAll })) {
    const hit = d?.pages.flatMap((p) => p.items).find((t) => t.id === id);
    if (hit) return hit;
  }
}

export default function EditorSheet({ id, onClose }: { id: string; onClose: () => void }) {
  const qc = useQueryClient();
  const [seed] = useState(() => seedFrom(qc, id));
  const { data: task, isError } = useTask(id, seed);
  const lists = useLists().data;
  const update = useUpdateTask();
  const del = useDeleteTask();
  const [today] = useState(
    () =>
      qc.getQueriesData<Agenda>({ queryKey: keys.agendaAll }).find(([, d]) => d)?.[1]?.today ?? localToday(),
  );

  const base = useRef<Draft | null>(null);
  const baseAt = useRef(0);
  const draftRef = useRef<Draft | null>(null);
  const [draft, setDraftState] = useState<Draft | null>(null);
  const done = useRef(false);
  const [open, setOpen] = useState(true);

  // first load, or a fresher server copy before the user has typed anything → rebase
  if (task && (!base.current || (!draft && task.updatedAt !== baseAt.current))) {
    base.current = pick(task);
    baseAt.current = task.updatedAt;
    draftRef.current = base.current;
  }
  const d = draft ?? base.current;
  const set = (p: Partial<Draft>) => {
    if (!draftRef.current) return;
    draftRef.current = { ...draftRef.current, ...p };
    setDraftState(draftRef.current);
  };

  const save = useCallback(() => {
    if (done.current) return;
    done.current = true;
    const patch = base.current && draftRef.current && diff(base.current, draftRef.current);
    if (patch) update.mutate({ id, patch });
  }, [id, update.mutate]);

  // Back button / route change unmounts without the exit animation — still save.
  // (StrictMode's dev remount runs the cleanup once with no diff → re-arm on mount.)
  useEffect(() => {
    done.current = false;
    return save;
  }, [save]);

  const close = () => {
    save();
    setOpen(false);
  };
  const remove = () => {
    done.current = true;
    del.mutate(id);
    setOpen(false);
  };

  const list = lists?.find((l) => l.id === d?.listId);

  return (
    <LazyMotion features={domAnimation} strict>
      <Sheet
        open={open}
        label="Edit task"
        onRequestClose={close}
        onExited={onClose}
        bar={
          <header className="sheet-bar">
            <button type="button" className="btn btn-plain sheet-del" onClick={remove} disabled={!d}>
              <Icon name="trash" label="Delete task" />
            </button>
            <button type="button" className="btn btn-plain" onClick={close}>
              Done
            </button>
          </header>
        }
      >
        {!d ? (
          <p className="t-body ed-hint ed-pad" role="status">
            {isError ? 'Couldn’t load this task.' : 'Loading…'}
          </p>
        ) : (
          <div className="sheet-body">
            <input
              className="t-title3 ed-title"
              aria-label="Title"
              value={d.title}
              onChange={(e) => set({ title: e.target.value })}
            />
            <textarea
              className="t-body ed-notes"
              aria-label="Notes"
              placeholder="Notes"
              rows={2}
              value={d.notes ?? ''}
              onChange={(e) => set({ notes: e.target.value })}
            />
            <div className="ed-group">
              <div className="inset-group">
                <label className="ed-row">
                  <span className="ed-icon">
                    <span
                      className="dot"
                      style={{ '--dot': list?.color ?? 'var(--list-blue)' } as CSSProperties}
                    />
                  </span>
                  <span className="ed-label">List</span>
                  <select
                    className="ed-native"
                    value={d.listId}
                    onChange={(e) => set({ listId: e.target.value })}
                  >
                    {!list && <option value={d.listId}>—</option>}
                    {lists?.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.name}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </div>
            <DateFields
              today={today}
              dueDate={d.dueDate}
              dueTime={d.dueTime}
              durationMin={d.durationMin}
              onChange={set}
            />
            <RepeatPicker rrule={d.rrule} recurFrom={d.recurFrom} onChange={set} />
            <TagInput tags={d.tags} onChange={(tags) => set({ tags })} />
          </div>
        )}
      </Sheet>
    </LazyMotion>
  );
}
