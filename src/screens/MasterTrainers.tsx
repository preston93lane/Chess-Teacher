import { eventLabel } from '../lib/explorer';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowRight, RotateCcw, Shield, Target } from 'lucide-react';
import { Chess, type Color, type PieceSymbol, type Square } from '../lib/chess/core';
import { engine } from '../lib/engine/stockfish';
import { lineScore } from '../lib/coach/eval';
import { explorerMeta, getMasterGame, loadExplorer, type MasterGame } from '../lib/explorer';
import { useApp } from '../lib/store/app';
import { playSound, soundForSan } from '../lib/sound';
import { Board, type Arrow } from '../components/Board';
import { FollowUpPanel } from '../components/FollowUp';
import { Button, Header, Spinner, NextDock } from '../components/ui';

/** Score in pawns for `side` (mate = ±20). */
async function evalFor(fen: string, side: Color, depth = 12): Promise<{ v: number; best?: string }> {
  const r = await engine.analyze(fen, { depth, multipv: 1 });
  const s = lineScore(r.lines[0]);
  const white = !s ? 0 : s.mate !== undefined ? (s.mate > 0 ? 20 : -20) : (s.cp ?? 0) / 100;
  return { v: side === 'w' ? white : -white, best: r.lines[0]?.pv[0] ?? r.bestmove };
}

function randomGame(): MasterGame | null {
  const meta = explorerMeta();
  if (!meta) return null;
  for (let i = 0; i < 20; i++) {
    const g = getMasterGame(Math.floor(Math.random() * 2500));
    if (g && g.moves.length >= 30) return g;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Threat spotter

interface ThreatQ {
  game: MasterGame;
  fen: string; // you to move
  nullFen: string; // opponent to move (as if you passed)
  you: Color;
  lastMove: [string, string];
  lastSan: string;
  threat: string; // uci
  threatSan: string;
  gain: number;
  base: number;
}

async function makeThreat(): Promise<ThreatQ | null> {
  for (let attempt = 0; attempt < 12; attempt++) {
    const g = randomGame();
    if (!g) return null;
    const ply = 14 + Math.floor(Math.random() * Math.min(40, g.moves.length - 16));
    const c = new Chess();
    let last;
    try {
      for (let i = 0; i < ply; i++) last = c.move(g.moves[i]);
    } catch {
      continue;
    }
    if (!last || c.inCheck() || c.isGameOver()) continue;
    const you = c.turn() as Color;
    const opp: Color = you === 'w' ? 'b' : 'w';
    const parts = c.fen().split(' ');
    parts[1] = opp;
    parts[3] = '-';
    const nullFen = parts.join(' ');
    try {
      if (new Chess(nullFen).inCheck()) continue;
    } catch {
      continue;
    }
    const [now, passed] = await Promise.all([evalFor(c.fen(), opp, 11), evalFor(nullFen, opp, 11)]);
    const gain = passed.v - now.v;
    if (gain < 1.5 || !passed.best) continue;
    const t = new Chess(nullFen);
    let san = passed.best;
    try {
      san = t.move({ from: passed.best.slice(0, 2), to: passed.best.slice(2, 4), promotion: (passed.best[4] as PieceSymbol) || undefined }).san;
    } catch {
      continue;
    }
    return { game: g, fen: c.fen(), nullFen, you, lastMove: [last.from, last.to], lastSan: last.san, threat: passed.best, threatSan: san, gain, base: now.v };
  }
  return null;
}

export function ThreatSpotter() {
  const logActivity = useApp((s) => s.logActivity);
  const [ready, setReady] = useState(false);
  const [q, setQ] = useState<ThreatQ | null>(null);
  const [stage, setStage] = useState<'threat' | 'defend' | 'done'>('threat');
  const [msg, setMsg] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const [score, setScore] = useState({ threats: 0, defences: 0, n: 0 });
  const [arrows, setArrows] = useState<Arrow[]>([]);
  const [defence, setDefence] = useState<{ uci: string; tried?: string } | null>(null);
  const nextQ = useRef<Promise<ThreatQ | null> | null>(null);

  const load = useCallback(async () => {
    setQ(null);
    setStage('threat');
    setMsg(null);
    setArrows([]);
    setDefence(null);
    const p = nextQ.current ?? makeThreat();
    nextQ.current = null;
    const got = await p;
    setQ(got);
    nextQ.current = makeThreat(); // prefetch
  }, []);

  useEffect(() => {
    loadExplorer().then(() => {
      setReady(true);
      void load();
    });
  }, [load]);

  if (!ready || !q) {
    return (
      <div className="page">
        <Header title="Threat spotter" backTo="/courses/defence" />
        <Spinner label={ready ? 'Finding a position with a real threat…' : 'Loading master games…'} />
      </div>
    );
  }

  const opp: Color = q.you === 'w' ? 'b' : 'w';
  const onThreat = async (m: { from: Square; to: Square; promotion?: PieceSymbol }) => {
    const uci = m.from + m.to;
    const t = new Chess(q.nullFen);
    let san: string;
    try {
      san = t.move(m).san;
    } catch {
      return;
    }
    let ok = uci === q.threat.slice(0, 4);
    if (!ok) {
      setChecking(true);
      const r = await evalFor(t.fen(), opp, 11);
      setChecking(false);
      ok = r.v - q.base >= Math.max(1.2, q.gain - 0.8);
    }
    playSound(ok ? 'good' : 'bad');
    setArrows([{ from: q.threat.slice(0, 2), to: q.threat.slice(2, 4), color: 'r' }]);
    setMsg(ok ? `Yes — ${san}${uci === q.threat.slice(0, 4) ? '' : ` works too; the engine’s threat is ${q.threatSan}`}. Now stop it: play your move.` : `Not quite. The threat is ${q.threatSan} (red arrow). Now find a move that deals with it.`);
    setScore((s) => ({ ...s, threats: s.threats + (ok ? 1 : 0) }));
    setStage('defend');
  };

  const onDefend = async (m: { from: Square; to: Square; promotion?: PieceSymbol }) => {
    const c = new Chess(q.fen);
    let san: string;
    try {
      san = c.move(m).san;
    } catch {
      return;
    }
    setChecking(true);
    const [best, mine] = await Promise.all([evalFor(q.fen, q.you, 12), evalFor(c.fen(), q.you, 12)]);
    setChecking(false);
    const loss = best.v - mine.v;
    const ok = loss <= 0.8;
    let bestSan = '';
    try {
      bestSan = best.best ? new Chess(q.fen).move({ from: best.best.slice(0, 2), to: best.best.slice(2, 4), promotion: (best.best[4] as PieceSymbol) || undefined }).san : '';
    } catch {
      /* ignore */
    }
    playSound(ok ? 'good' : 'bad');
    if (best.best) setArrows((a) => [...a, { from: best.best!.slice(0, 2), to: best.best!.slice(2, 4), color: 'g' }]);
    setMsg(ok ? `${san} holds${bestSan && bestSan !== san ? ` (the engine’s choice: ${bestSan})` : ''}. That’s the habit: threat first, then your move.` : `${san} doesn’t stop it — it costs about ${loss.toFixed(1)} pawns. Better was ${bestSan} (green arrow).`);
    setScore((s) => ({ ...s, defences: s.defences + (ok ? 1 : 0), n: s.n + 1 }));
    const myUci = m.from + m.to + (m.promotion ?? '');
    if (best.best) setDefence({ uci: ok ? myUci : best.best, tried: ok ? undefined : myUci });
    setStage('done');
    logActivity('puzzles');
  };

  return (
    <div className="page board-screen-page">
      <Header title="Threat spotter" backTo="/courses/defence" sub={`${q.game.white} – ${q.game.black}, ${eventLabel(q.game)}`} />
      <div className="board-screen">
        <div className="board-col">
          <Board
            fen={stage === 'threat' ? q.nullFen : q.fen}
            orientation={q.you}
            movable={checking ? null : stage === 'threat' ? opp : stage === 'defend' ? q.you : null}
            onMove={stage === 'threat' ? onThreat : onDefend}
            lastMove={q.lastMove}
            arrows={arrows}
          />
        </div>
        <div className="side-col">
          <div className="panel stack">
            {stage === 'threat' ? (
              <p className="drill-prompt"><Target size={16} /> Your opponent just played <strong>{q.lastSan}</strong>. If you passed, what would they play? Show the threat by moving <em>their</em> piece.</p>
            ) : (
              <p className="drill-prompt"><Shield size={16} /> {stage === 'defend' ? 'Your move: deal with the threat.' : 'Done.'}</p>
            )}
            {checking && <Spinner label="Checking…" />}
            {msg && <p>{msg}</p>}
            {stage === 'done' && <NextDock><Button icon={<ArrowRight size={16} />} onClick={load}>Next position</Button></NextDock>}
            {stage === 'done' && defence && <FollowUpPanel fen={q.fen} uci={defence.uci} tried={defence.tried ? [defence.tried] : []} title="How the defence works" />}
          </div>
          {score.n > 0 && <p className="muted small">Threats spotted {score.threats}/{score.n} · held {score.defences}/{score.n}</p>}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Guess the master's move

export function GuessTheMove() {
  const logActivity = useApp((s) => s.logActivity);
  const [ready, setReady] = useState(false);
  const [game, setGame] = useState<MasterGame | null>(null);
  const [side, setSide] = useState<Color>('w');
  const [ply, setPly] = useState(0);
  const [guesses, setGuesses] = useState<{ ply: number; mine: string; master: string; pts: number; mineUci?: string }[]>([]);
  const [msg, setMsg] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const MAX = 12;

  const start = useCallback(() => {
    const g = randomGame();
    if (!g) return;
    const winner: Color = g.result === '0-1' ? 'b' : 'w';
    setGame(g);
    setSide(winner);
    // Skip the opening: start where it's the chosen side's move after about move 8.
    let p = 16;
    if ((p % 2 === 0 ? 'w' : 'b') !== winner) p++;
    setPly(p);
    setGuesses([]);
    setMsg(null);
    setRevealed(false);
  }, []);

  useEffect(() => {
    loadExplorer().then(() => {
      setReady(true);
      start();
    });
  }, [start]);

  if (!ready || !game) return <div className="page"><Header title="Guess the move" backTo="/courses" /><Spinner label="Loading master games…" /></div>;

  const c = new Chess();
  let last: { from: string; to: string } | null = null;
  for (let i = 0; i < ply && i < game.moves.length; i++) last = c.move(game.moves[i]);
  const fen = c.fen();
  const master = game.moves[ply];
  const finished = guesses.length >= MAX || ply >= game.moves.length;
  let masterUci: string | null = null;
  try {
    const mm = master ? new Chess(fen).move(master) : null;
    masterUci = mm ? mm.from + mm.to + (mm.promotion ?? '') : null;
  } catch {
    masterUci = null;
  }
  const total = guesses.reduce((a, g) => a + g.pts, 0);
  const player = side === 'w' ? game.white : game.black;

  const onMove = async (m: { from: Square; to: Square; promotion?: PieceSymbol }) => {
    if (revealed || finished || !master) return;
    const t = new Chess(fen);
    let san: string;
    try {
      san = t.move(m).san;
    } catch {
      return;
    }
    soundForSan(san);
    let pts = 0;
    let text: string;
    if (san === master) {
      pts = 3;
      text = `${san} — exactly what ${player} played. +3`;
    } else {
      setChecking(true);
      const mt = new Chess(fen);
      mt.move(master);
      const [mine, theirs] = await Promise.all([evalFor(t.fen(), side, 11), evalFor(mt.fen(), side, 11)]);
      setChecking(false);
      const diff = theirs.v - mine.v;
      pts = diff <= 0.3 ? 2 : diff <= 1 ? 1 : 0;
      text = `${player} played ${master}. Your ${san} is ${pts === 2 ? 'just as good by the engine — +2' : pts === 1 ? `a little weaker (−${diff.toFixed(1)}) — +1` : `clearly worse (−${diff.toFixed(1)}) — no points`}.`;
    }
    playSound(pts >= 2 ? 'good' : pts === 1 ? 'move' : 'bad');
    setGuesses((g) => [...g, { ply, mine: san, master, pts, mineUci: m.from + m.to + (m.promotion ?? '') }]);
    setMsg(text);
    setRevealed(true);
    logActivity('puzzles');
  };

  const advance = () => {
    setRevealed(false);
    setMsg(null);
    setPly((p) => p + 2);
  };

  return (
    <div className="page board-screen-page">
      <Header title="Guess the move" backTo="/courses" sub={`${game.white} (${game.whiteElo}) – ${game.black} (${game.blackElo}) · ${eventLabel(game)}`} />
      <div className="board-screen">
        <div className="board-col">
          <Board fen={fen} orientation={side} movable={revealed || finished || checking ? null : side} onMove={onMove} lastMove={last ? [last.from, last.to] : null} />
        </div>
        <div className="side-col">
          <div className="panel stack">
            {finished ? (
              <>
                <h2>{total} / {guesses.length * 3}</h2>
                <p className="muted">{guesses.filter((g) => g.pts === 3).length} of {player}’s moves found exactly. Result: {game.result}.</p>
                <div className="row">
                  <Button icon={<RotateCcw size={16} />} onClick={start}>Another game</Button>
                </div>
              </>
            ) : (
              <>
                <p className="drill-prompt">You are {player}. Move {Math.floor(ply / 2) + 1}: what did they play? <span className="muted small">(guess {guesses.length + 1} of {MAX})</span></p>
                {checking && <Spinner label="Comparing with the engine…" />}
                {msg && <p>{msg}</p>}
                {revealed && <NextDock><Button icon={<ArrowRight size={16} />} onClick={advance}>Continue</Button></NextDock>}
                {revealed && masterUci && (
                  <FollowUpPanel fen={fen} uci={masterUci} tried={guesses[guesses.length - 1]?.mine !== master && guesses[guesses.length - 1]?.mineUci ? [guesses[guesses.length - 1].mineUci!] : []} title={`Why ${player} played ${master}`} />
                )}
              </>
            )}
            <p className="num muted small">Score {total} · exact 3, as good 2, close 1</p>
          </div>
        </div>
      </div>
    </div>
  );
}
