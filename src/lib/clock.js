/**
 * Clocks and human-like time management for the bots.
 */
import { Chess } from './chess/core';
export const TIME_PRESETS = [
    { id: 'none', label: 'Untimed', tc: null, kind: 'Untimed' },
    { id: '1+0', label: '1+0', tc: { initial: 60_000, increment: 0 }, kind: 'Bullet' },
    { id: '2+1', label: '2+1', tc: { initial: 120_000, increment: 1_000 }, kind: 'Bullet' },
    { id: '3+0', label: '3+0', tc: { initial: 180_000, increment: 0 }, kind: 'Blitz' },
    { id: '3+2', label: '3+2', tc: { initial: 180_000, increment: 2_000 }, kind: 'Blitz' },
    { id: '5+0', label: '5+0', tc: { initial: 300_000, increment: 0 }, kind: 'Blitz' },
    { id: '5+3', label: '5+3', tc: { initial: 300_000, increment: 3_000 }, kind: 'Blitz' },
    { id: '10+0', label: '10+0', tc: { initial: 600_000, increment: 0 }, kind: 'Rapid' },
    { id: '10+5', label: '10+5', tc: { initial: 600_000, increment: 5_000 }, kind: 'Rapid' },
    { id: '15+10', label: '15+10', tc: { initial: 900_000, increment: 10_000 }, kind: 'Rapid' },
    { id: '30+0', label: '30+0', tc: { initial: 1_800_000, increment: 0 }, kind: 'Classical' },
    { id: '30+20', label: '30+20', tc: { initial: 1_800_000, increment: 20_000 }, kind: 'Classical' },
];
export function tcLabel(tc) {
    if (!tc)
        return 'Untimed';
    return `${Math.round(tc.initial / 60000)}+${Math.round(tc.increment / 1000)}`;
}
export function formatClock(ms) {
    const t = Math.max(0, ms);
    if (t < 10_000)
        return `${Math.floor(t / 1000)}.${Math.floor((t % 1000) / 100)}`;
    const total = Math.ceil(t / 1000);
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;
    return h ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}` : `${m}:${String(s).padStart(2, '0')}`;
}
export function remainingNow(clock, side, now = Date.now()) {
    const base = clock[side];
    return clock.running === side && clock.since ? base - (now - clock.since) : base;
}
/** 0 = relaxed, 1 = desperate. */
export function timePressure(remaining, tc) {
    const threshold = Math.max(tc.initial * 0.12, 15_000) + tc.increment * 4;
    if (remaining >= threshold)
        return 0;
    return Math.min(1, 1 - remaining / threshold);
}
function gaussian() {
    let u = 0;
    let v = 0;
    while (u === 0)
        u = Math.random();
    while (v === 0)
        v = Math.random();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}
/**
 * How long a human of the bot's strength would spend on this move.
 * Stronger bots are quicker, but nobody moves instantly; forced moves and
 * recaptures are fast, sharp positions take longer, and time pressure
 * squeezes everything.
 */
export function botThinkTime(opts) {
    const { fen, bot, tc, remaining } = opts;
    const chess = new Chess(fen);
    const legal = chess.moves({ verbose: true });
    const fullmove = parseInt(fen.split(' ')[5] || '1', 10);
    // Stronger bots decide faster.
    const speed = Math.max(0.5, Math.min(1.3, 1.3 - ((bot.elo - 800) / 2200) * 0.8));
    const movesLeft = Math.max(14, Math.min(36, 40 - fullmove * 0.5));
    let t = (remaining / movesLeft + tc.increment * 0.75) * speed;
    // Phase and position type
    if (opts.isBookMove || fullmove <= 4)
        t *= 0.3;
    else if (fullmove <= 10)
        t *= 0.7;
    const captures = legal.filter((m) => m.captured).length;
    const checks = legal.filter((m) => m.san.includes('+')).length;
    if (captures + checks >= 5)
        t *= 1.25;
    if (chess.inCheck() && legal.length <= 3)
        t *= 0.35;
    const recapture = opts.lastMoveSan?.includes('x') && legal.some((m) => m.captured && m.to === opts.lastMoveTo);
    if (recapture && Math.random() < 0.7)
        t *= 0.35;
    // Only one legal move: a person plays it almost at once — but not instantly.
    if (legal.length === 1)
        return Math.round(Math.min(300 + Math.random() * 400, Math.max(200, remaining * 0.1)));
    // Human variance
    t *= Math.exp(gaussian() * 0.35);
    // Bounds: never instant, never reckless with the clock.
    const minThink = Math.max(400, Math.min(2_000, tc.initial / 500));
    const pressure = timePressure(remaining, tc);
    let max = remaining * 0.12 + tc.increment * 0.5;
    if (pressure > 0)
        max = Math.min(max, remaining / (8 + pressure * 10) + tc.increment * 0.5);
    const lowFloor = pressure > 0.7 ? 250 + Math.random() * 350 : minThink;
    t = Math.max(Math.min(lowFloor, max), Math.min(t, max));
    return Math.max(200, Math.round(t));
}
export function hasMatingMaterial(fen, side) {
    const placement = fen.split(' ')[0];
    const pieces = [...placement].filter((ch) => /[a-z]/i.test(ch) && (side === 'w' ? ch === ch.toUpperCase() : ch === ch.toLowerCase()));
    const types = pieces.map((p) => p.toLowerCase()).filter((p) => p !== 'k');
    if (types.some((t) => t === 'q' || t === 'r' || t === 'p'))
        return true;
    const minors = types.filter((t) => t === 'b' || t === 'n').length;
    return minors >= 2;
}
