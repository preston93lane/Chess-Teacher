import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Check, Lightbulb, Star, X, Zap } from 'lucide-react';
import { Chess, type Color, type PieceSymbol, type Square } from '../lib/chess/core';
import { useApp } from '../lib/store/app';
import { navigate } from '../lib/router';
import { playSound, soundForSan } from '../lib/sound';
import { loadPuzzles, pickPuzzle, puzzleStart, type Puzzle } from '../lib/puzzles';
import { getOpening, parseLine } from '../lib/openings/book';
import { myKeys } from '../lib/repTrainer';
import { buildPath, findNode, type PathNode } from '../lib/path/plan';
import { arrowsOf, diagramPosition, marksOf, parseLineSteps, sameSan } from '../lib/path/run';
import type { ChoiceStep, LineStep, Mood, MoveStep, PlayLineStep, PuzzleStep, SayStep, Step } from '../lib/path/types';
import { Board, type Arrow } from '../components/Board';
import { PuzzleSolver, solutionLine } from '../components/PuzzleSolver';
import { Rookie, RookieSays } from '../components/Mascot';
import { Button, Spinner } from '../components/ui';

const PRAISE = ['Nice!', 'Exactly!', 'Great move!', 'You got it!', 'Brilliant!', 'Spot on!'];
const praise = () => PRAISE[Math.floor(Math.random() * PRAISE.length)];

interface StepProps<S extends Step> {
  step: S;
  node: PathNode;
  onDone: () => void;
  onMistake: () => void;
  onPuzzle?: (ok: boolean) => void;
  crown: boolean;
}

type FootTone = 'info' | 'good' | 'bad';

/** The feedback bar pinned to the bottom of the lesson (Duolingo style). */
function Foot({ tone = 'info', title, text, action, onAction, extra }: { tone?: FootTone; title?: string; text?: ReactNode; action?: string; onAction?: () => void; extra?: ReactNode }) {
  return createPortal(
    <div className={`pl-foot is-${tone}`}>
      <div className="pl-foot-inner">
        {(title || text) && (
          <div className="pl-foot-msg">
            {title && (
              <div className="pl-foot-title">
                {tone === 'good' && <Check size={20} strokeWidth={3} />}
                {tone === 'bad' && <X size={20} strokeWidth={3} />}
                {title}
              </div>
            )}
            {text && <div className="pl-foot-text">{text}</div>}
          </div>
        )}
        <div className="pl-foot-actions">
          {extra}
          {action && (
            <Button size="lg" className="pl-foot-btn" onClick={onAction} autoFocus>
              {action}
            </Button>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}

function hasBoard(d: { fen?: string; pgn?: string; arrows?: string[]; marks?: string[] }) {
  return !!(d.fen || d.pgn || d.arrows?.length || d.marks?.length);
}

function StaticBoard({ step }: { step: SayStep | ChoiceStep }) {
  const pos = useMemo(() => diagramPosition(step), [step]);
  return (
    <div className="pl-board">
      <Board fen={pos.fen} orientation={step.orientation ?? 'w'} movable={null} lastMove={pos.last} arrows={arrowsOf(step.arrows)} marks={marksOf(step.marks)} />
    </div>
  );
}

function SayView({ step, onDone, crown }: StepProps<SayStep>) {
  return (
    <>
      <RookieSays mood={step.mood ?? 'happy'} crown={crown}>
        <p className="pl-text">{step.text}</p>
      </RookieSays>
      {hasBoard(step) && <StaticBoard step={step} />}
      <Foot action="Continue" onAction={onDone} />
    </>
  );
}

function LineView({ step, onDone, crown }: StepProps<LineStep>) {
  const plies = useMemo(() => parseLineSteps(step), [step]);
  const start = useMemo(() => diagramPosition(step).fen, [step]);
  const [idx, setIdx] = useState(0);
  const cur = idx > 0 ? plies[idx - 1] : null;
  const fen = cur ? cur.fenAfter : start;
  const end = idx >= plies.length;
  const label = (i: number) => {
    const p = plies[i];
    const [, turn, , , , num] = p.fenBefore.split(' ');
    return turn === 'w' ? `${num}.${p.san}` : `${num}…${p.san}`;
  };
  const next = () => {
    if (end) return onDone();
    soundForSan(plies[idx].san);
    setIdx(idx + 1);
  };
  return (
    <>
      <RookieSays mood={cur?.comment ? 'think' : 'happy'} crown={crown}>
        {cur ? (
          <p className="pl-text">
            <b>{label(idx - 1)}</b> {cur.comment ?? ''}
          </p>
        ) : (
          <p className="pl-text">{step.text}</p>
        )}
      </RookieSays>
      <div className="pl-board">
        <Board fen={fen} orientation={step.orientation ?? 'w'} movable={null} lastMove={cur ? [cur.from, cur.to] : null} arrows={arrowsOf(idx === 0 ? step.arrows : undefined)} />
      </div>
      <div className="pl-moves" aria-label="Moves">
        {plies.map((p, i) => (
          <button key={i} className={`pl-move${i === idx - 1 ? ' is-on' : ''}${i >= idx ? ' is-ahead' : ''}${p.comment ? ' has-note' : ''}`} onClick={() => setIdx(i + 1)}>
            {label(i)}
          </button>
        ))}
      </div>
      <Foot
        action={end ? 'Continue' : idx === 0 ? 'Play' : 'Next move'}
        onAction={next}
        extra={
          idx > 0 && !end ? (
            <Button variant="ghost" onClick={() => setIdx(plies.length)}>
              Skip to end
            </Button>
          ) : undefined
        }
      />
    </>
  );
}

type Mv = { from: Square; to: Square; promotion?: PieceSymbol };

/** Shared logic for “play the right move(s)”: a scripted line where you play one side. */
function useScript(startFen: string, sans: string[], mySide: Color, opts: { accept?: (c: Chess, san: string, idx: number) => boolean; onWrong: () => void; onSolved: () => void }) {
  const [fen, setFen] = useState(startFen);
  const [idx, setIdx] = useState(0);
  const [last, setLast] = useState<[string, string] | null>(null);
  const [state, setState] = useState<'solving' | 'wrong' | 'solved'>('solving');
  const [wrongs, setWrongs] = useState(0);
  const busy = useRef(false);
  const fenRef = useRef(startFen);
  fenRef.current = fen;

  const playReply = (from: string, i: number) => {
    const c = new Chess(from);
    const m = c.move(sans[i]);
    soundForSan(m.san);
    setFen(c.fen());
    setLast([m.from, m.to]);
    return c.fen();
  };

  // If the script starts with the other side's move, play it.
  useEffect(() => {
    const turn = startFen.split(' ')[1] as Color;
    if (turn !== mySide && sans.length) {
      busy.current = true;
      const t = setTimeout(() => {
        playReply(startFen, 0);
        setIdx(1);
        busy.current = false;
      }, 600);
      return () => clearTimeout(t);
    }
    return undefined;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onMove = (mv: Mv) => {
    if (busy.current || state !== 'solving') return;
    const before = fenRef.current;
    const c = new Chess(before);
    let m;
    try {
      m = c.move(mv);
    } catch {
      return;
    }
    soundForSan(m.san);
    setFen(c.fen());
    setLast([m.from, m.to]);
    const expected = sans[idx];
    const alt = opts.accept?.(c, m.san, idx) ?? false;
    if (sameSan(m.san, expected) || alt) {
      const nextIdx = idx + 1;
      if (alt && !sameSan(m.san, expected)) {
        setState('solved');
        opts.onSolved();
        return;
      }
      if (nextIdx >= sans.length) {
        setIdx(nextIdx);
        setState('solved');
        opts.onSolved();
        return;
      }
      busy.current = true;
      setTimeout(() => {
        playReply(c.fen(), nextIdx);
        busy.current = false;
        if (nextIdx + 1 >= sans.length) {
          setIdx(nextIdx + 1);
          setState('solved');
          opts.onSolved();
        } else setIdx(nextIdx + 1);
      }, 520);
    } else {
      setWrongs((w) => w + 1);
      setState('wrong');
      opts.onWrong();
      busy.current = true;
      setTimeout(() => {
        setFen(before);
        setLast(null);
        setState('solving');
        busy.current = false;
      }, 800);
    }
  };

  const expectedMove = useMemo(() => {
    if (idx >= sans.length) return null;
    try {
      const c = new Chess(fen);
      const m = c.move(sans[idx]);
      return { from: m.from, to: m.to, san: m.san };
    } catch {
      return null;
    }
  }, [fen, idx, sans]);

  return { fen, last, state, wrongs, onMove, expectedMove, idx };
}

function MoveView({ step, onDone, onMistake, crown }: StepProps<MoveStep>) {
  const start = useMemo(() => diagramPosition(step).fen, [step]);
  const side = start.split(' ')[1] as Color;
  const [hint, setHint] = useState(0);
  const [solved, setSolved] = useState(false);
  const s = useScript(start, step.sol, side, {
    accept: (c, san, idx) =>
      idx === 0 &&
      (!!step.accept?.some((a) => sameSan(a, san)) || (step.goal === 'check' && c.inCheck()) || (step.goal === 'mate' && c.isCheckmate())),
    onWrong: () => {
      onMistake();
      playSound('bad');
    },
    onSolved: () => {
      setSolved(true);
      playSound('good');
    },
  });
  const showArrow = (s.wrongs >= 2 || hint >= 2) && s.expectedMove && !solved;
  const arrows: Arrow[] = showArrow ? [{ from: s.expectedMove!.from, to: s.expectedMove!.to, color: 'y' }] : [];
  const hintSq = hint >= 1 && s.expectedMove && !solved ? [s.expectedMove.from] : undefined;
  const mood: Mood = solved ? 'cheer' : s.state === 'wrong' ? 'oops' : 'think';
  const bubble = solved ? step.text : s.state === 'wrong' || s.wrongs > 0 ? (s.wrongs >= 2 ? `Not quite. Play ${s.expectedMove?.san ?? 'the arrow'}.` : `Not quite — try again.${step.hint ? ` ${step.hint}` : ''}`) : step.text;
  return (
    <>
      <RookieSays mood={mood} crown={crown}>
        <p className="pl-text">{bubble}</p>
        {!solved && <p className="pl-sub">{side === 'w' ? 'White' : 'Black'} to move</p>}
      </RookieSays>
      <div className={`pl-board${s.state === 'wrong' ? ' is-wrong' : ''}${solved ? ' is-right' : ''}`}>
        <Board
          fen={s.fen}
          orientation={step.orientation ?? side}
          movable={solved || s.state !== 'solving' ? null : side}
          onMove={s.onMove}
          lastMove={s.last}
          arrows={[...arrowsOf(s.idx === 0 && !s.wrongs ? step.arrows : undefined), ...arrows]}
          marks={marksOf(step.marks)}
          hintSquares={hintSq}
        />
      </div>
      {solved ? (
        <Foot tone="good" title={praise()} text={step.explain} action="Continue" onAction={onDone} />
      ) : (
        <Foot
          extra={
            <Button
              variant="secondary"
              icon={<Lightbulb size={16} />}
              onClick={() => {
                if (hint === 0) onMistake();
                setHint(Math.min(2, hint + 1));
              }}
            >
              {hint === 0 ? 'Hint' : hint === 1 ? 'Show me' : 'Shown'}
            </Button>
          }
        />
      )}
    </>
  );
}

function ChoiceView({ step, onDone, onMistake, crown }: StepProps<ChoiceStep>) {
  const [picked, setPicked] = useState<number | null>(null);
  const ok = picked === step.answer;
  const pick = (i: number) => {
    if (picked !== null) return;
    setPicked(i);
    if (i === step.answer) playSound('good');
    else {
      playSound('bad');
      onMistake();
    }
  };
  return (
    <>
      <RookieSays mood={picked === null ? 'think' : ok ? 'cheer' : 'oops'} crown={crown}>
        <p className="pl-text">{step.text}</p>
      </RookieSays>
      {hasBoard(step) && <StaticBoard step={step} />}
      <div className="pl-options" role="list">
        {step.options.map((o, i) => (
          <button
            key={i}
            role="listitem"
            className={`pl-option${picked !== null && i === step.answer ? ' is-right' : ''}${picked === i && !ok ? ' is-wrong' : ''}`}
            onClick={() => pick(i)}
            disabled={picked !== null}
          >
            <span className="pl-option-key">{String.fromCharCode(65 + i)}</span>
            {o}
          </button>
        ))}
      </div>
      {picked !== null ? (
        <Foot tone={ok ? 'good' : 'bad'} title={ok ? praise() : 'Not quite'} text={step.explain} action="Continue" onAction={onDone} />
      ) : (
        <Foot text="Pick an answer." />
      )}
    </>
  );
}

function PuzzlesView({ step, node, onDone, onMistake, onPuzzle, crown }: StepProps<PuzzleStep>) {
  const stats = useApp((s) => s.puzzles);
  const record = useApp((s) => s.recordPuzzle);
  const [list, setList] = useState<Puzzle[] | null>(null);
  const [k, setK] = useState(0);
  const [result, setResult] = useState<boolean | null>(null);
  const [score, setScore] = useState(0);

  useEffect(() => {
    let live = true;
    void loadPuzzles().then((all) => {
      if (!live) return;
      const [lo, hi] = [step.min ?? node.level.band[0], step.max ?? node.level.band[1]];
      const base = (p: Puzzle) =>
        (!step.themes.length || step.themes.some((t) => p.themes.includes(t))) && (step.need ?? []).every((t) => p.themes.includes(t)) && (!step.opening || p.opening === step.opening);
      // Prefer the learner's side when there are enough of those puzzles.
      const sided = (p: Puzzle) => base(p) && p.side === step.side;
      const filter = step.side && all.filter(sided).length >= step.count * 3 ? sided : base;
      const target = stats.attempts >= 15 ? Math.min(hi, Math.max(lo, stats.rating)) : Math.round(lo + (hi - lo) * 0.35);
      const seen = new Set(stats.seen);
      const out: Puzzle[] = [];
      for (let i = 0; i < step.count; i++) {
        const p = pickPuzzle(all, { rating: target, seen, filter, spread: 150 });
        if (!p) break;
        seen.add(p.id);
        out.push(p);
      }
      setList(out);
    });
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  if (!list) return <Spinner label="Finding puzzles…" />;
  if (!list.length) {
    return (
      <>
        <RookieSays mood="oops" crown={crown}>
          <p className="pl-text">I couldn’t find puzzles for this one. Let’s keep going!</p>
        </RookieSays>
        <Foot action="Continue" onAction={onDone} />
      </>
    );
  }
  const p = list[k];
  const side = puzzleStart(p).side;
  const next = () => {
    if (k + 1 >= list.length) onDone();
    else {
      setK(k + 1);
      setResult(null);
    }
  };
  return (
    <>
      <RookieSays mood={result === null ? 'think' : result ? 'cheer' : 'oops'} crown={crown}>
        <p className="pl-text">{k === 0 && result === null ? step.text : result === null ? `${side === 'w' ? 'White' : 'Black'} to move. Find the best move.` : result ? praise() : 'That wasn’t it — watch the solution.'}</p>
        <p className="pl-sub">
          Puzzle {k + 1} of {list.length} · rated {p.rating}
          {p.family ? ` · ${p.family}` : ''}
          {node.lesson.kind === 'review' ? ` · ${score} solved` : ''}
        </p>
      </RookieSays>
      <div className={`pl-board${result === false ? ' is-wrong' : ''}${result ? ' is-right' : ''}`}>
        <PuzzleSolver
          key={p.id}
          puzzle={p}
          showSolution={result === false}
          onResult={(r) => {
            setResult(r.ok);
            if (r.ok) setScore((x) => x + 1);
            else onMistake();
            onPuzzle?.(r.ok);
            record({ id: p.id, puzzleRating: p.rating, ok: r.ok, rated: false, themes: p.themes });
          }}
        />
      </div>
      <div className="pl-dots" aria-hidden>
        {list.map((x, i) => (
          <span key={x.id} className={`pl-dot${i < k || (i === k && result !== null) ? ' is-done' : ''}${i === k ? ' is-on' : ''}`} />
        ))}
      </div>
      {result === null ? (
        <Foot text={`${side === 'w' ? 'White' : 'Black'} to move`} />
      ) : (
        <Foot tone={result ? 'good' : 'bad'} title={result ? praise() : 'Solution'} text={result ? undefined : solutionLine(p)} action={k + 1 >= list.length ? 'Continue' : 'Next puzzle'} onAction={next} />
      )}
    </>
  );
}

function PlayLineView({ step, onDone, onMistake, crown }: StepProps<PlayLineStep>) {
  const parsed = useMemo(() => {
    const o = getOpening(step.opening);
    return o ? parseLine(o, step.line) : null;
  }, [step]);
  const sans = useMemo(() => (parsed ? parsed.sans.slice(0, step.plies ?? parsed.sans.length) : []), [parsed, step.plies]);
  const [solved, setSolved] = useState(false);
  const s = useScript(parsed?.fens[0] ?? '', sans, step.side, {
    onWrong: () => {
      onMistake();
      playSound('bad');
    },
    onSolved: () => {
      setSolved(true);
      playSound('good');
    },
  });
  if (!parsed) return <Foot text="This line is missing." action="Continue" onAction={onDone} />;
  const lastComment = s.idx > 0 ? parsed.comments[s.idx - 1] : undefined;
  return (
    <>
      <RookieSays mood={solved ? 'cheer' : s.state === 'wrong' ? 'oops' : 'think'} crown={crown}>
        <p className="pl-text">
          {solved ? 'Perfect — that’s the whole line.' : s.state === 'wrong' || s.wrongs > 0 ? `Not this one. Your move here is ${s.expectedMove?.san ?? '—'}.` : lastComment ?? step.text}
        </p>
        <p className="pl-sub">
          Move {Math.min(sans.length, s.idx + 1)} of {sans.length}
        </p>
      </RookieSays>
      <div className={`pl-board${s.state === 'wrong' ? ' is-wrong' : ''}${solved ? ' is-right' : ''}`}>
        <Board
          fen={s.fen}
          orientation={step.side}
          movable={solved || s.state !== 'solving' ? null : step.side}
          onMove={s.onMove}
          lastMove={s.last}
          arrows={s.wrongs > 0 && s.expectedMove && !solved && s.state === 'solving' ? [{ from: s.expectedMove.from, to: s.expectedMove.to, color: 'y' }] : []}
        />
      </div>
      {solved ? <Foot tone="good" title="Line learned" text="It’s now in your repertoire trainer, scheduled for review." action="Continue" onAction={onDone} /> : <Foot text={`You play ${step.side === 'w' ? 'White' : 'Black'}`} />}
    </>
  );
}

function StepView(props: StepProps<Step>) {
  const { step } = props;
  switch (step.kind) {
    case 'say':
      return <SayView {...(props as StepProps<SayStep>)} />;
    case 'line':
      return <LineView {...(props as StepProps<LineStep>)} />;
    case 'move':
      return <MoveView {...(props as StepProps<MoveStep>)} />;
    case 'choice':
      return <ChoiceView {...(props as StepProps<ChoiceStep>)} />;
    case 'puzzles':
      return <PuzzlesView {...(props as StepProps<PuzzleStep>)} />;
    case 'playline':
      return <PlayLineView {...(props as StepProps<PlayLineStep>)} />;
  }
}

export function starsFor(mistakes: number) {
  return mistakes === 0 ? 3 : mistakes <= 2 ? 2 : 1;
}

export function PathLessonScreen({ id }: { id: string }) {
  const profile = useApp((s) => s.learn.profile);
  const units = useMemo(() => buildPath(profile), [profile]);
  const node = findNode(units, id);
  if (!node) {
    return (
      <div className="pl">
        <RookieSays mood="oops">
          <p className="pl-text">I can’t find that lesson.</p>
        </RookieSays>
        <Foot action="Back to the path" onAction={() => navigate('/learn')} />
      </div>
    );
  }
  return <LessonPlayer key={id} node={node} />;
}

function LessonPlayer({ node }: { node: PathNode }) {
  const steps = node.lesson.steps;
  const finishLesson = useApp((s) => s.finishLearnLesson);
  const learnRepMoves = useApp((s) => s.learnRepMoves);
  const toggleRepertoire = useApp((s) => s.toggleRepertoire);
  const crown = node.level.id === 'expert';
  const [i, setI] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [puzzleTally, setPuzzleTally] = useState({ ok: 0, total: 0 });
  const [result, setResult] = useState<null | { stars: number; xp: number; passed: boolean }>(null);
  const [quit, setQuit] = useState(false);
  const started = useRef(Date.now());
  const isTest = node.lesson.kind === 'review';

  const finish = () => {
    const passed = !isTest || puzzleTally.total === 0 || puzzleTally.ok / puzzleTally.total >= 0.75;
    const stars = isTest ? (puzzleTally.ok === puzzleTally.total ? 3 : puzzleTally.ok / Math.max(1, puzzleTally.total) >= 0.85 ? 2 : 1) : starsFor(mistakes);
    const xp = passed ? (isTest ? 20 : 10) + (stars === 3 ? 5 : 0) : 0;
    if (passed) {
      finishLesson(node.lesson.id, stars, xp);
      if (node.opening) {
        const o = node.opening;
        const app = useApp.getState();
        if (app.repertoire[o.id]?.side !== o.side) toggleRepertoire(o.id, o.side);
        const op = getOpening(o.id);
        if (op && o.lineId) {
          const p = parseLine(op, o.lineId);
          learnRepMoves(o.id, myKeys(p.sans.slice(0, o.plies ?? p.sans.length), o.side));
        }
      }
      playSound('end');
    }
    setResult({ stars, xp, passed });
  };

  const done = () => (i + 1 < steps.length ? setI(i + 1) : finish());
  const progress = result ? 1 : i / steps.length;

  if (result) return <ResultView node={node} result={result} mistakes={mistakes} seconds={Math.round((Date.now() - started.current) / 1000)} tally={puzzleTally} crown={crown} />;

  return (
    <div className="pl">
      <div className="pl-top">
        <button className="pl-close" aria-label="Quit lesson" onClick={() => setQuit(true)}>
          <X size={24} />
        </button>
        <div className="pl-progress" role="progressbar" aria-valuenow={Math.round(progress * 100)} aria-valuemin={0} aria-valuemax={100}>
          <span style={{ width: `${Math.max(4, progress * 100)}%` }} />
        </div>
        <span className={`pl-streak${mistakes === 0 ? ' is-perfect' : ''}`} title={mistakes === 0 ? 'Perfect so far' : `${mistakes} slip${mistakes === 1 ? '' : 's'}`}>
          <Zap size={16} fill="currentColor" />
          {mistakes === 0 ? 'Perfect' : mistakes}
        </span>
      </div>
      <div className="pl-body">
        <StepView
          key={i}
          step={steps[i]}
          node={node}
          crown={crown}
          onDone={done}
          onMistake={() => setMistakes((m) => m + 1)}
          onPuzzle={(ok) => setPuzzleTally((t) => ({ ok: t.ok + (ok ? 1 : 0), total: t.total + 1 }))}
        />
      </div>
      {quit &&
        createPortal(
          <div className="pl-quit" role="dialog" aria-modal="true" aria-label="Quit lesson?">
            <div className="pl-quit-card">
              <Rookie mood="oops" size={72} />
              <h2>Wait, don’t go!</h2>
              <p>You’ll lose your progress in this lesson.</p>
              <Button size="lg" onClick={() => setQuit(false)}>
                Keep learning
              </Button>
              <Button variant="ghost" onClick={() => navigate('/learn')}>
                End lesson
              </Button>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}

function ResultView({ node, result, mistakes, seconds, tally, crown }: { node: PathNode; result: { stars: number; xp: number; passed: boolean }; mistakes: number; seconds: number; tally: { ok: number; total: number }; crown: boolean }) {
  const isTest = node.lesson.kind === 'review';
  const time = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
  if (!result.passed) {
    return (
      <div className="pl pl-result">
        <Rookie mood="oops" size={120} crown={crown} />
        <h1>So close!</h1>
        <p className="pl-result-sub">
          {tally.ok} of {tally.total} solved — you need {Math.ceil(tally.total * 0.75)} to pass the unit test. Review the unit’s lessons and try again.
        </p>
        <Foot action="Back to the path" onAction={() => navigate('/learn')} extra={<Button variant="secondary" onClick={() => navigate(`/learn/lesson/${node.lesson.id}?r=${Date.now()}`, true)}>Try again</Button>} />
      </div>
    );
  }
  return (
    <div className="pl pl-result">
      <Rookie mood="cheer" size={120} crown={crown} className="rookie-celebrate" />
      <h1>{isTest ? 'Unit complete!' : node.lesson.kind === 'repertoire' ? 'Line learned!' : 'Lesson complete!'}</h1>
      <div className="pl-stars" aria-label={`${result.stars} of 3 stars`}>
        {[1, 2, 3].map((s) => (
          <Star key={s} size={40} className={s <= result.stars ? 'is-on' : ''} fill={s <= result.stars ? 'currentColor' : 'none'} style={{ animationDelay: `${s * 0.15}s` }} />
        ))}
      </div>
      <div className="pl-tiles">
        <div className="pl-tile is-xp">
          <span>Total XP</span>
          <b>+{result.xp}</b>
        </div>
        <div className="pl-tile is-acc">
          <span>{isTest ? 'Solved' : 'Slips'}</span>
          <b>{isTest ? `${tally.ok}/${tally.total}` : mistakes === 0 ? 'None!' : mistakes}</b>
        </div>
        <div className="pl-tile is-time">
          <span>Time</span>
          <b>{time}</b>
        </div>
      </div>
      {node.lesson.kind === 'repertoire' && node.opening && (
        <p className="pl-result-sub">Your moves are now in the repertoire trainer, scheduled for spaced review.</p>
      )}
      <Foot
        action="Continue"
        onAction={() => navigate('/learn')}
        extra={
          node.opening ? (
            <Button variant="secondary" onClick={() => navigate(`/reptrain/${node.opening!.id}/tree?side=${node.opening!.side}&only=learned`)}>
              Practise
            </Button>
          ) : undefined
        }
      />
    </div>
  );
}

