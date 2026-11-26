/**
 * Bot personalities: an opening repertoire plus a bias in how the bot chooses
 * among moves the engine rates as roughly equal.
 */
import { Chess, START_FEN, type Color, type Move } from './chess/core';
import type { EngineLine } from './engine/stockfish';
import { getOpening, openingBookMoves, pickWeighted } from './openings/book';
import { familyOf, loadEcoLines } from './quiz';

export type StyleId = 'balanced' | 'attacker' | 'solid' | 'gambiteer' | 'positional' | 'hypermodern';

export interface BotStyle {
  id: StyleId;
  name: string;
  blurb: string;
  /** Library opening ids or "eco:<Family>" in order of preference. */
  white: string[];
  black: { e4: string[]; d4: string[]; other: string[] };
}

export const STYLES: BotStyle[] = [
  { id: 'balanced', name: 'Balanced', blurb: 'Plays the engine’s choice for its level — no particular taste.', white: [], black: { e4: [], d4: [], other: [] } },
  {
    id: 'attacker',
    name: 'The Attacker',
    blurb: 'Open games, kings on opposite wings, checks and sacrifices. King’s Gambit and Italian; Dragon and King’s Indian.',
    white: ['eco:King\'s Gambit', 'italian', 'eco:Scotch Game'],
    black: { e4: ['dragon', 'najdorf'], d4: ['kings-indian', 'eco:Dutch Defense'], other: ['kings-indian'] },
  },
  {
    id: 'solid',
    name: 'The Wall',
    blurb: 'Safe king, sound structure, happy to trade. London and Queen’s Gambit; Caro-Kann and Slav.',
    white: ['london', 'queens-gambit'],
    black: { e4: ['caro-kann', 'eco:Petrov\'s Defense'], d4: ['slav', 'queens-gambit'], other: ['slav'] },
  },
  {
    id: 'gambiteer',
    name: 'The Gambiteer',
    blurb: 'Gives pawns for time and open lines. King’s and Evans-style gambits; Marshall, Benko and Budapest.',
    white: ['eco:King\'s Gambit', 'eco:Vienna Game', 'italian'],
    black: { e4: ['ruy-lopez', 'eco:Two Knights Defense'], d4: ['eco:Benko Gambit', 'eco:Budapest Gambit'], other: ['eco:Benko Gambit'] },
  },
  {
    id: 'positional',
    name: 'The Professor',
    blurb: 'Quiet improving moves, good pieces against bad ones. Catalan and Ruy Lopez; French and Nimzo-Indian.',
    white: ['catalan', 'ruy-lopez', 'queens-gambit'],
    black: { e4: ['french', 'ruy-lopez'], d4: ['nimzo-indian', 'queens-gambit'], other: ['nimzo-indian'] },
  },
  {
    id: 'hypermodern',
    name: 'The Hypermodern',
    blurb: 'Controls the center from a distance with fianchettoes. English and Réti; Pirc, Alekhine and Grünfeld.',
    white: ['english', 'eco:Réti Opening'],
    black: { e4: ['eco:Pirc Defense', 'eco:Alekhine Defense', 'eco:Modern Defense'], d4: ['grunfeld', 'eco:Queen\'s Indian Defense'], other: ['grunfeld'] },
  },
];

export function getStyle(id?: string): BotStyle {
  return STYLES.find((s) => s.id === id) ?? STYLES[0];
}

/** A repertoire move for the style, or null when out of its book. */
export async function styleBookMove(style: BotStyle, startFen: string, sans: string[], fen: string, botColor: Color): Promise<string | null> {
  if (style.id === 'balanced' || startFen !== START_FEN || sans.length >= 24) return null;
  const list = botColor === 'w' ? style.white : sans[0] === 'e4' ? style.black.e4 : sans[0] === 'd4' ? style.black.d4 : style.black.other;
  // A little variety: sometimes try the second choice first.
  const order = list.length > 1 && Math.random() < 0.35 ? [list[1], list[0], ...list.slice(2)] : list;
  for (const entry of order) {
    if (entry.startsWith('eco:')) {
      const family = entry.slice(4);
      const lines = await loadEcoLines();
      const counts = new Map<string, number>();
      const prefix = sans.join(' ');
      for (const [, name, mv] of lines) {
        if (familyOf(name) !== family && !name.includes(family)) continue;
        const ms = mv.split(' ');
        if (ms.length <= sans.length) continue;
        if (sans.length && ms.slice(0, sans.length).join(' ') !== prefix) continue;
        counts.set(ms[sans.length], (counts.get(ms[sans.length]) ?? 0) + 1);
      }
      const pick = pickWeighted([...counts.entries()].map(([san, count]) => ({ san, count })));
      if (pick) {
        try {
          const m = new Chess(fen).move(pick.san);
          return m.from + m.to + (m.promotion ?? '');
        } catch {
          /* not legal here */
        }
      }
    } else {
      const o = getOpening(entry);
      if (!o) continue;
      const pick = pickWeighted(openingBookMoves(o, fen));
      if (pick) return pick.uci;
    }
  }
  return null;
}

function chebyshev(a: string, b: string) {
  return Math.max(Math.abs(a.charCodeAt(0) - b.charCodeAt(0)), Math.abs(+a[1] - +b[1]));
}

/** Style preference score for a move (higher = more in character). */
export function styleScore(style: StyleId, fen: string, m: Move): number {
  if (style === 'balanced') return 0;
  const c = new Chess(fen);
  const them: Color = m.color === 'w' ? 'b' : 'w';
  const board = c.board().flat();
  const theirKing = board.find((p) => p && p.type === 'k' && p.color === them)?.square;
  const myKing = board.find((p) => p && p.type === 'k' && p.color === m.color)?.square;
  const check = m.san.includes('+') || m.san.includes('#');
  const capture = !!m.captured;
  const castle = m.san.startsWith('O-O');
  const closer = theirKing ? chebyshev(m.from, theirKing) - chebyshev(m.to, theirKing) : 0;
  const pawnNearMyKing = m.piece === 'p' && myKing ? Math.abs(m.from.charCodeAt(0) - myKing.charCodeAt(0)) <= 1 : false;
  const pawnStorm = m.piece === 'p' && theirKing ? Math.abs(m.from.charCodeAt(0) - theirKing.charCodeAt(0)) <= 1 : false;
  const homeRank = m.color === 'w' ? '1' : '8';
  const develops = (m.piece === 'n' || m.piece === 'b') && m.from[1] === homeRank;
  const value: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
  const evenTrade = capture && value[m.captured!] === value[m.piece];
  const fianchetto = m.piece === 'b' && ['g2', 'b2', 'g7', 'b7'].includes(m.to);
  switch (style) {
    case 'attacker':
      return (check ? 2 : 0) + (capture ? 1 : 0) + Math.max(0, closer) * 0.8 + (pawnStorm ? 1.2 : 0) - (evenTrade ? 0.5 : 0);
    case 'gambiteer':
      return (check ? 1.5 : 0) + (develops ? 1.2 : 0) + (capture ? 1 : 0) + Math.max(0, closer) * 0.5 + (castle ? 0.5 : 0);
    case 'solid':
      return (castle ? 2 : 0) + (evenTrade ? 1.2 : 0) - (pawnNearMyKing ? 1.5 : 0) - (check && !capture ? 0.3 : 0) + (develops ? 0.5 : 0);
    case 'positional':
      return (!capture && !check && m.piece !== 'p' ? 1 : 0) + (develops ? 0.8 : 0) - (capture && !evenTrade ? 0.2 : 0) - (pawnNearMyKing ? 1 : 0);
    case 'hypermodern':
      return (fianchetto ? 2 : 0) + (m.piece === 'p' && ['c', 'f'].includes(m.to[0]) ? 0.8 : 0) + (!capture && m.piece !== 'p' ? 0.5 : 0);
  }
  return 0;
}

/**
 * Choose among engine lines that are about as good as the move the bot would
 * play anyway (`refUci`, default the top line), preferring moves in character.
 */
export function pickStyled(style: StyleId, fen: string, lines: EngineLine[], marginCp: number, refUci?: string): string | null {
  if (style === 'balanced' || lines.length < 2) return null;
  const sign = fen.split(' ')[1] === 'w' ? 1 : -1;
  const cp = (l: EngineLine) => (l.mate !== undefined ? (l.mate > 0 ? 10000 - l.mate : -10000 - l.mate) : l.cp ?? 0) * sign;
  const ref = lines.find((l) => l.pv[0] === refUci) ?? lines[0];
  const base = cp(ref);
  if (Math.abs(cp(lines[0])) > 5000) return null; // don't get creative when there is a forced mate
  let pick: { uci: string; score: number } | null = null;
  for (const l of lines) {
    const drop = base - cp(l);
    if (!l.pv[0] || drop > marginCp) continue;
    let m: Move;
    try {
      m = new Chess(fen).move({ from: l.pv[0].slice(0, 2), to: l.pv[0].slice(2, 4), promotion: l.pv[0][4] || undefined });
    } catch {
      continue;
    }
    const s = styleScore(style, fen, m) - Math.max(0, drop) / 60;
    if (!pick || s > pick.score) pick = { uci: l.pv[0], score: s };
  }
  return pick?.uci ?? null;
}

/** How far (centipawns) a bot of this strength will stray for a move it likes. */
export function styleMargin(elo: number) {
  return Math.min(90, 25 + Math.max(0, 2600 - elo) / 25);
}
