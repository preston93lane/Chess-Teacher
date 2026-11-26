import { useMemo } from 'react';
import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import { useApp, streak } from '../lib/store/app';
import { computeWeek, isoDay, shiftWeek, weekStart, type WeekStats } from '../lib/weekly';
import { THEME_INFO } from '../lib/puzzles';
import { navigate, query, useRoute } from '../lib/router';
import { Button, Header, IconButton, Section } from '../components/ui';
import { StatTile } from '../components/Charts';

const themeLabel = (t: string) => THEME_INFO[t]?.label ?? t;

function delta(now: number, before: number, unit = '') {
  const d = now - before;
  if (!d) return { text: 'same as last week', good: undefined };
  return { text: `${d > 0 ? '+' : '−'}${Math.abs(Math.round(d * 10) / 10)}${unit} vs last week`, good: d > 0 };
}

export function WeeklyReport() {
  const path = useRoute();
  const s = useApp();
  const param = query(path).get('week');
  const start = useMemo(() => (param ? weekStart(new Date(param + 'T12:00:00')) : weekStart()), [param]);
  const thisWeek = weekStart();
  const isCurrent = start.getTime() === thisWeek.getTime();
  const w = useMemo(() => computeWeek(s, start), [s, start]);
  const prev = useMemo(() => computeWeek(s, shiftWeek(start, -1)), [s, start]);
  const go = (n: number) => navigate(`/report?week=${isoDay(shiftWeek(start, n))}`, true);
  const range = `${start.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} – ${new Date(w.end.getTime() - 86400000).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`;
  const maxDay = Math.max(1, ...w.days.map((d) => d.total));
  const focus = weeklyFocus(w, prev);

  return (
    <div className="page page-narrow">
      <Header title={isCurrent ? 'This week' : 'Weekly report'} backTo="/insights" sub={`${range}${isCurrent ? ' · so far' : ''}`} />
      <div className="row-between mb12">
        <IconButton label="Previous week" onClick={() => go(-1)}><ChevronLeft /></IconButton>
        <span className="muted small">{w.activeDays} of 7 days trained · {streak(s.activity)}-day streak</span>
        <IconButton label="Next week" onClick={() => go(1)} disabled={isCurrent}><ChevronRight /></IconButton>
      </div>

      <div className="week-bars" role="img" aria-label={`Training items per day: ${w.days.map((d) => `${d.label} ${d.total}`).join(', ')}`}>
        {w.days.map((d) => (
          <div key={d.date} className="week-bar">
            <span className="week-bar-value num">{d.total || ''}</span>
            <span className="week-bar-track"><span className="week-bar-fill" style={{ height: `${(d.total / maxDay) * 100}%` }} /></span>
            <span className="week-bar-label">{d.label}</span>
          </div>
        ))}
      </div>

      <div className="kpi-row mt16">
        <StatTile label="Games" value={w.games.count} delta={delta(w.games.count, prev.games.count).text} sub={w.games.count ? `${w.games.win}W · ${w.games.draw}D · ${w.games.loss}L` : undefined} />
        <StatTile
          label="Accuracy"
          value={w.games.acc !== undefined ? `${Math.round(w.games.acc)}%` : '—'}
          delta={w.games.acc !== undefined && prev.games.acc !== undefined ? delta(w.games.acc, prev.games.acc, '%').text : undefined}
          deltaGood={w.games.acc !== undefined && prev.games.acc !== undefined ? w.games.acc >= prev.games.acc : undefined}
          sub="reviewed games"
        />
        <StatTile
          label="Puzzles solved"
          value={`${w.puzzles.solved}/${w.puzzles.tried}`}
          delta={w.puzzles.ratingEnd !== undefined && w.puzzles.ratingStart !== undefined ? `rating ${w.puzzles.ratingEnd - w.puzzles.ratingStart >= 0 ? '+' : '−'}${Math.abs(w.puzzles.ratingEnd - w.puzzles.ratingStart)}` : undefined}
          deltaGood={w.puzzles.ratingEnd !== undefined && w.puzzles.ratingStart !== undefined ? w.puzzles.ratingEnd >= w.puzzles.ratingStart : undefined}
        />
        <StatTile label="Study" value={w.reviews + w.lines} sub={`${w.reviews} reviews · ${w.lines} lines · ${w.lessonsDone} lessons · ${w.drillsPassed} drills`} />
      </div>

      <Section title="Highlights">
        <ul className="bullets">
          {w.games.best && (
            <li>
              <button className="link-btn" onClick={() => navigate(`/games/${w.games.best!.id}`)}>
                Best game: {Math.round(w.games.best.accuracy![w.games.best.myColor!])}% accuracy vs {w.games.best.myColor === 'w' ? w.games.best.black : w.games.best.white}
              </button>
            </li>
          )}
          {w.games.openings.length > 0 && <li>Most played: {w.games.openings.map(([n, c]) => `${n} (${c})`).join(', ')}.</li>}
          {w.puzzles.bestTheme && <li>Strongest puzzle theme: {themeLabel(w.puzzles.bestTheme[0])} — {Math.round(w.puzzles.bestTheme[1] * 100)}% of {w.puzzles.bestTheme[2]}.</li>}
          {w.puzzles.worstTheme && <li>Toughest: {themeLabel(w.puzzles.worstTheme[0])} — {Math.round(w.puzzles.worstTheme[1] * 100)}% of {w.puzzles.worstTheme[2]}.</li>}
          {w.quizRounds > 0 && <li>{w.quizRounds} opening quiz round{w.quizRounds === 1 ? '' : 's'}.</li>}
          {w.activeDays === 0 && <li>No training logged this week{isCurrent ? ' yet' : ''}.</li>}
        </ul>
      </Section>

      <Section title={isCurrent ? 'Focus for the rest of the week' : 'Focus for next week'}>
        <div className="rec-list">
          {focus.map((f, i) => (
            <div key={i} className="rec">
              <p>{f.text}</p>
              <Button size="sm" variant="secondary" onClick={() => navigate(f.to)}>{f.cta} <ArrowRight size={14} /></Button>
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
}

function weeklyFocus(w: WeekStats, prev: WeekStats): { text: string; to: string; cta: string }[] {
  const out: { text: string; to: string; cta: string }[] = [];
  if (w.activeDays < 4) out.push({ text: `You trained on ${w.activeDays} day${w.activeDays === 1 ? '' : 's'}. Short daily sessions beat long weekly ones — aim for five days, even at 15 minutes.`, to: '/', cta: 'Today’s session' });
  if (w.puzzles.worstTheme && w.puzzles.worstTheme[1] < 0.6) out.push({ text: `${themeLabel(w.puzzles.worstTheme[0])} puzzles cost you the most points. Do a focused set.`, to: `/puzzles/play?mode=theme&theme=${w.puzzles.worstTheme[0]}`, cta: 'Themed puzzles' });
  if (w.games.count && w.games.acc === undefined) out.push({ text: 'You played games but haven’t reviewed them. Reviews are where the learning happens.', to: '/games', cta: 'Review games' });
  if (w.games.acc !== undefined && prev.games.acc !== undefined && w.games.acc < prev.games.acc - 3) out.push({ text: 'Accuracy dipped this week. Slow down: check every check, capture and threat before you move.', to: '/insights', cta: 'Insights' });
  if (!w.drillsPassed) out.push({ text: 'No endgame work this week. One drill a day keeps the technique automatic.', to: '/endgames', cta: 'Endgame course' });
  if (w.games.count === 0) out.push({ text: 'Play at least two serious games against the coach — then review them.', to: '/play', cta: 'Play' });
  return out.slice(0, 3);
}

/** Compact card for the Today screen. */
export function WeeklyCard() {
  const s = useApp();
  const start = weekStart();
  const lastWeek = shiftWeek(start, -1);
  const w = useMemo(() => computeWeek(s, start), [s, start]);
  const showLast = new Date().getDay() === 1 || new Date().getDay() === 2; // Monday/Tuesday
  return (
    <button className="weekly-card" onClick={() => navigate(showLast ? `/report?week=${isoDay(lastWeek)}` : '/report')}>
      <span className="weekly-card-title">{showLast ? 'Last week’s report is ready' : 'This week so far'}</span>
      <span className="muted small">
        {w.activeDays}/7 days · {w.games.count} game{w.games.count === 1 ? '' : 's'} · {w.puzzles.solved} puzzles · {w.reviews} reviews
      </span>
      <ArrowRight size={16} className="weekly-card-go" />
    </button>
  );
}
