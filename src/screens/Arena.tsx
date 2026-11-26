import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Eye, Flag, Handshake, Play, RefreshCw, Undo2, Users } from 'lucide-react';
import { BOTS, getBot } from '../lib/bots';
import { TIME_PRESETS, formatClock, remainingNow, type ClockState, type TimeControl } from '../lib/clock';
import { chess960Fen, fenOf, fogFor, legalMoves, MODE_INFO, newGame, play, turnOf, variantBotMove, type VariantMode, type VMove, type VState } from '../lib/variants';
import { useArena, type ArenaConfig } from '../lib/arenaSession';
import { useApp } from '../lib/store/app';
import { saveGameBody } from '../lib/store/gamesDb';
import { openingFor } from '../lib/openings/eco';
import { navigate, query, useRoute } from '../lib/router';
import { playSound, soundForSan } from '../lib/sound';
import { uid } from '../lib/chess/core';
import { Board } from '../components/Board';
import { Button, Header, IconButton, Section, Segmented } from '../components/ui';
import { toast } from '../components/Toast';

// ---------------------------------------------------------------------------
// Setup

export function ArenaSetup() {
  const path = useRoute();
  const q = query(path);
  const stats = useApp((s) => s.variantStats);
  const live = useArena((s) => s.game);
  const setGame = useArena((s) => s.setGame);
  const [mode, setMode] = useState<VariantMode>((q.get('mode') as VariantMode) ?? 'chess960');
  const [opponent, setOpponent] = useState<'bot' | 'human'>((q.get('vs') as 'bot' | 'human') ?? (q.get('mode') === 'standard' ? 'human' : 'bot'));
  const [botId, setBotId] = useState('l4');
  const [color, setColor] = useState<'w' | 'b' | 'random'>('w');
  const [tcId, setTcId] = useState('none');
  const [table, setTable] = useState(false);
  const [num, setNum] = useState<string>('');
  const effectiveOpponent = mode === 'standard' ? 'human' : opponent;

  const start = () => {
    const n = mode === 'chess960' ? (num.trim() && +num >= 0 && +num < 960 ? Math.floor(+num) : Math.floor(Math.random() * 960)) : undefined;
    const startFen = mode === 'chess960' ? chess960Fen(n!) : newGame(mode).startFen;
    const tc = TIME_PRESETS.find((t) => t.id === tcId)?.tc ?? null;
    const config: ArenaConfig = {
      mode,
      opponent: effectiveOpponent,
      botId: effectiveOpponent === 'bot' ? botId : undefined,
      userColor: color === 'random' ? (Math.random() < 0.5 ? 'w' : 'b') : color,
      tc,
      tableMode: effectiveOpponent === 'human' ? table : false,
      startFen,
      number: n,
    };
    setGame({ id: uid('a'), config, moves: [], status: 'playing', createdAt: Date.now(), clock: tc ? { w: tc.initial, b: tc.initial, running: null, since: null } : undefined });
    navigate('/play/arena/game');
  };

  return (
    <div className="page page-narrow">
      <Header title="More ways to play" backTo="/play" sub="Chess960, Fog of War, or two players on one device." />
      {live && live.status === 'playing' && (
        <button className="resume" onClick={() => navigate('/play/arena/game')}>
          <Play size={18} />
          <span>
            <strong>Resume your {MODE_INFO[live.config.mode].name} game</strong>
            <span className="muted"> · move {Math.ceil(live.moves.length / 2) || 1}</span>
          </span>
        </button>
      )}
      <Section title="Game">
        <div className="mode-cards">
          {(['chess960', 'fog', 'standard'] as VariantMode[]).map((m) => (
            <button key={m} className={`source-card${mode === m ? ' is-on' : ''}`} onClick={() => setMode(m)}>
              <span className="source-title">{m === 'standard' ? 'Two players' : MODE_INFO[m].name}</span>
              <span className="muted small">{m === 'standard' ? 'Pass-and-play standard chess on this device, with clocks. Saved to your games for a coach review.' : MODE_INFO[m].blurb}</span>
              {m !== 'standard' && stats[m] && <span className="faint small num">vs bots: {stats[m].w}W · {stats[m].d}D · {stats[m].l}L</span>}
            </button>
          ))}
        </div>
        <button className="link-btn mt12" onClick={() => navigate('/clock')}>Just need a chess clock for a real board? Open the clock</button>
      </Section>

      {mode !== 'standard' && (
        <Section title="Opponent">
          <Segmented value={opponent} onChange={setOpponent} options={[{ value: 'bot', label: 'A bot' }, { value: 'human', label: 'A friend (this device)' }]} />
        </Section>
      )}

      {effectiveOpponent === 'bot' ? (
        <>
          <Section title="Bot strength">
            <div className="chip-row">
              {BOTS.slice(0, 9).map((b) => (
                <button key={b.id} className={`chip${botId === b.id ? ' is-on' : ''}`} onClick={() => setBotId(b.id)}>
                  {b.name} <span className="num faint">{b.elo}</span>
                </button>
              ))}
            </div>
            {mode === 'fog' && <p className="muted small mt8">Fog bots only use what they can see: they guess where your king is and can be surprised.</p>}
          </Section>
          <Section title="You play">
            <Segmented value={color} onChange={setColor} options={[{ value: 'w', label: 'White' }, { value: 'b', label: 'Black' }, { value: 'random', label: 'Random' }]} />
          </Section>
        </>
      ) : (
        <Section title="Board">
          <Segmented value={table ? 'table' : 'flip'} onChange={(v) => setTable(v === 'table')} options={[{ value: 'flip', label: 'Turn to the player to move' }, { value: 'table', label: 'Face to face' }]} />
          <p className="muted small mt8">
            {table ? 'Lay the phone flat between you: Black’s pieces are drawn upside down so both of you read them the right way.' : 'The board flips after every move.'}
            {mode === 'fog' ? ' In Fog of War, a privacy screen hides the board while you pass the phone.' : ''}
          </p>
        </Section>
      )}

      {mode === 'chess960' && (
        <Section title="Starting position">
          <label className="field">
            <span className="field-label">Position number (0–959), or leave empty for a random one</span>
            <input className="input" inputMode="numeric" value={num} onChange={(e) => setNum(e.target.value.replace(/\D/g, '').slice(0, 3))} placeholder="Random" />
          </label>
        </Section>
      )}

      <Section title="Time control">
        <div className="chip-row">
          {TIME_PRESETS.filter((t) => ['none', '3+2', '5+3', '10+0', '10+5', '15+10'].includes(t.id)).map((t) => (
            <button key={t.id} className={`chip${tcId === t.id ? ' is-on' : ''}`} onClick={() => setTcId(t.id)}>{t.label}</button>
          ))}
        </div>
      </Section>

      <div className="sticky-cta">
        <Button size="lg" className="btn-block" icon={effectiveOpponent === 'human' ? <Users size={18} /> : <Play size={18} />} onClick={start}>
          Start {mode === 'standard' ? 'two-player game' : MODE_INFO[mode].name}
        </Button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Game

function replay(startFen: string, mode: VariantMode, moves: VMove[]): VState {
  let s = newGame(mode, startFen);
  for (const m of moves) {
    const n = play(s, m);
    if (!n) break;
    s = n;
  }
  return s;
}

function charge(clock: ClockState, mover: 'w' | 'b', tc: TimeControl, now = Date.now()): ClockState {
  const elapsed = clock.running === mover && clock.since ? now - clock.since : 0;
  const base = clock.running === mover ? clock[mover] - elapsed : clock[mover];
  const next: 'w' | 'b' = mover === 'w' ? 'b' : 'w';
  return { ...clock, [mover]: Math.max(0, base) + tc.increment, running: next, since: now };
}

export function ArenaGameScreen() {
  const game = useArena((s) => s.game);
  if (!game) {
    return (
      <div className="page">
        <Header title="Game" backTo="/play/arena" />
        <p className="muted">No game in progress.</p>
        <Button onClick={() => navigate('/play/arena')}>Set one up</Button>
      </div>
    );
  }
  return <ArenaBoard key={game.id} />;
}

function ArenaBoard() {
  const game = useArena((s) => s.game)!;
  const patch = useArena((s) => s.patch);
  const recordVariant = useApp((s) => s.recordVariant);
  const addGame = useApp((s) => s.addGame);
  const { config } = game;
  const state = useMemo(() => replay(config.startFen, config.mode, game.moves), [config.startFen, config.mode, game.moves]);
  const turn = turnOf(state);
  const vsBot = config.opponent === 'bot';
  const bot = vsBot ? getBot(config.botId ?? 'l4') : null;
  const botColor: 'w' | 'b' = config.userColor === 'w' ? 'b' : 'w';
  const [now, setNow] = useState(Date.now());
  const [shield, setShield] = useState(false);
  const thinking = useRef<string | null>(null);
  const ended = game.status === 'ended';

  // Viewer: whose eyes the board is drawn for.
  const viewer: 'w' | 'b' = vsBot ? config.userColor : config.tableMode ? 'w' : turn;
  const orientation: 'w' | 'b' = vsBot ? config.userColor : config.tableMode ? 'w' : turn;
  const fogColor: 'w' | 'b' = vsBot ? config.userColor : turn;
  const fog = useMemo(() => (config.mode === 'fog' && !ended ? fogFor(state, fogColor) : []), [config.mode, ended, state, fogColor]);
  const moves = useMemo(() => legalMoves(state), [state]);
  const placement = fenOf(state.pos).split(' ');
  const displayFen = `${placement[0]} ${placement[1]} - - 0 1`;
  const last = state.plies[state.plies.length - 1];

  const finish = useCallback(
    async (result: string, reason: string, moveList = game.moves) => {
      const cur = useArena.getState().game;
      if (!cur || cur.status === 'ended') return;
      patch({ status: 'ended', result, reason, clock: cur.clock ? { ...cur.clock, running: null, since: null } : undefined });
      playSound('end');
      if (vsBot && config.mode !== 'standard') {
        const won = (result === '1-0' && config.userColor === 'w') || (result === '0-1' && config.userColor === 'b');
        recordVariant(config.mode, result === '1/2-1/2' ? 'd' : won ? 'w' : 'l');
      }
      if (config.opponent === 'human' && config.mode === 'standard' && moveList.length >= 4) {
        // Two-player standard games go to your games for a coach review.
        const s = replay(config.startFen, config.mode, moveList);
        const sans = s.plies.map((p) => p.san);
        const opening = await openingFor(sans).catch(() => undefined);
        const date = new Date(cur.createdAt).toISOString().slice(0, 10);
        await saveGameBody({ id: cur.id, headers: { Event: 'Over-the-board game', Date: date.replace(/-/g, '.'), White: 'White', Black: 'Black', Result: result, Termination: reason }, startFen: config.startFen, sans });
        addGame({ id: cur.id, createdAt: cur.createdAt, white: 'White player', black: 'Black player', result, myColor: null, source: 'local', opening: opening?.name, eco: opening?.eco, plies: sans.length, date });
        toast('Saved to Games — open it there for a coach review.');
      }
    },
    [game.moves, patch, vsBot, config, recordVariant, addGame],
  );

  const doMove = useCallback(
    (m: VMove) => {
      const cur = useArena.getState().game;
      if (!cur || cur.status !== 'playing') return false;
      const s = replay(cur.config.startFen, cur.config.mode, cur.moves);
      const next = play(s, m);
      if (!next) return false;
      const mover = turnOf(s);
      const ply = next.plies[next.plies.length - 1];
      soundForSan(ply.san);
      const moveList = [...cur.moves, { from: ply.from, to: ply.to, promotion: ply.uci[4] }];
      const tc = cur.config.tc;
      let clock = cur.clock;
      if (tc && clock) clock = moveList.length >= 2 ? charge(clock, mover, tc) : { ...clock, running: moveList.length === 1 ? 'b' : null, since: moveList.length === 1 ? Date.now() : null };
      patch({ moves: moveList, clock });
      if (next.result) void finish(next.result, next.reason ?? '', moveList);
      else if (cur.config.opponent === 'human' && cur.config.mode === 'fog') setShield(true);
      return true;
    },
    [patch, finish],
  );

  // Bot moves
  useEffect(() => {
    if (!vsBot || ended || turn !== botColor || !bot) return;
    const key = `${game.moves.length}`;
    if (thinking.current === key) return;
    thinking.current = key;
    const t0 = Date.now();
    (async () => {
      const mv = await variantBotMove(state, bot);
      const remaining = game.clock ? remainingNow(game.clock, botColor) : 0;
      const budget = config.tc ? Math.min(Math.max(400, remaining / 40), 2500 + Math.random() * 1500) : 400 + Math.random() * 600;
      const wait = budget - (Date.now() - t0);
      if (wait > 0) await new Promise((r) => setTimeout(r, wait));
      if (useArena.getState().game?.moves.length !== game.moves.length) return;
      if (mv) doMove(mv);
    })().finally(() => {
      thinking.current = null;
    });
  }, [vsBot, ended, turn, botColor, bot, state, game.moves.length, game.clock, config.tc, doMove]);

  // Clock ticks and flags
  useEffect(() => {
    if (!config.tc || ended || !game.clock?.running) return;
    const id = setInterval(() => {
      const t = Date.now();
      setNow(t);
      const ck = useArena.getState().game?.clock;
      if (ck?.running && remainingNow(ck, ck.running, t) <= 0) {
        void finish(ck.running === 'w' ? '0-1' : '1-0', `${ck.running === 'w' ? 'White' : 'Black'} ran out of time`);
      }
    }, 200);
    return () => clearInterval(id);
  }, [config.tc, ended, game.clock?.running, finish]);

  const canMove = !ended && !shield && (vsBot ? turn === config.userColor : true);
  const takeBack = () => {
    const n = vsBot ? (turn === config.userColor ? 2 : 1) : 1;
    if (game.moves.length < n) return;
    patch({ moves: game.moves.slice(0, game.moves.length - n) });
  };
  const resign = (side: 'w' | 'b') => void finish(side === 'w' ? '0-1' : '1-0', `${side === 'w' ? 'White' : 'Black'} resigned`);
  const clockFor = (c: 'w' | 'b') => (game.clock ? remainingNow(game.clock, c, now) : 0);
  const top: 'w' | 'b' = orientation === 'w' ? 'b' : 'w';
  const name = (c: 'w' | 'b') => (vsBot ? (c === config.userColor ? 'You' : `${bot!.name} ${bot!.elo}`) : c === 'w' ? 'White' : 'Black');

  const strip = (c: 'w' | 'b') => (
    <div className={`player-strip${turn === c && !ended ? ' is-turn' : ''}${config.tableMode && c === 'b' ? ' is-flipped' : ''}`}>
      <span className={`pill-color pill-${c}`} />
      <span className="player-name">{name(c)}</span>
      {config.tc && <span className={`clock${game.clock?.running === c ? ' is-active' : ''}${clockFor(c) < 20000 ? ' is-low' : ''}`}>{formatClock(clockFor(c))}</span>}
    </div>
  );

  return (
    <div className="page board-screen-page">
      <Header
        title={config.mode === 'standard' ? 'Two players' : MODE_INFO[config.mode].name}
        backTo="/play/arena"
        sub={config.mode === 'chess960' && config.number !== undefined ? `Position #${config.number}` : config.mode === 'fog' ? 'No check — capture the king to win' : undefined}
      />
      <div className="board-screen">
        <div className="board-col">
          {strip(top)}
          <div className="arena-board">
            <Board
              fen={displayFen}
              orientation={orientation}
              movable={canMove ? turn : null}
              onMove={(m) => doMove({ from: m.from, to: m.to, promotion: m.promotion })}
              legalMoves={moves}
              lastMove={last && (config.mode !== 'fog' || last.color === viewer || !fog.includes(last.to)) ? [last.from, last.to] : null}
              fog={fog}
              noCheck={config.mode === 'fog'}
              rotateColor={config.tableMode ? 'b' : null}
            />
            {shield && !ended && (
              <button className="pass-shield" onClick={() => setShield(false)}>
                <Eye size={28} />
                <strong>{turn === 'w' ? 'White' : 'Black'} to move</strong>
                <span>Pass the phone, then tap to reveal your view.</span>
              </button>
            )}
          </div>
          {strip(orientation)}
          <div className="controls">
            <div className="controls-group">
              <IconButton label="Take back" onClick={takeBack} disabled={ended || !game.moves.length}><Undo2 /></IconButton>
              {!vsBot && !ended && <IconButton label="Agree a draw" onClick={() => void finish('1/2-1/2', 'Draw agreed')}><Handshake /></IconButton>}
              <IconButton label={vsBot ? 'Resign' : `${turn === 'w' ? 'White' : 'Black'} resigns`} onClick={() => resign(vsBot ? config.userColor : turn)} disabled={ended}><Flag /></IconButton>
            </div>
            <div className="controls-group">
              {config.mode === 'fog' && ended && <span className="muted small">Fog lifted</span>}
              <IconButton label="New game" onClick={() => navigate('/play/arena')}><RefreshCw /></IconButton>
            </div>
          </div>
        </div>
        <div className="side-col">
          {ended ? (
            <div className="panel stack">
              <h2>{game.result === '1/2-1/2' ? 'Draw' : game.result === '1-0' ? 'White wins' : 'Black wins'}</h2>
              <p className="muted">{game.reason}</p>
              <div className="row">
                <Button onClick={() => navigate('/play/arena')}>Play again</Button>
              </div>
            </div>
          ) : (
            <div className="panel panel-tight">
              <p className="muted small">{MODE_INFO[config.mode].blurb}</p>
            </div>
          )}
          <div className="panel panel-tight arena-moves">
            {state.plies.length === 0 ? (
              <span className="muted small">No moves yet.</span>
            ) : (
              state.plies.map((p, i) => (
                <span key={i} className="arena-move num">
                  {i % 2 === 0 && <span className="faint">{i / 2 + 1}.</span>}
                  {config.mode === 'fog' && !ended && p.color !== fogColor ? '???' : p.san}
                </span>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
