/**
 * Placement game: Rookie opens at full strength, then plays a little worse
 * every few moves, from small inaccuracies to leaving pieces hanging. How the
 * player copes with strong play (accuracy) and whether they punish the
 * gifts gives a rough Elo, blended with the rating they told the quiz.
 */
import { Chess, type Color } from '../chess/core';
import { engine, type EngineLine } from '../engine/stockfish';
import { moveAccuracy, scoreCp, winPctWhite } from '../coach/eval';
import { LEVELS } from '../../data/path';
import type { Level, Unit } from './types';

export type Phase = 'strong' | 'steady' | 'shaky' | 'generous';

export const PHASES: { id: Phase; from: number; lo: number; hi: number; label: string }[] = [
  { id: 'strong', from: 1, lo: 0, hi: 15, label: 'full strength' },
  { id: 'steady', from: 9, lo: 35, hi: 100, label: 'small inaccuracies' },
  { id: 'shaky', from: 15, lo: 120, hi: 260, label: 'real mistakes' },
  { id: 'generous', from: 21, lo: 300, hi: 900, label: 'hanging pieces' },
];

/** Rookie's moves, at most; the game ends here at the latest. */
export const MAX_BOT_MOVES = 28;

export function phaseFor(botMoveNo: number): (typeof PHASES)[number] {
  let p = PHASES[0];
  for (const ph of PHASES) if (botMoveNo >= ph.from) p = ph;
  return p;
}

const CAP = 1500;
/** Centipawns from `pov`'s side, mates squashed to ±CAP. */
export function cpFor(l: EngineLine | undefined, pov: Color): number {
  if (!l) return 0;
  const v = Math.max(-CAP, Math.min(CAP, scoreCp({ cp: l.cp, mate: l.mate })));
  return pov === 'w' ? v : -v;
}

export interface BotChoice {
  uci: string;
  /** How much worse than the best move, in centipawns (bot's view). */
  loss: number;
  /** Eval for the player after their last move (before the bot moved). */
  userAfterTheirMove: number;
  /** Eval for the player now, after the bot's move. */
  userNow: number;
  phase: Phase;
}

/** Pick Rookie's move for this stage of the game. */
export async function placementMove(fen: string, botMoveNo: number, rnd = Math.random): Promise<BotChoice | null> {
  const chess = new Chess(fen);
  const legal = chess.moves({ verbose: true });
  if (!legal.length) return null;
  const bot = chess.turn() as Color;
  const ph = phaseFor(botMoveNo);
  const multipv = ph.id === 'strong' ? Math.min(3, legal.length) : Math.min(legal.length, ph.id === 'steady' ? 8 : 30);
  const res = await engine.analyze(fen, { depth: ph.id === 'strong' ? 12 : 9, multipv });
  const lines = res.lines.filter((l) => l.pv[0]);
  if (!lines.length) {
    const m = legal[0];
    return { uci: m.from + m.to + (m.promotion ?? ''), loss: 0, userAfterTheirMove: 0, userNow: 0, phase: ph.id };
  }
  const best = cpFor(lines[0], bot);
  const scored = lines.map((l) => ({ l, loss: Math.max(0, best - cpFor(l, bot)) }));
  // Never throw away a forced mate or walk into mate-in-one on purpose before the last phase.
  const safe = scored.filter((s) => ph.id === 'generous' || !(s.l.mate !== undefined && (bot === 'w' ? s.l.mate < 0 : s.l.mate > 0) && Math.abs(s.l.mate) <= 1));
  const pool = safe.length ? safe : scored;
  let pick = pool[0];
  if (ph.id === 'strong') {
    const near = pool.filter((s) => s.loss <= ph.hi);
    pick = near[Math.floor(rnd() * near.length)] ?? pool[0];
  } else {
    const inBand = pool.filter((s) => s.loss >= ph.lo && s.loss <= ph.hi);
    if (inBand.length) pick = inBand[Math.floor(rnd() * inBand.length)];
    else {
      // Closest to the middle of the band, but never worse than its top.
      const mid = (ph.lo + ph.hi) / 2;
      const under = pool.filter((s) => s.loss <= ph.hi);
      pick = (under.length ? under : pool).reduce((a, b) => (Math.abs(b.loss - mid) < Math.abs(a.loss - mid) ? b : a));
    }
  }
  return {
    uci: pick.l.pv[0],
    loss: pick.loss,
    userAfterTheirMove: -best,
    userNow: -cpFor(pick.l, bot),
    phase: ph.id,
  };
}

export interface UserMoveRecord {
  ply: number;
  san: string;
  /** Player's eval before and after the move (centipawns, own side). */
  before: number;
  after: number;
  /** The bot's mistake just before this move (cp), if any. */
  gift: number;
  phase: Phase;
}

const wp = (cp: number) => winPctWhite({ cp });

export interface PlacementResult {
  elo: number;
  gameElo: number;
  moves: number;
  /** Average centipawn loss. */
  acpl: number;
  accuracy: number;
  /** Accuracy against Rookie's full-strength opening phase. */
  strongAccuracy: number | null;
  chances: number;
  punished: number;
  blunders: number;
  mistakes: number;
  /** Player's own words in the quiz carried this much of the final number. */
  priorWeight: number;
  notes: string[];
}

const ACC_ELO: [number, number][] = [
  [30, 300],
  [45, 450],
  [55, 650],
  [65, 900],
  [72, 1150],
  [78, 1400],
  [84, 1650],
  [89, 1900],
  [93, 2150],
  [97, 2400],
];

// Average centipawn loss → rating (rough, from published club-level statistics).
const ACPL_ELO: [number, number][] = [
  [12, 2400],
  [20, 2100],
  [30, 1800],
  [45, 1500],
  [65, 1200],
  [90, 950],
  [130, 700],
  [200, 450],
  [300, 300],
].map(([a, e]) => [-a, e] as [number, number]).reverse() as [number, number][];

function interpAcpl(x: number) {
  return interp(ACPL_ELO, -x);
}

function interp(table: [number, number][], x: number) {
  if (x <= table[0][0]) return table[0][1];
  for (let i = 1; i < table.length; i++) {
    const [x1, y1] = table[i];
    const [x0, y0] = table[i - 1];
    if (x <= x1) return y0 + ((x - x0) / (x1 - x0)) * (y1 - y0);
  }
  return table[table.length - 1][1];
}

/** Turn the game into a rating estimate. `prior` is the quiz rating. */
export function scorePlacement(moves: UserMoveRecord[], prior: number, result: 'win' | 'loss' | 'draw' | 'stopped'): PlacementResult {
  const counted = moves.filter((m) => !(Math.abs(m.before) >= 1000 && Math.abs(m.after) >= 1000 && Math.sign(m.before) === Math.sign(m.after)));
  const accs = counted.map((m) => moveAccuracy(wp(m.before), wp(m.after)));
  const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
  // Mean pulls in blunders; the median keeps one bad moment from deciding everything.
  const accuracy = accs.length ? Math.round((mean(accs) * 0.7 + median(accs) * 0.3) * 10) / 10 : 0;
  const strong = counted.filter((m) => m.phase === 'strong').map((m) => moveAccuracy(wp(m.before), wp(m.after)));
  // Centipawn loss per move, with evals squashed to ±1000 so mates don't dominate.
  const sq = (x: number) => Math.max(-1000, Math.min(1000, x));
  const losses = counted.map((m) => Math.max(0, sq(m.before) - sq(m.after)));
  const acpl = losses.length ? losses.reduce((a, b) => a + b, 0) / losses.length : 0;
  const blunders = losses.filter((l) => l >= 300).length;
  const mistakes = losses.filter((l) => l >= 120 && l < 300).length;
  const chancesList = moves.filter((m) => m.gift >= 150 && m.before >= 100);
  const punishedList = chancesList.filter((m) => m.before - m.after <= Math.max(70, m.gift * 0.35));
  const chances = chancesList.length;
  const punished = punishedList.length;

  // Win%-accuracy is lenient once a game is lost; average centipawn loss is not.
  const skillElo = interpAcpl(acpl) * 0.65 + interp(ACC_ELO, accuracy) * 0.35;
  const punishElo = chances ? 450 + 1450 * (punished / chances) : skillElo;
  const wP = Math.min(1.5, chances * 0.45);
  let gameElo = (skillElo * 2 + punishElo * wP) / (2 + wP);
  if (counted.length && blunders / counted.length >= 0.2) gameElo = Math.min(gameElo, 900);
  // How the player came out of Rookie's full-strength opening phase.
  const afterStrong = moves.find((m) => m.phase !== 'strong')?.before ?? moves[moves.length - 1]?.after ?? 0;
  if (afterStrong <= -600) gameElo = Math.min(gameElo, 850);
  else if (afterStrong <= -300) gameElo = Math.min(gameElo, 1100);
  else if (afterStrong >= -60 && moves.length >= 8 && acpl < 60) gameElo = Math.max(gameElo, 1000);
  if (result === 'loss' && moves.length < 14) gameElo -= 150;
  if (result === 'win') gameElo += 60;
  const priorWeight = Math.max(0.15, 1 - Math.min(0.85, counted.length / 16));
  const elo = clamp(Math.round((gameElo * (1 - priorWeight) + prior * priorWeight) / 25) * 25, 300, 2300);

  const notes: string[] = [];
  if (strong.length >= 3) {
    const s = mean(strong);
    notes.push(
      s >= 85
        ? 'You held your own while I was playing at full strength.'
        : s >= 70
          ? 'You stayed fairly steady while I played my best in the opening.'
          : 'My strongest moves early on caused you real problems.',
    );
  }
  if (chances) {
    notes.push(
      punished === chances
        ? `I left you ${chances} gift${chances === 1 ? '' : 's'} late in the game and you took every one.`
        : punished === 0
          ? `I left you ${chances} gift${chances === 1 ? '' : 's'} late in the game — you didn’t spot ${chances === 1 ? 'it' : 'any of them'}. Spotting loose pieces is the fastest way to gain rating.`
          : `I left you ${chances} gifts late in the game and you punished ${punished}.`,
    );
  }
  if (blunders) notes.push(`${blunders} of your moves gave away a lot (three points or more).`);
  else if (counted.length >= 10) notes.push('No big blunders from you — nice.');
  return {
    elo,
    gameElo: Math.round(gameElo),
    moves: moves.length,
    acpl: Math.round(acpl),
    accuracy,
    strongAccuracy: strong.length ? Math.round(mean(strong)) : null,
    chances,
    punished,
    blunders,
    mistakes,
    priorWeight,
    notes,
  };
}

function median(xs: number[]) {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

function clamp(x: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, x));
}

/* ---------- starting point on the path ---------- */

export interface UnitSpot {
  unit: Unit;
  level: Level;
  /** Index among all units. */
  index: number;
  /** The rating this unit is pitched at. */
  rating: number;
}

export function unitSpots(): UnitSpot[] {
  const out: UnitSpot[] = [];
  for (const level of LEVELS) {
    const [lo, hi] = level.range;
    level.units.forEach((unit, i) => out.push({ unit, level, index: out.length, rating: Math.round((lo + (i * (hi - lo)) / level.units.length) / 25) * 25 }));
  }
  return out;
}

/** The unit to start at for a rating: a little below it, so gaps get filled. */
export function startUnitFor(rating: number): UnitSpot {
  const spots = unitSpots();
  const target = rating - 100;
  let pick = spots[0];
  for (const s of spots) if (s.rating <= target) pick = s;
  return pick;
}
