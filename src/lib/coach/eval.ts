import type { Color } from '../chess/core';
import type { EngineLine } from '../engine/stockfish';

/** Score from White's point of view. */
export interface Score {
  cp?: number;
  mate?: number;
}

export function lineScore(l?: EngineLine): Score | undefined {
  if (!l) return undefined;
  return { cp: l.cp, mate: l.mate };
}

/** Centipawns from White's perspective; mates mapped to large values. */
export function scoreCp(s: Score | undefined): number {
  if (!s) return 0;
  if (s.mate !== undefined) {
    if (s.mate === 0) return 0;
    return s.mate > 0 ? 10000 - s.mate * 10 : -10000 - s.mate * 10;
  }
  return s.cp ?? 0;
}

/** Lichess win-probability model, White's win chance 0–100. */
export function winPctWhite(s: Score | undefined): number {
  if (!s) return 50;
  if (s.mate !== undefined) {
    if (s.mate === 0) return s.cp === undefined || s.cp === 0 ? 50 : s.cp > 0 ? 100 : 0;
    return s.mate > 0 ? 100 : 0;
  }
  const cp = Math.max(-1000, Math.min(1000, s.cp ?? 0));
  return 50 + 50 * (2 / (1 + Math.exp(-0.00368208 * cp)) - 1);
}

export function winPct(s: Score | undefined, pov: Color): number {
  const w = winPctWhite(s);
  return pov === 'w' ? w : 100 - w;
}

/** Lichess per-move accuracy from win% before/after (mover's POV). */
export function moveAccuracy(winBefore: number, winAfter: number): number {
  const diff = Math.max(0, winBefore - winAfter);
  const raw = 103.1668 * Math.exp(-0.04354 * diff) - 3.1669;
  return Math.max(0, Math.min(100, raw + 1));
}

export function formatScore(s: Score | undefined, pov: Color = 'w'): string {
  if (!s) return '—';
  const sign = pov === 'w' ? 1 : -1;
  if (s.mate !== undefined) {
    const m = s.mate * sign;
    if (m === 0) return '#';
    return m > 0 ? `#${m}` : `#-${Math.abs(m)}`;
  }
  const v = ((s.cp ?? 0) * sign) / 100;
  if (Math.abs(v) < 0.05) return '0.0';
  return (v > 0 ? '+' : '') + v.toFixed(Math.abs(v) >= 10 ? 0 : 1);
}

export function negate(s: Score): Score {
  return { cp: s.cp !== undefined ? -s.cp : undefined, mate: s.mate !== undefined ? -s.mate : undefined };
}

/** Plain-English verdict on a score. */
export function describeScore(s: Score | undefined): string {
  if (!s) return 'Unclear';
  if (s.mate !== undefined) {
    if (s.mate === 0) return 'Checkmate';
    const who = s.mate > 0 ? 'White' : 'Black';
    return `${who} mates in ${Math.abs(s.mate)}`;
  }
  const cp = s.cp ?? 0;
  const who = cp > 0 ? 'White' : 'Black';
  const a = Math.abs(cp);
  if (a < 30) return 'Equal';
  if (a < 80) return `${who} is slightly better`;
  if (a < 180) return `${who} is clearly better`;
  if (a < 400) return `${who} is winning`;
  return `${who} is completely winning`;
}
