/**
 * Puzzle collection (curated from the CC0 Lichess puzzle database), rating
 * and selection.
 */
import { Chess, uciOf, type Color, type PieceSymbol } from './chess/core';

export interface Puzzle {
  id: string;
  /** Position before the opponent's last move. */
  fen: string;
  /** moves[0] is the opponent's move; the solution follows. */
  moves: string[];
  rating: number;
  themes: string[];
  /** Library opening id (one of the 14 openings with lessons). */
  opening?: string;
  /** The side the solver plays. */
  side: Color;
  /** Opening family and variation of the source game, when Lichess recorded one. */
  family?: string;
  variation?: string;
}

interface RawDb {
  themes: string[];
  openings: string[];
  families?: string[];
  variations?: string[];
  puzzles: [string, string, string, number, number[], number, ('w' | 'b')?, number?, number?][];
}

let cache: Puzzle[] | null = null;
let loading: Promise<Puzzle[]> | null = null;

export function loadPuzzles(): Promise<Puzzle[]> {
  if (cache) return Promise.resolve(cache);
  if (!loading) {
    loading = import('../data/puzzles.json').then((m) => {
      const db = (m.default ?? m) as unknown as RawDb;
      cache = db.puzzles.map(([id, fen, mv, rating, th, op, side, fam, vr]) => ({
        id,
        fen,
        moves: mv.split(' '),
        rating,
        themes: th.map((i) => db.themes[i]),
        opening: op >= 0 ? db.openings[op] : undefined,
        side: side ?? (fen.split(' ')[1] === 'w' ? 'b' : 'w'),
        family: fam !== undefined && fam >= 0 ? db.families?.[fam] : undefined,
        variation: vr !== undefined && vr >= 0 ? db.variations?.[vr] : undefined,
      }));
      return cache;
    });
  }
  return loading;
}

export const THEME_INFO: Record<string, { label: string; about: string; group: 'Motifs' | 'Mates' | 'Endgames' | 'Phase' | 'Style' }> = {
  fork: { label: 'Fork', about: 'One piece attacks two targets at once.', group: 'Motifs' },
  pin: { label: 'Pin', about: 'A piece can’t move without exposing something more valuable behind it.', group: 'Motifs' },
  skewer: { label: 'Skewer', about: 'A valuable piece is attacked and must move, exposing the one behind it.', group: 'Motifs' },
  discoveredAttack: { label: 'Discovered attack', about: 'Moving one piece uncovers an attack by another.', group: 'Motifs' },
  doubleCheck: { label: 'Double check', about: 'Two pieces give check at once — only the king can move.', group: 'Motifs' },
  sacrifice: { label: 'Sacrifice', about: 'Give up material for something bigger.', group: 'Motifs' },
  deflection: { label: 'Deflection', about: 'Lure a defender away from its duty.', group: 'Motifs' },
  attraction: { label: 'Attraction', about: 'Force a piece (often the king) onto a fatal square.', group: 'Motifs' },
  clearance: { label: 'Clearance', about: 'Move a piece out of the way to open a line or square.', group: 'Motifs' },
  interference: { label: 'Interference', about: 'Block the line between a defender and what it protects.', group: 'Motifs' },
  xRayAttack: { label: 'X-ray', about: 'A piece attacks or defends through another piece.', group: 'Motifs' },
  capturingDefender: { label: 'Remove the defender', about: 'Capture the piece that holds everything together.', group: 'Motifs' },
  intermezzo: { label: 'In-between move', about: 'Insert a stronger move before the expected recapture.', group: 'Motifs' },
  hangingPiece: { label: 'Hanging piece', about: 'Spot the piece that is simply undefended.', group: 'Motifs' },
  trappedPiece: { label: 'Trapped piece', about: 'A piece with no escape squares can be hunted down.', group: 'Motifs' },
  quietMove: { label: 'Quiet move', about: 'The winning move is not a check or capture.', group: 'Style' },
  defensiveMove: { label: 'Defensive move', about: 'Find the only move that holds.', group: 'Style' },
  zugzwang: { label: 'Zugzwang', about: 'The opponent would love to pass — every move worsens their position.', group: 'Style' },
  promotion: { label: 'Promotion', about: 'Push a pawn to the last rank.', group: 'Motifs' },
  underPromotion: { label: 'Underpromotion', about: 'Promote to something other than a queen.', group: 'Motifs' },
  advancedPawn: { label: 'Advanced pawn', about: 'A pawn deep in enemy territory decides the game.', group: 'Motifs' },
  exposedKing: { label: 'Exposed king', about: 'Attack a king with little shelter.', group: 'Style' },
  kingsideAttack: { label: 'Kingside attack', about: 'Break through against a castled king.', group: 'Style' },
  queensideAttack: { label: 'Queenside attack', about: 'Attack a king castled on the queenside.', group: 'Style' },
  enPassant: { label: 'En passant', about: 'The special pawn capture.', group: 'Motifs' },
  castling: { label: 'Castling', about: 'Castling is the key move.', group: 'Motifs' },
  mateIn1: { label: 'Mate in 1', about: 'Find the checkmate.', group: 'Mates' },
  mateIn2: { label: 'Mate in 2', about: 'Force mate in two moves.', group: 'Mates' },
  mateIn3: { label: 'Mate in 3', about: 'Force mate in three moves.', group: 'Mates' },
  mateIn4: { label: 'Mate in 4', about: 'Force mate in four moves.', group: 'Mates' },
  backRankMate: { label: 'Back-rank mate', about: 'Mate a king trapped behind its own pawns.', group: 'Mates' },
  smotheredMate: { label: 'Smothered mate', about: 'A knight mates a king boxed in by its own pieces.', group: 'Mates' },
  anastasiaMate: { label: 'Anastasia’s mate', about: 'Knight and rook trap the king on the edge.', group: 'Mates' },
  arabianMate: { label: 'Arabian mate', about: 'Knight and rook mate in the corner.', group: 'Mates' },
  bodenMate: { label: 'Boden’s mate', about: 'Two crossing bishops mate the king.', group: 'Mates' },
  dovetailMate: { label: 'Dovetail mate', about: 'The queen mates with the king’s own pieces as walls.', group: 'Mates' },
  hookMate: { label: 'Hook mate', about: 'Rook, knight and pawn combine to mate.', group: 'Mates' },
  doubleBishopMate: { label: 'Double-bishop mate', about: 'Two bishops on adjacent diagonals.', group: 'Mates' },
  rookEndgame: { label: 'Rook endgames', about: 'Tactics and technique with rooks.', group: 'Endgames' },
  pawnEndgame: { label: 'Pawn endgames', about: 'Kings and pawns only — every tempo counts.', group: 'Endgames' },
  queenEndgame: { label: 'Queen endgames', about: 'Queen endings.', group: 'Endgames' },
  bishopEndgame: { label: 'Bishop endgames', about: 'Bishop endings.', group: 'Endgames' },
  knightEndgame: { label: 'Knight endgames', about: 'Knight endings.', group: 'Endgames' },
  opening: { label: 'Opening tactics', about: 'Tricks from the first moves.', group: 'Phase' },
  middlegame: { label: 'Middlegame', about: 'Middlegame tactics.', group: 'Phase' },
  endgame: { label: 'Endgame', about: 'Endgame tactics.', group: 'Phase' },
};

/** Short tag line: side, opening and themes, for showing on a puzzle. */
export function puzzleTags(p: Puzzle): { side: string; opening?: string; themes: string[] } {
  const themes = p.themes.filter((t) => THEME_INFO[t] && THEME_INFO[t].group !== 'Phase').map((t) => THEME_INFO[t].label);
  return {
    side: p.side === 'w' ? 'You play White' : 'You play Black',
    opening: p.family ? `${p.family}${p.variation && p.variation !== 'Other variations' ? `, ${p.variation}` : ''}` : undefined,
    themes,
  };
}

export function puzzleStart(p: Puzzle) {
  const c = new Chess(p.fen);
  const u = p.moves[0];
  const m = c.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: (u[4] as PieceSymbol) || undefined });
  return { fen: c.fen(), setup: m, side: c.turn() as Color };
}

export function isMaster(p: Puzzle) {
  return p.themes.includes('master') || p.themes.includes('masterVsMaster') || p.themes.includes('superGM');
}

/** Puzzle-rating update (Elo with a shrinking K). */
export function updateRating(rating: number, puzzleRating: number, ok: boolean, attempts: number) {
  const k = Math.max(16, 48 - attempts * 0.25);
  const expected = 1 / (1 + Math.pow(10, (puzzleRating - rating) / 400));
  return Math.round(rating + k * ((ok ? 1 : 0) - expected));
}

export function pickPuzzle(
  all: Puzzle[],
  opts: { rating: number; seen: Set<string>; filter?: (p: Puzzle) => boolean; spread?: number },
): Puzzle | undefined {
  const pool = opts.filter ? all.filter(opts.filter) : all;
  for (const spread of [opts.spread ?? 120, 250, 500, 5000]) {
    const near = pool.filter((p) => Math.abs(p.rating - opts.rating) <= spread && !opts.seen.has(p.id));
    if (near.length) return near[Math.floor(Math.random() * near.length)];
  }
  return pool[Math.floor(Math.random() * pool.length)];
}

/** A stable puzzle for today's date, near the given rating. */
export function dailyPuzzle(all: Puzzle[], rating: number, date = new Date()): Puzzle | undefined {
  const key = date.toISOString().slice(0, 10);
  let h = 0;
  for (const ch of key) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const pool = all.filter((p) => Math.abs(p.rating - Math.max(1200, rating)) <= 200 && p.moves.length >= 4);
  return pool.length ? pool[h % pool.length] : all[h % all.length];
}

/** Puzzle Rush: increasing difficulty from an easy start. */
export function rushPuzzle(all: Puzzle[], index: number, seen: Set<string>): Puzzle | undefined {
  const target = 600 + index * 55 + (index > 20 ? (index - 20) * 25 : 0);
  return pickPuzzle(all, { rating: target, seen, spread: 80, filter: (p) => p.moves.length <= 8 });
}

export function uciFromMove(m: { from: string; to: string; promotion?: string }) {
  return uciOf(m);
}
