/**
 * Offline opening explorer built from over-the-board master games
 * (Lichess broadcast database, CC0). Loaded on first use.
 */
import { fenKey } from './chess/core';
let raw = null;
let loading = null;
export function loadExplorer() {
    if (raw)
        return Promise.resolve(raw);
    if (!loading) {
        loading = import('../data/explorer.json').then((m) => {
            raw = (m.default ?? m);
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
function game(i) {
    const t = raw.top[i];
    return { index: i, white: t[0], black: t[1], whiteElo: t[2], blackElo: t[3], year: t[4], result: t[5], event: t[6], moves: t[7].split(' ') };
}
export function getMasterGame(i) {
    return raw && raw.top[i] ? game(i) : null;
}
/** Master statistics for a position (null when out of the database). */
export function lookup(fen) {
    if (!raw)
        return null;
    const node = raw.positions[fenKey(fen)];
    if (!node)
        return null;
    const moves = node[0].map(([san, w, d, b, elo]) => ({ san, white: w, draws: d, black: b, total: w + d + b, avgElo: elo }));
    return {
        moves,
        total: moves.reduce((a, m) => a + m.total, 0),
        games: (node[1] ?? []).map(game),
    };
}
export function pct(n, total) {
    return total ? Math.round((n / total) * 100) : 0;
}
/** Expected score for the side to move after this move, 0–1. */
export function scoreFor(m, mover) {
    const s = (m.white + m.draws / 2) / (m.total || 1);
    return mover === 'w' ? s : 1 - s;
}
/** "Norway Chess 2025" — without repeating the year when the event name has it. */
export function eventLabel(g) {
    return g.event.includes(g.year) ? g.event : `${g.event} ${g.year}`.trim();
}
