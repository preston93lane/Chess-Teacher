/**
 * Variant rules on top of chessops (GPL-3.0): standard chess, Chess960 and
 * Fog of War. Fog of War: you only see squares your pieces could move to,
 * there is no check, and you win by capturing the king.
 */
import { Chess as CPos, Castles } from 'chessops/chess';
import { parseFen, makeFen, INITIAL_FEN } from 'chessops/fen';
import { makeSanAndPlay } from 'chessops/san';
import { parseSquare, makeSquare, opposite } from 'chessops/util';
import { attacks, pawnAttacks } from 'chessops/attacks';
import { SquareSet } from 'chessops/squareSet';
import { engine } from './engine/stockfish';
export const MODE_INFO = {
    standard: { name: 'Standard', blurb: 'Normal chess.' },
    chess960: { name: 'Chess960', blurb: 'Fischer Random: the back-rank pieces are shuffled (960 possible set-ups), so opening theory is gone and you play from move one. Castle by moving the king onto its rook.' },
    fog: { name: 'Fog of War', blurb: 'You only see the squares your pieces can move to. There is no check — you win by capturing the king, so guard it yourself.' },
};
const ROLE = { q: 'queen', r: 'rook', b: 'bishop', n: 'knight' };
const ROLE_CH = { pawn: '', knight: 'N', bishop: 'B', rook: 'R', queen: 'Q', king: 'K' };
const col = (c) => (c === 'white' ? 'w' : 'b');
/** Chess960 starting position by Scharnagl number (0–959; 518 is the normal set-up). */
export function chess960Fen(n) {
    const files = Array(8).fill(null);
    let x = n;
    files[2 * (x % 4) + 1] = 'B';
    x = Math.floor(x / 4);
    files[2 * (x % 4)] = 'B';
    x = Math.floor(x / 4);
    const empty = () => files.map((f, i) => (f ? -1 : i)).filter((i) => i >= 0);
    files[empty()[x % 6]] = 'Q';
    x = Math.floor(x / 6);
    const KN = [[0, 1], [0, 2], [0, 3], [0, 4], [1, 2], [1, 3], [1, 4], [2, 3], [2, 4], [3, 4]][x];
    const e = empty();
    files[e[KN[0]]] = 'N';
    files[e[KN[1]]] = 'N';
    const rest = empty();
    files[rest[0]] = 'R';
    files[rest[1]] = 'K';
    files[rest[2]] = 'R';
    const white = files.join('');
    const F = 'ABCDEFGH';
    const castle = `${F[rest[2]]}${F[rest[0]]}${F[rest[2]].toLowerCase()}${F[rest[0]].toLowerCase()}`;
    return `${white.toLowerCase()}/pppppppp/8/8/8/8/PPPPPPPP/${white} w ${castle} - 0 1`;
}
function posFromFen(fen) {
    return CPos.fromSetup(parseFen(fen).unwrap()).unwrap();
}
export function newGame(mode, fen) {
    const start = fen ?? (mode === 'chess960' ? chess960Fen(Math.floor(Math.random() * 960)) : INITIAL_FEN);
    const pos = posFromFen(start);
    return { mode, startFen: start, pos, plies: [], repetitions: { [repKey(pos)]: 1 }, lastSeenKing: {} };
}
export function fenOf(pos) {
    return makeFen(pos.toSetup());
}
function repKey(pos) {
    return makeFen(pos.toSetup()).split(' ').slice(0, 4).join(' ');
}
export function turnOf(s) {
    return col(s.pos.turn);
}
/** Castling in chessops is king-takes-rook; add the usual king target too. */
function castleAlias(_pos, from, rookSq) {
    const rank = from >> 3;
    return ((rookSq & 7) > (from & 7) ? 6 : 2) + rank * 8;
}
function isPromotion(pos, from, to) {
    const p = pos.board.get(from);
    return p?.role === 'pawn' && ((to >> 3) === 7 || (to >> 3) === 0);
}
/** Pseudo-legal moves for Fog of War (moving into check is allowed). */
function pseudoMoves(pos) {
    const out = [];
    const us = pos.turn;
    const own = pos.board[us];
    const them = pos.board[opposite(us)];
    const occ = pos.board.occupied;
    for (const sq of own) {
        const piece = pos.board.get(sq);
        if (piece.role === 'pawn') {
            const dir = us === 'white' ? 8 : -8;
            const one = sq + dir;
            if (one >= 0 && one < 64 && !occ.has(one)) {
                out.push({ from: sq, to: one });
                const startRank = us === 'white' ? 1 : 6;
                const two = sq + 2 * dir;
                if (sq >> 3 === startRank && !occ.has(two))
                    out.push({ from: sq, to: two });
            }
            for (const t of pawnAttacks(us, sq)) {
                if (them.has(t) || t === pos.epSquare)
                    out.push({ from: sq, to: t });
            }
        }
        else {
            for (const t of attacks(piece, sq, occ).diff(own))
                out.push({ from: sq, to: t });
        }
    }
    // Castling: rights intact and the path clear (check doesn't exist in this variant).
    const king = pos.board.kingOf(us);
    if (king !== undefined) {
        for (const side of ['a', 'h']) {
            const rook = pos.castles.rook[us][side];
            if (rook === undefined)
                continue;
            if (pos.castles.path[us][side].intersects(occ))
                continue;
            out.push({ from: king, to: rook, castle: true });
        }
    }
    return out;
}
/** Moves in the form the board component takes (with castling aliases and a promotion flag). */
export function legalMoves(s) {
    if (s.result)
        return [];
    const pos = s.pos;
    const out = [];
    const add = (from, to) => out.push({ from: makeSquare(from), to: makeSquare(to), ...(isPromotion(pos, from, to) ? { promotion: 'q' } : {}) });
    if (s.mode === 'fog') {
        for (const m of pseudoMoves(pos)) {
            add(m.from, m.to);
            if (m.castle) {
                const alias = castleAlias(pos, m.from, m.to);
                if (alias !== undefined && alias !== m.to && alias !== m.from && !out.some((x) => x.from === makeSquare(m.from) && x.to === makeSquare(alias)))
                    add(m.from, alias);
            }
        }
        return out;
    }
    for (const [from, dests] of pos.allDests()) {
        for (const to of dests) {
            add(from, to);
            const p = pos.board.get(from);
            const target = pos.board.get(to);
            if (p?.role === 'king' && target?.role === 'rook' && target.color === p.color) {
                const alias = castleAlias(pos, from, to);
                if (alias !== undefined && alias !== to && alias !== from && !dests.has(alias))
                    add(from, alias);
            }
        }
    }
    return out;
}
/** Turn a board move (maybe a castling alias) into the chessops move. */
function toMove(s, m) {
    const from = parseSquare(m.from);
    let to = parseSquare(m.to);
    if (from === undefined || to === undefined)
        return null;
    const piece = s.pos.board.get(from);
    if (!piece)
        return null;
    if (piece.role === 'king' && Math.abs((to & 7) - (from & 7)) >= 2 && !(s.pos.board.get(to)?.role === 'rook' && s.pos.board.get(to)?.color === piece.color)) {
        // A king jump of two or more files is a castle: find the rook on that side.
        const side = (to & 7) > (from & 7) ? 'h' : 'a';
        const rook = s.pos.castles.rook[piece.color][side];
        if (rook !== undefined)
            to = rook;
    }
    return { from, to, ...(m.promotion && isPromotion(s.pos, from, to) ? { promotion: ROLE[m.promotion] ?? 'queen' } : {}) };
}
export function visibleSquares(pos, color) {
    const vis = new Set();
    const c = color === 'w' ? 'white' : 'black';
    for (const sq of pos.board[c])
        vis.add(makeSquare(sq));
    const p = pos.clone();
    p.turn = c;
    for (const m of pseudoMoves(p))
        vis.add(makeSquare(m.to));
    return vis;
}
/** Squares hidden from `color` (Fog of War). */
export function fogFor(s, color) {
    if (s.mode !== 'fog' || s.result)
        return [];
    const vis = visibleSquares(s.pos, color);
    const out = [];
    for (let i = 0; i < 64; i++)
        if (!vis.has(makeSquare(i)))
            out.push(makeSquare(i));
    return out;
}
/** Play a move; returns the new state or null when it isn't allowed. */
export function play(s, m) {
    if (s.result)
        return null;
    const move = toMove(s, m);
    if (!move)
        return null;
    const allowed = legalMoves(s).some((x) => x.from === makeSquare(move.from) && (x.to === makeSquare(move.to) || x.to === m.to));
    if (!allowed)
        return null;
    const pos = s.pos.clone();
    const mover = col(pos.turn);
    const piece = pos.board.get(move.from);
    const target = pos.board.get(move.to);
    let san;
    if (s.mode === 'fog') {
        const castle = piece.role === 'king' && target?.role === 'rook' && target.color === piece.color;
        san = castle ? ((move.to & 7) > (move.from & 7) ? 'O-O' : 'O-O-O') : `${ROLE_CH[piece.role]}${piece.role === 'pawn' && target ? makeSquare(move.from)[0] : ''}${target && !castle ? 'x' : ''}${makeSquare(move.to)}${move.promotion ? '=' + ROLE_CH[move.promotion] : ''}`;
        pos.play(move);
    }
    else {
        san = makeSanAndPlay(pos, move);
    }
    const fen = fenOf(pos);
    const ply = { uci: makeSquare(move.from) + makeSquare(move.to) + (move.promotion ? move.promotion[0] : ''), san, from: makeSquare(move.from), to: makeSquare(move.to), color: mover, fen };
    const next = { ...s, pos, plies: [...s.plies, ply], repetitions: { ...s.repetitions }, lastSeenKing: { ...s.lastSeenKing } };
    const key = repKey(pos);
    next.repetitions[key] = (next.repetitions[key] ?? 0) + 1;
    if (s.mode === 'fog') {
        if (target?.role === 'king' && target.color !== piece.color) {
            next.result = mover === 'w' ? '1-0' : '0-1';
            next.reason = 'King captured';
        }
        else if (!pseudoMoves(pos).length) {
            next.result = '1/2-1/2';
            next.reason = 'No moves left';
        }
        for (const c of ['w', 'b']) {
            const enemyKing = pos.board.kingOf(c === 'w' ? 'black' : 'white');
            if (enemyKing !== undefined && visibleSquares(pos, c).has(makeSquare(enemyKing)))
                next.lastSeenKing[c] = makeSquare(enemyKing);
        }
    }
    else {
        const out = pos.outcome();
        if (out) {
            next.result = out.winner ? (out.winner === 'white' ? '1-0' : '0-1') : '1/2-1/2';
            next.reason = out.winner ? 'Checkmate' : pos.isStalemate() ? 'Stalemate' : 'Insufficient material';
        }
        else if (next.repetitions[key] >= 3) {
            next.result = '1/2-1/2';
            next.reason = 'Threefold repetition';
        }
        else if (pos.halfmoves >= 100) {
            next.result = '1/2-1/2';
            next.reason = '50-move rule';
        }
    }
    if (s.mode !== 'fog' && pos.isCheck() && !next.result)
        next.plies[next.plies.length - 1] = { ...ply };
    return next;
}
export function isCheck(s) {
    return s.mode !== 'fog' && s.pos.isCheck();
}
/** Undo the last n plies by replaying from the start. */
export function undo(s, n = 1) {
    let st = newGame(s.mode, s.startFen);
    for (const p of s.plies.slice(0, Math.max(0, s.plies.length - n)))
        st = play(st, { from: p.from, to: p.to, promotion: p.uci[4] });
    return st;
}
/** Movetext (for saving). Fog of War moves use the same notation. */
export function movetext(s) {
    return s.plies.map((p, i) => (i % 2 === 0 ? `${Math.floor(i / 2) + 1}. ` : '') + p.san).join(' ');
}
// ---------------------------------------------------------------------------
// Bots
function cp(l, white) {
    return (l.mate !== undefined ? (l.mate > 0 ? 10000 : -10000) : l.cp ?? 0) * (white ? 1 : -1);
}
/** The bot's move as a board move. Fog-of-War bots only use what they can see. */
export async function variantBotMove(s, bot) {
    const moves = legalMoves(s);
    if (!moves.length)
        return null;
    const p = bot.play;
    if (s.mode === 'fog')
        return fogBotMove(s, bot, moves);
    if (p.blunder && Math.random() < p.blunder)
        return moves[Math.floor(Math.random() * moves.length)];
    const fen = fenOf(s.pos);
    const res = await engine.play(fen, { skill: p.skill, elo: p.elo, depth: p.depth, movetime: p.movetime, multipv: Math.max(1, p.multipv ?? 1), chess960: s.mode === 'chess960' });
    let uci = res.bestmove ?? res.lines[0]?.pv[0];
    if (p.noise && res.lines.length > 1 && Math.random() < p.noise)
        uci = res.lines[1 + Math.floor(Math.random() * (res.lines.length - 1))]?.pv[0] ?? uci;
    if (!uci)
        return moves[0];
    return { from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] };
}
async function fogBotMove(s, bot, moves) {
    const pos = s.pos;
    const me = col(pos.turn);
    const enemy = opposite(pos.turn);
    // Capture the king whenever we can see it.
    const ek = pos.board.kingOf(enemy);
    if (ek !== undefined) {
        const hit = moves.find((m) => m.to === makeSquare(ek));
        if (hit)
            return hit;
    }
    try {
        // Build the position as the bot believes it to be.
        const vis = visibleSquares(pos, me);
        const believed = pos.clone();
        for (const sq of pos.board[enemy]) {
            if (!vis.has(makeSquare(sq)) || pos.board.get(sq)?.role === 'king')
                believed.board.take(sq);
        }
        const myAttacks = new Set();
        for (const sq of believed.board[pos.turn])
            for (const t of attacks(believed.board.get(sq), sq, believed.board.occupied))
                myAttacks.add(makeSquare(t));
        const free = (sq) => {
            const i = parseSquare(sq);
            return i !== undefined && !believed.board.occupied.has(i) && !myAttacks.has(sq);
        };
        let kingSq = ek !== undefined && vis.has(makeSquare(ek)) ? makeSquare(ek) : undefined;
        const last = s.lastSeenKing[me];
        if (!kingSq && last && !vis.has(last) && free(last))
            kingSq = last;
        if (!kingSq) {
            const rank = enemy === 'white' ? '1' : '8';
            kingSq = ['e', 'g', 'c', 'f', 'd', 'b', 'h', 'a'].map((f) => f + rank).find(free) ?? [...Array(64).keys()].map((i) => makeSquare(i)).find(free);
        }
        if (!kingSq)
            throw new Error('nowhere to put the king');
        believed.board.set(parseSquare(kingSq), { role: 'king', color: enemy });
        believed.castles = Castles.empty();
        believed.epSquare = undefined;
        const fen = fenOf(believed);
        const res = await engine.play(fen, { skill: bot.play.skill, elo: bot.play.elo, depth: Math.min(bot.play.depth ?? 10, 12), movetime: bot.play.movetime, multipv: 5 });
        const white = me === 'w';
        const ranked = [...res.lines].sort((a, b) => cp(b, white) - cp(a, white));
        for (const l of ranked) {
            const u = l.pv[0];
            if (!u)
                continue;
            const hit = moves.find((m) => m.from === u.slice(0, 2) && m.to === u.slice(2, 4));
            if (hit)
                return { ...hit, promotion: u[4] ?? hit.promotion };
        }
    }
    catch {
        /* fall through to the simple rule */
    }
    // Fallback: take the most valuable visible piece, else a random developing move.
    const val = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 100 };
    const scored = moves.map((m) => {
        const t = pos.board.get(parseSquare(m.to));
        return { m, v: t && t.color === enemy ? val[t.role[0] === 'k' ? 'k' : t.role === 'knight' ? 'n' : t.role[0]] : Math.random() * 0.5 };
    });
    scored.sort((a, b) => b.v - a.v);
    return scored[0].m;
}
export { SquareSet };
