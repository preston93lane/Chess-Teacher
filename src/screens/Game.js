import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Flag, Handshake, Lightbulb, Microscope, Play, RefreshCw, Repeat, ScanSearch, SlidersHorizontal, Undo2, Eye, } from 'lucide-react';
import { Chess, applySan, uciOf } from '../lib/chess/core';
import { useSession } from '../lib/gameSession';
import { getBot, botMove } from '../lib/bots';
import { getStyle, styleBookMove } from '../lib/styles';
import { engine, CancelledError } from '../lib/engine/stockfish';
import { reviewMove, BAD_CLASSES } from '../lib/coach/explain';
import { lineScore, winPct } from '../lib/coach/eval';
import { getOpening, openingBookMoves, pickWeighted } from '../lib/openings/book';
import { openingFor } from '../lib/openings/eco';
import { useApp } from '../lib/store/app';
import { saveGameBody } from '../lib/store/gamesDb';
import { navigate } from '../lib/router';
import { soundForSan, playSound } from '../lib/sound';
import { useArrowKeys } from '../lib/hooks';
import { Board } from '../components/Board';
import { EvalBar } from '../components/EvalBar';
import { MoveList } from '../components/MoveList';
import { VerdictCard, HintPanel, PositionReportView } from '../components/Coach';
import { Button, Empty, Header, IconButton, Sheet, Spinner, Toggle } from '../components/ui';
import { InsightsPanel } from '../components/Insights';
import { MoveBreakdown } from '../components/MoveBreakdown';
import { toast } from '../components/Toast';
import { botThinkTime, formatClock, hasMatingMaterial, remainingNow, tcLabel, timePressure, } from '../lib/clock';
function chargeMove(clock, mover, tc, now = Date.now()) {
    const elapsed = clock.running === mover && clock.since ? now - clock.since : 0;
    const base = clock.running === mover ? clock[mover] - elapsed : clock[mover];
    return { ...clock, [mover]: Math.max(0, base) + tc.increment, running: null, since: null };
}
function pauseClock(clock, now = Date.now()) {
    if (!clock.running || !clock.since)
        return clock;
    return { ...clock, [clock.running]: clock[clock.running] - (now - clock.since), since: null };
}
function stopClock(clock, now = Date.now()) {
    return { ...pauseClock(clock, now), running: null };
}
function ClockFace({ ms, active, low }) {
    return _jsx("span", { className: `clock${active ? ' is-active' : ''}${low ? ' is-low' : ''}`, children: formatClock(ms) });
}
function replay(startFen, sans) {
    const c = new Chess(startFen);
    const fens = [c.fen()];
    const moves = [];
    for (const s of sans) {
        const m = c.move(s);
        fens.push(c.fen());
        moves.push({ from: m.from, to: m.to });
    }
    return { fens, moves };
}
function gameOverInfo(fen) {
    const c = new Chess(fen);
    if (c.isCheckmate())
        return { result: c.turn() === 'w' ? '0-1' : '1-0', reason: 'Checkmate' };
    if (c.isStalemate())
        return { result: '1/2-1/2', reason: 'Stalemate' };
    if (c.isInsufficientMaterial())
        return { result: '1/2-1/2', reason: 'Insufficient material' };
    if (c.isThreefoldRepetition())
        return { result: '1/2-1/2', reason: 'Threefold repetition' };
    if (c.isDraw())
        return { result: '1/2-1/2', reason: 'Fifty-move rule' };
    return null;
}
export function GameScreen() {
    const game = useSession((s) => s.game);
    if (!game) {
        return (_jsxs("div", { className: "page page-narrow", children: [_jsx(Header, { title: "No game in progress", backTo: "/play" }), _jsx(Empty, { title: "Start a game", action: _jsx(Button, { onClick: () => navigate('/play'), children: "Choose an opponent" }), children: "Play the coach from the standard position, an opening or any position you like." })] }));
    }
    return _jsx(LiveGameView, { game: game });
}
function LiveGameView({ game }) {
    const patch = useSession((s) => s.patch);
    const setGame = useSession((s) => s.setGame);
    const settings = useApp((s) => s.settings);
    const addGame = useApp((s) => s.addGame);
    const logActivity = useApp((s) => s.logActivity);
    const markPlanStep = useApp((s) => s.markPlanStep);
    const updateSettings = useApp((s) => s.updateSettings);
    const { config } = game;
    const bot = getBot(config.botId);
    const style = getStyle(config.styleId);
    const botLabel = style.id === 'balanced' ? bot.name : `${bot.name} · ${style.name}`;
    const opening = config.openingId ? getOpening(config.openingId) : undefined;
    const { fens, moves } = useMemo(() => replay(config.startFen, game.sans), [config.startFen, game.sans]);
    const fen = fens[fens.length - 1];
    const turn = fen.split(' ')[1];
    const userTurn = game.status === 'playing' && turn === config.userColor;
    const [viewPly, setViewPly] = useState(null);
    const shownPly = viewPly ?? game.sans.length;
    const shownFen = fens[shownPly];
    const [orientation, setOrientation] = useState(config.userColor);
    const [thinking, setThinking] = useState(false);
    const [reviewing, setReviewing] = useState(false);
    const [analysis, setAnalysis] = useState(null);
    const [arrows, setArrows] = useState([]);
    const [marks, setMarks] = useState([]);
    const [showBetter, setShowBetter] = useState(false);
    const [tab, setTab] = useState('coach');
    const [endOpen, setEndOpen] = useState(false);
    const [confirmResign, setConfirmResign] = useState(false);
    const thinkingFor = useRef(null);
    const depth = settings.analysisDepth;
    const [optionsOpen, setOptionsOpen] = useState(false);
    const [breakdown, setBreakdown] = useState(null);
    const [deepInsight, setDeepInsight] = useState(false);
    const tc = config.timeControl ?? null;
    const [now, setNow] = useState(Date.now());
    const movesMade = game.sans.length - config.presetSans.length;
    const clockLive = !!tc && movesMade >= 2;
    const patchClock = useCallback((fn) => {
        const g = useSession.getState().game;
        if (g?.clock)
            patch({ clock: fn(g.clock) });
    }, [patch]);
    useEffect(() => setDeepInsight(false), [fen]);
    // The user's most recent move (for "Break it down").
    const lastUserPly = useMemo(() => {
        const startTurn = config.startFen.split(' ')[1];
        for (let p = game.sans.length - 1; p >= config.presetSans.length; p--) {
            const color = (p % 2 === 0) === (startTurn === 'w') ? 'w' : 'b';
            if (color === config.userColor)
                return p;
        }
        return -1;
    }, [game.sans.length, config.startFen, config.presetSans.length, config.userColor]);
    const openBreakdown = (ply) => {
        const m = applySan(fens[ply], game.sans[ply]);
        if (!m)
            return;
        const g = useSession.getState().game;
        if (g?.clock)
            patch({ clock: pauseClock(g.clock) });
        setBreakdown({ fenBefore: fens[ply], uci: uciOf(m.move) });
    };
    // ---- prefetch analysis on the user's turn (for hints and move review) ----
    useEffect(() => {
        if (!userTurn)
            return;
        let alive = true;
        setAnalysis(null);
        engine
            .analyze(fen, { depth, multipv: 3 })
            .then((r) => alive && setAnalysis(r))
            .catch(() => undefined);
        return () => {
            alive = false;
        };
    }, [fen, userTurn, depth]);
    // ---- end of game ----
    const finish = useCallback(async (result, reason, g) => {
        const ck = useSession.getState().game?.clock;
        patch({ status: 'ended', result, endReason: reason, ...(ck ? { clock: stopClock(ck) } : {}) });
        playSound('end');
        setEndOpen(true);
        if (g.saved)
            return;
        const opening = await openingFor(g.sans, g.config.startFen).catch(() => undefined);
        const you = 'You';
        const meta = {
            id: g.id,
            createdAt: g.createdAt,
            white: g.config.userColor === 'w' ? you : botLabel,
            black: g.config.userColor === 'b' ? you : botLabel,
            result,
            myColor: g.config.userColor,
            source: (g.config.openingId ? 'practice' : 'bot'),
            opening: opening?.name ?? (g.config.openingId ? getOpening(g.config.openingId)?.name : undefined),
            eco: opening?.eco,
            botId: g.config.botId,
            plies: g.sans.length,
            date: new Date(g.createdAt).toISOString().slice(0, 10),
            timeControl: g.config.timeControl ? tcLabel(g.config.timeControl) : undefined,
        };
        const comments = {};
        Object.values(g.reviews).forEach((r) => (comments[r.ply] = `${r.headline}`));
        await saveGameBody({
            id: g.id,
            headers: {
                Event: 'Outpost training game',
                Date: meta.date.replace(/-/g, '.'),
                White: meta.white,
                Black: meta.black,
                Result: result,
                Termination: reason,
                ...(g.config.timeControl ? { TimeControl: `${g.config.timeControl.initial / 1000}+${g.config.timeControl.increment / 1000}` } : {}),
            },
            startFen: g.config.startFen,
            sans: g.sans,
            openingId: g.config.openingId,
            ...(g.config.timeControl && g.clockLog ? { clocks: useSession.getState().game?.clockLog ?? g.clockLog, tc: { initial: g.config.timeControl.initial, increment: g.config.timeControl.increment } } : {}),
        });
        addGame(meta);
        logActivity('games');
        if (g.config.openingId)
            markPlanStep(`play:${g.config.openingId}:${g.config.userColor}`);
        if (g.config.block)
            useApp.getState().completeBlock(g.config.block);
        patch({ saved: true });
    }, [patch, addGame, logActivity, markPlanStep, botLabel]);
    useEffect(() => {
        if (game.status !== 'playing')
            return;
        const over = gameOverInfo(fen);
        if (over)
            void finish(over.result, over.reason, game);
    }, [fen, game, finish]);
    // ---- clocks ----
    // Start the user's clock when it is their turn (after both sides' first moves).
    useEffect(() => {
        if (!tc || !clockLive || game.status !== 'playing' || !userTurn || reviewing || breakdown)
            return;
        const ck = useSession.getState().game?.clock;
        if (ck && ck.running !== config.userColor)
            patchClock((c) => ({ ...c, running: config.userColor, since: Date.now() }));
    }, [tc, clockLive, game.status, userTurn, reviewing, breakdown, config.userColor, patchClock, fen]);
    // Tick, and detect a flag.
    useEffect(() => {
        if (!tc || game.status !== 'playing' || !game.clock?.running || !game.clock.since)
            return;
        const id = window.setInterval(() => {
            const t = Date.now();
            setNow(t);
            const g = useSession.getState().game;
            if (!g?.clock?.running || !g.clock.since || g.status !== 'playing')
                return;
            const side = g.clock.running;
            if (remainingNow(g.clock, side, t) <= 0) {
                const fenNow = replay(g.config.startFen, g.sans).fens.slice(-1)[0];
                const winner = side === 'w' ? 'b' : 'w';
                const draw = !hasMatingMaterial(fenNow, winner);
                void finish(draw ? '1/2-1/2' : winner === 'w' ? '1-0' : '0-1', draw ? 'Time out vs insufficient material' : side === g.config.userColor ? 'You ran out of time' : `${bot.name} ran out of time`, { ...g, clock: { ...g.clock, [side]: 0 } });
            }
        }, 100);
        return () => window.clearInterval(id);
    }, [tc, game.status, game.clock?.running, game.clock?.since, finish, bot.name]);
    // Pause while the app is hidden or the screen is left; resume on return.
    useEffect(() => {
        if (!tc)
            return;
        const resume = () => {
            const g = useSession.getState().game;
            if (g?.clock?.running && !g.clock.since && g.status === 'playing' && !breakdown)
                patchClock((c) => ({ ...c, since: Date.now() }));
        };
        const onVis = () => (document.hidden ? patchClock((c) => pauseClock(c)) : resume());
        resume();
        document.addEventListener('visibilitychange', onVis);
        return () => {
            document.removeEventListener('visibilitychange', onVis);
            patchClock((c) => pauseClock(c));
        };
    }, [tc, patchClock, breakdown]);
    // ---- bot moves ----
    useEffect(() => {
        if (game.status !== 'playing' || turn === config.userColor || reviewing)
            return;
        if (gameOverInfo(fen))
            return;
        if (thinkingFor.current === fen)
            return;
        thinkingFor.current = fen;
        setThinking(true);
        const plyAtStart = game.sans.length;
        (async () => {
            const t0 = Date.now();
            const botColor = config.userColor === 'w' ? 'b' : 'w';
            const startState = useSession.getState().game;
            const timed = !!tc && startState?.clock && game.sans.length - config.presetSans.length >= 1;
            if (timed && game.sans.length - config.presetSans.length >= 2)
                patchClock((c) => ({ ...c, running: botColor, since: t0 }));
            let uci = null;
            const book = opening ? openingBookMoves(opening, fen) : [];
            let pick = pickWeighted(book);
            if (!pick && !opening && style.id !== 'balanced') {
                const styleUci = await styleBookMove(style, config.startFen, game.sans, fen, botColor).catch(() => null);
                if (styleUci)
                    pick = { uci: styleUci };
            }
            const remaining = startState?.clock ? remainingNow(startState.clock, botColor) : 0;
            const budget = tc
                ? botThinkTime({ fen, bot, tc, remaining, lastMoveSan: game.sans[game.sans.length - 1], lastMoveTo: moves[moves.length - 1]?.to, isBookMove: !!pick })
                : 300 + Math.random() * 700;
            const pressure = tc ? timePressure(remaining, tc) : 0;
            if (pick)
                uci = pick.uci;
            else
                uci = await botMove(fen, bot, { budgetMs: budget, pressure, style: style.id });
            // Take a human amount of time — never instant, never longer than planned.
            const wait = budget - (Date.now() - t0);
            if (wait > 0)
                await new Promise((r) => setTimeout(r, wait));
            const current = useSession.getState().game;
            if (!uci || !current || current.sans.length !== plyAtStart || current.status !== 'playing')
                return;
            const c = new Chess(fen);
            const m = c.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] || undefined });
            soundForSan(m.san);
            const botClock = tc && current.clock ? chargeMove(current.clock, botColor, tc) : null;
            patch({
                sans: [...current.sans, m.san],
                ...(botClock ? { clock: botClock, clockLog: { ...current.clockLog, [current.sans.length]: botClock[botColor] } } : {}),
            });
        })()
            .catch((e) => {
            if (!(e instanceof CancelledError))
                toast('The engine had a problem. Try taking back a move.');
        })
            .finally(() => {
            setThinking(false);
            thinkingFor.current = null;
        });
    }, [fen, turn, config.userColor, game.status, reviewing, opening, bot, style, config.startFen, game.sans, patch, tc, patchClock, config.presetSans.length, moves]);
    // ---- blindfold training ----
    const [peeking, setPeeking] = useState(false);
    const blindOpacity = !config.blind || peeking || game.status !== 'playing' ? 1 : config.blind === 'hidden' ? 0 : Math.max(0, 1 - game.sans.length / 40);
    // ---- premoves: queued while the bot thinks, played as soon as it is our turn ----
    const [premove, setPremove] = useState(null);
    const premoveRef = useRef(premove);
    premoveRef.current = premove;
    useEffect(() => {
        if (game.status !== 'playing')
            setPremove(null);
    }, [game.status]);
    // ---- user moves ----
    const onMove = useCallback(async (mv) => {
        if (!userTurn || viewPly !== null)
            return;
        const fenBefore = fen;
        const c = new Chess(fenBefore);
        let m;
        try {
            m = c.move(mv);
        }
        catch {
            return;
        }
        const ply = game.sans.length;
        const fenAfter = c.fen();
        setArrows([]);
        setMarks([]);
        setShowBetter(false);
        soundForSan(m.san);
        let inBook = false;
        let bookNote;
        if (opening) {
            const book = openingBookMoves(opening, fenBefore);
            if (book.length) {
                const hit = book.find((b) => b.san === m.san);
                if (hit) {
                    inBook = true;
                    bookNote = hit.note;
                }
                else {
                    bookNote = `You left the ${opening.name} theory here. The book move${book.length > 1 ? 's are' : ' is'} ${book.map((b) => b.san).join(', ')}.`;
                }
            }
        }
        const doReview = config.coachLive;
        if (doReview)
            setReviewing(true);
        const ckNow = useSession.getState().game?.clock;
        const myClock = tc && ckNow ? chargeMove(ckNow, config.userColor, tc) : null;
        patch({
            sans: [...game.sans, m.san],
            bookNotes: bookNote ? { ...game.bookNotes, [ply]: bookNote } : game.bookNotes,
            ...(myClock ? { clock: myClock, clockLog: { ...useSession.getState().game?.clockLog, [game.sans.length]: myClock[config.userColor] } } : {}),
        });
        if (!doReview)
            return;
        try {
            const before = analysis && analysis.fen === fenBefore ? analysis : await engine.analyze(fenBefore, { depth, multipv: 3 });
            const after = gameOverInfo(fenAfter) ? null : await engine.analyze(fenAfter, { depth, multipv: 1 });
            const mk = (b, a) => reviewMove({
                ply,
                fenBefore,
                uci: uciOf(m),
                before: b.lines,
                after: a?.lines[0],
                isBook: inBook,
                bookNote,
                openingName: inBook ? opening?.name : undefined,
                prevClass: useSession.getState().game?.reviews[ply - 1]?.cls,
                prevMoveTo: moves[ply - 1]?.to,
            });
            let review = mk(before, after);
            if (!inBook && [...BAD_CLASSES, 'brilliant', 'great'].includes(review.cls)) {
                // Double-check critical verdicts with a deeper search before showing them.
                const deepBefore = await engine.analyze(fenBefore, { depth: depth + 4, multipv: 3 });
                const deepAfter = after ? await engine.analyze(fenAfter, { depth: depth + 4, multipv: 1 }) : null;
                review = mk(deepBefore, deepAfter);
            }
            if (!inBook && bookNote)
                review.notes.unshift(bookNote);
            const cur = useSession.getState().game;
            if (cur && cur.id === game.id)
                patch({ reviews: { ...cur.reviews, [ply]: review } });
            if (BAD_CLASSES.includes(review.cls) && review.cls !== 'inaccuracy')
                playSound('bad');
            else if (review.cls === 'brilliant' || review.cls === 'great')
                playSound('good');
            setTab('coach');
        }
        catch (e) {
            if (!(e instanceof CancelledError))
                console.warn(e);
        }
        finally {
            setReviewing(false);
        }
    }, [userTurn, viewPly, fen, game, opening, config.coachLive, patch, analysis, depth, moves, tc, config.userColor]);
    useEffect(() => {
        const pm = premoveRef.current;
        if (!pm || !userTurn || viewPly !== null || reviewing)
            return;
        setPremove(null);
        try {
            new Chess(fen).move(pm);
        }
        catch {
            return; // no longer legal: drop it
        }
        void onMove(pm);
    }, [fen, userTurn, viewPly, reviewing, onMove]);
    const takeBack = () => {
        engine.cancelAll();
        thinkingFor.current = null;
        setThinking(false);
        setReviewing(false);
        const n = game.sans.length;
        // Remove back to the last position where it was the user's turn.
        let target = n - 1;
        const startTurn = config.startFen.split(' ')[1];
        const colorAt = (ply) => ((ply % 2 === 0) === (startTurn === 'w') ? 'w' : 'b');
        while (target > config.presetSans.length && colorAt(target) !== config.userColor)
            target--;
        if (target < config.presetSans.length || colorAt(target) !== config.userColor)
            return;
        const reviews = { ...game.reviews };
        for (const k of Object.keys(reviews))
            if (+k >= target)
                delete reviews[+k];
        const ck = useSession.getState().game?.clock;
        patch({
            sans: game.sans.slice(0, target),
            reviews,
            takebacks: game.takebacks + 1,
            status: 'playing',
            result: undefined,
            endReason: undefined,
            ...(ck ? { clock: stopClock(ck) } : {}),
        });
        setViewPly(null);
        setArrows([]);
        setMarks([]);
        setEndOpen(false);
    };
    const resign = () => {
        setConfirmResign(false);
        void finish(config.userColor === 'w' ? '0-1' : '1-0', 'You resigned', game);
    };
    const offerDraw = async () => {
        const r = analysis ?? (await engine.analyze(fen, { depth: 12 }));
        const botWin = winPct(lineScore(r.lines[0]), config.userColor === 'w' ? 'b' : 'w');
        if (botWin <= 55 && game.sans.length >= 30)
            void finish('1/2-1/2', 'Draw agreed', game);
        else
            toast(`${bot.name} declines the draw.`);
    };
    const rematch = (swap) => {
        engine.newGame();
        const userColor = swap ? (config.userColor === 'w' ? 'b' : 'w') : config.userColor;
        setGame({
            ...game,
            id: `g${Date.now().toString(36)}`,
            config: { ...config, userColor },
            sans: [...config.presetSans],
            reviews: {},
            bookNotes: {},
            status: 'playing',
            result: undefined,
            endReason: undefined,
            hints: 0,
            takebacks: 0,
            createdAt: Date.now(),
            saved: false,
            clock: config.timeControl ? { w: config.timeControl.initial, b: config.timeControl.initial, running: null, since: null } : undefined,
        });
        setOrientation(userColor);
        setViewPly(null);
        setEndOpen(false);
    };
    useArrowKeys({
        left: () => setViewPly((v) => Math.max(0, (v ?? game.sans.length) - 1)),
        right: () => setViewPly((v) => (v === null || v + 1 >= game.sans.length ? null : v + 1)),
    });
    // Latest review for the shown position
    const shownReview = useMemo(() => {
        if (viewPly !== null)
            return game.reviews[viewPly - 1];
        const plies = Object.keys(game.reviews).map(Number).sort((a, b) => b - a);
        return plies.length ? game.reviews[plies[0]] : undefined;
    }, [game.reviews, viewPly]);
    const latestBookNote = game.bookNotes[game.sans.length - (turn === config.userColor ? 2 : 1)];
    const lastMove = shownPly > 0 ? moves[shownPly - 1] : null;
    const betterArrows = showBetter && shownReview?.bestUci
        ? [{ from: shownReview.bestUci.slice(0, 2), to: shownReview.bestUci.slice(2, 4), color: 'y' }]
        : [];
    const evalScore = analysis?.fen === shownFen ? lineScore(analysis.lines[0]) : shownReview && viewPly === null ? shownReview.evalAfter : undefined;
    const isLive = viewPly === null;
    const reviewBadge = shownReview && isLive && shownReview.ply === game.sans.length - 1
        ? { sq: moves[shownReview.ply].to, cls: shownReview.cls }
        : shownReview && viewPly !== null && shownReview.ply === viewPly - 1
            ? { sq: moves[shownReview.ply].to, cls: shownReview.cls }
            : null;
    const userLabel = 'You';
    const top = orientation === 'w' ? 'b' : 'w';
    const clockFor = (c) => {
        if (!tc || !game.clock)
            return null;
        const ms = remainingNow(game.clock, c, now);
        return _jsx(ClockFace, { ms: ms, active: game.clock.running === c && !!game.clock.since && game.status === 'playing', low: ms < Math.min(20_000, tc.initial * 0.15) });
    };
    const tag = (c) => c === config.userColor ? (_jsxs("div", { className: "player-tag", children: [_jsx("span", { className: `pill-color pill-${c}` }), userLabel, clockFor(c)] })) : (_jsxs("div", { className: "player-tag", children: [_jsx("span", { className: `pill-color pill-${c}` }), botLabel, " ", _jsx("span", { className: "muted num", children: bot.elo }), thinking && _jsx("span", { className: "thinking", children: _jsx(Spinner, {}) }), clockFor(c)] }));
    return (_jsxs("div", { className: "page board-screen-page", children: [_jsx(Header, { title: config.title ? `${config.title}` : `vs ${bot.name}`, backTo: "/play", actions: _jsx(IconButton, { label: "Coaching options", onClick: () => setOptionsOpen(true), children: _jsx(SlidersHorizontal, { size: 20 }) }), sub: game.status === 'ended'
                    ? `${game.result} · ${game.endReason}`
                    : `${tc ? `${tcLabel(tc)} · ` : ''}${config.coachLive ? 'Coach is watching every move' : 'Coach off — review after the game'}` }), _jsxs("div", { className: "board-screen", children: [_jsxs("div", { className: "board-col", children: [tag(top), _jsxs("div", { className: "board-wrap", children: [settings.showEval && _jsx(EvalBar, { score: evalScore, orientation: orientation, pending: !evalScore }), _jsx("div", { className: "board-holder", children: _jsx(Board, { fen: shownFen, orientation: orientation, movable: isLive && userTurn && !reviewing ? config.userColor : null, onMove: onMove, pieceOpacity: blindOpacity, showDests: !config.blind, premoveColor: isLive && !userTurn && game.status === 'playing' ? config.userColor : null, onPremove: setPremove, premove: premove ? [premove.from, premove.to] : null, onCancelPremove: () => setPremove(null), lastMove: lastMove ? [lastMove.from, lastMove.to] : null, arrows: [...arrows, ...betterArrows], marks: marks, badge: config.coachLive ? reviewBadge : null }) })] }), tag(orientation), _jsxs("div", { className: "controls", children: [_jsxs("div", { className: "controls-group", children: [_jsx(IconButton, { label: "Previous move", onClick: () => setViewPly(Math.max(0, shownPly - 1)), disabled: shownPly === 0, children: _jsx(ChevronLeft, {}) }), _jsx(IconButton, { label: "Next move", onClick: () => setViewPly(shownPly + 1 >= game.sans.length ? null : shownPly + 1), disabled: isLive, children: _jsx(ChevronRight, {}) })] }), _jsxs("div", { className: "controls-group", children: [config.blind && game.status === 'playing' && (_jsx("button", { className: `icon-btn${peeking ? ' is-on' : ''}`, "aria-label": "Hold to peek at the pieces", onPointerDown: () => setPeeking(true), onPointerUp: () => setPeeking(false), onPointerLeave: () => setPeeking(false), onContextMenu: (e) => e.preventDefault(), children: _jsx(Eye, {}) })), _jsx(IconButton, { label: "Take back", onClick: takeBack, disabled: game.sans.length <= config.presetSans.length, children: _jsx(Undo2, {}) }), _jsx(IconButton, { label: "Hint", onClick: () => setTab('coach'), className: tab === 'coach' ? 'is-on' : '', children: _jsx(Lightbulb, {}) }), _jsx(IconButton, { label: "Break down my last move", onClick: () => openBreakdown(lastUserPly), disabled: lastUserPly < 0, children: _jsx(ScanSearch, {}) }), _jsx(IconButton, { label: "Flip board", onClick: () => setOrientation(orientation === 'w' ? 'b' : 'w'), children: _jsx(RefreshCw, {}) }), game.status === 'playing' ? (_jsxs(_Fragment, { children: [_jsx(IconButton, { label: "Offer draw", onClick: offerDraw, children: _jsx(Handshake, {}) }), _jsx(IconButton, { label: "Resign", onClick: () => setConfirmResign(true), children: _jsx(Flag, {}) })] })) : (_jsx(IconButton, { label: "Game over", onClick: () => setEndOpen(true), children: _jsx(Microscope, {}) }))] })] }), !isLive && (_jsxs("button", { className: "back-to-live", onClick: () => setViewPly(null), children: [_jsx(Play, { size: 14 }), " Back to the game"] }))] }), _jsxs("div", { className: "side-col", children: [_jsx("div", { className: "tabs", role: "tablist", children: ['coach', 'moves', 'plan'].map((t) => (_jsx("button", { role: "tab", "aria-selected": tab === t, className: `tab${tab === t ? ' is-on' : ''}`, onClick: () => setTab(t), children: t === 'coach' ? 'Coach' : t === 'moves' ? 'Moves' : 'Plan' }, t))) }), tab === 'coach' && (_jsxs("div", { className: "stack", children: [reviewing && _jsx("div", { className: "panel panel-tight", children: _jsx(Spinner, { label: "Coach is looking at your move\u2026" }) }), !reviewing && shownReview && (_jsxs(_Fragment, { children: [_jsx(VerdictCard, { review: shownReview, onShowBetter: shownReview.better ? () => setShowBetter(!showBetter) : undefined, showingBetter: showBetter, showEval: settings.showEval, onBreakdown: () => openBreakdown(shownReview.ply) }), isLive && game.status === 'playing' && ['mistake', 'blunder', 'miss'].includes(shownReview.cls) && shownReview.ply === game.sans.length - (turn === config.userColor ? 2 : 1) && (_jsx(Button, { variant: "secondary", icon: _jsx(Undo2, { size: 16 }), onClick: takeBack, children: "Take back and find a better move" }))] })), !reviewing && !shownReview && latestBookNote && _jsx("p", { className: "panel panel-tight muted", children: latestBookNote }), !reviewing && !shownReview && !latestBookNote && (_jsx("p", { className: "panel panel-tight muted", children: config.coachLive
                                            ? 'Make a move. The coach will grade it and explain the ideas.'
                                            : 'Live coaching is off. Use hints if you get stuck, and review the game when it ends.' })), !reviewing && !shownReview && lastUserPly >= 0 && (_jsx(Button, { variant: "secondary", icon: _jsx(ScanSearch, { size: 16 }), onClick: () => openBreakdown(lastUserPly), children: "Break down my last move" })), isLive && userTurn && (settings.coachTalk || deepInsight) && (_jsx("div", { className: "panel panel-tight", children: _jsx(InsightsPanel, { fen: fen, forColor: config.userColor, deep: deepInsight, lines: analysis?.fen === fen ? analysis.lines : null, max: deepInsight ? 6 : 3, title: deepInsight ? 'What matters here' : 'Before you move', onMarks: setMarks }) })), isLive && userTurn && !deepInsight && (_jsxs("button", { className: "link-btn", onClick: () => setDeepInsight(true), children: [_jsx(ScanSearch, { size: 14 }), " ", settings.coachTalk ? 'Look deeper: threats and tactics' : 'What matters here?'] })), isLive && userTurn && (_jsx(HintPanel, { fen: fen, analysis: analysis, onArrows: setArrows, onMarks: setMarks, onUsed: () => patch({ hints: game.hints + 1 }) }))] })), tab === 'moves' && (_jsx(MoveList, { moves: game.sans.map((san, i) => ({ san, cls: game.reviews[i]?.cls })), current: shownPly, onSelect: (p) => setViewPly(p >= game.sans.length ? null : p), startMoveNumber: parseInt(config.startFen.split(' ')[5] || '1', 10), startColor: config.startFen.split(' ')[1] })), tab === 'plan' && (_jsx("div", { className: "panel", children: _jsx(PositionReportView, { fen: shownFen, forColor: config.userColor }) }))] })] }), _jsxs(Sheet, { open: optionsOpen, onClose: () => setOptionsOpen(false), title: "Coaching options", children: [_jsx(Toggle, { checked: config.coachLive, onChange: (v) => {
                            patch({ config: { ...config, coachLive: v } });
                            updateSettings({ coachLive: v });
                        }, label: "Live coach", hint: "Grade and explain each of your moves as you play." }), _jsx(Toggle, { checked: settings.coachTalk, onChange: (v) => updateSettings({ coachTalk: v }), label: "Position talk", hint: "Before your move, the coach points out what matters \u2014 loose pieces, pins, space \u2014 without naming a move." }), _jsx(Toggle, { checked: settings.showEval, onChange: (v) => updateSettings({ showEval: v }), label: "Evaluation bar & numbers", hint: "Hide the engine\u2019s score if you want to judge positions yourself." }), _jsx("p", { className: "muted small mt12", children: "Hints and \u201CBreak it down\u201D stay available either way. These choices become your defaults for new games." })] }), breakdown && (_jsx(MoveBreakdown, { fenBefore: breakdown.fenBefore, uci: breakdown.uci, depth: depth, showEval: settings.showEval, onClose: () => setBreakdown(null) })), _jsxs(Sheet, { open: confirmResign, onClose: () => setConfirmResign(false), title: "Resign this game?", children: [_jsx("p", { className: "muted", children: "The game is saved to your history so you can review it." }), _jsxs("div", { className: "row mt16", children: [_jsx(Button, { variant: "danger", onClick: resign, icon: _jsx(Flag, { size: 16 }), children: "Resign" }), _jsx(Button, { variant: "ghost", onClick: () => setConfirmResign(false), children: "Keep playing" })] })] }), _jsxs(Sheet, { open: endOpen, onClose: () => setEndOpen(false), title: resultTitle(game), children: [_jsxs("p", { className: "muted", children: [game.endReason, ". ", game.takebacks ? `${game.takebacks} takeback${game.takebacks > 1 ? 's' : ''}, ` : '', game.hints ? `${game.hints} hint${game.hints > 1 ? 's' : ''}.` : ''] }), _jsxs("div", { className: "stack mt16", children: [_jsx(Button, { size: "lg", icon: _jsx(Microscope, { size: 18 }), onClick: () => navigate(`/games/${game.id}?auto=1`), children: "Review with the coach" }), _jsxs("div", { className: "row", children: [_jsx(Button, { variant: "secondary", icon: _jsx(Repeat, { size: 16 }), onClick: () => rematch(false), children: "Rematch" }), _jsx(Button, { variant: "secondary", icon: _jsx(RefreshCw, { size: 16 }), onClick: () => rematch(true), children: "Switch colours" }), _jsx(Button, { variant: "ghost", onClick: () => navigate('/play'), children: "New setup" })] })] })] })] }));
}
function resultTitle(g) {
    if (!g.result)
        return 'Game over';
    if (g.result === '1/2-1/2')
        return 'Draw';
    const userWon = (g.result === '1-0') === (g.config.userColor === 'w');
    return userWon ? 'You won' : 'You lost';
}
