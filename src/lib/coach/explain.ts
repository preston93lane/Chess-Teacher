/**
 * Turns engine numbers and board features into coach language:
 * move classification, "why" explanations and position plans.
 */
import {
  Chess,
  PIECE_NAME,
  applyUci,
  formatLine,
  moveNumber,
  other,
  parseUci,
  pvToSan,
  type Color,
  type Move,
  type PieceSymbol,
} from '../chess/core';
import type { EngineLine } from '../engine/stockfish';
import {
  attacksFrom,
  hangingPieces,
  idx,
  makeMove,
  mobility,
  parseBoard,
  rankOf,
  see,
} from './board';
import { describeScore, formatScore, lineScore, moveAccuracy, winPct, type Score } from './eval';
import { analyzePosition, STRUCTURES, type PositionFeatures } from './structure';
import { lineOutcome, materialPhrase, moveMotifs, type Motif } from './tactics';

export type MoveClass =
  | 'brilliant'
  | 'great'
  | 'best'
  | 'excellent'
  | 'good'
  | 'book'
  | 'inaccuracy'
  | 'mistake'
  | 'blunder'
  | 'miss';

export const CLASS_INFO: Record<MoveClass, { label: string; glyph: string; tone: string }> = {
  brilliant: { label: 'Brilliant', glyph: '!!', tone: 'brilliant' },
  great: { label: 'Only move', glyph: '!', tone: 'great' },
  best: { label: 'Best', glyph: '★', tone: 'best' },
  excellent: { label: 'Excellent', glyph: '✓', tone: 'excellent' },
  good: { label: 'Good', glyph: '✓', tone: 'good' },
  book: { label: 'Theory', glyph: '≡', tone: 'book' },
  inaccuracy: { label: 'Inaccuracy', glyph: '?!', tone: 'inaccuracy' },
  mistake: { label: 'Mistake', glyph: '?', tone: 'mistake' },
  blunder: { label: 'Blunder', glyph: '??', tone: 'blunder' },
  miss: { label: 'Missed win', glyph: '✕', tone: 'miss' },
};

export const BAD_CLASSES: MoveClass[] = ['inaccuracy', 'mistake', 'blunder', 'miss'];

export interface MoveReview {
  ply: number;
  san: string;
  uci: string;
  color: Color;
  fenBefore: string;
  fenAfter: string;
  /** Best achievable eval before the move (White POV). */
  evalBefore?: Score;
  /** Eval after the move (White POV). */
  evalAfter?: Score;
  bestUci?: string;
  bestSan?: string;
  bestLine?: string[];
  replyLine?: string[];
  winBefore: number;
  winAfter: number;
  accuracy: number;
  cls: MoveClass;
  headline: string;
  notes: string[];
  better?: string;
  betterLine?: string;
  tags: string[];
  /** Win% the best move would have kept (mover POV) — used for puzzles. */
  bestWin?: number;
}

export interface ReviewInput {
  ply: number;
  fenBefore: string;
  uci: string;
  /** Multi-PV analysis of the position before the move. */
  before?: EngineLine[];
  /** Best line from the position after the move. */
  after?: EngineLine;
  isBook?: boolean;
  bookNote?: string;
  openingName?: string;
  prevClass?: MoveClass;
  prevMoveTo?: string;
}

const name = (t: PieceSymbol) => PIECE_NAME[t];

function terminalScore(fen: string, mover: Color): Score | undefined {
  const c = new Chess(fen);
  if (c.isCheckmate()) return { mate: 0, cp: mover === 'w' ? 100000 : -100000 };
  if (c.isDraw() || c.isStalemate()) return { cp: 0 };
  return undefined;
}

function winFor(s: Score | undefined, pov: Color): number {
  if (s && s.mate === 0 && s.cp !== undefined) return (s.cp > 0) === (pov === 'w') ? 100 : 0;
  return winPct(s, pov);
}

export function reviewMove(input: ReviewInput): MoveReview {
  const applied = applyUci(input.fenBefore, input.uci)!;
  const move = applied.move;
  const fenAfter = applied.fen;
  const mover = move.color;
  const best = input.before?.[0];
  const evalBefore = lineScore(best);
  const terminal = terminalScore(fenAfter, mover);
  const evalAfter = terminal ?? lineScore(input.after);

  // Use the same-search multipv score when the played move was considered.
  const sameSearch = input.before?.find((l) => l.pv[0] === input.uci);
  const afterForClass = terminal ?? (sameSearch ? lineScore(sameSearch) : evalAfter);

  const winBefore = evalBefore ? winFor(evalBefore, mover) : 50;
  let winAfter = afterForClass ? winFor(afterForClass, mover) : winBefore;
  const isBest = best?.pv[0] === input.uci;
  if (isBest) winAfter = Math.max(winAfter, winBefore);
  const loss = Math.max(0, winBefore - winAfter);
  const accuracy = evalBefore ? moveAccuracy(winBefore, winAfter) : 100;

  const bestSan = best ? pvToSan(input.fenBefore, best.pv, 1)[0] : undefined;
  const bestLine = best ? pvToSan(input.fenBefore, best.pv, 8) : undefined;
  const replyLine = input.after ? pvToSan(fenAfter, input.after.pv, 8) : undefined;

  const motifs = moveMotifs(input.fenBefore, move);
  const tags = motifs.map((m) => m.kind);

  // --- classification ---
  let cls: MoveClass;
  if (input.isBook) cls = 'book';
  else if (!evalBefore) cls = 'good';
  else if (isBest || loss <= 0.5) cls = 'best';
  else if (loss <= 2.5) cls = 'excellent';
  else if (loss <= 6) cls = 'good';
  else if (loss <= 12) cls = 'inaccuracy';
  else if (loss <= 22) cls = 'mistake';
  else cls = 'blunder';

  const second = input.before?.[1];
  if (cls === 'best' && second && !input.isBook) {
    const secondWin = winFor(lineScore(second), mover);
    const trivialRecapture = move.captured && input.prevMoveTo === move.to;
    const sacrifice =
      motifs.some((m) => m.kind === 'sacrifice') ||
      (motifs.some((m) => m.kind === 'hangs') && !move.captured && move.piece !== 'p');
    if (sacrifice && winAfter >= 50 && winBefore < 97 && !trivialRecapture) cls = 'brilliant';
    else if (winBefore - secondWin >= 15 && winAfter >= 35 && !trivialRecapture && !move.san.includes('#'))
      cls = 'great';
  }
  const bestWin = winBefore;
  if (
    (cls === 'inaccuracy' || cls === 'mistake' || cls === 'blunder') &&
    (input.prevClass === 'mistake' || input.prevClass === 'blunder') &&
    winBefore >= 75 &&
    winAfter >= 35
  ) {
    cls = 'miss';
  }

  const review: MoveReview = {
    ply: input.ply,
    san: move.san,
    uci: input.uci,
    color: mover,
    fenBefore: input.fenBefore,
    fenAfter,
    evalBefore,
    evalAfter,
    bestUci: best?.pv[0],
    bestSan,
    bestLine,
    replyLine,
    winBefore,
    winAfter,
    accuracy,
    cls,
    headline: '',
    notes: [],
    tags,
    bestWin,
  };
  explain(review, move, motifs, input);
  return review;
}

// ---------------------------------------------------------------------------
// Move descriptions
// ---------------------------------------------------------------------------

const CENTER = new Set(['d4', 'd5', 'e4', 'e5']);

/** What does this move do, in a sentence or two? */
export function describeMove(fenBefore: string, move: Move, motifs?: Motif[], prevMoveTo?: string): string[] {
  const out: string[] = [];
  const m = motifs ?? moveMotifs(fenBefore, move);
  const before = parseBoard(fenBefore);
  const from = idx(move.from);
  const to = idx(move.to);
  const after = makeMove(before, from, to, move.promotion as PieceSymbol | undefined);
  const piece = move.piece as PieceSymbol;
  const mover = move.color;
  const opp = other(mover);
  const fullmove = moveNumber(fenBefore);
  const homeRank = mover === 'w' ? 0 : 7;

  const tactical = m.filter((x) =>
    ['mate', 'double-check', 'discovered-check', 'fork', 'pin', 'skewer', 'discovered-attack', 'promotion'].includes(x.kind),
  );
  if (tactical.length) out.push(...tactical.map((x) => x.text));

  if (move.san.startsWith('O-O-O')) out.push('Castles long: the king heads for b1/b8 and the rook lands on the d-file.');
  else if (move.san.startsWith('O-O')) out.push('Castles, tucking the king away and connecting the rooks.');

  if (move.captured) {
    const free = m.find((x) => x.kind === 'free-capture');
    const sac = m.find((x) => x.kind === 'sacrifice');
    if (free) out.push(free.text);
    else if (sac) out.push(sac.text);
    else if (prevMoveTo === move.to) out.push(`Recaptures on ${move.to}.`);
    else out.push(`Trades on ${move.to}.`);
  }

  const att = attacksFrom(after, to).map((i) => i);
  const centralHits = att
    .map((i) => String.fromCharCode(97 + (i % 8)) + (Math.floor(i / 8) + 1))
    .filter((s) => CENTER.has(s));

  if ((piece === 'n' || piece === 'b') && rankOf(from) === homeRank && fullmove <= 15 && !move.captured) {
    out.push(
      centralHits.length
        ? `Develops the ${name(piece)} to ${move.to}, eyeing ${centralHits.join(' and ')}.`
        : `Develops the ${name(piece)} to ${move.to}.`,
    );
  }

  if (piece === 'p' && !move.captured) {
    const toSq = move.to;
    const f = toSq[0];
    const features = analyzePosition(new Chess(fenBefore).fen());
    const passedBefore = features[mover].passed.includes(move.from);
    const hitPawnIdx = attacksFrom(after, to).find((i) => after.sq[i]?.type === 'p' && after.sq[i]?.color === opp);
    const hitsPawn = hitPawnIdx !== undefined;
    const hitsPiece = attacksFrom(after, to).find((i) => after.sq[i] && after.sq[i]!.type !== 'p' && after.sq[i]!.color === opp);
    if (passedBefore) out.push(`Pushes the passed pawn to ${toSq}.`);
    else if (hitsPiece !== undefined && !m.some((x) => x.kind === 'fork'))
      out.push(`Gains time by hitting the ${name(after.sq[hitsPiece]!.type)}.`);
    else if (hitsPawn) out.push(`Strikes at the ${String.fromCharCode(97 + (hitPawnIdx! % 8))}${Math.floor(hitPawnIdx! / 8) + 1}-pawn — a pawn break.`);
    else if (CENTER.has(toSq) || ((f === 'c' || f === 'f') && fullmove <= 10)) out.push('Claims space in the center.');
    else if (fullmove <= 12 && ['c', 'd', 'e'].includes(f) && Math.abs(parseInt(toSq[1]) - parseInt(move.from[1])) === 1)
      out.push('A solid pawn move: it supports the center and opens a diagonal for a bishop.');
    else if ((toSq === 'h3' || toSq === 'h6' || toSq === 'a3' || toSq === 'a6') && fullmove <= 20)
      out.push(
        toSq === 'h3' || toSq === 'h6'
          ? `Takes ${toSq === 'h3' ? 'g4' : 'g5'} away from enemy pieces and gives the king air.`
          : `Takes ${toSq === 'a3' ? 'b4' : 'b5'} away from enemy pieces.`,
      );
    else if (['a', 'b', 'g', 'h'].includes(f) && Math.abs(parseInt(toSq[1]) - parseInt(move.from[1])) >= 1)
      out.push('Gains space on the wing.');
  }

  if (piece === 'r' || piece === 'q') {
    const features = analyzePosition(new Chess(fenBefore).fen());
    const file = move.to[0];
    if (piece === 'r' && features.openFiles.includes(file) && move.from[0] !== file) out.push(`Takes the open ${file}-file.`);
    else if (piece === 'r' && features.semiOpen[mover].includes(file) && move.from[0] !== file)
      out.push(`Puts the rook on the half-open ${file}-file.`);
    const seventh = mover === 'w' ? 6 : 1;
    if (rankOf(to) === seventh && rankOf(from) !== seventh) out.push(`Invades the ${mover === 'w' ? '7th' : '2nd'} rank.`);
  }

  if (piece === 'n') {
    const featuresAfter = analyzePosition(applyUci(fenBefore, move.from + move.to)?.fen ?? fenBefore);
    if (featuresAfter[mover].knightsOnOutposts.includes(move.to)) out.push(`Plants the knight on the ${move.to} outpost.`);
  }

  if (piece === 'k' && !move.san.startsWith('O-O')) {
    const features = analyzePosition(new Chess(fenBefore).fen());
    if (features.phase === 'endgame') out.push('Activates the king — in the endgame it is a fighting piece.');
  }

  // Saved or defended a hanging piece?
  const hangBefore = hangingPieces(before, mover);
  const hangAfter = hangingPieces(after, mover);
  if (hangBefore.length && !move.captured) {
    const saved = hangBefore.find((h) => !hangAfter.some((x) => x.square === h.square) && h.square !== move.from);
    if (hangBefore.some((h) => h.square === move.from) && !hangAfter.some((x) => x.square === move.to))
      out.push(`Moves the ${name(piece)} out of danger.`);
    else if (saved) out.push(`Protects the ${name(saved.piece.type)} on ${saved.square}.`);
  }

  const attack = m.find((x) => x.kind === 'attack');
  if (attack && out.length < 2) out.push(attack.text);

  // Queen trade offers and plain checks
  if (piece === 'q' && !move.captured) {
    const theirQueen = after.sq.findIndex((p) => p?.type === 'q' && p.color === opp);
    if (theirQueen >= 0 && attacksFrom(after, theirQueen).includes(to)) out.push('Offers a queen trade.');
  }
  if (!out.length && m.some((x) => x.kind === 'check')) out.push(`Gives check with the ${name(piece)}, gaining time.`);

  if (!out.length) {
    const mobBefore = mobility(before, from);
    const mobAfter = mobility(after, to);
    if (piece !== 'p' && piece !== 'k') {
      if (mobAfter > mobBefore + 2) out.push(`Activates the ${name(piece)}.`);
      else if (mobAfter < mobBefore - 2) out.push(`Repositions the ${name(piece)} — a quieter, more defensive square.`);
      else out.push(`Improves the ${name(piece)}.`);
    } else if (piece === 'k') out.push('Steps the king to safety.');
    else out.push('A quiet pawn move.');
  }
  return dedupe(out).slice(0, 3);
}

function dedupe(arr: string[]) {
  return [...new Set(arr)];
}

function sideName(c: Color) {
  return c === 'w' ? 'White' : 'Black';
}

function explain(r: MoveReview, move: Move, motifs: Motif[], input: ReviewInput) {
  const desc = describeMove(r.fenBefore, move, motifs, input.prevMoveTo);
  const mover = r.color;
  const evalTxt = r.evalBefore && r.evalAfter ? `${formatScore(r.evalBefore)} → ${formatScore(r.evalAfter)}` : '';
  const bestDesc = (() => {
    if (!r.bestUci || r.bestUci === r.uci) return [];
    const bm = applyUci(r.fenBefore, r.bestUci);
    if (!bm) return [];
    const d = describeMove(r.fenBefore, bm.move, undefined, input.prevMoveTo);
    const best = input.before?.[0];
    if (best) {
      const out = lineOutcome(r.fenBefore, best.pv);
      if (out.mateFor === mover) d.unshift(`It forces mate in ${out.mateIn}.`);
      else {
        const phrase = materialPhrase(out.lost[other(mover)], out.lost[mover], out.material);
        if (phrase && out.material > 0) d.unshift(`It ${phrase}.`);
      }
    }
    return dedupe(d).slice(0, 2);
  })();
  const bestLineText = r.bestLine?.length ? formatLine(r.fenBefore, r.bestLine.slice(0, 6)) : '';

  if (r.cls === 'book') {
    r.headline = input.openingName ? `Theory — ${input.openingName}.` : 'A known theory move.';
    if (input.bookNote) r.notes.push(input.bookNote);
    else r.notes.push(...desc.slice(0, 1));
    return;
  }

  if (['brilliant', 'great', 'best', 'excellent', 'good'].includes(r.cls)) {
    if (r.cls === 'brilliant') {
      r.headline = 'A real sacrifice — and it works.';
      r.notes.push(...desc);
      if (bestLineText) r.notes.push(`The point: ${bestLineText}.`);
    } else if (r.cls === 'great') {
      r.headline = 'The only move that keeps the position together.';
      r.notes.push(...desc);
      r.notes.push('Every alternative gives up a large part of the advantage.');
    } else if (r.cls === 'best') {
      r.headline = desc[0] ?? 'The top engine choice.';
      r.notes.push(...desc.slice(1));
    } else {
      r.headline = desc[0] ?? 'A solid move.';
      r.notes.push(...desc.slice(1));
      if (r.bestSan && r.cls === 'good') {
        r.better = `Slightly more precise: ${r.bestSan}${bestDesc[0] ? ` — ${lowerFirst(bestDesc[0])}` : ''}`;
      }
    }
    return;
  }

  // --- bad moves: find the reason ---
  const reasons: string[] = [];
  let headline = '';
  const after = parseBoard(r.fenAfter);
  const before = parseBoard(r.fenBefore);
  const reply = input.after;
  const replyMove = reply?.pv[0] ? applyUci(r.fenAfter, reply.pv[0])?.move : undefined;

  if (reply && replyMove) {
    const out = lineOutcome(r.fenAfter, reply.pv);
    const replyLineText = formatLine(r.fenAfter, out.sans.slice(0, 6));
    if (out.mateFor === other(mover)) {
      headline = `Allows mate in ${out.mateIn}.`;
      reasons.push(`After ${replyLineText} there is no defence.`);
    } else {
      const replyMotifs = moveMotifs(r.fenAfter, replyMove);
      const loss = out.material; // what the opponent's best line wins from the mover
      const lostPhrase = materialPhrase(out.lost[other(mover)], out.lost[mover], -loss);
      const capturedSq = replyMove.captured ? replyMove.to : undefined;
      const hangingNow = hangingPieces(after, mover);
      const hangingBefore = hangingPieces(before, mover);
      const fork = replyMotifs.find((x) => x.kind === 'fork');
      const pin = replyMotifs.find((x) => x.kind === 'pin' || x.kind === 'skewer');
      const disc = replyMotifs.find((x) => x.kind === 'discovered-attack' || x.kind === 'discovered-check' || x.kind === 'double-check');
      if (capturedSq && loss >= 1 && capturedSq === move.to && see(after, idx(move.to), other(mover)) > 0) {
        headline = `Hangs the ${name(move.piece as PieceSymbol)} on ${move.to}.`;
        reasons.push(`${replyLineText} — the piece was not protected enough.`);
      } else if (capturedSq && loss >= 1 && hangingNow.some((h) => h.square === capturedSq)) {
        const h = hangingNow.find((x) => x.square === capturedSq)!;
        const was = hangingBefore.some((x) => x.square === capturedSq);
        headline = was
          ? `Leaves the ${name(h.piece.type)} on ${h.square} hanging.`
          : `Drops the ${name(h.piece.type)} on ${h.square}.`;
        reasons.push(
          was
            ? `It was already under attack and needed attention. ${replyLineText}.`
            : `The move removes its protection. ${replyLineText}.`,
        );
      } else if (fork && loss >= 1) {
        headline = `Allows a fork: ${replyMove.san}.`;
        reasons.push(`${fork.text} ${replyLineText}.`);
      } else if (pin && loss >= 1) {
        headline = `Walks into ${pin.kind === 'pin' ? 'a pin' : 'a skewer'}: ${replyMove.san}.`;
        reasons.push(`${pin.text} ${replyLineText}.`);
      } else if (disc && loss >= 1) {
        headline = `Allows a discovered attack: ${replyMove.san}.`;
        reasons.push(`${disc.text} ${replyLineText}.`);
      } else if (lostPhrase && loss >= 1) {
        headline = `${capitalize(lostPhrase)} by force.`;
        reasons.push(`${sideName(other(mover))} replies ${replyLineText}.`);
      }
    }
  }

  // Missed a tactic?
  if (!headline && input.before?.[0]) {
    const out = lineOutcome(r.fenBefore, input.before[0].pv);
    if (out.mateFor === mover) {
      headline = `Misses mate in ${out.mateIn}.`;
      reasons.push(`${bestLineText} finishes the game.`);
    } else if (out.material >= 1) {
      const phrase = materialPhrase(out.lost[other(mover)], out.lost[mover], out.material);
      if (phrase) {
        headline = `Misses ${r.bestSan}, which ${phrase}.`;
        reasons.push(`${bestLineText}.`);
      }
    }
  }

  // Positional fallbacks
  if (!headline) {
    const fb = analyzePosition(r.fenBefore);
    const fa = analyzePosition(r.fenAfter);
    const me = mover;
    if (fa[me].kingShieldMissing > fb[me].kingShieldMissing && move.piece === 'p') {
      headline = 'Weakens the pawns around your king.';
      reasons.push('Pawns in front of a castled king cannot move back — every advance creates permanent holes.');
    } else if (move.piece === 'q' && fb.phase === 'opening' && fb[me].undeveloped.length >= 2) {
      headline = 'Brings the queen out too early.';
      reasons.push('With minor pieces still at home, the queen becomes a target and you lose time.');
    } else if (fb.phase === 'opening' && !fb[me].castled && fb[me].canCastle && r.bestSan?.startsWith('O-O')) {
      headline = 'Castling was the priority.';
      reasons.push('The king is safer away from the center, and the rook joins the game.');
    } else if (
      fb.phase === 'opening' &&
      fb[me].undeveloped.length >= 2 &&
      move.piece !== 'p' &&
      !fb[me].undeveloped.includes(move.from) &&
      !move.captured &&
      !move.san.startsWith('O-O')
    ) {
      headline = 'Moves an already-developed piece instead of developing.';
      reasons.push(`Still at home: ${fb[me].undeveloped.map((q) => `${PIECE_NAME[fb.board.sq[idx(q)]?.type ?? 'n']} on ${q}`).join(', ')}. Tempo matters in the opening.`);
    } else if (replyMove && reply) {
      const replyMotifs = moveMotifs(r.fenAfter, replyMove);
      const replyDesc = describeMove(r.fenAfter, replyMove, replyMotifs);
      const sac = replyMotifs.some((x) => x.kind === 'sacrifice' || x.kind === 'hangs');
      const prefix = replyMove.color === 'b' ? '…' : '';
      headline = sac ? `Allows the sacrifice ${prefix}${replyMove.san}!` : `Allows ${prefix}${replyMove.san}.`;
      const lineText = formatLine(r.fenAfter, pvToSan(r.fenAfter, reply.pv, 6));
      const verdict = r.evalAfter ? describeScore(r.evalAfter).toLowerCase() : '';
      reasons.push(`${capitalize(lowerFirst(replyDesc[0] ?? 'A strong reply.'))}${lineText ? ` After ${lineText}` : ''}${verdict ? ` — ${verdict}.` : '.'}`);
    } else {
      headline = 'Not the most accurate.';
    }
  }

  r.headline = headline;
  r.notes.push(...reasons);
  if (r.bestSan && r.bestSan !== r.san) {
    r.better = `Better was ${r.bestSan}${bestDesc[0] ? ` — ${lowerFirst(bestDesc[0])}` : '.'}`;
    if (bestLineText) r.betterLine = bestLineText;
  }
  if (evalTxt) r.notes.push(`Evaluation ${evalTxt}.`);
}

function lowerFirst(s: string) {
  if (!s) return s;
  // Keep SAN and piece letters capitalised (e.g. "Nf3", "Bxf7+")
  if (/^[KQRBN][a-h1-8x]/.test(s) || /^O-O/.test(s)) return s;
  return s[0].toLowerCase() + s.slice(1);
}
function capitalize(s: string) {
  return s ? s[0].toUpperCase() + s.slice(1) : s;
}

// ---------------------------------------------------------------------------
// Position report — "What's going on here?"
// ---------------------------------------------------------------------------

export interface Advice {
  text: string;
  squares?: string[];
  priority: number;
}

export interface PositionReport {
  phase: string;
  material: string;
  structure?: { name: string; summary: string; plans: string[]; lessonId?: string };
  advice: Advice[];
  features: PositionFeatures;
}

export function positionReport(fen: string, forColor?: Color): PositionReport {
  const f = analyzePosition(fen);
  const me: Color = forColor ?? (fen.split(' ')[1] === 'b' ? 'b' : 'w');
  const them = other(me);
  const mine = f[me];
  const theirs = f[them];
  const advice: Advice[] = [];
  const add = (text: string, priority: number, squares?: string[]) => advice.push({ text, priority, squares });

  // Material
  const diff = mine.material - theirs.material;
  let material = diff === 0 ? 'Material is level' : diff > 0 ? `You are up ${materialWord(diff)}` : `You are down ${materialWord(-diff)}`;
  if (mine.bishopPair && !theirs.bishopPair) material += ' — and you have the bishop pair';
  else if (theirs.bishopPair && !mine.bishopPair) material += ' — your opponent has the bishop pair';
  material += '.';

  // King safety
  if (f.phase !== 'endgame' && !mine.castled && mine.canCastle && f.queensOn) {
    add('Castle soon — your king is still in the center.', 9, [mine.kingSquare]);
  }
  if (f.phase !== 'endgame' && !theirs.castled && !theirs.canCastle && f.queensOn && f.openFiles.length) {
    add('Their king is stuck in the center: open lines toward it.', 8, [theirs.kingSquare]);
  }
  if (f.oppositeCastling) {
    add('Kings on opposite wings: storm with your pawns toward their king — speed beats material.', 8);
  }
  if (mine.kingShieldMissing >= 2 && f.queensOn) add('Your king cover is thin; keep defenders close before going on the offensive.', 7, [mine.kingSquare]);
  if (theirs.kingShieldMissing >= 2 && f.queensOn) add('Their king cover is weakened — look for ways to bring queen and rook closer.', 7, [theirs.kingSquare]);

  // Development
  if (f.phase === 'opening' && mine.undeveloped.length) {
    const names = mine.undeveloped.map((s) => `${PIECE_NAME[f.board.sq[idx(s)]?.type ?? 'n']} on ${s}`);
    add(`Finish development: the ${names.join(' and the ')} ${names.length > 1 ? 'are' : 'is'} still at home.`, 8, mine.undeveloped);
  }

  // Files
  if (f.openFiles.length) {
    const unused = f.openFiles.filter((file) => !mine.rooksOnOpen.some((r) => r[0] === file));
    if (unused.length && !mine.rooksOnOpen.length) add(`The ${unused[0]}-file is open — a rook belongs there.`, 6, fileSquares(unused[0]));
  }
  if (f.semiOpen[me].length && !mine.rooksOnSemiOpen.length && f.phase !== 'opening') {
    const file = f.semiOpen[me][0];
    add(`Use the half-open ${file}-file: put a rook on it and press against the pawn in front.`, 5, fileSquares(file));
  }
  if (mine.rookOnSeventh.length) add(`Your heavy piece on the seventh rank ties them down — keep it there.`, 4, mine.rookOnSeventh);

  // Outposts
  if (mine.knightsOnOutposts.length) add(`Your knight on ${mine.knightsOnOutposts[0]} is a monster — it cannot be chased by pawns.`, 4, mine.knightsOnOutposts);
  else if (mine.outposts.length && f.phase !== 'opening')
    add(`${mine.outposts[0]} is an outpost: no enemy pawn can attack it. Route a knight there.`, 6, [mine.outposts[0]]);
  if (theirs.knightsOnOutposts.length)
    add(`Their knight on ${theirs.knightsOnOutposts[0]} is strong — consider trading it off.`, 6, theirs.knightsOnOutposts);

  // Pawn weaknesses
  const targets = [...theirs.isolated, ...theirs.backward].filter((s, i, a) => a.indexOf(s) === i);
  if (targets.length && f.phase !== 'opening') add(`Target the weak pawn on ${targets[0]}: attack it more times than it can be defended.`, 6, [targets[0]]);
  const myWeak = [...mine.isolated, ...mine.backward];
  if (myWeak.length && f.phase !== 'opening') add(`Keep an eye on your weak pawn on ${myWeak[0]}.`, 3, [myWeak[0]]);
  if (mine.passed.length) {
    const p = mine.passed.sort((a, b) => (me === 'w' ? +b[1] - +a[1] : +a[1] - +b[1]))[0];
    add(`Your passed pawn on ${p} is an asset — ${f.phase === 'endgame' ? 'push it with king and rook support' : 'support it and push when the pieces are ready'}.`, f.phase === 'endgame' ? 8 : 5, [p]);
  }
  if (theirs.passed.length) {
    const p = theirs.passed[0];
    add(`Blockade their passed pawn on ${p} — a knight in front of it is ideal.`, f.phase === 'endgame' ? 8 : 5, [p]);
  }

  // Pieces
  if (mine.badBishop) add(`Your bishop on ${mine.badBishop} is hemmed in by its own pawns — trade it or reroute it outside the chain.`, 5, [mine.badBishop]);
  if (mine.worstPiece && f.phase !== 'opening') {
    add(`Improve your worst piece: the ${PIECE_NAME[mine.worstPiece.type]} on ${mine.worstPiece.square} has few squares.`, 5, [mine.worstPiece.square]);
  }
  if (f.phase === 'endgame') add('Endgame: activate the king and centralise it.', 7, [mine.kingSquare]);

  // Space
  if (mine.space >= theirs.space + 4 && f.phase === 'middlegame') add('You have more space — avoid trades and squeeze.', 3);
  else if (theirs.space >= mine.space + 4 && f.phase === 'middlegame') add('You are cramped — trading pieces helps; prepare a freeing pawn break.', 5);

  // Structure
  let structure: PositionReport['structure'];
  const st = f.structures[0];
  if (st) {
    const info = STRUCTURES[st.id];
    const plans = st.owner === null ? [] : st.owner === me ? info.owner : info.against;
    structure = { name: info.name, summary: info.summary, plans, lessonId: info.lessonId };
  }

  advice.sort((a, b) => b.priority - a.priority);
  return {
    phase: f.phase[0].toUpperCase() + f.phase.slice(1),
    material,
    structure,
    advice: advice.slice(0, 5),
    features: f,
  };
}

function fileSquares(file: string) {
  return [1, 2, 3, 4, 5, 6, 7, 8].map((r) => `${file}${r}`);
}

function materialWord(d: number): string {
  if (d === 1) return 'a pawn';
  if (d === 2) return 'two pawns';
  if (d === 3) return 'a piece (≈3 pawns)';
  if (d === 5) return 'a rook (≈5 pawns)';
  return `≈${d} pawns of material`;
}

/** Short reason text for a candidate move. */
export function candidateSummary(fen: string, line: EngineLine): { san: string; text: string; line: string } {
  const sans = pvToSan(fen, line.pv, 6);
  const mv = applyUci(fen, line.pv[0]);
  let text = '';
  if (mv) {
    const out = lineOutcome(fen, line.pv);
    const mover = mv.move.color;
    if (out.mateFor === mover) text = `Forces mate in ${out.mateIn}.`;
    else {
      const phrase = out.material >= 1 ? materialPhrase(out.lost[other(mover)], out.lost[mover], out.material) : null;
      const d = describeMove(fen, mv.move);
      text = phrase ? `${capitalize(phrase)}. ${d[0] ?? ''}` : d[0] ?? '';
    }
  }
  return { san: sans[0] ?? line.pv[0], text: text.trim(), line: formatLine(fen, sans) };
}

/** Threat detection: what would the opponent do if it were their move? */
export function nullMoveFen(fen: string): string | null {
  const parts = fen.split(' ');
  const c = new Chess(fen);
  if (c.inCheck()) return null;
  parts[1] = parts[1] === 'w' ? 'b' : 'w';
  parts[3] = '-';
  const flipped = parts.join(' ');
  try {
    const t = new Chess(flipped);
    if (t.inCheck()) return null; // side not to move would be in check → illegal
    return flipped;
  } catch {
    return null;
  }
}

export function describeThreat(fen: string, line: EngineLine, baseline: Score | undefined): string | null {
  const flipped = nullMoveFen(fen);
  if (!flipped) return null;
  const mv = applyUci(flipped, line.pv[0]);
  if (!mv) return null;
  const out = lineOutcome(flipped, line.pv);
  const who = mv.move.color;
  const san = mv.move.san;
  const prefix = who === 'w' ? '' : '…';
  if (out.mateFor === who) return `${prefix}${san} threatens mate.`;
  if (out.material >= 1) {
    const phrase = materialPhrase(out.lost[other(who)], out.lost[who], out.material);
    if (phrase) return `${prefix}${san} is threatened — it ${phrase}.`;
  }
  const s = lineScore(line);
  if (baseline && s) {
    const swing = winPct(s, who) - winPct(baseline, who);
    if (swing > 15) return `Watch out for ${prefix}${san} — it would seriously improve their position.`;
  }
  return null;
}

/** Convenience: parse first engine move into SAN for UI arrows/text. */
export function firstMove(fen: string, uci?: string) {
  if (!uci) return null;
  const r = applyUci(fen, uci);
  return r ? { san: r.move.san, from: r.move.from, to: r.move.to } : null;
}

export { parseUci };
