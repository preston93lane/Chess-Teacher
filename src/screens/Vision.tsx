import { useCallback, useEffect, useRef, useState } from 'react';
import { Play, RotateCcw } from 'lucide-react';
import { useApp } from '../lib/store/app';
import { Button, Header, Section, Segmented } from '../components/ui';
import { playSound } from '../lib/sound';

type Mode = 'find' | 'name' | 'color' | 'knight' | 'diagonal';

const MODES: { id: Mode; title: string; about: string; seconds: number }[] = [
  { id: 'find', title: 'Find the square', about: 'A square is named — tap it on a board with no coordinates.', seconds: 30 },
  { id: 'name', title: 'Name the square', about: 'A square lights up — pick its name.', seconds: 30 },
  { id: 'color', title: 'Light or dark?', about: 'Know every square’s colour without looking — essential for bishops.', seconds: 30 },
  { id: 'knight', title: 'Knight routes', about: 'How many moves does a knight need from one square to another?', seconds: 60 },
  { id: 'diagonal', title: 'Same diagonal?', about: 'Are the two squares on one diagonal? Spot bishop lines instantly.', seconds: 45 },
];

const FILES = 'abcdefgh';
const randSq = () => FILES[Math.floor(Math.random() * 8)] + (1 + Math.floor(Math.random() * 8));
const fi = (s: string) => s.charCodeAt(0) - 97;
const ri = (s: string) => parseInt(s[1], 10) - 1;
const isLight = (s: string) => (fi(s) + ri(s)) % 2 === 1;

function knightDistance(a: string, b: string): number {
  const start = fi(a) * 8 + ri(a);
  const goal = fi(b) * 8 + ri(b);
  const dist = new Array(64).fill(-1);
  dist[start] = 0;
  const q = [start];
  const J = [[1, 2], [2, 1], [2, -1], [1, -2], [-1, -2], [-2, -1], [-2, 1], [-1, 2]];
  while (q.length) {
    const c = q.shift()!;
    if (c === goal) return dist[c];
    const f = Math.floor(c / 8);
    const r = c % 8;
    for (const [df, dr] of J) {
      const nf = f + df;
      const nr = r + dr;
      if (nf < 0 || nf > 7 || nr < 0 || nr > 7) continue;
      const n = nf * 8 + nr;
      if (dist[n] < 0) {
        dist[n] = dist[c] + 1;
        q.push(n);
      }
    }
  }
  return -1;
}

interface Q {
  prompt: string;
  sq?: string;
  sq2?: string;
  options?: string[];
  answer: string;
}

function makeQ(mode: Mode): Q {
  const a = randSq();
  if (mode === 'find') return { prompt: a, answer: a };
  if (mode === 'name') {
    const opts = new Set([a]);
    while (opts.size < 4) {
      // near-misses are more instructive than random squares
      const f = Math.max(0, Math.min(7, fi(a) + Math.floor(Math.random() * 3) - 1));
      const r = Math.max(0, Math.min(7, ri(a) + Math.floor(Math.random() * 3) - 1));
      opts.add(FILES[f] + (r + 1));
    }
    return { prompt: 'Which square is highlighted?', sq: a, options: [...opts].sort(() => Math.random() - 0.5), answer: a };
  }
  if (mode === 'color') return { prompt: a, answer: isLight(a) ? 'Light' : 'Dark' };
  if (mode === 'knight') {
    let b = randSq();
    while (b === a) b = randSq();
    return { prompt: `${a} → ${b}`, sq: a, sq2: b, answer: String(knightDistance(a, b)) };
  }
  // diagonal: half the time pick a square on a shared diagonal
  let b = randSq();
  if (Math.random() < 0.5) {
    const d = 1 + Math.floor(Math.random() * 6);
    const dirs = [[1, 1], [1, -1], [-1, 1], [-1, -1]].filter(([x, y]) => fi(a) + x * d >= 0 && fi(a) + x * d < 8 && ri(a) + y * d >= 0 && ri(a) + y * d < 8);
    if (dirs.length) {
      const [x, y] = dirs[Math.floor(Math.random() * dirs.length)];
      b = FILES[fi(a) + x * d] + (ri(a) + y * d + 1);
    }
  }
  while (b === a) b = randSq();
  const same = Math.abs(fi(a) - fi(b)) === Math.abs(ri(a) - ri(b));
  return { prompt: `${a} and ${b}`, sq: a, sq2: b, answer: same ? 'Yes' : 'No' };
}

export function VisionTrainer() {
  const best = useApp((s) => s.vision);
  const record = useApp((s) => s.recordVision);
  const theme = useApp((s) => s.settings.boardTheme);
  const [mode, setMode] = useState<Mode>('find');
  const [orient, setOrient] = useState<'w' | 'b' | 'random'>('w');
  const [phase, setPhase] = useState<'ready' | 'run' | 'over'>('ready');
  const [q, setQ] = useState<Q>(() => makeQ('find'));
  const [score, setScore] = useState(0);
  const [misses, setMisses] = useState(0);
  const [flash, setFlash] = useState<{ sq: string; ok: boolean } | null>(null);
  const [endsAt, setEndsAt] = useState(0);
  const [now, setNow] = useState(Date.now());
  const [side, setSide] = useState<'w' | 'b'>('w');
  const scoreRef = useRef(0);
  const prevBest = useRef(0);
  const meta = MODES.find((m) => m.id === mode)!;

  const start = () => {
    setScore(0);
    scoreRef.current = 0;
    prevBest.current = best[mode] ?? 0;
    setMisses(0);
    setQ(makeQ(mode));
    setSide(orient === 'random' ? (Math.random() < 0.5 ? 'w' : 'b') : orient);
    setEndsAt(Date.now() + meta.seconds * 1000);
    setPhase('run');
  };

  const finish = useCallback(() => {
    setPhase('over');
    record(mode, scoreRef.current);
    playSound('end');
  }, [mode, record]);

  useEffect(() => {
    if (phase !== 'run') return;
    const id = setInterval(() => {
      const t = Date.now();
      setNow(t);
      if (t >= endsAt) finish();
    }, 100);
    return () => clearInterval(id);
  }, [phase, endsAt, finish]);

  const answer = (a: string, sq?: string) => {
    if (phase !== 'run') return;
    const ok = a === q.answer;
    if (ok) {
      scoreRef.current += 1;
      setScore(scoreRef.current);
    } else setMisses((m) => m + 1);
    if (sq) setFlash({ sq, ok });
    playSound(ok ? 'move' : 'bad');
    setTimeout(() => setFlash(null), 250);
    setQ(makeQ(mode));
    if (orient === 'random' && Math.random() < 0.3) setSide(Math.random() < 0.5 ? 'w' : 'b');
  };

  const left = Math.max(0, endsAt - now);
  const squares = [];
  for (let y = 0; y < 8; y++) {
    for (let x = 0; x < 8; x++) {
      const f = side === 'w' ? x : 7 - x;
      const r = side === 'w' ? 7 - y : y;
      const name = FILES[f] + (r + 1);
      const light = (f + r) % 2 === 1;
      const hl = (mode === 'name' || mode === 'knight' || mode === 'diagonal') && (q.sq === name || q.sq2 === name) && phase === 'run';
      squares.push(
        <button
          key={name}
          className={`vsq ${light ? 'sq-light' : 'sq-dark'}${hl ? ' vsq-hl' : ''}${flash?.sq === name ? (flash.ok ? ' vsq-ok' : ' vsq-bad') : ''}`}
          onClick={() => mode === 'find' && answer(name, name)}
          aria-label={mode === 'find' ? 'square' : name}
          tabIndex={mode === 'find' ? 0 : -1}
        />,
      );
    }
  }

  return (
    <div className="page board-screen-page">
      <Header title="Board vision" backTo="/train" sub="Short, timed drills that make the board automatic — the basis of calculation and blindfold-style thinking." />
      {phase === 'ready' ? (
        <div className="page-narrow">
          <Section title="Drill">
            <div className="stack">
              {MODES.map((m) => (
                <button key={m.id} className={`source-card${mode === m.id ? ' is-on' : ''}`} onClick={() => { setMode(m.id); setQ(makeQ(m.id)); }}>
                  <span className="source-title">{m.title}</span>
                  <span className="muted small">{m.about}</span>
                  <span className="faint small num">{m.seconds} s · best {best[m.id] ?? 0}</span>
                </button>
              ))}
            </div>
          </Section>
          {(mode === 'find' || mode === 'name') && (
            <Section title="Board orientation">
              <Segmented value={orient} onChange={setOrient} options={[{ value: 'w', label: 'White' }, { value: 'b', label: 'Black' }, { value: 'random', label: 'Mixed' }]} />
            </Section>
          )}
          <div className="sticky-cta">
            <Button size="lg" className="btn-block" icon={<Play size={18} />} onClick={start}>Start</Button>
          </div>
        </div>
      ) : (
        <div className="board-screen">
          <div className="board-col">
            {mode === 'find' || mode === 'name' ? (
              <div className={`vision-board board-${theme}`}>{squares}</div>
            ) : (
              <div className="vision-prompt-big num">{q.prompt}</div>
            )}
          </div>
          <div className="side-col">
            <div className="rush-score">
              <div><span className="rush-num num">{score}</span><span className="muted small">correct</span></div>
              <div><span className={`rush-num num${left < 5000 ? ' tone-text-blunder' : ''}`}>{Math.ceil(left / 1000)}</span><span className="muted small">seconds</span></div>
              <div><span className="rush-num num">{misses}</span><span className="muted small">missed</span></div>
            </div>
            {phase === 'run' && (
              <div className="panel stack">
                {mode === 'find' && <p className="vision-ask">Tap <strong className="num">{q.prompt}</strong> <span className="muted small">({side === 'w' ? 'White' : 'Black'} at the bottom)</span></p>}
                {mode === 'name' && (
                  <div className="quiz-options">
                    {q.options!.map((o) => <button key={o} className="quiz-option" onClick={() => answer(o)}>{o}</button>)}
                  </div>
                )}
                {mode === 'color' && (
                  <div className="row">
                    <Button variant="secondary" onClick={() => answer('Light')}>Light</Button>
                    <Button variant="secondary" onClick={() => answer('Dark')}>Dark</Button>
                  </div>
                )}
                {mode === 'knight' && (
                  <>
                    <p className="vision-ask">Knight from <strong>{q.sq}</strong> to <strong>{q.sq2}</strong>: how many moves?</p>
                    <div className="row">{['1', '2', '3', '4', '5', '6'].map((n) => <Button key={n} variant="secondary" size="sm" onClick={() => answer(n)}>{n}</Button>)}</div>
                  </>
                )}
                {mode === 'diagonal' && (
                  <>
                    <p className="vision-ask">Are <strong>{q.sq}</strong> and <strong>{q.sq2}</strong> on the same diagonal?</p>
                    <div className="row">
                      <Button variant="secondary" onClick={() => answer('Yes')}>Yes</Button>
                      <Button variant="secondary" onClick={() => answer('No')}>No</Button>
                    </div>
                  </>
                )}
              </div>
            )}
            {phase === 'over' && (
              <div className="panel stack">
                <h2>{score > prevBest.current ? `Personal best: ${score}!` : `Score: ${score}`}</h2>
                <p className="muted">{misses ? `${misses} slip${misses > 1 ? 's' : ''}. Accuracy beats speed — the speed follows.` : 'No mistakes.'}</p>
                <div className="row">
                  <Button icon={<RotateCcw size={16} />} onClick={start}>Again</Button>
                  <Button variant="secondary" onClick={() => setPhase('ready')}>Change drill</Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
