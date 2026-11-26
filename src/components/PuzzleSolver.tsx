import { useEffect, useMemo, useRef, useState } from 'react';
import { Chess, formatLine, pvToSan, uciOf, type Color, type PieceSymbol, type Square } from '../lib/chess/core';
import { puzzleStart, type Puzzle } from '../lib/puzzles';
import { soundForSan, playSound } from '../lib/sound';
import { Board, type Arrow } from './Board';

export type SolveState = 'intro' | 'solving' | 'solved' | 'failed';

export interface SolveResult {
  ok: boolean;
  /** The first wrong move, if any (UCI). */
  wrong?: string;
  /** Position where the user had to find the key move. */
  keyFen: string;
}

/**
 * Plays the opponent's setup move, then asks the user for the solution.
 * Any move that mates is accepted, as on Lichess.
 */
export function PuzzleSolver({
  puzzle,
  onResult,
  fast,
  showSolution,
  hint,
}: {
  puzzle: Puzzle;
  onResult: (r: SolveResult) => void;
  /** Rush mode: shorter animations, no retry. */
  fast?: boolean;
  showSolution?: boolean;
  hint?: boolean;
}) {
  const start = useMemo(() => puzzleStart(puzzle), [puzzle]);
  const side: Color = start.side;
  const solution = puzzle.moves.slice(1);
  const [fen, setFen] = useState(puzzle.fen);
  const [idx, setIdx] = useState(0);
  const [state, setState] = useState<SolveState>('intro');
  const [last, setLast] = useState<[string, string] | null>(null);
  const [flash, setFlash] = useState<'good' | 'bad' | null>(null);
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

  const finish = (ok: boolean, wrong?: string) => {
    if (done.current) return;
    done.current = true;
    setState(ok ? 'solved' : 'failed');
    playSound(ok ? 'good' : 'bad');
    onResult({ ok, wrong, keyFen: start.fen });
  };

  const onMove = (mv: { from: Square; to: Square; promotion?: PieceSymbol }) => {
    if (state !== 'solving') return;
    const c = new Chess(fen);
    let m;
    try {
      m = c.move(mv);
    } catch {
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
        const r = c.move({ from: reply.slice(0, 2), to: reply.slice(2, 4), promotion: (reply[4] as PieceSymbol) || undefined });
        setFen(c.fen());
        setLast([r.from, r.to]);
        soundForSan(r.san);
        setIdx(idx + 2);
        setFlash(null);
        if (idx + 2 >= solution.length) finish(true);
      }, fast ? 180 : 420);
    } else {
      setFlash('bad');
      finish(false, uci);
    }
  };

  // Reveal the full solution on demand
  const solutionSans = useMemo(() => pvToSan(start.fen, solution), [start.fen, solution]);
  useEffect(() => {
    if (!showSolution) return;
    let i = 0;
    const c = new Chess(start.fen);
    setFen(start.fen);
    const timer = setInterval(() => {
      if (i >= solution.length) {
        clearInterval(timer);
        return;
      }
      const u = solution[i];
      const m = c.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: (u[4] as PieceSymbol) || undefined });
      setFen(c.fen());
      setLast([m.from, m.to]);
      soundForSan(m.san);
      i++;
    }, 700);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showSolution]);

  const arrows: Arrow[] = [];

  return (
    <div className={`puzzle-board${flash ? ` flash-${flash}` : ''}`}>
      <Board
        fen={fen}
        orientation={side}
        movable={state === 'solving' ? side : null}
        onMove={onMove}
        lastMove={last}
        arrows={arrows}
        hintSquares={hint && state === 'solving' && solution[idx] ? [solution[idx].slice(0, 2)] : undefined}
      />
      <span className="sr-only" aria-live="polite">
        {state === 'solved' ? 'Solved' : state === 'failed' ? `Not the move. Solution: ${formatLine(start.fen, solutionSans)}` : ''}
      </span>
    </div>
  );
}

export function solutionLine(p: Puzzle) {
  const s = puzzleStart(p);
  return formatLine(s.fen, pvToSan(s.fen, p.moves.slice(1)));
}
