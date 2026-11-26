import { useMemo, useState } from 'react';
import { ArrowRight, ChevronLeft, ChevronsLeft, RefreshCw, Search, Swords, Trash2 } from 'lucide-react';
import { Chess, START_FEN, type Color } from '../lib/chess/core';
import { useApp } from '../lib/store/app';
import { scoutPlayer, scoutStats, type ScoutProfile, type Speed } from '../lib/scout';
import { BOTS } from '../lib/bots';
import { navigate } from '../lib/router';
import { Board } from '../components/Board';
import { Button, Empty, Header, IconButton, Section, Segmented } from '../components/ui';
import { StatTile } from '../components/Charts';
import { ResultBar } from '../components/MasterMoves';
import { toast } from '../components/Toast';

export function ScoutHome() {
  const scouts = useApp((s) => s.scouts);
  const save = useApp((s) => s.saveScout);
  const [site, setSite] = useState<'lichess' | 'chesscom'>('lichess');
  const [user, setUser] = useState('');
  const [max, setMax] = useState('100');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const go = async (s = site, u = user, m = +max) => {
    if (!u.trim()) return setError('Enter a username.');
    setBusy(true);
    setError(null);
    try {
      const p = await scoutPlayer(s, u.trim(), m);
      save(p);
      navigate(`/scout/${encodeURIComponent(p.key)}`);
    } catch (e) {
      setError((e as Error).message || 'Could not download the games. Are you online?');
    } finally {
      setBusy(false);
    }
  };

  const list = Object.values(scouts).sort((a, b) => b.fetchedAt - a.fetchedAt);
  return (
    <div className="page page-narrow">
      <Header title="Scout an opponent" backTo="/games" sub="Download a player’s recent games to see what they open with, where they score badly and how they lose — then practise against a bot that plays their lines." />
      <Section>
        <div className="stack">
          <Segmented value={site} onChange={setSite} options={[{ value: 'lichess', label: 'Lichess' }, { value: 'chesscom', label: 'Chess.com' }]} />
          <label className="field">
            <span className="field-label">Username</span>
            <input className="input" value={user} onChange={(e) => setUser(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && go()} autoCapitalize="off" autoCorrect="off" spellCheck={false} />
          </label>
          <Segmented value={max} onChange={setMax} label="Games" options={[{ value: '50', label: '50 games' }, { value: '100', label: '100' }, { value: '200', label: '200' }]} />
          {error && <p className="tone-text-blunder small">{error}</p>}
          <Button icon={busy ? undefined : <Search size={16} />} onClick={() => go()} disabled={busy}>{busy ? 'Downloading games…' : 'Scout'}</Button>
          <p className="faint small">Needs an internet connection; the report is saved on this device afterwards.</p>
        </div>
      </Section>
      {list.length > 0 && (
        <Section title="Recent reports">
          <div className="list">
            {list.map((p) => (
              <button key={p.key} className="list-item" onClick={() => navigate(`/scout/${encodeURIComponent(p.key)}`)}>
                <span className="list-item-main">
                  <span className="list-item-title">{p.user}</span>
                  <span className="list-item-sub">{p.site === 'lichess' ? 'Lichess' : 'Chess.com'} · {p.games.length} games · {new Date(p.fetchedAt).toLocaleDateString()}</span>
                </span>
                <ArrowRight size={18} className="muted" />
              </button>
            ))}
          </div>
        </Section>
      )}
    </div>
  );
}

const SPEED_LABEL: Record<Speed, string> = { bullet: 'Bullet', blitz: 'Blitz', rapid: 'Rapid', classical: 'Classical', daily: 'Daily' };

export function ScoutReport({ scoutKey }: { scoutKey: string }) {
  const p = useApp((s) => s.scouts[scoutKey]);
  const save = useApp((s) => s.saveScout);
  const del = useApp((s) => s.deleteScout);
  const [speed, setSpeed] = useState<Speed | 'all'>('all');
  const [refreshing, setRefreshing] = useState(false);
  const stats = useMemo(() => (p ? scoutStats(p, speed === 'all' ? undefined : speed) : null), [p, speed]);
  if (!p || !stats) {
    return (
      <div className="page">
        <Header title="Scouting report" backTo="/scout" />
        <Empty title="Report not found" />
      </div>
    );
  }
  const nearestBot = (r?: number) => (r ? [...BOTS].sort((a, b) => Math.abs(a.elo - r) - Math.abs(b.elo - r))[0] : BOTS[4]);
  const bot = nearestBot(stats.rating);
  const practice = (yourColor: Color) => navigate(`/play?opening=${encodeURIComponent(`scout:${p.key}:${yourColor === 'w' ? 'b' : 'w'}`)}&side=${yourColor}&bot=${bot.id}`);
  const refresh = async () => {
    setRefreshing(true);
    try {
      save(await scoutPlayer(p.site, p.user, Math.max(50, p.games.length)));
      toast('Report updated.');
    } catch (e) {
      toast((e as Error).message);
    } finally {
      setRefreshing(false);
    }
  };
  const score = (c: 'w' | 'b') => (stats.byColor[c].n ? Math.round(((stats.byColor[c].win + stats.byColor[c].draw / 2) / stats.byColor[c].n) * 100) : 0);

  return (
    <div className="page">
      <Header
        title={p.user}
        backTo="/scout"
        sub={`${p.site === 'lichess' ? 'Lichess' : 'Chess.com'} · ${stats.n} games${stats.rating ? ` · rated about ${stats.rating}` : ''}`}
        actions={<IconButton label="Refresh" onClick={refresh} disabled={refreshing}><RefreshCw /></IconButton>}
      />
      {stats.speeds.length > 1 && (
        <div className="chip-row mb12">
          <button className={`chip${speed === 'all' ? ' is-on' : ''}`} onClick={() => setSpeed('all')}>All</button>
          {stats.speeds.map(([sp, n]) => (
            <button key={sp} className={`chip${speed === sp ? ' is-on' : ''}`} onClick={() => setSpeed(sp)}>{SPEED_LABEL[sp]} <span className="faint num">{n}</span></button>
          ))}
        </div>
      )}
      <div className="kpi-row">
        <StatTile label="As White" value={`${score('w')}%`} sub={`${stats.byColor.w.win}W · ${stats.byColor.w.draw}D · ${stats.byColor.w.loss}L`} />
        <StatTile label="As Black" value={`${score('b')}%`} sub={`${stats.byColor.b.win}W · ${stats.byColor.b.draw}D · ${stats.byColor.b.loss}L`} />
        <StatTile label="Losses on time" value={`${stats.losses.total ? Math.round((stats.losses.time / stats.losses.total) * 100) : 0}%`} sub={`${stats.losses.total} losses`} />
      </div>

      <Section title="What to expect">
        {stats.notes.length ? <ul className="bullets">{stats.notes.map((n, i) => <li key={i}>{n}</li>)}</ul> : <p className="muted">Not enough games for clear patterns yet.</p>}
      </Section>

      <Section title="Prepare">
        <div className="row">
          <Button icon={<Swords size={16} />} onClick={() => practice('w')} disabled={!stats.byColor.b.n}>Play their Black openings (you’re White)</Button>
          <Button variant="secondary" icon={<Swords size={16} />} onClick={() => practice('b')} disabled={!stats.byColor.w.n}>Play their White openings (you’re Black)</Button>
        </div>
        <p className="faint small mt8">The bot ({bot.name}, about {bot.elo}) plays the moves {p.user} chose in these games, as often as they chose them, then plays on its own.</p>
      </Section>

      <div className="insights-grid">
        {(['w', 'b'] as const).map((c) => (
          <Section key={c} title={`Openings as ${c === 'w' ? 'White' : 'Black'}`}>
            {stats.openings[c].length ? (
              <table className="data-table">
                <thead><tr><th>Opening</th><th className="num">Games</th><th className="num">Score</th></tr></thead>
                <tbody>
                  {stats.openings[c].slice(0, 8).map((o) => (
                    <tr key={o.name} className="is-click" onClick={() => navigate(`/explorer?moves=${encodeURIComponent(o.sample.join(' '))}`)}>
                      <td>{o.name}</td>
                      <td className="num">{o.n}</td>
                      <td className={`num${o.n >= 3 && o.score < 0.4 ? ' tone-text-best' : o.n >= 4 && o.score >= 0.65 ? ' tone-text-mistake' : ''}`}>{Math.round(o.score * 100)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="muted">No games as {c === 'w' ? 'White' : 'Black'}.</p>
            )}
          </Section>
        ))}
      </div>
      <p className="faint small">Green scores are their weak spots, orange their strong ones. Tap an opening to see what masters play there.</p>

      <Section title="Their opening tree">
        <ScoutTree profile={p} speed={speed === 'all' ? undefined : speed} />
      </Section>

      <button className="link-btn danger mt16" onClick={() => { del(p.key); navigate('/scout'); }}><Trash2 size={14} /> Delete this report</button>
    </div>
  );
}

function ScoutTree({ profile, speed }: { profile: ScoutProfile; speed?: Speed }) {
  const [color, setColor] = useState<'w' | 'b'>('w');
  const [path, setPath] = useState<string[]>([]);
  const games = profile.games.filter((g) => g.color === color && (!speed || g.speed === speed) && path.every((s, i) => g.sans[i] === s));
  const next = new Map<string, { n: number; win: number; draw: number; loss: number }>();
  for (const g of games) {
    const san = g.sans[path.length];
    if (!san) continue;
    const r = next.get(san) ?? { n: 0, win: 0, draw: 0, loss: 0 };
    r.n++;
    r[g.result]++;
    next.set(san, r);
  }
  const rows = [...next.entries()].sort((a, b) => b[1].n - a[1].n).slice(0, 10);
  const fen = useMemo(() => {
    const c = new Chess(START_FEN);
    for (const s of path) c.move(s);
    return c.fen();
  }, [path]);
  const theirTurn = (path.length % 2 === 0) === (color === 'w');
  return (
    <div className="scout-tree">
      <Segmented value={color} onChange={(v) => { setColor(v); setPath([]); }} options={[{ value: 'w', label: `${profile.user} as White` }, { value: 'b', label: `as Black` }]} />
      <div className="board-screen mt12">
        <div className="board-col">
          <Board fen={fen} orientation={color === 'w' ? 'b' : 'w'} />
          <div className="controls">
            <div className="controls-group">
              <IconButton label="Start" onClick={() => setPath([])}><ChevronsLeft /></IconButton>
              <IconButton label="Back" onClick={() => setPath(path.slice(0, -1))} disabled={!path.length}><ChevronLeft /></IconButton>
            </div>
            <span className="muted small num">{path.map((s, i) => (i % 2 === 0 ? `${i / 2 + 1}.${s}` : s)).join(' ') || 'Start'}</span>
          </div>
        </div>
        <div className="side-col">
          <p className="muted small mb8">{games.length} game{games.length === 1 ? '' : 's'} reached this position. {theirTurn ? `${profile.user}’s choices:` : 'What their opponents played, and how it went for them:'}</p>
          {rows.length ? (
            <table className="masters-table">
              <tbody>
                {rows.map(([san, r]) => (
                  <tr key={san} className="is-click" onClick={() => setPath([...path, san])}>
                    <td className="masters-san num">{san}</td>
                    <td className="num">{r.n}</td>
                    <td className="masters-bar-col">
                      {/* Results from their point of view: their wins, draws, losses */}
                      <ResultBar white={color === 'w' ? r.win : r.loss} draws={r.draw} black={color === 'w' ? r.loss : r.win} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="muted">They haven’t gone further from here in these games.</p>
          )}
          {rows.length > 0 && <p className="faint small mt8">Bars show White wins, draws and Black wins.</p>}
        </div>
      </div>
    </div>
  );
}


