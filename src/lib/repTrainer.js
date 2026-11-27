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
