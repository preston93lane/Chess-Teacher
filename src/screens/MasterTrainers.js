import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { eventLabel } from '../lib/explorer';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowRight, RotateCcw, Shield, Target } from 'lucide-react';
import { Chess } from '../lib/chess/core';
import { engine } from '../lib/engine/stockfish';
import { lineScore } from '../lib/coach/eval';
import { explorerMeta, getMasterGame, loadExplorer } from '../lib/explorer';
import { useApp } from '../lib/store/app';
import { playSound, soundForSan } from '../lib/sound';
import { Board } from '../components/Board';
import { FollowUpPanel } from '../components/FollowUp';
import { Button, Header, Spinner, NextDock } from '../components/ui';
/** Score in pawns for `side` (mate = ±20). */
async function evalFor(fen, side, depth = 12) {
    const r = await engine.analyze(fen, { depth, multipv: 1 });
    const s = lineScore(r.lines[0]);
    const white = !s ? 0 : s.mate !== undefined ? (s.mate > 0 ? 20 : -20) : (s.cp ?? 0) / 100;
    return { v: side === 'w' ? white : -white, best: r.lines[0]?.pv[0] ?? r.bestmove };
}
function randomGame() {
    const meta = explorerMeta();
    if (!meta)
        return null;
    for (let i = 0; i < 20; i++) {
        const g = getMasterGame(Math.floor(Math.random() * 2500));
        if (g && g.moves.length >= 30)
            return g;
    }
    return null;
}
async function makeThreat() {
    for (let attempt = 0; attempt < 12; attempt++) {
        const g = randomGame();
        if (!g)
            return null;
        const ply = 14 + Math.floor(Math.random() * Math.min(40, g.moves.length - 16));
        const c = new Chess();
        let last;
        try {
            for (let i = 0; i < ply; i++)
                last = c.move(g.moves[i]);
        }
        catch {
            continue;
        }
        if (!last || c.inCheck() || c.isGameOver())
            continue;
        const you = c.turn();
        const opp = you === 'w' ? 'b' : 'w';
        const parts = c.fen().split(' ');
        parts[1] = opp;
        parts[3] = '-';
        const nullFen = parts.join(' ');
        try {
            if (new Chess(nullFen).inCheck())
                continue;
        }
        catch {
            continue;
        }
        const [now, passed] = await Promise.all([evalFor(c.fen(), opp, 11), evalFor(nullFen, opp, 11)]);
        const gain = passed.v - now.v;
        if (gain < 1.5 || !passed.best)
            continue;
        const t = new Chess(nullFen);
        let san = passed.best;
        try {
            san = t.move({ from: passed.best.slice(0, 2), to: passed.best.slice(2, 4), promotion: passed.best[4] || undefined }).san;
        }
        catch {
            continue;
        }
        return { game: g, fen: c.fen(), nullFen, you, lastMove: [last.from, last.to], lastSan: last.san, threat: passed.best, threatSan: san, gain, base: now.v };
    }
    return null;
}
export function ThreatSpotter() {
    const logActivity = useApp((s) => s.logActivity);
    const [ready, setReady] = useState(false);
    const [q, setQ] = useState(null);
    const [stage, setStage] = useState('threat');
    const [msg, setMsg] = useState(null);
    const [checking, setChecking] = useState(false);
    const [score, setScore] = useState({ threats: 0, defences: 0, n: 0 });
    const [arrows, setArrows] = useState([]);
    const [defence, setDefence] = useState(null);
    const nextQ = useRef(null);
    const load = useCallback(async () => {
        setQ(null);
        setStage('threat');
        setMsg(null);
        setArrows([]);
        setDefence(null);
        const p = nextQ.current ?? makeThreat();
        nextQ.current = null;
        const got = await p;
        setQ(got);
        nextQ.current = makeThreat(); // prefetch
    }, []);
    useEffect(() => {
        loadExplorer().then(() => {
            setReady(true);
            void load();
        });
    }, [load]);
    if (!ready || !q) {
        return (_jsxs("div", { className: "page", children: [_jsx(Header, { title: "Threat spotter", backTo: "/courses/defence" }), _jsx(Spinner, { label: ready ? 'Finding a position with a real threat…' : 'Loading master games…' })] }));
    }
    const opp = q.you === 'w' ? 'b' : 'w';
    const onThreat = async (m) => {
        const uci = m.from + m.to;
        const t = new Chess(q.nullFen);
        let san;
        try {
            san = t.move(m).san;
        }
        catch {
            return;
        }
        let ok = uci === q.threat.slice(0, 4);
        if (!ok) {
            setChecking(true);
            const r = await evalFor(t.fen(), opp, 11);
            setChecking(false);
            ok = r.v - q.base >= Math.max(1.2, q.gain - 0.8);
        }
        playSound(ok ? 'good' : 'bad');
        setArrows([{ from: q.threat.slice(0, 2), to: q.threat.slice(2, 4), color: 'r' }]);
        setMsg(ok ? `Yes — ${san}${uci === q.threat.slice(0, 4) ? '' : ` works too; the engine’s threat is ${q.threatSan}`}. Now stop it: play your move.` : `Not quite. The threat is ${q.threatSan} (red arrow). Now find a move that deals with it.`);
        setScore((s) => ({ ...s, threats: s.threats + (ok ? 1 : 0) }));
        setStage('defend');
    };
    const onDefend = async (m) => {
        const c = new Chess(q.fen);
        let san;
        try {
            san = c.move(m).san;
        }
        catch {
            return;
        }
        setChecking(true);
        const [best, mine] = await Promise.all([evalFor(q.fen, q.you, 12), evalFor(c.fen(), q.you, 12)]);
        setChecking(false);
        const loss = best.v - mine.v;
        const ok = loss <= 0.8;
        let bestSan = '';
        try {
            bestSan = best.best ? new Chess(q.fen).move({ from: best.best.slice(0, 2), to: best.best.slice(2, 4), promotion: best.best[4] || undefined }).san : '';
        }
        catch {
            /* ignore */
        }
        playSound(ok ? 'good' : 'bad');
        if (best.best)
            setArrows((a) => [...a, { from: best.best.slice(0, 2), to: best.best.slice(2, 4), color: 'g' }]);
        setMsg(ok ? `${san} holds${bestSan && bestSan !== san ? ` (the engine’s choice: ${bestSan})` : ''}. That’s the habit: threat first, then your move.` : `${san} doesn’t stop it — it costs about ${loss.toFixed(1)} pawns. Better was ${bestSan} (green arrow).`);
        setScore((s) => ({ ...s, defences: s.defences + (ok ? 1 : 0), n: s.n + 1 }));
        const myUci = m.from + m.to + (m.promotion ?? '');
        if (best.best)
            setDefence({ uci: ok ? myUci : best.best, tried: ok ? undefined : myUci });
        setStage('done');
        logActivity('puzzles');
    };
    return (_jsxs("div", { className: "page board-screen-page", children: [_jsx(Header, { title: "Threat spotter", backTo: "/courses/defence", sub: `${q.game.white} – ${q.game.black}, ${eventLabel(q.game)}` }), _jsxs("div", { className: "board-screen", children: [_jsx("div", { className: "board-col", children: _jsx(Board, { fen: stage === 'threat' ? q.nullFen : q.fen, orientation: q.you, movable: checking ? null : stage === 'threat' ? opp : stage === 'defend' ? q.you : null, onMove: stage === 'threat' ? onThreat : onDefend, lastMove: q.lastMove, arrows: arrows }) }), _jsxs("div", { className: "side-col", children: [_jsxs("div", { className: "panel stack", children: [stage === 'threat' ? (_jsxs("p", { className: "drill-prompt", children: [_jsx(Target, { size: 16 }), " Your opponent just played ", _jsx("strong", { children: q.lastSan }), ". If you passed, what would they play? Show the threat by moving ", _jsx("em", { children: "their" }), " piece."] })) : (_jsxs("p", { className: "drill-prompt", children: [_jsx(Shield, { size: 16 }), " ", stage === 'defend' ? 'Your move: deal with the threat.' : 'Done.'] })), checking && _jsx(Spinner, { label: "Checking\u2026" }), msg && _jsx("p", { children: msg }), stage === 'done' && _jsx(NextDock, { children: _jsx(Button, { icon: _jsx(ArrowRight, { size: 16 }), onClick: load, children: "Next position" }) }), stage === 'done' && defence && _jsx(FollowUpPanel, { fen: q.fen, uci: defence.uci, tried: defence.tried ? [defence.tried] : [], title: "How the defence works" })] }), score.n > 0 && _jsxs("p", { className: "muted small", children: ["Threats spotted ", score.threats, "/", score.n, " \u00B7 held ", score.defences, "/", score.n] })] })] })] }));
}
// ---------------------------------------------------------------------------
// Guess the master's move
export function GuessTheMove() {
    const logActivity = useApp((s) => s.logActivity);
    const [ready, setReady] = useState(false);
    const [game, setGame] = useState(null);
    const [side, setSide] = useState('w');
    const [ply, setPly] = useState(0);
    const [guesses, setGuesses] = useState([]);
    const [msg, setMsg] = useState(null);
    const [checking, setChecking] = useState(false);
    const [revealed, setRevealed] = useState(false);
    const MAX = 12;
    const start = useCallback(() => {
        const g = randomGame();
        if (!g)
            return;
        const winner = g.result === '0-1' ? 'b' : 'w';
        setGame(g);
        setSide(winner);
        // Skip the opening: start where it's the chosen side's move after about move 8.
        let p = 16;
        if ((p % 2 === 0 ? 'w' : 'b') !== winner)
            p++;
        setPly(p);
        setGuesses([]);
        setMsg(null);
        setRevealed(false);
    }, []);
    useEffect(() => {
        loadExplorer().then(() => {
            setReady(true);
            start();
        });
    }, [start]);
    if (!ready || !game)
        return _jsxs("div", { className: "page", children: [_jsx(Header, { title: "Guess the move", backTo: "/courses" }), _jsx(Spinner, { label: "Loading master games\u2026" })] });
    const c = new Chess();
    let last = null;
    for (let i = 0; i < ply && i < game.moves.length; i++)
        last = c.move(game.moves[i]);
    const fen = c.fen();
    const master = game.moves[ply];
    const finished = guesses.length >= MAX || ply >= game.moves.length;
    let masterUci = null;
    try {
        const mm = master ? new Chess(fen).move(master) : null;
        masterUci = mm ? mm.from + mm.to + (mm.promotion ?? '') : null;
    }
    catch {
        masterUci = null;
    }
    const total = guesses.reduce((a, g) => a + g.pts, 0);
    const player = side === 'w' ? game.white : game.black;
    const onMove = async (m) => {
        if (revealed || finished || !master)
            return;
        const t = new Chess(fen);
        let san;
        try {
            san = t.move(m).san;
        }
        catch {
            return;
        }
        soundForSan(san);
        let pts = 0;
        let text;
        if (san === master) {
            pts = 3;
            text = `${san} — exactly what ${player} played. +3`;
        }
        else {
            setChecking(true);
            const mt = new Chess(fen);
            mt.move(master);
            const [mine, theirs] = await Promise.all([evalFor(t.fen(), side, 11), evalFor(mt.fen(), side, 11)]);
            setChecking(false);
            const diff = theirs.v - mine.v;
            pts = diff <= 0.3 ? 2 : diff <= 1 ? 1 : 0;
            text = `${player} played ${master}. Your ${san} is ${pts === 2 ? 'just as good by the engine — +2' : pts === 1 ? `a little weaker (−${diff.toFixed(1)}) — +1` : `clearly worse (−${diff.toFixed(1)}) — no points`}.`;
        }
        playSound(pts >= 2 ? 'good' : pts === 1 ? 'move' : 'bad');
        setGuesses((g) => [...g, { ply, mine: san, master, pts, mineUci: m.from + m.to + (m.promotion ?? '') }]);
        setMsg(text);
        setRevealed(true);
        logActivity('puzzles');
    };
    const advance = () => {
        setRevealed(false);
        setMsg(null);
        setPly((p) => p + 2);
    };
    return (_jsxs("div", { className: "page board-screen-page", children: [_jsx(Header, { title: "Guess the move", backTo: "/courses", sub: `${game.white} (${game.whiteElo}) – ${game.black} (${game.blackElo}) · ${eventLabel(game)}` }), _jsxs("div", { className: "board-screen", children: [_jsx("div", { className: "board-col", children: _jsx(Board, { fen: fen, orientation: side, movable: revealed || finished || checking ? null : side, onMove: onMove, lastMove: last ? [last.from, last.to] : null }) }), _jsx("div", { className: "side-col", children: _jsxs("div", { className: "panel stack", children: [finished ? (_jsxs(_Fragment, { children: [_jsxs("h2", { children: [total, " / ", guesses.length * 3] }), _jsxs("p", { className: "muted", children: [guesses.filter((g) => g.pts === 3).length, " of ", player, "\u2019s moves found exactly. Result: ", game.result, "."] }), _jsx("div", { className: "row", children: _jsx(Button, { icon: _jsx(RotateCcw, { size: 16 }), onClick: start, children: "Another game" }) })] })) : (_jsxs(_Fragment, { children: [_jsxs("p", { className: "drill-prompt", children: ["You are ", player, ". Move ", Math.floor(ply / 2) + 1, ": what did they play? ", _jsxs("span", { className: "muted small", children: ["(guess ", guesses.length + 1, " of ", MAX, ")"] })] }), checking && _jsx(Spinner, { label: "Comparing with the engine\u2026" }), msg && _jsx("p", { children: msg }), revealed && _jsx(NextDock, { children: _jsx(Button, { icon: _jsx(ArrowRight, { size: 16 }), onClick: advance, children: "Continue" }) }), revealed && masterUci && (_jsx(FollowUpPanel, { fen: fen, uci: masterUci, tried: guesses[guesses.length - 1]?.mine !== master && guesses[guesses.length - 1]?.mineUci ? [guesses[guesses.length - 1].mineUci] : [], title: `Why ${player} played ${master}` }))] })), _jsxs("p", { className: "num muted small", children: ["Score ", total, " \u00B7 exact 3, as good 2, close 1"] })] }) })] })] }));
}
