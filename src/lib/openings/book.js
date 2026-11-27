import { Chess, START_FEN, fenKey, uciOf } from '../chess/core';
import { parseMovetext } from '../chess/pgn';
import { OPENINGS } from '../../data/openings';
const parsedCache = new Map();
let index = null;
export function parseLine(opening, lineId) {
    const key = `${opening.id}/${lineId}`;
    const cached = parsedCache.get(key);
    if (cached)
        return cached;
    const line = opening.lines.find((l) => l.id === lineId);
    if (!line)
        throw new Error(`Unknown line ${key}`);
    const { sans: tokens, intro } = parseMovetext(line.pgn);
    const chess = new Chess(START_FEN);
    const fens = [chess.fen()];
    const sans = [];
    const ucis = [];
    const comments = [];
    for (const t of tokens) {
        const m = chess.move(t.san);
        sans.push(m.san);
        ucis.push(uciOf(m));
        fens.push(chess.fen());
        comments.push(t.comment);
    }
    const parsed = { openingId: opening.id, lineId, name: line.name, sans, ucis, fens, comments, intro };
    parsedCache.set(key, parsed);
    return parsed;
}
export function allLines(opening) {
    return opening.lines.map((l) => parseLine(opening, l.id));
}
function buildIndex() {
    const map = new Map();
    for (const o of OPENINGS) {
        for (const l of allLines(o)) {
            l.sans.forEach((san, i) => {
                const key = fenKey(l.fens[i]);
                let node = map.get(key);
                if (!node) {
                    node = { moves: [] };
                    map.set(key, node);
                }
                let bm = node.moves.find((m) => m.san === san);
                if (!bm) {
                    bm = { san, uci: l.ucis[i], count: 0, refs: [] };
                    node.moves.push(bm);
                }
                bm.count++;
                if (!bm.note && l.comments[i])
                    bm.note = l.comments[i];
                if (!bm.refs.some((r) => r.openingId === o.id && r.lineId === l.lineId))
                    bm.refs.push({ openingId: o.id, lineId: l.lineId });
            });
        }
    }
    return map;
}
export function lookupBook(key) {
    if (!index)
        index = buildIndex();
    return index.get(key);
}
/** Book moves restricted to one opening (used by the practice bot). */
export function openingBookMoves(opening, fen) {
    const key = fenKey(fen);
    const res = new Map();
    for (const l of allLines(opening)) {
        l.fens.forEach((f, i) => {
            if (i >= l.sans.length)
                return;
            if (fenKey(f) !== key)
                return;
            const san = l.sans[i];
            const bm = res.get(san) ?? { san, uci: l.ucis[i], count: 0, refs: [] };
            bm.count++;
            bm.refs.push({ openingId: opening.id, lineId: l.lineId });
            if (!bm.note && l.comments[i])
                bm.note = l.comments[i];
            res.set(san, bm);
        });
    }
    return [...res.values()];
}
let customResolver = null;
/** Lets your own repertoires ("rep:<id>") resolve as openings. */
export function setCustomOpeningResolver(fn) {
    customResolver = fn;
}
export function getOpening(id) {
    return OPENINGS.find((o) => o.id === id) ?? customResolver?.(id);
}
/** Positions in a line where the student must find a move. */
export function studentPlies(line, side) {
    const startTurn = line.fens[0].split(' ')[1];
    return line.sans
        .map((_, i) => i)
        .filter((i) => (i % 2 === 0 ? startTurn : startTurn === 'w' ? 'b' : 'w') === side);
}
export function pickWeighted(items) {
    const total = items.reduce((s, i) => s + i.count, 0);
    let r = Math.random() * total;
    for (const it of items) {
        r -= it.count;
        if (r <= 0)
            return it;
    }
    return items[0];
}
