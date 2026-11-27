/**
 * "Why it works": the follow-up after a key move — the opponent's best
 * defence and how the idea continues, what the move threatens, what it wins,
 * and why the tempting alternatives are worse.
 */
import { Chess } from '../chess/core';
import { engine } from '../engine/stockfish';
import { describeMove, describeThreat, nullMoveFen } from './explain';
import { lineOutcome, materialPhrase, moveMotifs } from './tactics';
import { lineScore } from './eval';
const NAME = { w: 'White', b: 'Black' };
const PIECE = { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen' };
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const other = (c) => (c === 'w' ? 'b' : 'w');
function parse(uci) {
    return { from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] || undefined };
}
/** Score for `side` in pawns (mate ≈ ±50). */
function pawns(l, side) {
    const s = lineScore(l);
    if (!s)
        return 0;
    const white = s.mate !== undefined ? (s.mate > 0 ? 50 - s.mate : -50 - s.mate) : (s.cp ?? 0) / 100;
    return side === 'w' ? white : -white;
}
function scoreText(l, side) {
    const s = lineScore(l);
    if (!s)
        return '';
    if (s.mate !== undefined) {
        const forUs = (s.mate > 0) === (side === 'w');
        return forUs ? `mate in ${Math.abs(s.mate)}` : `mated in ${Math.abs(s.mate)}`;
    }
    const v = pawns(l, side);
    return `${v >= 0 ? '+' : '−'}${Math.abs(v).toFixed(1)}`;
}
/** Walk a line of UCI moves, annotating each ply with a coach note. */
export function annotateLine(fen, ucis, max = 10) {
    const c = new Chess(fen);
    const out = [];
    let prevTo;
    for (const u of ucis.slice(0, max)) {
        const before = c.fen();
        let m;
        try {
            m = c.move(parse(u));
        }
        catch {
            break;
        }
        let note = '';
        try {
            note = describeMove(before, m, moveMotifs(before, m), prevTo)[0] ?? '';
        }
        catch {
            note = '';
        }
        if (c.isCheckmate())
            note = 'Checkmate.';
        out.push({ san: m.san, from: m.from, to: m.to, color: m.color, fenBefore: before, fenAfter: c.fen(), note });
        prevTo = m.to;
    }
    return out;
}
/** What a line achieves for the side that starts it, in words. */
function lineVerdict(fen, ucis, line, mover, role = 'key') {
    const out = lineOutcome(fen, ucis, 12);
    if (out.mateFor === mover)
        return `It forces mate in ${out.mateIn}.`;
    if (out.mateFor === other(mover))
        return `It walks into mate in ${out.mateIn}.`;
    const phrase = Math.abs(out.material) >= 1 ? materialPhrase(out.lost[other(mover)], out.lost[mover], out.material) : null;
    const v = pawns(line, mover);
    if (phrase && role === 'key' && out.material < 0)
        return `It’s still the best try, even though it ${phrase}.`;
    if (phrase)
        return `${cap(phrase)}${v >= 2 && out.material > 0 ? ' and keeps a winning position' : ''}.`;
    if (role === 'alt') {
        if (v >= 3)
            return 'It still wins';
        if (v >= 1)
            return 'It keeps an advantage';
        if (v > -1)
            return 'It keeps the balance';
        if (v > -3)
            return 'It leaves you clearly worse';
        return 'It loses';
    }
    if (v >= 3)
        return 'It keeps a winning position — no material changes hands yet, but the threats can’t all be met.';
    if (v >= 1)
        return 'It keeps a clear advantage.';
    if (v > -1)
        return 'It keeps the balance.';
    return 'It still leaves you worse, but it is the most stubborn try.';
}
export async function explainMove(fenBefore, uci, opts = {}) {
    const depth = opts.depth ?? 15;
    const c = new Chess(fenBefore);
    const mover = c.turn();
    const key = c.move(parse(uci));
    const fenAfter = c.fen();
    // The main line: the given solution, else the engine's best defence.
    const after = await engine.analyze(fenAfter, { depth, multipv: 1 });
    const reply = after.lines[0];
    const mainUcis = opts.line && opts.line.length > 1 ? opts.line : [uci, ...(reply?.pv ?? []).slice(0, 9)];
    const plies = annotateLine(fenBefore, mainUcis, 10);
    if (plies[0])
        plies[0].note = plies[0].note || 'The key move.';
    if (plies[1] && plies[1].color !== mover)
        plies[1].note = `${NAME[plies[1].color]}’s best defence. ${plies[1].note}`.trim();
    // What the move threatens (if the opponent passed).
    let threat;
    const nf = nullMoveFen(fenAfter);
    if (nf && !c.isCheck()) {
        try {
            const t = await engine.analyze(nf, { depth: Math.min(12, depth), multipv: 1 });
            if (t.lines[0])
                threat = describeThreat(fenAfter, t.lines[0], lineScore(reply)) ?? undefined;
        }
        catch {
            /* ignore */
        }
    }
    const verdict = lineVerdict(fenBefore, mainUcis, reply, mover);
    const keyIsMate = /forces mate/.test(verdict);
    // The bait: the opponent's most tempting capture, if it isn't their best reply and it loses.
    let bait;
    try {
        const VAL = { p: 1, n: 3, b: 3, r: 5, q: 9 };
        const caps = new Chess(fenAfter).moves({ verbose: true }).filter((m) => m.captured && m.captured !== 'k').sort((a, b) => VAL[b.captured] - VAL[a.captured]);
        const greedy = caps[0];
        const greedyUci = greedy ? greedy.from + greedy.to + (greedy.promotion ?? '') : '';
        if (greedy && VAL[greedy.captured] >= 3 && greedyUci !== reply?.pv[0]) {
            const t = new Chess(fenAfter);
            t.move(greedy);
            const res = await engine.analyze(t.fen(), { depth: Math.max(12, depth - 2), multipv: 1 });
            const l = res.lines[0];
            // From the opponent's side: how much worse than their best reply?
            const opp = other(mover);
            const bestForOpp = pawns(reply, opp);
            const afterGrab = -pawns(l, mover);
            if (bestForOpp - afterGrab >= 2 || (l?.mate !== undefined && pawns(l, mover) > 20)) {
                const ucis = [greedyUci, ...(l?.pv ?? []).slice(0, 7)];
                const v = lineVerdict(fenAfter, ucis, l, opp);
                bait = {
                    san: greedy.san,
                    verdict: `If ${NAME[opp]} grabs the ${PIECE[greedy.captured]} with ${greedy.san}?, that ${v.replace(/^It /, '').charAt(0).toLowerCase()}${v.replace(/^It /, '').slice(1)}`,
                    plies: annotateLine(fenAfter, ucis, 8),
                };
            }
        }
    }
    catch {
        /* no bait */
    }
    // Alternatives: the engine's other top moves, plus anything you tried.
    const top = await engine.analyze(fenBefore, { depth: Math.max(12, depth - 2), multipv: 3 });
    const keyScore = pawns(reply, mover);
    const alts = [];
    const consider = [...new Set([...(opts.tried ?? []).filter((t) => t !== uci), ...top.lines.map((l) => l.pv[0]).filter((u) => u && u !== uci)])].slice(0, 3);
    for (const alt of consider) {
        const t = new Chess(fenBefore);
        let m;
        try {
            m = t.move(parse(alt));
        }
        catch {
            continue;
        }
        const res = await engine.analyze(t.fen(), { depth: Math.max(12, depth - 2), multipv: 1 });
        const l = res.lines[0];
        const drop = keyScore - pawns(l, mover);
        const tried = opts.tried?.includes(alt);
        if (!tried && drop < 0.5)
            continue; // as good — not a "why not"
        const ucis = [alt, ...(l?.pv ?? []).slice(0, 7)];
        let v = lineVerdict(fenBefore, ucis, l, mover, 'alt').replace(/\.$/, '');
        if (keyIsMate && !/forces mate/.test(v))
            v = `${v}, but misses the forced mate with ${key.san}.`;
        else if (drop >= 15)
            v = `${v} — far worse than ${key.san}.`;
        else if (drop >= 0.5)
            v = `${v} — about ${drop.toFixed(1)} pawns worse than ${key.san}.`;
        else
            v = `${v} — about as good as ${key.san}.`;
        alts.push({ san: m.san, uci: alt, drop, verdict: v, plies: annotateLine(fenBefore, ucis, 8), tried });
    }
    // Keep "why not" focused: anything you tried, plus the engine's next-best move.
    const shown = [...alts.filter((a) => a.tried), ...alts.filter((a) => !a.tried).slice(0, 1)].slice(0, 3);
    return { san: key.san, mover, verdict, threat, bait, plies, alternatives: shown, score: keyIsMate || reply?.mate !== undefined ? '' : scoreText(reply, mover) };
}
