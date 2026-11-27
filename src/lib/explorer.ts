/**
 * Offline opening explorer built from over-the-board master games
 * (Lichess broadcast database, CC0). Loaded on first use.
 */
import { fenKey } from './chess/core';

export interface ExplorerMove {
  san: string;
  white: number;
  draws: number;
  black: number;
  total: number;
  avgElo: number;
}

export interface MasterGame {
  index: number;
  white: string;
  black: string;
  whiteElo: number;
  blackElo: number;
  year: string;
  result: string;
  event: string;
  moves: string[];
}

export interface ExplorerEntry {
  moves: ExplorerMove[];
  total: number;
  games: MasterGame[];
}

interface Raw {
  source: string;
  games: number;
  positions: Record<string, [[string, number, number, number, number][], number[]?]>;
  top: [string, string, number, number, string, string, string, string][];
}

let raw: Raw | null = null;
let loading: Promise<Raw> | null = null;

export function loadExplorer(): Promise<Raw> {
  if (raw) return Promise.resolve(raw);
  if (!loading) {
    loading = import('../data/explorer.json').then((m) => {
      raw = (m.default ?? m) as unknown as Raw;
      return raw;
    });
  }
  return loading;
}

export function explorerReady() {
  return raw !== null;
}

export function explorerMeta() {
  return raw ? { source: raw.source, games: raw.games, positions: Object.keys(raw.positions).length } : null;
}

function game(i: number): MasterGame {
  const t = raw!.top[i];
  return { index: i, white: t[0], black: t[1], whiteElo: t[2], blackElo: t[3], year: t[4], result: t[5], event: t[6], moves: t[7].split(' ') };
}

export function getMasterGame(i: number): MasterGame | null {
  return raw && raw.top[i] ? game(i) : null;
}

/** Master statistics for a position (null when out of the database). */
export function lookup(fen: string): ExplorerEntry | null {
  if (!raw) return null;
  const node = raw.positions[fenKey(fen)];
  if (!node) return null;
  const moves = node[0].map(([san, w, d, b, elo]) => ({ san, white: w, draws: d, black: b, total: w + d + b, avgElo: elo }));
  return {
    moves,
    total: moves.reduce((a, m) => a + m.total, 0),
    games: (node[1] ?? []).map(game),
  };
}

export function pct(n: number, total: number) {
  return total ? Math.round((n / total) * 100) : 0;
}

/** Expected score for the side to move after this move, 0–1. */
export function scoreFor(m: ExplorerMove, mover: 'w' | 'b') {
  const s = (m.white + m.draws / 2) / (m.total || 1);
  return mover === 'w' ? s : 1 - s;
}

/** "Norway Chess 2025" — without repeating the year when the event name has it. */
export function eventLabel(g: { event: string; year: string }) {
  return g.event.includes(g.year) ? g.event : `${g.event} ${g.year}`.trim();
}
