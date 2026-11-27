import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, Check, Eye } from 'lucide-react';
import { Chess, type PieceSymbol, type Square } from '../lib/chess/core';
import { puzzleStart, type Puzzle } from '../lib/puzzles';
import { useApp } from '../lib/store/app';
import { usePuzzleDb } from './Puzzles';
import { playSound } from '../lib/sound';
import { Board, type Arrow } from '../components/Board';
import { FollowUpPanel } from '../components/FollowUp';
import { Button, Header, Segmented, Spinner } from '../components/ui';

const pick = <T,>(a: T[]) => a[Math.floor(Math.random() * a.length)];

// ---------------------------------------------------------------------------
// Checks, captures and threats: list every forcing move before you choose one.

interface CctQ {
  fen: string;
  forcing: { san: string; from: string; to: string; kind: 'check' | 'capture' | 'both' }[];
}

function makeCct(db: Puzzle[], rating: number): CctQ {
  for (let i = 0; i < 50; i++) {
    const p = pick(db);
    if (Math.abs(p.rating - rating) > 500) continue;
    const { fen } = puzzleStart(p);
    const moves = new Chess(fen).moves({ verbose: true });
    const forcing = moves
      .filter((m) => m.san.includes('+') || m.san.includes('#') || m.captured)
      .map((m) => ({ san: m.san, from: m.from, to: m.to, kind: (m.captured && (m.san.includes('+') || m.san.includes('#')) ? 'both' : m.captured ? 'capture' : 'check') as 'check' | 'capture' | 'both' }));
    // Promotions to several pieces count once
    const uniq = forcing.filter((f, j) => forcing.findIndex((g) => g.from === f.from && g.to === f.to) === j);
    if (uniq.length >= 3 && uniq.length <= 9) return { fen, forcing: uniq };
  }
  const { fen } = puzzleStart(db[0]);
  return { fen, forcing: [] };
}

export function CctTrainer() {
  const { db } = usePuzzleDb();
  const rating = useApp((s) => s.puzzles.rating);
  const logActivity = useApp((s) => s.logActivity);
  const [q, setQ] = useState<CctQ | null>(null);
  const [found, setFound] = useState<string[]>([]);
  const [wrong, setWrong] = useState<string[]>([]);
  const [done, setDone] = useState(false);
  const [round, setRound] = useState({ n: 0, found: 0, total: 0, wrong: 0 });

  useEffect(() => {
    if (db && !q) setQ(makeCct(db, rating));
  }, [db, q, rating]);

  if (!db || !q) return <div className="page"><Header title="Checks & captures" backTo="/courses/calculation" /><Spinner label="Loading positions…" /></div>;
  const side = q.fen.split(' ')[1] as 'w' | 'b';

  const onMove = (m: { from: Square; to: Square; promotion?: PieceSymbol }) => {
    if (done) return;
    const key = m.from + m.to;
    const hit = q.forcing.find((f) => f.from + f.to === key);
    if (hit) {
      if (!found.includes(key)) {
        setFound([...found, key]);
        playSound('move');
      }
    } else {
      setWrong([...wrong, key]);
      playSound('bad');
    }
  };

  const finish = () => {
    setDone(true);
    setRound((r) => ({ n: r.n + 1, found: r.found + found.length, total: r.total + q.forcing.length, wrong: r.wrong + wrong.length }));
    logActivity('puzzles');
    playSound(found.length === q.forcing.length ? 'good' : 'end');
  };

  const next = () => {
    setQ(makeCct(db, rating));
    setFound([]);
    setWrong([]);
    setDone(false);
  };

  const arrows: Arrow[] = [
    ...q.forcing.filter((f) => found.includes(f.from + f.to)).map((f) => ({ from: f.from, to: f.to, color: 'g' as const })),
    ...(done ? q.forcing.filter((f) => !found.includes(f.from + f.to)).map((f) => ({ from: f.from, to: f.to, color: 'r' as const })) : []),
  ];

  return (
    <div className="page board-screen-page">
      <Header title="Checks & captures" backTo="/courses/calculation" sub="Before choosing a move, list every forcing move. Find them all." />
      <div className="board-screen">
        <div className="board-col">
          <Board key={q.fen} fen={q.fen} orientation={side} movable={done ? null : side} onMove={onMove} arrows={arrows} />
        </div>
        <div className="side-col">
          <div className="panel stack">
            <p className="drill-prompt">{side === 'w' ? 'White' : 'Black'} to move. Play every check and every capture on the board — each one you find is marked with a green arrow.</p>
            <p className="num">
              Found <strong>{found.length}</strong>{done ? ` of ${q.forcing.length}` : ''}
              {wrong.length > 0 && <span className="muted"> · {wrong.length} not forcing</span>}
            </p>
            {!done ? (
              <Button icon={<Check size={16} />} onClick={finish}>I’ve found them all</Button>
            ) : (
              <>
                <p className={found.length === q.forcing.length ? 'tone-text-best' : 'muted'}>
                  {found.length === q.forcing.length ? 'All of them. That’s the habit.' : `Missed (red): ${q.forcing.filter((f) => !found.includes(f.from + f.to)).map((f) => f.san).join(', ')}.`}
                </p>
                <Button icon={<ArrowRight size={16} />} onClick={next}>Next position</Button>
              </>
            )}
          </div>
          {round.n > 0 && (
            <p className="muted small">This session: {round.found}/{round.total} forcing moves found over {round.n} position{round.n === 1 ? '' : 's'}{round.wrong ? `, ${round.wrong} non-forcing moves tried` : ''}.</p>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Visualize the line: the board stays still while moves are read out.

interface VisQ {
  fen: string;
  announced: string[];
  answer: string;
  options: string[];
  side: 'w' | 'b';
}

function makeVis(db: Puzzle[], rating: number, depth: 1 | 2): VisQ | null {
  for (let i = 0; i < 80; i++) {
    const p = pick(db);
    if (Math.abs(p.rating - rating) > 450) continue;
    const need = depth * 2 + 1; // announced plies + the move to find
    if (p.moves.length - 1 < need) continue;
    const { fen, side } = puzzleStart(p);
    const c = new Chess(fen);
    const announced: string[] = [];
    try {
      for (let k = 1; k <= depth * 2; k++) {
        const u = p.moves[k];
        announced.push(c.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: (u[4] as PieceSymbol) || undefined }).san);
      }
      const u = p.moves[depth * 2 + 1];
      const answer = c.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: (u[4] as PieceSymbol) || undefined }).san;
      c.undo();
      const others = c
        .moves()
        .filter((m) => m !== answer)
        .sort((a, b) => Number(/[+#x]/.test(b)) - Number(/[+#x]/.test(a)) || Math.random() - 0.5)
        .slice(0, 3);
      if (others.length < 3) continue;
      return { fen, announced, answer, options: [answer, ...others].sort(() => Math.random() - 0.5), side };
    } catch {
      continue;
    }
  }
  return null;
}

export function VisualizeTrainer() {
  const { db } = usePuzzleDb();
  const rating = useApp((s) => s.puzzles.rating);
  const logActivity = useApp((s) => s.logActivity);
  const [depth, setDepth] = useState<'1' | '2'>('1');
  const [q, setQ] = useState<VisQ | null>(null);
  const [answer, setAnswer] = useState<string | null>(null);
  const [score, setScore] = useState({ ok: 0, n: 0 });
  const [peek, setPeek] = useState(false);

  const fresh = () => {
    if (!db) return;
    setQ(makeVis(db, rating, depth === '2' ? 2 : 1));
    setAnswer(null);
    setPeek(false);
  };
  useEffect(() => {
    if (db && !q) fresh();
  }, [db]); // eslint-disable-line react-hooks/exhaustive-deps

  const finalFen = useMemo(() => {
    if (!q) return null;
    const c = new Chess(q.fen);
    for (const s of q.announced) c.move(s);
    return c.fen();
  }, [q]);

  const answerUci = q && finalFen ? triedUci(finalFen, q.answer) : null;

  if (!db) return <div className="page"><Header title="Visualize the line" backTo="/courses/calculation" /><Spinner label="Loading positions…" /></div>;

  const choose = (o: string) => {
    if (!q || answer) return;
    setAnswer(o);
    const ok = o === q.answer;
    setScore((s) => ({ ok: s.ok + (ok ? 1 : 0), n: s.n + 1 }));
    playSound(ok ? 'good' : 'bad');
    logActivity('puzzles');
  };
  const numbered = (q?.announced ?? []).map((s, i) => {
    const ply = i; // the announced line starts with the side to move
    const isFirst = ply % 2 === 0;
    return `${isFirst ? (q!.side === 'w' ? `${Math.floor(i / 2) + 1}.` : `${Math.floor(i / 2) + 1}…`) : ''}${s}`;
  });

  return (
    <div className="page board-screen-page">
      <Header title="Visualize the line" backTo="/courses/calculation" sub="The board doesn’t move. Play the line in your head, then pick the winning continuation." />
      <div className="row mb12">
        <Segmented value={depth} onChange={(v) => { setDepth(v); setQ(db ? makeVis(db, rating, v === '2' ? 2 : 1) : null); setAnswer(null); }} options={[{ value: '1', label: 'One move each' }, { value: '2', label: 'Two moves each' }]} />
        <span className="muted small num">{score.ok}/{score.n} correct</span>
      </div>
      {!q ? (
        <p className="muted">No suitable puzzle found — try the other depth.</p>
      ) : (
        <div className="board-screen">
          <div className="board-col">
            <Board fen={(answer || peek) && finalFen ? finalFen : q.fen} orientation={q.side} />
          </div>
          <div className="side-col">
            <div className="panel stack">
              <p className="drill-prompt">{q.side === 'w' ? 'White' : 'Black'} to move. Imagine:</p>
              <p className="vis-line num">{numbered.join(' ')}</p>
              <p className="muted">Now it’s {q.side === 'w' ? 'White' : 'Black'}’s move again. What wins?</p>
              <div className="quiz-options">
                {q.options.map((o) => (
                  <button key={o} className={`quiz-option${answer ? (o === q.answer ? ' right' : o === answer ? ' wrong' : '') : ''}`} onClick={() => choose(o)} disabled={!!answer}>
                    {o}
                  </button>
                ))}
              </div>
              {answer && (
                <>
                  <p className={answer === q.answer ? 'tone-text-best' : 'tone-text-mistake'}>{answer === q.answer ? `Right — ${q.answer}.` : `It was ${q.answer}. The board now shows the position after the line.`}</p>
                  <Button icon={<ArrowRight size={16} />} onClick={fresh}>Next</Button>
                </>
              )}
              {answer && finalFen && answerUci && <FollowUpPanel fen={finalFen} uci={answerUci} tried={answer !== q.answer ? [triedUci(finalFen, answer)].filter(Boolean) as string[] : []} />}
              {!answer && (
                <button className="link-btn" onPointerDown={() => setPeek(true)} onPointerUp={() => setPeek(false)} onPointerLeave={() => setPeek(false)}>
                  <Eye size={14} /> Hold to peek at the final position
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


function triedUci(fen: string, san: string): string | null {
  try {
    const m = new Chess(fen).move(san);
    return m.from + m.to + (m.promotion ?? '');
  } catch {
    return null;
  }
}
