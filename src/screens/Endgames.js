import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowRight, Check, Crosshair, Lightbulb, RotateCcw, Undo2 } from 'lucide-react';
import { Chess } from '../lib/chess/core';
import { engine } from '../lib/engine/stockfish';
import { useApp, dueDrills } from '../lib/store/app';
import { currentPath, navigate, query } from '../lib/router';
import { playSound, soundForSan } from '../lib/sound';
import { Board } from '../components/Board';
import { Button, Empty, Header, Section, NextDock } from '../components/ui';
import { MiniBoard } from '../components/MiniBoard';
import { FollowUpPanel } from '../components/FollowUp';
import { ALL_DRILLS, ENDGAME_CHAPTERS, chapterOf, getDrill } from '../data/endgames';
import { getLesson, LESSONS } from '../data/lessons';
import { dueLabel } from '../lib/srs/scheduler';
const GOAL_LABEL = { mate: 'Checkmate', win: 'Win', draw: 'Hold the draw' };
export function EndgamesHub() {
    const drills = useApp((s) => s.drills);
    const lessons = useApp((s) => s.lessons);
    const passed = ALL_DRILLS.filter((d) => drills[d.id]?.passed).length;
    const due = dueDrills(drills).filter((id) => ALL_DRILLS.some((d) => d.id === id));
    return (_jsxs("div", { className: "page", children: [_jsx(Header, { title: "Endgame course", backTo: "/train", sub: "Technique lessons, then drills against a full-strength engine that defends (or attacks) as well as it can. Pass each drill by reaching the goal." }), due.length > 0 && (_jsxs("button", { className: "program-cta eg-due", onClick: () => navigate(`/endgames/${due[0]}?review=1`), children: [_jsxs("span", { children: [_jsxs("strong", { children: [due.length, " drill", due.length === 1 ? '' : 's', " due for review"] }), _jsxs("span", { className: "muted small", children: ["Passed drills come back on a spaced schedule so the technique stays automatic: ", due.map((id) => ALL_DRILLS.find((d) => d.id === id)?.title).filter(Boolean).slice(0, 3).join(', '), due.length > 3 ? '…' : ''] })] }), _jsx(ArrowRight, { size: 18 })] })), _jsxs("div", { className: "eg-progress", children: [_jsxs("span", { className: "eg-progress-num num", children: [passed, _jsxs("span", { className: "muted", children: ["/", ALL_DRILLS.length] })] }), _jsx("span", { className: "muted small", children: "drills passed" }), _jsx("span", { className: "meter", children: _jsx("span", { className: "meter-fill", style: { width: `${(passed / ALL_DRILLS.length) * 100}%` } }) })] }), ENDGAME_CHAPTERS.map((ch, ci) => (_jsxs(Section, { title: _jsxs("span", { children: [_jsx("span", { className: "eg-chapter-num num", children: ci + 1 }), " ", ch.title] }), children: [_jsx("p", { className: "muted mb8", children: ch.blurb }), _jsx("div", { className: "list mb12", children: ch.lessons.map((id) => {
                            const l = getLesson(id);
                            if (!l)
                                return null;
                            const done = lessons[id]?.completed;
                            return (_jsxs("button", { className: "list-item", onClick: () => navigate(`/train/lesson/${id}`), children: [_jsx("span", { className: `lesson-check${done ? ' is-done' : ''}`, children: done ? _jsx(Check, { size: 16 }) : null }), _jsxs("span", { className: "list-item-main", children: [_jsx("span", { className: "list-item-title", children: l.title }), _jsx("span", { className: "list-item-sub", children: l.summary })] }), _jsxs("span", { className: "list-item-meta", children: [l.minutes, " min", _jsx("br", {}), "lesson"] })] }, id));
                        }) }), _jsx("div", { className: "eg-drills", children: ch.drills.map((d) => {
                            const st = drills[d.id];
                            return (_jsxs("button", { className: `eg-drill${st?.passed ? ' is-passed' : ''}`, onClick: () => navigate(`/endgames/${d.id}`), children: [_jsx(MiniBoard, { fen: d.fen, orientation: d.side }), _jsxs("span", { className: "eg-drill-body", children: [_jsx("span", { className: "eg-drill-title", children: d.title }), _jsx("span", { className: `eg-goal eg-goal-${d.goal}`, children: GOAL_LABEL[d.goal] }), _jsx("span", { className: "faint small", children: st?.passed ? _jsxs(_Fragment, { children: [_jsx(Check, { size: 12 }), " passed", st.srs ? ` · ${st.srs.due <= Date.now() ? 'review due' : `review ${dueLabel(st.srs).toLowerCase()}`}` : ''] }) : st ? `${st.attempts} attempt${st.attempts === 1 ? '' : 's'}` : `Play ${d.side === 'w' ? 'White' : 'Black'}` })] })] }, d.id));
                        }) })] }, ch.id)))] }));
}
export function DrillScreen({ id }) {
    const drill = getDrill(id);
    if (!drill) {
        return (_jsxs("div", { className: "page", children: [_jsx(Header, { title: "Drill", backTo: "/endgames" }), _jsx(Empty, { title: "Drill not found" })] }));
    }
    return _jsx(DrillRunner, { drill: drill }, id);
}
/** Evaluation in pawns from `side`'s point of view; mates map to ±100. */
function evalFor(line, side) {
    if (!line)
        return 0;
    const white = line.mate !== undefined ? (line.mate > 0 ? 100 : -100) : (line.cp ?? 0) / 100;
    return side === 'w' ? white : -white;
}
function drawReason(c) {
    if (c.isStalemate())
        return 'stalemate';
    if (c.isInsufficientMaterial())
        return 'insufficient material';
    if (c.isThreefoldRepetition())
        return 'threefold repetition';
    if (c.isDraw())
        return 'the 50-move rule';
    return null;
}
function bareKing(c, color) {
    return c.board().flat().filter((p) => p && p.color === color).length === 1;
}
function DrillRunner({ drill }) {
    const record = useApp((s) => s.recordDrill);
    const stat = useApp((s) => s.drills[drill.id]);
    const game = useRef(new Chess(drill.fen));
    const [, setTick] = useState(0);
    const rerender = () => setTick((t) => t + 1);
    const [phase, setPhase] = useState('play');
    const [message, setMessage] = useState('');
    const [hint, setHint] = useState(false);
    const [better, setBetter] = useState(null);
    const [held, setHeld] = useState(0);
    const recorded = useRef(false);
    const promoted = useRef(false);
    /** Hints or takebacks used this attempt: a pass then counts as 'hard' for scheduling. */
    const assisted = useRef(false);
    const reviewMode = query(currentPath()).get('review') === '1';
    const dueList = dueDrills(useApp.getState().drills).filter((x) => x !== drill.id);
    const gen = useRef(0);
    const side = drill.side;
    const opp = side === 'w' ? 'b' : 'w';
    const engineFirst = new Chess(drill.fen).turn() !== side;
    const c = game.current;
    const history = c.history({ verbose: true });
    const last = history[history.length - 1];
    const myMoves = history.filter((m) => m.color === side).length;
    const halfmove = parseInt(c.fen().split(' ')[4], 10) || 0;
    const chapter = chapterOf(drill.id);
    const nextDrill = ALL_DRILLS[ALL_DRILLS.indexOf(drill) + 1];
    const lessonId = LESSONS.find((l) => l.sections.some((s) => s.drill === drill.id))?.id ?? chapter?.lessons[0];
    const finish = useCallback((won, msg) => {
        setPhase(won ? 'won' : 'failed');
        setMessage(msg);
        playSound(won ? 'good' : 'bad');
        if (!recorded.current || won) {
            record(drill.id, won, game.current.history({ verbose: true }).filter((m) => m.color === drill.side).length, won ? (assisted.current ? 'hard' : 'good') : 'again');
            recorded.current = true;
        }
    }, [drill.id, drill.side, record]);
    const engineMove = useCallback(async (token) => {
        const g = game.current;
        const res = await engine.analyze(g.fen(), { movetime: 700, multipv: 1 }, undefined, true);
        if (token !== gen.current)
            return;
        const uci = res.bestmove && res.bestmove !== '(none)' ? res.bestmove : res.lines[0]?.pv[0];
        if (!uci)
            return;
        const m = g.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] || undefined });
        soundForSan(m.san);
        rerender();
        if (g.isCheckmate())
            return finish(false, 'You were checkmated.');
        const dr = drawReason(g);
        if (dr) {
            if (drill.goal === 'draw')
                return finish(true, `Drawn by ${dr}.`);
            return finish(false, dr === 'insufficient material' ? 'The engine won the material you needed — it’s a draw now.' : `Draw by ${dr}. ${dr === 'the 50-move rule' ? 'Too slow — 50 moves passed without a capture or pawn move.' : 'The win slipped away.'}`);
        }
        setPhase('play');
    }, [drill.goal, finish]);
    // The engine starts when it has the move.
    useEffect(() => {
        if (engineFirst && game.current.history().length === 0) {
            setPhase('thinking');
            void engineMove(gen.current);
        }
        return () => {
            gen.current++;
        };
    }, [engineFirst, engineMove]);
    const onMove = async (mv) => {
        if (phase !== 'play')
            return;
        const g = game.current;
        if (g.turn() !== side)
            return;
        let m;
        try {
            m = g.move(mv);
        }
        catch {
            return;
        }
        if (m.promotion)
            promoted.current = true;
        setHint(false);
        setBetter(null);
        soundForSan(m.san);
        rerender();
        const token = ++gen.current;
        if (g.isCheckmate())
            return finish(true, drill.goal === 'mate' ? `Checkmate in ${myMovesNow()} moves.` : 'Checkmate!');
        const dr = drawReason(g);
        if (dr) {
            if (drill.goal === 'draw')
                return finish(true, `Drawn by ${dr}.`);
            return finish(false, dr === 'stalemate' ? 'Stalemate! The king had no legal move — check its squares before every move near the edge.' : `Draw by ${dr}.`);
        }
        setPhase('thinking');
        const res = await engine.analyze(g.fen(), { movetime: 700, multipv: 1 }, undefined, true);
        if (token !== gen.current)
            return;
        let ev = evalFor(res.lines[0], side);
        const mine = myMovesNow();
        if (drill.holdAbove !== undefined && ev < drill.holdAbove) {
            // Make sure before failing: shallow searches can misjudge pawn endings.
            setPhase('checking');
            const deep = await engine.analyze(g.fen(), { movetime: 3000, multipv: 1 }, undefined, true);
            if (token !== gen.current)
                return;
            ev = evalFor(deep.lines[0], side);
            if (ev < drill.holdAbove) {
                return finish(false, drill.goal === 'draw' ? 'That move loses — the engine now has a winning position.' : 'That lets the win slip — the engine can hold this now.');
            }
        }
        if (drill.goal === 'win' && ev >= 6 && (promoted.current || bareKing(g, opp))) {
            return finish(true, promoted.current ? 'Promoted — and the new queen is safe. Won.' : 'Nothing left but the king. Won.');
        }
        if (drill.goal === 'draw') {
            setHeld(mine);
            if (mine >= (drill.survive ?? 15))
                return finish(true, `Held for ${mine} moves — the engine can’t make progress.`);
        }
        void engineMove(token);
    };
    function myMovesNow() {
        return game.current.history({ verbose: true }).filter((m) => m.color === side).length;
    }
    const restart = () => {
        gen.current++;
        game.current = new Chess(drill.fen);
        promoted.current = false;
        recorded.current = false;
        assisted.current = false;
        setMessage('');
        setBetter(null);
        setHint(false);
        setHeld(0);
        rerender();
        engine.newGame();
        if (engineFirst) {
            setPhase('thinking');
            void engineMove(gen.current);
        }
        else
            setPhase('play');
    };
    const takeBack = () => {
        assisted.current = true;
        gen.current++;
        const g = game.current;
        const minLen = engineFirst ? 1 : 0;
        if (g.history().length <= minLen)
            return;
        if (g.turn() === side && g.history().length > minLen)
            g.undo(); // engine's reply
        if (g.turn() !== side && g.history().length > minLen)
            g.undo(); // my move
        promoted.current = g.history({ verbose: true }).some((m) => m.color === side && m.promotion);
        setMessage('');
        setBetter(null);
        setHeld(myMovesNow());
        setPhase('play');
        rerender();
    };
    const showBetter = async () => {
        const g = game.current;
        const h = g.history({ verbose: true });
        const mineIdx = [...h].reverse().findIndex((m) => m.color === side);
        if (mineIdx < 0)
            return;
        const mineMove = h[h.length - 1 - mineIdx];
        const before = mineMove.before;
        const res = await engine.analyze(before, { movetime: 1500, multipv: 1 }, undefined, true);
        const uci = res.lines[0]?.pv[0];
        if (!uci)
            return;
        const t = new Chess(before);
        const m = t.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] || undefined });
        setBetter({ san: m.san, from: m.from, to: m.to, fen: before, uci, tried: mineMove.from + mineMove.to + (mineMove.promotion ?? '') });
    };
    const goalLine = drill.goal === 'draw'
        ? `Hold for ${drill.survive ?? 15} moves (or reach a drawn result)`
        : drill.goal === 'mate'
            ? 'Deliver checkmate before the 50-move rule'
            : 'Promote safely or leave the king bare';
    const fiftyLeft = 50 - Math.floor(halfmove / 2);
    return (_jsxs("div", { className: "page board-screen-page", children: [_jsx(Header, { title: drill.title, backTo: "/endgames", sub: chapter?.title }), _jsxs("div", { className: "board-screen", children: [_jsx("div", { className: "board-col", children: _jsx(Board, { fen: c.fen(), orientation: side, movable: phase === 'play' && c.turn() === side ? side : null, onMove: onMove, lastMove: last ? [last.from, last.to] : null, arrows: better ? [{ from: better.from, to: better.to, color: 'g' }] : [] }) }), _jsxs("div", { className: "side-col", children: [_jsxs("div", { className: "panel stack", children: [_jsxs("div", { className: "row-between", children: [_jsx("span", { className: `eg-goal eg-goal-${drill.goal}`, children: GOAL_LABEL[drill.goal] }), _jsxs("span", { className: "muted small num", children: [drill.goal === 'draw' ? `${held}/${drill.survive ?? 15} moves` : `${myMoves} move${myMoves === 1 ? '' : 's'}`, drill.goal === 'mate' && fiftyLeft <= 20 && _jsxs(_Fragment, { children: [" \u00B7 ", _jsxs("span", { className: fiftyLeft <= 8 ? 'tone-text-blunder' : '', children: [fiftyLeft, " to the 50-move rule"] })] })] })] }), _jsxs("p", { className: "drill-prompt", children: [_jsx(Crosshair, { size: 16 }), " ", drill.task] }), _jsxs("p", { className: "muted small", children: [goalLine, ". You play ", side === 'w' ? 'White' : 'Black', "."] }), drill.goal === 'draw' && (_jsx("span", { className: "meter", children: _jsx("span", { className: "meter-fill", style: { width: `${Math.min(100, (held / (drill.survive ?? 15)) * 100)}%` } }) })), phase === 'thinking' && _jsx("p", { className: "muted small", children: "Engine to move\u2026" }), phase === 'checking' && _jsx("p", { className: "muted small", children: "Checking that move more deeply\u2026" }), phase === 'play' && c.turn() === side && _jsx("p", { className: "muted small", children: "Your move." }), hint && _jsxs("p", { className: "eg-hint", children: [_jsx(Lightbulb, { size: 14 }), " ", drill.hint] })] }), phase === 'won' && (_jsxs("div", { className: "panel stack eg-result is-won", children: [_jsxs("h2", { children: [_jsx(Check, { size: 20 }), " Passed"] }), _jsx("p", { children: message }), _jsx("p", { className: "muted", children: drill.idea }), stat?.bestMoves !== undefined && drill.goal !== 'draw' && _jsxs("p", { className: "faint small num", children: ["Your best: ", stat.bestMoves, " moves"] }), _jsxs("div", { className: "row", children: [_jsx(NextDock, { children: reviewMode ? (dueList.length ? (_jsxs(Button, { icon: _jsx(ArrowRight, { size: 16 }), onClick: () => navigate(`/endgames/${dueList[0]}?review=1`), children: ["Next review (", dueList.length, " left)"] })) : (_jsx(Button, { onClick: () => navigate('/endgames'), children: "Reviews done" }))) : nextDrill ? (_jsxs(Button, { icon: _jsx(ArrowRight, { size: 16 }), onClick: () => navigate(`/endgames/${nextDrill.id}`), children: ["Next: ", nextDrill.title] })) : (_jsx(Button, { onClick: () => navigate('/endgames'), children: "Back to the course" })) }), _jsx(Button, { variant: "secondary", icon: _jsx(RotateCcw, { size: 16 }), onClick: restart, children: "Again" })] })] })), phase === 'failed' && (_jsxs("div", { className: "panel stack eg-result is-failed", children: [_jsx("h2", { children: "Not this time" }), _jsx("p", { children: message }), better && _jsxs("p", { className: "muted", children: ["Better was ", _jsx("strong", { className: "num", children: better.san }), " (green arrow)."] }), better && _jsx(FollowUpPanel, { fen: better.fen, uci: better.uci, tried: [better.tried], title: `Why ${better.san} was better` }), _jsxs("div", { className: "row", children: [_jsx(Button, { icon: _jsx(Undo2, { size: 16 }), onClick: takeBack, children: "Take back" }), !better && _jsx(Button, { variant: "secondary", onClick: showBetter, children: "Show a better move" }), _jsx(Button, { variant: "ghost", icon: _jsx(RotateCcw, { size: 16 }), onClick: restart, children: "Restart" })] })] })), (phase === 'play' || phase === 'thinking' || phase === 'checking') && (_jsxs("div", { className: "row", children: [!hint && _jsx(Button, { variant: "secondary", size: "sm", icon: _jsx(Lightbulb, { size: 14 }), onClick: () => { setHint(true); assisted.current = true; }, children: "Hint" }), _jsx(Button, { variant: "secondary", size: "sm", icon: _jsx(Undo2, { size: 14 }), disabled: phase !== 'play' || history.length <= (engineFirst ? 1 : 0), onClick: takeBack, children: "Take back" }), _jsx(Button, { variant: "ghost", size: "sm", icon: _jsx(RotateCcw, { size: 14 }), onClick: restart, children: "Restart" })] })), lessonId && (_jsxs("button", { className: "link-btn", onClick: () => navigate(`/train/lesson/${lessonId}`), children: ["Read the lesson ", _jsx(ArrowRight, { size: 14 })] }))] })] })] }));
}
