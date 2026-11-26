import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowRight, Check, Crosshair, Lightbulb, RotateCcw, Undo2 } from 'lucide-react';
import { Chess, type Color, type Square, type PieceSymbol } from '../lib/chess/core';
import { engine, type EngineLine } from '../lib/engine/stockfish';
import { useApp, dueDrills } from '../lib/store/app';
import { currentPath, navigate, query } from '../lib/router';
import { playSound, soundForSan } from '../lib/sound';
import { Board } from '../components/Board';
import { Button, Empty, Header, Section } from '../components/ui';
import { MiniBoard } from '../components/MiniBoard';
import { ALL_DRILLS, ENDGAME_CHAPTERS, chapterOf, getDrill, type EndgameDrill } from '../data/endgames';
import { getLesson, LESSONS } from '../data/lessons';
import { dueLabel } from '../lib/srs/scheduler';

const GOAL_LABEL: Record<EndgameDrill['goal'], string> = { mate: 'Checkmate', win: 'Win', draw: 'Hold the draw' };

export function EndgamesHub() {
  const drills = useApp((s) => s.drills);
  const lessons = useApp((s) => s.lessons);
  const passed = ALL_DRILLS.filter((d) => drills[d.id]?.passed).length;
  const due = dueDrills(drills).filter((id) => ALL_DRILLS.some((d) => d.id === id));
  return (
    <div className="page">
      <Header
        title="Endgame course"
        backTo="/train"
        sub="Technique lessons, then drills against a full-strength engine that defends (or attacks) as well as it can. Pass each drill by reaching the goal."
      />
      {due.length > 0 && (
        <button className="program-cta eg-due" onClick={() => navigate(`/endgames/${due[0]}?review=1`)}>
          <span>
            <strong>{due.length} drill{due.length === 1 ? '' : 's'} due for review</strong>
            <span className="muted small">Passed drills come back on a spaced schedule so the technique stays automatic: {due.map((id) => ALL_DRILLS.find((d) => d.id === id)?.title).filter(Boolean).slice(0, 3).join(', ')}{due.length > 3 ? '…' : ''}</span>
          </span>
          <ArrowRight size={18} />
        </button>
      )}
      <div className="eg-progress">
        <span className="eg-progress-num num">{passed}<span className="muted">/{ALL_DRILLS.length}</span></span>
        <span className="muted small">drills passed</span>
        <span className="meter"><span className="meter-fill" style={{ width: `${(passed / ALL_DRILLS.length) * 100}%` }} /></span>
      </div>
      {ENDGAME_CHAPTERS.map((ch, ci) => (
        <Section key={ch.id} title={<span><span className="eg-chapter-num num">{ci + 1}</span> {ch.title}</span>}>
          <p className="muted mb8">{ch.blurb}</p>
          <div className="list mb12">
            {ch.lessons.map((id) => {
              const l = getLesson(id);
              if (!l) return null;
              const done = lessons[id]?.completed;
              return (
                <button key={id} className="list-item" onClick={() => navigate(`/train/lesson/${id}`)}>
                  <span className={`lesson-check${done ? ' is-done' : ''}`}>{done ? <Check size={16} /> : null}</span>
                  <span className="list-item-main">
                    <span className="list-item-title">{l.title}</span>
                    <span className="list-item-sub">{l.summary}</span>
                  </span>
                  <span className="list-item-meta">{l.minutes} min<br />lesson</span>
                </button>
              );
            })}
          </div>
          <div className="eg-drills">
            {ch.drills.map((d) => {
              const st = drills[d.id];
              return (
                <button key={d.id} className={`eg-drill${st?.passed ? ' is-passed' : ''}`} onClick={() => navigate(`/endgames/${d.id}`)}>
                  <MiniBoard fen={d.fen} orientation={d.side} />
                  <span className="eg-drill-body">
                    <span className="eg-drill-title">{d.title}</span>
                    <span className={`eg-goal eg-goal-${d.goal}`}>{GOAL_LABEL[d.goal]}</span>
                    <span className="faint small">
                      {st?.passed ? <><Check size={12} /> passed{st.srs ? ` · ${st.srs.due <= Date.now() ? 'review due' : `review ${dueLabel(st.srs).toLowerCase()}`}` : ''}</> : st ? `${st.attempts} attempt${st.attempts === 1 ? '' : 's'}` : `Play ${d.side === 'w' ? 'White' : 'Black'}`}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </Section>
      ))}
    </div>
  );
}

export function DrillScreen({ id }: { id: string }) {
  const drill = getDrill(id);
  if (!drill) {
    return (
      <div className="page">
        <Header title="Drill" backTo="/endgames" />
        <Empty title="Drill not found" />
      </div>
    );
  }
  return <DrillRunner key={id} drill={drill} />;
}

type Phase = 'play' | 'thinking' | 'checking' | 'won' | 'failed';

/** Evaluation in pawns from `side`'s point of view; mates map to ±100. */
function evalFor(line: EngineLine | undefined, side: Color): number {
  if (!line) return 0;
  const white = line.mate !== undefined ? (line.mate > 0 ? 100 : -100) : (line.cp ?? 0) / 100;
  return side === 'w' ? white : -white;
}

function drawReason(c: Chess): string | null {
  if (c.isStalemate()) return 'stalemate';
  if (c.isInsufficientMaterial()) return 'insufficient material';
  if (c.isThreefoldRepetition()) return 'threefold repetition';
  if (c.isDraw()) return 'the 50-move rule';
  return null;
}

function bareKing(c: Chess, color: Color) {
  return c.board().flat().filter((p) => p && p.color === color).length === 1;
}

function DrillRunner({ drill }: { drill: EndgameDrill }) {
  const record = useApp((s) => s.recordDrill);
  const stat = useApp((s) => s.drills[drill.id]);
  const game = useRef(new Chess(drill.fen));
  const [, setTick] = useState(0);
  const rerender = () => setTick((t) => t + 1);
  const [phase, setPhase] = useState<Phase>('play');
  const [message, setMessage] = useState('');
  const [hint, setHint] = useState(false);
  const [better, setBetter] = useState<{ san: string; from: string; to: string } | null>(null);
  const [held, setHeld] = useState(0);
  const recorded = useRef(false);
  const promoted = useRef(false);
  /** Hints or takebacks used this attempt: a pass then counts as 'hard' for scheduling. */
  const assisted = useRef(false);
  const reviewMode = query(currentPath()).get('review') === '1';
  const dueList = dueDrills(useApp.getState().drills).filter((x) => x !== drill.id);
  const gen = useRef(0);
  const side = drill.side;
  const opp: Color = side === 'w' ? 'b' : 'w';
  const engineFirst = new Chess(drill.fen).turn() !== side;
  const c = game.current;
  const history = c.history({ verbose: true });
  const last = history[history.length - 1];
  const myMoves = history.filter((m) => m.color === side).length;
  const halfmove = parseInt(c.fen().split(' ')[4], 10) || 0;
  const chapter = chapterOf(drill.id);
  const nextDrill = ALL_DRILLS[ALL_DRILLS.indexOf(drill) + 1];
  const lessonId = LESSONS.find((l) => l.sections.some((s) => s.drill === drill.id))?.id ?? chapter?.lessons[0];

  const finish = useCallback(
    (won: boolean, msg: string) => {
      setPhase(won ? 'won' : 'failed');
      setMessage(msg);
      playSound(won ? 'good' : 'bad');
      if (!recorded.current || won) {
        record(drill.id, won, game.current.history({ verbose: true }).filter((m) => m.color === drill.side).length, won ? (assisted.current ? 'hard' : 'good') : 'again');
        recorded.current = true;
      }
    },
    [drill.id, drill.side, record],
  );

  const engineMove = useCallback(
    async (token: number) => {
      const g = game.current;
      const res = await engine.analyze(g.fen(), { movetime: 700, multipv: 1 }, undefined, true);
      if (token !== gen.current) return;
      const uci = res.bestmove && res.bestmove !== '(none)' ? res.bestmove : res.lines[0]?.pv[0];
      if (!uci) return;
      const m = g.move({ from: uci.slice(0, 2) as Square, to: uci.slice(2, 4) as Square, promotion: (uci[4] as PieceSymbol) || undefined });
      soundForSan(m.san);
      rerender();
      if (g.isCheckmate()) return finish(false, 'You were checkmated.');
      const dr = drawReason(g);
      if (dr) {
        if (drill.goal === 'draw') return finish(true, `Drawn by ${dr}.`);
        return finish(false, dr === 'insufficient material' ? 'The engine won the material you needed — it’s a draw now.' : `Draw by ${dr}. ${dr === 'the 50-move rule' ? 'Too slow — 50 moves passed without a capture or pawn move.' : 'The win slipped away.'}`);
      }
      setPhase('play');
    },
    [drill.goal, finish],
  );

  // The engine starts when it has the move.
  useEffect(() => {
    if (engineFirst && game.current.history().length === 0) {
      setPhase('thinking');
      void engineMove(gen.current);
    }
    return () => {
      gen.current++;
    };
  }, [engineFirst, engineMove]);

  const onMove = async (mv: { from: Square; to: Square; promotion?: PieceSymbol }) => {
    if (phase !== 'play') return;
    const g = game.current;
    if (g.turn() !== side) return;
    let m;
    try {
      m = g.move(mv);
    } catch {
      return;
    }
    if (m.promotion) promoted.current = true;
    setHint(false);
    setBetter(null);
    soundForSan(m.san);
    rerender();
    const token = ++gen.current;
    if (g.isCheckmate()) return finish(true, drill.goal === 'mate' ? `Checkmate in ${myMovesNow()} moves.` : 'Checkmate!');
    const dr = drawReason(g);
    if (dr) {
      if (drill.goal === 'draw') return finish(true, `Drawn by ${dr}.`);
      return finish(false, dr === 'stalemate' ? 'Stalemate! The king had no legal move — check its squares before every move near the edge.' : `Draw by ${dr}.`);
    }
    setPhase('thinking');
    const res = await engine.analyze(g.fen(), { movetime: 700, multipv: 1 }, undefined, true);
    if (token !== gen.current) return;
    let ev = evalFor(res.lines[0], side);
    const mine = myMovesNow();
    if (drill.holdAbove !== undefined && ev < drill.holdAbove) {
      // Make sure before failing: shallow searches can misjudge pawn endings.
      setPhase('checking');
      const deep = await engine.analyze(g.fen(), { movetime: 3000, multipv: 1 }, undefined, true);
      if (token !== gen.current) return;
      ev = evalFor(deep.lines[0], side);
      if (ev < drill.holdAbove) {
        return finish(false, drill.goal === 'draw' ? 'That move loses — the engine now has a winning position.' : 'That lets the win slip — the engine can hold this now.');
      }
    }
    if (drill.goal === 'win' && ev >= 6 && (promoted.current || bareKing(g, opp))) {
      return finish(true, promoted.current ? 'Promoted — and the new queen is safe. Won.' : 'Nothing left but the king. Won.');
    }
    if (drill.goal === 'draw') {
      setHeld(mine);
      if (mine >= (drill.survive ?? 15)) return finish(true, `Held for ${mine} moves — the engine can’t make progress.`);
    }
    void engineMove(token);
  };

  function myMovesNow() {
    return game.current.history({ verbose: true }).filter((m) => m.color === side).length;
  }

  const restart = () => {
    gen.current++;
    game.current = new Chess(drill.fen);
    promoted.current = false;
    recorded.current = false;
    assisted.current = false;
    setMessage('');
    setBetter(null);
    setHint(false);
    setHeld(0);
    rerender();
    engine.newGame();
    if (engineFirst) {
      setPhase('thinking');
      void engineMove(gen.current);
    } else setPhase('play');
  };

  const takeBack = () => {
    assisted.current = true;
    gen.current++;
    const g = game.current;
    const minLen = engineFirst ? 1 : 0;
    if (g.history().length <= minLen) return;
    if (g.turn() === side && g.history().length > minLen) g.undo(); // engine's reply
    if (g.turn() !== side && g.history().length > minLen) g.undo(); // my move
    promoted.current = g.history({ verbose: true }).some((m) => m.color === side && m.promotion);
    setMessage('');
    setBetter(null);
    setHeld(myMovesNow());
    setPhase('play');
    rerender();
  };

  const showBetter = async () => {
    const g = game.current;
    const h = g.history({ verbose: true });
    const mineIdx = [...h].reverse().findIndex((m) => m.color === side);
    if (mineIdx < 0) return;
    const before = h[h.length - 1 - mineIdx].before;
    const res = await engine.analyze(before, { movetime: 1500, multipv: 1 }, undefined, true);
    const uci = res.lines[0]?.pv[0];
    if (!uci) return;
    const t = new Chess(before);
    const m = t.move({ from: uci.slice(0, 2) as Square, to: uci.slice(2, 4) as Square, promotion: (uci[4] as PieceSymbol) || undefined });
    setBetter({ san: m.san, from: m.from, to: m.to });
  };

  const goalLine =
    drill.goal === 'draw'
      ? `Hold for ${drill.survive ?? 15} moves (or reach a drawn result)`
      : drill.goal === 'mate'
        ? 'Deliver checkmate before the 50-move rule'
        : 'Promote safely or leave the king bare';
  const fiftyLeft = 50 - Math.floor(halfmove / 2);

  return (
    <div className="page board-screen-page">
      <Header title={drill.title} backTo="/endgames" sub={chapter?.title} />
      <div className="board-screen">
        <div className="board-col">
          <Board
            fen={c.fen()}
            orientation={side}
            movable={phase === 'play' && c.turn() === side ? side : null}
            onMove={onMove}
            lastMove={last ? [last.from, last.to] : null}
            arrows={better ? [{ from: better.from, to: better.to, color: 'g' }] : []}
          />
        </div>
        <div className="side-col">
          <div className="panel stack">
            <div className="row-between">
              <span className={`eg-goal eg-goal-${drill.goal}`}>{GOAL_LABEL[drill.goal]}</span>
              <span className="muted small num">
                {drill.goal === 'draw' ? `${held}/${drill.survive ?? 15} moves` : `${myMoves} move${myMoves === 1 ? '' : 's'}`}
                {drill.goal === 'mate' && fiftyLeft <= 20 && <> · <span className={fiftyLeft <= 8 ? 'tone-text-blunder' : ''}>{fiftyLeft} to the 50-move rule</span></>}
              </span>
            </div>
            <p className="drill-prompt"><Crosshair size={16} /> {drill.task}</p>
            <p className="muted small">{goalLine}. You play {side === 'w' ? 'White' : 'Black'}.</p>
            {drill.goal === 'draw' && (
              <span className="meter"><span className="meter-fill" style={{ width: `${Math.min(100, (held / (drill.survive ?? 15)) * 100)}%` }} /></span>
            )}
            {phase === 'thinking' && <p className="muted small">Engine to move…</p>}
            {phase === 'checking' && <p className="muted small">Checking that move more deeply…</p>}
            {phase === 'play' && c.turn() === side && <p className="muted small">Your move.</p>}
            {hint && <p className="eg-hint"><Lightbulb size={14} /> {drill.hint}</p>}
          </div>

          {phase === 'won' && (
            <div className="panel stack eg-result is-won">
              <h2><Check size={20} /> Passed</h2>
              <p>{message}</p>
              <p className="muted">{drill.idea}</p>
              {stat?.bestMoves !== undefined && drill.goal !== 'draw' && <p className="faint small num">Your best: {stat.bestMoves} moves</p>}
              <div className="row">
                {reviewMode ? (
                  dueList.length ? (
                    <Button icon={<ArrowRight size={16} />} onClick={() => navigate(`/endgames/${dueList[0]}?review=1`)}>Next review ({dueList.length} left)</Button>
                  ) : (
                    <Button onClick={() => navigate('/endgames')}>Reviews done</Button>
                  )
                ) : nextDrill ? (
                  <Button icon={<ArrowRight size={16} />} onClick={() => navigate(`/endgames/${nextDrill.id}`)}>Next: {nextDrill.title}</Button>
                ) : (
                  <Button onClick={() => navigate('/endgames')}>Back to the course</Button>
                )}
                <Button variant="secondary" icon={<RotateCcw size={16} />} onClick={restart}>Again</Button>
              </div>
            </div>
          )}

          {phase === 'failed' && (
            <div className="panel stack eg-result is-failed">
              <h2>Not this time</h2>
              <p>{message}</p>
              {better && <p className="muted">Better was <strong className="num">{better.san}</strong> (green arrow).</p>}
              <div className="row">
                <Button icon={<Undo2 size={16} />} onClick={takeBack}>Take back</Button>
                {!better && <Button variant="secondary" onClick={showBetter}>Show a better move</Button>}
                <Button variant="ghost" icon={<RotateCcw size={16} />} onClick={restart}>Restart</Button>
              </div>
            </div>
          )}

          {(phase === 'play' || phase === 'thinking' || phase === 'checking') && (
            <div className="row">
              {!hint && <Button variant="secondary" size="sm" icon={<Lightbulb size={14} />} onClick={() => { setHint(true); assisted.current = true; }}>Hint</Button>}
              <Button variant="secondary" size="sm" icon={<Undo2 size={14} />} disabled={phase !== 'play' || history.length <= (engineFirst ? 1 : 0)} onClick={takeBack}>Take back</Button>
              <Button variant="ghost" size="sm" icon={<RotateCcw size={14} />} onClick={restart}>Restart</Button>
            </div>
          )}
          {lessonId && (
            <button className="link-btn" onClick={() => navigate(`/train/lesson/${lessonId}`)}>
              Read the lesson <ArrowRight size={14} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
