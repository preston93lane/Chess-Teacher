import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, Check, Eye } from 'lucide-react';
import { Chess } from '../lib/chess/core';
import { puzzleStart } from '../lib/puzzles';
import { useApp } from '../lib/store/app';
import { usePuzzleDb } from './Puzzles';
import { playSound } from '../lib/sound';
import { Board } from '../components/Board';
import { FollowUpPanel } from '../components/FollowUp';
import { Button, Header, Segmented, Spinner, NextDock } from '../components/ui';
const pick = (a) => a[Math.floor(Math.random() * a.length)];
function makeCct(db, rating) {
    for (let i = 0; i < 50; i++) {
        const p = pick(db);
        if (Math.abs(p.rating - rating) > 500)
            continue;
        const { fen } = puzzleStart(p);
        const moves = new Chess(fen).moves({ verbose: true });
        const forcing = moves
            .filter((m) => m.san.includes('+') || m.san.includes('#') || m.captured)
            .map((m) => ({ san: m.san, from: m.from, to: m.to, kind: (m.captured && (m.san.includes('+') || m.san.includes('#')) ? 'both' : m.captured ? 'capture' : 'check') }));
        // Promotions to several pieces count once
        const uniq = forcing.filter((f, j) => forcing.findIndex((g) => g.from === f.from && g.to === f.to) === j);
        if (uniq.length >= 3 && uniq.length <= 9)
            return { fen, forcing: uniq };
    }
    const { fen } = puzzleStart(db[0]);
    return { fen, forcing: [] };
}
export function CctTrainer() {
    const { db } = usePuzzleDb();
    const rating = useApp((s) => s.puzzles.rating);
    const logActivity = useApp((s) => s.logActivity);
    const [q, setQ] = useState(null);
    const [found, setFound] = useState([]);
    const [wrong, setWrong] = useState([]);
    const [done, setDone] = useState(false);
    const [round, setRound] = useState({ n: 0, found: 0, total: 0, wrong: 0 });
    useEffect(() => {
        if (db && !q)
            setQ(makeCct(db, rating));
    }, [db, q, rating]);
    if (!db || !q)
        return _jsxs("div", { className: "page", children: [_jsx(Header, { title: "Checks & captures", backTo: "/courses/calculation" }), _jsx(Spinner, { label: "Loading positions\u2026" })] });
    const side = q.fen.split(' ')[1];
    const onMove = (m) => {
        if (done)
            return;
        const key = m.from + m.to;
        const hit = q.forcing.find((f) => f.from + f.to === key);
        if (hit) {
            if (!found.includes(key)) {
                setFound([...found, key]);
                playSound('move');
            }
        }
        else {
            setWrong([...wrong, key]);
            playSound('bad');
        }
    };
    const finish = () => {
        setDone(true);
        setRound((r) => ({ n: r.n + 1, found: r.found + found.length, total: r.total + q.forcing.length, wrong: r.wrong + wrong.length }));
        logActivity('puzzles');
        playSound(found.length === q.forcing.length ? 'good' : 'end');
    };
    const next = () => {
        setQ(makeCct(db, rating));
        setFound([]);
        setWrong([]);
        setDone(false);
    };
    const arrows = [
        ...q.forcing.filter((f) => found.includes(f.from + f.to)).map((f) => ({ from: f.from, to: f.to, color: 'g' })),
        ...(done ? q.forcing.filter((f) => !found.includes(f.from + f.to)).map((f) => ({ from: f.from, to: f.to, color: 'r' })) : []),
    ];
    return (_jsxs("div", { className: "page board-screen-page", children: [_jsx(Header, { title: "Checks & captures", backTo: "/courses/calculation", sub: "Before choosing a move, list every forcing move. Find them all." }), _jsxs("div", { className: "board-screen", children: [_jsx("div", { className: "board-col", children: _jsx(Board, { fen: q.fen, orientation: side, movable: done ? null : side, onMove: onMove, arrows: arrows }, q.fen) }), _jsxs("div", { className: "side-col", children: [_jsxs("div", { className: "panel stack", children: [_jsxs("p", { className: "drill-prompt", children: [side === 'w' ? 'White' : 'Black', " to move. Play every check and every capture on the board \u2014 each one you find is marked with a green arrow."] }), _jsxs("p", { className: "num", children: ["Found ", _jsx("strong", { children: found.length }), done ? ` of ${q.forcing.length}` : '', wrong.length > 0 && _jsxs("span", { className: "muted", children: [" \u00B7 ", wrong.length, " not forcing"] })] }), !done ? (_jsx(Button, { icon: _jsx(Check, { size: 16 }), onClick: finish, children: "I\u2019ve found them all" })) : (_jsxs(_Fragment, { children: [_jsx("p", { className: found.length === q.forcing.length ? 'tone-text-best' : 'muted', children: found.length === q.forcing.length ? 'All of them. That’s the habit.' : `Missed (red): ${q.forcing.filter((f) => !found.includes(f.from + f.to)).map((f) => f.san).join(', ')}.` }), _jsx(NextDock, { children: _jsx(Button, { icon: _jsx(ArrowRight, { size: 16 }), onClick: next, children: "Next position" }) })] }))] }), round.n > 0 && (_jsxs("p", { className: "muted small", children: ["This session: ", round.found, "/", round.total, " forcing moves found over ", round.n, " position", round.n === 1 ? '' : 's', round.wrong ? `, ${round.wrong} non-forcing moves tried` : '', "."] }))] })] })] }));
}
function makeVis(db, rating, depth) {
    for (let i = 0; i < 80; i++) {
        const p = pick(db);
        if (Math.abs(p.rating - rating) > 450)
            continue;
        const need = depth * 2 + 1; // announced plies + the move to find
        if (p.moves.length - 1 < need)
            continue;
        const { fen, side } = puzzleStart(p);
        const c = new Chess(fen);
        const announced = [];
        try {
            for (let k = 1; k <= depth * 2; k++) {
                const u = p.moves[k];
                announced.push(c.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] || undefined }).san);
            }
            const u = p.moves[depth * 2 + 1];
            const answer = c.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] || undefined }).san;
            c.undo();
            const others = c
                .moves()
                .filter((m) => m !== answer)
                .sort((a, b) => Number(/[+#x]/.test(b)) - Number(/[+#x]/.test(a)) || Math.random() - 0.5)
                .slice(0, 3);
            if (others.length < 3)
                continue;
            return { fen, announced, answer, options: [answer, ...others].sort(() => Math.random() - 0.5), side };
        }
        catch {
            continue;
        }
    }
    return null;
}
export function VisualizeTrainer() {
    const { db } = usePuzzleDb();
    const rating = useApp((s) => s.puzzles.rating);
    const logActivity = useApp((s) => s.logActivity);
    const [depth, setDepth] = useState('1');
    const [q, setQ] = useState(null);
    const [answer, setAnswer] = useState(null);
    const [score, setScore] = useState({ ok: 0, n: 0 });
    const [peek, setPeek] = useState(false);
    const fresh = () => {
        if (!db)
            return;
        setQ(makeVis(db, rating, depth === '2' ? 2 : 1));
        setAnswer(null);
        setPeek(false);
    };
    useEffect(() => {
        if (db && !q)
            fresh();
    }, [db]); // eslint-disable-line react-hooks/exhaustive-deps
    const finalFen = useMemo(() => {
        if (!q)
            return null;
        const c = new Chess(q.fen);
        for (const s of q.announced)
            c.move(s);
        return c.fen();
    }, [q]);
    const answerUci = q && finalFen ? triedUci(finalFen, q.answer) : null;
    if (!db)
        return _jsxs("div", { className: "page", children: [_jsx(Header, { title: "Visualize the line", backTo: "/courses/calculation" }), _jsx(Spinner, { label: "Loading positions\u2026" })] });
    const choose = (o) => {
        if (!q || answer)
            return;
        setAnswer(o);
        const ok = o === q.answer;
        setScore((s) => ({ ok: s.ok + (ok ? 1 : 0), n: s.n + 1 }));
        playSound(ok ? 'good' : 'bad');
        logActivity('puzzles');
    };
    const numbered = (q?.announced ?? []).map((s, i) => {
        const ply = i; // the announced line starts with the side to move
        const isFirst = ply % 2 === 0;
        return `${isFirst ? (q.side === 'w' ? `${Math.floor(i / 2) + 1}.` : `${Math.floor(i / 2) + 1}…`) : ''}${s}`;
    });
    return (_jsxs("div", { className: "page board-screen-page", children: [_jsx(Header, { title: "Visualize the line", backTo: "/courses/calculation", sub: "The board doesn\u2019t move. Play the line in your head, then pick the winning continuation." }), _jsxs("div", { className: "row mb12", children: [_jsx(Segmented, { value: depth, onChange: (v) => { setDepth(v); setQ(db ? makeVis(db, rating, v === '2' ? 2 : 1) : null); setAnswer(null); }, options: [{ value: '1', label: 'One move each' }, { value: '2', label: 'Two moves each' }] }), _jsxs("span", { className: "muted small num", children: [score.ok, "/", score.n, " correct"] })] }), !q ? (_jsx("p", { className: "muted", children: "No suitable puzzle found \u2014 try the other depth." })) : (_jsxs("div", { className: "board-screen", children: [_jsx("div", { className: "board-col", children: _jsx(Board, { fen: (answer || peek) && finalFen ? finalFen : q.fen, orientation: q.side }) }), _jsx("div", { className: "side-col", children: _jsxs("div", { className: "panel stack", children: [_jsxs("p", { className: "drill-prompt", children: [q.side === 'w' ? 'White' : 'Black', " to move. Imagine:"] }), _jsx("p", { className: "vis-line num", children: numbered.join(' ') }), _jsxs("p", { className: "muted", children: ["Now it\u2019s ", q.side === 'w' ? 'White' : 'Black', "\u2019s move again. What wins?"] }), _jsx("div", { className: "quiz-options", children: q.options.map((o) => (_jsx("button", { className: `quiz-option${answer ? (o === q.answer ? ' right' : o === answer ? ' wrong' : '') : ''}`, onClick: () => choose(o), disabled: !!answer, children: o }, o))) }), answer && (_jsxs(_Fragment, { children: [_jsx("p", { className: answer === q.answer ? 'tone-text-best' : 'tone-text-mistake', children: answer === q.answer ? `Right — ${q.answer}.` : `It was ${q.answer}. The board now shows the position after the line.` }), _jsx(NextDock, { children: _jsx(Button, { icon: _jsx(ArrowRight, { size: 16 }), onClick: fresh, children: "Next" }) })] })), answer && finalFen && answerUci && _jsx(FollowUpPanel, { fen: finalFen, uci: answerUci, tried: answer !== q.answer ? [triedUci(finalFen, answer)].filter(Boolean) : [] }), !answer && (_jsxs("button", { className: "link-btn", onPointerDown: () => setPeek(true), onPointerUp: () => setPeek(false), onPointerLeave: () => setPeek(false), children: [_jsx(Eye, { size: 14 }), " Hold to peek at the final position"] }))] }) })] }))] }));
}
function triedUci(fen, san) {
    try {
        const m = new Chess(fen).move(san);
        return m.from + m.to + (m.promotion ?? '');
    }
    catch {
        return null;
    }
}
