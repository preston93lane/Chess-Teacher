import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Check, Eye, RotateCcw, X } from 'lucide-react';
import { Chess, formatLine, fenKey, pvToSan, uciOf } from '../lib/chess/core';
import { getOpening, parseLine, allLines, studentPlies } from '../lib/openings/book';
import { engine } from '../lib/engine/stockfish';
import { lineScore, winPct } from '../lib/coach/eval';
import { describeMove } from '../lib/coach/explain';
import { soundForSan, playSound } from '../lib/sound';
import { FollowUpPanel } from './FollowUp';
import { Board } from './Board';
import { MoveList } from './MoveList';
import { Button, Spinner } from './ui';
/** Plays through an opening line. In "learn" mode the moves are shown; in "drill" mode you recall them. */
export function LineDrill({ openingId, lineId, side, mode, onDone, focusPlies, }) {
    const opening = getOpening(openingId);
    const line = useMemo(() => parseLine(opening, lineId), [opening, lineId]);
    const [ply, setPly] = useState(0);
    const [wrong, setWrong] = useState(0);
    const [mistakes, setMistakes] = useState([]);
    const [hints, setHints] = useState(0);
    const [reveal, setReveal] = useState(false);
    const [feedback, setFeedback] = useState(null);
    const [orientation] = useState(side);
    const [done, setDone] = useState(false);
    const finished = useRef(false);
    const total = line.sans.length;
    const fen = line.fens[ply];
    const turn = fen.split(' ')[1];
    const studentTurn = turn === side && ply < total;
    const myPlies = useMemo(() => studentPlies(line, side), [line, side]);
    // auto-play opponent moves
    useEffect(() => {
        if (ply >= total) {
            if (!finished.current) {
                finished.current = true;
                setDone(true);
                playSound('end');
                onDone({ mistakes: mistakes.length, hints, weakPlies: mistakes });
            }
            return;
        }
        if (studentTurn)
            return;
        const t = setTimeout(() => {
            soundForSan(line.sans[ply]);
            setPly((p) => p + 1);
        }, mode === 'learn' ? 750 : 420);
        return () => clearTimeout(t);
    }, [ply, total, studentTurn, line.sans, mode, mistakes, hints, onDone]);
    const onMove = useCallback((mv) => {
        if (!studentTurn)
            return;
        const c = new Chess(fen);
        let m;
        try {
            m = c.move(mv);
        }
        catch {
            return;
        }
        const expected = line.sans[ply];
        if (m.san === expected) {
            soundForSan(m.san);
            setFeedback(wrong === 0 && !reveal ? { tone: 'good', text: `${m.san} — correct.` } : { tone: 'info', text: `${m.san}. Keep going.` });
            setWrong(0);
            setReveal(false);
            setPly(ply + 1);
            return;
        }
        // Another theory move from this opening?
        const alt = allLines(opening).find((l) => l.lineId !== lineId && l.fens.some((f, i) => i < l.sans.length && fenKey(f) === fenKey(fen) && l.sans[i] === m.san));
        playSound('bad');
        if (alt) {
            setFeedback({ tone: 'info', text: `${m.san} is theory too (${alt.name}), but this line continues differently. Try again.` });
            return;
        }
        if (!mistakes.includes(ply))
            setMistakes([...mistakes, ply]);
        const n = wrong + 1;
        setWrong(n);
        if (n >= 2)
            setReveal(true);
        setFeedback({ tone: 'bad', text: n >= 2 ? `The line continues ${expected}. Play it to continue.` : `${m.san} is not the move in this line. Try again.` });
    }, [studentTurn, fen, line, ply, wrong, reveal, mistakes, opening, lineId]);
    const showHint = () => {
        setReveal(true);
        setHints(hints + 1);
        if (!mistakes.includes(ply))
            setMistakes([...mistakes, ply]);
    };
    const restart = () => {
        finished.current = false;
        setDone(false);
        setPly(0);
        setWrong(0);
        setMistakes([]);
        setHints(0);
        setReveal(false);
        setFeedback(null);
    };
    const expectedUci = ply < total ? line.ucis[ply] : null;
    const arrows = studentTurn && expectedUci && (mode === 'learn' || reveal)
        ? [{ from: expectedUci.slice(0, 2), to: expectedUci.slice(2, 4), color: 'g' }]
        : [];
    const lastIdx = ply - 1;
    const lastMove = lastIdx >= 0 ? [line.ucis[lastIdx].slice(0, 2), line.ucis[lastIdx].slice(2, 4)] : null;
    const comment = lastIdx >= 0 ? line.comments[lastIdx] : line.intro;
    const upcoming = studentTurn && mode === 'learn' ? line.comments[ply] : undefined;
    const myDone = myPlies.filter((p) => p < ply).length;
    const focus = focusPlies?.includes(ply) && studentTurn;
    return (_jsxs("div", { className: "board-screen", children: [_jsxs("div", { className: "board-col", children: [_jsx(Board, { fen: fen, orientation: orientation, movable: studentTurn && !done ? side : null, onMove: onMove, lastMove: lastMove, arrows: arrows }), _jsxs("div", { className: "drill-progress", children: [_jsx("div", { className: "meter", children: _jsx("div", { className: "meter-fill", style: { width: `${(myDone / Math.max(1, myPlies.length)) * 100}%` } }) }), _jsxs("span", { className: "muted small num", children: [myDone, "/", myPlies.length, " moves"] })] })] }), _jsxs("div", { className: "side-col", children: [_jsxs("div", { className: "drill-head", children: [_jsxs("p", { className: "drill-mode", children: [mode === 'learn' ? 'Learn' : 'Recall', " \u00B7 playing ", side === 'w' ? 'White' : 'Black'] }), _jsx("h2", { children: line.name })] }), feedback && (_jsxs("div", { className: `feedback feedback-${feedback.tone}`, role: "status", children: [feedback.tone === 'good' ? _jsx(Check, { size: 18 }) : feedback.tone === 'bad' ? _jsx(X, { size: 18 }) : null, _jsx("span", { children: feedback.text })] })), !done && studentTurn && (_jsxs("div", { className: "panel panel-tight", children: [_jsx("p", { className: "drill-prompt", children: mode === 'learn' ? (_jsxs(_Fragment, { children: ["Play ", _jsx("strong", { children: line.sans[ply] }), upcoming ? ` — ${upcoming}` : '.'] })) : focus ? ('You missed this one last time. What’s the move?') : ('Your move. What does theory play here?') }), mode === 'drill' && !reveal && (_jsxs("button", { className: "link-btn mt8", onClick: showHint, children: [_jsx(Eye, { size: 14 }), " Show the move"] }))] })), comment && (_jsxs("div", { className: "commentary", children: [_jsx("span", { className: "commentary-move", children: lastIdx >= 0 ? formatLine(line.fens[lastIdx], [line.sans[lastIdx]]) : 'Introduction' }), _jsx("p", { children: comment })] })), _jsx(MoveList, { moves: line.sans.slice(0, ply).map((san) => ({ san })), current: ply, onSelect: () => undefined }), done && (_jsxs("div", { className: "panel stack", children: [_jsx("h3", { children: mistakes.length === 0 ? 'Clean run.' : `${mistakes.length} move${mistakes.length > 1 ? 's' : ''} to work on.` }), _jsx("p", { className: "muted", children: mistakes.length === 0
                                    ? 'The line is scheduled for review. Spacing the repetitions is what makes it stick.'
                                    : 'The moves you missed are flagged — the next review will focus on them.' }), _jsx(Button, { variant: "secondary", icon: _jsx(RotateCcw, { size: 16 }), onClick: restart, children: "Run it again" })] }))] })] }));
}
/** Find-the-better-move puzzle built from one of your own games. */
export function PuzzleDrill({ card, onDone }) {
    const [fen, setFen] = useState(card.fen);
    const [triedMoves, setTriedMoves] = useState([]);
    const [tries, setTries] = useState(0);
    const [state, setState] = useState('solving');
    const [feedback, setFeedback] = useState(null);
    const [reveal, setReveal] = useState(false);
    const [lastMove, setLastMove] = useState(null);
    const side = card.fen.split(' ')[1];
    const best = card.solution[0];
    const solutionSan = useMemo(() => pvToSan(card.fen, card.solution, 6), [card]);
    const playedSan = useMemo(() => pvToSan(card.fen, [card.played], 1)[0], [card]);
    const bestDesc = useMemo(() => {
        const c = new Chess(card.fen);
        try {
            const m = c.move({ from: best.slice(0, 2), to: best.slice(2, 4), promotion: best[4] || undefined });
            return describeMove(card.fen, m)[0];
        }
        catch {
            return '';
        }
    }, [card, best]);
    useEffect(() => {
        setFen(card.fen);
        setTriedMoves([]);
        setTries(0);
        setState('solving');
        setFeedback(null);
        setReveal(false);
        setLastMove(null);
    }, [card]);
    const finish = (solved, t) => {
        setState(solved ? 'solved' : 'failed');
        onDone({ solved, tries: t });
    };
    const onMove = async (mv) => {
        if (state !== 'solving')
            return;
        const c = new Chess(card.fen);
        let m;
        try {
            m = c.move(mv);
        }
        catch {
            return;
        }
        const uci = uciOf(m);
        if (uci !== best)
            setTriedMoves((x) => (x.includes(uci) ? x : [...x, uci]));
        soundForSan(m.san);
        setFen(c.fen());
        setLastMove([m.from, m.to]);
        const t = tries + 1;
        setTries(t);
        if (uci === best) {
            playSound('good');
            setFeedback(`${m.san}! ${bestDesc ?? ''}`);
            finish(t === 1, t);
            return;
        }
        if (uci === card.played) {
            playSound('bad');
            setFeedback(`${m.san} is what you played in the game. Look for something better.`);
            setTimeout(() => { setFen(card.fen); setLastMove(null); }, 700);
            if (t >= 2)
                setReveal(true);
            return;
        }
        // Check alternatives with the engine: accept if nearly as good as the solution.
        setState('checking');
        try {
            const [mine, top] = await Promise.all([
                engine.analyze(c.fen(), { depth: 12 }),
                engine.analyze(card.fen, { depth: 12, multipv: 1 }),
            ]);
            const myWin = winPct(lineScore(mine.lines[0]), side);
            const bestWin = winPct(lineScore(top.lines[0]), side);
            if (bestWin - myWin <= 4) {
                playSound('good');
                setFeedback(`${m.san} works too. The engine’s choice was ${solutionSan[0]}.`);
                setState('solving');
                finish(t === 1, t);
                return;
            }
            playSound('bad');
            setFeedback(`${m.san} isn’t it. Try again.`);
            setState('solving');
            setTimeout(() => { setFen(card.fen); setLastMove(null); }, 700);
            if (t >= 2)
                setReveal(true);
        }
        catch {
            setState('solving');
            setFen(card.fen);
        }
    };
    const giveUp = () => {
        setReveal(true);
        setFeedback(`The answer: ${formatLine(card.fen, solutionSan)}`);
        finish(false, tries + 1);
    };
    const arrows = reveal ? [{ from: best.slice(0, 2), to: best.slice(2, 4), color: 'y' }] : [];
    return (_jsxs("div", { className: "board-screen", children: [_jsx("div", { className: "board-col", children: _jsx(Board, { fen: fen, orientation: side, movable: state === 'solving' ? side : null, onMove: onMove, arrows: arrows, lastMove: lastMove }) }), _jsxs("div", { className: "side-col", children: [_jsxs("div", { className: "drill-head", children: [_jsxs("p", { className: "drill-mode", children: [card.id.startsWith('pz:lichess:') ? 'Puzzle review' : 'From your games', " \u00B7 ", side === 'w' ? 'White' : 'Black', " to move"] }), _jsx("h2", { children: card.title })] }), _jsxs("div", { className: "panel panel-tight", children: [_jsx("p", { className: "drill-prompt", children: card.id.startsWith('pz:lichess:') ? (_jsxs(_Fragment, { children: ["You missed this puzzle", playedSan ? _jsxs(_Fragment, { children: [" (you tried ", _jsx("strong", { children: playedSan }), ")"] }) : null, ". Find the winning move."] })) : playedSan ? (_jsxs(_Fragment, { children: ["In the game you played ", _jsx("strong", { children: playedSan }), ". Find a stronger move."] })) : ('Find the best move.') }), card.note && _jsx("p", { className: "muted small mt8", children: card.note })] }), state === 'checking' && _jsx(Spinner, { label: "Checking your move\u2026" }), feedback && (_jsx("div", { className: `feedback ${state === 'solved' ? 'feedback-good' : state === 'failed' ? 'feedback-info' : 'feedback-bad'}`, children: _jsx("span", { children: feedback }) })), (state === 'solved' || state === 'failed') && (_jsx(FollowUpPanel, { fen: card.fen, uci: best, line: card.solution, tried: [...new Set([card.played, ...triedMoves])].filter((u) => u && u !== best) })), state === 'solving' && (_jsxs("div", { className: "row", children: [!reveal && _jsx(Button, { variant: "ghost", size: "sm", icon: _jsx(Eye, { size: 14 }), onClick: () => setReveal(true), children: "Hint" }), _jsx(Button, { variant: "ghost", size: "sm", onClick: giveUp, children: "Show solution" })] }))] })] }));
}
