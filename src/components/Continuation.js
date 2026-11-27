import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Pause, Play, Telescope } from 'lucide-react';
import { Chess } from '../lib/chess/core';
import { annotateLine } from '../lib/coach/followup';
import { engine } from '../lib/engine/stockfish';
import { lineScore } from '../lib/coach/eval';
import { loadExplorer } from '../lib/explorer';
import { fenAt, masterContinuation } from '../lib/repTrainer';
import { Board } from './Board';
import { IconButton, Spinner } from './ui';
const PLIES = 8;
/**
 * Past the end of your prepared line: the next few moves as masters (or the
 * engine) play them, with a coach note on each and where the position stands.
 */
export function ContinuationPanel({ path, side, first, title }) {
    const [data, setData] = useState(null);
    const [step, setStep] = useState(0);
    const [auto, setAuto] = useState(false);
    const fen = fenAt(path);
    useEffect(() => {
        let alive = true;
        (async () => {
            await loadExplorer().catch(() => null);
            let ucis = masterContinuation(path, PLIES, first);
            const fromMasters = ucis.length;
            // Fill up with the engine's line where the database runs out.
            if (ucis.length < PLIES) {
                const c = new Chess(fen);
                for (const u of ucis)
                    c.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] });
                if (!c.isGameOver()) {
                    const r = await engine.analyze(c.fen(), { depth: 14, multipv: 1 }).catch(() => null);
                    ucis = [...ucis, ...(r?.lines[0]?.pv ?? []).slice(0, PLIES - ucis.length)];
                }
            }
            const plies = annotateLine(fen, ucis, PLIES);
            const end = plies.length ? plies[plies.length - 1].fenAfter : fen;
            const ev = await engine.analyze(end, { depth: 14, multipv: 1 }).catch(() => null);
            const s = lineScore(ev?.lines[0]);
            let verdict = '';
            if (s) {
                const white = s.mate !== undefined ? (s.mate > 0 ? 99 : -99) : (s.cp ?? 0) / 100;
                const mine = side === 'w' ? white : -white;
                verdict = mine >= 1.5 ? 'You come out clearly better.' : mine >= 0.4 ? 'You keep a pleasant edge.' : mine > -0.4 ? 'The position is balanced — a game to play.' : mine > -1.5 ? 'Your opponent has a small edge; know your plan.' : 'Careful: this ends up worse for you.';
                if (s.mate === undefined)
                    verdict += ` (engine ${white >= 0 ? '+' : '−'}${Math.abs(white).toFixed(1)})`;
            }
            if (alive) {
                setData({ plies, source: fromMasters >= ucis.length ? 'masters' : fromMasters > 0 ? 'mixed' : 'engine', verdict });
                setStep(0);
            }
        })();
        return () => {
            alive = false;
        };
    }, [path.join(' '), first]); // eslint-disable-line react-hooks/exhaustive-deps
    const plies = data?.plies ?? [];
    useEffect(() => {
        if (!auto)
            return;
        if (step >= plies.length) {
            setAuto(false);
            return;
        }
        const id = setTimeout(() => setStep((s) => s + 1), 1000);
        return () => clearTimeout(id);
    }, [auto, step, plies.length]);
    if (!data)
        return _jsx("div", { className: "panel followup", children: _jsx(Spinner, { label: "Looking further down the line\u2026" }) });
    if (!plies.length)
        return null;
    const cur = plies[step - 1];
    return (_jsxs("div", { className: "panel followup stack", children: [_jsxs("h3", { className: "followup-title", children: [_jsx(Telescope, { size: 18, className: "inline-icon" }), " ", title ?? 'Where it goes next'] }), _jsxs("p", { className: "muted small", children: [data.source === 'masters' ? 'The most common moves in master games' : data.source === 'mixed' ? 'Master games, then the engine’s line' : 'The engine’s main line', " \u2014 not part of your repertoire yet, just so you know the plans."] }), _jsxs("div", { className: "followup-body", children: [_jsxs("div", { className: "followup-board", children: [_jsx(Board, { fen: cur?.fenAfter ?? fen, orientation: side, lastMove: cur ? [cur.from, cur.to] : null }), _jsxs("div", { className: "controls", children: [_jsxs("div", { className: "controls-group", children: [_jsx(IconButton, { label: "Back", onClick: () => setStep(Math.max(0, step - 1)), disabled: step === 0, children: _jsx(ChevronLeft, {}) }), _jsx(IconButton, { label: auto ? 'Pause' : 'Play the line', onClick: () => { if (step >= plies.length)
                                                    setStep(0); setAuto(!auto); }, children: auto ? _jsx(Pause, {}) : _jsx(Play, {}) }), _jsx(IconButton, { label: "Forward", onClick: () => setStep(Math.min(plies.length, step + 1)), disabled: step >= plies.length, children: _jsx(ChevronRight, {}) })] }), _jsxs("span", { className: "muted small num", children: [step, "/", plies.length] })] })] }), _jsxs("div", { className: "followup-text", children: [_jsx("p", { className: "followup-line num", children: plies.map((p, i) => {
                                    const no = p.fenBefore.split(' ')[5];
                                    const num = p.color === 'w' ? `${no}.` : i === 0 ? `${no}…` : '';
                                    return (_jsxs("button", { className: `followup-move${i + 1 === step ? ' is-on' : ''}`, onClick: () => { setStep(i + 1); setAuto(false); }, children: [num, p.san] }, i));
                                }) }), cur ? _jsx("p", { className: "followup-note", children: cur.note || '—' }) : _jsx("p", { className: "muted small", children: "Step through the moves." }), data.verdict && step >= plies.length && _jsx("p", { children: _jsx("strong", { children: data.verdict }) })] })] })] }));
}
