import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Eye, Pause, Play, RotateCcw, Target } from 'lucide-react';
import { CLASSICS, getClassic } from '../data/classics';
import { Chess, START_FEN, formatLine, moveLabel, uciOf } from '../lib/chess/core';
import { parseMovetext } from '../lib/chess/pgn';
import { engine } from '../lib/engine/stockfish';
import { lineScore, winPct } from '../lib/coach/eval';
import { useApp } from '../lib/store/app';
import { navigate, query, useRoute } from '../lib/router';
import { soundForSan, playSound } from '../lib/sound';
import { useArrowKeys } from '../lib/hooks';
import { Board } from '../components/Board';
import { MoveList } from '../components/MoveList';
import { Button, Header, IconButton, Segmented, Spinner } from '../components/ui';
import { getOpening } from '../lib/openings/book';
import { BlockBanner, completeBlock } from '../components/BlockBanner';
const TAGS = ['All', 'Attack', 'Sacrifice', 'Positional', 'Defence', 'King hunt', 'Miniature'];
export function ClassicsList() {
    const [tag, setTag] = useState('All');
    const scores = useApp((s) => s.classics);
    const list = CLASSICS.filter((c) => tag === 'All' || c.tags.includes(tag)).sort((a, b) => a.year - b.year);
    return (_jsxs("div", { className: "page", children: [_jsx(Header, { title: "Classic games", backTo: "/train", sub: "Replay the immortal games with commentary \u2014 or play the winner\u2019s side and find the key moves yourself." }), _jsx("div", { className: "chips mb8", children: TAGS.map((t) => (_jsx("button", { className: `chip${t === tag ? ' chip-on' : ''}`, onClick: () => setTag(t), children: t }, t))) }), _jsx("div", { className: "classic-grid", children: list.map((g) => (_jsxs("button", { className: "classic-card", onClick: () => navigate(`/classics/${g.id}`), children: [_jsx("span", { className: "classic-year num", children: g.year }), _jsx("span", { className: "classic-title", children: g.title }), _jsxs("span", { className: "classic-players", children: [g.white, " \u2013 ", g.black] }), _jsxs("span", { className: "classic-meta", children: [g.opening, " \u00B7 ", g.result] }), _jsxs("span", { className: "chips", children: [g.tags.slice(0, 3).map((t) => (_jsx("span", { className: "chip", children: t }, t))), scores[g.id] && _jsxs("span", { className: "chip chip-on num", children: [scores[g.id].best, "/", scores[g.id].total, " found"] })] })] }, g.id))) })] }));
}
function parseGame(g) {
    const c = new Chess();
    const out = { sans: [], ucis: [], fens: [START_FEN], comments: [], labels: [] };
    for (const m of parseMovetext(g.pgn).sans) {
        const before = c.fen();
        const mv = c.move(m.san);
        out.sans.push(mv.san);
        out.ucis.push(uciOf(mv));
        out.fens.push(c.fen());
        out.comments.push(m.comment);
        out.labels.push(moveLabel(before, mv.san));
    }
    return out;
}
export function ClassicScreen({ id }) {
    const game = getClassic(id);
    const q = query(useRoute());
    const [mode, setMode] = useState(q.get('mode') === 'guess' ? 'guess' : 'replay');
    if (!game)
        return _jsx("div", { className: "page", children: _jsx(Header, { title: "Game not found", backTo: "/classics" }) });
    return (_jsxs("div", { className: "page board-screen-page", children: [_jsx(Header, { title: game.title, backTo: "/classics", sub: `${game.white} – ${game.black} · ${game.event} ${game.year} · ${game.result}` }), _jsx(BlockBanner, {}), _jsx("div", { className: "mb8", children: _jsx(Segmented, { value: mode, onChange: setMode, label: "Mode", options: [
                        { value: 'replay', label: 'Replay with commentary' },
                        { value: 'guess', label: 'Guess the move' },
                    ] }) }), mode === 'replay' ? _jsx(Replay, { game: game }) : _jsx(Guess, { game: game }, id)] }));
}
function Replay({ game }) {
    const parsed = useMemo(() => parseGame(game), [game]);
    const [ply, setPly] = useState(0);
    const [auto, setAuto] = useState(false);
    const winner = game.result === '0-1' ? 'b' : 'w';
    const n = parsed.sans.length;
    useEffect(() => {
        if (!auto)
            return;
        if (ply >= n) {
            setAuto(false);
            return;
        }
        const t = setTimeout(() => {
            soundForSan(parsed.sans[ply]);
            setPly(ply + 1);
        }, parsed.comments[ply] ? 2600 : 900);
        return () => clearTimeout(t);
    }, [auto, ply, n, parsed]);
    const go = (p) => {
        const q = Math.max(0, Math.min(n, p));
        if (q === ply + 1)
            soundForSan(parsed.sans[ply]);
        setPly(q);
    };
    useArrowKeys({ left: () => go(ply - 1), right: () => go(ply + 1), up: () => go(0), down: () => go(n) });
    const last = ply > 0 ? [parsed.ucis[ply - 1].slice(0, 2), parsed.ucis[ply - 1].slice(2, 4)] : null;
    const comment = ply > 0 ? parsed.comments[ply - 1] : undefined;
    const opening = game.openingId ? getOpening(game.openingId) : undefined;
    return (_jsxs("div", { className: "board-screen", children: [_jsxs("div", { className: "board-col", children: [_jsx(Board, { fen: parsed.fens[ply], orientation: winner, lastMove: last }), _jsxs("div", { className: "controls", children: [_jsxs("div", { className: "controls-group", children: [_jsx(IconButton, { label: "Start", onClick: () => go(0), children: _jsx(ChevronsLeft, {}) }), _jsx(IconButton, { label: "Previous", onClick: () => go(ply - 1), children: _jsx(ChevronLeft, {}) }), _jsx(IconButton, { label: auto ? 'Pause' : 'Play', onClick: () => setAuto(!auto), className: auto ? 'is-on' : '', children: auto ? _jsx(Pause, {}) : _jsx(Play, {}) }), _jsx(IconButton, { label: "Next", onClick: () => go(ply + 1), children: _jsx(ChevronRight, {}) }), _jsx(IconButton, { label: "End", onClick: () => go(n), children: _jsx(ChevronsRight, {}) })] }), _jsxs("span", { className: "muted small num", children: [ply, "/", n] })] })] }), _jsxs("div", { className: "side-col", children: [ply === 0 ? (_jsxs("div", { className: "panel prose", children: [_jsx("p", { children: game.summary }), opening && (_jsx("p", { className: "mt8", children: _jsxs("button", { className: "link-btn", onClick: () => navigate(`/openings/${opening.id}`), children: ["Study the ", opening.name] }) }))] })) : (_jsxs("div", { className: "commentary", children: [_jsx("span", { className: "commentary-move", children: parsed.labels[ply - 1] }), _jsx("p", { children: comment ?? 'Keep going — the next comment marks a key moment.' })] })), ply === n && (_jsxs("div", { className: "panel", children: [_jsx("h4", { children: "Lessons" }), _jsx("ul", { className: "bullets mt8", children: game.lessons.map((l) => _jsx("li", { children: l }, l)) })] })), _jsx(MoveList, { moves: parsed.sans.map((san) => ({ san })), current: ply, onSelect: go })] })] }));
}
function Guess({ game }) {
    const parsed = useMemo(() => parseGame(game), [game]);
    const winner = game.result === '0-1' ? 'b' : 'w';
    const keyPlies = useMemo(() => new Set(game.keys.map((k) => parsed.labels.indexOf(k)).filter((i) => i >= 0)), [game, parsed]);
    const saveScore = useApp((s) => s.recordClassic);
    const blockId = query(useRoute()).get('block');
    const [ply, setPly] = useState(0);
    const [found, setFound] = useState(0);
    const [tries, setTries] = useState(0);
    const [reveal, setReveal] = useState(false);
    const [checking, setChecking] = useState(false);
    const [message, setMessage] = useState(null);
    const [tryFen, setTryFen] = useState(null);
    const done = ply >= parsed.sans.length;
    const recorded = useRef(false);
    const atKey = !done && keyPlies.has(ply);
    // Auto-play everything except key moves
    useEffect(() => {
        if (done || atKey)
            return;
        const t = setTimeout(() => {
            soundForSan(parsed.sans[ply]);
            setPly(ply + 1);
        }, ply === 0 ? 800 : 650);
        return () => clearTimeout(t);
    }, [ply, done, atKey, parsed]);
    useEffect(() => {
        if (done && !recorded.current) {
            recorded.current = true;
            saveScore(game.id, found, keyPlies.size);
            completeBlock(blockId);
            playSound('end');
        }
    }, [done, found, keyPlies.size, game.id, saveScore, blockId]);
    const advance = (credit) => {
        if (credit)
            setFound((f) => f + 1);
        setTries(0);
        setReveal(false);
        setTryFen(null);
        soundForSan(parsed.sans[ply]);
        setPly(ply + 1);
    };
    const onMove = async (mv) => {
        if (!atKey || checking)
            return;
        const fen = parsed.fens[ply];
        const c = new Chess(fen);
        let m;
        try {
            m = c.move(mv);
        }
        catch {
            return;
        }
        const player = winner === 'w' ? game.white : game.black;
        if (m.san === parsed.sans[ply]) {
            playSound('good');
            setMessage({ tone: 'good', text: `${m.san}! ${tries === 0 ? 'Exactly what ' + player.split(' ').slice(-1)[0] + ' played.' : 'Found it.'} ${parsed.comments[ply] ?? ''}` });
            advance(tries === 0);
            return;
        }
        soundForSan(m.san);
        setTryFen(c.fen());
        setChecking(true);
        try {
            const [mine, real] = await Promise.all([
                engine.analyze(c.fen(), { depth: 13 }),
                engine.analyze(parsed.fens[ply + 1], { depth: 13 }),
            ]);
            const a = winPct(lineScore(mine.lines[0]), winner);
            const b = winPct(lineScore(real.lines[0]), winner);
            if (a >= b - 3) {
                playSound('good');
                setMessage({ tone: 'info', text: `${m.san} is just as strong by engine standards. ${player.split(' ').slice(-1)[0]} played ${parsed.sans[ply]}. ${parsed.comments[ply] ?? ''}` });
                setTimeout(() => advance(tries === 0), 900);
            }
            else {
                playSound('bad');
                const t = tries + 1;
                setTries(t);
                if (t >= 2)
                    setReveal(true);
                setMessage({ tone: 'bad', text: t >= 2 ? `Not quite. The move is shown on the board.` : `${m.san} isn’t it. Look for something more forcing.` });
                setTimeout(() => setTryFen(null), 800);
            }
        }
        finally {
            setChecking(false);
        }
    };
    const restart = () => {
        recorded.current = false;
        setPly(0);
        setFound(0);
        setTries(0);
        setReveal(false);
        setMessage(null);
    };
    const fen = tryFen ?? parsed.fens[Math.min(ply, parsed.fens.length - 1)];
    const last = ply > 0 && !tryFen ? [parsed.ucis[ply - 1].slice(0, 2), parsed.ucis[ply - 1].slice(2, 4)] : null;
    const arrows = reveal && atKey ? [{ from: parsed.ucis[ply].slice(0, 2), to: parsed.ucis[ply].slice(2, 4), color: 'y' }] : [];
    const keyIndex = [...keyPlies].sort((a, b) => a - b).indexOf(ply) + 1;
    return (_jsxs("div", { className: "board-screen", children: [_jsx("div", { className: "board-col", children: _jsx(Board, { fen: fen, orientation: winner, movable: atKey && !checking ? winner : null, onMove: onMove, lastMove: last, arrows: arrows }) }), _jsxs("div", { className: "side-col", children: [_jsxs("div", { className: "panel panel-tight", children: [_jsxs("p", { className: "drill-mode", children: ["You are ", winner === 'w' ? game.white : game.black, " \u00B7 key moves found ", found, "/", keyPlies.size] }), atKey ? (_jsxs("p", { className: "drill-prompt mt8", children: [_jsx(Target, { size: 16 }), " Key moment ", keyIndex, " of ", keyPlies.size, ": find the move ", winner === 'w' ? 'White' : 'Black', " played after ", parsed.labels[ply - 1] ?? 'the start', "."] })) : done ? (_jsxs("p", { className: "drill-prompt mt8", children: ["Game over \u2014 ", game.result, "."] })) : (_jsx("p", { className: "muted mt8", children: "Playing through to the next key moment\u2026" })), atKey && !reveal && (_jsxs("button", { className: "link-btn mt8", onClick: () => { setReveal(true); setTries(2); }, children: [_jsx(Eye, { size: 14 }), " Show me"] }))] }), checking && _jsx(Spinner, { label: "Checking your idea\u2026" }), message && _jsx("div", { className: `feedback feedback-${message.tone}`, children: _jsx("span", { children: message.text }) }), !atKey && !done && ply > 0 && parsed.comments[ply - 1] && (_jsxs("div", { className: "commentary", children: [_jsx("span", { className: "commentary-move", children: parsed.labels[ply - 1] }), _jsx("p", { children: parsed.comments[ply - 1] })] })), done && (_jsxs("div", { className: "panel stack", children: [_jsx("h3", { children: found === keyPlies.size ? 'Every key move found.' : `You found ${found} of ${keyPlies.size} key moves.` }), _jsx("ul", { className: "bullets", children: game.lessons.map((l) => _jsx("li", { children: l }, l)) }), _jsxs("div", { className: "row", children: [_jsx(Button, { variant: "secondary", icon: _jsx(RotateCcw, { size: 16 }), onClick: restart, children: "Try again" }), _jsx(Button, { variant: "ghost", onClick: () => navigate('/classics'), children: "More classics" })] })] })), _jsxs("p", { className: "faint small", children: [formatLine(START_FEN, parsed.sans.slice(0, Math.min(ply, 8))), ply > 8 ? ' …' : ''] })] })] }));
}
