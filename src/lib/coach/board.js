export const VALUE = { p: 1, n: 3, b: 3.15, r: 5, q: 9, k: 100 };
export const idx = (sq) => (sq.charCodeAt(0) - 97) + (parseInt(sq[1], 10) - 1) * 8;
export const sqName = (i) => (String.fromCharCode(97 + (i % 8)) + (Math.floor(i / 8) + 1));
export const fileOf = (i) => i % 8;
export const rankOf = (i) => Math.floor(i / 8);
export function parseBoard(fen) {
    const [placement, turn, castling, ep] = fen.split(' ');
    const sq = new Array(64).fill(null);
    const rows = placement.split('/');
    for (let r = 0; r < 8; r++) {
        let f = 0;
        for (const ch of rows[r]) {
            if (/\d/.test(ch))
                f += parseInt(ch, 10);
            else {
                const color = ch === ch.toUpperCase() ? 'w' : 'b';
                sq[(7 - r) * 8 + f] = { type: ch.toLowerCase(), color };
                f++;
            }
        }
    }
    return {
        sq,
        turn: turn === 'b' ? 'b' : 'w',
        castling: castling || '-',
        ep: ep && ep !== '-' ? idx(ep) : null,
    };
}
export function cloneBoard(b) {
    return { ...b, sq: b.sq.slice() };
}
const KNIGHT = [
    [1, 2], [2, 1], [2, -1], [1, -2], [-1, -2], [-2, -1], [-2, 1], [-1, 2],
];
const KING = [
    [1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1], [1, -1],
];
const ROOK_DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];
const BISHOP_DIRS = [[1, 1], [1, -1], [-1, 1], [-1, -1]];
function inside(f, r) {
    return f >= 0 && f < 8 && r >= 0 && r < 8;
}
/** Squares attacked (not necessarily legally movable to) by the piece on i. */
export function attacksFrom(b, i) {
    const p = b.sq[i];
    if (!p)
        return [];
    const f = fileOf(i);
    const r = rankOf(i);
    const out = [];
    const push = (ff, rr) => {
        if (inside(ff, rr))
            out.push(rr * 8 + ff);
    };
    switch (p.type) {
        case 'p': {
            const dir = p.color === 'w' ? 1 : -1;
            push(f - 1, r + dir);
            push(f + 1, r + dir);
            break;
        }
        case 'n':
            for (const [df, dr] of KNIGHT)
                push(f + df, r + dr);
            break;
        case 'k':
            for (const [df, dr] of KING)
                push(f + df, r + dr);
            break;
        default: {
            const dirs = p.type === 'r' ? ROOK_DIRS : p.type === 'b' ? BISHOP_DIRS : [...ROOK_DIRS, ...BISHOP_DIRS];
            for (const [df, dr] of dirs) {
                let ff = f + df;
                let rr = r + dr;
                while (inside(ff, rr)) {
                    const t = rr * 8 + ff;
                    out.push(t);
                    if (b.sq[t])
                        break;
                    ff += df;
                    rr += dr;
                }
            }
        }
    }
    return out;
}
/** Indices of pieces of `color` that attack square `target`. */
export function attackersOf(b, target, color) {
    const res = [];
    for (let i = 0; i < 64; i++) {
        const p = b.sq[i];
        if (!p || p.color !== color)
            continue;
        if (attacksFrom(b, i).includes(target))
            res.push(i);
    }
    return res;
}
export function attackMap(b, color) {
    const counts = new Array(64).fill(0);
    for (let i = 0; i < 64; i++) {
        const p = b.sq[i];
        if (!p || p.color !== color)
            continue;
        for (const t of attacksFrom(b, i))
            counts[t]++;
    }
    return counts;
}
export function kingIndex(b, color) {
    return b.sq.findIndex((p) => p?.type === 'k' && p.color === color);
}
export function inCheck(b, color) {
    const k = kingIndex(b, color);
    return k >= 0 && attackersOf(b, k, color === 'w' ? 'b' : 'w').length > 0;
}
function leastValuableAttacker(b, target, color) {
    let best = -1;
    let bestVal = Infinity;
    for (const i of attackersOf(b, target, color)) {
        const v = VALUE[b.sq[i].type];
        if (v < bestVal) {
            bestVal = v;
            best = i;
        }
    }
    return best;
}
/**
 * Static exchange evaluation: material gain (in pawns) for `side` if it starts
 * capturing on `target`. Returns 0 if `side` cannot capture there.
 */
export function see(board, target, side) {
    const victim = board.sq[target];
    if (!victim || victim.color === side)
        return 0;
    const b = cloneBoard(board);
    const gain = [];
    let d = 0;
    gain[0] = VALUE[victim.type];
    let attacker = leastValuableAttacker(b, target, side);
    if (attacker < 0)
        return 0;
    let cur = side;
    for (;;) {
        d++;
        const attackerVal = VALUE[b.sq[attacker].type];
        gain[d] = attackerVal - gain[d - 1];
        if (Math.max(-gain[d - 1], gain[d]) < 0)
            break;
        b.sq[target] = b.sq[attacker];
        b.sq[attacker] = null;
        cur = cur === 'w' ? 'b' : 'w';
        attacker = leastValuableAttacker(b, target, cur);
        if (attacker < 0)
            break;
    }
    while (--d > 0)
        gain[d - 1] = -Math.max(-gain[d - 1], gain[d]);
    return gain[0];
}
/** Pieces of `color` the opponent could win material against right now. */
export function hangingPieces(b, color) {
    const opp = color === 'w' ? 'b' : 'w';
    const out = [];
    for (let i = 0; i < 64; i++) {
        const p = b.sq[i];
        if (!p || p.color !== color || p.type === 'k')
            continue;
        const s = see(b, i, opp);
        if (s >= 0.9)
            out.push({ index: i, square: sqName(i), piece: p, loss: s });
    }
    return out.sort((a, c) => c.loss - a.loss);
}
/** Apply a move on the model (no legality checks). */
export function makeMove(b, from, to, promotion) {
    const n = cloneBoard(b);
    const p = n.sq[from];
    if (!p)
        return n;
    // en passant capture
    if (p.type === 'p' && to === b.ep && fileOf(from) !== fileOf(to) && !n.sq[to]) {
        const capIdx = to + (p.color === 'w' ? -8 : 8);
        n.sq[capIdx] = null;
    }
    // castling rook
    if (p.type === 'k' && Math.abs(fileOf(to) - fileOf(from)) === 2) {
        const rank = rankOf(from);
        if (fileOf(to) === 6) {
            n.sq[rank * 8 + 5] = n.sq[rank * 8 + 7];
            n.sq[rank * 8 + 7] = null;
        }
        else {
            n.sq[rank * 8 + 3] = n.sq[rank * 8 + 0];
            n.sq[rank * 8 + 0] = null;
        }
    }
    n.sq[to] = promotion ? { type: promotion, color: p.color } : p;
    n.sq[from] = null;
    n.turn = p.color === 'w' ? 'b' : 'w';
    n.ep = null;
    return n;
}
/** Number of pseudo-legal destination squares (not occupied by own pieces). */
export function mobility(b, i) {
    const p = b.sq[i];
    if (!p)
        return 0;
    if (p.type === 'p')
        return 0;
    const oppPawnAttacks = new Set();
    for (let j = 0; j < 64; j++) {
        const q = b.sq[j];
        if (q && q.type === 'p' && q.color !== p.color)
            attacksFrom(b, j).forEach((t) => oppPawnAttacks.add(t));
    }
    return attacksFrom(b, i).filter((t) => b.sq[t]?.color !== p.color && !oppPawnAttacks.has(t)).length;
}
export function pieces(b, color, type) {
    const out = [];
    for (let i = 0; i < 64; i++) {
        const p = b.sq[i];
        if (!p)
            continue;
        if (color && p.color !== color)
            continue;
        if (type && p.type !== type)
            continue;
        out.push(i);
    }
    return out;
}
export function materialOf(b, color) {
    let m = 0;
    for (const p of b.sq)
        if (p && p.color === color && p.type !== 'k')
            m += Math.round(VALUE[p.type]);
    return m;
}
/** Pieces in a line from `from` in direction (df, dr): returns first two occupied squares. */
export function rayHits(b, from, df, dr) {
    const hits = [];
    let f = fileOf(from) + df;
    let r = rankOf(from) + dr;
    while (inside(f, r) && hits.length < 2) {
        const t = r * 8 + f;
        if (b.sq[t])
            hits.push(t);
        f += df;
        r += dr;
    }
    return hits;
}
export function sliderDirs(type) {
    if (type === 'r')
        return ROOK_DIRS;
    if (type === 'b')
        return BISHOP_DIRS;
    if (type === 'q')
        return [...ROOK_DIRS, ...BISHOP_DIRS];
    return [];
}
