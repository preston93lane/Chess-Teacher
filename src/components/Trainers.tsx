import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Check, Eye, RotateCcw, X } from 'lucide-react';
import { Chess, formatLine, fenKey, pvToSan, uciOf, type Color, type PieceSymbol, type Square } from '../lib/chess/core';
import { getOpening, parseLine, allLines, studentPlies } from '../lib/openings/book';
import { engine } from '../lib/engine/stockfish';
import { lineScore, winPct } from '../lib/coach/eval';
import { describeMove } from '../lib/coach/explain';
import { soundForSan, playSound } from '../lib/sound';
import type { PuzzleCard } from '../lib/store/app';
import { FollowUpPanel } from './FollowUp';
import { Board, type Arrow } from './Board';
import { MoveList } from './MoveList';
import { Button, Spinner } from './ui';

export interface DrillResult {
  mistakes: number;
  hints: number;
  weakPlies: number[];
}

/** Plays through an opening line. In "learn" mode the moves are shown; in "drill" mode you recall them. */
export function LineDrill({
  openingId,
  lineId,
  side,
  mode,
  onDone,
  focusPlies,
}: {
  openingId: string;
  lineId: string;
  side: Color;
  mode: 'learn' | 'drill';
  onDone: (r: DrillResult) => void;
  focusPlies?: number[];
}) {
  const opening = getOpening(openingId)!;
  const line = useMemo(() => parseLine(opening, lineId), [opening, lineId]);
  const [ply, setPly] = useState(0);
  const [wrong, setWrong] = useState(0);
  const [mistakes, setMistakes] = useState<number[]>([]);
  const [hints, setHints] = useState(0);
  const [reveal, setReveal] = useState(false);
  const [feedback, setFeedback] = useState<{ tone: 'good' | 'bad' | 'info'; text: string } | null>(null);
  const [orientation] = useState<Color>(side);
  const [done, setDone] = useState(false);
  const finished = useRef(false);
  const total = line.sans.length;
  const fen = line.fens[ply];
  const turn = fen.split(' ')[1] as Color;
  const studentTurn = turn === side && ply < total;
  const myPlies = useMemo(() => studentPlies(line, side), [line, side]);

  // auto-play opponent moves
  useEffect(() => {
    if (ply >= total) {
      if (!finished.current) {
        finished.current = true;
        setDone(true);
        playSound('end');
        onDone({ mistakes: mistakes.length, hints, weakPlies: mistakes });
      }
      return;
    }
    if (studentTurn) return;
    const t = setTimeout(() => {
      soundForSan(line.sans[ply]);
      setPly((p) => p + 1);
    }, mode === 'learn' ? 750 : 420);
    return () => clearTimeout(t);
  }, [ply, total, studentTurn, line.sans, mode, mistakes, hints, onDone]);

  const onMove = useCallback(
    (mv: { from: Square; to: Square; promotion?: PieceSymbol }) => {
      if (!studentTurn) return;
      const c = new Chess(fen);
      let m;
      try {
        m = c.move(mv);
      } catch {
        return;
      }
      const expected = line.sans[ply];
      if (m.san === expected) {
        soundForSan(m.san);
        setFeedback(wrong === 0 && !reveal ? { tone: 'good', text: `${m.san} — correct.` } : { tone: 'info', text: `${m.san}. Keep going.` });
        setWrong(0);
        setReveal(false);
        setPly(ply + 1);
        return;
      }
      // Another theory move from this opening?
      const alt = allLines(opening).find((l) => l.lineId !== lineId && l.fens.some((f, i) => i < l.sans.length && fenKey(f) === fenKey(fen) && l.sans[i] === m!.san));
      playSound('bad');
      if (alt) {
        setFeedback({ tone: 'info', text: `${m.san} is theory too (${alt.name}), but this line continues differently. Try again.` });
        return;
      }
      if (!mistakes.includes(ply)) setMistakes([...mistakes, ply]);
      const n = wrong + 1;
      setWrong(n);
      if (n >= 2) setReveal(true);
      setFeedback({ tone: 'bad', text: n >= 2 ? `The line continues ${expected}. Play it to continue.` : `${m.san} is not the move in this line. Try again.` });
    },
    [studentTurn, fen, line, ply, wrong, reveal, mistakes, opening, lineId],
  );

  const showHint = () => {
    setReveal(true);
    setHints(hints + 1);
    if (!mistakes.includes(ply)) setMistakes([...mistakes, ply]);
  };

  const restart = () => {
    finished.current = false;
    setDone(false);
    setPly(0);
    setWrong(0);
    setMistakes([]);
    setHints(0);
    setReveal(false);
    setFeedback(null);
  };

  const expectedUci = ply < total ? line.ucis[ply] : null;
  const arrows: Arrow[] =
    studentTurn && expectedUci && (mode === 'learn' || reveal)
      ? [{ from: expectedUci.slice(0, 2), to: expectedUci.slice(2, 4), color: 'g' }]
      : [];
  const lastIdx = ply - 1;
  const lastMove = lastIdx >= 0 ? [line.ucis[lastIdx].slice(0, 2), line.ucis[lastIdx].slice(2, 4)] as [string, string] : null;
  const comment = lastIdx >= 0 ? line.comments[lastIdx] : line.intro;
  const upcoming = studentTurn && mode === 'learn' ? line.comments[ply] : undefined;
  const myDone = myPlies.filter((p) => p < ply).length;
  const focus = focusPlies?.includes(ply) && studentTurn;

  return (
    <div className="board-screen">
      <div className="board-col">
        <Board
          fen={fen}
          orientation={orientation}
          movable={studentTurn && !done ? side : null}
          onMove={onMove}
          lastMove={lastMove}
          arrows={arrows}
        />
        <div className="drill-progress">
          <div className="meter"><div className="meter-fill" style={{ width: `${(myDone / Math.max(1, myPlies.length)) * 100}%` }} /></div>
          <span className="muted small num">{myDone}/{myPlies.length} moves</span>
        </div>
      </div>
      <div className="side-col">
        <div className="drill-head">
          <p className="drill-mode">{mode === 'learn' ? 'Learn' : 'Recall'} · playing {side === 'w' ? 'White' : 'Black'}</p>
          <h2>{line.name}</h2>
        </div>
        {feedback && (
          <div className={`feedback feedback-${feedback.tone}`} role="status">
            {feedback.tone === 'good' ? <Check size={18} /> : feedback.tone === 'bad' ? <X size={18} /> : null}
            <span>{feedback.text}</span>
          </div>
        )}
        {!done && studentTurn && (
          <div className="panel panel-tight">
            <p className="drill-prompt">
              {mode === 'learn' ? (
                <>Play <strong>{line.sans[ply]}</strong>{upcoming ? ` — ${upcoming}` : '.'}</>
              ) : focus ? (
                'You missed this one last time. What’s the move?'
              ) : (
                'Your move. What does theory play here?'
              )}
            </p>
            {mode === 'drill' && !reveal && (
              <button className="link-btn mt8" onClick={showHint}>
                <Eye size={14} /> Show the move
              </button>
            )}
          </div>
        )}
        {comment && (
          <div className="commentary">
            <span className="commentary-move">{lastIdx >= 0 ? formatLine(line.fens[lastIdx], [line.sans[lastIdx]]) : 'Introduction'}</span>
            <p>{comment}</p>
          </div>
        )}
        <MoveList moves={line.sans.slice(0, ply).map((san) => ({ san }))} current={ply} onSelect={() => undefined} />
        {done && (
          <div className="panel stack">
            <h3>{mistakes.length === 0 ? 'Clean run.' : `${mistakes.length} move${mistakes.length > 1 ? 's' : ''} to work on.`}</h3>
            <p className="muted">
              {mistakes.length === 0
                ? 'The line is scheduled for review. Spacing the repetitions is what makes it stick.'
                : 'The moves you missed are flagged — the next review will focus on them.'}
            </p>
            <Button variant="secondary" icon={<RotateCcw size={16} />} onClick={restart}>
              Run it again
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

/** Find-the-better-move puzzle built from one of your own games. */
export function PuzzleDrill({ card, onDone }: { card: PuzzleCard; onDone: (r: { solved: boolean; tries: number }) => void }) {
  const [fen, setFen] = useState(card.fen);
  const [triedMoves, setTriedMoves] = useState<string[]>([]);
  const [tries, setTries] = useState(0);
  const [state, setState] = useState<'solving' | 'checking' | 'solved' | 'failed'>('solving');
  const [feedback, setFeedback] = useState<string | null>(null);
  const [reveal, setReveal] = useState(false);
  const [lastMove, setLastMove] = useState<[string, string] | null>(null);
  const side = card.fen.split(' ')[1] as Color;
  const best = card.solution[0];
  const solutionSan = useMemo(() => pvToSan(card.fen, card.solution, 6), [card]);
  const playedSan = useMemo(() => pvToSan(card.fen, [card.played], 1)[0], [card]);
  const bestDesc = useMemo(() => {
    const c = new Chess(card.fen);
    try {
      const m = c.move({ from: best.slice(0, 2), to: best.slice(2, 4), promotion: (best[4] as PieceSymbol) || undefined });
      return describeMove(card.fen, m)[0];
    } catch {
      return '';
    }
  }, [card, best]);

  useEffect(() => {
    setFen(card.fen);
    setTriedMoves([]);
    setTries(0);
    setState('solving');
    setFeedback(null);
    setReveal(false);
    setLastMove(null);
  }, [card]);

  const finish = (solved: boolean, t: number) => {
    setState(solved ? 'solved' : 'failed');
    onDone({ solved, tries: t });
  };

  const onMove = async (mv: { from: Square; to: Square; promotion?: PieceSymbol }) => {
    if (state !== 'solving') return;
    const c = new Chess(card.fen);
    let m;
    try {
      m = c.move(mv);
    } catch {
      return;
    }
    const uci = uciOf(m);
    if (uci !== best) setTriedMoves((x) => (x.includes(uci) ? x : [...x, uci]));
    soundForSan(m.san);
    setFen(c.fen());
    setLastMove([m.from, m.to]);
    const t = tries + 1;
    setTries(t);
    if (uci === best) {
      playSound('good');
      setFeedback(`${m.san}! ${bestDesc ?? ''}`);
      finish(t === 1, t);
      return;
    }
    if (uci === card.played) {
      playSound('bad');
      setFeedback(`${m.san} is what you played in the game. Look for something better.`);
      setTimeout(() => { setFen(card.fen); setLastMove(null); }, 700);
      if (t >= 2) setReveal(true);
      return;
    }
    // Check alternatives with the engine: accept if nearly as good as the solution.
    setState('checking');
    try {
      const [mine, top] = await Promise.all([
        engine.analyze(c.fen(), { depth: 12 }),
        engine.analyze(card.fen, { depth: 12, multipv: 1 }),
      ]);
      const myWin = winPct(lineScore(mine.lines[0]), side);
      const bestWin = winPct(lineScore(top.lines[0]), side);
      if (bestWin - myWin <= 4) {
        playSound('good');
        setFeedback(`${m.san} works too. The engine’s choice was ${solutionSan[0]}.`);
        setState('solving');
        finish(t === 1, t);
        return;
      }
      playSound('bad');
      setFeedback(`${m.san} isn’t it. Try again.`);
      setState('solving');
      setTimeout(() => { setFen(card.fen); setLastMove(null); }, 700);
      if (t >= 2) setReveal(true);
    } catch {
      setState('solving');
      setFen(card.fen);
    }
  };

  const giveUp = () => {
    setReveal(true);
    setFeedback(`The answer: ${formatLine(card.fen, solutionSan)}`);
    finish(false, tries + 1);
  };

  const arrows: Arrow[] = reveal ? [{ from: best.slice(0, 2), to: best.slice(2, 4), color: 'y' }] : [];
  return (
    <div className="board-screen">
      <div className="board-col">
        <Board fen={fen} orientation={side} movable={state === 'solving' ? side : null} onMove={onMove} arrows={arrows} lastMove={lastMove} />
      </div>
      <div className="side-col">
        <div className="drill-head">
          <p className="drill-mode">{card.id.startsWith('pz:lichess:') ? 'Puzzle review' : 'From your games'} · {side === 'w' ? 'White' : 'Black'} to move</p>
          <h2>{card.title}</h2>
        </div>
        <div className="panel panel-tight">
          <p className="drill-prompt">
            {card.id.startsWith('pz:lichess:') ? (
              <>You missed this puzzle{playedSan ? <> (you tried <strong>{playedSan}</strong>)</> : null}. Find the winning move.</>
            ) : playedSan ? (
              <>In the game you played <strong>{playedSan}</strong>. Find a stronger move.</>
            ) : (
              'Find the best move.'
            )}
          </p>
          {card.note && <p className="muted small mt8">{card.note}</p>}
        </div>
        {state === 'checking' && <Spinner label="Checking your move…" />}
        {feedback && (
          <div className={`feedback ${state === 'solved' ? 'feedback-good' : state === 'failed' ? 'feedback-info' : 'feedback-bad'}`}>
            <span>{feedback}</span>
          </div>
        )}
        {(state === 'solved' || state === 'failed') && (
          <FollowUpPanel fen={card.fen} uci={best} line={card.solution} tried={[...new Set([card.played, ...triedMoves])].filter((u) => u && u !== best)} />
        )}
        {state === 'solving' && (
          <div className="row">
            {!reveal && <Button variant="ghost" size="sm" icon={<Eye size={14} />} onClick={() => setReveal(true)}>Hint</Button>}
            <Button variant="ghost" size="sm" onClick={giveUp}>Show solution</Button>
          </div>
        )}
      </div>
    </div>
  );
}
