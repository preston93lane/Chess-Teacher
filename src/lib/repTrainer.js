/**
 * Repertoire trainer (Chessable-style), in two phases:
 *  1. Learn — walk each line; your new moves are shown and explained, and
 *     at every branch you're told which reply gets which answer.
 *  2. Practise — the opponent picks replies from your tree (one fixed line,
 *     or any of them, weighted toward what's due or shaky) and you must play
 *     your move from memory. Each of your moves has its own review schedule.
 */
import { Chess, START_FEN } from './chess/core';
import { parseLine } from './openings/book';
import { lookup } from './explorer';
export const key = (sans) => sans.join(' ');
const treeCache = new WeakMap();
/** The opening's lines merged into one move tree (keyed by path from the start). */
export function buildTree(o) {
    const hit = treeCache.get(o);
    if (hit)
        return hit;
    const tree = new Map([['', { children: [] }]]);
    const lines = [];
    for (const l of o.lines) {
        let parsed;
        try {
            parsed = parseLine(o, l.id);
        }
        catch {
            continue;
        }
        if (!parsed.sans.length)
            continue;
        lines.push({ id: l.id, name: l.name, sans: parsed.sans });
        parsed.sans.forEach((san, i) => {
            const parent = key(parsed.sans.slice(0, i));
            const k = key(parsed.sans.slice(0, i + 1));
            const p = tree.get(parent);
            if (!p.children.includes(san))
                p.children.push(san);
            const node = tree.get(k) ?? { children: [] };
            if (!node.note && parsed.comments[i])
                node.note = parsed.comments[i];
            tree.set(k, node);
        });
    }
    const out = { tree, lines };
    treeCache.set(o, out);
    return out;
}
export const turnAt = (ply) => (ply % 2 === 0 ? 'w' : 'b');
export function fenAt(sans) {
    const c = new Chess(START_FEN);
    for (const s of sans)
        c.move(s);
    return c.fen();
}
/** Keys of your moves along a line. */
export function myKeys(sans, side) {
    const out = [];
    sans.forEach((_, i) => {
        if (turnAt(i) === side)
            out.push(key(sans.slice(0, i + 1)));
    });
    return out;
}
export function isLearned(line, side, stats) {
    return myKeys(line.sans, side).every((k) => stats[k]);
}
export function summary(lines, side, stats, now = Date.now()) {
    const all = new Set(lines.flatMap((l) => myKeys(l.sans, side)));
    let learned = 0;
    let due = 0;
    for (const k of all) {
        const s = stats[k];
        if (!s)
            continue;
        learned++;
        if (s.due <= now)
            due++;
    }
    return {
        moves: all.size,
        learnedMoves: learned,
        due,
        lines: lines.length,
        learnedLines: lines.filter((l) => isLearned(l, side, stats)).length,
    };
}
/** How much a subtree needs practice: due and recently failed moves count most. */
function needIn(tree, path, side, stats, now, onlyLearned) {
    let need = 0;
    let learned = 0;
    const walk = (p) => {
        const node = tree.get(key(p));
        if (!node)
            return;
        if (p.length && turnAt(p.length - 1) === side) {
            const s = stats[key(p)];
            if (s) {
                learned++;
                if (s.due <= now)
                    need += 3;
                if (s.lapses > 0 && s.interval < 3)
                    need += 2;
            }
            else if (!onlyLearned)
                need += 1;
        }
        for (const c of node.children)
            walk([...p, c]);
    };
    walk(path);
    return { need, learned };
}
/**
 * The opponent's reply in "whole repertoire" practice: any reply in your tree,
 * leaning toward branches with due or shaky moves. Returns null at a leaf.
 */
export function pickReply(tree, path, side, stats, onlyLearned, now = Date.now()) {
    const node = tree.get(key(path));
    if (!node || !node.children.length)
        return null;
    const options = node.children
        .map((san) => ({ san, ...needIn(tree, [...path, san], side, stats, now, onlyLearned) }))
        .filter((o) => !onlyLearned || o.learned > 0);
    if (!options.length)
        return null;
    const weights = options.map((o) => 1 + o.need);
    let r = Math.random() * weights.reduce((a, b) => a + b, 0);
    for (let i = 0; i < options.length; i++) {
        r -= weights[i];
        if (r <= 0)
            return options[i].san;
    }
    return options[options.length - 1].san;
}
/** Your repertoire moves in this position. */
export function myMoves(tree, path) {
    return tree.get(key(path))?.children ?? [];
}
export function moveLabel(ply, san) {
    return ply % 2 === 0 ? `${ply / 2 + 1}.${san}` : `${Math.floor(ply / 2) + 1}…${san}`;
}
// ---------------------------------------------------------------------------
// Off-book surprises and "where it goes next" (need the master explorer loaded)
/**
 * A popular master move the tree doesn't cover here (≥5% of games), picked
 * by popularity — the opponent stepping off your preparation.
 */
export function surpriseReply(tree, path) {
    const entry = lookup(fenAt(path));
    if (!entry || entry.total < 20)
        return null;
    const covered = new Set(tree.get(key(path))?.children ?? []);
    const options = entry.moves.filter((m) => !covered.has(m.san) && m.total / entry.total >= 0.05 && m.total >= 10);
    if (!options.length)
        return null;
    let r = Math.random() * options.reduce((a, m) => a + m.total, 0);
    for (const m of options) {
        r -= m.total;
        if (r <= 0)
            return { san: m.san, share: m.total / entry.total, games: m.total };
    }
    const m = options[0];
    return { san: m.san, share: m.total / entry.total, games: m.total };
}
/** The most-played master continuation from here, as UCI moves (up to `plies`). */
export function masterContinuation(path, plies, first) {
    const c = new Chess(fenAt(path));
    const out = [];
    for (let i = 0; i < plies; i++) {
        let san = i === 0 ? first : undefined;
        if (!san) {
            const entry = lookup(c.fen());
            if (!entry || !entry.moves.length || entry.moves[0].total < 5)
                break;
            san = entry.moves[0].san;
        }
        try {
            const m = c.move(san);
            out.push(m.from + m.to + (m.promotion ?? ''));
        }
        catch {
            break;
        }
    }
    return out;
}
/**
 * A reply to an off-book move that fits your repertoire: among the moves
 * masters play here (≥5%), prefer one you already play elsewhere in your tree
 * (Bf4, e3, c3 for a London player); else the most popular sound one.
 */
export function styledAnswer(tree, path, side) {
    const entry = lookup(fenAt(path));
    if (!entry || !entry.moves.length)
        return null;
    const mine = new Map();
    for (const [k, node] of tree) {
        const ply = k ? k.split(' ').length : 0;
        if (turnAt(ply) !== side)
            continue;
        for (const c of node.children)
            mine.set(c, (mine.get(c) ?? 0) + 1);
    }
    const options = entry.moves.filter((m) => m.total / entry.total >= 0.05 || m === entry.moves[0]);
    const score = (m) => {
        const share = m.total / entry.total;
        const res = side === 'w' ? (m.white + m.draws / 2) / m.total : (m.black + m.draws / 2) / m.total;
        return share + (m.total >= 5 ? res * 0.3 : 0) + (mine.has(m.san) ? 1 : 0);
    };
    const best = [...options].sort((a, b) => score(b) - score(a))[0];
    const share = Math.round((best.total / entry.total) * 100);
    return { san: best.san, reason: mine.has(best.san) ? `in keeping with your repertoire — ${share}% of master games` : `${share}% of master games` };
}
