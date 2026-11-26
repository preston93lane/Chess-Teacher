import { useMemo, useState } from 'react';
import { Microscope, Upload, UserSearch } from 'lucide-react';
import { useApp, type GameMeta } from '../lib/store/app';
import { navigate } from '../lib/router';
import { Button, Empty, Header, Segmented } from '../components/ui';

type Filter = 'all' | 'coach' | 'imported';

function outcome(g: GameMeta): 'win' | 'loss' | 'draw' | 'none' {
  if (!g.myColor || !g.result || g.result === '*') return 'none';
  if (g.result === '1/2-1/2') return 'draw';
  return (g.result === '1-0') === (g.myColor === 'w') ? 'win' : 'loss';
}

export function Games() {
  const games = useApp((s) => s.games);
  const [filter, setFilter] = useState<Filter>('all');
  const list = games.filter((g) =>
    filter === 'all' ? true : filter === 'coach' ? g.source === 'bot' || g.source === 'practice' : g.source !== 'bot' && g.source !== 'practice',
  );
  const stats = useMemo(() => {
    const s = { win: 0, loss: 0, draw: 0 };
    for (const g of games) {
      const o = outcome(g);
      if (o !== 'none') s[o]++;
    }
    const reviewed = games.filter((g) => g.reviewed && g.myColor && g.accuracy);
    const acc = reviewed.length ? reviewed.reduce((a, g) => a + g.accuracy![g.myColor!], 0) / reviewed.length : null;
    const byOpening = new Map<string, { n: number; score: number }>();
    for (const g of games) {
      if (!g.opening || outcome(g) === 'none') continue;
      const key = g.opening.split(':')[0];
      const cur = byOpening.get(key) ?? { n: 0, score: 0 };
      cur.n++;
      cur.score += outcome(g) === 'win' ? 1 : outcome(g) === 'draw' ? 0.5 : 0;
      byOpening.set(key, cur);
    }
    const openings = [...byOpening.entries()].sort((a, b) => b[1].n - a[1].n).slice(0, 6);
    return { ...s, acc, openings };
  }, [games]);

  return (
    <div className="page">
      <Header
        title="Games"
        sub="Everything you’ve played or imported. Open a game to review it with the coach."
        actions={
          <>
            <Button size="sm" variant="secondary" icon={<Microscope size={16} />} onClick={() => navigate('/analysis')}>
              <span className="hide-sm">Analysis</span>
            </Button>
            <Button size="sm" variant="secondary" icon={<UserSearch size={16} />} onClick={() => navigate('/scout')}>
              <span className="hide-sm">Scout</span>
            </Button>
            <Button size="sm" icon={<Upload size={16} />} onClick={() => navigate('/import')}>
              Import
            </Button>
          </>
        }
      />
      {games.length > 0 && (
        <div className="games-stats">
          <div className="wdl">
            <span className="wdl-item"><span className="wdl-num num">{stats.win}</span> won</span>
            <span className="wdl-item"><span className="wdl-num num">{stats.draw}</span> drawn</span>
            <span className="wdl-item"><span className="wdl-num num">{stats.loss}</span> lost</span>
            {stats.acc !== null && <span className="wdl-item"><span className="wdl-num num">{stats.acc.toFixed(0)}%</span> avg. accuracy</span>}
          </div>
          {stats.openings.length > 0 && (
            <div className="opening-scores">
              {stats.openings.map(([name, v]) => (
                <div key={name} className="opening-score">
                  <span className="opening-score-name">{name}</span>
                  <span className="meter"><span className="meter-fill" style={{ width: `${(v.score / v.n) * 100}%` }} /></span>
                  <span className="num small muted">{v.score}/{v.n}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      <div className="mt16">
        <Segmented
          value={filter}
          onChange={setFilter}
          label="Filter games"
          options={[
            { value: 'all', label: 'All' },
            { value: 'coach', label: 'Vs the coach' },
            { value: 'imported', label: 'Imported' },
          ]}
        />
      </div>
      {list.length === 0 ? (
        <div className="mt16">
          <Empty
            title="No games yet"
            action={
              <div className="row" style={{ justifyContent: 'center' }}>
                <Button onClick={() => navigate('/play')}>Play the coach</Button>
                <Button variant="secondary" onClick={() => navigate('/import')}>Import games</Button>
              </div>
            }
          >
            Play a game against the coach, or import your games from a PGN file, Lichess or Chess.com.
          </Empty>
        </div>
      ) : (
        <div className="list mt16">
          {list.map((g) => {
            const o = outcome(g);
            return (
              <button key={g.id} className="list-item game-row" onClick={() => navigate(`/games/${g.id}`)}>
                <span className={`result-badge result-${o}`}>{o === 'win' ? 'W' : o === 'loss' ? 'L' : o === 'draw' ? '½' : g.result === '*' ? '–' : g.result}</span>
                <span className="list-item-main">
                  <span className="list-item-title">
                    {g.white} <span className="faint">vs</span> {g.black}
                  </span>
                  <span className="list-item-sub">{g.opening ?? 'Opening unknown'} · {Math.ceil(g.plies / 2)} moves</span>
                </span>
                <span className="list-item-meta">
                  {g.reviewed && g.accuracy && g.myColor ? <span className="acc-pill num">{Math.round(g.accuracy[g.myColor])}%</span> : <span className="faint">Not reviewed</span>}
                  <br />
                  {g.date ?? new Date(g.createdAt).toISOString().slice(0, 10)}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
