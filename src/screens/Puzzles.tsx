import { useEffect, useMemo, useState } from 'react';
import { CalendarDays, Crown, Flame, Play, Timer, Zap } from 'lucide-react';
import { loadPuzzles, THEME_INFO, isMaster, type Puzzle } from '../lib/puzzles';
import { useApp, today } from '../lib/store/app';
import { navigate } from '../lib/router';
import { Header, Section, Spinner } from '../components/ui';
import { OPENINGS } from '../data/openings';

export function usePuzzleDb() {
  const [db, setDb] = useState<Puzzle[] | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    loadPuzzles().then(setDb).catch(() => setError(true));
  }, []);
  return { db, error };
}

const GROUPS = ['Motifs', 'Mates', 'Style', 'Endgames', 'Phase'] as const;

export function PuzzlesHub() {
  const { db } = usePuzzleDb();
  const ps = useApp((s) => s.puzzles);
  const repertoire = useApp((s) => s.repertoire);
  const [side, setSide] = useState<'' | 'w' | 'b'>('');
  const [allFams, setAllFams] = useState(false);
  const sq = side ? `&side=${side}` : '';
  const counts = useMemo(() => {
    const m = new Map<string, number>();
    const o = new Map<string, number>();
    const f = new Map<string, number>();
    let masters = 0;
    let total = 0;
    for (const p of db ?? []) {
      if (side && p.side !== side) continue;
      total++;
      for (const t of p.themes) m.set(t, (m.get(t) ?? 0) + 1);
      if (p.opening) o.set(p.opening, (o.get(p.opening) ?? 0) + 1);
      if (p.family) f.set(p.family, (f.get(p.family) ?? 0) + 1);
      if (isMaster(p)) masters++;
    }
    const families = [...f.entries()].filter(([, n]) => n >= 8).sort((a, b) => b[1] - a[1]);
    return { themes: m, openings: o, families, masters, total };
  }, [db, side]);
  const recent = ps.history.slice(0, 20);
  const recentRate = recent.length ? Math.round((recent.filter((h) => h.ok).length / recent.length) * 100) : null;
  const dailyDone = ps.dailyDone === today();
  const repOpenings = OPENINGS.filter((o) => repertoire[o.id]);

  return (
    <div className="page">
      <Header title="Puzzles" sub={db ? `${db.length.toLocaleString()} puzzles on this device — from real games, rated and sorted by theme.` : 'Loading the puzzle collection…'} />

      <div className="segmented puzzle-side" role="radiogroup" aria-label="Play as">
        {([['', 'Both colours'], ['w', 'As White'], ['b', 'As Black']] as const).map(([v, label]) => (
          <button key={v} role="radio" aria-checked={side === v} className={`${side === v ? ' is-on' : ''}`} onClick={() => setSide(v)}>
            {label}
          </button>
        ))}
      </div>
      {side && db && <p className="muted small mb8">{counts.total.toLocaleString()} puzzles where you play {side === 'w' ? 'White' : 'Black'}. Every list below is filtered.</p>}

      <div className="puzzle-hero">
        <div className="puzzle-rating">
          <span className="puzzle-rating-num num">{ps.rating}</span>
          <span className="puzzle-rating-label">puzzle rating</span>
          <span className="muted small num">
            {ps.solved} solved{recentRate !== null ? ` · ${recentRate}% of the last ${recent.length}` : ''}
          </span>
        </div>
        <div className="puzzle-actions">
          <button className="puzzle-action puzzle-action-main" onClick={() => navigate(`/puzzles/play?mode=rated${sq}`)} disabled={!db}>
            <Play size={20} />
            <span>
              <strong>Rated puzzles</strong>
              <span className="muted small">Adapts to your rating</span>
            </span>
          </button>
          <button className="puzzle-action" onClick={() => navigate('/puzzles/play?mode=daily')} disabled={!db}>
            <CalendarDays size={20} />
            <span>
              <strong>Daily puzzle</strong>
              <span className="muted small">{dailyDone ? 'Done for today' : 'A new one every day'}</span>
            </span>
          </button>
        </div>
      </div>

      <Section title="Puzzle Rush">
        <div className="rush-grid">
          {[
            { mode: '3', label: '3 minutes', icon: Zap },
            { mode: '5', label: '5 minutes', icon: Timer },
            { mode: 'survival', label: 'Survival', icon: Flame },
          ].map((r) => (
            <button key={r.mode} className="rush-card" onClick={() => navigate(`/puzzles/rush?mode=${r.mode}`)} disabled={!db}>
              <r.icon size={22} />
              <span className="rush-label">{r.label}</span>
              <span className="muted small num">Best: {ps.rush[r.mode] ?? 0}</span>
            </button>
          ))}
        </div>
        <p className="muted small mt8">Puzzles get harder as you go. Three mistakes and the run ends.</p>
      </Section>

      <Section title="From master games">
        <button className="list-item list-standalone" onClick={() => navigate(`/puzzles/play?mode=master${sq}`)} disabled={!db}>
          <Crown size={20} />
          <span className="list-item-main">
            <span className="list-item-title">Master &amp; grandmaster games</span>
            <span className="list-item-sub">Tactics that occurred between titled players.</span>
          </span>
          <span className="list-item-meta num">{counts.masters}</span>
        </button>
      </Section>

      <Section title="Tactics in your openings">
        {repOpenings.length === 0 && <p className="muted small mb8">Add openings to your repertoire to see them first. All 14 library openings have puzzles from real games.</p>}
        <div className="chips">
          {[...repOpenings, ...OPENINGS.filter((o) => !repertoire[o.id])].map((o) => (
            <button key={o.id} className={`chip${repertoire[o.id] ? ' chip-on' : ''}`} onClick={() => navigate(`/puzzles/play?mode=opening&id=${o.id}${sq}`)} disabled={!counts.openings.get(o.id)}>
              {o.name} <span className="num">{counts.openings.get(o.id) ?? 0}</span>
            </button>
          ))}
        </div>
      </Section>

      <Section title="Every opening">
        <p className="muted small mb8">Puzzles grouped by the opening of the game they came from — {counts.families.length} openings, wherever Lichess recorded one.</p>
        <div className="chips">
          {(allFams ? counts.families : counts.families.slice(0, 18)).map(([f, n]) => (
            <button key={f} className="chip" onClick={() => navigate(`/puzzles/play?mode=family&fam=${encodeURIComponent(f)}${sq}`)}>
              {f} <span className="num">{n}</span>
            </button>
          ))}
          {counts.families.length > 18 && (
            <button className="chip" onClick={() => setAllFams(!allFams)}>
              {allFams ? 'Show fewer' : `Show all ${counts.families.length}`}
            </button>
          )}
        </div>
      </Section>

      <Section title="Practise a theme">
        {!db && <Spinner />}
        {db &&
          GROUPS.map((g) => (
            <div key={g} className="theme-group">
              <h3 className="lesson-group-title">{g}</h3>
              <div className="theme-grid">
                {Object.entries(THEME_INFO)
                  .filter(([, v]) => v.group === g)
                  .filter(([k]) => (counts.themes.get(k) ?? 0) >= 10)
                  .map(([k, v]) => (
                    <button key={k} className="theme-card" onClick={() => navigate(`/puzzles/play?mode=theme&theme=${k}${sq}`)}>
                      <span className="theme-card-label">{v.label}</span>
                      <span className="theme-card-about">{v.about}</span>
                      <span className="theme-card-count num">{counts.themes.get(k)}</span>
                    </button>
                  ))}
              </div>
            </div>
          ))}
      </Section>

      {recent.length > 0 && (
        <Section title="Recent">
          <div className="recent-strip">
            {recent.map((h) => (
              <span key={h.id + h.t} className={`recent-dot ${h.ok ? 'ok' : 'bad'}`} title={`${h.rating}`}>
                {h.ok ? '✓' : '✕'}
              </span>
            ))}
          </div>
        </Section>
      )}
      <p className="faint small mt24">Puzzles from the Lichess puzzle database (CC0).</p>
    </div>
  );
}
