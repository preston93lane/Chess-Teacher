/**
 * Motif detection for a single move and outcome analysis for an engine line.
 * Everything here is heuristic: it labels what a strong player would point at.
 */
import { Chess, PIECE_NAME, parseUci, type Color, type Move, type PieceSymbol } from '../chess/core';
import {
  VALUE,
  attackersOf,
  attacksFrom,
  hangingPieces,
  idx,
  kingIndex,
  makeMove,
  parseBoard,
  rayHits,
  see,
  sliderDirs,
  sqName,
  type BoardModel,
} from './board';

export type MotifKind =
  | 'check'
  | 'double-check'
  | 'discovered-check'
  | 'discovered-attack'
  | 'fork'
  | 'pin'
  | 'skewer'
  | 'free-capture'
  | 'trade'
  | 'sacrifice'
  | 'hangs'
  | 'mate'
  | 'promotion'
  | 'attack';

export interface Motif {
  kind: MotifKind;
  text: string;
  squares?: string[];
}

const name = (t: PieceSymbol) => PIECE_NAME[t];
const val = (t: PieceSymbol) => VALUE[t];

function targetsOf(b: BoardModel, from: number, mover: Color) {
  const res: { i: number; type: PieceSymbol; defended: boolean }[] = [];
  const opp: Color = mover === 'w' ? 'b' : 'w';
  for (const t of attacksFrom(b, from)) {
    const p = b.sq[t];
    if (p && p.color === opp) {
      res.push({ i: t, type: p.type, defended: attackersOf(b, t, opp).length > 0 });
    }
  }
  return res;
}

/** Detect the tactical content of `move` played from `fenBefore`. */
export function moveMotifs(fenBefore: string, move: Move): Motif[] {
  const motifs: Motif[] = [];
  const before = parseBoard(fenBefore);
  const from = idx(move.from);
  const to = idx(move.to);
  const after = makeMove(before, from, to, move.promotion as PieceSymbol | undefined);
  const mover = move.color;
  const opp: Color = mover === 'w' ? 'b' : 'w';
  const piece = after.sq[to]!;
  const oppKing = kingIndex(after, opp);

  // --- checks ---
  const checkers = oppKing >= 0 ? attackersOf(after, oppKing, mover) : [];
  const isMate = move.san.includes('#');
  if (isMate) motifs.push({ kind: 'mate', text: 'Checkmate.' });
  if (checkers.length >= 2) motifs.push({ kind: 'double-check', text: 'Double check — the king must move.' });
  else if (checkers.length === 1 && checkers[0] !== to) {
    const cp = after.sq[checkers[0]]!;
    motifs.push({
      kind: 'discovered-check',
      text: `Discovered check from the ${name(cp.type)} on ${sqName(checkers[0])}.`,
      squares: [sqName(checkers[0])],
    });
  } else if (checkers.length === 1) motifs.push({ kind: 'check', text: 'Check.' });

  // --- capture quality ---
  if (move.captured) {
    const captured = move.captured as PieceSymbol;
    const recapture = see(after, to, opp); // what opponent wins back by capturing on `to`
    const net = val(captured) - Math.max(0, recapture);
    if (attackersOf(after, to, opp).length === 0 || recapture <= 0) {
      motifs.push({
        kind: 'free-capture',
        text: `Wins the ${name(captured)} on ${move.to} for free.`,
        squares: [move.to],
      });
    } else if (net <= -1.5) {
      motifs.push({
        kind: 'sacrifice',
        text: `Gives up the ${name(piece.type)} for the ${name(captured)}.`,
        squares: [move.to],
      });
    } else if (Math.abs(net) < 0.9) {
      motifs.push({ kind: 'trade', text: `Trades on ${move.to}.`, squares: [move.to] });
    }
  }

  // --- piece left en prise (sacrifice or blunder; caller decides) ---
  if (piece.type !== 'k') {
    const loss = see(after, to, opp);
    if (loss >= 1.9 && !move.captured) {
      motifs.push({
        kind: 'hangs',
        text: `The ${name(piece.type)} on ${move.to} can be taken.`,
        squares: [move.to],
      });
    }
  }

  // --- forks ---
  const moverSafe = piece.type === 'k' || see(after, to, opp) <= 0.1;
  if (moverSafe) {
    const targets = targetsOf(after, to, mover).filter(
      (t) => t.type === 'k' || val(t.type) > val(piece.type) + 0.5 || (!t.defended && val(t.type) >= 3),
    );
    if (targets.length >= 2) {
      const names = targets
        .sort((a, b) => val(b.type) - val(a.type))
        .map((t) => `${t.type === 'k' ? 'king' : name(t.type)} on ${sqName(t.i)}`);
      motifs.push({
        kind: 'fork',
        text: `Fork: the ${name(piece.type)} hits the ${names.slice(0, 2).join(' and the ')}.`,
        squares: targets.map((t) => sqName(t.i)),
      });
    }
  }

  // --- pins & skewers created by the moved piece ---
  const moverLoss = piece.type === 'k' ? 0 : see(after, to, opp);
  for (const [df, dr] of moverLoss > 0.1 ? [] : sliderDirs(piece.type)) {
    const hits = rayHits(after, to, df, dr);
    if (hits.length < 2) continue;
    const [a, c] = hits.map((i) => after.sq[i]!);
    if (a.color !== opp || c.color !== opp) continue;
    // The front piece must not simply be able to take the attacker on equal terms.
    const frontHitsBack = attacksFrom(after, hits[0]).includes(to);
    if (frontHitsBack && a.type !== 'k' && val(a.type) <= val(piece.type) + 0.5) continue;
    if (c.type === 'k' || (val(c.type) > val(a.type) + 0.5 && val(c.type) >= 5)) {
      if (val(a.type) < val(piece.type) && attackersOf(after, hits[0], opp).length > 0 && c.type !== 'k') continue;
      motifs.push({
        kind: 'pin',
        text:
          c.type === 'k'
            ? `Pins the ${name(a.type)} on ${sqName(hits[0])} to the king.`
            : `Pins the ${name(a.type)} on ${sqName(hits[0])} to the ${name(c.type)}.`,
        squares: [sqName(hits[0]), sqName(hits[1])],
      });
    } else if (
      (a.type === 'k' || val(a.type) > val(piece.type) + 0.5) &&
      (a.type === 'k' || val(a.type) > val(c.type) + 0.5) &&
      (attackersOf(after, hits[1], opp).length === 0 || val(c.type) >= val(piece.type))
    ) {
      motifs.push({
        kind: 'skewer',
        text: `Skewer: the ${a.type === 'k' ? 'king' : name(a.type)} must move and the ${name(c.type)} on ${sqName(
          hits[1],
        )} falls.`,
        squares: [sqName(hits[0]), sqName(hits[1])],
      });
    }
  }

  // --- discovered attacks (other pieces newly attacking valuable targets) ---
  for (let i = 0; i < 64; i++) {
    const p = after.sq[i];
    if (!p || p.color !== mover || i === to || !['b', 'r', 'q'].includes(p.type)) continue;
    const beforeAtt = new Set(attacksFrom(before, i));
    for (const t of attacksFrom(after, i)) {
      const target = after.sq[t];
      if (!target || target.color !== opp || beforeAtt.has(t) || target.type === 'k') continue;
      if (val(target.type) >= 3 && (val(target.type) > val(p.type) || attackersOf(after, t, opp).length === 0)) {
        motifs.push({
          kind: 'discovered-attack',
          text: `Uncovers an attack by the ${name(p.type)} on the ${name(target.type)} on ${sqName(t)}.`,
          squares: [sqName(i), sqName(t)],
        });
      }
    }
  }

  if (move.promotion) motifs.push({ kind: 'promotion', text: `Promotes to a ${name(move.promotion as PieceSymbol)}.` });

  // --- simple new attacks on loose or bigger pieces ---
  if (!motifs.some((m) => m.kind === 'fork')) {
    const beforeTargets = new Set(attacksFrom(before, from).map((x) => x));
    for (const t of targetsOf(after, to, mover)) {
      if (t.type === 'k') continue;
      if (beforeTargets.has(t.i) && from !== to) continue;
      if (val(t.type) > val(piece.type) + 0.5 || (!t.defended && val(t.type) >= 1)) {
        motifs.push({
          kind: 'attack',
          text: `Attacks the ${name(t.type)} on ${sqName(t.i)}.`,
          squares: [sqName(t.i)],
        });
        break;
      }
    }
  }
  return motifs;
}

export interface LineOutcome {
  /** Material swing (pawns) for the side to move at the start, after the line settles. */
  material: number;
  mateFor?: Color;
  mateIn?: number;
  /** Plies examined. */
  plies: number;
  /** Piece types lost by each side along the settled line. */
  lost: Record<Color, PieceSymbol[]>;
  sans: string[];
}

/**
 * Walk an engine PV and measure what it achieves materially. Stops once the
 * position is quiet (no capture/check pending) after at least two plies.
 */
export function lineOutcome(fen: string, pv: string[], maxPlies = 10): LineOutcome {
  const chess = new Chess(fen);
  const side = chess.turn();
  const lost: Record<Color, PieceSymbol[]> = { w: [], b: [] };
  const sans: string[] = [];
  let material = 0;
  let settledMaterial = 0;
  let settledLost: Record<Color, PieceSymbol[]> = { w: [], b: [] };
  let plies = 0;
  for (let i = 0; i < Math.min(pv.length, maxPlies); i++) {
    let m: Move;
    try {
      m = chess.move(parseUci(pv[i]));
    } catch {
      break;
    }
    sans.push(m.san);
    plies++;
    if (m.captured) {
      const v = Math.round(VALUE[m.captured as PieceSymbol]);
      lost[m.color === 'w' ? 'b' : 'w'].push(m.captured as PieceSymbol);
      material += m.color === side ? v : -v;
    }
    if (m.promotion) {
      const v = Math.round(VALUE[m.promotion as PieceSymbol]) - 1;
      material += m.color === side ? v : -v;
    }
    if (chess.isCheckmate()) {
      return { material, mateFor: m.color, mateIn: Math.ceil(plies / 2), plies, lost, sans };
    }
    const next = pv[i + 1];
    let nextIsCapture = false;
    if (next) {
      const { to } = parseUci(next);
      nextIsCapture = !!chess.get(to);
    }
    if (i >= 1 && !nextIsCapture && !chess.inCheck()) {
      settledMaterial = material;
      settledLost = { w: [...lost.w], b: [...lost.b] };
      if (i >= 3) break;
    }
  }
  if (settledLost.w.length === 0 && settledLost.b.length === 0 && plies > 0) {
    settledMaterial = material;
    settledLost = lost;
  }
  return { material: settledMaterial, plies, lost: settledLost, sans };
}

/** Describe a material swing like "wins a knight" / "loses the exchange". */
export function materialPhrase(lostByOpp: PieceSymbol[], lostBySelf: PieceSymbol[], net: number): string | null {
  if (Math.abs(net) < 1) return null;
  const sum = (arr: PieceSymbol[]) => arr.reduce((s, t) => s + Math.round(VALUE[t]), 0);
  const gained = sum(lostByOpp);
  const given = sum(lostBySelf);
  const gainedBig = [...lostByOpp].sort((a, b) => VALUE[b] - VALUE[a])[0];
  if (net > 0) {
    if (gainedBig === 'r' && lostBySelf.some((t) => t === 'n' || t === 'b') && net <= 3) return 'wins the exchange';
    if (net >= 8 && gainedBig === 'q') return 'wins the queen';
    if (gainedBig && gained - given >= 2.5 && VALUE[gainedBig] >= 3) return `wins a ${PIECE_NAME[gainedBig]}`;
    if (net >= 2.5) return 'wins material';
    return net >= 1.5 ? 'wins two pawns' : 'wins a pawn';
  }
  const lostBig = [...lostBySelf].sort((a, b) => VALUE[b] - VALUE[a])[0];
  if (lostBig === 'r' && lostByOpp.some((t) => t === 'n' || t === 'b') && -net <= 3) return 'loses the exchange';
  if (-net >= 8 && lostBig === 'q') return 'loses the queen';
  if (lostBig && given - gained >= 2.5 && VALUE[lostBig] >= 3) return `loses a ${PIECE_NAME[lostBig]}`;
  if (-net >= 2.5) return 'loses material';
  return -net >= 1.5 ? 'loses two pawns' : 'loses a pawn';
}

export { hangingPieces };
