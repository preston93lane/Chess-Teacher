/**
 * Full-game review: runs the engine over every position, classifies each move
 * and extracts key moments and personal puzzles.
 */
import { Chess, START_FEN, fenKey, uciOf } from '../chess/core';
import { engine } from '../engine/stockfish';
import { lookupBook } from '../openings/book';
import { ecoName } from '../openings/eco';
import { BAD_CLASSES, reviewMove } from './explain';
import { winPct } from './eval';
export async function reviewGame(sans, opts = {}) {
    const startFen = opts.startFen ?? START_FEN;
    const depth = opts.depth ?? 13;
    const chess = new Chess(startFen);
    const fens = [startFen];
    const ucis = [];
    const movesTo = [];
    for (const san of sans) {
        const m = chess.move(san);
        fens.push(chess.fen());
        ucis.push(uciOf(m));
        movesTo.push(m.to);
    }
    // Opening / book detection (tolerates short gaps between named positions)
    let lastBook = -1;
    let opening;
    const bookNotes = [];
    for (let i = 0; i < sans.length && i < 50; i++) {
        const named = await ecoName(fenKey(fens[i + 1]));
        const rep = lookupBook(fenKey(fens[i]));
        const inRep = rep?.moves.find((m) => m.san === sans[i]);
        if (named || inRep) {
            if (i - lastBook > 3)
                break;
            lastBook = i;
            if (named)
                opening = { eco: named[0], name: named[1], ply: i + 1 };
            bookNotes[i] = inRep?.note;
        }
        else if (i - lastBook > 3)
            break;
    }
    const bookPly = lastBook + 1;
    const analyses = [];
    const total = fens.length;
    const evals = [];
    for (let i = 0; i < fens.length; i++) {
        if (opts.signal?.cancelled)
            throw new Error('cancelled');
        const c = new Chess(fens[i]);
        if (c.isGameOver()) {
            analyses.push(undefined);
            evals.push(c.isCheckmate() ? { mate: 0, cp: c.turn() === 'w' ? -100000 : 100000 } : { cp: 0 });
        }
        else {
            const res = await engine.analyze(fens[i], { depth, multipv: i < fens.length - 1 ? 2 : 1 });
            analyses.push(res.lines);
            evals.push(res.lines[0] ? { cp: res.lines[0].cp, mate: res.lines[0].mate } : undefined);
        }
        opts.onProgress?.({ done: i + 1, total });
    }
    const buildReviews = () => {
        const out = [];
        for (let i = 0; i < sans.length; i++) {
            out.push(reviewMove({
                ply: i,
                fenBefore: fens[i],
                uci: ucis[i],
                before: analyses[i],
                after: analyses[i + 1]?.[0],
                isBook: i < bookPly,
                bookNote: bookNotes[i],
                openingName: i < bookPly ? opening?.name : undefined,
                prevClass: out[i - 1]?.cls,
                prevMoveTo: movesTo[i - 1],
            }));
        }
        return out;
    };
    let moves = buildReviews();
    // Verification pass: anything the coach wants to call out is re-checked deeper,
    // because a shallow search can miss quiet sacrifices and mates.
    const verifyDepth = depth + 4;
    const verified = new Set();
    for (let round = 0; round < 2; round++) {
        const flagged = moves.filter((m) => [...BAD_CLASSES, 'brilliant', 'great'].includes(m.cls)).map((m) => m.ply);
        const positions = new Set();
        for (const p of flagged) {
            positions.add(p);
            positions.add(p + 1);
        }
        const todo = [...positions].filter((i) => !verified.has(i) && i < fens.length && analyses[i]);
        if (!todo.length)
            break;
        let done = 0;
        for (const i of todo) {
            if (opts.signal?.cancelled)
                throw new Error('cancelled');
            const res = await engine.analyze(fens[i], { depth: verifyDepth, multipv: i < fens.length - 1 ? 2 : 1 });
            if (res.lines.length) {
                analyses[i] = res.lines;
                evals[i] = { cp: res.lines[0].cp, mate: res.lines[0].mate };
            }
            verified.add(i);
            opts.onProgress?.({ done: total, total, verifying: { done: ++done, total: todo.length } });
        }
        moves = buildReviews();
    }
    return summarise({ depth, moves, evals, opening, bookPly });
}
export function summarise(base) {
    const { moves, evals } = base;
    const accuracy = { w: 100, b: 100 };
    const counts = { w: {}, b: {} };
    const phaseAcc = { w: {}, b: {} };
    for (const c of ['w', 'b']) {
        const mine = moves.filter((m) => m.color === c);
        if (mine.length) {
            const accs = mine.map((m) => Math.max(1, m.accuracy));
            const mean = accs.reduce((a, b) => a + b, 0) / accs.length;
            const harmonic = accs.length / accs.reduce((a, b) => a + 1 / b, 0);
            accuracy[c] = Math.round(((mean + harmonic) / 2) * 10) / 10;
        }
        for (const m of mine)
            counts[c][m.cls] = (counts[c][m.cls] ?? 0) + 1;
    }
    const total = moves.length;
    moves.forEach((m) => {
        const phase = m.ply < Math.max(base.bookPly, 20) ? 'opening' : m.ply > total - 20 && total > 60 ? 'endgame' : 'middlegame';
        (phaseAcc[m.color][phase] ??= []).push(m.accuracy);
    });
    const avg = (a) => (a && a.length ? Math.round(a.reduce((x, y) => x + y, 0) / a.length) : undefined);
    const phaseAccuracy = {
        w: { opening: avg(phaseAcc.w.opening), middlegame: avg(phaseAcc.w.middlegame), endgame: avg(phaseAcc.w.endgame) },
        b: { opening: avg(phaseAcc.b.opening), middlegame: avg(phaseAcc.b.middlegame), endgame: avg(phaseAcc.b.endgame) },
    };
    // Key moments: largest swings in win% for the mover.
    const swings = moves
        .map((m) => ({ ply: m.ply, swing: m.winBefore - m.winAfter, cls: m.cls }))
        .filter((s) => BAD_CLASSES.includes(s.cls) || s.cls === 'brilliant' || s.cls === 'great')
        .sort((a, b) => Math.abs(b.swing) - Math.abs(a.swing))
        .slice(0, 6)
        .map((s) => s.ply)
        .sort((a, b) => a - b);
    const summary = narrate(moves, evals, base.opening, base.bookPly);
    return {
        depth: base.depth,
        moves,
        evals,
        accuracy,
        counts,
        opening: base.opening,
        bookPly: base.bookPly,
        keyMoments: swings,
        phaseAccuracy,
        summary,
        completedAt: Date.now(),
    };
}
function narrate(moves, evals, opening, bookPly) {
    const out = [];
    if (opening)
        out.push(`${opening.name} (${opening.eco}). Theory lasted ${Math.ceil(bookPly / 2)} moves.`);
    const afterOpening = evals[Math.min(evals.length - 1, Math.max(bookPly, 20))];
    if (afterOpening && evals.length > 24) {
        const w = winPct(afterOpening, 'w');
        out.push(w > 65
            ? 'White came out of the opening with a clear edge.'
            : w < 35
                ? 'Black came out of the opening with a clear edge.'
                : 'The opening phase ended roughly balanced.');
    }
    const decisive = moves
        .filter((m) => m.cls === 'blunder' || m.cls === 'mistake' || m.cls === 'miss')
        .sort((a, b) => b.winBefore - b.winAfter - (a.winBefore - a.winAfter))[0];
    if (decisive) {
        const n = Math.floor(decisive.ply / 2) + 1;
        out.push(`The turning point: ${n}${decisive.color === 'w' ? '.' : '…'}${decisive.san} — ${decisive.headline.replace(/\.$/, '').toLowerCase()}.`);
    }
    return out;
}
/** Moves worth turning into personal puzzles. */
export function puzzleCandidates(review, myColor) {
    return review.moves.filter((m) => (!myColor || m.color === myColor) &&
        (m.cls === 'mistake' || m.cls === 'blunder' || m.cls === 'miss') &&
        !!m.bestUci &&
        (m.bestWin ?? 0) - m.winAfter >= 15);
}
