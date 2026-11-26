// #ui single toast ("Completed · Undo") from ui/store. Keyed by id so each one replays the enter animation.
import { dismiss, useToast } from '../ui/store';

export function Toast() {
  const t = useToast();
  return (
    <div className="toast-region" aria-live="polite">
      {t && (
        <div className="toast" key={t.id}>
          <span className="t-subhead">{t.msg}</span>
          {t.action && (
            <button
              type="button"
              className="btn btn-plain toast-action"
              onClick={() => {
                t.action?.run();
                dismiss(t.id);
              }}
            >
              {t.action.label}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
