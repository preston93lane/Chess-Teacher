import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, Check, Eye, Play, RotateCcw, X } from 'lucide-react';
import { Chess, formatLine, START_FEN, type PieceSymbol, type Square } from '../lib/chess/core';
import { makeQuestions, type QuizQuestion, type QuizSource } from '../lib/quiz';
import { useApp } from '../lib/store/app';
import { navigate, query, useRoute } from '../lib/router';
import { soundForSan, playSound } from '../lib/sound';
import { Board, type Arrow } from '../components/Board';
import { Button, Header, Section, Segmented, Spinner } from '../components/ui';
import { BlockBanner, completeBlock } from '../components/BlockBanner';
import { OPENINGS } from '../data/openings';

const SOURCES: { value: QuizSource; label: string; about: string }[] = [
  { value: 'repertoire', label: 'My repertoire', about: 'Lines from the openings you added to your repertoire.' },
  { value: 'library', label: 'Library lines', about: 'Name the exact line from the 14 library openings, then play the next theory move.' },
  { value: 'families', label: 'All openings', about: 'Recognise the opening family among 35 mainstream openings, then play the main continuation.' },
  { value: 'variations', label: 'Name the variation', about: 'Hard: pick the exact named variation from its siblings.' },
];

export function OpeningQuiz() {
  const path = useRoute();
  const q = query(path);
  const repertoire = useApp((s) => s.repertoire);
  const best = useApp((s) => s.quiz.best);
  const presetSource = q.get('source') as QuizSource | null;
  const ids = q.get('ids')?.split(',').filter(Boolean);
  const [source, setSource] = useState<QuizSource>(presetSource ?? (Object.keys(repertoire).length ? 'repertoire' : 'library'));
  const [count, setCount] = useState(+(q.get('count') ?? 10));
  const [started, setStarted] = useState(!!presetSource);

  if (!started) {
    return (
      <div className="page page-narrow">
        <Header title="Opening quiz" backTo="/openings" sub="You see a position. Name the opening, then play the move theory recommends." />
        <Section title="What to practise">
          <div className="stack">
            {SOURCES.map((s) => (
              <button
                key={s.value}
                className={`source-card${source === s.value ? ' is-on' : ''}`}
                onClick={() => setSource(s.value)}
                disabled={s.value === 'repertoire' && !Object.keys(repertoire).length}
              >
                <span className="source-title">{s.label}</span>
                <span className="muted small">{s.value === 'repertoire' && !Object.keys(repertoire).length ? 'Add openings to your repertoire first.' : s.about}</span>
                {best[s.value] !== undefined && <span className="faint small num">Best: {best[s.value]}</span>}
              </button>
            ))}
          </div>
        </Section>
        <Section title="Questions">
          <Segmented value={String(count)} onChange={(v) => setCount(+v)} options={[{ value: '5', label: '5' }, { value: '10', label: '10' }, { value: '20', label: '20' }]} />
        </Section>
        <div className="sticky-cta">
          <Button size="lg" className="btn-block" icon={<Play size={18} />} onClick={() => setStarted(true)}>
            Start quiz
          </Button>
        </div>
      </div>
    );
  }
  const scopedIds = source === 'repertoire' ? Object.keys(repertoire) : ids ?? OPENINGS.map((o) => o.id);
  return <QuizRound source={ids ? 'repertoire' : source} label={source} ids={scopedIds} count={count} onExit={() => setStarted(false)} />;
}

function QuizRound({ source, label, ids, count, onExit }: { source: QuizSource; label: QuizSource; ids: string[]; count: number; onExit: () => void }) {
  const recordQuiz = useApp((s) => s.recordQuiz);
  const blockId = query(useRoute()).get('block');
  const [questions, setQuestions] = useState<QuizQuestion[] | null>(null);
  const [i, setI] = useState(0);
  const [step, setStep] = useState<'name' | 'move' | 'done'>('name');
  const [picked, setPicked] = useState<string | null>(null);
  const [moveResult, setMoveResult] = useState<{ ok: boolean; san: string; also?: boolean } | null>(null);
  const [score, setScore] = useState(0);
  const [missed, setMissed] = useState<QuizQuestion[]>([]);
  const [showMoves, setShowMoves] = useState(false);
  const [fen, setFen] = useState<string | null>(null);
  const [finished, setFinished] = useState(false);

  useEffect(() => {
    makeQuestions(source, count, ids).then(setQuestions);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const qn = questions?.[i];
  useEffect(() => {
    if (qn) setFen(qn.fen);
  }, [qn]);

  const max = (questions?.length ?? count) * 2;

  const pick = (opt: string) => {
    if (!qn || picked) return;
    setPicked(opt);
    const ok = opt === qn.answer;
    playSound(ok ? 'good' : 'bad');
    if (ok && !showMoves) setScore((s) => s + 1);
    if (!ok) setMissed((m) => [...m, qn]);
  };

  const onMove = (mv: { from: Square; to: Square; promotion?: PieceSymbol }) => {
    if (!qn || step !== 'move' || moveResult) return;
    const c = new Chess(qn.fen);
    let m;
    try {
      m = c.move(mv);
    } catch {
      return;
    }
    soundForSan(m.san);
    setFen(c.fen());
    if (m.san === qn.next) {
      setMoveResult({ ok: true, san: m.san });
      setScore((s) => s + 1);
      playSound('good');
    } else if (qn.alsoBook.includes(m.san)) {
      setMoveResult({ ok: true, san: m.san, also: true });
      setScore((s) => s + 1);
      playSound('good');
    } else {
      setMoveResult({ ok: false, san: m.san });
      playSound('bad');
      if (!missed.includes(qn)) setMissed((x) => [...x, qn]);
    }
  };

  const next = () => {
    if (!questions) return;
    if (i + 1 >= questions.length) {
      setFinished(true);
      recordQuiz(label, score, max);
      completeBlock(blockId);
      playSound('end');
      return;
    }
    setI(i + 1);
    setStep('name');
    setPicked(null);
    setMoveResult(null);
    setShowMoves(false);
  };

  const arrows: Arrow[] = useMemo(() => {
    if (!qn || !moveResult || moveResult.ok) return [];
    const c = new Chess(qn.fen);
    const m = c.move(qn.next);
    return [{ from: m.from, to: m.to, color: 'y' }];
  }, [qn, moveResult]);

  if (!questions) return <div className="page"><Header title="Opening quiz" backTo="/openings" /><Spinner label="Setting up positions…" /></div>;
  if (!questions.length)
    return (
      <div className="page page-narrow">
        <Header title="Opening quiz" backTo="/openings" />
        <p className="muted">No positions available for this selection.</p>
        <Button onClick={onExit}>Choose again</Button>
      </div>
    );

  if (finished) {
    return (
      <div className="page page-narrow">
        <Header title="Quiz complete" backTo="/openings" />
        <BlockBanner />
        <div className="panel stack">
          <p className="session-done-num num">{score}/{max}</p>
          <p className="muted">One point for naming the opening, one for the move.</p>
          {missed.length > 0 && (
            <>
              <h4>To revisit</h4>
              <ul className="bullets">
                {missed.map((m) => (
                  <li key={m.id}>
                    <strong>{m.answer}</strong> — next move {m.next}
                    {m.openingId && (
                      <>
                        {' '}
                        <button className="link-btn small" onClick={() => navigate(`/openings/${m.openingId}/learn/${m.lineId}`)}>Learn the line</button>
                      </>
                    )}
                  </li>
                ))}
              </ul>
            </>
          )}
          <div className="row">
            <Button icon={<RotateCcw size={16} />} onClick={onExit}>New quiz</Button>
            <Button variant="secondary" onClick={() => navigate('/openings')}>Openings</Button>
          </div>
        </div>
      </div>
    );
  }

  const q = qn!;
  return (
    <div className="page board-screen-page">
      <Header title="Opening quiz" backTo="/openings" sub={`Question ${i + 1} of ${questions.length} · score ${score}/${max}`} />
      <BlockBanner />
      <div className="board-screen">
        <div className="board-col">
          <Board fen={fen ?? q.fen} orientation={q.side} movable={step === 'move' && !moveResult ? q.side : null} onMove={onMove} arrows={arrows} />
        </div>
        <div className="side-col">
          {step === 'name' && (
            <div className="stack">
              <h3>{label === 'families' ? 'Which opening is this?' : label === 'variations' ? 'Which variation is this?' : 'Which line is this?'}</h3>
              <div className="quiz-options">
                {q.options.map((o) => {
                  const state = picked ? (o === q.answer ? 'right' : o === picked ? 'wrong' : '') : '';
                  return (
                    <button key={o} className={`quiz-option ${state}`} onClick={() => pick(o)} disabled={!!picked}>
                      {state === 'right' && <Check size={16} />}
                      {state === 'wrong' && <X size={16} />}
                      <span>{o}</span>
                    </button>
                  );
                })}
              </div>
              {!picked && !showMoves && (
                <button className="link-btn" onClick={() => setShowMoves(true)}>
                  <Eye size={14} /> Show the moves (no point for the name)
                </button>
              )}
              {showMoves && <p className="muted small num">{formatLine(START_FEN, q.sans)}</p>}
              {picked && (
                <>
                  {q.note && <p className="muted small">{q.note}</p>}
                  <Button icon={<ArrowRight size={16} />} onClick={() => setStep('move')}>Now play the next move</Button>
                </>
              )}
            </div>
          )}
          {step === 'move' && (
            <div className="stack">
              <h3>{q.side === 'w' ? 'White' : 'Black'} to move — what does theory play?</h3>
              <p className="muted small num">{formatLine(START_FEN, q.sans)}</p>
              {moveResult && (
                <div className={`feedback ${moveResult.ok ? 'feedback-good' : 'feedback-bad'}`}>
                  <span>
                    {moveResult.ok
                      ? moveResult.also
                        ? `${moveResult.san} is theory too. The main move here is ${q.next}.`
                        : `${moveResult.san} — the main line.`
                      : `${moveResult.san} isn’t theory here. The main move is ${q.next}.`}
                  </span>
                </div>
              )}
              {moveResult && <Button icon={<ArrowRight size={16} />} onClick={next}>{i + 1 >= questions.length ? 'See results' : 'Next position'}</Button>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
