import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, BookOpen, Check, Eye, GitBranch, Repeat, Shuffle } from 'lucide-react';
import { Chess, type Color, type PieceSymbol, type Square } from '../lib/chess/core';
import { getOpening } from '../lib/openings/book';
import { useApp } from '../lib/store/app';
import { navigate, query, useRoute } from '../lib/router';
import { playSound, soundForSan } from '../lib/sound';
import { describeMove } from '../lib/coach/explain';
import { buildTree, fenAt, isLearned, key, moveLabel, myKeys, myMoves, pickReply, summary, turnAt, type TrainLine } from '../lib/repTrainer';
import { Board, type Arrow } from '../components/Board';
import { Button, Header, NextDock, Sheet } from '../components/ui';
import type { Opening } from '../lib/openings/types';
import type { Grade } from '../lib/srs/scheduler';

export type RepMode = 'learn' | 'line' | 'tree';
const RUNS = 5;
const NEW_PER_SESSION = 3;
const NAME: Record<Color, string> = { w: 'White', b: 'Black' };

/** /reptrain/:openingId/:mode?line=&side=&only=learned */
export function RepTrainer({ openingId, mode }: { openingId: string; mode: RepMode }) {
  const q = query(useRoute());
  const opening = getOpening(openingId);
  if (!opening) return <div className="page"><Header title="Opening not found" backTo="/openings" /></div>;
  const side = (q.get('side') as Color) ?? opening.side;
  return <Trainer key={`${openingId}-${mode}-${q.get('line') ?? ''}`} opening={opening} side={side} mode={mode} lineId={q.get('line')} onlyLearned={q.get('only') === 'learned'} />;
}

function homeOf(o: Opening) {
  return o.id.startsWith('rep:') ? `/repertoire/${o.id.slice(4)}` : `/openings/${o.id}`;
}

function Trainer({ opening, side, mode, lineId, onlyLearned }: { opening: Opening; side: Color; mode: RepMode; lineId: string | null; onlyLearned: boolean }) {
  const oid = opening.id;
  const { tree, lines } = useMemo(() => buildTree(opening), [opening]);
  const stats = useApp((s) => s.repTrain[oid]) ?? {};
  const learnRepMoves = useApp((s) => s.learnRepMoves);
  const gradeRepMove = useApp((s) => s.gradeRepMove);
  const logActivity = useApp((s) => s.logActivity);

  // Which lines this session covers (learn: the next new ones; line: the chosen one).
  const [queue] = useState<TrainLine[]>(() => {
    if (lineId) return lines.filter((l) => l.id === lineId);
    if (mode === 'learn') return lines.filter((l) => !isLearned(l, side, stats)).slice(0, NEW_PER_SESSION);
    return [];
  });
  const [qi, setQi] = useState(0);
  const target = mode === 'tree' ? null : queue[qi] ?? null;

  const [path, setPath] = useState<string[]>([]);
  const [done, setDone] = useState(false);
  const [wrong, setWrong] = useState<string | null>(null); // what you tried
  const [hint, setHint] = useState(false);
  const [failed, setFailed] = useState<Set<string>>(new Set()); // keys missed this run
  const [graded, setGraded] = useState<Set<string>>(new Set()); // keys graded this run
  const [callout, setCallout] = useState<{ san: string; ply: number; others: string[]; note?: string } | null>(null);
  const [session, setSession] = useState({ runs: 0, clean: 0, moves: 0, misses: 0, weak: [] as string[] });
  const [linesOpen, setLinesOpen] = useState(false);

  const fen = useMemo(() => fenAt(path), [path]);
  const ply = path.length;
  const myTurn = turnAt(ply) === side;
  const atEnd = target ? ply >= target.sans.length : (tree.get(key(path))?.children.length ?? 0) === 0;

  // Expected move(s) here.
  const expected = target ? (target.sans[ply] ? [target.sans[ply]] : []) : myMoves(tree, path);
  const thisKey = key([...path, expected[0] ?? '']);
  const known = !!stats[thisKey];
  // A move you haven't met yet is taught, whatever the mode.
  const teaching = myTurn && !!expected[0] && !known && !graded.has(thisKey);

  // Opponent replies.
  useEffect(() => {
    if (done || myTurn) return;
    if (atEnd) return;
    const id = setTimeout(() => {
      const san = target ? target.sans[ply] : pickReply(tree, path, side, stats, onlyLearned);
      if (!san) {
        finish(path);
        return;
      }
      const others = (tree.get(key(path))?.children ?? []).filter((s) => s !== san);
      setCallout({ san, ply, others, note: tree.get(key([...path, san]))?.note });
      soundForSan(san);
      setPath([...path, san]);
    }, path.length === 0 ? 250 : 550);
    return () => clearTimeout(id);
  }, [path, done, myTurn]); // eslint-disable-line react-hooks/exhaustive-deps

  // End of the line.
  useEffect(() => {
    if (!done && atEnd && path.length > 0) finish(path);
  }, [atEnd, done]); // eslint-disable-line react-hooks/exhaustive-deps

  function finish(p: string[]) {
    if (done) return;
    setDone(true);
    playSound('end');
    logActivity('lines');
    learnRepMoves(oid, myKeys(p, side));
    const mine = myKeys(p, side).length;
    setSession((s) => ({
      runs: s.runs + 1,
      clean: s.clean + (failed.size === 0 ? 1 : 0),
      moves: s.moves + mine,
      misses: s.misses + failed.size,
      weak: [...new Set([...s.weak, ...failed])],
    }));
  }

  function restart() {
    setPath([]);
    setDone(false);
    setWrong(null);
    setHint(false);
    setFailed(new Set());
    setGraded(new Set());
    setCallout(null);
  }

  const onMove = (m: { from: Square; to: Square; promotion?: PieceSymbol }) => {
    if (done || !myTurn) return;
    let san: string;
    try {
      san = new Chess(fen).move(m).san;
    } catch {
      return;
    }
    if (expected.includes(san)) {
      const k = key([...path, san]);
      if (!graded.has(k) && stats[k]) {
        const g: Grade = failed.has(k) ? 'again' : hint ? 'hard' : 'good';
        gradeRepMove(oid, k, g);
      }
      setGraded(new Set(graded).add(k));
      soundForSan(san);
      setPath([...path, san]);
      setWrong(null);
      setHint(false);
      setCallout(null);
    } else {
      playSound('bad');
      setWrong(san);
      setFailed(new Set(failed).add(thisKey));
    }
  };

  // The move to show: when teaching, after a miss, or on a hint.
  const reveal = myTurn && !done && expected[0] && (teaching || wrong || hint);
  const arrows: Arrow[] = [];
  let explain = '';
  if (reveal) {
    const c = new Chess(fen);
    const mv = c.move(expected[0]);
    arrows.push({ from: mv.from, to: mv.to, color: 'g' });
    const note = tree.get(key([...path, expected[0]]))?.note;
    try {
      explain = note || describeMove(fen, mv)[0] || '';
    } catch {
      explain = note ?? '';
    }
  }
  const lastMove = useMemo(() => {
    if (!path.length) return null;
    const m = new Chess(fenAt(path.slice(0, -1))).move(path[path.length - 1]);
    return [m.from, m.to] as [string, string];
  }, [path]);

  const sum = summary(lines, side, stats);
  const lineName = target?.name ?? lines.find((l) => key(l.sans) === key(path))?.name ?? lines.find((l) => key(l.sans).startsWith(key(path)))?.name;
  const opp = NAME[side === 'w' ? 'b' : 'w'];
  const title = mode === 'learn' ? 'Learn' : mode === 'line' ? 'Practise a line' : 'Practise the repertoire';
  const sub = mode === 'learn' ? `${opening.name} · line ${Math.min(qi + 1, queue.length)} of ${queue.length}` : mode === 'line' ? `${opening.name} · ${target?.name ?? ''}` : `${opening.name} · ${Math.min(session.runs + (done ? 0 : 1), RUNS)} of ${RUNS} · ${opp} varies`;

  if (mode === 'learn' && queue.length === 0) {
    return (
      <div className="page">
        <Header title={title} backTo={homeOf(opening)} sub={opening.name} />
        <div className="panel stack">
          <h3><Check size={18} className="inline-icon" /> You’ve learned every line</h3>
          <p className="muted">{sum.learnedLines} lines, {sum.learnedMoves} of your moves. Now keep them fresh: practise against an opponent who varies their replies.</p>
          <Button icon={<Shuffle size={16} />} onClick={() => navigate(`/reptrain/${oid}/tree?side=${side}`, true)}>Practise the repertoire</Button>
        </div>
      </div>
    );
  }
  if (mode !== 'tree' && !target) return <div className="page"><Header title="Line not found" backTo={homeOf(opening)} /></div>;

  const sessionOver = mode === 'tree' && done && session.runs >= RUNS;

  return (
    <div className="page board-screen-page">
      <Header title={title} backTo={homeOf(opening)} sub={sub} />
      <div className="board-screen">
        <div className="board-col">
          <Board fen={fen} orientation={side} movable={!done && myTurn ? side : null} onMove={onMove} lastMove={lastMove} arrows={arrows} />
        </div>
        <div className="side-col">
          <div className="panel stack reptrain">
            {lineName && <p className="faint small">{lineName}</p>}
            <p className="reptrain-moves num">
              {path.length ? path.map((s, i) => <span key={i} className={turnAt(i) === side ? 'is-mine' : ''}>{i % 2 === 0 || i === 0 ? moveLabel(i, s) : s} </span>) : <span className="muted">Starting position</span>}
            </p>

            {callout && !done && (
              <div className="reptrain-branch">
                <GitBranch size={16} />
                <div>
                  <p>
                    {opp} played <strong className="num">{moveLabel(callout.ply, callout.san)}</strong>
                    {callout.others.length > 0 && <span className="muted"> — your repertoire also covers {callout.others.map((s) => moveLabel(callout.ply, s)).join(', ')}.</span>}
                  </p>
                  {callout.note && mode === 'learn' && <p className="muted small">{callout.note}</p>}
                </div>
              </div>
            )}

            {!done && myTurn && (
              <>
                {teaching ? (
                  <div className="reptrain-teach">
                    <p className="reptrain-kicker">New move</p>
                    <p>
                      {callout ? <>Against <strong className="num">{moveLabel(callout.ply, callout.san)}</strong> you play </> : <>You play </>}
                      <strong className="num">{moveLabel(ply, expected[0])}</strong>. Play it on the board.
                    </p>
                    {explain && <p className="muted">{explain}</p>}
                  </div>
                ) : wrong ? (
                  <div className="reptrain-wrong">
                    <p>
                      <strong className="num">{wrong}</strong>{' '}
                      {target && myMoves(tree, path).includes(wrong) ? 'is in your repertoire too, but this line continues with' : 'isn’t your move here. Your repertoire plays'}{' '}
                      <strong className="num">{expected.join(' or ')}</strong>.
                    </p>
                    {explain && <p className="muted small">{explain}</p>}
                  </div>
                ) : (
                  <p className="drill-prompt">
                    {hint ? <>Your move: <strong className="num">{expected[0]}</strong>{explain && <span className="muted small"> — {explain}</span>}</> : expected.length > 1 ? 'Your move — either of your repertoire moves counts.' : known ? 'Your move, from memory.' : 'Your move.'}
                  </p>
                )}
                {!teaching && !wrong && !hint && <button className="link-btn" onClick={() => setHint(true)}><Eye size={14} /> Show me</button>}
              </>
            )}
            {!done && !myTurn && !atEnd && <p className="muted small">{opp} is choosing a reply…</p>}

            {done && (
              <div className="stack">
                {mode === 'learn' ? (
                  <>
                    <h3><Check size={18} className="inline-icon" /> Line learned</h3>
                    <p className="muted">{failed.size === 0 ? 'Every known move right, and the new ones are in your memory schedule.' : `${failed.size} slip${failed.size === 1 ? '' : 's'} on moves you’d seen before — they’ll come up again soon.`}</p>
                  </>
                ) : sessionOver ? (
                  <>
                    <h3>Session done</h3>
                    <p className="num">{session.clean} of {session.runs} lines without a slip · {session.moves - session.misses} of {session.moves} moves right first time.</p>
                    {session.weak.length > 0 && <p className="muted small">To firm up: {session.weak.map((k) => { const s = k.split(' '); return moveLabel(s.length - 1, s[s.length - 1]); }).join(', ')} — they’ll come back sooner.</p>}
                  </>
                ) : (
                  <>
                    <h3>{failed.size === 0 ? <><Check size={18} className="inline-icon" /> Clean</> : `${failed.size} slip${failed.size === 1 ? '' : 's'}`}</h3>
                    <p className="muted small">End of your preparation in this line.</p>
                  </>
                )}
              </div>
            )}
          </div>

          <p className="muted small num">{sum.learnedLines}/{sum.lines} lines learned · {sum.due} move{sum.due === 1 ? '' : 's'} due for review</p>
          {mode !== 'learn' && <button className="link-btn small" onClick={() => setLinesOpen(true)}>Practise a specific line instead</button>}
        </div>
      </div>

      {done && (
        <NextDock>
          {mode === 'learn' ? (
            qi + 1 < queue.length ? (
              <Button icon={<ArrowRight size={16} />} onClick={() => { setQi(qi + 1); restart(); }}>Next new line</Button>
            ) : (
              <Button icon={<Shuffle size={16} />} onClick={() => navigate(`/reptrain/${oid}/tree?side=${side}&only=learned`, true)}>Now practise them</Button>
            )
          ) : mode === 'line' ? (
            <>
              <Button variant="secondary" icon={<Repeat size={16} />} onClick={restart}>Again</Button>
              <Button icon={<Shuffle size={16} />} onClick={() => navigate(`/reptrain/${oid}/tree?side=${side}`, true)}>Mixed</Button>
            </>
          ) : sessionOver ? (
            <Button icon={<Repeat size={16} />} onClick={() => { setSession({ runs: 0, clean: 0, moves: 0, misses: 0, weak: [] }); restart(); }}>Another {RUNS}</Button>
          ) : (
            <Button icon={<ArrowRight size={16} />} onClick={restart}>Next line ({session.runs + 1}/{RUNS})</Button>
          )}
        </NextDock>
      )}

      <LinePicker open={linesOpen} onClose={() => setLinesOpen(false)} opening={opening} side={side} lines={lines} stats={stats} />
    </div>
  );
}

function LinePicker({ open, onClose, opening, side, lines, stats }: { open: boolean; onClose: () => void; opening: Opening; side: Color; lines: TrainLine[]; stats: Record<string, import('../lib/srs/scheduler').CardState> }) {
  return (
    <Sheet open={open} onClose={onClose} title="Practise one line">
      <p className="muted small">{NAME[side === 'w' ? 'b' : 'w']} follows this line exactly. Lines you haven’t learned yet are taught first.</p>
      <div className="list mt8">
        {lines.map((l) => {
          const learned = isLearned(l, side, stats);
          return (
            <button key={l.id} className="list-item" onClick={() => { onClose(); navigate(`/reptrain/${opening.id}/${learned ? 'line' : 'learn'}?side=${side}&line=${l.id}`); }}>
              <span className="list-item-main">
                <span className="list-item-title">{l.name}</span>
                <span className="muted small num">{l.sans.slice(0, 8).map((s, i) => (i % 2 === 0 ? `${i / 2 + 1}.${s}` : s)).join(' ')}{l.sans.length > 8 ? ' …' : ''}</span>
              </span>
              <span className={`small ${learned ? 'tone-text-best' : 'muted'}`}>{learned ? 'Learned' : <><BookOpen size={14} /> New</>}</span>
            </button>
          );
        })}
      </div>
    </Sheet>
  );
}

/** Entry point shown on a repertoire or opening page: the two phases. */
export function RepTrainPanel({ opening, side }: { opening: Opening; side: Color }) {
  const stats = useApp((s) => s.repTrain[opening.id]) ?? {};
  const { lines } = useMemo(() => buildTree(opening), [opening]);
  const [open, setOpen] = useState(false);
  if (!lines.length) return null;
  const s = summary(lines, side, stats);
  const newLeft = s.lines - s.learnedLines;
  const base = `/reptrain/${opening.id}`;
  return (
    <div className="panel stack reptrain-panel">
      <div className="row-between">
        <h3>Train it</h3>
        <span className="muted small num">{s.learnedLines}/{s.lines} lines · {s.due} due</span>
      </div>
      <div className="meter"><div className="meter-fill" style={{ width: `${s.moves ? (s.learnedMoves / s.moves) * 100 : 0}%` }} /></div>
      <button className="reptrain-step" onClick={() => navigate(`${base}/learn?side=${side}`)} disabled={newLeft === 0}>
        <span className="reptrain-num">1</span>
        <span className="list-item-main">
          <strong>Learn</strong>
          <span className="muted small">{newLeft ? `${Math.min(NEW_PER_SESSION, newLeft)} new line${Math.min(NEW_PER_SESSION, newLeft) === 1 ? '' : 's'} — each move shown and explained, and which reply gets which answer.` : 'Every line learned.'}</span>
        </span>
      </button>
      <button className="reptrain-step" onClick={() => navigate(`${base}/tree?side=${side}${s.learnedLines < s.lines && s.learnedLines > 0 ? '&only=learned' : ''}`)} disabled={s.learnedLines === 0}>
        <span className="reptrain-num">2</span>
        <span className="list-item-main">
          <strong>Practise the repertoire{s.due ? ` · ${s.due} due` : ''}</strong>
          <span className="muted small">The opponent varies between the replies in your tree, leaning on what you’re due to review. Play your moves from memory.</span>
        </span>
      </button>
      <button className="link-btn" onClick={() => setOpen(true)}>Practise one specific line</button>
      <LinePicker open={open} onClose={() => setOpen(false)} opening={opening} side={side} lines={lines} stats={stats} />
    </div>
  );
}
