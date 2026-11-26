// #ui empty state: icon, headline, one line of guidance.
import { Icon, type IconName } from './Icon';

type Props = { icon?: IconName; title: string; hint?: string };

export function Empty({ icon = 'check', title, hint }: Props) {
  return (
    <div className="empty" role="status">
      <Icon name={icon} size={40} className="empty-icon" />
      <p className="t-title3">{title}</p>
      {hint && <p className="t-subhead empty-hint">{hint}</p>}
    </div>
  );
}
