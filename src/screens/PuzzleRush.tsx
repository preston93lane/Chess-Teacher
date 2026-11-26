import { useCallback, useEffect, useRef, useState } from 'react';
import { Play, RotateCcw } from 'lucide-react';
import { rushPuzzle, THEME_INFO, type Puzzle } from '../lib/puzzles';
import { formatClock } from '../lib/clock';
import { useApp } from '../lib/store/app';
import { navigate, query, useRoute } from '../lib/router';
import { Button, Header, Spinner } from '../components/ui';
import { PuzzleSolver, solutionLine, type SolveResult } from '../components/PuzzleSolver';
import { usePuzzleDb } from './Puzzles';
import { playSound } from '../lib/sound';

const LIMITS: Record<string, number | null> = { '3': 180_000, '5': 300_000, survival: null };

export function PuzzleRush() {
  const path = useRoute();
  const mode = query(path).get('mode') ?? '3';
  const limit = LIMITS[mode] ?? null;
  const { db } = usePuzzleDb();
  const best = useApp((s) => s.puzzles.rush[mode] ?? 0);
  const recordRush = useApp((s) => s.recordRush);
  const [phase, setPhase] = useState<'ready' | 'running' | 'over'>('ready');
  const [index, setIndex] = useState(0);
  const [puzzle, setPuzzle] = useState<Puzzle | null>(null);
  const [score, setScore] = useState(0);
  const [strikes, setStrikes] = useState(0);
  const [log, setLog] = useState<{ p: Puzzle; ok: boolean }[]>([]);
  const [endsAt, setEndsAt] = useState(0);
  const [now, setNow] = useState(Date.now());
  const seen = useRef(new Set<string>());

  const load = useCallback(
    (i: number) => {
      if (!db) return;
      const p = rushPuzzle(db, i, seen.current);
      if (p) seen.current.add(p.id);
      setPuzzle(p ?? null);
    },
    [db],
  );

  const start = () => {
    seen.current = new Set();
    setIndex(0);
    setScore(0);
    setStrikes(0);
    setLog([]);
    setPhase('running');
    setEndsAt(limit ? Date.now() + limit : 0);
    load(0);
  };

  const end = useCallback(
    (finalScore: number) => {
      setPhase('over');
      recordRush(mode, finalScore);
      playSound('end');
    },
    [mode, recordRush],
  );

  useEffect(() => {
    if (phase !== 'running' || !limit) return;
    const id = setInterval(() => {
      const t = Date.now();
      setNow(t);
      if (t >= endsAt) end(score);
    }, 100);
    return () => clearInterval(id);
  }, [phase, limit, endsAt, end, score]);

  const onResult = (r: SolveResult) => {
    if (!puzzle || phase !== 'running') return;
    const nextLog = [...log, { p: puzzle, ok: r.ok }];
    setLog(nextLog);
    const s = r.ok ? score + 1 : score;
    const k = r.ok ? strikes : strikes + 1;
    setScore(s);
    setStrikes(k);
    if (k >= 3) {
      setTimeout(() => end(s), 600);
      return;
    }
    setTimeout(() => {
      setIndex(index + 1);
      load(index + 1);
    }, r.ok ? 250 : 700);
  };

  const remaining = limit ? Math.max(0, endsAt - now) : null;

  return (
    <div className="page board-screen-page">
      <Header title="Puzzle Rush" backTo="/puzzles" sub={`${mode === 'survival' ? 'Survival' : `${mode} minutes`} · best ${best}`} />
      {!db && <Spinner label="Loading puzzles…" />}
      {db && phase === 'ready' && (
        <div className="panel stack rush-intro">
          <h2>{mode === 'survival' ? 'No clock — three strikes.' : `${mode} minutes, three strikes.`}</h2>
          <p className="muted">Puzzles start easy and climb fast. Solve as many as you can; one wrong move is a strike.</p>
          <Button size="lg" icon={<Play size={18} />} onClick={start}>Start</Button>
        </div>
      )}
      {db && phase !== 'ready' && (
        <div className="board-screen">
          <div className="board-col">
            {puzzle && phase === 'running' && <PuzzleSolver key={puzzle.id} puzzle={puzzle} onResult={onResult} fast />}
            {phase === 'over' && log.length > 0 && <PuzzleSolver key={`over-${log[log.length - 1].p.id}`} puzzle={log[log.length - 1].p} onResult={() => undefined} showSolution fast />}
          </div>
          <div className="side-col">
            <div className="rush-score">
              <div>
                <span className="rush-num num">{score}</span>
                <span className="muted small">solved</span>
              </div>
              {remaining !== null && (
                <div>
                  <span className={`rush-num num${remaining < 15000 ? ' tone-text-blunder' : ''}`}>{formatClock(remaining)}</span>
                  <span className="muted small">left</span>
                </div>
              )}
              <div className="strikes" aria-label={`${strikes} strikes`}>
                {[0, 1, 2].map((i) => (
                  <span key={i} className={`strike${i < strikes ? ' is-on' : ''}`}>✕</span>
                ))}
              </div>
            </div>
            <div className="rush-log">
              {log.map((l, i) => (
                <span key={i} className={`recent-dot ${l.ok ? 'ok' : 'bad'}`} title={`${l.p.rating}`}>
                  {l.ok ? '✓' : '✕'}
                </span>
              ))}
            </div>
            {phase === 'over' && (
              <div className="panel stack">
                <h2>{score > best ? 'New best!' : `Score: ${score}`}</h2>
                <p className="muted">
                  {log.filter((l) => !l.ok).length
                    ? 'The puzzles you missed:'
                    : 'Clean run.'}
                </p>
                <ul className="bullets small">
                  {log
                    .filter((l) => !l.ok)
                    .map((l) => (
                      <li key={l.p.id}>
                        {l.p.themes.map((t) => THEME_INFO[t]?.label).filter(Boolean).slice(0, 2).join(', ') || 'Tactic'} ({l.p.rating}): <span className="muted">{solutionLine(l.p)}</span>
                      </li>
                    ))}
                </ul>
                <div className="row">
                  <Button icon={<RotateCcw size={16} />} onClick={start}>Again</Button>
                  <Button variant="secondary" onClick={() => navigate('/puzzles')}>Puzzles</Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
