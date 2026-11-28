/**
 * Chess personality: a short quiz gives a style (the same six styles as the
 * bot personalities), a starting level, a weak spot to focus on and a daily
 * goal. The style and level pick a starter repertoire from the library, which
 * the Learn path then teaches a little at a time.
 */
import type { StyleId } from '../styles';
import type { LevelId } from './types';

export type Focus = 'tactics' | 'defence' | 'plans' | 'endgames' | 'openings';

export interface PlayerProfile {
  style: StyleId;
  rating: number;
  level: LevelId;
  focus: Focus;
  /** Daily XP goal. */
  goal: number;
  white: string;
  vsE4: string;
  vsD4: string;
  createdAt: number;
  scores: Partial<Record<StyleId, number>>;
  /** Unit the learner chose to start from (defaults to the first unit of `level`). */
  startUnit?: string;
  /** Result of the placement game, if played. */
  placement?: { elo: number; accuracy: number; chances: number; punished: number; moves: number; at: number };
}

type Weights = Partial<Record<StyleId, number>>;

export interface QuizOption {
  label: string;
  sub?: string;
  w?: Weights;
  rating?: number;
  focus?: Focus;
  goal?: number;
}

export interface QuizQuestion {
  id: string;
  ask: string;
  /** Optional board for the question. */
  fen?: string;
  pgn?: string;
  orientation?: 'w' | 'b';
  options: QuizOption[];
}

export const QUIZ: QuizQuestion[] = [
  {
    id: 'level',
    ask: 'First things first — where is your chess right now?',
    options: [
      { label: 'Brand new', sub: 'I know how the pieces move', rating: 350 },
      { label: 'Casual player', sub: 'I play for fun, under about 800 online', rating: 650 },
      { label: 'Improving', sub: 'Around 800–1200 online', rating: 1000 },
      { label: 'Club player', sub: 'Around 1200–1600', rating: 1400 },
      { label: 'Strong club player', sub: '1600 and up', rating: 1700 },
    ],
  },
  {
    id: 'ideal',
    ask: 'Your dream game looks like…',
    options: [
      { label: 'A wild attack with sacrifices on the king', w: { attacker: 3, gambiteer: 1 } },
      { label: 'A slow squeeze — they never get a chance', w: { positional: 3, solid: 1 } },
      { label: 'Rock-solid, no risks, win the endgame', w: { solid: 3, positional: 1 } },
      { label: 'Let them build a big centre, then blow it up', w: { hypermodern: 3, attacker: 1 } },
    ],
  },
  {
    id: 'gambit',
    ask: 'Would you give a pawn to get your pieces out fast?',
    options: [
      { label: 'Always — pawns are for throwing', w: { gambiteer: 3, attacker: 1 } },
      { label: 'If the attack looks good', w: { attacker: 2, balanced: 1 } },
      { label: 'Rarely — material matters', w: { positional: 2, solid: 1 } },
      { label: 'Never', w: { solid: 3 } },
    ],
  },
  {
    id: 'qgd',
    ask: 'You’re Black. White offers the c-pawn. What feels right?',
    pgn: '1.d4 d5 2.c4',
    orientation: 'b',
    options: [
      { label: '…e6 — classical, solid centre', w: { positional: 2, solid: 1 } },
      { label: '…c6 — the Slav, a wall', w: { solid: 3 } },
      { label: '…dxc4 — take it and hit back later', w: { gambiteer: 1, hypermodern: 2 } },
      { label: '…e5!? — a counter-gambit, chaos', w: { gambiteer: 3, attacker: 1 } },
    ],
  },
  {
    id: 'piece',
    ask: 'Pick your favourite piece.',
    options: [
      { label: 'Queen', sub: 'Power', w: { attacker: 2 } },
      { label: 'Knight', sub: 'Tricks', w: { hypermodern: 1, gambiteer: 1, attacker: 1 } },
      { label: 'Bishop', sub: 'Long diagonals', w: { hypermodern: 2, positional: 1 } },
      { label: 'Rook', sub: 'Open files — like me!', w: { positional: 2, solid: 1 } },
      { label: 'Pawn', sub: 'The soul of chess', w: { solid: 2, positional: 1 } },
    ],
  },
  {
    id: 'ahead',
    ask: 'You’re a pawn up in a quiet position. You…',
    options: [
      { label: 'Trade pieces and grind out the endgame', w: { positional: 2, solid: 2 } },
      { label: 'Keep pieces on and go for the king', w: { attacker: 3 } },
      { label: 'Give it back if it gets me the initiative', w: { gambiteer: 2, hypermodern: 1 } },
    ],
  },
  {
    id: 'lose',
    ask: 'Be honest — how do you lose most games?',
    options: [
      { label: 'I hang pieces or miss tactics', focus: 'tactics' },
      { label: 'I get attacked and crushed', focus: 'defence' },
      { label: 'I don’t know what to do after the opening', focus: 'plans' },
      { label: 'I mess up won endgames', focus: 'endgames' },
      { label: 'My openings go wrong early', focus: 'openings' },
    ],
  },
  {
    id: 'time',
    ask: 'How much time can you train each day?',
    options: [
      { label: '5 minutes', sub: 'Casual · 20 XP a day', goal: 20 },
      { label: '10 minutes', sub: 'Regular · 40 XP a day', goal: 40 },
      { label: '20 minutes', sub: 'Serious · 80 XP a day', goal: 80 },
      { label: '30+ minutes', sub: 'Intense · 120 XP a day', goal: 120 },
    ],
  },
];

export const STYLE_PORTRAIT: Record<StyleId, { name: string; line: string; strengths: string; watch: string }> = {
  attacker: {
    name: 'The Attacker',
    line: 'You want the king. Open lines, sacrifices, initiative.',
    strengths: 'Initiative, tactics, punishing slow play.',
    watch: 'Over-pressing and leaving your own king bare.',
  },
  solid: {
    name: 'The Wall',
    line: 'Sound structure, safe king, and patience.',
    strengths: 'Few blunders, good endgames, hard to beat.',
    watch: 'Passivity — sometimes you must strike.',
  },
  gambiteer: {
    name: 'The Gambiteer',
    line: 'Pawns are a fair price for time and open lines.',
    strengths: 'Fast development, practical chances, scary to face.',
    watch: 'Running out of steam a pawn down.',
  },
  positional: {
    name: 'The Professor',
    line: 'Good pieces against bad ones, squeezed slowly.',
    strengths: 'Plans, piece quality, technique.',
    watch: 'Missing sharp tactics when the position opens.',
  },
  hypermodern: {
    name: 'The Hypermodern',
    line: 'Control the centre from a distance, then strike it.',
    strengths: 'Flexible setups, counter-punching.',
    watch: 'Letting the opponent’s centre get too big.',
  },
  balanced: {
    name: 'The All-rounder',
    line: 'No fixed taste — you play the position in front of you.',
    strengths: 'Flexibility.',
    watch: 'Not having a repertoire you know deeply.',
  },
};

export const FOCUS_INFO: Record<Focus, { label: string; units: string[] }> = {
  tactics: { label: 'Tactics and blunder checks', units: ['b3', 'n1', 'n2', 'n4', 'i1', 'i2'] },
  defence: { label: 'Defending and king safety', units: ['b2', 'n3', 'i3', 'x2'] },
  plans: { label: 'Middlegame plans', units: ['i4', 'x3'] },
  endgames: { label: 'Endgame technique', units: ['b5', 'n5', 'i5', 'x5'] },
  openings: { label: 'Opening knowledge', units: ['b4'] },
};

export function levelForRating(r: number): LevelId {
  if (r < 600) return 'basics';
  if (r < 1000) return 'beginner';
  if (r < 1500) return 'intermediate';
  return 'expert';
}

/** Starter repertoire per style. Lower levels get the simpler choices. */
const REPS: Record<StyleId, { white: [string, string]; vsE4: [string, string]; vsD4: [string, string] }> = {
  // [simpler (under 1000), full]
  attacker: { white: ['italian', 'italian'], vsE4: ['caro-kann', 'dragon'], vsD4: ['kings-indian', 'kings-indian'] },
  solid: { white: ['london', 'london'], vsE4: ['caro-kann', 'caro-kann'], vsD4: ['slav', 'slav'] },
  gambiteer: { white: ['italian', 'queens-gambit'], vsE4: ['french', 'najdorf'], vsD4: ['slav', 'grunfeld'] },
  positional: { white: ['london', 'queens-gambit'], vsE4: ['french', 'french'], vsD4: ['slav', 'nimzo-indian'] },
  hypermodern: { white: ['london', 'english'], vsE4: ['caro-kann', 'dragon'], vsD4: ['kings-indian', 'grunfeld'] },
  balanced: { white: ['italian', 'italian'], vsE4: ['caro-kann', 'caro-kann'], vsD4: ['slav', 'nimzo-indian'] },
};

export function repertoireFor(style: StyleId, rating: number) {
  const r = REPS[style];
  const i = rating < 1000 ? 0 : 1;
  return { white: r.white[i], vsE4: r.vsE4[i], vsD4: r.vsD4[i] };
}

/** The library openings you can choose for each slot. */
export const SLOT_CHOICES = {
  white: ['italian', 'london', 'queens-gambit', 'ruy-lopez', 'english', 'catalan'],
  vsE4: ['caro-kann', 'french', 'dragon', 'najdorf'],
  vsD4: ['slav', 'kings-indian', 'nimzo-indian', 'grunfeld'],
} as const;

export function scoreQuiz(answers: Record<string, number>): Omit<PlayerProfile, 'createdAt'> {
  const scores: Partial<Record<StyleId, number>> = {};
  let rating = 1000;
  let focus: Focus = 'tactics';
  let goal = 40;
  for (const q of QUIZ) {
    const a = answers[q.id];
    if (a === undefined) continue;
    const o = q.options[a];
    if (!o) continue;
    for (const [k, v] of Object.entries(o.w ?? {})) scores[k as StyleId] = (scores[k as StyleId] ?? 0) + (v ?? 0);
    if (o.rating) rating = o.rating;
    if (o.focus) focus = o.focus;
    if (o.goal) goal = o.goal;
  }
  const ranked = (Object.entries(scores) as [StyleId, number][]).filter(([k]) => k !== 'balanced').sort((a, b) => b[1] - a[1]);
  // A near-tie at the top means no strong taste.
  const style: StyleId = !ranked.length || (ranked[1] && ranked[0][1] - ranked[1][1] < 1 && ranked[0][1] < 6) ? 'balanced' : ranked[0][0];
  return { style, rating, level: levelForRating(rating), focus, goal, scores, ...repertoireFor(style, rating) };
}
