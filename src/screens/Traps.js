import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, Eye } from 'lucide-react';
import { Chess } from '../lib/chess/core';
import { parseMovetext } from '../lib/chess/pgn';
import { allTraps } from '../data/traps';
import { useApp } from '../lib/store/app';
import { playSound, soundForSan } from '../lib/sound';
import { Board } from '../components/Board';
import { Button, Header, NextDock } from '../components/ui';
export function TrapTrainer() {
    const traps = useMemo(() => allTraps().sort(() => Math.random() - 0.5), []);
    const [i, setI] = useState(0);
    const [score, setScore] = useState({ ok: 0, n: 0 });
    return _jsx(TrapRound, { t: traps[i % traps.length], total: traps.length, score: score, onResult: (ok) => setScore((s) => ({ ok: s.ok + (ok ? 1 : 0), n: s.n + 1 })), onNext: () => setI(i + 1) }, i);
}
function TrapRound({ t, total, score, onResult, onNext }) {
    const logActivity = useApp((s) => s.logActivity);
    const [stage, setStage] = useState('find');
    const [tries, setTries] = useState(0);
    const sans = useMemo(() => parseMovetext(t.pgn).sans.map((x) => x.san), [t]);
    const keyIdx = sans.indexOf(t.key);
    const fens = useMemo(() => {
        const c = new Chess();
        const out = [c.fen()];
        const moves = [];
        for (const s of sans) {
            const m = c.move(s);
            moves.push([m.from, m.to]);
            out.push(c.fen());
        }
        return { out, moves };
    }, [sans]);
    const [shown, setShown] = useState(keyIdx);
    // After the key move, play the rest of the trap out.
    useEffect(() => {
        if (stage !== 'play')
            return;
        if (shown >= sans.length) {
            setStage('done');
            return;
        }
        const id = setTimeout(() => {
            soundForSan(sans[shown]);
            setShown(shown + 1);
        }, 700);
        return () => clearTimeout(id);
    }, [stage, shown, sans]);
    const side = keyIdx % 2 === 0 ? 'w' : 'b';
    const onMove = (m) => {
        if (stage !== 'find')
            return;
        let san;
        try {
            san = new Chess(fens.out[keyIdx]).move(m).san;
        }
        catch {
            return;
        }
        if (san === t.key) {
            playSound('good');
            onResult(tries === 0);
            setShown(keyIdx + 1);
            setStage('play');
            logActivity('puzzles');
        }
        else {
            playSound('bad');
            setTries(tries + 1);
        }
    };
    const reveal = () => {
        onResult(false);
        setShown(keyIdx);
        setStage('play');
    };
    const arrows = stage === 'find' && tries >= 2 ? [{ from: fens.moves[keyIdx][0], to: fens.moves[keyIdx][1], color: 'y' }] : [];
    const moveText = sans.slice(0, keyIdx).map((s, j) => (j % 2 === 0 ? `${j / 2 + 1}.${s}` : s)).join(' ');
    return (_jsxs("div", { className: "page board-screen-page", children: [_jsx(Header, { title: "Opening traps", backTo: "/courses/traps", sub: `${t.name} · ${t.opening}` }), _jsxs("div", { className: "board-screen", children: [_jsx("div", { className: "board-col", children: _jsx(Board, { fen: fens.out[shown], orientation: side, movable: stage === 'find' ? side : null, onMove: onMove, lastMove: shown > 0 ? fens.moves[shown - 1] : null, arrows: arrows }) }), _jsxs("div", { className: "side-col", children: [_jsxs("div", { className: "panel stack", children: [_jsx("p", { className: "muted small num", children: moveText }), stage === 'find' ? (_jsxs(_Fragment, { children: [_jsxs("p", { className: "drill-prompt", children: [side === 'w' ? 'White' : 'Black', " to move: spring the trap."] }), tries > 0 && _jsx("p", { className: "tone-text-mistake small", children: tries >= 2 ? 'Here’s a hint (yellow arrow).' : 'Not that one — look for the forcing idea.' }), _jsxs("button", { className: "link-btn", onClick: reveal, children: [_jsx(Eye, { size: 14 }), " Show me"] })] })) : (_jsxs(_Fragment, { children: [_jsxs("p", { className: "drill-prompt", children: [t.key, t.key.endsWith('#') ? '' : '!', " ", stage === 'done' ? '' : 'Watch how it ends…'] }), stage === 'done' && _jsx("p", { children: t.text }), stage === 'done' && _jsx(NextDock, { children: _jsx(Button, { icon: _jsx(ArrowRight, { size: 16 }), onClick: onNext, children: "Next trap" }) })] }))] }), _jsxs("p", { className: "muted small num", children: ["Found first time: ", score.ok, "/", score.n, " \u00B7 ", total, " traps in the set"] })] })] })] }));
}
