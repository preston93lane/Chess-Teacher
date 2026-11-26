/**
 * Spaced repetition (SM-2 variant with relearning steps). Intervals in days.
 */
export type Grade = 'again' | 'hard' | 'good' | 'easy';

export interface CardState {
  ease: number;
  interval: number;
  reps: number;
  lapses: number;
  due: number;
  last?: number;
  history: { t: number; g: Grade }[];
}

const DAY = 24 * 60 * 60 * 1000;
const MIN = 60 * 1000;

export function newCardState(now = Date.now()): CardState {
  return { ease: 2.5, interval: 0, reps: 0, lapses: 0, due: now, history: [] };
}

export function schedule(state: CardState, grade: Grade, now = Date.now()): CardState {
  const s: CardState = { ...state, history: [...state.history, { t: now, g: grade }].slice(-30), last: now };
  if (grade === 'again') {
    s.lapses += 1;
    s.reps = 0;
    s.ease = Math.max(1.3, s.ease - 0.2);
    s.interval = 0;
    s.due = now + 10 * MIN;
    return s;
  }
  if (s.reps === 0) {
    s.interval = grade === 'easy' ? 3 : grade === 'good' ? 1 : 0.5;
  } else if (s.reps === 1) {
    s.interval = grade === 'easy' ? 6 : grade === 'good' ? 3 : 1.5;
  } else {
    const mult = grade === 'hard' ? 1.2 : grade === 'good' ? s.ease : s.ease * 1.3;
    s.interval = Math.max(s.interval + 1, s.interval * mult);
  }
  if (grade === 'hard') s.ease = Math.max(1.3, s.ease - 0.15);
  if (grade === 'easy') s.ease = Math.min(3.2, s.ease + 0.15);
  s.reps += 1;
  s.interval = Math.min(365, s.interval);
  s.due = now + s.interval * DAY;
  return s;
}

/** Grade from mistakes made during a drill. */
export function gradeFromMistakes(mistakes: number, hintsUsed: number): Grade {
  if (mistakes === 0 && hintsUsed === 0) return 'good';
  if (mistakes <= 1 && hintsUsed === 0) return 'hard';
  return 'again';
}

export function isDue(s: CardState, now = Date.now()) {
  return s.due <= now;
}

export function strength(s: CardState): 'new' | 'learning' | 'young' | 'mature' {
  if (s.reps === 0 && s.history.length === 0) return 'new';
  if (s.interval < 1) return 'learning';
  if (s.interval < 21) return 'young';
  return 'mature';
}

export function dueLabel(s: CardState, now = Date.now()): string {
  const d = s.due - now;
  if (d <= 0) return 'Due now';
  if (d < 60 * MIN) return `In ${Math.ceil(d / MIN)} min`;
  if (d < DAY) return `In ${Math.ceil(d / (60 * MIN))} h`;
  const days = Math.round(d / DAY);
  return days === 1 ? 'Tomorrow' : `In ${days} days`;
}
