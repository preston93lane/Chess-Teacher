import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Eye, Flag, Handshake, Play, RefreshCw, Undo2, Users } from 'lucide-react';
import { BOTS, getBot } from '../lib/bots';
import { TIME_PRESETS, formatClock, remainingNow } from '../lib/clock';
import { chess960Fen, fenOf, fogFor, legalMoves, MODE_INFO, newGame, play, turnOf, variantBotMove } from '../lib/variants';
import { useArena } from '../lib/arenaSession';
import { useApp } from '../lib/store/app';
import { saveGameBody } from '../lib/store/gamesDb';
import { openingFor } from '../lib/openings/eco';
import { navigate, query, useRoute } from '../lib/router';
import { playSound, soundForSan } from '../lib/sound';
import { uid } from '../lib/chess/core';
import { Board } from '../components/Board';
import { Button, Header, IconButton, Section, Segmented } from '../components/ui';
import { toast } from '../components/Toast';
// ---------------------------------------------------------------------------
// Setup
export function ArenaSetup() {
    const path = useRoute();
    const q = query(path);
    const stats = useApp((s) => s.variantStats);
    const live = useArena((s) => s.game);
    const setGame = useArena((s) => s.setGame);
    const [mode, setMode] = useState(q.get('mode') ?? 'chess960');
    const [opponent, setOpponent] = useState(q.get('vs') ?? (q.get('mode') === 'standard' ? 'human' : 'bot'));
    const [botId, setBotId] = useState('l4');
    const [color, setColor] = useState('w');
    const [tcId, setTcId] = useState('none');
    const [table, setTable] = useState(false);
    const [num, setNum] = useState('');
    const effectiveOpponent = mode === 'standard' ? 'human' : opponent;
    const start = () => {
        const n = mode === 'chess960' ? (num.trim() && +num >= 0 && +num < 960 ? Math.floor(+num) : Math.floor(Math.random() * 960)) : undefined;
        const startFen = mode === 'chess960' ? chess960Fen(n) : newGame(mode).startFen;
        const tc = TIME_PRESETS.find((t) => t.id === tcId)?.tc ?? null;
        const config = {
            mode,
            opponent: effectiveOpponent,
            botId: effectiveOpponent === 'bot' ? botId : undefined,
            userColor: color === 'random' ? (Math.random() < 0.5 ? 'w' : 'b') : color,
            tc,
            tableMode: effectiveOpponent === 'human' ? table : false,
            startFen,
            number: n,
        };
        setGame({ id: uid('a'), config, moves: [], status: 'playing', createdAt: Date.now(), clock: tc ? { w: tc.initial, b: tc.initial, running: null, since: null } : undefined });
        navigate('/play/arena/game');
    };
    return (_jsxs("div", { className: "page page-narrow", children: [_jsx(Header, { title: "More ways to play", backTo: "/play", sub: "Chess960, Fog of War, or two players on one device." }), live && live.status === 'playing' && (_jsxs("button", { className: "resume", onClick: () => navigate('/play/arena/game'), children: [_jsx(Play, { size: 18 }), _jsxs("span", { children: [_jsxs("strong", { children: ["Resume your ", MODE_INFO[live.config.mode].name, " game"] }), _jsxs("span", { className: "muted", children: [" \u00B7 move ", Math.ceil(live.moves.length / 2) || 1] })] })] })), _jsxs(Section, { title: "Game", children: [_jsx("div", { className: "mode-cards", children: ['chess960', 'fog', 'standard'].map((m) => (_jsxs("button", { className: `source-card${mode === m ? ' is-on' : ''}`, onClick: () => setMode(m), children: [_jsx("span", { className: "source-title", children: m === 'standard' ? 'Two players' : MODE_INFO[m].name }), _jsx("span", { className: "muted small", children: m === 'standard' ? 'Pass-and-play standard chess on this device, with clocks. Saved to your games for a coach review.' : MODE_INFO[m].blurb }), m !== 'standard' && stats[m] && _jsxs("span", { className: "faint small num", children: ["vs bots: ", stats[m].w, "W \u00B7 ", stats[m].d, "D \u00B7 ", stats[m].l, "L"] })] }, m))) }), _jsx("button", { className: "link-btn mt12", onClick: () => navigate('/clock'), children: "Just need a chess clock for a real board? Open the clock" })] }), mode !== 'standard' && (_jsx(Section, { title: "Opponent", children: _jsx(Segmented, { value: opponent, onChange: setOpponent, options: [{ value: 'bot', label: 'A bot' }, { value: 'human', label: 'A friend (this device)' }] }) })), effectiveOpponent === 'bot' ? (_jsxs(_Fragment, { children: [_jsxs(Section, { title: "Bot strength", children: [_jsx("div", { className: "chip-row", children: BOTS.slice(0, 9).map((b) => (_jsxs("button", { className: `chip${botId === b.id ? ' is-on' : ''}`, onClick: () => setBotId(b.id), children: [b.name, " ", _jsx("span", { className: "num faint", children: b.elo })] }, b.id))) }), mode === 'fog' && _jsx("p", { className: "muted small mt8", children: "Fog bots only use what they can see: they guess where your king is and can be surprised." })] }), _jsx(Section, { title: "You play", children: _jsx(Segmented, { value: color, onChange: setColor, options: [{ value: 'w', label: 'White' }, { value: 'b', label: 'Black' }, { value: 'random', label: 'Random' }] }) })] })) : (_jsxs(Section, { title: "Board", children: [_jsx(Segmented, { value: table ? 'table' : 'flip', onChange: (v) => setTable(v === 'table'), options: [{ value: 'flip', label: 'Turn to the player to move' }, { value: 'table', label: 'Face to face' }] }), _jsxs("p", { className: "muted small mt8", children: [table ? 'Lay the phone flat between you: Black’s pieces are drawn upside down so both of you read them the right way.' : 'The board flips after every move.', mode === 'fog' ? ' In Fog of War, a privacy screen hides the board while you pass the phone.' : ''] })] })), mode === 'chess960' && (_jsx(Section, { title: "Starting position", children: _jsxs("label", { className: "field", children: [_jsx("span", { className: "field-label", children: "Position number (0\u2013959), or leave empty for a random one" }), _jsx("input", { className: "input", inputMode: "numeric", value: num, onChange: (e) => setNum(e.target.value.replace(/\D/g, '').slice(0, 3)), placeholder: "Random" })] }) })), _jsx(Section, { title: "Time control", children: _jsx("div", { className: "chip-row", children: TIME_PRESETS.filter((t) => ['none', '3+2', '5+3', '10+0', '10+5', '15+10'].includes(t.id)).map((t) => (_jsx("button", { className: `chip${tcId === t.id ? ' is-on' : ''}`, onClick: () => setTcId(t.id), children: t.label }, t.id))) }) }), _jsx("div", { className: "sticky-cta", children: _jsxs(Button, { size: "lg", className: "btn-block", icon: effectiveOpponent === 'human' ? _jsx(Users, { size: 18 }) : _jsx(Play, { size: 18 }), onClick: start, children: ["Start ", mode === 'standard' ? 'two-player game' : MODE_INFO[mode].name] }) })] }));
}
// ---------------------------------------------------------------------------
// Game
function replay(startFen, mode, moves) {
    let s = newGame(mode, startFen);
    for (const m of moves) {
        const n = play(s, m);
        if (!n)
            break;
        s = n;
    }
    return s;
}
function charge(clock, mover, tc, now = Date.now()) {
    const elapsed = clock.running === mover && clock.since ? now - clock.since : 0;
    const base = clock.running === mover ? clock[mover] - elapsed : clock[mover];
    const next = mover === 'w' ? 'b' : 'w';
    return { ...clock, [mover]: Math.max(0, base) + tc.increment, running: next, since: now };
}
export function ArenaGameScreen() {
    const game = useArena((s) => s.game);
    if (!game) {
        return (_jsxs("div", { className: "page", children: [_jsx(Header, { title: "Game", backTo: "/play/arena" }), _jsx("p", { className: "muted", children: "No game in progress." }), _jsx(Button, { onClick: () => navigate('/play/arena'), children: "Set one up" })] }));
    }
    return _jsx(ArenaBoard, {}, game.id);
}
function ArenaBoard() {
    const game = useArena((s) => s.game);
    const patch = useArena((s) => s.patch);
    const recordVariant = useApp((s) => s.recordVariant);
    const addGame = useApp((s) => s.addGame);
    const { config } = game;
    const state = useMemo(() => replay(config.startFen, config.mode, game.moves), [config.startFen, config.mode, game.moves]);
    const turn = turnOf(state);
    const vsBot = config.opponent === 'bot';
    const bot = vsBot ? getBot(config.botId ?? 'l4') : null;
    const botColor = config.userColor === 'w' ? 'b' : 'w';
    const [now, setNow] = useState(Date.now());
    const [shield, setShield] = useState(false);
    const thinking = useRef(null);
    const ended = game.status === 'ended';
    // Viewer: whose eyes the board is drawn for.
    const viewer = vsBot ? config.userColor : config.tableMode ? 'w' : turn;
    const orientation = vsBot ? config.userColor : config.tableMode ? 'w' : turn;
    const fogColor = vsBot ? config.userColor : turn;
    const fog = useMemo(() => (config.mode === 'fog' && !ended ? fogFor(state, fogColor) : []), [config.mode, ended, state, fogColor]);
    const moves = useMemo(() => legalMoves(state), [state]);
    const placement = fenOf(state.pos).split(' ');
    const displayFen = `${placement[0]} ${placement[1]} - - 0 1`;
    const last = state.plies[state.plies.length - 1];
    const finish = useCallback(async (result, reason, moveList = game.moves) => {
        const cur = useArena.getState().game;
        if (!cur || cur.status === 'ended')
            return;
        patch({ status: 'ended', result, reason, clock: cur.clock ? { ...cur.clock, running: null, since: null } : undefined });
        playSound('end');
        if (vsBot && config.mode !== 'standard') {
            const won = (result === '1-0' && config.userColor === 'w') || (result === '0-1' && config.userColor === 'b');
            recordVariant(config.mode, result === '1/2-1/2' ? 'd' : won ? 'w' : 'l');
        }
        if (config.opponent === 'human' && config.mode === 'standard' && moveList.length >= 4) {
            // Two-player standard games go to your games for a coach review.
            const s = replay(config.startFen, config.mode, moveList);
            const sans = s.plies.map((p) => p.san);
            const opening = await openingFor(sans).catch(() => undefined);
            const date = new Date(cur.createdAt).toISOString().slice(0, 10);
            await saveGameBody({ id: cur.id, headers: { Event: 'Over-the-board game', Date: date.replace(/-/g, '.'), White: 'White', Black: 'Black', Result: result, Termination: reason }, startFen: config.startFen, sans });
            addGame({ id: cur.id, createdAt: cur.createdAt, white: 'White player', black: 'Black player', result, myColor: null, source: 'local', opening: opening?.name, eco: opening?.eco, plies: sans.length, date });
            toast('Saved to Games — open it there for a coach review.');
        }
    }, [game.moves, patch, vsBot, config, recordVariant, addGame]);
    const doMove = useCallback((m) => {
        const cur = useArena.getState().game;
        if (!cur || cur.status !== 'playing')
            return false;
        const s = replay(cur.config.startFen, cur.config.mode, cur.moves);
        const next = play(s, m);
        if (!next)
            return false;
        const mover = turnOf(s);
        const ply = next.plies[next.plies.length - 1];
        soundForSan(ply.san);
        const moveList = [...cur.moves, { from: ply.from, to: ply.to, promotion: ply.uci[4] }];
        const tc = cur.config.tc;
        let clock = cur.clock;
        if (tc && clock)
            clock = moveList.length >= 2 ? charge(clock, mover, tc) : { ...clock, running: moveList.length === 1 ? 'b' : null, since: moveList.length === 1 ? Date.now() : null };
        patch({ moves: moveList, clock });
        if (next.result)
            void finish(next.result, next.reason ?? '', moveList);
        else if (cur.config.opponent === 'human' && cur.config.mode === 'fog')
            setShield(true);
        return true;
    }, [patch, finish]);
    // Bot moves
    useEffect(() => {
        if (!vsBot || ended || turn !== botColor || !bot)
            return;
        const key = `${game.moves.length}`;
        if (thinking.current === key)
            return;
        thinking.current = key;
        const t0 = Date.now();
        (async () => {
            const mv = await variantBotMove(state, bot);
            const remaining = game.clock ? remainingNow(game.clock, botColor) : 0;
            const budget = config.tc ? Math.min(Math.max(400, remaining / 40), 2500 + Math.random() * 1500) : 400 + Math.random() * 600;
            const wait = budget - (Date.now() - t0);
            if (wait > 0)
                await new Promise((r) => setTimeout(r, wait));
            if (useArena.getState().game?.moves.length !== game.moves.length)
                return;
            if (mv)
                doMove(mv);
        })().finally(() => {
            thinking.current = null;
        });
    }, [vsBot, ended, turn, botColor, bot, state, game.moves.length, game.clock, config.tc, doMove]);
    // Clock ticks and flags
    useEffect(() => {
        if (!config.tc || ended || !game.clock?.running)
            return;
        const id = setInterval(() => {
            const t = Date.now();
            setNow(t);
            const ck = useArena.getState().game?.clock;
            if (ck?.running && remainingNow(ck, ck.running, t) <= 0) {
                void finish(ck.running === 'w' ? '0-1' : '1-0', `${ck.running === 'w' ? 'White' : 'Black'} ran out of time`);
            }
        }, 200);
        return () => clearInterval(id);
    }, [config.tc, ended, game.clock?.running, finish]);
    const canMove = !ended && !shield && (vsBot ? turn === config.userColor : true);
    const takeBack = () => {
        const n = vsBot ? (turn === config.userColor ? 2 : 1) : 1;
        if (game.moves.length < n)
            return;
        patch({ moves: game.moves.slice(0, game.moves.length - n) });
    };
    const resign = (side) => void finish(side === 'w' ? '0-1' : '1-0', `${side === 'w' ? 'White' : 'Black'} resigned`);
    const clockFor = (c) => (game.clock ? remainingNow(game.clock, c, now) : 0);
    const top = orientation === 'w' ? 'b' : 'w';
    const name = (c) => (vsBot ? (c === config.userColor ? 'You' : `${bot.name} ${bot.elo}`) : c === 'w' ? 'White' : 'Black');
    const strip = (c) => (_jsxs("div", { className: `player-strip${turn === c && !ended ? ' is-turn' : ''}${config.tableMode && c === 'b' ? ' is-flipped' : ''}`, children: [_jsx("span", { className: `pill-color pill-${c}` }), _jsx("span", { className: "player-name", children: name(c) }), config.tc && _jsx("span", { className: `clock${game.clock?.running === c ? ' is-active' : ''}${clockFor(c) < 20000 ? ' is-low' : ''}`, children: formatClock(clockFor(c)) })] }));
    return (_jsxs("div", { className: "page board-screen-page", children: [_jsx(Header, { title: config.mode === 'standard' ? 'Two players' : MODE_INFO[config.mode].name, backTo: "/play/arena", sub: config.mode === 'chess960' && config.number !== undefined ? `Position #${config.number}` : config.mode === 'fog' ? 'No check — capture the king to win' : undefined }), _jsxs("div", { className: "board-screen", children: [_jsxs("div", { className: "board-col", children: [strip(top), _jsxs("div", { className: "arena-board", children: [_jsx(Board, { fen: displayFen, orientation: orientation, movable: canMove ? turn : null, onMove: (m) => doMove({ from: m.from, to: m.to, promotion: m.promotion }), legalMoves: moves, lastMove: last && (config.mode !== 'fog' || last.color === viewer || !fog.includes(last.to)) ? [last.from, last.to] : null, fog: fog, noCheck: config.mode === 'fog', rotateColor: config.tableMode ? 'b' : null }), shield && !ended && (_jsxs("button", { className: "pass-shield", onClick: () => setShield(false), children: [_jsx(Eye, { size: 28 }), _jsxs("strong", { children: [turn === 'w' ? 'White' : 'Black', " to move"] }), _jsx("span", { children: "Pass the phone, then tap to reveal your view." })] }))] }), strip(orientation), _jsxs("div", { className: "controls", children: [_jsxs("div", { className: "controls-group", children: [_jsx(IconButton, { label: "Take back", onClick: takeBack, disabled: ended || !game.moves.length, children: _jsx(Undo2, {}) }), !vsBot && !ended && _jsx(IconButton, { label: "Agree a draw", onClick: () => void finish('1/2-1/2', 'Draw agreed'), children: _jsx(Handshake, {}) }), _jsx(IconButton, { label: vsBot ? 'Resign' : `${turn === 'w' ? 'White' : 'Black'} resigns`, onClick: () => resign(vsBot ? config.userColor : turn), disabled: ended, children: _jsx(Flag, {}) })] }), _jsxs("div", { className: "controls-group", children: [config.mode === 'fog' && ended && _jsx("span", { className: "muted small", children: "Fog lifted" }), _jsx(IconButton, { label: "New game", onClick: () => navigate('/play/arena'), children: _jsx(RefreshCw, {}) })] })] })] }), _jsxs("div", { className: "side-col", children: [ended ? (_jsxs("div", { className: "panel stack", children: [_jsx("h2", { children: game.result === '1/2-1/2' ? 'Draw' : game.result === '1-0' ? 'White wins' : 'Black wins' }), _jsx("p", { className: "muted", children: game.reason }), _jsx("div", { className: "row", children: _jsx(Button, { onClick: () => navigate('/play/arena'), children: "Play again" }) })] })) : (_jsx("div", { className: "panel panel-tight", children: _jsx("p", { className: "muted small", children: MODE_INFO[config.mode].blurb }) })), _jsx("div", { className: "panel panel-tight arena-moves", children: state.plies.length === 0 ? (_jsx("span", { className: "muted small", children: "No moves yet." })) : (state.plies.map((p, i) => (_jsxs("span", { className: "arena-move num", children: [i % 2 === 0 && _jsxs("span", { className: "faint", children: [i / 2 + 1, "."] }), config.mode === 'fog' && !ended && p.color !== fogColor ? '???' : p.san] }, i)))) })] })] })] }));
}
