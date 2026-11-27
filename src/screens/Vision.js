import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useCallback, useEffect, useRef, useState } from 'react';
import { Play, RotateCcw } from 'lucide-react';
import { useApp } from '../lib/store/app';
import { Button, Header, Section, Segmented } from '../components/ui';
import { playSound } from '../lib/sound';
const MODES = [
    { id: 'find', title: 'Find the square', about: 'A square is named — tap it on a board with no coordinates.', seconds: 30 },
    { id: 'name', title: 'Name the square', about: 'A square lights up — pick its name.', seconds: 30 },
    { id: 'color', title: 'Light or dark?', about: 'Know every square’s colour without looking — essential for bishops.', seconds: 30 },
    { id: 'knight', title: 'Knight routes', about: 'How many moves does a knight need from one square to another?', seconds: 60 },
    { id: 'diagonal', title: 'Same diagonal?', about: 'Are the two squares on one diagonal? Spot bishop lines instantly.', seconds: 45 },
];
const FILES = 'abcdefgh';
const randSq = () => FILES[Math.floor(Math.random() * 8)] + (1 + Math.floor(Math.random() * 8));
const fi = (s) => s.charCodeAt(0) - 97;
const ri = (s) => parseInt(s[1], 10) - 1;
const isLight = (s) => (fi(s) + ri(s)) % 2 === 1;
function knightDistance(a, b) {
    const start = fi(a) * 8 + ri(a);
    const goal = fi(b) * 8 + ri(b);
    const dist = new Array(64).fill(-1);
    dist[start] = 0;
    const q = [start];
    const J = [[1, 2], [2, 1], [2, -1], [1, -2], [-1, -2], [-2, -1], [-2, 1], [-1, 2]];
    while (q.length) {
        const c = q.shift();
        if (c === goal)
            return dist[c];
        const f = Math.floor(c / 8);
        const r = c % 8;
        for (const [df, dr] of J) {
            const nf = f + df;
            const nr = r + dr;
            if (nf < 0 || nf > 7 || nr < 0 || nr > 7)
                continue;
            const n = nf * 8 + nr;
            if (dist[n] < 0) {
                dist[n] = dist[c] + 1;
                q.push(n);
            }
        }
    }
    return -1;
}
function makeQ(mode) {
    const a = randSq();
    if (mode === 'find')
        return { prompt: a, answer: a };
    if (mode === 'name') {
        const opts = new Set([a]);
        while (opts.size < 4) {
            // near-misses are more instructive than random squares
            const f = Math.max(0, Math.min(7, fi(a) + Math.floor(Math.random() * 3) - 1));
            const r = Math.max(0, Math.min(7, ri(a) + Math.floor(Math.random() * 3) - 1));
            opts.add(FILES[f] + (r + 1));
        }
        return { prompt: 'Which square is highlighted?', sq: a, options: [...opts].sort(() => Math.random() - 0.5), answer: a };
    }
    if (mode === 'color')
        return { prompt: a, answer: isLight(a) ? 'Light' : 'Dark' };
    if (mode === 'knight') {
        let b = randSq();
        while (b === a)
            b = randSq();
        return { prompt: `${a} → ${b}`, sq: a, sq2: b, answer: String(knightDistance(a, b)) };
    }
    // diagonal: half the time pick a square on a shared diagonal
    let b = randSq();
    if (Math.random() < 0.5) {
        const d = 1 + Math.floor(Math.random() * 6);
        const dirs = [[1, 1], [1, -1], [-1, 1], [-1, -1]].filter(([x, y]) => fi(a) + x * d >= 0 && fi(a) + x * d < 8 && ri(a) + y * d >= 0 && ri(a) + y * d < 8);
        if (dirs.length) {
            const [x, y] = dirs[Math.floor(Math.random() * dirs.length)];
            b = FILES[fi(a) + x * d] + (ri(a) + y * d + 1);
        }
    }
    while (b === a)
        b = randSq();
    const same = Math.abs(fi(a) - fi(b)) === Math.abs(ri(a) - ri(b));
    return { prompt: `${a} and ${b}`, sq: a, sq2: b, answer: same ? 'Yes' : 'No' };
}
export function VisionTrainer() {
    const best = useApp((s) => s.vision);
    const record = useApp((s) => s.recordVision);
    const theme = useApp((s) => s.settings.boardTheme);
    const [mode, setMode] = useState('find');
    const [orient, setOrient] = useState('w');
    const [phase, setPhase] = useState('ready');
    const [q, setQ] = useState(() => makeQ('find'));
    const [score, setScore] = useState(0);
    const [misses, setMisses] = useState(0);
    const [flash, setFlash] = useState(null);
    const [endsAt, setEndsAt] = useState(0);
    const [now, setNow] = useState(Date.now());
    const [side, setSide] = useState('w');
    const scoreRef = useRef(0);
    const prevBest = useRef(0);
    const meta = MODES.find((m) => m.id === mode);
    const start = () => {
        setScore(0);
        scoreRef.current = 0;
        prevBest.current = best[mode] ?? 0;
        setMisses(0);
        setQ(makeQ(mode));
        setSide(orient === 'random' ? (Math.random() < 0.5 ? 'w' : 'b') : orient);
        setEndsAt(Date.now() + meta.seconds * 1000);
        setPhase('run');
    };
    const finish = useCallback(() => {
        setPhase('over');
        record(mode, scoreRef.current);
        playSound('end');
    }, [mode, record]);
    useEffect(() => {
        if (phase !== 'run')
            return;
        const id = setInterval(() => {
            const t = Date.now();
            setNow(t);
            if (t >= endsAt)
                finish();
        }, 100);
        return () => clearInterval(id);
    }, [phase, endsAt, finish]);
    const answer = (a, sq) => {
        if (phase !== 'run')
            return;
        const ok = a === q.answer;
        if (ok) {
            scoreRef.current += 1;
            setScore(scoreRef.current);
        }
        else
            setMisses((m) => m + 1);
        if (sq)
            setFlash({ sq, ok });
        playSound(ok ? 'move' : 'bad');
        setTimeout(() => setFlash(null), 250);
        setQ(makeQ(mode));
        if (orient === 'random' && Math.random() < 0.3)
            setSide(Math.random() < 0.5 ? 'w' : 'b');
    };
    const left = Math.max(0, endsAt - now);
    const squares = [];
    for (let y = 0; y < 8; y++) {
        for (let x = 0; x < 8; x++) {
            const f = side === 'w' ? x : 7 - x;
            const r = side === 'w' ? 7 - y : y;
            const name = FILES[f] + (r + 1);
            const light = (f + r) % 2 === 1;
            const hl = (mode === 'name' || mode === 'knight' || mode === 'diagonal') && (q.sq === name || q.sq2 === name) && phase === 'run';
            squares.push(_jsx("button", { className: `vsq ${light ? 'sq-light' : 'sq-dark'}${hl ? ' vsq-hl' : ''}${flash?.sq === name ? (flash.ok ? ' vsq-ok' : ' vsq-bad') : ''}`, onClick: () => mode === 'find' && answer(name, name), "aria-label": mode === 'find' ? 'square' : name, tabIndex: mode === 'find' ? 0 : -1 }, name));
        }
    }
    return (_jsxs("div", { className: "page board-screen-page", children: [_jsx(Header, { title: "Board vision", backTo: "/train", sub: "Short, timed drills that make the board automatic \u2014 the basis of calculation and blindfold-style thinking." }), phase === 'ready' ? (_jsxs("div", { className: "page-narrow", children: [_jsx(Section, { title: "Drill", children: _jsx("div", { className: "stack", children: MODES.map((m) => (_jsxs("button", { className: `source-card${mode === m.id ? ' is-on' : ''}`, onClick: () => { setMode(m.id); setQ(makeQ(m.id)); }, children: [_jsx("span", { className: "source-title", children: m.title }), _jsx("span", { className: "muted small", children: m.about }), _jsxs("span", { className: "faint small num", children: [m.seconds, " s \u00B7 best ", best[m.id] ?? 0] })] }, m.id))) }) }), (mode === 'find' || mode === 'name') && (_jsx(Section, { title: "Board orientation", children: _jsx(Segmented, { value: orient, onChange: setOrient, options: [{ value: 'w', label: 'White' }, { value: 'b', label: 'Black' }, { value: 'random', label: 'Mixed' }] }) })), _jsx("div", { className: "sticky-cta", children: _jsx(Button, { size: "lg", className: "btn-block", icon: _jsx(Play, { size: 18 }), onClick: start, children: "Start" }) })] })) : (_jsxs("div", { className: "board-screen", children: [_jsx("div", { className: "board-col", children: mode === 'find' || mode === 'name' ? (_jsx("div", { className: `vision-board board-${theme}`, children: squares })) : (_jsx("div", { className: "vision-prompt-big num", children: q.prompt })) }), _jsxs("div", { className: "side-col", children: [_jsxs("div", { className: "rush-score", children: [_jsxs("div", { children: [_jsx("span", { className: "rush-num num", children: score }), _jsx("span", { className: "muted small", children: "correct" })] }), _jsxs("div", { children: [_jsx("span", { className: `rush-num num${left < 5000 ? ' tone-text-blunder' : ''}`, children: Math.ceil(left / 1000) }), _jsx("span", { className: "muted small", children: "seconds" })] }), _jsxs("div", { children: [_jsx("span", { className: "rush-num num", children: misses }), _jsx("span", { className: "muted small", children: "missed" })] })] }), phase === 'run' && (_jsxs("div", { className: "panel stack", children: [mode === 'find' && _jsxs("p", { className: "vision-ask", children: ["Tap ", _jsx("strong", { className: "num", children: q.prompt }), " ", _jsxs("span", { className: "muted small", children: ["(", side === 'w' ? 'White' : 'Black', " at the bottom)"] })] }), mode === 'name' && (_jsx("div", { className: "quiz-options", children: q.options.map((o) => _jsx("button", { className: "quiz-option", onClick: () => answer(o), children: o }, o)) })), mode === 'color' && (_jsxs("div", { className: "row", children: [_jsx(Button, { variant: "secondary", onClick: () => answer('Light'), children: "Light" }), _jsx(Button, { variant: "secondary", onClick: () => answer('Dark'), children: "Dark" })] })), mode === 'knight' && (_jsxs(_Fragment, { children: [_jsxs("p", { className: "vision-ask", children: ["Knight from ", _jsx("strong", { children: q.sq }), " to ", _jsx("strong", { children: q.sq2 }), ": how many moves?"] }), _jsx("div", { className: "row", children: ['1', '2', '3', '4', '5', '6'].map((n) => _jsx(Button, { variant: "secondary", size: "sm", onClick: () => answer(n), children: n }, n)) })] })), mode === 'diagonal' && (_jsxs(_Fragment, { children: [_jsxs("p", { className: "vision-ask", children: ["Are ", _jsx("strong", { children: q.sq }), " and ", _jsx("strong", { children: q.sq2 }), " on the same diagonal?"] }), _jsxs("div", { className: "row", children: [_jsx(Button, { variant: "secondary", onClick: () => answer('Yes'), children: "Yes" }), _jsx(Button, { variant: "secondary", onClick: () => answer('No'), children: "No" })] })] }))] })), phase === 'over' && (_jsxs("div", { className: "panel stack", children: [_jsx("h2", { children: score > prevBest.current ? `Personal best: ${score}!` : `Score: ${score}` }), _jsx("p", { className: "muted", children: misses ? `${misses} slip${misses > 1 ? 's' : ''}. Accuracy beats speed — the speed follows.` : 'No mistakes.' }), _jsxs("div", { className: "row", children: [_jsx(Button, { icon: _jsx(RotateCcw, { size: 16 }), onClick: start, children: "Again" }), _jsx(Button, { variant: "secondary", onClick: () => setPhase('ready'), children: "Change drill" })] })] }))] })] }))] }));
}
