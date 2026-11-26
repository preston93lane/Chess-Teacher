/** Weekly report: what you trained in a Monday–Sunday week, compared with the week before. */
import type { DayActivity, DrillStat, GameMeta, LessonProgress, PuzzleStats } from './store/app';

const DAY = 86400000;

export function weekStart(d = new Date()): Date {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const dow = (x.getDay() + 6) % 7; // Monday = 0
  x.setDate(x.getDate() - dow);
  return x;
}

export function isoDay(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Activity keys are UTC dates (see store `today()`); map a local day to its key. */
function activityKey(d: Date) {
  return new Date(d.getTime() + 12 * 3600000).toISOString().slice(0, 10);
}

export interface WeekStats {
  start: Date;
  end: Date;
  days: { date: string; label: string; total: number; parts: DayActivity }[];
  activeDays: number;
  games: { count: number; win: number; draw: number; loss: number; acc?: number; best?: GameMeta; openings: [string, number][] };
  puzzles: { tried: number; solved: number; ratingStart?: number; ratingEnd?: number; bestTheme?: [string, number, number]; worstTheme?: [string, number, number] };
  reviews: number;
  lines: number;
  lessonsDone: number;
  drillsPassed: number;
  quizRounds: number;
}

export function computeWeek(
  s: {
    activity: Record<string, DayActivity>;
    games: GameMeta[];
    puzzles: PuzzleStats;
    lessons: Record<string, LessonProgress>;
    drills: Record<string, DrillStat>;
    quiz: { history: { t: number }[] };
  },
  start: Date,
): WeekStats {
  const from = start.getTime();
  const end = new Date(start);
  end.setDate(end.getDate() + 7);
  const to = end.getTime();
  const inWeek = (t: number) => t >= from && t < to;

  const days: WeekStats['days'] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    const a = s.activity[activityKey(d)] ?? s.activity[isoDay(d)] ?? { reviews: 0, puzzles: 0, games: 0, lessons: 0, lines: 0 };
    days.push({ date: isoDay(d), label: d.toLocaleDateString(undefined, { weekday: 'short' }), total: a.reviews + a.puzzles + a.games + a.lessons + a.lines, parts: a });
  }

  const games = s.games.filter((g) => g.myColor && inWeek(g.createdAt));
  let win = 0;
  let draw = 0;
  let loss = 0;
  for (const g of games) {
    if (g.result === '1/2-1/2') draw++;
    else if ((g.result === '1-0' && g.myColor === 'w') || (g.result === '0-1' && g.myColor === 'b')) win++;
    else if (g.result === '1-0' || g.result === '0-1') loss++;
  }
  const reviewed = games.filter((g) => g.reviewed && g.accuracy);
  const acc = reviewed.length ? reviewed.reduce((a, g) => a + g.accuracy![g.myColor!], 0) / reviewed.length : undefined;
  const best = [...reviewed].sort((a, b) => b.accuracy![b.myColor!] - a.accuracy![a.myColor!])[0];
  const openingCount = new Map<string, number>();
  for (const g of games) if (g.opening) openingCount.set(g.opening.split(':')[0], (openingCount.get(g.opening.split(':')[0]) ?? 0) + 1);

  const ph = s.puzzles.history.filter((h) => inWeek(h.t));
  const before = s.puzzles.history.find((h) => h.t < from);
  const chrono = [...ph].sort((a, b) => a.t - b.t);
  const themeMap = new Map<string, { n: number; ok: number }>();
  for (const h of ph) for (const t of h.themes ?? []) {
    const r = themeMap.get(t) ?? { n: 0, ok: 0 };
    r.n++;
    if (h.ok) r.ok++;
    themeMap.set(t, r);
  }
  const themes = [...themeMap.entries()].filter(([, r]) => r.n >= 3).map(([t, r]) => [t, r.ok / r.n, r.n] as [string, number, number]).sort((a, b) => b[1] - a[1]);

  return {
    start,
    end,
    days,
    activeDays: days.filter((d) => d.total > 0).length,
    games: { count: games.length, win, draw, loss, acc, best, openings: [...openingCount.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3) },
    puzzles: {
      tried: ph.length,
      solved: ph.filter((h) => h.ok).length,
      ratingStart: before ? Math.round(before.after) : chrono[0] ? Math.round(chrono[0].after) : undefined,
      ratingEnd: chrono.length ? Math.round(chrono[chrono.length - 1].after) : undefined,
      bestTheme: themes[0],
      worstTheme: themes.length > 1 ? themes[themes.length - 1] : undefined,
    },
    reviews: days.reduce((a, d) => a + d.parts.reviews, 0),
    lines: days.reduce((a, d) => a + d.parts.lines, 0),
    lessonsDone: Object.values(s.lessons).filter((l) => l.completed && inWeek(l.updatedAt)).length,
    drillsPassed: Object.values(s.drills).reduce((a, d) => a + (d.log ?? []).filter((x) => x.passed && inWeek(x.t)).length, 0),
    quizRounds: s.quiz.history.filter((q) => inWeek(q.t)).length,
  };
}

export function shiftWeek(start: Date, weeks: number) {
  // Noon offset keeps daylight-saving changes from slipping a day.
  return weekStart(new Date(start.getTime() + weeks * 7 * DAY + 12 * 3600000));
}
