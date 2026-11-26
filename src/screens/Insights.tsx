import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, Clock, Flame } from 'lucide-react';
import { useApp, streak } from '../lib/store/app';
import { loadGameBody, type StoredGame } from '../lib/store/gamesDb';
import { computeInsights, recommendations, PHASES, type Insights } from '../lib/insightsData';
import { THEME_INFO } from '../lib/puzzles';
import { CLASS_INFO } from '../lib/coach/explain';
import { navigate } from '../lib/router';
import { Button, Empty, Glyph, Header, Section, Spinner } from '../components/ui';
import { Heatmap, MeterList, StatTile, TrendChart } from '../components/Charts';
import { ResultBar } from '../components/MasterMoves';

const themeLabel = (t: string) => THEME_INFO[t]?.label ?? t;
const PHASE_LABEL = { opening: 'Opening', middlegame: 'Middlegame', endgame: 'Endgame' } as const;

export function InsightsScreen() {
  const games = useApp((s) => s.games);
  const puzzles = useApp((s) => s.puzzles);
  const activity = useApp((s) => s.activity);
  const drills = useApp((s) => s.drills);
  const [bodies, setBodies] = useState<Map<string, StoredGame> | null>(null);
  const [showTable, setShowTable] = useState(false);

  useEffect(() => {
    let alive = true;
    const wanted = games.filter((g) => g.myColor && (g.reviewed || g.timeControl));
    Promise.all(wanted.map((g) => loadGameBody(g.id).catch(() => undefined))).then((list) => {
      if (!alive) return;
      const m = new Map<string, StoredGame>();
      list.forEach((b) => b && m.set(b.id, b));
      setBodies(m);
    });
    return () => {
      alive = false;
    };
  }, [games]);

  const ins: Insights | null = useMemo(() => (bodies ? computeInsights(games, bodies, puzzles, activity) : null), [bodies, games, puzzles, activity]);
  const recs = useMemo(() => (ins ? recommendations(ins, themeLabel) : []), [ins]);

  if (!ins) {
    return (
      <div className="page">
        <Header title="Insights" backTo="/train" />
        <Spinner label="Crunching your games…" />
      </div>
    );
  }

  const days = streak(activity);
  const total = (c: 'w' | 'b') => ins.results[c].win + ins.results[c].draw + ins.results[c].loss;
  const allGames = total('w') + total('b');
  const score = allGames ? ((ins.results.w.win + ins.results.b.win + (ins.results.w.draw + ins.results.b.draw) / 2) / allGames) * 100 : undefined;
  const accDelta = ins.accRecent !== undefined && ins.accPrevious !== undefined ? ins.accRecent - ins.accPrevious : undefined;
  const per40 = (n: number) => (ins.mistakes.moves ? (n / ins.mistakes.moves) * 40 : 0);
  const firstPuzzle = ins.puzzleTrend[0]?.rating;
  const drillsPassed = Object.values(drills).filter((d) => d.passed).length;
  const fmtDate = (s: string) => new Date(s + 'T12:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

  return (
    <div className="page insights">
      <Header title="Insights" backTo="/train" sub="How you play, where you lose points, and what to train next — computed on this device from your games, puzzles and training." />

      <div className="kpi-row">
        <StatTile
          label="Accuracy, last 10 reviewed"
          value={ins.accRecent !== undefined ? `${Math.round(ins.accRecent)}%` : '—'}
          delta={accDelta !== undefined ? `${accDelta >= 0 ? '+' : '−'}${Math.abs(accDelta).toFixed(1)} vs previous 10` : undefined}
          deltaGood={accDelta !== undefined ? accDelta >= 0 : undefined}
          sub={ins.reviewed ? `${ins.reviewed} reviewed games` : 'Review a game to start'}
        />
        <StatTile label="Score" value={score !== undefined ? `${Math.round(score)}%` : '—'} sub={`${allGames} game${allGames === 1 ? '' : 's'} with a result`} />
        <StatTile
          label="Puzzle rating"
          value={puzzles.rating}
          delta={firstPuzzle !== undefined && ins.puzzleTrend.length > 1 ? `${puzzles.rating - firstPuzzle >= 0 ? '+' : '−'}${Math.abs(puzzles.rating - firstPuzzle)} since ${new Date(ins.puzzleTrend[0].t).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}` : undefined}
          deltaGood={firstPuzzle !== undefined ? puzzles.rating >= firstPuzzle : undefined}
          sub={`${puzzles.solved} solved`}
        />
        <StatTile label="Streak" value={<>{days}{days > 0 && <Flame size={22} className="stat-flame" />}</>} sub={`${drillsPassed} endgame drill${drillsPassed === 1 ? '' : 's'} passed`} />
      </div>

      {recs.length > 0 && (
        <Section title="Train next">
          <div className="rec-list">
            {recs.map((r, i) => (
              <div key={i} className="rec">
                <p>{r.text}</p>
                <Button size="sm" variant="secondary" onClick={() => navigate(r.to)}>{r.cta} <ArrowRight size={14} /></Button>
              </div>
            ))}
          </div>
        </Section>
      )}

      {ins.games === 0 ? (
        <Section>
          <Empty title="No games yet" action={<Button onClick={() => navigate('/play')}>Play the coach</Button>}>
            Play or import games, then run a coach review — accuracy, phases, openings and time use appear here.
          </Empty>
        </Section>
      ) : (
        <>
          <Section title="Accuracy trend" action={ins.trend.length > 0 ? <button className="link-btn" onClick={() => setShowTable(!showTable)}>{showTable ? 'Hide table' : 'Show as table'}</button> : undefined}>
            {ins.trend.length >= 2 ? (
              <>
                <p className="muted small mb8">Your accuracy in each reviewed game, oldest to newest. Tap a point to open the game.</p>
                <TrendChart
                  data={ins.trend.map((p) => ({ value: p.acc, label: fmtDate(p.date), detail: `vs ${p.opponent} · ${p.result}` }))}
                  min={40}
                  ticks={[50, 70, 90]}
                  onSelect={(i) => navigate(`/games/${ins.trend[i].gameId}`)}
                />
              </>
            ) : (
              <p className="muted">Review at least two games with the coach to see a trend.</p>
            )}
            {showTable && (
              <table className="data-table mt12">
                <thead><tr><th>Date</th><th>Opponent</th><th>Result</th><th className="num">Accuracy</th></tr></thead>
                <tbody>
                  {[...ins.trend].reverse().map((p) => (
                    <tr key={p.gameId} onClick={() => navigate(`/games/${p.gameId}`)} className="is-click">
                      <td>{fmtDate(p.date)}</td><td>{p.opponent}</td><td>{p.result}</td><td className="num">{Math.round(p.acc)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Section>

          <div className="insights-grid">
            <Section title="Accuracy by phase">
              {PHASES.some((p) => ins.phase[p].moves) ? (
                <>
                  <MeterList rows={PHASES.map((p) => ({ label: PHASE_LABEL[p], value: ins.phase[p].acc, note: `${ins.phase[p].moves} moves` }))} />
                  <p className="faint small mt8">Opening = first ten moves; endgame = little material left. Based on {ins.mistakes.moves} of your reviewed moves.</p>
                </>
              ) : (
                <p className="muted">Needs reviewed games.</p>
              )}
            </Section>

            <Section title="Mistakes per 40 moves">
              {ins.mistakes.moves ? (
                <>
                  <MeterList
                    max={Math.max(1, per40(ins.mistakes.inaccuracy), per40(ins.mistakes.mistake), per40(ins.mistakes.blunder), per40(ins.mistakes.miss))}
                    format={(v) => v.toFixed(1)}
                    rows={(['inaccuracy', 'mistake', 'blunder', 'miss'] as const).map((c) => ({
                      label: <span className="row-label-glyph"><Glyph cls={c} size="sm" /> {CLASS_INFO[c].label}</span>,
                      value: per40(ins.mistakes[c]),
                      tone: CLASS_INFO[c].tone,
                      note: `${ins.mistakes[c]} in ${ins.mistakes.moves} moves`,
                    }))}
                  />
                  <p className="faint small mt8">A typical game is about 40 of your moves.</p>
                </>
              ) : (
                <p className="muted">Needs reviewed games.</p>
              )}
            </Section>
          </div>

          <Section title="Results">
            <div className="results-rows">
              {(['w', 'b'] as const).map((c) => (
                <div key={c} className="results-row">
                  <span className="results-label">As {c === 'w' ? 'White' : 'Black'} <span className="faint num">{total(c)}</span></span>
                  {total(c) ? <ResultBar white={c === 'w' ? ins.results.w.win : ins.results.b.loss} draws={ins.results[c].draw} black={c === 'w' ? ins.results.w.loss : ins.results.b.win} /> : <span className="muted small">No games</span>}
                  <span className="muted small num">{ins.results[c].win}W · {ins.results[c].draw}D · {ins.results[c].loss}L</span>
                </div>
              ))}
            </div>
            <p className="faint small mt8">Bar segments are White wins, draws and Black wins.</p>
          </Section>

          {ins.openings.length > 0 && (
            <Section title="Your openings">
              <table className="data-table">
                <thead><tr><th>Opening</th><th className="num">Games</th><th className="num">Score</th><th className="num">Accuracy</th></tr></thead>
                <tbody>
                  {ins.openings.map((o) => (
                    <tr key={o.name}>
                      <td>{o.name} <span className="faint small">{o.asWhite ? `${o.asWhite}×W` : ''}{o.asWhite && o.asBlack ? ' ' : ''}{o.asBlack ? `${o.asBlack}×B` : ''}</span></td>
                      <td className="num">{o.games}</td>
                      <td className={`num${o.games >= 3 && o.score < 0.4 ? ' tone-text-mistake' : ''}`}>{Math.round(o.score * 100)}%</td>
                      <td className="num">{o.acc !== undefined ? `${Math.round(o.acc)}%` : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Section>
          )}

          <Section title={<span><Clock size={18} className="inline-icon" /> Time management</span>}>
            {ins.time ? (
              <>
                <MeterList
                  max={Math.max(1, ...PHASES.map((p) => (ins.time!.avgThink[p] ?? 0) / 1000))}
                  format={(v) => `${v.toFixed(1)} s`}
                  rows={PHASES.map((p) => ({ label: PHASE_LABEL[p], value: ins.time!.avgThink[p] !== undefined ? ins.time!.avgThink[p]! / 1000 : undefined }))}
                />
                <p className="muted mt12">
                  Average think time per move, from {ins.time.games} timed game{ins.time.games === 1 ? '' : 's'}. You were short of time on {Math.round(ins.time.troubleMovesShare * 100)}% of moves
                  {ins.time.errors ? <>, and {Math.round(ins.time.troubleErrorsShare * 100)}% of your mistakes and blunders came then.</> : '.'}
                </p>
              </>
            ) : (
              <p className="muted">Play a timed game against the coach to see how you spend your clock.</p>
            )}
          </Section>
        </>
      )}

      <div className="insights-grid">
        <Section title="Puzzle rating">
          {ins.puzzleTrend.length >= 2 ? (
            (() => {
              const vals = ins.puzzleTrend.map((p) => p.rating);
              const lo = Math.floor((Math.min(...vals) - 50) / 100) * 100;
              const hi = Math.ceil((Math.max(...vals) + 50) / 100) * 100;
              const step = (hi - lo) / 2;
              return (
                <TrendChart
                  data={ins.puzzleTrend.map((p) => ({ value: p.rating, label: new Date(p.t).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) }))}
                  min={lo}
                  max={hi}
                  unit=""
                  ticks={[lo, lo + step, hi]}
                  height={150}
                />
              );
            })()
          ) : (
            <p className="muted">Solve a few rated puzzles to see your rating move.</p>
          )}
        </Section>

        <Section title="Puzzle themes">
          {ins.themes.length >= 2 ? (
            <>
              <h4 className="mini-head">Strongest</h4>
              <MeterList rows={ins.themes.slice(0, 4).map((t) => ({ label: themeLabel(t.theme), value: t.rate * 100, note: `${t.n} puzzles` }))} />
              <h4 className="mini-head mt12">Weakest</h4>
              <MeterList rows={[...ins.themes].reverse().slice(0, 4).map((t) => ({ label: themeLabel(t.theme), value: t.rate * 100, note: `${t.n} puzzles` }))} />
              <p className="faint small mt8">Success rate on first try, themes with at least four puzzles.</p>
            </>
          ) : (
            <p className="muted">After a couple of dozen puzzles, your strongest and weakest motifs show up here.</p>
          )}
        </Section>
      </div>

      <Section title="Training activity">
        <Heatmap days={ins.heat} />
      </Section>
    </div>
  );
}
