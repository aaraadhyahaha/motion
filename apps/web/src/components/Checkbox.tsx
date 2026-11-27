// #ui #anim round checkbox: ink stamp — CSS spring fill + wipe-reveal check + ring bloom (haptic lives in celebrate/run).
import { Icon } from './Icon';
import '../styles/check.css';

type Props = { checked: boolean; onChange: (next: boolean) => void; label: string };

export function Checkbox({ checked, onChange, label }: Props) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={label}
      className="check"
      onClick={() => onChange(!checked)}
    >
      <span className="check-ring" aria-hidden>
        <span className="check-fill">
          <Icon name="check" size={14} />
          <span className="check-wipe" />
        </span>
      </span>
    </button>
  );
}
