import { useMemo } from 'react';
import { ArrowRight, Flame, Settings as SettingsIcon, Swords, Upload, Microscope } from 'lucide-react';
import { useApp, streak, dueCards, dueDrills, today } from '../lib/store/app';
import { dailySession, estimateRating, getTrack, findWeaknesses } from '../lib/plan';
import { navigate } from '../lib/router';
import { IconButton, Section } from '../components/ui';
import { OPENINGS } from '../data/openings';
import { ProgramTodayCard } from './Program';
import { currentDay } from '../lib/program';
import { WeeklyCard } from './WeeklyReport';

const KIND_LABEL: Record<string, string> = {
  review: 'Review',
  analyse: 'Game review',
  lesson: 'Lesson',
  learn: 'Opening',
  drill: 'Drill',
  play: 'Play',
};

export function Today() {
  const s = useApp();
  const steps = useMemo(
    () =>
      dailySession({
        cards: s.cards,
        games: s.games,
        plan: s.plan,
        lessons: s.lessons,
        repertoire: s.repertoire,
        dailyPuzzleDone: s.puzzles.dailyDone === today(),
        dueDrills: dueDrills(s.drills),
      }),
    [s.cards, s.games, s.plan, s.lessons, s.repertoire, s.puzzles.dailyDone, s.drills],
  );
  const days = streak(s.activity);
  const due = dueCards(s.cards).length;
  const rating = estimateRating(s.games);
  const track = s.plan ? getTrack(s.plan.trackId) : undefined;
  const trackPct = track ? Math.round((s.plan!.done.length / track.steps.length) * 100) : 0;
  const reviewed = s.games.filter((g) => g.reviewed && g.myColor && g.accuracy).slice(0, 12).reverse();
  const weaknesses = findWeaknesses(s.games);
  const todayAct = s.activity[today()];
  const programDay = s.program ? currentDay(s.program) : null;
  const extra = s.program ? steps.filter((st) => st.kind === 'review' || st.kind === 'analyse' || st.id === 'endgame-review') : steps;
  const openBlocks = programDay ? programDay.blocks.filter((b) => !s.program!.done.includes(b.id)) : [];
  const stepCount = extra.length + openBlocks.length;
  const totalMinutes = extra.reduce((a, b) => a + b.minutes, 0) + openBlocks.reduce((a, b) => a + b.minutes, 0);
  const cardsTotal = Object.keys(s.cards).length;
  const lessonsDone = Object.values(s.lessons).filter((l) => l.completed).length;

  return (
    <div className="page today">
      <header className="today-head">
        <div>
          <p className="today-date">{new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</p>
          <h1 className="today-title">Today’s session</h1>
          <p className="today-sub">
            {stepCount} step{stepCount === 1 ? '' : 's'} · about {totalMinutes} min
          </p>
        </div>
        <div className="today-head-actions">
          <IconButton label="Settings" onClick={() => navigate('/settings')} className="mobile-only">
            <SettingsIcon size={22} />
          </IconButton>
        </div>
      </header>

      <div className="today-grid">
        <div className="today-main">
        {s.program && <ProgramTodayCard />}
        {s.program && extra.length > 0 && <h3 className="also-today">Also today</h3>}
        <ol className="session">
          {extra.map((st, i) => (
            <li key={st.id}>
              <button className="session-step" onClick={() => navigate(st.to)}>
                <span className="session-num">{i + 1}</span>
                <span className="session-main">
                  <span className="session-kind">{KIND_LABEL[st.kind]} · {st.minutes} min</span>
                  <span className="session-title">{st.title}</span>
                  {st.detail && <span className="session-detail">{st.detail}</span>}
                </span>
                <ArrowRight size={20} className="session-go" />
              </button>
            </li>
          ))}
        </ol>
        {!s.program && (
          <button className="program-cta" onClick={() => navigate('/program')}>
            <span>
              <strong>Start a training program</strong>
              <span className="muted small">Daily lesson plans, weekly review days and checkpoints — 4 to 8 weeks.</span>
            </span>
            <ArrowRight size={18} />
          </button>
        )}
        </div>

        <aside className="today-side">
          <div className="stat-strip">
            <div className="stat">
              <span className="stat-value num">
                {days}
                {days > 0 && <Flame size={20} className="stat-flame" />}
              </span>
              <span className="stat-label">day streak</span>
            </div>
            <div className="stat">
              <span className="stat-value num">{due}</span>
              <span className="stat-label">cards due</span>
            </div>
            <div className="stat">
              <span className="stat-value num">{rating}</span>
              <span className="stat-label">est. rating vs bots</span>
            </div>
            <div className="stat">
              <span className="stat-value num">{s.puzzles.rating}</span>
              <span className="stat-label">puzzle rating</span>
            </div>
          </div>
          {todayAct && (
            <p className="today-done muted">
              Done today: {[todayAct.reviews && `${todayAct.reviews} reviews`, todayAct.lines && `${todayAct.lines} lines`, todayAct.lessons && `${todayAct.lessons} lessons`, todayAct.games && `${todayAct.games} games`].filter(Boolean).join(', ') || 'nothing yet'}
            </p>
          )}
          <WeeklyCard />
          <div className="quick-actions">
            <button className="quick" onClick={() => navigate('/play')}>
              <Swords size={20} />
              <span>Play the coach</span>
            </button>
            <button className="quick" onClick={() => navigate('/analysis')}>
              <Microscope size={20} />
              <span>Analysis board</span>
            </button>
            <button className="quick" onClick={() => navigate('/import')}>
              <Upload size={20} />
              <span>Import games</span>
            </button>
          </div>
        </aside>
      </div>

      <Section title="Your plan" action={<button className="link-btn" onClick={() => navigate('/train/plan')}>{track ? 'Change' : 'Choose a plan'}</button>}>
        {track ? (
          <button className="plan-card" onClick={() => navigate('/train/plan')}>
            <span className="plan-card-title">{track.title}</span>
            <span className="plan-card-sub">
              {s.plan!.done.length} of {track.steps.length} steps · {trackPct}%
            </span>
            <span className="meter">
              <span className="meter-fill" style={{ width: `${trackPct}%` }} />
            </span>
          </button>
        ) : (
          <p className="muted">Pick a training track — openings, structures or endgames — and the daily session will follow it.</p>
        )}
      </Section>

      <Section title="Progress" action={<button className="link-btn" onClick={() => navigate('/insights')}>All insights <ArrowRight size={14} /></button>}>
        <div className="progress-grid">
          <div className="panel panel-tight">
            <h4>Accuracy, last {reviewed.length || 0} reviewed games</h4>
            {reviewed.length >= 2 ? (
              <Sparkline values={reviewed.map((g) => g.accuracy![g.myColor!])} />
            ) : (
              <p className="muted small">Play or import games and run a coach review to see your trend.</p>
            )}
          </div>
          <div className="panel panel-tight">
            <h4>Training totals</h4>
            <dl className="totals">
              <div><dt>Games</dt><dd className="num">{s.games.length}</dd></div>
              <div><dt>Review cards</dt><dd className="num">{cardsTotal}</dd></div>
              <div><dt>Lessons done</dt><dd className="num">{lessonsDone}</dd></div>
              <div><dt>Openings in repertoire</dt><dd className="num">{Object.keys(s.repertoire).length}/{OPENINGS.length}</dd></div>
            </dl>
          </div>
          {weaknesses.length > 0 && (
            <div className="panel panel-tight">
              <h4>What the coach sees</h4>
              <ul className="bullets">
                {weaknesses.map((w) => (
                  <li key={w.id}>
                    <strong>{w.label}.</strong> <span className="muted">{w.detail}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </Section>
    </div>
  );
}

function Sparkline({ values }: { values: number[] }) {
  const W = 300;
  const H = 70;
  const min = Math.min(...values, 50);
  const max = Math.max(...values, 100);
  const pts = values.map((v, i) => [(i / Math.max(1, values.length - 1)) * W, H - ((v - min) / (max - min || 1)) * (H - 10) - 5]);
  const d = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  const last = values[values.length - 1];
  return (
    <div className="spark">
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="spark-svg" aria-hidden>
        <path d={d} className="spark-line" vectorEffect="non-scaling-stroke" />
        {pts.map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r={2.6} className="spark-dot" />
        ))}
      </svg>
      <span className="spark-last num">{Math.round(last)}%</span>
    </div>
  );
}
