import { useMemo, useState } from 'react';
import { Play } from 'lucide-react';
import { BOTS } from '../lib/bots';
import { Chess, START_FEN, uid, type Color } from '../lib/chess/core';
import { useApp } from '../lib/store/app';
import { useSession } from '../lib/gameSession';
import { navigate, query, useRoute } from '../lib/router';
import { estimateRating, suggestBot } from '../lib/plan';
import { Button, Header, Section, Segmented, Toggle } from '../components/ui';
import { OPENINGS } from '../data/openings';
import { allLines } from '../lib/openings/book';
import { engine } from '../lib/engine/stockfish';
import { TIME_PRESETS } from '../lib/clock';

type StartMode = 'standard' | 'opening' | 'fen';

export function PlaySetup() {
  const path = useRoute();
  const q = query(path);
  const games = useApp((s) => s.games);
  const settings = useApp((s) => s.settings);
  const updateSettings = useApp((s) => s.updateSettings);
  const live = useSession((s) => s.game);
  const setGame = useSession((s) => s.setGame);
  const rating = estimateRating(games);
  const [botId, setBotId] = useState(q.get('bot') ?? suggestBot(rating).id);
  const [color, setColor] = useState<'w' | 'b' | 'random'>((q.get('side') as Color) ?? 'w');
  const [mode, setMode] = useState<StartMode>(q.get('opening') ? 'opening' : q.get('fen') ? 'fen' : 'standard');
  const [openingId, setOpeningId] = useState(q.get('opening') ?? OPENINGS[0].id);
  const [lineId, setLineId] = useState<string>(q.get('line') ?? 'any');
  const [skipBook, setSkipBook] = useState(false);
  const [fen, setFen] = useState(q.get('fen') ?? '');
  const [coachLive, setCoachLive] = useState(settings.coachLive);
  const [tcId, setTcId] = useState(q.get('tc') ?? settings.timeControl ?? 'none');
  const preset = TIME_PRESETS.find((t) => t.id === tcId) ?? TIME_PRESETS[0];
  const opening = OPENINGS.find((o) => o.id === openingId)!;
  const fenError = useMemo(() => {
    if (mode !== 'fen' || !fen.trim()) return null;
    try {
      new Chess(fen.trim());
      return null;
    } catch {
      return 'That FEN is not a legal position.';
    }
  }, [fen, mode]);

  const start = () => {
    const userColor: Color = color === 'random' ? (Math.random() < 0.5 ? 'w' : 'b') : color;
    let startFen = START_FEN;
    let presetSans: string[] = [];
    if (mode === 'fen' && fen.trim() && !fenError) startFen = fen.trim();
    if (mode === 'opening' && skipBook) {
      const lines = allLines(opening).filter((l) => lineId === 'any' || l.lineId === lineId);
      const line = lines[Math.floor(Math.random() * lines.length)];
      presetSans = line.sans;
    }
    engine.newGame();
    updateSettings({ coachLive, timeControl: tcId });
    setGame({
      id: uid('g'),
      config: {
        botId,
        userColor,
        startFen,
        presetSans,
        openingId: mode === 'opening' ? openingId : undefined,
        coachLive,
        title: mode === 'opening' ? opening.name : undefined,
        timeControl: preset.tc,
      },
      clock: preset.tc ? { w: preset.tc.initial, b: preset.tc.initial, running: null, since: null } : undefined,
      sans: [...presetSans],
      reviews: {},
      bookNotes: {},
      status: 'playing',
      hints: 0,
      takebacks: 0,
      createdAt: Date.now(),
    });
    navigate('/play/game');
  };

  return (
    <div className="page page-narrow">
      <Header title="Play the coach" sub="Choose an opponent, a starting point and how much coaching you want." />

      {live && live.status === 'playing' && (
        <button className="resume" onClick={() => navigate('/play/game')}>
          <Play size={18} />
          <span>
            <strong>Resume your game</strong>
            <span className="muted"> vs {BOTS.find((b) => b.id === live.config.botId)?.name} · move {Math.ceil(live.sans.length / 2)}</span>
          </span>
        </button>
      )}

      <Section title="Opponent">
        <div className="bot-grid" role="radiogroup" aria-label="Opponent">
          {BOTS.map((b) => (
            <button
              key={b.id}
              role="radio"
              aria-checked={b.id === botId}
              className={`bot-card${b.id === botId ? ' is-on' : ''}`}
              onClick={() => setBotId(b.id)}
            >
              <span className="bot-elo num">{b.elo}</span>
              <span className="bot-name">{b.name}</span>
              <span className="bot-blurb">{b.blurb}</span>
            </button>
          ))}
        </div>
        <p className="muted small mt8">Your estimated strength against the bots: {rating}. Strength labels are approximate.</p>
      </Section>

      <Section title="Time control">
        <div className="tc-grid" role="radiogroup" aria-label="Time control">
          {TIME_PRESETS.map((t) => (
            <button key={t.id} role="radio" aria-checked={t.id === tcId} className={`tc-chip${t.id === tcId ? ' is-on' : ''}`} onClick={() => setTcId(t.id)}>
              <span className="tc-label num">{t.label}</span>
              <span className="tc-kind">{t.kind}</span>
            </button>
          ))}
        </div>
        {preset.tc && (
          <p className="muted small mt8">
            The bot manages its clock like a person: quick in known positions and obvious recaptures, slower when it’s sharp, faster the stronger it is — and shakier when it’s short of time. The live coach’s review time doesn’t count against either clock.
          </p>
        )}
      </Section>

      <Section title="You play">
        <Segmented
          value={color}
          onChange={setColor}
          label="Your color"
          options={[
            { value: 'w', label: 'White' },
            { value: 'b', label: 'Black' },
            { value: 'random', label: 'Random' },
          ]}
        />
      </Section>

      <Section title="Start from">
        <Segmented
          value={mode}
          onChange={setMode}
          label="Start position"
          options={[
            { value: 'standard', label: 'Standard' },
            { value: 'opening', label: 'An opening' },
            { value: 'fen', label: 'A position' },
          ]}
        />
        {mode === 'opening' && (
          <div className="stack mt12">
            <label className="field">
              <span className="field-label">Opening</span>
              <select className="select" value={openingId} onChange={(e) => { setOpeningId(e.target.value); setLineId('any'); }}>
                {OPENINGS.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name} ({o.side === 'w' ? 'White' : 'Black'} repertoire)
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span className="field-label">Line</span>
              <select className="select" value={lineId} onChange={(e) => setLineId(e.target.value)}>
                <option value="any">Any line (the bot picks)</option>
                {opening.lines.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
              </select>
            </label>
            <Toggle
              checked={skipBook}
              onChange={setSkipBook}
              label="Skip to the end of the theory"
              hint="Start the game where the line ends, to practise the middlegame plans."
            />
            <p className="muted small">
              {skipBook
                ? 'The game begins at the final position of a line.'
                : 'The bot plays theory moves from this opening. If you leave the book, the coach tells you what theory recommends.'}
            </p>
          </div>
        )}
        {mode === 'fen' && (
          <label className="field mt12">
            <span className="field-label">FEN</span>
            <input className="input" value={fen} onChange={(e) => setFen(e.target.value)} placeholder="rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1" />
            {fenError && <span className="error-text">{fenError}</span>}
          </label>
        )}
      </Section>

      <Section title="Coaching">
        <Toggle
          checked={coachLive}
          onChange={setCoachLive}
          label="Live coach"
          hint="After each of your moves the coach grades it and explains what changed. Turn off for a serious game; you can still review afterwards."
        />
        <Toggle
          checked={settings.coachTalk}
          onChange={(v) => updateSettings({ coachTalk: v })}
          label="Position talk"
          hint="Before your move, the coach names what matters — threats, loose pieces, pins, space — but never the move."
        />
        <Toggle
          checked={settings.showEval}
          onChange={(v) => updateSettings({ showEval: v })}
          label="Evaluation bar & numbers"
          hint="You can change all of these mid-game from the sliders button."
        />
      </Section>

      <div className="sticky-cta">
        <Button size="lg" className="btn-block" onClick={start} disabled={!!fenError} icon={<Play size={18} />}>
          Start game
        </Button>
      </div>
    </div>
  );
}
