import { createPortal } from 'react-dom';
import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, BookOpen, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { Chess, applyUci, formatLine, moveLabel, uciOf, type Color, type PieceSymbol, type Square } from '../lib/chess/core';
import { engine, CancelledError, type AnalysisResult, type EngineLine } from '../lib/engine/stockfish';
import { CLASS_INFO, BAD_CLASSES, describeMove, reviewMove, type MoveReview } from '../lib/coach/explain';
import { formatScore, lineScore, winPct } from '../lib/coach/eval';
import { lineOutcome, materialPhrase } from '../lib/coach/tactics';
import { staticInsights } from '../lib/coach/insights';
import { navigate } from '../lib/router';
import { soundForSan } from '../lib/sound';
import { Board, type Arrow, type Mark } from './Board';
import { Button, Glyph, IconButton, Spinner } from './ui';

interface Candidate {
  line: EngineLine;
  san: string;
  sans: string[];
  fens: string[];
  ucis: string[];
  reasons: string[];
  compare: string;
  win: number;
}

interface Data {
  review: MoveReview;
  before: AnalysisResult;
  reply: { sans: string[]; fens: string[]; ucis: string[]; captions: string[] };
  candidates: Candidate[];
  takeaway: { text: string; lessonId?: string; lessonTitle?: string };
}

function walk(fen: string, pv: string[], max = 8) {
  const c = new Chess(fen);
  const sans: string[] = [];
  const fens = [fen];
  const ucis: string[] = [];
  for (const u of pv.slice(0, max)) {
    try {
      const m = c.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: (u[4] as PieceSymbol) || undefined });
      sans.push(m.san);
      ucis.push(uciOf(m));
      fens.push(c.fen());
    } catch {
      break;
    }
  }
  return { sans, fens, ucis };
}

function takeawayFor(r: MoveReview): Data['takeaway'] {
  const h = r.headline.toLowerCase();
  if (!BAD_CLASSES.includes(r.cls))
    return {
      text:
        r.cls === 'book'
          ? 'This is theory. The alternatives below show other ways to play the position and the ideas they share.'
          : 'A good decision. Compare it with the engine’s alternatives — when several moves work, notice which ideas they have in common.',
    };
  if (/hangs|leaves|drops/.test(h))
    return { text: 'Blunder check: before every move, ask what it leaves undefended — and what was already under attack.', lessonId: 'calculation', lessonTitle: 'Checks, captures, threats' };
  if (/fork/.test(h)) return { text: 'When an enemy knight can reach a square that hits two of your pieces, deal with it before it lands.', lessonId: 'calculation', lessonTitle: 'Checks, captures, threats' };
  if (/pin|skewer/.test(h)) return { text: 'Pieces lined up with your king or queen are targets for pins and skewers. Step them off the line before it matters.', lessonId: 'calculation', lessonTitle: 'Checks, captures, threats' };
  if (/discovered/.test(h)) return { text: 'Watch the pieces behind the pieces: when one moves, another line opens.', lessonId: 'calculation', lessonTitle: 'Checks, captures, threats' };
  if (/mate/.test(h) && /allows/.test(h)) return { text: 'King safety first. Count the attackers near your king before you go for your own plan.', lessonId: 'opposite-castling', lessonTitle: 'Opposite-side castling races' };
  if (/misses/.test(h)) return { text: 'After your opponent’s move, look for forcing moves — checks, captures, threats — before playing the natural one.', lessonId: 'calculation', lessonTitle: 'Checks, captures, threats' };
  if (/queen out/.test(h) || /developed piece/.test(h) || /castling/.test(h))
    return { text: 'Opening principles pay off: develop, castle, then start operations. Tempo is worth more than a pawn early on.', lessonId: 'outposts', lessonTitle: 'Outposts and holes' };
  if (/weakens/.test(h)) return { text: 'Pawn moves are permanent. Before pushing a pawn near your king, ask which squares it can never protect again.', lessonId: 'prophylaxis', lessonTitle: 'Prophylaxis' };
  return { text: 'Ask what your opponent wants before you commit. The best reply to your move is the one you have to see.', lessonId: 'prophylaxis', lessonTitle: 'Prophylaxis' };
}

const STEPS = ['Your move', 'Why', 'Better options', 'Takeaway'];

export function MoveBreakdown({
  fenBefore,
  uci,
  depth,
  showEval,
  onClose,
}: {
  fenBefore: string;
  uci: string;
  depth: number;
  showEval: boolean;
  onClose: () => void;
}) {
  const mover = fenBefore.split(' ')[1] as Color;
  const played = useMemo(() => applyUci(fenBefore, uci)!, [fenBefore, uci]);
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState(0);
  const [replyPly, setReplyPly] = useState(1);
  const [cand, setCand] = useState(0);
  const [candPly, setCandPly] = useState(0);
  const [tryMove, setTryMove] = useState<{ fen: string; review: MoveReview | null; from: string; to: string } | null>(null);
  const [marks, setMarks] = useState<Mark[]>([]);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const d = depth + 2;
        const before = await engine.analyze(fenBefore, { depth: d, multipv: 4 });
        const over = new Chess(played.fen).isGameOver();
        const after = over ? null : await engine.analyze(played.fen, { depth: d, multipv: 1 });
        const review = reviewMove({ ply: 0, fenBefore, uci, before: before.lines, after: after?.lines[0] });
        const replyLine = after?.lines[0];
        const rw = replyLine ? walk(played.fen, replyLine.pv, 6) : { sans: [], fens: [played.fen], ucis: [] };
        const captions = rw.sans.map((san, i) => {
          const m = new Chess(rw.fens[i]).move(san);
          const d0 = describeMove(rw.fens[i], m)[0] ?? '';
          return `${moveLabel(rw.fens[i], san)} — ${d0}`;
        });
        const playedWin = winPct(review.evalAfter, mover);
        const candidates: Candidate[] = before.lines
          .filter((l) => l.pv[0] !== uci)
          .slice(0, 3)
          .map((l) => {
            const w = walk(fenBefore, l.pv, 8);
            const mv = new Chess(fenBefore).move(w.sans[0]);
            const reasons = describeMove(fenBefore, mv).slice(0, 2);
            const out = lineOutcome(fenBefore, l.pv);
            if (out.mateFor === mover) reasons.unshift(`Leads to mate in ${out.mateIn}.`);
            else {
              const phrase = out.material >= 1 ? materialPhrase(out.lost[mover === 'w' ? 'b' : 'w'], out.lost[mover], out.material) : null;
              if (phrase) reasons.unshift(`${phrase[0].toUpperCase()}${phrase.slice(1)}.`);
            }
            const win = winPct(lineScore(l), mover);
            const gap = win - playedWin;
            const compare =
              gap >= 25 ? 'Far stronger than your move' : gap >= 10 ? 'Clearly stronger than your move' : gap >= 3 ? 'A little stronger than your move' : gap > -3 ? 'About as good as your move' : 'Another option, slightly weaker than your move';
            return { line: l, san: w.sans[0], sans: w.sans, fens: w.fens, ucis: w.ucis, reasons: [...new Set(reasons)], compare, win };
          });
        if (!alive) return;
        setData({ review, before, reply: { ...rw, captions }, candidates, takeaway: takeawayFor(review) });
      } catch (e) {
        if (alive && !(e instanceof CancelledError)) setError('The engine could not finish the breakdown. Try again.');
      }
    })();
    return () => {
      alive = false;
    };
  }, [fenBefore, uci, depth, played.fen, mover]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  useEffect(() => {
    setMarks([]);
    setTryMove(null);
  }, [step]);

  const onTry = async (mv: { from: Square; to: Square; promotion?: PieceSymbol }) => {
    if (!data) return;
    const c = new Chess(fenBefore);
    let m;
    try {
      m = c.move(mv);
    } catch {
      return;
    }
    soundForSan(m.san);
    setTryMove({ fen: c.fen(), review: null, from: m.from, to: m.to });
    try {
      const after = await engine.analyze(c.fen(), { depth: depth + 1 });
      const r = reviewMove({ ply: 0, fenBefore, uci: uciOf(m), before: data.before.lines, after: after.lines[0] });
      setTryMove((cur) => (cur && cur.fen === c.fen() ? { ...cur, review: r } : cur));
    } catch {
      /* cancelled */
    }
  };

  // ---- board for the current step ----
  let boardFen = fenBefore;
  let arrows: Arrow[] = [];
  let lastMove: [string, string] | null = null;
  let badge: { sq: string; cls: MoveReview['cls'] } | null = null;
  let movable: Color | null = null;
  const bad = data ? BAD_CLASSES.includes(data.review.cls) : false;
  if (data) {
    if (step === 0) {
      boardFen = played.fen;
      lastMove = [played.move.from, played.move.to];
      badge = { sq: played.move.to, cls: data.review.cls };
    } else if (step === 1) {
      const n = Math.min(replyPly, data.reply.sans.length);
      boardFen = data.reply.fens[n];
      lastMove = n > 0 ? [data.reply.ucis[n - 1].slice(0, 2), data.reply.ucis[n - 1].slice(2, 4)] : [played.move.from, played.move.to];
      if (n === 0) badge = { sq: played.move.to, cls: data.review.cls };
    } else if (step === 2) {
      const c = data.candidates[cand];
      if (tryMove) {
        boardFen = tryMove.fen;
        lastMove = [tryMove.from, tryMove.to];
        if (tryMove.review) badge = { sq: tryMove.to, cls: tryMove.review.cls };
      } else if (c && candPly > 0) {
        boardFen = c.fens[candPly];
        lastMove = [c.ucis[candPly - 1].slice(0, 2), c.ucis[candPly - 1].slice(2, 4)];
      } else {
        boardFen = fenBefore;
        movable = mover;
        arrows = [
          { from: played.move.from, to: played.move.to, color: 'r' },
          ...(c ? [{ from: c.ucis[0].slice(0, 2), to: c.ucis[0].slice(2, 4), color: 'y' as const }] : []),
        ];
      }
    } else {
      boardFen = fenBefore;
    }
  }

  const insightsBefore = useMemo(() => staticInsights(fenBefore, mover).slice(0, 3), [fenBefore, mover]);
  const info = data ? CLASS_INFO[data.review.cls] : null;
  const label = moveLabel(fenBefore, played.move.san);

  return createPortal(
    <div className="breakdown" role="dialog" aria-modal aria-label="Move breakdown">
      <div className="breakdown-inner">
        <header className="breakdown-head">
          <div>
            <p className="breakdown-kicker">Move breakdown</p>
            <h2 className="breakdown-title">
              {label} {data && info && <Glyph cls={data.review.cls} />}
            </h2>
          </div>
          <Button variant="secondary" size="sm" icon={<X size={16} />} onClick={onClose}>
            Back to game
          </Button>
        </header>
        <nav className="breakdown-steps" aria-label="Breakdown steps">
          {STEPS.map((s, i) => (
            <button key={s} className={`breakdown-step${i === step ? ' is-on' : ''}`} onClick={() => setStep(i)} disabled={!data}>
              <span className="num">{i + 1}</span> {i === 1 && data && !bad ? 'What comes next' : s}
            </button>
          ))}
        </nav>

        <div className="board-screen">
          <div className="board-col">
            <Board fen={boardFen} orientation={mover} movable={movable} onMove={onTry} lastMove={lastMove} arrows={arrows} badge={badge} marks={marks} />
            {data && step === 1 && data.reply.sans.length > 0 && (
              <div className="controls">
                <div className="controls-group">
                  <IconButton label="Back one move" onClick={() => setReplyPly(Math.max(0, replyPly - 1))} disabled={replyPly === 0}>
                    <ChevronLeft />
                  </IconButton>
                  <IconButton label="Forward one move" onClick={() => setReplyPly(Math.min(data.reply.sans.length, replyPly + 1))} disabled={replyPly >= data.reply.sans.length}>
                    <ChevronRight />
                  </IconButton>
                </div>
                <span className="muted small num">{replyPly}/{data.reply.sans.length}</span>
              </div>
            )}
            {data && step === 2 && data.candidates[cand] && !tryMove && (
              <div className="controls">
                <div className="controls-group">
                  <IconButton label="Back one move" onClick={() => setCandPly(Math.max(0, candPly - 1))} disabled={candPly === 0}>
                    <ChevronLeft />
                  </IconButton>
                  <IconButton label="Play through this line" onClick={() => setCandPly(Math.min(data.candidates[cand].sans.length, candPly + 1))} disabled={candPly >= data.candidates[cand].sans.length}>
                    <ChevronRight />
                  </IconButton>
                </div>
                <span className="muted small">{candPly === 0 ? 'Or make your own move on the board' : `${candPly}/${data.candidates[cand].sans.length}`}</span>
              </div>
            )}
          </div>

          <div className="side-col">
            {!data && !error && <Spinner label="Coach is taking the move apart…" />}
            {error && <p className="error-text">{error}</p>}
            {data && step === 0 && (
              <div className="stack">
                <div className={`verdict tone-${info!.tone}`}>
                  <div className="verdict-glyph" aria-hidden>{info!.glyph}</div>
                  <div className="verdict-body">
                    <p className="verdict-kicker">
                      <span className={`tone-text-${info!.tone}`}>{info!.label}</span>
                      {showEval && data.review.evalBefore && data.review.evalAfter && (
                        <span className="verdict-eval">{formatScore(data.review.evalBefore)} → {formatScore(data.review.evalAfter)}</span>
                      )}
                    </p>
                    <h3 className="verdict-headline">{data.review.headline}</h3>
                    {data.review.notes.filter((n) => !n.startsWith('Evaluation')).map((n, i) => (
                      <p key={i} className="verdict-note">{n}</p>
                    ))}
                  </div>
                </div>
                <p className="muted">
                  {bad
                    ? 'Next: see how your opponent punishes it, then compare it with better options.'
                    : 'Next: see the continuation the engine expects, then the alternatives.'}
                </p>
              </div>
            )}
            {data && step === 1 && (
              <div className="stack">
                <h3>{bad ? 'How it goes wrong' : 'What comes next'}</h3>
                {data.reply.sans.length ? (
                  <>
                    <p className="muted">{formatLine(played.fen, data.reply.sans)}</p>
                    <ol className="line-steps">
                      {data.reply.captions.map((c, i) => (
                        <li key={i}>
                          <button className={`line-step${i + 1 === replyPly ? ' is-on' : ''}`} onClick={() => setReplyPly(i + 1)}>
                            {c}
                          </button>
                        </li>
                      ))}
                    </ol>
                  </>
                ) : (
                  <p className="muted">The game ends here.</p>
                )}
              </div>
            )}
            {data && step === 2 && (
              <div className="stack">
                <h3>{data.candidates.length ? 'Better options' : 'No better options'}</h3>
                {tryMove && (
                  <div className="panel panel-tight">
                    {tryMove.review ? (
                      <>
                        <p>
                          <Glyph cls={tryMove.review.cls} size="sm" /> <strong>Your try: {tryMove.review.san}</strong> — {CLASS_INFO[tryMove.review.cls].label.toLowerCase()}.
                        </p>
                        <p className="muted small mt8">{tryMove.review.headline}</p>
                      </>
                    ) : (
                      <Spinner label="Checking your idea…" />
                    )}
                    <button className="link-btn mt8" onClick={() => setTryMove(null)}>Try another move</button>
                  </div>
                )}
                {data.candidates.map((c, i) => (
                  <button
                    key={c.san}
                    className={`candidate${i === cand ? ' is-on' : ''}`}
                    onClick={() => {
                      setCand(i);
                      setCandPly(0);
                      setTryMove(null);
                    }}
                  >
                    <span className="candidate-head">
                      <span className="candidate-san">{c.san}</span>
                      {showEval && <span className="candidate-eval num">{formatScore(lineScore(c.line))}</span>}
                    </span>
                    <span className="candidate-compare">{c.compare}</span>
                    {c.reasons.map((r) => (
                      <span key={r} className="candidate-reason">{r}</span>
                    ))}
                    {i === cand && <span className="candidate-line num">{formatLine(fenBefore, c.sans.slice(0, 6))}</span>}
                  </button>
                ))}
              </div>
            )}
            {data && step === 3 && (
              <div className="stack">
                <h3>The takeaway</h3>
                <p className="takeaway">{data.takeaway.text}</p>
                {insightsBefore.length > 0 && (
                  <div className="panel panel-tight">
                    <h4>What mattered before your move</h4>
                    <ul className="bullets mt8">
                      {insightsBefore.map((i) => (
                        <li key={i.id}>
                          <strong>{i.theme}.</strong> <span className="muted">{i.text}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {data.takeaway.lessonId && (
                  <button className="link-btn" onClick={() => { onClose(); navigate(`/train/lesson/${data.takeaway.lessonId}`); }}>
                    <BookOpen size={14} /> Lesson: {data.takeaway.lessonTitle}
                  </button>
                )}
              </div>
            )}
            {data && (
              <div className="breakdown-nav">
                <Button variant="ghost" icon={<ArrowLeft size={16} />} disabled={step === 0} onClick={() => setStep(step - 1)}>
                  Back
                </Button>
                {step < STEPS.length - 1 ? (
                  <Button icon={<ArrowRight size={16} />} onClick={() => setStep(step + 1)}>
                    {STEPS[step + 1] === 'Why' && !bad ? 'What comes next' : STEPS[step + 1]}
                  </Button>
                ) : (
                  <Button onClick={onClose}>Back to game</Button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}

