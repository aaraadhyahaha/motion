// #anim pure: which celebration a completion earns. Unit-tested; no DOM.
export const MILESTONES = [3, 7, 14, 30, 50, 100, 200, 365];

export interface Facts {
  /** Completed from the Today view. */
  onToday: boolean;
  /** The task is one of Today's rows (overdue or due today). */
  inToday: boolean;
  /** Open Today rows after the optimistic patch. */
  openToday: number;
  /** Cached stats (never fetched for this): completions today before this one, current streak. */
  doneToday?: number;
  streak?: number;
}

export interface Moment {
  todayDone: boolean;
  /** New streak length when it lands on a milestone, else 0. */
  milestone: number;
}

export function decide(f: Facts): Moment {
  const todayDone = f.onToday && f.inToday && f.openToday === 0;
  // streak is "alive if today or yesterday counted": first completion of the day extends it by one.
  const next = f.streak !== undefined && !f.doneToday ? f.streak + 1 : 0;
  return { todayDone, milestone: MILESTONES.includes(next) ? next : 0 };
}

/** Toast line for a streak milestone ('' → none). "Today's done" lives in the teacup (components/Empty). */
export const note = (m: Moment) => (m.milestone ? `${m.milestone}-day streak. Nicely kept.` : '');
