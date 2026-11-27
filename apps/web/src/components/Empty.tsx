// #ui empty state: icon (or teacup), headline, one line of guidance, optional action.
// `moment`: Today just emptied by a tick → "Today's done" is inked in (steam + clip wipe, celebrate.css).
// `onRetry`: load error → Atelier copy that names the recovery, plus a Try again button.
import { Icon, type IconName } from './Icon';

type Props = {
  icon?: IconName;
  title: string;
  hint?: string;
  moment?: boolean;
  onRetry?: () => unknown;
  action?: { label: string; run: () => unknown };
};

export function Empty({ icon, title, hint, moment, onRetry, action }: Props) {
  const act = onRetry ? { label: 'Try again', run: onRetry } : action;
  const say = onRetry ? 'Your tasks are safe. Check the connection, then try again.' : hint;
  return (
    <div className="empty" role="status" data-moment={moment || undefined}>
      {icon ? (
        <Icon name={icon} size={40} className="empty-icon" />
      ) : (
        <span className="empty-cup" aria-hidden />
      )}
      {moment && <span className="empty-steam" aria-hidden />}
      <p className="empty-title t-title3">{title}</p>
      {say && <p className="t-subhead empty-hint">{say}</p>}
      {act && (
        <button type="button" className="btn btn-plain" onClick={act.run}>
          {act.label}
        </button>
      )}
    </div>
  );
}
