import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useMemo, useRef, useState } from 'react';
import { Chess, formatLine, pvToSan, uciOf } from '../lib/chess/core';
import { puzzleStart } from '../lib/puzzles';
import { soundForSan, playSound } from '../lib/sound';
import { Board } from './Board';
/**
 * Plays the opponent's setup move, then asks the user for the solution.
 * Any move that mates is accepted, as on Lichess.
 */
export function PuzzleSolver({ puzzle, onResult, fast, showSolution, hint, }) {
    const start = useMemo(() => puzzleStart(puzzle), [puzzle]);
    const side = start.side;
    const solution = puzzle.moves.slice(1);
    const [fen, setFen] = useState(puzzle.fen);
    const [idx, setIdx] = useState(0);
    const [state, setState] = useState('intro');
    const [last, setLast] = useState(null);
    const [flash, setFlash] = useState(null);
    const done = useRef(false);
    useEffect(() => {
        done.current = false;
        setFen(puzzle.fen);
        setIdx(0);
        setState('intro');
        setLast(null);
        setFlash(null);
        const t = setTimeout(() => {
            setFen(start.fen);
            setLast([start.setup.from, start.setup.to]);
            soundForSan(start.setup.san);
            setState('solving');
        }, fast ? 250 : 650);
        return () => clearTimeout(t);
    }, [puzzle, start, fast]);
    const finish = (ok, wrong) => {
        if (done.current)
            return;
        done.current = true;
        setState(ok ? 'solved' : 'failed');
        playSound(ok ? 'good' : 'bad');
        onResult({ ok, wrong, keyFen: start.fen });
    };
    const onMove = (mv) => {
        if (state !== 'solving')
            return;
        const c = new Chess(fen);
        let m;
        try {
            m = c.move(mv);
        }
        catch {
            return;
        }
        const uci = uciOf(m);
        const expected = solution[idx];
        setFen(c.fen());
        setLast([m.from, m.to]);
        soundForSan(m.san);
        if (uci === expected || c.isCheckmate()) {
            setFlash('good');
            if (c.isCheckmate() || idx + 1 >= solution.length) {
                finish(true);
                return;
            }
            const reply = solution[idx + 1];
            setTimeout(() => {
                const r = c.move({ from: reply.slice(0, 2), to: reply.slice(2, 4), promotion: reply[4] || undefined });
                setFen(c.fen());
                setLast([r.from, r.to]);
                soundForSan(r.san);
                setIdx(idx + 2);
                setFlash(null);
                if (idx + 2 >= solution.length)
                    finish(true);
            }, fast ? 180 : 420);
        }
        else {
            setFlash('bad');
            finish(false, uci);
        }
    };
    // Reveal the full solution on demand
    const solutionSans = useMemo(() => pvToSan(start.fen, solution), [start.fen, solution]);
    useEffect(() => {
        if (!showSolution)
            return;
        let i = 0;
        const c = new Chess(start.fen);
        setFen(start.fen);
        const timer = setInterval(() => {
            if (i >= solution.length) {
                clearInterval(timer);
                return;
            }
            const u = solution[i];
            const m = c.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] || undefined });
            setFen(c.fen());
            setLast([m.from, m.to]);
            soundForSan(m.san);
            i++;
        }, 700);
        return () => clearInterval(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [showSolution]);
    const arrows = [];
    return (_jsxs("div", { className: `puzzle-board${flash ? ` flash-${flash}` : ''}`, children: [_jsx(Board, { fen: fen, orientation: side, movable: state === 'solving' ? side : null, onMove: onMove, lastMove: last, arrows: arrows, hintSquares: hint && state === 'solving' && solution[idx] ? [solution[idx].slice(0, 2)] : undefined }), _jsx("span", { className: "sr-only", "aria-live": "polite", children: state === 'solved' ? 'Solved' : state === 'failed' ? `Not the move. Solution: ${formatLine(start.fen, solutionSans)}` : '' })] }));
}
export function solutionLine(p) {
    const s = puzzleStart(p);
    return formatLine(s.fen, pvToSan(s.fen, p.moves.slice(1)));
}
