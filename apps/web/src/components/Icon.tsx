// #ui inline SVG icon set (24-grid). Icons used only in lazy chunks pass `d` from their own file (initial bytes). Stroke styling lives in base.css `svg {}` (bytes off the JS budget). No icon library.
const paths = {
  today:
    'M4 6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5v11a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 17.5zM4 9h16M8 2.5v3M16 2.5v3M12 12.5v4',
  upcoming:
    'M4 6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5v11a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 17.5zM4 9h16M8 2.5v3M16 2.5v3M8 13h.01M12 13h.01M16 13h.01M8 16.5h.01M12 16.5h.01',
  lists: 'M9 6h11M9 12h11M9 18h11M4.5 6h.01M4.5 12h.01M4.5 18h.01',
  stats: 'M5 20V13M12 20V5M19 20v-9',
  logbook:
    'M5 4.5A1.5 1.5 0 0 1 6.5 3H19v15H6.5A1.5 1.5 0 0 0 5 19.5zM5 19.5A1.5 1.5 0 0 0 6.5 21H19v-3M9 9.5l2 2 4-4',
  plus: 'M12 5v14M5 12h14',
  search: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM20 20l-4-4',
  settings: 'M4 7h9M17 7h3M4 17h3M11 17h9M15 5v4M9 15v4',
  check: 'M5 12.5l4.5 4.5L19 7.5',
  close: 'M6 6l12 12M18 6L6 18',
  repeat:
    'M17 2.5L20.5 6 17 9.5M3.5 11V9.5A3.5 3.5 0 0 1 7 6h13.5M7 21.5L3.5 18 7 14.5M20.5 13v1.5A3.5 3.5 0 0 1 17 18H3.5',
  tag: 'M3 12.2V4.5A1.5 1.5 0 0 1 4.5 3h7.7a1.5 1.5 0 0 1 1 .44l7.4 7.4a1.5 1.5 0 0 1 0 2.12l-7.7 7.7a1.5 1.5 0 0 1-2.12 0l-7.4-7.4a1.5 1.5 0 0 1-.44-1zM8 8h.01',
  trash:
    'M4 7h16M9.5 7V4.5h5V7M6.5 7l.9 12.1a1.5 1.5 0 0 0 1.5 1.4h6.2a1.5 1.5 0 0 0 1.5-1.4L17.5 7M10 11v6M14 11v6',
} as const;

export type IconName = keyof typeof paths;

type Props = { name?: IconName; d?: string; size?: number; label?: string; className?: string };

export function Icon({ name, d, size = 22, label, className }: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      className={className}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      <path d={d ?? (name && paths[name])} />
    </svg>
  );
}
