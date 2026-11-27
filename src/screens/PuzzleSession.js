import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowRight, Eye, Lightbulb, RotateCcw, ScanSearch } from 'lucide-react';
import { applyUci } from '../lib/chess/core';
import { dailyPuzzle, isMaster, pickPuzzle, puzzleStart, THEME_INFO, updateRating } from '../lib/puzzles';
import { describeMove } from '../lib/coach/explain';
import { lineOutcome, materialPhrase } from '../lib/coach/tactics';
import { useApp } from '../lib/store/app';
import { navigate, query, useRoute } from '../lib/router';
import { Button, Header, Spinner, NextDock } from '../components/ui';
import { PuzzleSolver, solutionLine } from '../components/PuzzleSolver';
import { FollowUpPanel } from '../components/FollowUp';
import { MoveBreakdown } from '../components/MoveBreakdown';
import { usePuzzleDb } from './Puzzles';
import { getOpening } from '../lib/openings/book';
import { toast } from '../components/Toast';
import { BlockBanner, completeBlock } from '../components/BlockBanner';
function coachLine(p) {
    const s = puzzleStart(p);
    const key = p.moves[1];
    const mv = applyUci(s.fen, key);
    if (!mv)
        return '';
    const out = lineOutcome(s.fen, p.moves.slice(1));
    const desc = describeMove(s.fen, mv.move)[0] ?? '';
    if (out.mateFor === s.side)
        return `${mv.move.san} forces mate${out.mateIn ? ` in ${out.mateIn}` : ''}. ${desc}`;
    const phrase = out.material >= 1 ? materialPhrase(out.lost[s.side === 'w' ? 'b' : 'w'], out.lost[s.side], out.material) : null;
    return `${mv.move.san}${phrase ? ` ${phrase}` : ''}. ${desc}`.trim();
}
export function PuzzleSession() {
    const path = useRoute();
    const q = query(path);
    const mode = q.get('mode') ?? 'rated';
    const theme = q.get('theme') ?? '';
    const openingId = q.get('id') ?? '';
    const mixThemes = (q.get('themes') ?? '').split(',').filter(Boolean);
    const target = +(q.get('count') ?? 0);
    const blockId = q.get('block');
    const [solvedInSet, setSolvedInSet] = useState(0);
    const { db } = usePuzzleDb();
    const ps = useApp((s) => s.puzzles);
    const record = useApp((s) => s.recordPuzzle);
    const addPuzzle = useApp((s) => s.addPuzzle);
    const settings = useApp((s) => s.settings);
    const [puzzle, setPuzzle] = useState(null);
    const [result, setResult] = useState(null);
    const [attempt, setAttempt] = useState(0);
    const [showSolution, setShowSolution] = useState(false);
    const [hint, setHint] = useState(false);
    const [breakdown, setBreakdown] = useState(false);
    const [streak, setStreak] = useState(0);
    const rated = mode !== 'daily';
    const filter = useMemo(() => {
        if (mode === 'theme')
            return (p) => p.themes.includes(theme);
        if (mode === 'opening')
            return (p) => p.opening === openingId;
        if (mode === 'master')
            return isMaster;
        if (mode === 'mix')
            return (p) => mixThemes.some((t) => (t.startsWith('opening:') ? p.opening === t.slice(8) : p.themes.includes(t)));
        return undefined;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [mode, theme, openingId, q.get('themes')]);
    const next = useCallback(() => {
        if (!db)
            return;
        const st = useApp.getState().puzzles;
        const p = mode === 'daily' ? dailyPuzzle(db, st.rating) : pickPuzzle(db, { rating: st.rating, seen: new Set(st.seen), filter });
        setPuzzle(p ?? null);
        setResult(null);
        setAttempt(0);
        setShowSolution(false);
        setHint(false);
    }, [db, mode, filter]);
    useEffect(() => {
        if (db && !puzzle)
            next();
    }, [db, puzzle, next]);
    const onResult = (r) => {
        if (!puzzle)
            return;
        let delta;
        if (attempt === 0) {
            const scored = rated && !hint;
            const newRating = scored ? updateRating(ps.rating, puzzle.rating, r.ok, ps.attempts) : ps.rating;
            delta = scored ? newRating - ps.rating : undefined;
            record({ id: puzzle.id, puzzleRating: puzzle.rating, ok: r.ok, rated: scored, newRating, daily: mode === 'daily', themes: puzzle.themes });
            setStreak(r.ok ? streak + 1 : 0);
            if (!r.ok) {
                const s = puzzleStart(puzzle);
                addPuzzle({
                    id: `pz:lichess:${puzzle.id}`,
                    fen: s.fen,
                    solution: puzzle.moves.slice(1),
                    played: r.wrong ?? '',
                    title: `${puzzle.themes.map((t) => THEME_INFO[t]?.label).filter(Boolean)[0] ?? 'Tactic'} · rated ${puzzle.rating}`,
                    note: 'A puzzle you missed — it comes back until it sticks.',
                    tags: puzzle.themes,
                });
            }
        }
        setResult({ ...r, delta });
        if (attempt === 0) {
            const n = solvedInSet + 1;
            setSolvedInSet(n);
            if (target && n >= target && completeBlock(blockId))
                toast('Block complete — nice work.');
        }
    };
    const retry = () => {
        setAttempt(attempt + 1);
        setResult(null);
        setShowSolution(false);
        const p = puzzle;
        setPuzzle(null);
        setTimeout(() => setPuzzle(p), 0);
    };
    if (!db || !puzzle) {
        return (_jsxs("div", { className: "page", children: [_jsx(Header, { title: "Puzzles", backTo: "/puzzles" }), _jsx(Spinner, { label: "Loading puzzles\u2026" })] }));
    }
    const start = puzzleStart(puzzle);
    const titles = {
        rated: 'Rated puzzles',
        daily: 'Daily puzzle',
        master: 'Master games',
        mix: 'Mixed tactics',
        theme: THEME_INFO[theme]?.label ?? 'Theme',
        opening: getOpening(openingId)?.name ?? 'Opening tactics',
    };
    const themeLabels = puzzle.themes.map((t) => THEME_INFO[t]?.label).filter(Boolean);
    const mate = puzzle.themes.find((t) => /^mateIn\d$/.test(t));
    return (_jsxs("div", { className: "page board-screen-page", children: [_jsx(Header, { title: titles[mode] ?? 'Puzzles', backTo: blockId ? '/program' : '/puzzles', sub: `Your rating ${ps.rating}${target ? ` · ${Math.min(solvedInSet, target)}/${target} in this set` : ''}${streak > 1 ? ` · streak ${streak}` : ''}` }), _jsx(BlockBanner, {}), _jsxs("div", { className: "board-screen", children: [_jsx("div", { className: "board-col", children: _jsx(PuzzleSolver, { puzzle: puzzle, onResult: onResult, showSolution: showSolution, hint: hint }, `${puzzle.id}-${attempt}`) }), _jsxs("div", { className: "side-col", children: [_jsx("div", { className: `puzzle-status ${result ? (result.ok ? 'is-ok' : 'is-bad') : ''}`, children: !result ? (_jsxs(_Fragment, { children: [_jsxs("p", { className: "puzzle-prompt", children: [_jsx("span", { className: `pill-color pill-${start.side}` }), " ", start.side === 'w' ? 'White' : 'Black', " to move"] }), _jsx("p", { className: "muted", children: mate ? `Find mate in ${mate.slice(-1)}.` : 'Find the best move.' }), mode !== 'rated' && mode !== 'daily' && _jsxs("p", { className: "faint small mt8", children: ["Rated ", puzzle.rating] })] })) : result.ok ? (_jsxs(_Fragment, { children: [_jsxs("p", { className: "puzzle-verdict", children: ["Solved", result.delta !== undefined ? _jsxs("span", { className: "num delta up", children: [" +", result.delta] }) : null] }), _jsx("p", { className: "muted", children: coachLine(puzzle) })] })) : (_jsxs(_Fragment, { children: [_jsxs("p", { className: "puzzle-verdict", children: ["Not the move", result.delta !== undefined ? _jsxs("span", { className: "num delta down", children: [" ", result.delta] }) : null] }), _jsxs("p", { className: "muted", children: [attempt === 0 ? 'Added to your review deck. ' : '', "Try again, or see the solution."] })] })) }), result && (_jsxs("div", { className: "panel panel-tight", children: [_jsxs("p", { className: "small", children: [_jsx("strong", { children: "Themes:" }), " ", themeLabels.join(', ') || '—', " \u00B7 rated ", puzzle.rating] }), (result.ok || showSolution) && _jsx("p", { className: "muted small mt8", children: solutionLine(puzzle) }), puzzle.opening && _jsxs("p", { className: "faint small mt8", children: ["From a game in the ", getOpening(puzzle.opening)?.name, "."] })] })), result && (result.ok || showSolution) && (_jsx(FollowUpPanel, { fen: start.fen, uci: puzzle.moves[1], line: puzzle.moves.slice(1), tried: result.wrong ? [result.wrong] : [] })), _jsxs("div", { className: "row", children: [!result && !hint && (_jsx(Button, { variant: "ghost", size: "sm", icon: _jsx(Lightbulb, { size: 16 }), onClick: () => setHint(true), children: "Hint (unrated)" })), result && !result.ok && (_jsxs(_Fragment, { children: [_jsx(Button, { variant: "secondary", icon: _jsx(RotateCcw, { size: 16 }), onClick: retry, children: "Retry" }), _jsx(Button, { variant: "ghost", icon: _jsx(Eye, { size: 16 }), onClick: () => setShowSolution(true), children: "Show solution" })] })), result && (_jsx(Button, { variant: "ghost", icon: _jsx(ScanSearch, { size: 16 }), onClick: () => setBreakdown(true), children: "Explain it" })), result && mode !== 'daily' && (_jsx(NextDock, { children: _jsx(Button, { icon: _jsx(ArrowRight, { size: 16 }), onClick: next, children: "Next puzzle" }) })), result && mode === 'daily' && (_jsx(Button, { onClick: () => { toast('See you tomorrow.'); navigate('/puzzles'); }, children: "Done" }))] })] })] }), breakdown && (_jsx(MoveBreakdown, { fenBefore: start.fen, uci: result?.ok || !result?.wrong ? puzzle.moves[1] : result.wrong, depth: settings.analysisDepth, showEval: settings.showEval, onClose: () => setBreakdown(false) }))] }));
}
