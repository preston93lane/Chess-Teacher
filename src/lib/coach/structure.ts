/**
 * Positional features and pawn-structure recognition, plus the strategic
 * plans a coach would associate with each structure.
 */
import type { Color, PieceSymbol } from '../chess/core';
import {
  attackMap,
  fileOf,
  kingIndex,
  mobility,
  parseBoard,
  rankOf,
  sqName,
  VALUE,
  type BoardModel,
} from './board';

export type Phase = 'opening' | 'middlegame' | 'endgame';

export interface SideFeatures {
  material: number;
  bishopPair: boolean;
  castled: 'short' | 'long' | null;
  canCastle: boolean;
  kingSquare: string;
  kingShieldMissing: number;
  kingOpenFiles: string[];
  undeveloped: string[];
  isolated: string[];
  doubled: string[];
  backward: string[];
  passed: string[];
  islands: number;
  rooksOnOpen: string[];
  rooksOnSemiOpen: string[];
  rookOnSeventh: string[];
  outposts: string[];
  knightsOnOutposts: string[];
  badBishop: string | null;
  worstPiece: { square: string; type: PieceSymbol; mobility: number } | null;
  mobility: number;
  center: number;
  space: number;
}

export interface Structure {
  id: StructureId;
  /** Side that "owns" the defining feature (e.g. the side with the isolani). */
  owner: Color | null;
}

export type StructureId =
  | 'iqp'
  | 'hanging'
  | 'carlsbad'
  | 'french-chain'
  | 'kid-chain'
  | 'benoni'
  | 'maroczy'
  | 'hedgehog'
  | 'open-sicilian'
  | 'stonewall'
  | 'open-center'
  | 'locked-center'
  | 'slav-triangle';

export interface PositionFeatures {
  board: BoardModel;
  phase: Phase;
  w: SideFeatures;
  b: SideFeatures;
  openFiles: string[];
  semiOpen: Record<Color, string[]>;
  structures: Structure[];
  oppositeCastling: boolean;
  queensOn: boolean;
}

const FILES = 'abcdefgh';

function pawnFiles(b: BoardModel, color: Color): number[][] {
  const files: number[][] = Array.from({ length: 8 }, () => []);
  for (let i = 0; i < 64; i++) {
    const p = b.sq[i];
    if (p && p.type === 'p' && p.color === color) files[fileOf(i)].push(rankOf(i));
  }
  return files;
}

function has(files: number[][], file: number, rank?: number) {
  if (file < 0 || file > 7) return false;
  return rank === undefined ? files[file].length > 0 : files[file].includes(rank);
}

function sideFeatures(b: BoardModel, color: Color, fullmove: number): SideFeatures {
  const opp: Color = color === 'w' ? 'b' : 'w';
  const own = pawnFiles(b, color);
  const theirs = pawnFiles(b, opp);
  const forward = color === 'w' ? 1 : -1;
  const homeRank = color === 'w' ? 0 : 7;

  let material = 0;
  let bishops = 0;
  const undeveloped: string[] = [];
  for (let i = 0; i < 64; i++) {
    const p = b.sq[i];
    if (!p || p.color !== color) continue;
    if (p.type !== 'k') material += Math.round(VALUE[p.type]);
    if (p.type === 'b') bishops++;
    if ((p.type === 'n' || p.type === 'b') && rankOf(i) === homeRank) undeveloped.push(sqName(i));
  }

  // King
  const k = kingIndex(b, color);
  const kf = fileOf(k);
  const kr = rankOf(k);
  const castled: 'short' | 'long' | null = kr === homeRank ? (kf >= 6 ? 'short' : kf <= 2 ? 'long' : null) : null;
  const rights = b.castling;
  const canCastle = color === 'w' ? /[KQ]/.test(rights) : /[kq]/.test(rights);
  let kingShieldMissing = 0;
  const kingOpenFiles: string[] = [];
  if (castled) {
    for (let f = Math.max(0, kf - 1); f <= Math.min(7, kf + 1); f++) {
      const shield = own[f].some((r) => (r - kr) * forward >= 1 && (r - kr) * forward <= 2);
      if (!shield) kingShieldMissing++;
      if (!has(own, f)) kingOpenFiles.push(FILES[f]);
    }
  }

  // Pawn structure
  const isolated: string[] = [];
  const doubled: string[] = [];
  const backward: string[] = [];
  const passed: string[] = [];
  let islands = 0;
  let inIsland = false;
  for (let f = 0; f < 8; f++) {
    if (own[f].length) {
      if (!inIsland) islands++;
      inIsland = true;
    } else inIsland = false;
    if (own[f].length > 1) doubled.push(FILES[f]);
    for (const r of own[f]) {
      const sq = FILES[f] + (r + 1);
      const iso = !has(own, f - 1) && !has(own, f + 1);
      if (iso) isolated.push(sq);
      // passed: no enemy pawns ahead on same/adjacent files
      let isPassed = true;
      for (let df = -1; df <= 1; df++) {
        const ff = f + df;
        if (ff < 0 || ff > 7) continue;
        if (theirs[ff].some((er) => (er - r) * forward > 0)) isPassed = false;
      }
      if (isPassed) passed.push(sq);
      // backward: no friendly pawn on adjacent files level or behind, and stop square attacked by enemy pawn
      if (!iso) {
        const supported = [f - 1, f + 1].some((ff) => ff >= 0 && ff < 8 && own[ff].some((or) => (r - or) * forward >= 0));
        const stop = r + forward;
        const stopAttacked = [f - 1, f + 1].some((ff) => ff >= 0 && ff < 8 && theirs[ff].includes(stop + forward));
        const halfOpen = !has(theirs, f);
        if (!supported && stopAttacked && halfOpen) backward.push(sq);
      }
    }
  }

  // Rooks
  const rooksOnOpen: string[] = [];
  const rooksOnSemiOpen: string[] = [];
  const rookOnSeventh: string[] = [];
  const seventh = color === 'w' ? 6 : 1;
  for (let i = 0; i < 64; i++) {
    const p = b.sq[i];
    if (!p || p.color !== color || (p.type !== 'r' && p.type !== 'q')) continue;
    const f = fileOf(i);
    if (p.type === 'r') {
      if (!has(own, f) && !has(theirs, f)) rooksOnOpen.push(sqName(i));
      else if (!has(own, f)) rooksOnSemiOpen.push(sqName(i));
    }
    if (rankOf(i) === seventh) rookOnSeventh.push(sqName(i));
  }

  // Outposts in the enemy half supported by our pawn and immune to enemy pawns
  const outposts: string[] = [];
  const knightsOnOutposts: string[] = [];
  const ranks = color === 'w' ? [3, 4, 5] : [4, 3, 2];
  for (const r of ranks) {
    for (let f = 1; f < 7; f++) {
      const supported = [f - 1, f + 1].some((ff) => own[ff]?.includes(r - forward));
      if (!supported) continue;
      const attackable = [f - 1, f + 1].some((ff) => ff >= 0 && ff < 8 && theirs[ff].some((er) => (er - r) * forward > 0));
      if (attackable) continue;
      const i = r * 8 + f;
      const occ = b.sq[i];
      if (occ && occ.color === color && occ.type === 'p') continue;
      if (occ && occ.color === color && occ.type === 'n') knightsOnOutposts.push(sqName(i));
      else outposts.push(sqName(i));
    }
  }

  // Bad bishop & worst piece
  let badBishop: string | null = null;
  let worstPiece: SideFeatures['worstPiece'] = null;
  let totalMob = 0;
  for (let i = 0; i < 64; i++) {
    const p = b.sq[i];
    if (!p || p.color !== color || p.type === 'p' || p.type === 'k') continue;
    const mob = mobility(b, i);
    totalMob += mob;
    const devPenalty = rankOf(i) === homeRank && fullmove < 15 && (p.type === 'n' || p.type === 'b');
    if (!devPenalty && p.type !== 'q' && (!worstPiece || mob < worstPiece.mobility)) {
      worstPiece = { square: sqName(i), type: p.type, mobility: mob };
    }
    if (p.type === 'b') {
      const light = (fileOf(i) + rankOf(i)) % 2 === 1;
      let sameColorPawns = 0;
      let fixedCentral = 0;
      for (let f = 0; f < 8; f++) {
        for (const r of own[f]) {
          if (((f + r) % 2 === 1) === light) {
            sameColorPawns++;
            const blocked = b.sq[(r + forward) * 8 + f];
            if (f >= 2 && f <= 5 && blocked && blocked.type === 'p' && blocked.color === opp) fixedCentral++;
          }
        }
      }
      if (sameColorPawns >= 4 && fixedCentral >= 1 && mob <= 4) badBishop = sqName(i);
    }
  }
  if (worstPiece && worstPiece.mobility > 3) worstPiece = null;

  // Center & space
  const att = attackMap(b, color);
  const center = ['d4', 'd5', 'e4', 'e5'].reduce((s, sq) => {
    const i = (sq.charCodeAt(0) - 97) + (parseInt(sq[1], 10) - 1) * 8;
    return s + att[i] + (b.sq[i]?.color === color && b.sq[i]?.type === 'p' ? 2 : 0);
  }, 0);
  let space = 0;
  for (let i = 0; i < 64; i++) {
    const r = rankOf(i);
    const inTheirHalf = color === 'w' ? r >= 4 && r <= 5 : r >= 2 && r <= 3;
    const f = fileOf(i);
    if (inTheirHalf && f >= 2 && f <= 5 && att[i] > 0) space++;
  }

  return {
    material,
    bishopPair: bishops >= 2,
    castled,
    canCastle,
    kingSquare: sqName(k),
    kingShieldMissing,
    kingOpenFiles,
    undeveloped,
    isolated,
    doubled,
    backward,
    passed,
    islands,
    rooksOnOpen,
    rooksOnSemiOpen,
    rookOnSeventh,
    outposts: outposts.slice(0, 4),
    knightsOnOutposts,
    badBishop,
    worstPiece,
    mobility: totalMob,
    center,
    space,
  };
}

function detectStructures(b: BoardModel): Structure[] {
  const W = pawnFiles(b, 'w');
  const B = pawnFiles(b, 'b');
  const out: Structure[] = [];
  const [a, bb, c, d, e, f] = [0, 1, 2, 3, 4, 5];
  const push = (id: StructureId, owner: Color | null) => out.push({ id, owner });

  // Isolated queen's pawn
  if (has(W, d) && !has(W, c) && !has(W, e) && W[d].length === 1 && W[d][0] >= 3) push('iqp', 'w');
  if (has(B, d) && !has(B, c) && !has(B, e) && B[d].length === 1 && B[d][0] <= 4) push('iqp', 'b');
  // Hanging pawns c+d side by side, no b/e pawns
  if (has(W, c) && has(W, d) && !has(W, bb) && !has(W, e) && W[c].some((r) => W[d].includes(r)) && !has(B, c) && !has(B, d))
    push('hanging', 'w');
  if (has(B, c) && has(B, d) && !has(B, bb) && !has(B, e) && B[c].some((r) => B[d].includes(r)) && !has(W, c) && !has(W, d))
    push('hanging', 'b');
  // Carlsbad (QGD/Caro exchange): W d4 no c-pawn, B c6+d5 no e-pawn
  if (has(W, d, 3) && !has(W, c) && has(B, c, 5) && has(B, d, 4) && !has(B, e) && has(W, e)) push('carlsbad', 'w');
  if (has(B, d, 4) && !has(B, c) && has(W, c, 2) && has(W, d, 3) && !has(W, e) && has(B, e)) push('carlsbad', 'b');
  // French-type chain: W d4 e5 vs B d5 e6
  if (has(W, d, 3) && has(W, e, 4) && has(B, d, 4) && (has(B, e, 5) || has(B, c, 5))) push('french-chain', 'w');
  // KID chain: W d5 e4 vs B d6 e5
  if (has(W, d, 4) && has(W, e, 3) && has(B, d, 5) && has(B, e, 4)) push('kid-chain', 'b');
  // Benoni: W d5 (e4), B c5 d6, no black e-pawn, no white c-pawn
  if (has(W, d, 4) && !has(W, c) && has(B, c, 4) && has(B, d, 5) && !has(B, e)) push('benoni', 'b');
  // Hedgehog / Maroczy
  const maroczy = has(W, c, 3) && has(W, e, 3) && !has(W, d) && !has(B, c) && has(B, d);
  if (maroczy && has(B, a, 5) && has(B, bb, 5) && has(B, e, 5)) push('hedgehog', 'b');
  else if (maroczy) push('maroczy', 'w');
  // Open Sicilian: W e4 no d-pawn and no c4; B d-pawn, no c-pawn
  if (!maroczy && has(W, e, 3) && !has(W, d) && !has(W, c, 3) && !has(B, c) && has(B, d) && (has(B, e) || has(B, d, 5)))
    push('open-sicilian', 'b');
  // Stonewall
  if (has(W, d, 3) && has(W, e, 2) && has(W, f, 3)) push('stonewall', 'w');
  if (has(B, d, 4) && has(B, e, 5) && has(B, f, 4)) push('stonewall', 'b');
  // Slav triangle / semi-Slav: B c6 d5 e6 vs W d4 (c-pawn tension or e3)
  if (has(B, c, 5) && has(B, d, 4) && has(B, e, 5) && has(W, d, 3) && !out.length) push('slav-triangle', 'b');
  if (!out.length) {
    const centerPawns = W[d].length + W[e].length + B[d].length + B[e].length;
    if (centerPawns <= 1) push('open-center', null);
    const locked =
      W[d].some((r) => B[d].includes(r + 1)) || W[e].some((r) => B[e].includes(r + 1));
    if (locked) push('locked-center', null);
  }
  return out;
}

export function analyzePosition(fen: string): PositionFeatures {
  const board = parseBoard(fen);
  const fullmove = parseInt(fen.split(' ')[5] || '1', 10);
  const w = sideFeatures(board, 'w', fullmove);
  const b = sideFeatures(board, 'b', fullmove);
  const W = pawnFiles(board, 'w');
  const B = pawnFiles(board, 'b');
  const openFiles: string[] = [];
  const semiOpen: Record<Color, string[]> = { w: [], b: [] };
  for (let f = 0; f < 8; f++) {
    if (!W[f].length && !B[f].length) openFiles.push(FILES[f]);
    else if (!W[f].length) semiOpen.w.push(FILES[f]);
    else if (!B[f].length) semiOpen.b.push(FILES[f]);
  }
  const nonPawn = (c: Color) =>
    board.sq.reduce((s, p) => (p && p.color === c && p.type !== 'p' && p.type !== 'k' ? s + Math.round(VALUE[p.type]) : s), 0);
  const npm = nonPawn('w') + nonPawn('b');
  const queensOn = board.sq.some((p) => p?.type === 'q');
  let phase: Phase = 'middlegame';
  if (npm <= 24 || (!queensOn && npm <= 30)) phase = 'endgame';
  else if (fullmove <= 12 && (w.undeveloped.length + b.undeveloped.length >= 3 || (!w.castled && !b.castled)))
    phase = 'opening';
  const kw = fileOf(kingIndex(board, 'w'));
  const kb = fileOf(kingIndex(board, 'b'));
  const oppositeCastling = !!w.castled && !!b.castled && Math.abs(kw - kb) >= 4;
  return {
    board,
    phase,
    w,
    b,
    openFiles,
    semiOpen,
    structures: detectStructures(board),
    oppositeCastling,
    queensOn,
  };
}

// ---------------------------------------------------------------------------
// Structure knowledge
// ---------------------------------------------------------------------------

export interface StructureInfo {
  name: string;
  summary: string;
  /** Plans for the owner of the structure. */
  owner: string[];
  /** Plans for the side playing against it. */
  against: string[];
  lessonId?: string;
}

export const STRUCTURES: Record<StructureId, StructureInfo> = {
  iqp: {
    name: 'Isolated queen’s pawn',
    summary:
      'One side has a lone d-pawn. It grants space, open lines and outposts on e5/c5 (or e4/c4), but it can become a target if the pieces get traded.',
    owner: [
      'Keep pieces on the board — every trade makes the pawn weaker.',
      'Use the e5/c5 squares (e4/c4 for Black) as knight outposts.',
      'Aim at the king: battery of queen and bishop on the b1–h7 (b8–h2) diagonal, rook lift via the third rank.',
      'Look for the d4–d5 (…d5–d4) break when your pieces are centralised — it opens everything.',
    ],
    against: [
      'Blockade the square in front of the pawn with a knight — it is the ideal blockader.',
      'Trade minor pieces, especially the attacking bishop and knight.',
      'Pile up on the pawn with rooks on the d-file once the position simplifies.',
      'Head for an endgame: the isolani is a long-term weakness.',
    ],
    lessonId: 'iqp',
  },
  hanging: {
    name: 'Hanging pawns',
    summary:
      'Two side-by-side pawns on c- and d-files without neighbours. Dynamic when they can advance, vulnerable when they are blockaded or forced to move.',
    owner: [
      'Keep the pair side by side and look for the timely d-pawn advance.',
      'Use the half-open b- and e-files for your rooks.',
      'Avoid letting one pawn advance and leave the other isolated and backward.',
    ],
    against: [
      'Attack the pawns with pieces to force one of them forward.',
      'Once one advances, blockade the square in front and pressure the other.',
      'Trade pieces: hanging pawns lose energy in simplified positions.',
    ],
    lessonId: 'hanging-pawns',
  },
  carlsbad: {
    name: 'Carlsbad structure',
    summary:
      'The QGD Exchange structure: White has d4 against Black’s c6–d5 and half-open files on both sides. Plans are well established.',
    owner: [
      'Minority attack: b2–b4–b5 to create a weak c-pawn or isolated d-pawn.',
      'Alternatively, central play with f3 and e3–e4, backed by the pieces.',
      'Put a rook on the half-open c-file to support the minority attack.',
    ],
    against: [
      'Counterattack on the kingside: …Ne4, …f5 and a rook lift.',
      'Meet b4–b5 with …c5 or a well-timed …cxb5 to avoid a weak c-pawn.',
      'Use the e4 square as an outpost for your knight.',
    ],
    lessonId: 'minority-attack',
  },
  'french-chain': {
    name: 'French pawn chain',
    summary:
      'White has d4–e5 against Black’s d5–e6. White has kingside space; Black hits the chain base with …c5 and the head with …f6.',
    owner: [
      'Defend d4, the base of the chain — if it falls, e5 becomes weak.',
      'Use your kingside space: Qg4, f4–f5 or a piece attack on the king.',
      'Keep Black’s light-squared bishop locked behind its own pawns.',
    ],
    against: [
      'Strike the base with …c5 and pile up on d4 (…Nc6, …Qb6, …Nf5/e7).',
      'Break the head with …f6 once d4 is under pressure.',
      'Trade off or activate the bad light-squared bishop (…b6 and …Ba6, or …Bd7–e8–h5).',
    ],
    lessonId: 'pawn-chains',
  },
  'kid-chain': {
    name: 'King’s Indian chain',
    summary:
      'Locked center with White on d5–e4 against Black’s d6–e5. Play happens on the wings: White on the queenside, Black on the kingside.',
    owner: [
      'Attack the base of White’s chain with …f5 (and later …f4, …g5–g4).',
      'Bring pieces to the kingside: …Nf6–e8/…Nd7, …Rf7, …Bf8 for defence if needed.',
      'Speed matters more than material — this is a race.',
    ],
    against: [
      'Break on the queenside with c4–c5, opening the c-file toward c7.',
      'Use b4, a4 and Nb5/Nc4 to create pressure on d6 and c7.',
      'Keep a defender (Nf3/e1, Bf2) near your king before the storm arrives.',
    ],
    lessonId: 'pawn-chains',
  },
  benoni: {
    name: 'Benoni structure',
    summary:
      'White has a central majority (d5 + e-pawn) while Black has a queenside majority. Black’s dynamism vs. White’s e4–e5 break.',
    owner: [
      'Activate the queenside majority with …a6 and …b5.',
      'Use the long diagonal (…Bg7) and the e-file for your rook.',
      'Watch for White’s e4–e5 break; a knight on e5 is a key blockader.',
    ],
    against: [
      'Prepare e4–e5 to open the center while Black’s pieces are offside.',
      'Restrict …b5 with a4 and keep a knight ready for c4.',
      'Target d6, Black’s backward pawn.',
    ],
  },
  maroczy: {
    name: 'Maróczy bind',
    summary:
      'White’s pawns on c4 and e4 clamp d5 and restrict Black’s counterplay. Black has fewer pawn breaks and must play patiently.',
    owner: [
      'Keep the bind: prevent …b5 and …d5 for as long as possible.',
      'Avoid unnecessary piece trades — the cramped side benefits.',
      'Expand slowly (b3, Rc1, f3 or f4) and use the extra space.',
    ],
    against: [
      'Trade pieces to relieve the cramp (…Nxd4 and …Be6).',
      'Prepare the …b5 or …f5 break once your pieces are ready.',
      'Use the dark squares (…Bg7, …Nd7–c5) for activity.',
    ],
    lessonId: 'hedgehog',
  },
  hedgehog: {
    name: 'Hedgehog',
    summary:
      'Black sets pawns on a6, b6, d6, e6 behind a Maróczy bind. Compact and resilient — waiting for the moment to break with …b5 or …d5.',
    owner: [
      'Be patient: maneuver behind the pawns until a break is possible.',
      'Prepare …b5 or …d5 — when it works, the position springs open.',
      'Keep the bishops: they become strong once the position opens.',
    ],
    against: [
      'Restrain both breaks (…b5 and …d5) before attacking.',
      'Prepare e4–e5 or f4–f5 only with full support.',
      'Don’t over-extend — the hedgehog bites when you lose control.',
    ],
    lessonId: 'hedgehog',
  },
  'open-sicilian': {
    name: 'Open Sicilian',
    summary:
      'White has a pawn on e4 vs Black’s d-pawn and no c-pawns: White has development and attacking chances; Black has the half-open c-file and a central pawn majority.',
    owner: [
      'Use the half-open c-file: …Rc8, …Qc7, sacrifices on c3 are thematic.',
      'Expand with …b5 and …b4 to kick the c3 knight.',
      'Keep the d5 square under control (…e6/…e5, …Nf6, …Be6).',
    ],
    against: [
      'Attack: f4/f3, g4–g5, opposite-side castling and a pawn storm.',
      'Control d5 — a knight landing there is often decisive.',
      'Keep your knight on d4 central until a clear plan exists.',
    ],
    lessonId: 'opposite-castling',
  },
  stonewall: {
    name: 'Stonewall',
    summary:
      'Pawns on d4/e3/f4 (or d5/e6/f5) give a firm grip on e5 (e4). The cost is a bad bishop and a hole on e4 (e5).',
    owner: [
      'Occupy the outpost in front (Ne5 / …Ne4) and support it with f-pawn.',
      'Attack on the kingside: rook lift via f3 or f6, queen to h5/h4.',
      'Trade off your bad bishop if you can (Ba3 or …Ba6 ideas).',
    ],
    against: [
      'Exploit the hole: put a knight on e5 (e4) and challenge the outpost.',
      'Trade the good bishop and leave the opponent with the bad one.',
      'Play on the queenside, where the stonewall gives no support.',
    ],
  },
  'slav-triangle': {
    name: 'Slav / Semi-Slav triangle',
    summary:
      'Black’s pawns on c6, d5 and e6 form a solid triangle. White tries to use space and the e4 break; Black seeks …c5 or …e5 to free the game.',
    owner: [
      'Prepare a freeing break: …c5 or …e5 releases the position.',
      'Develop the light-squared bishop before …e6 or via b7 after …dxc4 and …b5.',
      'Stay solid, then counter in the center.',
    ],
    against: [
      'Play for e3–e4 to gain central space.',
      'Use the queenside space if Black takes on c4 (a4 to undermine b5).',
      'Restrict Black’s freeing breaks.',
    ],
  },
  'open-center': {
    name: 'Open center',
    summary:
      'Few or no central pawns. Development, piece activity and king safety are everything; open files favour the rooks.',
    owner: [],
    against: [],
  },
  'locked-center': {
    name: 'Locked center',
    summary:
      'Central pawns are blocked. Play shifts to the wings, and pawn breaks decide the game. Knights often outperform bishops here.',
    owner: [],
    against: [],
  },
};
