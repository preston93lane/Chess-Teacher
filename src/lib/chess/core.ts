import { Chess, type Move, type Square, type PieceSymbol, type Color } from 'chess.js';

export type { Move, Square, PieceSymbol, Color };
export { Chess };

export const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

export const FILES = 'abcdefgh';

export const PIECE_VALUE: Record<PieceSymbol, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };

export const PIECE_NAME: Record<PieceSymbol, string> = {
  p: 'pawn',
  n: 'knight',
  b: 'bishop',
  r: 'rook',
  q: 'queen',
  k: 'king',
};

export const COLOR_NAME: Record<Color, string> = { w: 'White', b: 'Black' };

export function other(c: Color): Color {
  return c === 'w' ? 'b' : 'w';
}

/** Position identity without move counters (used for book / ECO lookups). */
export function fenKey(fen: string): string {
  const parts = fen.split(' ');
  // Normalise en passant: keep only if a capture is actually possible.
  const ep = parts[3];
  if (ep && ep !== '-') {
    try {
      const c = new Chess(fen);
      const legalEp = c.moves({ verbose: true }).some((m) => m.flags.includes('e'));
      if (!legalEp) parts[3] = '-';
    } catch {
      parts[3] = '-';
    }
  }
  return parts.slice(0, 4).join(' ');
}

export function sideToMove(fen: string): Color {
  return fen.split(' ')[1] === 'b' ? 'b' : 'w';
}

export function moveNumber(fen: string): number {
  return parseInt(fen.split(' ')[5] || '1', 10);
}

export function sqFile(sq: Square): number {
  return sq.charCodeAt(0) - 97;
}
export function sqRank(sq: Square): number {
  return parseInt(sq[1], 10) - 1;
}
export function toSq(file: number, rank: number): Square {
  return (FILES[file] + (rank + 1)) as Square;
}
export function onBoard(file: number, rank: number) {
  return file >= 0 && file < 8 && rank >= 0 && rank < 8;
}
export function isLightSquare(sq: Square) {
  return (sqFile(sq) + sqRank(sq)) % 2 === 1;
}

export function uciOf(m: { from: string; to: string; promotion?: string }): string {
  return m.from + m.to + (m.promotion ?? '');
}

export function parseUci(uci: string): { from: Square; to: Square; promotion?: PieceSymbol } {
  return {
    from: uci.slice(0, 2) as Square,
    to: uci.slice(2, 4) as Square,
    promotion: uci.length > 4 ? (uci[4] as PieceSymbol) : undefined,
  };
}

/** Safely apply a UCI move to a FEN and return the verbose move + new FEN. */
export function applyUci(fen: string, uci: string): { move: Move; fen: string } | null {
  try {
    const c = new Chess(fen);
    const move = c.move(parseUci(uci));
    return { move, fen: c.fen() };
  } catch {
    return null;
  }
}

export function applySan(fen: string, san: string): { move: Move; fen: string } | null {
  try {
    const c = new Chess(fen);
    const move = c.move(san);
    return { move, fen: c.fen() };
  } catch {
    return null;
  }
}

/** Convert a UCI principal variation into SAN, stopping at the first illegal move. */
export function pvToSan(fen: string, pv: string[], max = 99): string[] {
  const out: string[] = [];
  const c = new Chess(fen);
  for (const u of pv.slice(0, max)) {
    try {
      out.push(c.move(parseUci(u)).san);
    } catch {
      break;
    }
  }
  return out;
}

/** Format a SAN sequence with move numbers, starting from the given FEN. */
export function formatLine(fen: string, sans: string[]): string {
  let num = moveNumber(fen);
  let turn = sideToMove(fen);
  const parts: string[] = [];
  sans.forEach((san, i) => {
    if (turn === 'w') parts.push(`${num}.${san}`);
    else parts.push(i === 0 ? `${num}…${san}` : san);
    if (turn === 'b') num++;
    turn = other(turn);
  });
  return parts.join(' ');
}

/** "12.Nf3" or "12…Nf6" label for a single move given the FEN before it. */
export function moveLabel(fenBefore: string, san: string): string {
  const n = moveNumber(fenBefore);
  return sideToMove(fenBefore) === 'w' ? `${n}.${san}` : `${n}…${san}`;
}

export function plyToMoveNo(ply: number): { num: number; color: Color } {
  // ply index 0 = White's first move
  return { num: Math.floor(ply / 2) + 1, color: ply % 2 === 0 ? 'w' : 'b' };
}

export function materialCount(fen: string): Record<Color, number> {
  const res: Record<Color, number> = { w: 0, b: 0 };
  const board = fen.split(' ')[0];
  for (const ch of board) {
    const lower = ch.toLowerCase();
    if (lower in PIECE_VALUE) {
      const v = PIECE_VALUE[lower as PieceSymbol];
      if (ch === lower) res.b += v;
      else res.w += v;
    }
  }
  return res;
}

export function uid(prefix = ''): string {
  return prefix + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}
