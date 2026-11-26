/**
 * "What matters here" — themes in a position, described without naming the
 * move to play. Static themes come from the board; deeper ones (threats,
 * hidden tactics, only-move situations) use the engine but are still phrased
 * as things to notice, not answers.
 */
import { PIECE_NAME, other, type Color, type PieceSymbol } from '../chess/core';
import {
  VALUE,
  attackersOf,
  attacksFrom,
  fileOf,
  hangingPieces,
  idx,
  kingIndex,
  parseBoard,
  rankOf,
  rayHits,
  sliderDirs,
  sqName,
  type BoardModel,
} from './board';
import { analyzePosition, STRUCTURES } from './structure';
import { lineOutcome, moveMotifs, type MotifKind } from './tactics';
import { lineScore, winPct } from './eval';
import { applyUci } from '../chess/core';
import type { EngineLine } from '../engine/stockfish';
import { nullMoveFen } from './explain';

export type InsightKind = 'danger' | 'opportunity' | 'plan';

export interface Insight {
  id: string;
  kind: InsightKind;
  theme: string;
  text: string;
  squares: string[];
  priority: number;
}

const name = (t: PieceSymbol) => (t === 'k' ? 'king' : PIECE_NAME[t]);
const val = (t: PieceSymbol) => VALUE[t];
const KNIGHT = [[1, 2], [2, 1], [2, -1], [1, -2], [-1, -2], [-2, -1], [-2, 1], [-1, 2]];

function list(items: string[]) {
  if (items.length <= 1) return items.join('');
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;
}

function pieceAt(b: BoardModel, i: number) {
  const p = b.sq[i]!;
  return `${name(p.type)} on ${sqName(i)}`;
}

/** Pins where `victim` side's piece is pinned by an enemy slider. */
function pinsAgainst(b: BoardModel, victim: Color) {
  const attacker = other(victim);
  const out: { pinner: number; pinned: number; behind: number; absolute: boolean }[] = [];
  for (let i = 0; i < 64; i++) {
    const p = b.sq[i];
    if (!p || p.color !== attacker || !['b', 'r', 'q'].includes(p.type)) continue;
    for (const [df, dr] of sliderDirs(p.type)) {
      const hits = rayHits(b, i, df, dr);
      if (hits.length < 2) continue;
      const [a, c] = hits.map((h) => b.sq[h]!);
      if (a.color !== victim || c.color !== victim) continue;
      if (a.type === 'k') continue;
      const absolute = c.type === 'k';
      if (a.type === 'p' && !absolute) continue;
      if (absolute || (val(c.type) >= 5 && val(c.type) > val(a.type) + 0.5 && val(c.type) > val(p.type) - 0.5)) {
        out.push({ pinner: i, pinned: hits[0], behind: hits[1], absolute });
      }
    }
  }
  return out;
}

/** Two valuable pieces on one line that an enemy slider could reach. */
function lineDangers(b: BoardModel, victim: Color) {
  const enemy = other(victim);
  const out: { a: number; c: number; via: PieceSymbol }[] = [];
  const valuable: number[] = [];
  for (let i = 0; i < 64; i++) {
    const p = b.sq[i];
    if (p && p.color === victim && (p.type === 'k' || p.type === 'q' || p.type === 'r')) valuable.push(i);
  }
  const enemyAttacks = new Map<number, PieceSymbol[]>();
  for (let i = 0; i < 64; i++) {
    const p = b.sq[i];
    if (!p || p.color !== enemy || !['b', 'r', 'q'].includes(p.type)) continue;
    for (const t of attacksFrom(b, i)) {
      if (b.sq[t]) continue;
      const arr = enemyAttacks.get(t) ?? [];
      arr.push(p.type);
      enemyAttacks.set(t, arr);
    }
  }
  const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
  for (const i of valuable) {
    for (const [df, dr] of dirs) {
      const hits = rayHits(b, i, df, dr);
      if (!hits.length || b.sq[hits[0]]?.color !== victim) continue;
      const j = hits[0];
      const pj = b.sq[j]!;
      if (!(pj.type === 'k' || pj.type === 'q' || pj.type === 'r')) continue;
      if (i > j) continue; // report each pair once
      const diagonal = df !== 0 && dr !== 0;
      // squares beyond either end of the pair along the line
      const reach = (from: number, sdf: number, sdr: number) => {
        let f = fileOf(from) + sdf;
        let r = rankOf(from) + sdr;
        while (f >= 0 && f < 8 && r >= 0 && r < 8) {
          const t = r * 8 + f;
          if (b.sq[t]) return null;
          const types = enemyAttacks.get(t) ?? [];
          const ok = types.find((ty) => ty === 'q' || (diagonal ? ty === 'b' : ty === 'r'));
          if (ok) return ok;
          f += sdf;
          r += sdr;
        }
        return null;
      };
      const via = reach(i, -df, -dr) ?? reach(j, df, dr);
      if (via) out.push({ a: i, c: j, via });
    }
  }
  return out;
}

/** Squares where an enemy knight would attack two valuable pieces at once. */
function forkSquares(b: BoardModel, victim: Color) {
  const enemy = other(victim);
  const out: { knight: number; square: number; targets: number[] }[] = [];
  const myPawnAttacks = new Set<number>();
  for (let i = 0; i < 64; i++) {
    const p = b.sq[i];
    if (p && p.color === victim && p.type === 'p') attacksFrom(b, i).forEach((t) => myPawnAttacks.add(t));
  }
  for (let i = 0; i < 64; i++) {
    const p = b.sq[i];
    if (!p || p.color !== enemy || p.type !== 'n') continue;
    for (const [df, dr] of KNIGHT) {
      const f = fileOf(i) + df;
      const r = rankOf(i) + dr;
      if (f < 0 || f > 7 || r < 0 || r > 7) continue;
      const s = r * 8 + f;
      if (b.sq[s]?.color === enemy) continue;
      if (myPawnAttacks.has(s)) continue;
      const defended = attackersOf(b, s, victim).length > 0;
      const targets: number[] = [];
      for (const [gf, gr] of KNIGHT) {
        const tf = f + gf;
        const tr = r + gr;
        if (tf < 0 || tf > 7 || tr < 0 || tr > 7) continue;
        const t = tr * 8 + tf;
        const q = b.sq[t];
        if (!q || q.color !== victim) continue;
        if (q.type === 'k' || q.type === 'q' || q.type === 'r' || (attackersOf(b, t, victim).length === 0 && val(q.type) >= 3)) targets.push(t);
      }
      const hasKing = targets.some((t) => b.sq[t]!.type === 'k');
      if (targets.length >= 2 && (!defended || hasKing)) out.push({ knight: i, square: s, targets });
    }
  }
  return out;
}

function backRankWeak(b: BoardModel, color: Color) {
  const k = kingIndex(b, color);
  if (k < 0) return false;
  const home = color === 'w' ? 0 : 7;
  if (rankOf(k) !== home) return false;
  const fwd = color === 'w' ? 1 : -1;
  const enemy = other(color);
  const enemyHeavy = b.sq.some((p) => p && p.color === enemy && (p.type === 'r' || p.type === 'q'));
  if (!enemyHeavy) return false;
  // escape squares in front of the king
  for (let df = -1; df <= 1; df++) {
    const f = fileOf(k) + df;
    if (f < 0 || f > 7) continue;
    const t = (home + fwd) * 8 + f;
    const occ = b.sq[t];
    if (!occ && attackersOf(b, t, enemy).length === 0) return false;
  }
  // a rook or queen of ours guarding the back rank lessens it
  const guard = b.sq.some((p, i) => p && p.color === color && (p.type === 'r' || p.type === 'q') && rankOf(i) === home);
  return !guard;
}

/** Board-only themes for `me` in this position. Never names a move. */
export function staticInsights(fen: string, me: Color): Insight[] {
  const b = parseBoard(fen);
  const them = other(me);
  const f = analyzePosition(fen);
  const mine = f[me];
  const theirs = f[them];
  const out: Insight[] = [];
  const add = (i: Omit<Insight, 'squares'> & { squares?: string[] }) =>
    out.push({ squares: [], ...i, text: i.text[0].toUpperCase() + i.text.slice(1) });
  const toMove = b.turn === me;

  // --- material under fire ---
  const hanging = hangingPieces(b, me);
  if (hanging.length) {
    const h = hanging[0];
    const attackers = attackersOf(b, h.index, them).map((i) => b.sq[i]!.type);
    const byLesser = attackers.some((t) => val(t) < val(h.piece.type) - 0.5);
    add({
      id: `hanging-${h.square}`,
      kind: 'danger',
      theme: 'Piece under attack',
      text: byLesser
        ? `Your ${name(h.piece.type)} on ${h.square} is attacked by a cheaper piece. It needs to move or be shielded — defending it isn’t enough.`
        : `Your ${name(h.piece.type)} on ${h.square} is attacked more times than it is defended.${toMove ? ' Deal with it before anything else.' : ''}`,
      squares: [h.square, ...attackersOf(b, h.index, them).map(sqName)],
      priority: 10,
    });
    if (hanging.length > 1)
      add({
        id: 'hanging-more',
        kind: 'danger',
        theme: 'More than one target',
        text: `${list(hanging.slice(1, 3).map((x) => `the ${name(x.piece.type)} on ${x.square}`))} ${hanging.length > 2 ? 'are' : 'is'} also short of defenders. Look for a move that solves two problems at once.`,
        squares: hanging.slice(1, 3).map((x) => x.square),
        priority: 9,
      });
  }

  // --- pins against me ---
  for (const pin of pinsAgainst(b, me).slice(0, 2)) {
    add({
      id: `pinned-${sqName(pin.pinned)}`,
      kind: 'danger',
      theme: pin.absolute ? 'Pinned piece' : 'Pin',
      text: pin.absolute
        ? `Your ${pieceAt(b, pin.pinned)} is pinned to your king by the ${pieceAt(b, pin.pinner)} — it cannot move, and it can’t defend anything along other lines. Pinned pieces become targets: count attackers on it.`
        : `Your ${pieceAt(b, pin.pinned)} is pinned to your ${name(b.sq[pin.behind]!.type)} by the ${pieceAt(b, pin.pinner)}. If it moves, the piece behind it falls. Consider breaking the pin or stepping the back piece out of line.`,
      squares: [sqName(pin.pinner), sqName(pin.pinned), sqName(pin.behind)],
      priority: pin.absolute ? 8 : 7,
    });
  }

  // --- skewer / pin dangers on lines (skip pieces already pinned) ---
  const pinnedSq = new Set(pinsAgainst(b, me).flatMap((p) => [p.pinned, p.behind]));
  for (const d of lineDangers(b, me).filter((x) => !pinnedSq.has(x.a) && !pinnedSq.has(x.c)).slice(0, 1)) {
    const pa = b.sq[d.a]!;
    const pc = b.sq[d.c]!;
    add({
      id: `line-${sqName(d.a)}-${sqName(d.c)}`,
      kind: 'danger',
      theme: 'Pin & skewer alert',
      text: `Your ${name(pa.type)} and ${name(pc.type)} share a line, and their ${name(d.via)} can reach it. Valuable pieces lined up are a gift for pins and skewers — consider moving one off the line.`,
      squares: [sqName(d.a), sqName(d.c)],
      priority: 7,
    });
  }

  // --- knight forks ---
  const forks = forkSquares(b, me);
  if (forks.length) {
    const fk = forks[0];
    add({
      id: `fork-${sqName(fk.square)}`,
      kind: 'danger',
      theme: 'Knight fork danger',
      text: `Their knight on ${sqName(fk.knight)} has a jump that would hit your ${list(fk.targets.map((t) => name(b.sq[t]!.type)))} at the same time. Cover that square or move one of the targets.`,
      squares: [sqName(fk.knight), ...fk.targets.map(sqName)],
      priority: 8,
    });
  }

  // --- back rank ---
  if (backRankWeak(b, me) && f.phase !== 'opening') {
    add({
      id: 'back-rank',
      kind: 'danger',
      theme: 'Back-rank weakness',
      text: 'Your king has no escape square and the back rank is thin. One check on the last rank could be mate — a little air for the king or a guard on the back rank removes the worry.',
      squares: [mine.kingSquare],
      priority: 7,
    });
  }

  // --- loose pieces (undefended, not yet attacked) ---
  const loose: number[] = [];
  for (let i = 0; i < 64; i++) {
    const p = b.sq[i];
    if (!p || p.color !== me || p.type === 'k' || p.type === 'p') continue;
    const cornerRook = p.type === 'r' && [0, 7, 56, 63].includes(i);
    if (!cornerRook && attackersOf(b, i, me).length === 0 && !hanging.some((h) => h.index === i)) loose.push(i);
  }
  if (loose.length && f.phase !== 'opening') {
    add({
      id: 'loose',
      kind: 'danger',
      theme: 'Loose pieces',
      text: `Nothing defends your ${list(loose.slice(0, 3).map((i) => pieceAt(b, i)))}. Loose pieces drop off — they are what forks and double attacks feed on.`,
      squares: loose.slice(0, 3).map(sqName),
      priority: 5,
    });
  }

  // --- opponent weaknesses (opportunities) ---
  const theirHanging = hangingPieces(b, them);
  if (theirHanging.length && toMove) {
    const h = theirHanging[0];
    add({
      id: `target-${h.square}`,
      kind: 'opportunity',
      theme: 'Something to take',
      text: `Their ${name(h.piece.type)} on ${h.square} is short of defenders. Check whether winning it is really safe before you grab.`,
      squares: [h.square],
      priority: 9,
    });
  }
  for (const pin of pinsAgainst(b, them).slice(0, 1)) {
    add({
      id: `their-pin-${sqName(pin.pinned)}`,
      kind: 'opportunity',
      theme: 'Exploit the pin',
      text: `Their ${pieceAt(b, pin.pinned)} is pinned${pin.absolute ? ' to the king' : ` to the ${name(b.sq[pin.behind]!.type)}`}. A pinned piece is a target — pile up on it, especially with pawns.`,
      squares: [sqName(pin.pinner), sqName(pin.pinned), sqName(pin.behind)],
      priority: 6,
    });
  }
  const theirLoose: number[] = [];
  for (let i = 0; i < 64; i++) {
    const p = b.sq[i];
    if (!p || p.color !== them || p.type === 'k' || p.type === 'p') continue;
    if (attackersOf(b, i, them).length === 0) theirLoose.push(i);
  }
  if (theirLoose.length >= 2 && f.phase !== 'opening') {
    add({
      id: 'their-loose',
      kind: 'opportunity',
      theme: 'Their loose pieces',
      text: `Their ${list(theirLoose.slice(0, 3).map((i) => pieceAt(b, i)))} have no defenders. Look for a move that attacks two things at once.`,
      squares: theirLoose.slice(0, 3).map(sqName),
      priority: 5,
    });
  }
  if (backRankWeak(b, them) && f.phase !== 'opening') {
    add({
      id: 'their-back-rank',
      kind: 'opportunity',
      theme: 'Their back rank',
      text: 'Their king is stuck on the back rank with no air. Keep that in mind when your heavy pieces get active.',
      squares: [theirs.kingSquare],
      priority: 6,
    });
  }

  // --- king safety & development ---
  if (f.phase !== 'endgame' && !mine.castled && mine.canCastle && f.queensOn && (f.phase === 'middlegame' || mine.undeveloped.length <= 2)) {
    add({ id: 'castle', kind: 'plan', theme: 'King safety', text: 'Your king is still in the center. Getting it to safety — and connecting your rooks — should come soon.', squares: [mine.kingSquare], priority: 6 });
  }
  if (f.phase === 'opening' && mine.undeveloped.length) {
    add({
      id: 'develop',
      kind: 'plan',
      theme: 'Development',
      text: `${list(mine.undeveloped.map((s) => `the ${name(b.sq[idx(s)]!.type)} on ${s}`))} ${mine.undeveloped.length > 1 ? 'are' : 'is'} still at home. Every move that doesn’t develop or fight for the center costs you time.`,
      squares: mine.undeveloped,
      priority: 5,
    });
  }
  if (mine.kingShieldMissing >= 2 && f.queensOn) {
    add({ id: 'shield', kind: 'danger', theme: 'Thin king cover', text: 'The pawns in front of your king are gone or advanced. Keep defenders nearby and be careful opening more lines there.', squares: [mine.kingSquare], priority: 6 });
  }
  if (f.oppositeCastling) {
    add({ id: 'race', kind: 'plan', theme: 'Opposite-side castling', text: 'The kings are on opposite wings: it’s a race. Pawn storms and open files toward their king matter more than a pawn or two.', squares: [mine.kingSquare, theirs.kingSquare], priority: 6 });
  }

  // --- center & space ---
  if (f.phase !== 'endgame') {
    if (theirs.center >= mine.center + 3) {
      add({ id: 'center', kind: 'plan', theme: 'Claim the center', text: 'Your opponent controls more of the center. A central pawn move, or a pawn break against their center, would rebalance things.', squares: ['d4', 'e4', 'd5', 'e5'], priority: 5 });
    } else if (mine.space >= theirs.space + 4) {
      add({ id: 'space', kind: 'plan', theme: 'Use your space', text: 'You have more space. Avoid trades that relieve the pressure; build up behind your pawns before breaking through.', priority: 3 });
    } else if (theirs.space >= mine.space + 4) {
      add({ id: 'cramped', kind: 'plan', theme: 'Cramped', text: 'You are short of space. Trading a pair of pieces helps, and a well-timed pawn break frees the rest.', priority: 4 });
    }
  }

  // --- pawn structure ---
  if (mine.doubled.length) {
    const file = mine.doubled[0];
    add({
      id: `doubled-${file}`,
      kind: 'plan',
      theme: 'Doubled pawns',
      text: `Your doubled pawns on the ${file}-file can’t protect each other. A pawn exchange can undouble them later; until then keep them defended and avoid letting the front one get blockaded.`,
      squares: [1, 2, 3, 4, 5, 6, 7, 8].map((r) => `${file}${r}`).filter((s) => b.sq[idx(s)]?.type === 'p' && b.sq[idx(s)]?.color === me),
      priority: 3,
    });
  }
  const myWeak = [...mine.isolated, ...mine.backward].filter((s, i, a) => a.indexOf(s) === i);
  if (myWeak.length && f.phase !== 'opening') {
    add({ id: 'weak-pawn', kind: 'plan', theme: 'Weak pawn', text: `Your pawn on ${myWeak[0]} can’t be defended by another pawn. Keep a piece on guard, and avoid trades that leave it alone in an endgame.`, squares: [myWeak[0]], priority: 3 });
  }
  const theirWeak = [...theirs.isolated, ...theirs.backward, ...theirs.doubled.map((fl) => `${fl}-file`)];
  if (theirWeak.length && f.phase !== 'opening') {
    add({ id: 'their-weak', kind: 'opportunity', theme: 'Pawn targets', text: `Their weak pawn${theirWeak.length > 1 ? 's' : ''} (${theirWeak.slice(0, 2).join(', ')}) can be attacked by pieces. Fix it, then pile up.`, squares: [...theirs.isolated, ...theirs.backward].slice(0, 2), priority: 4 });
  }
  if (mine.passed.length) {
    add({ id: 'passer', kind: 'opportunity', theme: 'Passed pawn', text: `Your passed pawn on ${mine.passed[0]} is a long-term trump. ${f.phase === 'endgame' ? 'Support it with king and rook and push.' : 'Keep it protected; it grows stronger as pieces come off.'}`, squares: [mine.passed[0]], priority: f.phase === 'endgame' ? 6 : 3 });
  }
  if (theirs.passed.length) {
    add({ id: 'their-passer', kind: 'danger', theme: 'Their passed pawn', text: `Their passed pawn on ${theirs.passed[0]} must be watched. The square in front of it is the best place for a blockading piece.`, squares: [theirs.passed[0]], priority: f.phase === 'endgame' ? 7 : 4 });
  }

  // --- pieces ---
  if (mine.badBishop) add({ id: 'bad-bishop', kind: 'plan', theme: 'Bad bishop', text: `Your bishop on ${mine.badBishop} is blocked by its own pawns. Rerouting it outside the chain or trading it improves your position.`, squares: [mine.badBishop], priority: 3 });
  if (mine.worstPiece && f.phase !== 'opening') add({ id: 'worst-piece', kind: 'plan', theme: 'Worst piece', text: `Your ${name(mine.worstPiece.type)} on ${mine.worstPiece.square} has very few squares. Improving your worst piece is often the best plan in a quiet position.`, squares: [mine.worstPiece.square], priority: 3 });
  if (f.openFiles.length && !mine.rooksOnOpen.length && f.phase !== 'opening') add({ id: 'open-file', kind: 'plan', theme: 'Open file', text: `The ${f.openFiles[0]}-file is open and none of your rooks use it yet.`, squares: [1, 2, 3, 4, 5, 6, 7, 8].map((r) => `${f.openFiles[0]}${r}`), priority: 3 });
  if (mine.outposts.length && !mine.knightsOnOutposts.length && f.phase !== 'opening') add({ id: 'outpost', kind: 'plan', theme: 'Outpost', text: `${mine.outposts[0]} can never be attacked by a pawn — an ideal home for a knight.`, squares: [mine.outposts[0]], priority: 3 });

  // --- material balance → trading policy ---
  const diff = mine.material - theirs.material;
  if (diff >= 2) add({ id: 'ahead', kind: 'plan', theme: 'Ahead in material', text: 'You are ahead. Trade pieces (not pawns), keep everything protected, and the endgame will do the work.', priority: 4 });
  else if (diff <= -2) add({ id: 'behind', kind: 'plan', theme: 'Behind in material', text: 'You are behind. Avoid trades, keep pieces active and look for complications.', priority: 4 });

  // --- structure plans ---
  const st = f.structures[0];
  if (st && STRUCTURES[st.id].owner.length) {
    const info = STRUCTURES[st.id];
    const plan = (st.owner === me ? info.owner : info.against)[0];
    if (plan) add({ id: `structure-${st.id}`, kind: 'plan', theme: info.name, text: plan, priority: 4 });
  }

  return out.sort((a, c) => c.priority - a.priority);
}

const MOTIF_HINT: Partial<Record<MotifKind, string>> = {
  fork: 'a double attack (fork) is in the air',
  pin: 'a pin is the key',
  skewer: 'a skewer works here',
  'discovered-attack': 'a discovered attack is possible',
  'discovered-check': 'a discovered check is possible',
  'double-check': 'a double check is possible',
  sacrifice: 'it starts with a sacrifice',
  'free-capture': 'something can simply be taken',
};

/**
 * Engine-backed themes: threats, hidden tactics and "only move" positions.
 * `lines` = multi-PV analysis of `fen` (side to move = me).
 */
export function engineInsights(fen: string, me: Color, lines: EngineLine[], threatLine?: EngineLine): Insight[] {
  const out: Insight[] = [];
  const best = lines[0];
  if (!best) return out;
  const toMove = fen.split(' ')[1] === me;

  if (threatLine) {
    const flipped = nullMoveFen(fen);
    if (flipped) {
      const o = lineOutcome(flipped, threatLine.pv);
      const mv = applyUci(flipped, threatLine.pv[0]);
      if (mv && (o.mateFor === other(me) || o.material >= 1)) {
        const target = mv.move.captured ? `on ${mv.move.to}` : 'against your position';
        out.push({
          id: 'threat',
          kind: 'danger',
          theme: 'Their threat',
          text:
            o.mateFor === other(me)
              ? 'If you ignore their idea, there is a mating attack. King safety comes first this move.'
              : `They are threatening to win material ${target}. Whatever you play has to deal with that.`,
          squares: [mv.move.from, mv.move.to],
          priority: 11,
        });
      }
    }
  }

  if (toMove) {
    const o = lineOutcome(fen, best.pv);
    const mv = applyUci(fen, best.pv[0]);
    if (mv && (o.mateFor === me || o.material >= 2)) {
      const motifs = moveMotifs(fen, mv.move).map((m) => m.kind);
      const hint = motifs.map((k) => MOTIF_HINT[k]).find(Boolean);
      out.push({
        id: 'tactic',
        kind: 'opportunity',
        theme: o.mateFor === me ? 'Mating chance' : 'Tactic available',
        text:
          o.mateFor === me
            ? `There is a forced win against their king. Start with checks and look at every forcing move${hint ? ` — ${hint}` : ''}.`
            : `A tactic wins material here. Go through checks, captures and threats${hint ? ` — hint: ${hint}` : ''}.`,
        squares: [],
        priority: 10,
      });
    }
    const second = lines[1];
    if (second) {
      const w1 = winPct(lineScore(best), me);
      const w2 = winPct(lineScore(second), me);
      if (w1 - w2 >= 18 && w1 >= 30)
        out.push({
          id: 'only-move',
          kind: 'danger',
          theme: 'Critical moment',
          text: 'Only one move keeps your position together here. Slow down and calculate before you touch a piece.',
          squares: [],
          priority: 9,
        });
    }
    if (!out.some((x) => x.kind === 'opportunity' || x.id === 'threat') && Math.abs(best.cp ?? 0) < 60 && best.mate === undefined) {
      out.push({
        id: 'quiet',
        kind: 'plan',
        theme: 'Quiet position',
        text: 'No tactics are hiding here. This is a moment for a plan: improve your worst piece, fix a weakness or prepare a pawn break.',
        squares: [],
        priority: 2,
      });
    }
  }
  return out;
}

export function mergeInsights(a: Insight[], b: Insight[], max = 6): Insight[] {
  const seen = new Set<string>();
  // A concrete threat already covers "piece under attack" on the same square.
  const threat = b.find((x) => x.id === 'threat');
  if (threat) for (const x of a) if (x.id.startsWith('hanging-') && threat.squares.includes(x.squares[0])) seen.add(x.id);
  return [...b, ...a]
    .filter((x) => (seen.has(x.id) ? false : (seen.add(x.id), true)))
    .sort((x, y) => y.priority - x.priority)
    .slice(0, max);
}

/** Quick check used by tests and the breakdown takeaway. */
export function hasTheme(insights: Insight[], id: string) {
  return insights.some((i) => i.id.startsWith(id));
}
