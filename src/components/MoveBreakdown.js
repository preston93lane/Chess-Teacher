import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { createPortal } from 'react-dom';
import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, BookOpen, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { Chess, applyUci, formatLine, moveLabel, uciOf } from '../lib/chess/core';
import { engine, CancelledError } from '../lib/engine/stockfish';
import { CLASS_INFO, BAD_CLASSES, describeMove, reviewMove } from '../lib/coach/explain';
import { formatScore, lineScore, winPct } from '../lib/coach/eval';
import { lineOutcome, materialPhrase } from '../lib/coach/tactics';
import { staticInsights } from '../lib/coach/insights';
import { navigate } from '../lib/router';
import { soundForSan } from '../lib/sound';
import { Board } from './Board';
import { Button, Glyph, IconButton, Spinner } from './ui';
function walk(fen, pv, max = 8) {
    const c = new Chess(fen);
    const sans = [];
    const fens = [fen];
    const ucis = [];
    for (const u of pv.slice(0, max)) {
        try {
            const m = c.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] || undefined });
            sans.push(m.san);
            ucis.push(uciOf(m));
            fens.push(c.fen());
        }
        catch {
            break;
        }
    }
    return { sans, fens, ucis };
}
function takeawayFor(r) {
    const h = r.headline.toLowerCase();
    if (!BAD_CLASSES.includes(r.cls))
        return {
            text: r.cls === 'book'
                ? 'This is theory. The alternatives below show other ways to play the position and the ideas they share.'
                : 'A good decision. Compare it with the engine’s alternatives — when several moves work, notice which ideas they have in common.',
        };
    if (/hangs|leaves|drops/.test(h))
        return { text: 'Blunder check: before every move, ask what it leaves undefended — and what was already under attack.', lessonId: 'calculation', lessonTitle: 'Checks, captures, threats' };
    if (/fork/.test(h))
        return { text: 'When an enemy knight can reach a square that hits two of your pieces, deal with it before it lands.', lessonId: 'calculation', lessonTitle: 'Checks, captures, threats' };
    if (/pin|skewer/.test(h))
        return { text: 'Pieces lined up with your king or queen are targets for pins and skewers. Step them off the line before it matters.', lessonId: 'calculation', lessonTitle: 'Checks, captures, threats' };
    if (/discovered/.test(h))
        return { text: 'Watch the pieces behind the pieces: when one moves, another line opens.', lessonId: 'calculation', lessonTitle: 'Checks, captures, threats' };
    if (/mate/.test(h) && /allows/.test(h))
        return { text: 'King safety first. Count the attackers near your king before you go for your own plan.', lessonId: 'opposite-castling', lessonTitle: 'Opposite-side castling races' };
    if (/misses/.test(h))
        return { text: 'After your opponent’s move, look for forcing moves — checks, captures, threats — before playing the natural one.', lessonId: 'calculation', lessonTitle: 'Checks, captures, threats' };
    if (/queen out/.test(h) || /developed piece/.test(h) || /castling/.test(h))
        return { text: 'Opening principles pay off: develop, castle, then start operations. Tempo is worth more than a pawn early on.', lessonId: 'outposts', lessonTitle: 'Outposts and holes' };
    if (/weakens/.test(h))
        return { text: 'Pawn moves are permanent. Before pushing a pawn near your king, ask which squares it can never protect again.', lessonId: 'prophylaxis', lessonTitle: 'Prophylaxis' };
    return { text: 'Ask what your opponent wants before you commit. The best reply to your move is the one you have to see.', lessonId: 'prophylaxis', lessonTitle: 'Prophylaxis' };
}
const STEPS = ['Your move', 'Why', 'Better options', 'Takeaway'];
export function MoveBreakdown({ fenBefore, uci, depth, showEval, onClose, }) {
    const mover = fenBefore.split(' ')[1];
    const played = useMemo(() => applyUci(fenBefore, uci), [fenBefore, uci]);
    const [data, setData] = useState(null);
    const [error, setError] = useState(null);
    const [step, setStep] = useState(0);
    const [replyPly, setReplyPly] = useState(1);
    const [cand, setCand] = useState(0);
    const [candPly, setCandPly] = useState(0);
    const [tryMove, setTryMove] = useState(null);
    const [marks, setMarks] = useState([]);
    useEffect(() => {
        let alive = true;
        (async () => {
            try {
                const d = depth + 2;
                const before = await engine.analyze(fenBefore, { depth: d, multipv: 4 });
                const over = new Chess(played.fen).isGameOver();
                const after = over ? null : await engine.analyze(played.fen, { depth: d, multipv: 1 });
                const review = reviewMove({ ply: 0, fenBefore, uci, before: before.lines, after: after?.lines[0] });
                const replyLine = after?.lines[0];
                const rw = replyLine ? walk(played.fen, replyLine.pv, 6) : { sans: [], fens: [played.fen], ucis: [] };
                const captions = rw.sans.map((san, i) => {
                    const m = new Chess(rw.fens[i]).move(san);
                    const d0 = describeMove(rw.fens[i], m)[0] ?? '';
                    return `${moveLabel(rw.fens[i], san)} — ${d0}`;
                });
                const playedWin = winPct(review.evalAfter, mover);
                const candidates = before.lines
                    .filter((l) => l.pv[0] !== uci)
                    .slice(0, 3)
                    .map((l) => {
                    const w = walk(fenBefore, l.pv, 8);
                    const mv = new Chess(fenBefore).move(w.sans[0]);
                    const reasons = describeMove(fenBefore, mv).slice(0, 2);
                    const out = lineOutcome(fenBefore, l.pv);
                    if (out.mateFor === mover)
                        reasons.unshift(`Leads to mate in ${out.mateIn}.`);
                    else {
                        const phrase = out.material >= 1 ? materialPhrase(out.lost[mover === 'w' ? 'b' : 'w'], out.lost[mover], out.material) : null;
                        if (phrase)
                            reasons.unshift(`${phrase[0].toUpperCase()}${phrase.slice(1)}.`);
                    }
                    const win = winPct(lineScore(l), mover);
                    const gap = win - playedWin;
                    const compare = gap >= 25 ? 'Far stronger than your move' : gap >= 10 ? 'Clearly stronger than your move' : gap >= 3 ? 'A little stronger than your move' : gap > -3 ? 'About as good as your move' : 'Another option, slightly weaker than your move';
                    return { line: l, san: w.sans[0], sans: w.sans, fens: w.fens, ucis: w.ucis, reasons: [...new Set(reasons)], compare, win };
                });
                if (!alive)
                    return;
                setData({ review, before, reply: { ...rw, captions }, candidates, takeaway: takeawayFor(review) });
            }
            catch (e) {
                if (alive && !(e instanceof CancelledError))
                    setError('The engine could not finish the breakdown. Try again.');
            }
        })();
        return () => {
            alive = false;
        };
    }, [fenBefore, uci, depth, played.fen, mover]);
    useEffect(() => {
        const onKey = (e) => e.key === 'Escape' && onClose();
        window.addEventListener('keydown', onKey);
        document.body.style.overflow = 'hidden';
        return () => {
            window.removeEventListener('keydown', onKey);
            document.body.style.overflow = '';
        };
    }, [onClose]);
    useEffect(() => {
        setMarks([]);
        setTryMove(null);
    }, [step]);
    const onTry = async (mv) => {
        if (!data)
            return;
        const c = new Chess(fenBefore);
        let m;
        try {
            m = c.move(mv);
        }
        catch {
            return;
        }
        soundForSan(m.san);
        setTryMove({ fen: c.fen(), review: null, from: m.from, to: m.to });
        try {
            const after = await engine.analyze(c.fen(), { depth: depth + 1 });
            const r = reviewMove({ ply: 0, fenBefore, uci: uciOf(m), before: data.before.lines, after: after.lines[0] });
            setTryMove((cur) => (cur && cur.fen === c.fen() ? { ...cur, review: r } : cur));
        }
        catch {
            /* cancelled */
        }
    };
    // ---- board for the current step ----
    let boardFen = fenBefore;
    let arrows = [];
    let lastMove = null;
    let badge = null;
    let movable = null;
    const bad = data ? BAD_CLASSES.includes(data.review.cls) : false;
    if (data) {
        if (step === 0) {
            boardFen = played.fen;
            lastMove = [played.move.from, played.move.to];
            badge = { sq: played.move.to, cls: data.review.cls };
        }
        else if (step === 1) {
            const n = Math.min(replyPly, data.reply.sans.length);
            boardFen = data.reply.fens[n];
            lastMove = n > 0 ? [data.reply.ucis[n - 1].slice(0, 2), data.reply.ucis[n - 1].slice(2, 4)] : [played.move.from, played.move.to];
            if (n === 0)
                badge = { sq: played.move.to, cls: data.review.cls };
        }
        else if (step === 2) {
            const c = data.candidates[cand];
            if (tryMove) {
                boardFen = tryMove.fen;
                lastMove = [tryMove.from, tryMove.to];
                if (tryMove.review)
                    badge = { sq: tryMove.to, cls: tryMove.review.cls };
            }
            else if (c && candPly > 0) {
                boardFen = c.fens[candPly];
                lastMove = [c.ucis[candPly - 1].slice(0, 2), c.ucis[candPly - 1].slice(2, 4)];
            }
            else {
                boardFen = fenBefore;
                movable = mover;
                arrows = [
                    { from: played.move.from, to: played.move.to, color: 'r' },
                    ...(c ? [{ from: c.ucis[0].slice(0, 2), to: c.ucis[0].slice(2, 4), color: 'y' }] : []),
                ];
            }
        }
        else {
            boardFen = fenBefore;
        }
    }
    const insightsBefore = useMemo(() => staticInsights(fenBefore, mover).slice(0, 3), [fenBefore, mover]);
    const info = data ? CLASS_INFO[data.review.cls] : null;
    const label = moveLabel(fenBefore, played.move.san);
    return createPortal(_jsx("div", { className: "breakdown", role: "dialog", "aria-modal": true, "aria-label": "Move breakdown", children: _jsxs("div", { className: "breakdown-inner", children: [_jsxs("header", { className: "breakdown-head", children: [_jsxs("div", { children: [_jsx("p", { className: "breakdown-kicker", children: "Move breakdown" }), _jsxs("h2", { className: "breakdown-title", children: [label, " ", data && info && _jsx(Glyph, { cls: data.review.cls })] })] }), _jsx(Button, { variant: "secondary", size: "sm", icon: _jsx(X, { size: 16 }), onClick: onClose, children: "Back to game" })] }), _jsx("nav", { className: "breakdown-steps", "aria-label": "Breakdown steps", children: STEPS.map((s, i) => (_jsxs("button", { className: `breakdown-step${i === step ? ' is-on' : ''}`, onClick: () => setStep(i), disabled: !data, children: [_jsx("span", { className: "num", children: i + 1 }), " ", i === 1 && data && !bad ? 'What comes next' : s] }, s))) }), _jsxs("div", { className: "board-screen", children: [_jsxs("div", { className: "board-col", children: [_jsx(Board, { fen: boardFen, orientation: mover, movable: movable, onMove: onTry, lastMove: lastMove, arrows: arrows, badge: badge, marks: marks }), data && step === 1 && data.reply.sans.length > 0 && (_jsxs("div", { className: "controls", children: [_jsxs("div", { className: "controls-group", children: [_jsx(IconButton, { label: "Back one move", onClick: () => setReplyPly(Math.max(0, replyPly - 1)), disabled: replyPly === 0, children: _jsx(ChevronLeft, {}) }), _jsx(IconButton, { label: "Forward one move", onClick: () => setReplyPly(Math.min(data.reply.sans.length, replyPly + 1)), disabled: replyPly >= data.reply.sans.length, children: _jsx(ChevronRight, {}) })] }), _jsxs("span", { className: "muted small num", children: [replyPly, "/", data.reply.sans.length] })] })), data && step === 2 && data.candidates[cand] && !tryMove && (_jsxs("div", { className: "controls", children: [_jsxs("div", { className: "controls-group", children: [_jsx(IconButton, { label: "Back one move", onClick: () => setCandPly(Math.max(0, candPly - 1)), disabled: candPly === 0, children: _jsx(ChevronLeft, {}) }), _jsx(IconButton, { label: "Play through this line", onClick: () => setCandPly(Math.min(data.candidates[cand].sans.length, candPly + 1)), disabled: candPly >= data.candidates[cand].sans.length, children: _jsx(ChevronRight, {}) })] }), _jsx("span", { className: "muted small", children: candPly === 0 ? 'Or make your own move on the board' : `${candPly}/${data.candidates[cand].sans.length}` })] }))] }), _jsxs("div", { className: "side-col", children: [!data && !error && _jsx(Spinner, { label: "Coach is taking the move apart\u2026" }), error && _jsx("p", { className: "error-text", children: error }), data && step === 0 && (_jsxs("div", { className: "stack", children: [_jsxs("div", { className: `verdict tone-${info.tone}`, children: [_jsx("div", { className: "verdict-glyph", "aria-hidden": true, children: info.glyph }), _jsxs("div", { className: "verdict-body", children: [_jsxs("p", { className: "verdict-kicker", children: [_jsx("span", { className: `tone-text-${info.tone}`, children: info.label }), showEval && data.review.evalBefore && data.review.evalAfter && (_jsxs("span", { className: "verdict-eval", children: [formatScore(data.review.evalBefore), " \u2192 ", formatScore(data.review.evalAfter)] }))] }), _jsx("h3", { className: "verdict-headline", children: data.review.headline }), data.review.notes.filter((n) => !n.startsWith('Evaluation')).map((n, i) => (_jsx("p", { className: "verdict-note", children: n }, i)))] })] }), _jsx("p", { className: "muted", children: bad
                                                ? 'Next: see how your opponent punishes it, then compare it with better options.'
                                                : 'Next: see the continuation the engine expects, then the alternatives.' })] })), data && step === 1 && (_jsxs("div", { className: "stack", children: [_jsx("h3", { children: bad ? 'How it goes wrong' : 'What comes next' }), data.reply.sans.length ? (_jsxs(_Fragment, { children: [_jsx("p", { className: "muted", children: formatLine(played.fen, data.reply.sans) }), _jsx("ol", { className: "line-steps", children: data.reply.captions.map((c, i) => (_jsx("li", { children: _jsx("button", { className: `line-step${i + 1 === replyPly ? ' is-on' : ''}`, onClick: () => setReplyPly(i + 1), children: c }) }, i))) })] })) : (_jsx("p", { className: "muted", children: "The game ends here." }))] })), data && step === 2 && (_jsxs("div", { className: "stack", children: [_jsx("h3", { children: data.candidates.length ? 'Better options' : 'No better options' }), tryMove && (_jsxs("div", { className: "panel panel-tight", children: [tryMove.review ? (_jsxs(_Fragment, { children: [_jsxs("p", { children: [_jsx(Glyph, { cls: tryMove.review.cls, size: "sm" }), " ", _jsxs("strong", { children: ["Your try: ", tryMove.review.san] }), " \u2014 ", CLASS_INFO[tryMove.review.cls].label.toLowerCase(), "."] }), _jsx("p", { className: "muted small mt8", children: tryMove.review.headline })] })) : (_jsx(Spinner, { label: "Checking your idea\u2026" })), _jsx("button", { className: "link-btn mt8", onClick: () => setTryMove(null), children: "Try another move" })] })), data.candidates.map((c, i) => (_jsxs("button", { className: `candidate${i === cand ? ' is-on' : ''}`, onClick: () => {
                                                setCand(i);
                                                setCandPly(0);
                                                setTryMove(null);
                                            }, children: [_jsxs("span", { className: "candidate-head", children: [_jsx("span", { className: "candidate-san", children: c.san }), showEval && _jsx("span", { className: "candidate-eval num", children: formatScore(lineScore(c.line)) })] }), _jsx("span", { className: "candidate-compare", children: c.compare }), c.reasons.map((r) => (_jsx("span", { className: "candidate-reason", children: r }, r))), i === cand && _jsx("span", { className: "candidate-line num", children: formatLine(fenBefore, c.sans.slice(0, 6)) })] }, c.san)))] })), data && step === 3 && (_jsxs("div", { className: "stack", children: [_jsx("h3", { children: "The takeaway" }), _jsx("p", { className: "takeaway", children: data.takeaway.text }), insightsBefore.length > 0 && (_jsxs("div", { className: "panel panel-tight", children: [_jsx("h4", { children: "What mattered before your move" }), _jsx("ul", { className: "bullets mt8", children: insightsBefore.map((i) => (_jsxs("li", { children: [_jsxs("strong", { children: [i.theme, "."] }), " ", _jsx("span", { className: "muted", children: i.text })] }, i.id))) })] })), data.takeaway.lessonId && (_jsxs("button", { className: "link-btn", onClick: () => { onClose(); navigate(`/train/lesson/${data.takeaway.lessonId}`); }, children: [_jsx(BookOpen, { size: 14 }), " Lesson: ", data.takeaway.lessonTitle] }))] })), data && (_jsxs("div", { className: "breakdown-nav", children: [_jsx(Button, { variant: "ghost", icon: _jsx(ArrowLeft, { size: 16 }), disabled: step === 0, onClick: () => setStep(step - 1), children: "Back" }), step < STEPS.length - 1 ? (_jsx(Button, { icon: _jsx(ArrowRight, { size: 16 }), onClick: () => setStep(step + 1), children: STEPS[step + 1] === 'Why' && !bad ? 'What comes next' : STEPS[step + 1] })) : (_jsx(Button, { onClick: onClose, children: "Back to game" }))] }))] })] })] }) }), document.body);
}
