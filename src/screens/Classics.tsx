import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Eye, Pause, Play, RotateCcw, Target } from 'lucide-react';
import { CLASSICS, getClassic, type ClassicGame } from '../data/classics';
import { Chess, START_FEN, formatLine, moveLabel, uciOf, type Color, type PieceSymbol, type Square } from '../lib/chess/core';
import { parseMovetext } from '../lib/chess/pgn';
import { engine } from '../lib/engine/stockfish';
import { lineScore, winPct } from '../lib/coach/eval';
import { useApp } from '../lib/store/app';
import { navigate } from '../lib/router';
import { soundForSan, playSound } from '../lib/sound';
import { useArrowKeys } from '../lib/hooks';
import { Board, type Arrow } from '../components/Board';
import { MoveList } from '../components/MoveList';
import { Button, Header, IconButton, Segmented, Spinner } from '../components/ui';
import { getOpening } from '../lib/openings/book';

const TAGS = ['All', 'Attack', 'Sacrifice', 'Positional', 'Defence', 'King hunt', 'Miniature'] as const;

export function ClassicsList() {
  const [tag, setTag] = useState<(typeof TAGS)[number]>('All');
  const scores = useApp((s) => s.classics);
  const list = CLASSICS.filter((c) => tag === 'All' || c.tags.includes(tag as ClassicGame['tags'][number])).sort((a, b) => a.year - b.year);
  return (
    <div className="page">
      <Header title="Classic games" backTo="/train" sub="Replay the immortal games with commentary — or play the winner’s side and find the key moves yourself." />
      <div className="chips mb8">
        {TAGS.map((t) => (
          <button key={t} className={`chip${t === tag ? ' chip-on' : ''}`} onClick={() => setTag(t)}>
            {t}
          </button>
        ))}
      </div>
      <div className="classic-grid">
        {list.map((g) => (
          <button key={g.id} className="classic-card" onClick={() => navigate(`/classics/${g.id}`)}>
            <span className="classic-year num">{g.year}</span>
            <span className="classic-title">{g.title}</span>
            <span className="classic-players">
              {g.white} – {g.black}
            </span>
            <span className="classic-meta">
              {g.opening} · {g.result}
            </span>
            <span className="chips">
              {g.tags.slice(0, 3).map((t) => (
                <span key={t} className="chip">{t}</span>
              ))}
              {scores[g.id] && <span className="chip chip-on num">{scores[g.id].best}/{scores[g.id].total} found</span>}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

interface Parsed {
  sans: string[];
  ucis: string[];
  fens: string[];
  comments: (string | undefined)[];
  labels: string[];
}

function parseGame(g: ClassicGame): Parsed {
  const c = new Chess();
  const out: Parsed = { sans: [], ucis: [], fens: [START_FEN], comments: [], labels: [] };
  for (const m of parseMovetext(g.pgn).sans) {
    const before = c.fen();
    const mv = c.move(m.san);
    out.sans.push(mv.san);
    out.ucis.push(uciOf(mv));
    out.fens.push(c.fen());
    out.comments.push(m.comment);
    out.labels.push(moveLabel(before, mv.san));
  }
  return out;
}

export function ClassicScreen({ id }: { id: string }) {
  const game = getClassic(id);
  const [mode, setMode] = useState<'replay' | 'guess'>('replay');
  if (!game) return <div className="page"><Header title="Game not found" backTo="/classics" /></div>;
  return (
    <div className="page board-screen-page">
      <Header title={game.title} backTo="/classics" sub={`${game.white} – ${game.black} · ${game.event} ${game.year} · ${game.result}`} />
      <div className="mb8">
        <Segmented
          value={mode}
          onChange={setMode}
          label="Mode"
          options={[
            { value: 'replay', label: 'Replay with commentary' },
            { value: 'guess', label: 'Guess the move' },
          ]}
        />
      </div>
      {mode === 'replay' ? <Replay game={game} /> : <Guess key={id} game={game} />}
    </div>
  );
}

function Replay({ game }: { game: ClassicGame }) {
  const parsed = useMemo(() => parseGame(game), [game]);
  const [ply, setPly] = useState(0);
  const [auto, setAuto] = useState(false);
  const winner: Color = game.result === '0-1' ? 'b' : 'w';
  const n = parsed.sans.length;
  useEffect(() => {
    if (!auto) return;
    if (ply >= n) {
      setAuto(false);
      return;
    }
    const t = setTimeout(() => {
      soundForSan(parsed.sans[ply]);
      setPly(ply + 1);
    }, parsed.comments[ply] ? 2600 : 900);
    return () => clearTimeout(t);
  }, [auto, ply, n, parsed]);
  const go = (p: number) => {
    const q = Math.max(0, Math.min(n, p));
    if (q === ply + 1) soundForSan(parsed.sans[ply]);
    setPly(q);
  };
  useArrowKeys({ left: () => go(ply - 1), right: () => go(ply + 1), up: () => go(0), down: () => go(n) });
  const last = ply > 0 ? ([parsed.ucis[ply - 1].slice(0, 2), parsed.ucis[ply - 1].slice(2, 4)] as [string, string]) : null;
  const comment = ply > 0 ? parsed.comments[ply - 1] : undefined;
  const opening = game.openingId ? getOpening(game.openingId) : undefined;
  return (
    <div className="board-screen">
      <div className="board-col">
        <Board fen={parsed.fens[ply]} orientation={winner} lastMove={last} />
        <div className="controls">
          <div className="controls-group">
            <IconButton label="Start" onClick={() => go(0)}><ChevronsLeft /></IconButton>
            <IconButton label="Previous" onClick={() => go(ply - 1)}><ChevronLeft /></IconButton>
            <IconButton label={auto ? 'Pause' : 'Play'} onClick={() => setAuto(!auto)} className={auto ? 'is-on' : ''}>{auto ? <Pause /> : <Play />}</IconButton>
            <IconButton label="Next" onClick={() => go(ply + 1)}><ChevronRight /></IconButton>
            <IconButton label="End" onClick={() => go(n)}><ChevronsRight /></IconButton>
          </div>
          <span className="muted small num">{ply}/{n}</span>
        </div>
      </div>
      <div className="side-col">
        {ply === 0 ? (
          <div className="panel prose">
            <p>{game.summary}</p>
            {opening && (
              <p className="mt8">
                <button className="link-btn" onClick={() => navigate(`/openings/${opening.id}`)}>Study the {opening.name}</button>
              </p>
            )}
          </div>
        ) : (
          <div className="commentary">
            <span className="commentary-move">{parsed.labels[ply - 1]}</span>
            <p>{comment ?? 'Keep going — the next comment marks a key moment.'}</p>
          </div>
        )}
        {ply === n && (
          <div className="panel">
            <h4>Lessons</h4>
            <ul className="bullets mt8">
              {game.lessons.map((l) => <li key={l}>{l}</li>)}
            </ul>
          </div>
        )}
        <MoveList moves={parsed.sans.map((san) => ({ san }))} current={ply} onSelect={go} />
      </div>
    </div>
  );
}

function Guess({ game }: { game: ClassicGame }) {
  const parsed = useMemo(() => parseGame(game), [game]);
  const winner: Color = game.result === '0-1' ? 'b' : 'w';
  const keyPlies = useMemo(() => new Set(game.keys.map((k) => parsed.labels.indexOf(k)).filter((i) => i >= 0)), [game, parsed]);
  const saveScore = useApp((s) => s.recordClassic);
  const [ply, setPly] = useState(0);
  const [found, setFound] = useState(0);
  const [tries, setTries] = useState(0);
  const [reveal, setReveal] = useState(false);
  const [checking, setChecking] = useState(false);
  const [message, setMessage] = useState<{ tone: 'good' | 'bad' | 'info'; text: string } | null>(null);
  const [tryFen, setTryFen] = useState<string | null>(null);
  const done = ply >= parsed.sans.length;
  const recorded = useRef(false);
  const atKey = !done && keyPlies.has(ply);

  // Auto-play everything except key moves
  useEffect(() => {
    if (done || atKey) return;
    const t = setTimeout(() => {
      soundForSan(parsed.sans[ply]);
      setPly(ply + 1);
    }, ply === 0 ? 800 : 650);
    return () => clearTimeout(t);
  }, [ply, done, atKey, parsed]);

  useEffect(() => {
    if (done && !recorded.current) {
      recorded.current = true;
      saveScore(game.id, found, keyPlies.size);
      playSound('end');
    }
  }, [done, found, keyPlies.size, game.id, saveScore]);

  const advance = (credit: boolean) => {
    if (credit) setFound((f) => f + 1);
    setTries(0);
    setReveal(false);
    setTryFen(null);
    soundForSan(parsed.sans[ply]);
    setPly(ply + 1);
  };

  const onMove = async (mv: { from: Square; to: Square; promotion?: PieceSymbol }) => {
    if (!atKey || checking) return;
    const fen = parsed.fens[ply];
    const c = new Chess(fen);
    let m;
    try {
      m = c.move(mv);
    } catch {
      return;
    }
    const player = winner === 'w' ? game.white : game.black;
    if (m.san === parsed.sans[ply]) {
      playSound('good');
      setMessage({ tone: 'good', text: `${m.san}! ${tries === 0 ? 'Exactly what ' + player.split(' ').slice(-1)[0] + ' played.' : 'Found it.'} ${parsed.comments[ply] ?? ''}` });
      advance(tries === 0);
      return;
    }
    soundForSan(m.san);
    setTryFen(c.fen());
    setChecking(true);
    try {
      const [mine, real] = await Promise.all([
        engine.analyze(c.fen(), { depth: 13 }),
        engine.analyze(parsed.fens[ply + 1], { depth: 13 }),
      ]);
      const a = winPct(lineScore(mine.lines[0]), winner);
      const b = winPct(lineScore(real.lines[0]), winner);
      if (a >= b - 3) {
        playSound('good');
        setMessage({ tone: 'info', text: `${m.san} is just as strong by engine standards. ${player.split(' ').slice(-1)[0]} played ${parsed.sans[ply]}. ${parsed.comments[ply] ?? ''}` });
        setTimeout(() => advance(tries === 0), 900);
      } else {
        playSound('bad');
        const t = tries + 1;
        setTries(t);
        if (t >= 2) setReveal(true);
        setMessage({ tone: 'bad', text: t >= 2 ? `Not quite. The move is shown on the board.` : `${m.san} isn’t it. Look for something more forcing.` });
        setTimeout(() => setTryFen(null), 800);
      }
    } finally {
      setChecking(false);
    }
  };

  const restart = () => {
    recorded.current = false;
    setPly(0);
    setFound(0);
    setTries(0);
    setReveal(false);
    setMessage(null);
  };

  const fen = tryFen ?? parsed.fens[Math.min(ply, parsed.fens.length - 1)];
  const last = ply > 0 && !tryFen ? ([parsed.ucis[ply - 1].slice(0, 2), parsed.ucis[ply - 1].slice(2, 4)] as [string, string]) : null;
  const arrows: Arrow[] = reveal && atKey ? [{ from: parsed.ucis[ply].slice(0, 2), to: parsed.ucis[ply].slice(2, 4), color: 'y' }] : [];
  const keyIndex = [...keyPlies].sort((a, b) => a - b).indexOf(ply) + 1;

  return (
    <div className="board-screen">
      <div className="board-col">
        <Board fen={fen} orientation={winner} movable={atKey && !checking ? winner : null} onMove={onMove} lastMove={last} arrows={arrows} />
      </div>
      <div className="side-col">
        <div className="panel panel-tight">
          <p className="drill-mode">You are {winner === 'w' ? game.white : game.black} · key moves found {found}/{keyPlies.size}</p>
          {atKey ? (
            <p className="drill-prompt mt8">
              <Target size={16} /> Key moment {keyIndex} of {keyPlies.size}: find the move {winner === 'w' ? 'White' : 'Black'} played after {parsed.labels[ply - 1] ?? 'the start'}.
            </p>
          ) : done ? (
            <p className="drill-prompt mt8">Game over — {game.result}.</p>
          ) : (
            <p className="muted mt8">Playing through to the next key moment…</p>
          )}
          {atKey && !reveal && (
            <button className="link-btn mt8" onClick={() => { setReveal(true); setTries(2); }}>
              <Eye size={14} /> Show me
            </button>
          )}
        </div>
        {checking && <Spinner label="Checking your idea…" />}
        {message && <div className={`feedback feedback-${message.tone}`}><span>{message.text}</span></div>}
        {!atKey && !done && ply > 0 && parsed.comments[ply - 1] && (
          <div className="commentary">
            <span className="commentary-move">{parsed.labels[ply - 1]}</span>
            <p>{parsed.comments[ply - 1]}</p>
          </div>
        )}
        {done && (
          <div className="panel stack">
            <h3>{found === keyPlies.size ? 'Every key move found.' : `You found ${found} of ${keyPlies.size} key moves.`}</h3>
            <ul className="bullets">
              {game.lessons.map((l) => <li key={l}>{l}</li>)}
            </ul>
            <div className="row">
              <Button variant="secondary" icon={<RotateCcw size={16} />} onClick={restart}>Try again</Button>
              <Button variant="ghost" onClick={() => navigate('/classics')}>More classics</Button>
            </div>
          </div>
        )}
        <p className="faint small">{formatLine(START_FEN, parsed.sans.slice(0, Math.min(ply, 8)))}{ply > 8 ? ' …' : ''}</p>
      </div>
    </div>
  );
}
