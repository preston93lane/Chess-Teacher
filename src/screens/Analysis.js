import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, RefreshCw, Microscope, Swords, BookmarkPlus, Trash2, Download, X, FileInput, Gauge, RotateCcw, ArrowRight, } from 'lucide-react';
import { Chess, START_FEN, formatLine, uciOf } from '../lib/chess/core';
import { parsePgn, parseMovetext, toPgn } from '../lib/chess/pgn';
import { loadGameBody, saveReview, deleteGameBody } from '../lib/store/gamesDb';
import { useApp } from '../lib/store/app';
import { reviewGame, puzzleCandidates } from '../lib/coach/review';
import { reviewMove, CLASS_INFO } from '../lib/coach/explain';
import { lineScore } from '../lib/coach/eval';
import { engine, CancelledError } from '../lib/engine/stockfish';
import { navigate, query, useRoute } from '../lib/router';
import { useAnalysis, useArrowKeys } from '../lib/hooks';
import { soundForSan } from '../lib/sound';
import { Board } from '../components/Board';
import { EvalBar } from '../components/EvalBar';
import { EvalGraph } from '../components/EvalGraph';
import { FollowUpPanel } from '../components/FollowUp';
import { MoveList } from '../components/MoveList';
import { MasterMoves } from '../components/MasterMoves';
import { retryCandidates } from './RetryMistakes';
import { VerdictCard, EngineLines, PositionReportView } from '../components/Coach';
import { InsightsPanel } from '../components/Insights';
import { MoveBreakdown } from '../components/MoveBreakdown';
import { Button, Glyph, Header, IconButton, Meter, Segmented, Sheet, Spinner, Toggle } from '../components/ui';
import { toast } from '../components/Toast';
import { getOpening } from '../lib/openings/book';
export function AnalysisScreen({ gameId }) {
    const path = useRoute();
    const q = query(path);
    const [source, setSource] = useState(null);
    const [missing, setMissing] = useState(false);
    useEffect(() => {
        let alive = true;
        if (gameId) {
            loadGameBody(gameId).then((g) => {
                if (!alive)
                    return;
                if (!g)
                    setMissing(true);
                else
                    setSource({ startFen: g.startFen, sans: g.sans, headers: g.headers, stored: g });
            });
        }
        else {
            const fen = q.get('fen');
            const moves = q.get('moves');
            let startFen = START_FEN;
            let sans = [];
            try {
                if (fen)
                    startFen = new Chess(fen).fen();
                if (moves) {
                    const c = new Chess(startFen);
                    for (const m of parseMovetext(moves).sans)
                        sans.push(c.move(m.san).san);
                }
            }
            catch {
                sans = [];
            }
            setSource({ startFen, sans, headers: {} });
        }
        return () => {
            alive = false;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [gameId]);
    if (missing)
        return _jsx("div", { className: "page", children: _jsx(Header, { title: "Game not found", backTo: "/games" }) });
    if (!source)
        return _jsx("div", { className: "page", children: _jsx(Spinner, { label: "Loading game\u2026" }) });
    return _jsx(AnalysisView, { gameId: gameId, source: source, autoReview: q.get('auto') === '1' }, gameId ?? 'free');
}
function AnalysisView({ gameId, source, autoReview }) {
    const meta = useApp((s) => s.games.find((g) => g.id === gameId));
    const updateGame = useApp((s) => s.updateGame);
    const removeGame = useApp((s) => s.removeGame);
    const addPuzzle = useApp((s) => s.addPuzzle);
    const markPlanStep = useApp((s) => s.markPlanStep);
    const settings = useApp((s) => s.settings);
    const updateSettings = useApp((s) => s.updateSettings);
    const [breakdown, setBreakdown] = useState(null);
    const [marks, setMarks] = useState([]);
    const [showStructure, setShowStructure] = useState(false);
    const free = !gameId;
    const [mainline, setMainline] = useState(source.sans);
    const [startFen, setStartFen] = useState(source.startFen);
    const [ply, setPly] = useState(free ? source.sans.length : 0);
    const [explore, setExplore] = useState(null);
    const [review, setReview] = useState(source.stored?.review ?? null);
    const [progress, setProgress] = useState(null);
    const [tab, setTab] = useState(source.stored?.review ? 'summary' : 'coach');
    const [orientation, setOrientation] = useState(meta?.myColor ?? 'w');
    const [engineOn, setEngineOn] = useState(true);
    const [showBetter, setShowBetter] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState(false);
    const [loadOpen, setLoadOpen] = useState(false);
    const [walk, setWalk] = useState(null);
    const cancelRef = useRef(null);
    const myColor = meta?.myColor ?? null;
    const { fens, moves } = useMemo(() => {
        const c = new Chess(startFen);
        const f = [c.fen()];
        const mv = [];
        for (const s of mainline) {
            const m = c.move(s);
            f.push(c.fen());
            mv.push({ from: m.from, to: m.to });
        }
        return { fens: f, moves: mv };
    }, [startFen, mainline]);
    const exploreFens = useMemo(() => {
        if (!explore)
            return null;
        const c = new Chess(fens[explore.base]);
        const f = [];
        const mv = [];
        for (const s of explore.sans) {
            const m = c.move(s);
            f.push(c.fen());
            mv.push({ from: m.from, to: m.to });
        }
        return { fens: f, moves: mv };
    }, [explore, fens]);
    const fen = explore && exploreFens?.fens.length ? exploreFens.fens[exploreFens.fens.length - 1] : fens[ply];
    const lastMove = explore && exploreFens?.moves.length ? exploreFens.moves[exploreFens.moves.length - 1] : ply > 0 ? moves[ply - 1] : null;
    const { result: live } = useAnalysis(fen, { enabled: engineOn, multipv: 3, depth: 18 });
    // ---- full game review ----
    const runReview = useCallback(async () => {
        if (progress)
            return;
        cancelRef.current = { cancelled: false };
        setProgress({ done: 0, total: mainline.length + 1 });
        setEngineOn(false);
        engine.cancelAll();
        try {
            const r = await reviewGame(mainline, {
                startFen,
                depth: settings.analysisDepth,
                signal: cancelRef.current,
                onProgress: (p) => setProgress({ done: p.done, total: p.total, verifying: p.verifying }),
            });
            setReview(r);
            setTab('summary');
            if (gameId) {
                await saveReview(gameId, r);
                const mine = myColor;
                updateGame(gameId, {
                    reviewed: true,
                    accuracy: r.accuracy,
                    mistakes: mine ? (r.counts[mine].mistake ?? 0) + (r.counts[mine].miss ?? 0) : undefined,
                    blunders: mine ? r.counts[mine].blunder ?? 0 : undefined,
                    opening: meta?.opening ?? r.opening?.name,
                    eco: meta?.eco ?? r.opening?.eco,
                });
                markPlanStep(`analyse:${gameId}`);
                if (mine) {
                    let added = 0;
                    for (const m of puzzleCandidates(r, mine)) {
                        const ok = addPuzzle({
                            id: `pz:${gameId}:${m.ply}`,
                            fen: m.fenBefore,
                            solution: (m.bestLine ?? []).length ? uciLine(m.fenBefore, m.bestLine) : [m.bestUci],
                            played: m.uci,
                            gameId,
                            ply: m.ply,
                            title: `${Math.floor(m.ply / 2) + 1}${m.color === 'w' ? '.' : '…'}${m.san} — ${CLASS_INFO[m.cls].label.toLowerCase()}`,
                            note: m.headline,
                            tags: m.tags,
                        });
                        if (ok)
                            added++;
                    }
                    if (added)
                        toast(`${added} position${added > 1 ? 's' : ''} from this game added to your review deck.`, 3600);
                }
            }
        }
        catch (e) {
            if (!(e instanceof CancelledError) && e.message !== 'cancelled')
                toast('Review stopped.');
        }
        finally {
            setProgress(null);
            setEngineOn(true);
        }
    }, [progress, mainline, startFen, settings.analysisDepth, gameId, myColor, updateGame, meta, addPuzzle, markPlanStep]);
    useEffect(() => {
        if (autoReview && !review && mainline.length > 0)
            void runReview();
        return () => {
            if (cancelRef.current)
                cancelRef.current.cancelled = true;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    // ---- moves on the board ----
    const onMove = async (mv) => {
        const c = new Chess(fen);
        let m;
        try {
            m = c.move(mv);
        }
        catch {
            return;
        }
        soundForSan(m.san);
        setShowBetter(false);
        if (free && !explore) {
            setMainline([...mainline.slice(0, ply), m.san]);
            setPly(ply + 1);
            return;
        }
        // If it matches the game continuation, just step forward.
        if (!explore && mainline[ply] === m.san) {
            setPly(ply + 1);
            return;
        }
        const base = explore ? explore.base : ply;
        const prev = explore ? explore.sans : [];
        const fenBefore = fen;
        const idx = prev.length;
        const next = { base, sans: [...prev, m.san], reviews: [...(explore?.reviews ?? []), null] };
        setExplore(next);
        setTab('coach');
        // Coach comment on the explored move
        try {
            const before = live && live.fen === fenBefore ? live : await engine.analyze(fenBefore, { depth: 14, multipv: 3 });
            const after = await engine.analyze(c.fen(), { depth: 14 });
            const r = reviewMove({ ply: base + idx, fenBefore, uci: uciOf(m), before: before.lines, after: after.lines[0] });
            setExplore((cur) => {
                if (!cur || cur.sans.length <= idx || cur.sans[idx] !== m.san)
                    return cur;
                const reviews = [...cur.reviews];
                reviews[idx] = r;
                return { ...cur, reviews };
            });
        }
        catch {
            /* cancelled */
        }
    };
    useEffect(() => setMarks([]), [fen]);
    const go = (p) => {
        setExplore(null);
        setShowBetter(false);
        setPly(Math.max(0, Math.min(mainline.length, p)));
    };
    useArrowKeys({
        left: () => (explore ? setExplore(explore.sans.length > 1 ? { ...explore, sans: explore.sans.slice(0, -1), reviews: explore.reviews.slice(0, -1) } : null) : go(ply - 1)),
        right: () => go(ply + 1),
        up: () => go(0),
        down: () => go(mainline.length),
    });
    const currentReview = explore
        ? explore.reviews[explore.reviews.length - 1] ?? null
        : review && ply > 0
            ? review.moves[ply - 1]
            : null;
    // After a less accurate move, the best move is drawn automatically; tap it to walk through why.
    const missedBest = currentReview && currentReview.bestUci && currentReview.bestUci !== currentReview.uci && WORSE.includes(currentReview.cls) ? currentReview : null;
    const arrows = [];
    if ((showBetter || missedBest) && currentReview?.bestUci)
        arrows.push({ from: currentReview.bestUci.slice(0, 2), to: currentReview.bestUci.slice(2, 4), color: 'y', onClick: () => setWalk(currentReview) });
    else if (settings.showEval && engineOn && live?.lines[0] && !progress)
        arrows.push({ from: live.lines[0].pv[0].slice(0, 2), to: live.lines[0].pv[0].slice(2, 4), color: 'b' });
    const badge = currentReview && lastMove ? { sq: lastMove.to, cls: currentReview.cls } : null;
    const evalScore = live && live.fen === fen ? lineScore(live.lines[0]) : !explore && review ? review.evals[ply] : undefined;
    const sideToMove = fen.split(' ')[1];
    const savePuzzle = () => {
        const best = live?.fen === fen ? live.lines[0] : null;
        if (!best) {
            toast('Wait for the engine to finish thinking first.');
            return;
        }
        const ok = addPuzzle({
            id: `pz:manual:${fen}`,
            fen,
            solution: best.pv.slice(0, 6),
            played: '',
            title: `Saved position · ${sideToMove === 'w' ? 'White' : 'Black'} to move`,
            note: source.headers.White ? `${source.headers.White} vs ${source.headers.Black}` : undefined,
            tags: ['saved'],
        });
        toast(ok ? 'Saved to your review deck.' : 'Already in your review deck.');
    };
    const exportPgn = async () => {
        const pgn = toPgn({
            headers: { Event: '?', ...source.headers },
            startFen,
            sans: mainline,
            comments: review ? Object.fromEntries(review.moves.filter((m) => m.cls !== 'book' && m.cls !== 'best' && m.cls !== 'excellent' && m.cls !== 'good').map((m) => [m.ply, `${CLASS_INFO[m.cls].glyph} ${m.headline}${m.better ? ` ${m.better}` : ''}`])) : undefined,
        });
        try {
            await navigator.clipboard.writeText(pgn);
            toast('PGN copied to clipboard.');
        }
        catch {
            const blob = new Blob([pgn], { type: 'application/x-chess-pgn' });
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = 'game.pgn';
            a.click();
        }
    };
    const title = free ? 'Analysis board' : `${source.headers.White ?? 'White'} vs ${source.headers.Black ?? 'Black'}`;
    const sub = free
        ? 'Move pieces freely. The engine and coach follow along.'
        : [meta?.opening ?? review?.opening?.name, source.headers.Result, source.headers.Date?.replace(/\?/g, '').replace(/\.+$/, '')].filter(Boolean).join(' · ');
    const atEnd = !explore && ply >= mainline.length;
    const stepBack = () => explore ? setExplore(explore.sans.length > 1 ? { ...explore, sans: explore.sans.slice(0, -1), reviews: explore.reviews.slice(0, -1) } : null) : go(ply - 1);
    const stepForward = () => go(ply + 1);
    return (_jsxs("div", { className: "page board-screen-page", children: [_jsx(Header, { title: title, backTo: free ? '/' : '/games', sub: sub, actions: _jsxs(_Fragment, { children: [free && (_jsx(IconButton, { label: "Load position or PGN", onClick: () => setLoadOpen(true), children: _jsx(FileInput, { size: 20 }) })), _jsx(IconButton, { label: settings.showEval ? 'Hide evaluation' : 'Show evaluation', onClick: () => updateSettings({ showEval: !settings.showEval }), className: settings.showEval ? 'is-on' : '', children: _jsx(Gauge, { size: 20 }) }), _jsx(IconButton, { label: "Export PGN", onClick: exportPgn, children: _jsx(Download, { size: 20 }) }), !free && (_jsx(IconButton, { label: "Delete game", onClick: () => setConfirmDelete(true), children: _jsx(Trash2, { size: 20 }) }))] }) }), _jsxs("div", { className: "board-screen", children: [_jsxs("div", { className: "board-col", children: [_jsxs("div", { className: "board-wrap", children: [settings.showEval && _jsx(EvalBar, { score: evalScore, orientation: orientation, pending: !evalScore }), _jsx("div", { className: "board-holder", children: _jsx(Board, { fen: fen, orientation: orientation, movable: "both", onMove: onMove, lastMove: lastMove ? [lastMove.from, lastMove.to] : null, arrows: arrows, badge: badge, marks: marks }) })] }), _jsxs("div", { className: "controls", children: [_jsxs("div", { className: "controls-group", children: [_jsx(IconButton, { label: "Flip board", onClick: () => setOrientation(orientation === 'w' ? 'b' : 'w'), children: _jsx(RefreshCw, {}) }), _jsx(IconButton, { label: "Save position to review deck", onClick: savePuzzle, children: _jsx(BookmarkPlus, {}) }), _jsx(IconButton, { label: "Practice from here", onClick: () => navigate(`/play?fen=${encodeURIComponent(fen)}&side=${sideToMove}`), children: _jsx(Swords, {}) })] }), _jsxs("div", { className: "controls-group", children: [_jsx(IconButton, { label: "Start", onClick: () => go(0), children: _jsx(ChevronsLeft, {}) }), _jsx(IconButton, { label: "Previous", className: "step-inline", onClick: stepBack, children: _jsx(ChevronLeft, {}) }), _jsx(IconButton, { label: "Next", className: "step-inline", onClick: stepForward, disabled: atEnd, children: _jsx(ChevronRight, {}) }), _jsx(IconButton, { label: "End", onClick: () => go(mainline.length), children: _jsx(ChevronsRight, {}) })] })] }), _jsxs("div", { className: "step-pill mobile-only", role: "group", "aria-label": "Step through the game", children: [_jsx("button", { className: "step-btn", "aria-label": "Previous move", onClick: stepBack, children: _jsx(ChevronLeft, { size: 24 }) }), _jsx("button", { className: "step-btn step-next", "aria-label": "Next move", onClick: stepForward, disabled: atEnd, children: _jsx(ChevronRight, { size: 28 }) })] }), explore && (_jsxs("div", { className: "explore-bar", children: [_jsxs("span", { className: "muted small", children: ["Exploring: ", formatLine(fens[explore.base], explore.sans)] }), _jsxs("button", { className: "link-btn small", onClick: () => setExplore(null), children: [_jsx(X, { size: 14 }), " Back to game"] })] })), tab === 'coach' && currentReview && (_jsxs("div", { className: `move-rank tone-${CLASS_INFO[currentReview.cls].tone}`, children: [_jsx("span", { className: `move-rank-glyph tone-text-${CLASS_INFO[currentReview.cls].tone}`, children: CLASS_INFO[currentReview.cls].glyph || '•' }), _jsxs("span", { className: "move-rank-text", children: [_jsx("strong", { className: "num", children: currentReview.san }), _jsxs("span", { className: `tone-text-${CLASS_INFO[currentReview.cls].tone}`, children: [" ", CLASS_INFO[currentReview.cls].label] })] }), currentReview.bestSan && currentReview.bestUci !== currentReview.uci ? (_jsxs("button", { className: "move-rank-best", onClick: () => setWalk(currentReview), children: ["Best ", _jsx("strong", { className: "num", children: currentReview.bestSan }), " ", _jsx(ChevronRight, { size: 16 })] })) : (_jsx("span", { className: "muted small", children: "Best move" }))] })), review && mainline.length > 0 && (_jsx(EvalGraph, { evals: review.evals, moves: review.moves, current: ply, onSelect: go }))] }), _jsxs("div", { className: "side-col", children: [!free && !review && (_jsx("div", { className: "panel stack review-cta", children: progress ? (_jsxs(_Fragment, { children: [_jsx("h3", { children: "Coach is reviewing the game\u2026" }), _jsx(Meter, { value: progress.verifying ? progress.verifying.done : progress.done, max: progress.verifying ? progress.verifying.total : progress.total }), _jsx("p", { className: "muted small num", children: progress.verifying
                                                ? `Double-checking critical moments deeper: ${progress.verifying.done} of ${progress.verifying.total}`
                                                : `${progress.done} of ${progress.total} positions analysed` }), _jsx(Button, { variant: "ghost", size: "sm", onClick: () => cancelRef.current && (cancelRef.current.cancelled = true), children: "Stop" })] })) : (_jsxs(_Fragment, { children: [_jsx("h3", { children: "Review this game with the coach" }), _jsx("p", { className: "muted", children: "Every move gets graded and explained. Your mistakes become positions in your review deck." }), !myColor && _jsx(SidePicker, { gameId: gameId, headers: source.headers }), _jsx(Button, { icon: _jsx(Microscope, { size: 16 }), onClick: runReview, children: "Run coach review" })] })) })), _jsx("div", { className: "tabs", role: "tablist", children: ['coach', 'summary', 'moves', 'masters', 'engine']
                                    .filter((t) => t !== 'summary' || review)
                                    .map((t) => (_jsx("button", { role: "tab", "aria-selected": tab === t, className: `tab${tab === t ? ' is-on' : ''}`, onClick: () => setTab(t), children: t === 'coach' ? 'Coach' : t === 'summary' ? 'Summary' : t === 'moves' ? 'Moves' : t === 'masters' ? 'Masters' : 'Engine' }, t))) }), tab === 'coach' && (_jsxs("div", { className: "stack", children: [currentReview ? (_jsx(VerdictCard, { review: currentReview, onShowBetter: currentReview.better ? () => setShowBetter(!showBetter) : undefined, showingBetter: showBetter, showEval: settings.showEval, onBreakdown: () => setBreakdown({ fenBefore: currentReview.fenBefore, uci: currentReview.uci }) })) : explore ? (_jsx("div", { className: "panel panel-tight", children: _jsx(Spinner, { label: "Coach is looking at that move\u2026" }) })) : null, _jsx("div", { className: "panel", children: _jsx(InsightsPanel, { fen: fen, forColor: sideToMove, deep: !!(live && live.fen === fen && live.depth >= 12 && live.lines.length >= 2) && !progress, lines: live && live.fen === fen ? live.lines : null, title: `${sideToMove === 'w' ? 'White' : 'Black'} to move — what matters`, onMarks: setMarks }, fen) }), _jsx("button", { className: "link-btn", onClick: () => setShowStructure(!showStructure), children: showStructure ? 'Hide structure & plans' : 'Structure & long-term plans' }), showStructure && (_jsx("div", { className: "panel", children: _jsx(PositionReportView, { fen: fen, forColor: sideToMove }) }))] })), tab === 'moves' && (_jsx(MoveList, { moves: mainline.map((san, i) => ({ san, cls: review?.moves[i]?.cls })), current: explore ? explore.base : ply, onSelect: go, startMoveNumber: parseInt(startFen.split(' ')[5] || '1', 10), startColor: startFen.split(' ')[1] })), tab === 'engine' && (_jsxs("div", { className: "stack", children: [_jsx(Toggle, { checked: engineOn, onChange: setEngineOn, label: "Engine lines", hint: "Stockfish 18, running on this device." }), engineOn && (_jsx(EngineLines, { fen: fen, result: live?.fen === fen ? live : null, onPlay: (u) => onMove({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] || undefined }) }))] })), tab === 'masters' && (_jsx("div", { className: "panel", children: _jsx(MasterMoves, { fen: fen, showGames: false, onPlay: (san) => {
                                        try {
                                            const m = new Chess(fen).move(san);
                                            onMove({ from: m.from, to: m.to, promotion: m.promotion });
                                        }
                                        catch {
                                            /* not legal here */
                                        }
                                    } }) })), tab === 'summary' && review && _jsx(ReviewSummary, { review: review, myColor: myColor, onJump: (p) => { go(p); setTab('coach'); }, gameId: gameId })] })] }), _jsx(Sheet, { open: !!walk, onClose: () => setWalk(null), title: walk ? `Why ${walk.bestSan} was best` : '', children: walk?.bestUci && _jsx(FollowUpPanel, { fen: walk.fenBefore, uci: walk.bestUci, tried: [walk.uci], title: `${walk.bestSan} instead of ${walk.san}` }) }), _jsxs(Sheet, { open: confirmDelete, onClose: () => setConfirmDelete(false), title: "Delete this game?", children: [_jsx("p", { className: "muted", children: "The game and its review are removed from this device. Review cards made from it stay in your deck." }), _jsxs("div", { className: "row mt16", children: [_jsx(Button, { variant: "danger", icon: _jsx(Trash2, { size: 16 }), onClick: async () => {
                                    await deleteGameBody(gameId);
                                    removeGame(gameId);
                                    navigate('/games', true);
                                }, children: "Delete game" }), _jsx(Button, { variant: "ghost", onClick: () => setConfirmDelete(false), children: "Cancel" })] })] }), breakdown && (_jsx(MoveBreakdown, { fenBefore: breakdown.fenBefore, uci: breakdown.uci, depth: settings.analysisDepth, showEval: settings.showEval, onClose: () => setBreakdown(null) })), _jsx(LoadSheet, { open: loadOpen, onClose: () => setLoadOpen(false), onLoad: (f, s) => {
                    setStartFen(f);
                    setMainline(s);
                    setExplore(null);
                    setPly(s.length);
                    setLoadOpen(false);
                } })] }));
}
function uciLine(fen, sans) {
    const c = new Chess(fen);
    const out = [];
    for (const s of sans) {
        try {
            out.push(uciOf(c.move(s)));
        }
        catch {
            break;
        }
    }
    return out;
}
const WORSE = ['inaccuracy', 'mistake', 'miss', 'blunder'];
const SUMMARY_CLASSES = ['brilliant', 'great', 'best', 'excellent', 'good', 'book', 'inaccuracy', 'mistake', 'miss', 'blunder'];
function ReviewSummary({ review, myColor, onJump, gameId }) {
    const openingId = useMemo(() => {
        const name = review.opening?.name?.toLowerCase() ?? '';
        const map = [
            ['najdorf', 'najdorf'], ['dragon', 'dragon'], ['french', 'french'], ['caro-kann', 'caro-kann'], ['ruy lopez', 'ruy-lopez'],
            ['italian', 'italian'], ['giuoco', 'italian'], ["queen's gambit", 'queens-gambit'], ['london', 'london'], ['catalan', 'catalan'],
            ['english', 'english'], ["king's indian", 'kings-indian'], ['nimzo', 'nimzo-indian'], ['grünfeld', 'grunfeld'], ['grunfeld', 'grunfeld'], ['slav', 'slav'],
        ];
        return map.find(([k]) => name.includes(k))?.[1];
    }, [review]);
    const opening = openingId ? getOpening(openingId) : undefined;
    const cards = useApp((s) => s.cards);
    const fromGame = gameId ? Object.values(cards).filter((c) => c.kind === 'puzzle' && c.gameId === gameId).length : 0;
    return (_jsxs("div", { className: "stack", children: [_jsx("div", { className: "acc-row", children: ['w', 'b'].map((c) => (_jsxs("div", { className: `acc-card${myColor === c ? ' is-me' : ''}`, children: [_jsxs("span", { className: "acc-side", children: [_jsx("span", { className: `pill-color pill-${c}` }), " ", c === 'w' ? 'White' : 'Black', myColor === c ? ' (you)' : ''] }), _jsx("span", { className: "acc-value num", children: review.accuracy[c].toFixed(1) }), _jsx("span", { className: "acc-label", children: "accuracy" })] }, c))) }), myColor && gameId && retryCandidates(review.moves, myColor).length > 0 && (_jsxs("button", { className: "retry-cta", onClick: () => navigate(`/games/${gameId}/retry`), children: [_jsx(RotateCcw, { size: 20 }), _jsxs("span", { children: [_jsx("strong", { children: "Retry your mistakes" }), _jsxs("span", { className: "muted small", children: ["Replay the ", retryCandidates(review.moves, myColor).length, " position", retryCandidates(review.moves, myColor).length === 1 ? '' : 's', " where you went wrong and find the better move."] })] }), _jsx(ArrowRight, { size: 18 })] })), review.summary.length > 0 && (_jsx("div", { className: "panel prose", children: review.summary.map((s, i) => _jsx("p", { children: s }, i)) })), _jsxs("table", { className: "class-table", children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", {}), _jsx("th", { children: "White" }), _jsx("th", { children: "Black" })] }) }), _jsx("tbody", { children: SUMMARY_CLASSES.map((cls) => (_jsxs("tr", { children: [_jsxs("td", { children: [_jsx(Glyph, { cls: cls, size: "sm" }), " ", CLASS_INFO[cls].label] }), _jsx("td", { className: "num", children: review.counts.w[cls] ?? 0 }), _jsx("td", { className: "num", children: review.counts.b[cls] ?? 0 })] }, cls))) })] }), myColor && (_jsxs("div", { className: "panel panel-tight", children: [_jsx("h4", { children: "Your accuracy by phase" }), _jsx("div", { className: "phase-bars mt8", children: ['opening', 'middlegame', 'endgame'].map((ph) => {
                            const v = review.phaseAccuracy[myColor][ph];
                            return (_jsxs("div", { className: "phase-bar", children: [_jsx("span", { className: "phase-name", children: ph[0].toUpperCase() + ph.slice(1) }), v !== undefined ? _jsx(Meter, { value: v }) : _jsx("span", { className: "faint small", children: "\u2014" }), _jsx("span", { className: "num small", children: v ?? '' })] }, ph));
                        }) })] })), review.keyMoments.length > 0 && (_jsxs("div", { className: "panel panel-tight", children: [_jsx("h4", { children: "Key moments" }), _jsx("div", { className: "list mt8", children: review.keyMoments.map((p) => {
                            const m = review.moves[p];
                            return (_jsxs("button", { className: "list-item", onClick: () => onJump(p + 1), children: [_jsx(Glyph, { cls: m.cls }), _jsxs("span", { className: "list-item-main", children: [_jsxs("span", { className: "list-item-title", children: [Math.floor(p / 2) + 1, m.color === 'w' ? '.' : '…', m.san] }), _jsx("span", { className: "list-item-sub", children: m.headline })] })] }, p));
                        }) })] })), _jsxs("div", { className: "panel panel-tight", children: [_jsx("h4", { children: "Turn this game into training" }), _jsxs("ul", { className: "bullets mt8", children: [fromGame > 0 && _jsxs("li", { children: [fromGame, " position", fromGame > 1 ? 's' : '', " from this game ", fromGame > 1 ? 'are' : 'is', " in your review deck."] }), opening && (_jsxs("li", { children: ["Opening: ", _jsxs("button", { className: "link-btn", onClick: () => navigate(`/openings/${opening.id}`), children: ["study the ", opening.name] }), " \u2014 theory lasted ", Math.ceil(review.bookPly / 2), " moves."] })), _jsx("li", { children: _jsx("button", { className: "link-btn", onClick: () => navigate('/train/review?kind=puzzle'), children: "Solve your mistakes now" }) })] })] })] }));
}
function SidePicker({ gameId, headers }) {
    const updateGame = useApp((s) => s.updateGame);
    const meta = useApp((s) => s.games.find((g) => g.id === gameId));
    const [v, setV] = useState(meta?.myColor ?? 'none');
    return (_jsxs("div", { className: "field", children: [_jsx("span", { className: "field-label", children: "Which side were you? (so the coach can build your review cards)" }), _jsx(Segmented, { value: v, onChange: (x) => {
                    setV(x);
                    updateGame(gameId, { myColor: x === 'none' ? null : x });
                }, options: [
                    { value: 'w', label: headers.White ?? 'White' },
                    { value: 'b', label: headers.Black ?? 'Black' },
                    { value: 'none', label: 'Neither' },
                ] })] }));
}
function LoadSheet({ open, onClose, onLoad }) {
    const [text, setText] = useState('');
    const [err, setErr] = useState(null);
    const load = () => {
        const t = text.trim();
        if (!t)
            return;
        try {
            const fen = new Chess(t).fen();
            onLoad(fen, []);
            return;
        }
        catch {
            /* not a FEN */
        }
        const g = parsePgn(t);
        if (!g.moves.length) {
            setErr('Could not read that as a FEN or PGN.');
            return;
        }
        onLoad(g.startFen, g.moves.map((m) => m.san));
    };
    return (_jsxs(Sheet, { open: open, onClose: onClose, title: "Load a position", children: [_jsxs("label", { className: "field", children: [_jsx("span", { className: "field-label", children: "Paste a FEN or PGN" }), _jsx("textarea", { className: "textarea", value: text, onChange: (e) => { setText(e.target.value); setErr(null); } })] }), err && _jsx("p", { className: "error-text", children: err }), _jsxs("div", { className: "row mt12", children: [_jsx(Button, { onClick: load, children: "Load" }), _jsx(Button, { variant: "ghost", onClick: () => onLoad(START_FEN, []), children: "Reset to start" })] })] }));
}
