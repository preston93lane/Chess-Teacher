import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { createPortal } from 'react-dom';
import { useEffect, useRef, useState } from 'react';
import { Pause, Play, RotateCcw, Settings2, X } from 'lucide-react';
import { formatClock } from '../lib/clock';
import { playSound } from '../lib/sound';
import { navigate } from '../lib/router';
import { Button, Sheet } from '../components/ui';
const PRESETS = [
    ['1+0', 1, 0], ['3+0', 3, 0], ['3+2', 3, 2], ['5+0', 5, 0], ['5+3', 5, 3], ['10+0', 10, 0], ['10+5', 10, 5], ['15+10', 15, 10], ['25+10', 25, 10], ['30+0', 30, 0], ['60+30', 60, 30], ['90+30', 90, 30],
];
/** A chess clock for over-the-board games: tap your side after you move. */
export function ChessClock() {
    const [minutes, setMinutes] = useState(5);
    const [inc, setInc] = useState(3);
    const [time, setTime] = useState({ top: 5 * 60000, bottom: 5 * 60000 });
    const [running, setRunning] = useState(null);
    const [paused, setPaused] = useState(false);
    const [moves, setMoves] = useState({ top: 0, bottom: 0 });
    const [flag, setFlag] = useState(null);
    const [setup, setSetup] = useState(false);
    const since = useRef(null);
    const [, tick] = useState(0);
    const reset = (m = minutes, i = inc) => {
        setMinutes(m);
        setInc(i);
        setTime({ top: m * 60000, bottom: m * 60000 });
        setRunning(null);
        setPaused(false);
        setMoves({ top: 0, bottom: 0 });
        setFlag(null);
        since.current = null;
    };
    const left = (side) => (running === side && !paused && since.current ? time[side] - (Date.now() - since.current) : time[side]);
    useEffect(() => {
        if (!running || paused || flag)
            return;
        const id = setInterval(() => {
            tick((t) => t + 1);
            if (left(running) <= 0) {
                setFlag(running);
                setTime((t) => ({ ...t, [running]: 0 }));
                setRunning(null);
                playSound('end');
            }
        }, 100);
        return () => clearInterval(id);
    });
    // Keep the screen awake while a game is running, where supported.
    useEffect(() => {
        let lock = null;
        const nav = navigator;
        if (running && !paused && nav.wakeLock)
            nav.wakeLock.request('screen').then((l) => (lock = l)).catch(() => { });
        return () => {
            lock?.release().catch(() => { });
        };
    }, [running, paused]);
    const press = (side) => {
        if (flag)
            return;
        if (running && running !== side)
            return; // only the player whose clock runs can stop it
        const other = side === 'top' ? 'bottom' : 'top';
        const now = Date.now();
        if (running === side && since.current) {
            const remaining = time[side] - (now - since.current) + inc * 1000;
            setTime((t) => ({ ...t, [side]: remaining }));
            setMoves((m) => ({ ...m, [side]: m[side] + 1 }));
        }
        since.current = now;
        setRunning(other);
        setPaused(false);
        playSound('move');
    };
    const togglePause = () => {
        if (!running)
            return;
        if (paused) {
            since.current = Date.now();
            setPaused(false);
        }
        else {
            setTime((t) => ({ ...t, [running]: left(running) }));
            setPaused(true);
        }
    };
    const face = (side) => {
        const ms = Math.max(0, left(side));
        return (_jsxs("button", { className: `cc-face cc-${side}${running === side && !paused ? ' is-running' : ''}${flag === side ? ' is-flag' : ''}${ms < 10000 && ms > 0 ? ' is-low' : ''}`, onClick: () => press(side), "aria-label": `${side === 'top' ? 'Top' : 'Bottom'} player: ${formatClock(ms)}. Tap after your move.`, children: [_jsx("span", { className: "cc-time num", children: formatClock(ms) }), _jsx("span", { className: "cc-meta", children: flag === side ? 'Flag fell' : `${moves[side]} move${moves[side] === 1 ? '' : 's'}` })] }));
    };
    return createPortal(_jsxs("div", { className: "cc", children: [face('top'), _jsxs("div", { className: "cc-bar", children: [_jsx("button", { className: "cc-btn", "aria-label": "Close", onClick: () => navigate('/play/arena'), children: _jsx(X, { size: 22 }) }), _jsx("button", { className: "cc-btn", "aria-label": "Settings", onClick: () => setSetup(true), children: _jsx(Settings2, { size: 22 }) }), _jsxs("span", { className: "cc-tc num", children: [minutes, "+", inc] }), _jsx("button", { className: "cc-btn", "aria-label": paused ? 'Resume' : 'Pause', onClick: togglePause, disabled: !running, children: paused || !running ? _jsx(Play, { size: 22 }) : _jsx(Pause, { size: 22 }) }), _jsx("button", { className: "cc-btn", "aria-label": "Reset", onClick: () => reset(), children: _jsx(RotateCcw, { size: 22 }) })] }), face('bottom'), _jsxs(Sheet, { open: setup, onClose: () => setSetup(false), title: "Time control", children: [_jsx("div", { className: "chip-row", children: PRESETS.map(([label, m, i]) => (_jsx("button", { className: `chip${minutes === m && inc === i ? ' is-on' : ''}`, onClick: () => { reset(m, i); setSetup(false); }, children: label }, label))) }), _jsxs("div", { className: "sync-grid mt16", children: [_jsxs("label", { className: "field", children: [_jsx("span", { className: "field-label", children: "Minutes" }), _jsx("input", { className: "input", inputMode: "numeric", value: minutes, onChange: (e) => setMinutes(Math.max(1, Math.min(180, +e.target.value.replace(/\D/g, '') || 1))) })] }), _jsxs("label", { className: "field", children: [_jsx("span", { className: "field-label", children: "Increment (seconds)" }), _jsx("input", { className: "input", inputMode: "numeric", value: inc, onChange: (e) => setInc(Math.min(60, +e.target.value.replace(/\D/g, '') || 0)) })] })] }), _jsx("div", { className: "row mt16", children: _jsx(Button, { onClick: () => { reset(); setSetup(false); }, children: "Set clock" }) })] })] }), document.body);
}
