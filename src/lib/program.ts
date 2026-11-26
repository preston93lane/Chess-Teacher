/**
 * Training programs: multi-week regimens built from the app's material.
 * Each week has a focus (tactic themes, lessons, openings, classic games).
 * Regular days mix warm-up puzzles, new material and practice; the last day
 * of each week is a review day that interleaves everything covered so far;
 * every fourth week (and the final one) ends with a checkpoint.
 */
import type { Color } from './chess/core';
import { getLesson } from '../data/lessons';
import { getClassic } from '../data/classics';
import { getOpening } from './openings/book';
import { THEME_INFO } from './puzzles';

export type BlockKind = 'puzzles' | 'mix' | 'lesson' | 'learn' | 'classic' | 'quiz' | 'game' | 'review' | 'rush' | 'recap';

export interface Block {
  id: string;
  kind: BlockKind;
  title: string;
  detail: string;
  to: string;
  minutes: number;
}

export interface DayPlan {
  week: number;
  day: number;
  review: boolean;
  checkpoint: boolean;
  title: string;
  blocks: Block[];
}

export interface ProgramWeek {
  title: string;
  focus: string;
  tactics: string[];
  lessons: string[];
  openings: { id: string; lines: string[]; side?: Color }[];
  classics: string[];
}

export interface ProgramTemplate {
  id: string;
  title: string;
  summary: string;
  level: 'Intermediate' | 'Advanced';
  weeks: ProgramWeek[];
}

export interface ActiveProgram {
  templateId: string;
  startedAt: number;
  daysPerWeek: number;
  minutesPerDay: number;
  done: string[];
  baseline: { puzzleRating: number; botRating: number; rush: number };
  checkpoints: { week: number; puzzleRating: number; botRating: number; rush: number; at: number }[];
}

export const PROGRAMS: ProgramTemplate[] = [
  {
    id: 'all-round',
    title: 'All-round improvement',
    summary: 'Eight weeks that build tactics, strategy and a repertoire together — one theme of each per week, with a review day every week and checkpoints at weeks 4 and 8.',
    level: 'Intermediate',
    weeks: [
      { title: 'Development & double attacks', focus: 'Develop fast, castle, and spot forks.', tactics: ['fork', 'hangingPiece'], lessons: ['calculation'], openings: [{ id: 'italian', lines: ['pianissimo', 'two-knights-d3'] }], classics: ['opera'] },
      { title: 'Pins & the Queen’s Gambit', focus: 'Pins in tactics, pressure on d5 in strategy.', tactics: ['pin'], lessons: ['outposts'], openings: [{ id: 'queens-gambit', lines: ['exchange-minority', 'qga'] }], classics: ['reti-tartakower'] },
      { title: 'Discoveries & open files', focus: 'Lines that open — for pieces and for rooks.', tactics: ['discoveredAttack', 'doubleCheck'], lessons: ['open-files'], openings: [{ id: 'caro-kann', lines: ['classical', 'advance-short'] }], classics: ['steinitz-bardeleben'] },
      { title: 'Skewers & pawn chains', focus: 'Attack the base of the chain; line up the skewer.', tactics: ['skewer'], lessons: ['pawn-chains'], openings: [{ id: 'french', lines: ['advance', 'winawer-positional'] }], classics: ['alekhine-nimzowitsch'] },
      { title: 'Deflection & the minority attack', focus: 'Lure defenders away; create a weakness on the queenside.', tactics: ['deflection', 'attraction'], lessons: ['minority-attack'], openings: [{ id: 'ruy-lopez', lines: ['breyer', 'berlin'] }], classics: ['capablanca-marshall'] },
      { title: 'Back ranks & the isolani', focus: 'Mate threats on the back rank; playing with and against the IQP.', tactics: ['backRankMate', 'mateIn2'], lessons: ['iqp'], openings: [{ id: 'nimzo-indian', lines: ['rubinstein', 'classical-qc2'] }], classics: ['botvinnik-capablanca'] },
      { title: 'Sacrifices & opposite castling', focus: 'When the race is on, tempo beats material.', tactics: ['sacrifice', 'exposedKing'], lessons: ['opposite-castling'], openings: [{ id: 'najdorf', lines: ['english-attack', 'be2-classical'] }], classics: ['karpov-korchnoi-2'] },
      { title: 'Quiet moves & prophylaxis', focus: 'The hardest moves to find are the quiet ones.', tactics: ['quietMove', 'defensiveMove'], lessons: ['prophylaxis', 'rook-endgames'], openings: [{ id: 'kings-indian', lines: ['mar-del-plata'] }], classics: ['kasparov-topalov'] },
    ],
  },
  {
    id: 'tactics',
    title: 'Tactics bootcamp',
    summary: 'Four intense weeks of pattern training: two or three motifs a week, classic sacrificial games, Puzzle Rush checkpoints.',
    level: 'Intermediate',
    weeks: [
      { title: 'Forks, loose pieces, mate in one', focus: 'See every loose piece and every checking square.', tactics: ['fork', 'hangingPiece', 'mateIn1'], lessons: ['calculation'], openings: [], classics: ['opera', 'lasker-thomas'] },
      { title: 'Pins, skewers, mate in two', focus: 'Pieces on lines are targets.', tactics: ['pin', 'skewer', 'mateIn2'], lessons: [], openings: [], classics: ['reti-tartakower', 'immortal'] },
      { title: 'Discoveries, double check, deflection', focus: 'Moving one piece unleashes another.', tactics: ['discoveredAttack', 'doubleCheck', 'deflection'], lessons: [], openings: [], classics: ['evergreen', 'torre-lasker'] },
      { title: 'Sacrifices and long combinations', focus: 'Calculate to the end of forcing lines.', tactics: ['sacrifice', 'attraction', 'clearance', 'mateIn3'], lessons: [], openings: [], classics: ['byrne-fischer', 'kasparov-topalov'] },
    ],
  },
  {
    id: 'repertoire',
    title: 'Build your repertoire',
    summary: 'Six weeks to learn a complete repertoire — Italian and Ruy Lopez as White, Caro-Kann and Slav as Black — with quizzes, opening tactics and practice games.',
    level: 'Intermediate',
    weeks: [
      { title: 'Italian Game', focus: 'Slow build-up, the d4 break and the knight tour.', tactics: ['opening:italian'], lessons: ['prophylaxis'], openings: [{ id: 'italian', lines: ['pianissimo', 'two-knights-d3', 'evans-free'] }], classics: ['steinitz-bardeleben'] },
      { title: 'Ruy Lopez', focus: 'Spanish pressure and the main defences.', tactics: ['opening:ruy-lopez'], lessons: [], openings: [{ id: 'ruy-lopez', lines: ['breyer', 'berlin', 'marshall'] }], classics: ['capablanca-marshall'] },
      { title: 'Caro-Kann', focus: 'Solid structure, active bishop.', tactics: ['opening:caro-kann'], lessons: ['iqp'], openings: [{ id: 'caro-kann', lines: ['classical', 'advance-short', 'panov'] }], classics: ['reti-tartakower'] },
      { title: 'Slav & Semi-Slav', focus: 'Support d5, keep the bishop free.', tactics: ['opening:slav'], lessons: ['minority-attack'], openings: [{ id: 'slav', lines: ['main-slav', 'meran', 'exchange'] }], classics: [] },
      { title: 'Against 1.d4 sidelines: the London', focus: 'Know the system and its attacking plan.', tactics: ['opening:london'], lessons: ['outposts'], openings: [{ id: 'london', lines: ['vs-c5-e6', 'vs-qb6'], side: 'b' }], classics: [] },
      { title: 'Repertoire review', focus: 'Everything together, under game conditions.', tactics: ['opening:italian', 'opening:caro-kann'], lessons: [], openings: [{ id: 'italian', lines: ['pianissimo'] }, { id: 'caro-kann', lines: ['classical'] }], classics: [] },
    ],
  },
  {
    id: 'positional',
    title: 'Positional mastery',
    summary: 'Six weeks on structures and plans: outposts, chains, the minority attack, isolani and hanging pawns, prophylaxis and endgames — each tied to a classic game and an opening.',
    level: 'Advanced',
    weeks: [
      { title: 'Outposts & open files', focus: 'Squares and files are worth more than a pawn.', tactics: ['quietMove'], lessons: ['outposts', 'open-files'], openings: [{ id: 'najdorf', lines: ['be2-classical'] }], classics: ['kasparov-karpov-16'] },
      { title: 'Bad bishops & pawn chains', focus: 'Fix pawns on the wrong colour; attack the base.', tactics: ['trappedPiece'], lessons: ['bad-bishop', 'pawn-chains'], openings: [{ id: 'french', lines: ['advance', 'winawer-poisoned'] }], classics: ['alekhine-nimzowitsch'] },
      { title: 'The minority attack', focus: 'Create a weakness, then win it.', tactics: ['xRayAttack'], lessons: ['minority-attack'], openings: [{ id: 'queens-gambit', lines: ['exchange-minority', 'tartakower'] }], classics: ['fischer-spassky-6'] },
      { title: 'Isolani & hanging pawns', focus: 'Dynamic pawns vs static weaknesses.', tactics: ['intermezzo'], lessons: ['iqp', 'hanging-pawns'], openings: [{ id: 'caro-kann', lines: ['panov'] }], classics: ['rotlewi-rubinstein'] },
      { title: 'Space & prophylaxis', focus: 'Restrict first, then strike.', tactics: ['defensiveMove'], lessons: ['hedgehog', 'prophylaxis'], openings: [{ id: 'english', lines: ['symmetrical', 'reversed-sicilian'] }], classics: ['botvinnik-capablanca'] },
      { title: 'Endgame technique', focus: 'Convert the advantage you built.', tactics: ['rookEndgame', 'pawnEndgame'], lessons: ['rook-endgames'], openings: [{ id: 'catalan', lines: ['open-main'] }], classics: ['short-timman'] },
    ],
  },
];

export function getProgram(id: string) {
  return PROGRAMS.find((p) => p.id === id);
}

function puzzleRoute(themes: string[], count: number) {
  const opening = themes.find((t) => t.startsWith('opening:'));
  if (opening && themes.length === 1) return `/puzzles/play?mode=opening&id=${opening.slice(8)}&count=${count}`;
  if (themes.length === 1) return `/puzzles/play?mode=theme&theme=${themes[0]}&count=${count}`;
  return `/puzzles/play?mode=mix&themes=${themes.join(',')}&count=${count}`;
}

function themeLabel(t: string) {
  if (t.startsWith('opening:')) return `${getOpening(t.slice(8))?.name ?? 'Opening'} tactics`;
  return THEME_INFO[t]?.label ?? t;
}

function weekItems(t: ProgramTemplate, w: number, minutes: number): Omit<Block, 'id'>[] {
  const wk = t.weeks[w - 1];
  const items: Omit<Block, 'id'>[] = [];
  for (const lid of wk.lessons) {
    const l = getLesson(lid);
    if (l) items.push({ kind: 'lesson', title: `Lesson: ${l.title}`, detail: l.summary, to: `/train/lesson/${lid}`, minutes: l.minutes });
  }
  for (const o of wk.openings) {
    const op = getOpening(o.id);
    for (const lineId of o.lines) {
      const line = op?.lines.find((l) => l.id === lineId);
      if (op && line) {
        const side = o.side ?? op.side;
        items.push({ kind: 'learn', title: `${op.name}: ${line.name}`, detail: line.about ?? 'Learn the line, then recall it.', to: `/openings/${op.id}/learn/${lineId}?side=${side}`, minutes: 6 });
      }
    }
  }
  for (const cid of wk.classics) {
    const g = getClassic(cid);
    if (g) items.push({ kind: 'classic', title: `Classic: ${g.title}`, detail: `Guess the key moves — ${g.white} vs ${g.black}, ${g.year}.`, to: `/classics/${cid}?mode=guess`, minutes: 10 });
  }
  if (wk.openings.length) {
    const ids = wk.openings.map((o) => o.id).join(',');
    items.push({ kind: 'quiz', title: 'Opening quiz', detail: 'Name the line and play the next move.', to: `/openings/quiz?source=library&ids=${ids}&count=6`, minutes: 5 });
    if (minutes >= 40) {
      const o = wk.openings[0];
      const side = o.side ?? getOpening(o.id)?.side ?? 'w';
      items.push({ kind: 'game', title: `Practice game: ${getOpening(o.id)?.name}`, detail: 'The bot follows theory, then you’re on your own. 10+5.', to: `/play?opening=${o.id}&side=${side}&tc=10%2B5`, minutes: 20 });
    }
  }
  return items;
}

export function isCheckpointWeek(t: ProgramTemplate, w: number) {
  return w % 4 === 0 || w === t.weeks.length;
}

export function buildDay(t: ProgramTemplate, w: number, d: number, daysPerWeek: number, minutes: number): DayPlan {
  const wk = t.weeks[w - 1];
  const reviewDay = d === daysPerWeek && daysPerWeek > 1;
  const checkpoint = reviewDay && isCheckpointWeek(t, w);
  const blocks: Omit<Block, 'id'>[] = [];
  const warmCount = minutes >= 60 ? 12 : minutes >= 40 ? 8 : 5;
  if (!reviewDay) {
    const theme = wk.tactics[(d - 1) % wk.tactics.length];
    blocks.push({ kind: 'puzzles', title: `Warm-up: ${themeLabel(theme)}`, detail: `${warmCount} puzzles on this week’s tactic.`, to: puzzleRoute([theme], warmCount), minutes: Math.round(warmCount * 0.8) });
    const items = weekItems(t, w, minutes);
    const regularDays = Math.max(1, daysPerWeek - 1);
    const per = Math.ceil(items.length / regularDays);
    blocks.push(...items.slice((d - 1) * per, d * per));
    if (minutes >= 40 && d > 1) blocks.push({ kind: 'review', title: 'Due reviews', detail: 'Lines and positions scheduled for today.', to: '/train/review', minutes: 6 });
  } else {
    const soFar = t.weeks.slice(0, w);
    const tactics = [...new Set(soFar.flatMap((x) => x.tactics))];
    const openingIds = [...new Set(soFar.flatMap((x) => x.openings.map((o) => o.id)))];
    blocks.push({ kind: 'review', title: 'Spaced review', detail: 'Everything that is due: lines and positions you missed.', to: '/train/review', minutes: 8 });
    blocks.push({ kind: 'mix', title: 'Mixed tactics', detail: `Interleaved puzzles from all ${tactics.length} themes so far — no labels, just like a game.`, to: puzzleRoute(tactics, minutes >= 40 ? 10 : 6), minutes: 8 });
    if (openingIds.length) blocks.push({ kind: 'quiz', title: 'Cumulative opening quiz', detail: 'Positions from every opening covered so far.', to: `/openings/quiz?source=library&ids=${openingIds.join(',')}&count=${minutes >= 40 ? 10 : 6}`, minutes: 6 });
    for (const lid of wk.lessons.slice(0, 1)) {
      const l = getLesson(lid);
      if (l) blocks.push({ kind: 'recap', title: `Recap: ${l.title}`, detail: 'Redo the tasks from memory.', to: `/train/lesson/${lid}`, minutes: 5 });
    }
    if (checkpoint) {
      blocks.push({ kind: 'rush', title: 'Checkpoint: Puzzle Rush (survival)', detail: 'Measures how far your pattern recognition has come.', to: '/puzzles/rush?mode=survival', minutes: 6 });
      blocks.push({ kind: 'game', title: 'Checkpoint: rated game', detail: 'A full game against a bot at your level, 10+5. Review it afterwards.', to: '/play?tc=10%2B5', minutes: 25 });
    }
  }
  return {
    week: w,
    day: d,
    review: reviewDay,
    checkpoint,
    title: reviewDay ? (checkpoint ? `Week ${w} checkpoint` : `Week ${w} review`) : wk.title,
    blocks: blocks.map((b, i) => ({ ...b, id: `${t.id}:w${w}:d${d}:${i}` })),
  };
}

export function allDays(t: ProgramTemplate, p: Pick<ActiveProgram, 'daysPerWeek' | 'minutesPerDay'>): DayPlan[] {
  const out: DayPlan[] = [];
  for (let w = 1; w <= t.weeks.length; w++) for (let d = 1; d <= p.daysPerWeek; d++) out.push(buildDay(t, w, d, p.daysPerWeek, p.minutesPerDay));
  return out;
}

export function currentDay(p: ActiveProgram): DayPlan | null {
  const t = getProgram(p.templateId);
  if (!t) return null;
  return allDays(t, p).find((d) => d.blocks.some((b) => !p.done.includes(b.id))) ?? null;
}

export function findBlock(p: ActiveProgram | null, id: string | null): { block: Block; day: DayPlan } | null {
  if (!p || !id) return null;
  const t = getProgram(p.templateId);
  if (!t) return null;
  for (const day of allDays(t, p)) {
    const block = day.blocks.find((b) => b.id === id);
    if (block) return { block, day };
  }
  return null;
}

export function withBlock(to: string, id: string) {
  return `${to}${to.includes('?') ? '&' : '?'}block=${encodeURIComponent(id)}`;
}
