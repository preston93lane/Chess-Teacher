/**
 * Curated training tracks and the daily session generator.
 */
import type { Color } from './chess/core';
import { BOTS, type Bot } from './bots';
import { dueCards, type Card, type GameMeta, type LessonProgress, type PlanState } from './store/app';
import { getOpening } from './openings/book';
import { getLesson } from '../data/lessons';

export type StepKind = 'lesson' | 'learn' | 'drill' | 'play' | 'review' | 'analyse';

export interface PlanStep {
  id: string;
  kind: StepKind;
  title: string;
  detail: string;
  to: string;
  minutes: number;
}

export interface Track {
  id: string;
  title: string;
  summary: string;
  level: 'Intermediate' | 'Advanced';
  steps: PlanStep[];
}

const lesson = (id: string): PlanStep => {
  const l = getLesson(id);
  return {
    id: `lesson:${id}`,
    kind: 'lesson',
    title: l?.title ?? id,
    detail: l?.summary ?? '',
    to: `/train/lesson/${id}`,
    minutes: l?.minutes ?? 10,
  };
};

const learn = (openingId: string, lineId: string, side?: Color): PlanStep => {
  const o = getOpening(openingId);
  const line = o?.lines.find((l) => l.id === lineId);
  const s = side ?? o?.side ?? 'w';
  return {
    id: `learn:${openingId}:${lineId}:${s}`,
    kind: 'learn',
    title: `${o?.name}: ${line?.name}`,
    detail: line?.about ?? 'Learn the moves and the ideas behind them.',
    to: `/openings/${openingId}/learn/${lineId}?side=${s}`,
    minutes: 6,
  };
};

const play = (openingId: string, botId: string, side?: Color): PlanStep => {
  const o = getOpening(openingId);
  const bot = BOTS.find((b) => b.id === botId);
  const s = side ?? o?.side ?? 'w';
  return {
    id: `play:${openingId}:${s}`,
    kind: 'play',
    title: `Practice game: ${o?.name}`,
    detail: `Play the opening against ${bot?.name ?? 'the coach'} (${bot?.elo ?? ''}). The bot follows theory, then you’re on your own.`,
    to: `/play?opening=${openingId}&side=${s}&bot=${botId}`,
    minutes: 15,
  };
};

export const TRACKS: Track[] = [
  {
    id: 'positional',
    title: 'Positional foundations',
    summary: 'The structures and piece ideas behind every strong plan.',
    level: 'Intermediate',
    steps: [
      lesson('outposts'),
      lesson('open-files'),
      lesson('bad-bishop'),
      lesson('pawn-chains'),
      lesson('minority-attack'),
      lesson('iqp'),
      lesson('hanging-pawns'),
      lesson('prophylaxis'),
      lesson('hedgehog'),
    ],
  },
  {
    id: 'vs-e4',
    title: 'Answer 1.e4 like a Najdorf player',
    summary: 'A fighting Sicilian repertoire plus a solid Caro-Kann backup.',
    level: 'Advanced',
    steps: [
      learn('najdorf', 'english-attack'),
      lesson('opposite-castling'),
      learn('najdorf', 'bg5-main'),
      learn('najdorf', 'be2-classical'),
      play('najdorf', 'l5'),
      learn('najdorf', 'sozin'),
      learn('caro-kann', 'classical'),
      learn('caro-kann', 'advance-short'),
      play('caro-kann', 'l5'),
    ],
  },
  {
    id: 'vs-d4',
    title: 'Answer 1.d4 with the King’s Indian & Nimzo',
    summary: 'Dynamic counterattack and classical structure, side by side.',
    level: 'Advanced',
    steps: [
      lesson('pawn-chains'),
      learn('kings-indian', 'mar-del-plata'),
      learn('kings-indian', 'bayonet'),
      play('kings-indian', 'l5'),
      learn('nimzo-indian', 'rubinstein'),
      learn('nimzo-indian', 'classical-qc2'),
      lesson('hanging-pawns'),
      play('nimzo-indian', 'l6'),
    ],
  },
  {
    id: 'white-e4',
    title: '1.e4 for White: the Spanish & Italian',
    summary: 'Classical king’s-pawn play with deep middlegame plans.',
    level: 'Intermediate',
    steps: [
      learn('italian', 'pianissimo'),
      lesson('prophylaxis'),
      learn('ruy-lopez', 'breyer'),
      learn('ruy-lopez', 'berlin'),
      play('ruy-lopez', 'l5'),
      learn('ruy-lopez', 'marshall'),
      learn('najdorf', 'english-attack', 'w'),
      play('najdorf', 'l6', 'w'),
    ],
  },
  {
    id: 'white-d4',
    title: '1.d4 for White: Queen’s Gambit structures',
    summary: 'Carlsbad, isolani and hanging pawns — from the White side.',
    level: 'Intermediate',
    steps: [
      learn('queens-gambit', 'exchange-minority'),
      lesson('minority-attack'),
      learn('queens-gambit', 'qga'),
      lesson('iqp'),
      learn('queens-gambit', 'tartakower'),
      lesson('hanging-pawns'),
      play('queens-gambit', 'l5'),
      learn('catalan', 'open-main'),
    ],
  },
  {
    id: 'attack',
    title: 'Attack & calculation',
    summary: 'Forcing moves, pawn storms and races with opposite castling.',
    level: 'Advanced',
    steps: [
      lesson('calculation'),
      lesson('opposite-castling'),
      learn('dragon', 'yugoslav-bc4'),
      learn('dragon', 'yugoslav-9oo'),
      play('dragon', 'l6'),
      learn('kings-indian', 'mar-del-plata'),
      play('kings-indian', 'l6'),
    ],
  },
  {
    id: 'endgame',
    title: 'Endgames & conversion',
    summary: 'Turn advantages into wins and hold the draws you deserve.',
    level: 'Intermediate',
    steps: [lesson('eg-basic-mates'), lesson('eg-opposition'), lesson('eg-pawn-majorities'), lesson('rook-endgames'), lesson('eg-queen-vs-pawn'), lesson('eg-fortress'), lesson('eg-two-bishops'), lesson('eg-bishop-knight'), lesson('bad-bishop'), lesson('minority-attack')],
  },
];

export function getTrack(id: string) {
  return TRACKS.find((t) => t.id === id);
}

// ---------------------------------------------------------------------------
// Rating estimate & weaknesses
// ---------------------------------------------------------------------------

export function estimateRating(games: GameMeta[]): number {
  let r = 1500;
  const ordered = [...games].filter((g) => g.botId && g.myColor && g.result !== '*').sort((a, b) => a.createdAt - b.createdAt);
  for (const g of ordered) {
    const bot = BOTS.find((b) => b.id === g.botId);
    if (!bot) continue;
    const score = g.result === '1/2-1/2' ? 0.5 : (g.result === '1-0') === (g.myColor === 'w') ? 1 : 0;
    const expected = 1 / (1 + Math.pow(10, (bot.elo - r) / 400));
    r += 32 * (score - expected);
  }
  return Math.round(r);
}

export function suggestBot(rating: number): Bot {
  const target = rating + 100;
  return [...BOTS].sort((a, b) => Math.abs(a.elo - target) - Math.abs(b.elo - target))[0];
}

export interface Weakness {
  id: string;
  label: string;
  detail: string;
  step: PlanStep;
}

export function findWeaknesses(games: GameMeta[]): Weakness[] {
  const reviewed = games.filter((g) => g.reviewed && g.myColor && g.accuracy).slice(0, 10);
  if (reviewed.length < 2) return [];
  const out: Weakness[] = [];
  const blunders = reviewed.reduce((s, g) => s + (g.blunders ?? 0), 0) / reviewed.length;
  const mistakes = reviewed.reduce((s, g) => s + (g.mistakes ?? 0), 0) / reviewed.length;
  const acc = reviewed.reduce((s, g) => s + (g.accuracy![g.myColor!] ?? 0), 0) / reviewed.length;
  if (blunders >= 1) {
    out.push({
      id: 'blunders',
      label: `${blunders.toFixed(1)} blunders per game`,
      detail: 'Run the checks–captures–threats routine before every move.',
      step: lesson('calculation'),
    });
  }
  if (mistakes >= 2) {
    out.push({
      id: 'mistakes',
      label: `${mistakes.toFixed(1)} mistakes per game`,
      detail: 'Ask what your opponent wants before you commit to a plan.',
      step: lesson('prophylaxis'),
    });
  }
  if (acc < 75) {
    out.push({
      id: 'accuracy',
      label: `Average accuracy ${Math.round(acc)}%`,
      detail: 'Strengthen plans with the positional foundations.',
      step: lesson('outposts'),
    });
  }
  return out;
}

// ---------------------------------------------------------------------------
// Daily session
// ---------------------------------------------------------------------------

export function nextTrackSteps(plan: PlanState | null, n = 2): PlanStep[] {
  if (!plan) return [];
  const t = getTrack(plan.trackId);
  if (!t) return [];
  return t.steps.filter((s) => !plan.done.includes(s.id)).slice(0, n);
}

export function dailySession(state: {
  cards: Record<string, Card>;
  games: GameMeta[];
  plan: PlanState | null;
  lessons: Record<string, LessonProgress>;
  repertoire: Record<string, { side: Color }>;
  dailyPuzzleDone?: boolean;
}): PlanStep[] {
  const steps: PlanStep[] = [];
  if (!state.dailyPuzzleDone) {
    steps.push({
      id: 'daily-puzzle',
      kind: 'review',
      title: 'Daily puzzle',
      detail: 'One position from a real game, matched to your puzzle rating.',
      to: '/puzzles/play?mode=daily',
      minutes: 2,
    });
  }
  const due = dueCards(state.cards);
  if (due.length) {
    const lines = due.filter((c) => c.kind === 'line').length;
    const puzzles = due.length - lines;
    steps.push({
      id: 'review',
      kind: 'review',
      title: `Review ${due.length} due card${due.length === 1 ? '' : 's'}`,
      detail: [lines && `${lines} opening line${lines === 1 ? '' : 's'}`, puzzles && `${puzzles} position${puzzles === 1 ? '' : 's'} from your games`]
        .filter(Boolean)
        .join(' · '),
      to: '/train/review',
      minutes: Math.max(3, Math.round(due.length * 1.2)),
    });
  }
  const unreviewed = state.games.find((g) => !g.reviewed && g.plies >= 10);
  if (unreviewed) {
    steps.push({
      id: `analyse:${unreviewed.id}`,
      kind: 'analyse',
      title: 'Review your last game with the coach',
      detail: `${unreviewed.white} vs ${unreviewed.black}${unreviewed.opening ? ` — ${unreviewed.opening}` : ''}. Mistakes become review cards.`,
      to: `/games/${unreviewed.id}`,
      minutes: 6,
    });
  }
  steps.push(...nextTrackSteps(state.plan, 2));
  const weak = findWeaknesses(state.games)[0];
  if (weak && !steps.some((s) => s.id === weak.step.id) && !state.lessons[weak.step.id.split(':')[1]]?.completed) {
    steps.push({ ...weak.step, detail: `${weak.label}. ${weak.detail}` });
  }
  const rating = estimateRating(state.games);
  const bot = suggestBot(rating);
  const repIds = Object.keys(state.repertoire);
  const recentPlay = state.games.some((g) => Date.now() - g.createdAt < 2 * 86400000 && (g.source === 'bot' || g.source === 'practice'));
  if (!recentPlay) {
    if (repIds.length) {
      const id = repIds[Math.floor((Date.now() / 86400000) % repIds.length)];
      steps.push(play(id, bot.id, state.repertoire[id].side));
    } else {
      steps.push({
        id: 'play:free',
        kind: 'play',
        title: `Training game vs ${bot.name}`,
        detail: `A ${bot.elo}-level opponent, with the coach commenting on every move.`,
        to: `/play?bot=${bot.id}`,
        minutes: 15,
      });
    }
  }
  if (!state.plan && steps.length < 3) {
    const firstLesson = TRACKS[0].steps.find((s) => !state.lessons[s.id.split(':')[1]]?.completed);
    if (firstLesson) steps.push(firstLesson);
  }
  return steps.slice(0, 6);
}
