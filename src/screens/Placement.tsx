import { useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Chess, START_FEN, uid, type Color, type PieceSymbol, type Square } from '../lib/chess/core';
import { useApp } from '../lib/store/app';
import { saveGameBody } from '../lib/store/gamesDb';
import { playSound, soundForSan } from '../lib/sound';
import { navigate } from '../lib/router';
import {
  MAX_BOT_MOVES,
  PHASES,
  phaseFor,
  placementMove,
  scorePlacement,
  startUnitFor,
  type Phase,
  type PlacementResult,
  type UserMoveRecord,
} from '../lib/path/placement';
import { moveAccuracy, winPctWhite } from '../lib/coach/eval';
import type { LevelId, Mood } from '../lib/path/types';
import { Board } from '../components/Board';
import { Rookie, RookieSays } from '../components/Mascot';
import { StartPicker } from '../components/StartPicker';
import { Button } from '../components/ui';
import { X } from 'lucide-react';

function Foot({ children }: { children: ReactNode }) {
  return createPortal(
    <div className="pl-foot is-info">
      <div className="pl-foot-inner">
        <div className="pl-foot-actions">{children}</div>
      </div>
    </div>,
    document.body,
  );
}

export interface PlacementOutcome {
  result: PlacementResult;
  startUnit: string;
  level: LevelId;
}

type Stage = 'intro' | 'play' | 'result';

/**
 * The placement game. `prior` is the rating the player gave in the quiz.
 * Calls `onDone(null)` when skipped.
 */
export function PlacementGame({ prior, onDone, skipLabel = 'Skip the game' }: { prior: number; onDone: (o: PlacementOutcome | null) => void; skipLabel?: string }) {
  const [stage, setStage] = useState<Stage>('intro');
  const [color, setColor] = useState<Color>('w');
  const [result, setResult] = useState<PlacementResult | null>(null);
  const [records, setRecords] = useState<UserMoveRecord[]>([]);

  if (stage === 'intro')
    return (
      <>
        <div className="ls-intro">
          <Rookie mood="wave" size={130} />
          <h1>Now let’s play!</h1>
          <p>One practice game against me so I can see how you really play. There’s nothing to lose — play your normal game and I’ll suggest where to start. It takes about ten minutes.</p>
          <div className="pg-colors" role="radiogroup" aria-label="Your colour">
            {(['w', 'b'] as Color[]).map((c) => (
              <button key={c} role="radio" aria-checked={color === c} className={`pg-color${color === c ? ' is-on' : ''}`} onClick={() => setColor(c)}>
                <span className={`pg-swatch is-${c}`} />
                {c === 'w' ? 'Play White' : 'Play Black'}
              </button>
            ))}
          </div>
        </div>
        <Foot>
          <button className="pl-foot-skip" onClick={() => onDone(null)}>
            {skipLabel}
          </button>
          <Button size="lg" className="pl-foot-btn" onClick={() => setStage('play')}>
            Play Rookie
          </Button>
        </Foot>
      </>
    );
  if (stage === 'play')
    return (
      <PlayView
        color={color}
        onFinish={(recs, how) => {
          setRecords(recs);
          setResult(scorePlacement(recs, prior, how));
          setStage('result');
        }}
      />
    );
  return <ResultView result={result!} records={records} onDone={onDone} />;
}

const GREETS: Record<Phase, string> = {
  strong: 'Your move. I’m playing my best right now.',
  steady: 'Your move.',
  shaky: 'Your move.',
  generous: 'Your move.',
};

function PlayView({ color, onFinish }: { color: Color; onFinish: (r: UserMoveRecord[], how: 'win' | 'loss' | 'draw' | 'stopped') => void }) {
  const addGame = useApp((s) => s.addGame);
  const [fen, setFen] = useState(START_FEN);
  const [sans, setSans] = useState<string[]>([]);
  const [last, setLast] = useState<[string, string] | null>(null);
  const [thinking, setThinking] = useState(false);
  const [say, setSay] = useState<{ text: string; mood: Mood }>({ text: color === 'w' ? 'You’re White — your move. I’m playing my best right now.' : 'You’re Black. I’ll start…', mood: 'happy' });
  const [botMoves, setBotMoves] = useState(0);
  const recs = useRef<UserMoveRecord[]>([]);
  const userBefore = useRef(color === 'w' ? 25 : -25);
  const gift = useRef(0);
  const phase = useRef<Phase>('strong');
  const id = useRef(uid('g'));
  const startedAt = useRef(Date.now());
  const done = useRef(false);
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  const finish = async (allSans: string[], how: 'win' | 'loss' | 'draw' | 'stopped', reason: string) => {
    if (done.current) return;
    done.current = true;
    const result = how === 'draw' ? '1/2-1/2' : how === 'win' ? (color === 'w' ? '1-0' : '0-1') : how === 'loss' ? (color === 'w' ? '0-1' : '1-0') : '*';
    const date = new Date(startedAt.current).toISOString().slice(0, 10);
    const white = color === 'w' ? 'You' : 'Rookie (placement)';
    const black = color === 'b' ? 'You' : 'Rookie (placement)';
    try {
      await saveGameBody({ id: id.current, headers: { Event: 'Outpost placement game', Date: date.replace(/-/g, '.'), White: white, Black: black, Result: result, Termination: reason }, startFen: START_FEN, sans: allSans });
      addGame({ id: id.current, createdAt: startedAt.current, white, black, result, myColor: color, source: 'bot', plies: allSans.length, date });
    } catch {
      /* saving is a bonus */
    }
    playSound('end');
    onFinish(recs.current, how);
  };

  const botTurn = async (startFen: string, allSans: string[], n: number) => {
    setThinking(true);
    setSay({ text: 'Hmm, let me think…', mood: 'think' });
    const t0 = Date.now();
    const choice = await placementMove(startFen, n);
    if (!alive.current) return;
    const pending = recs.current[recs.current.length - 1];
    if (pending && pending.after === undefined) pending.after = choice ? choice.userAfterTheirMove : 0;
    if (!choice) return;
    await new Promise((r) => setTimeout(r, Math.max(0, 450 - (Date.now() - t0))));
    if (!alive.current) return;
    const c = new Chess(startFen);
    const m = c.move({ from: choice.uci.slice(0, 2), to: choice.uci.slice(2, 4), promotion: (choice.uci[4] as PieceSymbol) || undefined });
    soundForSan(m.san);
    const nextSans = [...allSans, m.san];
    setFen(c.fen());
    setSans(nextSans);
    setLast([m.from, m.to]);
    setBotMoves(n);
    setThinking(false);
    userBefore.current = choice.userNow;
    gift.current = choice.loss;
    phase.current = choice.phase;
    // Did the player just punish a gift?
    const prev = recs.current[recs.current.length - 1];
    let text = GREETS[phaseFor(n + 1).id];
    let mood: Mood = 'happy';
    if (prev && prev.gift >= 150 && prev.before >= 100 && prev.before - (prev.after ?? 0) <= Math.max(70, prev.gift * 0.35)) {
      text = 'Ouch — you caught that one! Your move.';
      mood = 'oops';
    }
    if (c.isCheckmate()) return void finish(nextSans, 'loss', 'Checkmate');
    if (c.isDraw() || c.isStalemate()) return void finish(nextSans, 'draw', 'Draw');
    if (n >= MAX_BOT_MOVES) return void finish(nextSans, 'stopped', 'Placement game finished');
    if (choice.userNow >= 1200 && n >= 16) {
      setSay({ text: 'That’s winning for you — I resign!', mood: 'oops' });
      return void finish(nextSans, 'win', 'Rookie resigned');
    }
    if (choice.userNow <= -1200 && n >= 22) return void finish(nextSans, 'stopped', 'Placement game finished');
    setSay({ text, mood });
  };

  // Rookie opens when the player has Black (once, even if the effect re-runs).
  const opened = useRef(false);
  useEffect(() => {
    if (color === 'b' && !opened.current) {
      opened.current = true;
      void botTurn(START_FEN, [], 1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onMove = (mv: { from: Square; to: Square; promotion?: PieceSymbol }) => {
    if (thinking || done.current) return;
    const c = new Chess(fen);
    let m;
    try {
      m = c.move(mv);
    } catch {
      return;
    }
    soundForSan(m.san);
    const nextSans = [...sans, m.san];
    setFen(c.fen());
    setSans(nextSans);
    setLast([m.from, m.to]);
    const rec: UserMoveRecord = { ply: sans.length, san: m.san, before: userBefore.current, after: undefined as unknown as number, gift: gift.current, phase: phase.current };
    recs.current.push(rec);
    if (c.isCheckmate()) {
      rec.after = 1500;
      setSay({ text: 'Checkmate! Well played.', mood: 'wow' });
      return void finish(nextSans, 'win', 'Checkmate');
    }
    if (c.isDraw() || c.isStalemate()) {
      rec.after = 0;
      return void finish(nextSans, 'draw', 'Draw');
    }
    void botTurn(c.fen(), nextSans, botMoves + 1);
  };

  const stop = () => {
    // The last move has an eval once Rookie has replied; drop it otherwise.
    recs.current = recs.current.filter((r) => r.after !== undefined);
    void finish(sans, 'stopped', 'Stopped early');
  };

  const userMoves = recs.current.length;
  return (
    <>
      <RookieSays mood={say.mood}>
        <p className="pl-text">{say.text}</p>
        <p className="pl-sub">
          Placement game · move {Math.floor(sans.length / 2) + 1}
        </p>
      </RookieSays>
      <div className="pl-board">
        <Board fen={fen} orientation={color} movable={thinking || done.current ? null : color} onMove={onMove} lastMove={last} />
      </div>
      <div className="pg-meter" aria-label="Game progress">
        <span style={{ width: `${Math.min(100, (botMoves / MAX_BOT_MOVES) * 100)}%` }} />
      </div>
      <Foot>
        <button className="pl-foot-skip" onClick={stop} disabled={userMoves < 10 || thinking}>
          {userMoves < 10 ? `End early after move 10` : 'End the game here'}
        </button>
      </Foot>
    </>
  );
}

function ResultView({ result, records, onDone }: { result: PlacementResult; records: UserMoveRecord[]; onDone: (o: PlacementOutcome | null) => void }) {
  const sug = startUnitFor(result.elo);
  const [pick, setPick] = useState<{ unit: string; level: LevelId }>({ unit: sug.unit.id, level: sug.level.id });
  const byPhase = PHASES.map((ph) => {
    const xs = records.filter((r) => r.phase === ph.id && r.after !== undefined).map((r) => moveAccuracy(winPctWhite({ cp: r.before }), winPctWhite({ cp: r.after })));
    return { ph, n: xs.length, acc: xs.length ? Math.round(xs.reduce((a, b) => a + b, 0) / xs.length) : null };
  });
  return (
    <>
      <div className="ls-reveal">
        <Rookie mood="cheer" size={100} className="rookie-celebrate" />
        <span className="ls-kicker">Placement rating</span>
        <h1 className="pg-elo">~{result.elo}</h1>
        <p className="ls-line">A rough estimate from one game{result.priorWeight > 0.4 ? ', blended with what you told me' : ''}. It’ll sharpen as you play.</p>
      </div>
      <div className="pg-tiles">
        <div>
          <b>{Math.round(result.accuracy)}%</b>
          <span>Accuracy</span>
        </div>
        <div>
          <b>{result.chances ? `${result.punished}/${result.chances}` : '—'}</b>
          <span>Gifts punished</span>
        </div>
        <div>
          <b>{result.blunders}</b>
          <span>Big blunders</span>
        </div>
      </div>
      <div className="pg-phases">
        {byPhase.map(({ ph, n, acc }) => (
          <div key={ph.id} className={`pg-phase${n ? '' : ' is-empty'}`}>
            <span className="pg-phase-name">
              Moves {ph.from}+ · {ph.label}
            </span>
            <span className="pg-phase-bar">
              <span style={{ width: `${acc ?? 0}%` }} />
            </span>
            <b>{acc === null ? '—' : `${acc}%`}</b>
          </div>
        ))}
      </div>
      {result.notes.length > 0 && (
        <ul className="pg-notes">
          {result.notes.map((n) => (
            <li key={n}>{n}</li>
          ))}
        </ul>
      )}
      <div className="ls-plan">
        <h2>Where to start</h2>
        <p className="ls-note">I suggest starting here. Go easier or harder if you like — every lesson on the path stays open either way.</p>
        <StartPicker value={pick.unit} suggested={sug.unit.id} onChange={(unit, level) => setPick({ unit, level })} />
      </div>
      <Foot>
        <Button size="lg" className="pl-foot-btn" onClick={() => onDone({ result, startUnit: pick.unit, level: pick.level })}>
          Continue
        </Button>
      </Foot>
    </>
  );
}

/** Stand-alone route: replay the placement game and update the profile. */
export function PlacementScreen() {
  const profile = useApp((s) => s.learn.profile);
  const setProfile = useApp((s) => s.setLearnProfile);
  return (
    <div className="pl learn-start">
      <div className="pl-top">
        <button className="pl-close" aria-label="Close" onClick={() => navigate('/learn')}>
          <X size={24} />
        </button>
        <div className="pl-progress">
          <span style={{ width: '100%' }} />
        </div>
      </div>
      <div className="pl-body">
        <PlacementGame
          prior={profile?.rating ?? 1000}
          skipLabel="Not now"
          onDone={(o) => {
            if (o && profile) setProfile({ ...profile, rating: o.result.elo, level: o.level, startUnit: o.startUnit, placement: { elo: o.result.elo, accuracy: o.result.accuracy, chances: o.result.chances, punished: o.result.punished, moves: o.result.moves, at: Date.now() } });
            navigate(profile ? '/learn' : '/learn/start');
          }}
        />
      </div>
    </div>
  );
}
