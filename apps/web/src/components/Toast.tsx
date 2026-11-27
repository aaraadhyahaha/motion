// #ui #anim single toast ("Deleted. · Undo") from ui/store. Keyed by id so each one replays the enter
// animation; on dismiss the last toast stays mounted with `.toast-out` until its exit animation ends.
import { type AnimationEvent, useState } from 'react';
import { dismiss, type Toast as T, useToast } from '../ui/store';

export function Toast() {
  const t = useToast();
  const [shown, setShown] = useState<T | null>(t);
  // derive during render (no effect): new toast replaces, null → keep last one for the exit
  if (t && t !== shown) setShown(t);
  const leaving = !t && shown !== null;
  const end = (e: AnimationEvent) => {
    if (leaving && e.animationName === 'toast-out') setShown(null);
  };
  return (
    <div className="toast-region" aria-live="polite">
      {shown && (
        <div
          className={leaving ? 'toast toast-out' : 'toast'}
          key={shown.id}
          onAnimationEnd={end}
          aria-hidden={leaving || undefined}
        >
          <span className="t-subhead">{shown.msg}</span>
          {shown.action && (
            <button
              type="button"
              className="btn btn-plain toast-action"
              tabIndex={leaving ? -1 : undefined}
              onClick={() => {
                if (leaving) return; // the `z` shortcut clicks .toast-action even mid-exit
                shown.action?.run();
                dismiss(shown.id);
              }}
            >
              {shown.action.label}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
