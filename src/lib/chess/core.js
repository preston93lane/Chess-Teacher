import { Chess } from 'chess.js';
export { Chess };
export const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
export const FILES = 'abcdefgh';
export const PIECE_VALUE = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
export const PIECE_NAME = {
    p: 'pawn',
    n: 'knight',
    b: 'bishop',
    r: 'rook',
    q: 'queen',
    k: 'king',
};
export const COLOR_NAME = { w: 'White', b: 'Black' };
export function other(c) {
    return c === 'w' ? 'b' : 'w';
}
/** Position identity without move counters (used for book / ECO lookups). */
export function fenKey(fen) {
    const parts = fen.split(' ');
    // Normalise en passant: keep only if a capture is actually possible.
    const ep = parts[3];
    if (ep && ep !== '-') {
        try {
            const c = new Chess(fen);
            const legalEp = c.moves({ verbose: true }).some((m) => m.flags.includes('e'));
            if (!legalEp)
                parts[3] = '-';
        }
        catch {
            parts[3] = '-';
        }
    }
    return parts.slice(0, 4).join(' ');
}
export function sideToMove(fen) {
    return fen.split(' ')[1] === 'b' ? 'b' : 'w';
}
export function moveNumber(fen) {
    return parseInt(fen.split(' ')[5] || '1', 10);
}
export function sqFile(sq) {
    return sq.charCodeAt(0) - 97;
}
export function sqRank(sq) {
    return parseInt(sq[1], 10) - 1;
}
export function toSq(file, rank) {
    return (FILES[file] + (rank + 1));
}
export function onBoard(file, rank) {
    return file >= 0 && file < 8 && rank >= 0 && rank < 8;
}
export function isLightSquare(sq) {
    return (sqFile(sq) + sqRank(sq)) % 2 === 1;
}
export function uciOf(m) {
    return m.from + m.to + (m.promotion ?? '');
}
export function parseUci(uci) {
    return {
        from: uci.slice(0, 2),
        to: uci.slice(2, 4),
        promotion: uci.length > 4 ? uci[4] : undefined,
    };
}
/** Safely apply a UCI move to a FEN and return the verbose move + new FEN. */
export function applyUci(fen, uci) {
    try {
        const c = new Chess(fen);
        const move = c.move(parseUci(uci));
        return { move, fen: c.fen() };
    }
    catch {
        return null;
    }
}
export function applySan(fen, san) {
    try {
        const c = new Chess(fen);
        const move = c.move(san);
        return { move, fen: c.fen() };
    }
    catch {
        return null;
    }
}
/** Convert a UCI principal variation into SAN, stopping at the first illegal move. */
export function pvToSan(fen, pv, max = 99) {
    const out = [];
    const c = new Chess(fen);
    for (const u of pv.slice(0, max)) {
        try {
            out.push(c.move(parseUci(u)).san);
        }
        catch {
            break;
        }
    }
    return out;
}
/** Format a SAN sequence with move numbers, starting from the given FEN. */
export function formatLine(fen, sans) {
    let num = moveNumber(fen);
    let turn = sideToMove(fen);
    const parts = [];
    sans.forEach((san, i) => {
        if (turn === 'w')
            parts.push(`${num}.${san}`);
        else
            parts.push(i === 0 ? `${num}…${san}` : san);
        if (turn === 'b')
            num++;
        turn = other(turn);
    });
    return parts.join(' ');
}
/** "12.Nf3" or "12…Nf6" label for a single move given the FEN before it. */
export function moveLabel(fenBefore, san) {
    const n = moveNumber(fenBefore);
    return sideToMove(fenBefore) === 'w' ? `${n}.${san}` : `${n}…${san}`;
}
export function plyToMoveNo(ply) {
    // ply index 0 = White's first move
    return { num: Math.floor(ply / 2) + 1, color: ply % 2 === 0 ? 'w' : 'b' };
}
export function materialCount(fen) {
    const res = { w: 0, b: 0 };
    const board = fen.split(' ')[0];
    for (const ch of board) {
        const lower = ch.toLowerCase();
        if (lower in PIECE_VALUE) {
            const v = PIECE_VALUE[lower];
            if (ch === lower)
                res.b += v;
            else
                res.w += v;
        }
    }
    return res;
}
export function uid(prefix = '') {
    return prefix + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}
