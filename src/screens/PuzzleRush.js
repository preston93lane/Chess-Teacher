import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useCallback, useEffect, useRef, useState } from 'react';
import { Play, RotateCcw } from 'lucide-react';
import { rushPuzzle, THEME_INFO } from '../lib/puzzles';
import { formatClock } from '../lib/clock';
import { useApp } from '../lib/store/app';
import { navigate, query, useRoute } from '../lib/router';
import { Button, Header, Spinner } from '../components/ui';
import { PuzzleSolver, solutionLine } from '../components/PuzzleSolver';
import { usePuzzleDb } from './Puzzles';
import { playSound } from '../lib/sound';
import { BlockBanner, completeBlock } from '../components/BlockBanner';
const LIMITS = { '3': 180_000, '5': 300_000, survival: null };
export function PuzzleRush() {
    const path = useRoute();
    const mode = query(path).get('mode') ?? '3';
    const blockId = query(path).get('block');
    const limit = LIMITS[mode] ?? null;
    const { db } = usePuzzleDb();
    const best = useApp((s) => s.puzzles.rush[mode] ?? 0);
    const recordRush = useApp((s) => s.recordRush);
    const [phase, setPhase] = useState('ready');
    const [index, setIndex] = useState(0);
    const [puzzle, setPuzzle] = useState(null);
    const [score, setScore] = useState(0);
    const [strikes, setStrikes] = useState(0);
    const [log, setLog] = useState([]);
    const [endsAt, setEndsAt] = useState(0);
    const [now, setNow] = useState(Date.now());
    const seen = useRef(new Set());
    const load = useCallback((i) => {
        if (!db)
            return;
        const p = rushPuzzle(db, i, seen.current);
        if (p)
            seen.current.add(p.id);
        setPuzzle(p ?? null);
    }, [db]);
    const start = () => {
        seen.current = new Set();
        setIndex(0);
        setScore(0);
        setStrikes(0);
        setLog([]);
        setPhase('running');
        setEndsAt(limit ? Date.now() + limit : 0);
        load(0);
    };
    const end = useCallback((finalScore) => {
        setPhase('over');
        recordRush(mode, finalScore);
        completeBlock(blockId);
        playSound('end');
    }, [mode, recordRush, blockId]);
    useEffect(() => {
        if (phase !== 'running' || !limit)
            return;
        const id = setInterval(() => {
            const t = Date.now();
            setNow(t);
            if (t >= endsAt)
                end(score);
        }, 100);
        return () => clearInterval(id);
    }, [phase, limit, endsAt, end, score]);
    const onResult = (r) => {
        if (!puzzle || phase !== 'running')
            return;
        const nextLog = [...log, { p: puzzle, ok: r.ok }];
        setLog(nextLog);
        const s = r.ok ? score + 1 : score;
        const k = r.ok ? strikes : strikes + 1;
        setScore(s);
        setStrikes(k);
        if (k >= 3) {
            setTimeout(() => end(s), 600);
            return;
        }
        setTimeout(() => {
            setIndex(index + 1);
            load(index + 1);
        }, r.ok ? 250 : 700);
    };
    const remaining = limit ? Math.max(0, endsAt - now) : null;
    return (_jsxs("div", { className: "page board-screen-page", children: [_jsx(Header, { title: "Puzzle Rush", backTo: blockId ? '/program' : '/puzzles', sub: `${mode === 'survival' ? 'Survival' : `${mode} minutes`} · best ${best}` }), _jsx(BlockBanner, {}), !db && _jsx(Spinner, { label: "Loading puzzles\u2026" }), db && phase === 'ready' && (_jsxs("div", { className: "panel stack rush-intro", children: [_jsx("h2", { children: mode === 'survival' ? 'No clock — three strikes.' : `${mode} minutes, three strikes.` }), _jsx("p", { className: "muted", children: "Puzzles start easy and climb fast. Solve as many as you can; one wrong move is a strike." }), _jsx(Button, { size: "lg", icon: _jsx(Play, { size: 18 }), onClick: start, children: "Start" })] })), db && phase !== 'ready' && (_jsxs("div", { className: "board-screen", children: [_jsxs("div", { className: "board-col", children: [puzzle && phase === 'running' && _jsx(PuzzleSolver, { puzzle: puzzle, onResult: onResult, fast: true }, puzzle.id), phase === 'over' && log.length > 0 && _jsx(PuzzleSolver, { puzzle: log[log.length - 1].p, onResult: () => undefined, showSolution: true, fast: true }, `over-${log[log.length - 1].p.id}`)] }), _jsxs("div", { className: "side-col", children: [_jsxs("div", { className: "rush-score", children: [_jsxs("div", { children: [_jsx("span", { className: "rush-num num", children: score }), _jsx("span", { className: "muted small", children: "solved" })] }), remaining !== null && (_jsxs("div", { children: [_jsx("span", { className: `rush-num num${remaining < 15000 ? ' tone-text-blunder' : ''}`, children: formatClock(remaining) }), _jsx("span", { className: "muted small", children: "left" })] })), _jsx("div", { className: "strikes", "aria-label": `${strikes} strikes`, children: [0, 1, 2].map((i) => (_jsx("span", { className: `strike${i < strikes ? ' is-on' : ''}`, children: "\u2715" }, i))) })] }), _jsx("div", { className: "rush-log", children: log.map((l, i) => (_jsx("span", { className: `recent-dot ${l.ok ? 'ok' : 'bad'}`, title: `${l.p.rating}`, children: l.ok ? '✓' : '✕' }, i))) }), phase === 'over' && (_jsxs("div", { className: "panel stack", children: [_jsx("h2", { children: score > best ? 'New best!' : `Score: ${score}` }), _jsx("p", { className: "muted", children: log.filter((l) => !l.ok).length
                                            ? 'The puzzles you missed:'
                                            : 'Clean run.' }), _jsx("ul", { className: "bullets small", children: log
                                            .filter((l) => !l.ok)
                                            .map((l) => (_jsxs("li", { children: [l.p.themes.map((t) => THEME_INFO[t]?.label).filter(Boolean).slice(0, 2).join(', ') || 'Tactic', " (", l.p.rating, "): ", _jsx("span", { className: "muted", children: solutionLine(l.p) })] }, l.p.id))) }), _jsxs("div", { className: "row", children: [_jsx(Button, { icon: _jsx(RotateCcw, { size: 16 }), onClick: start, children: "Again" }), _jsx(Button, { variant: "secondary", onClick: () => navigate('/puzzles'), children: "Puzzles" })] })] }))] })] }))] }));
}
