import { ArrowRight, ChartNoAxesColumn, Check, Crown, Database, Eye, GitBranch, GraduationCap, Play } from 'lucide-react';
import { ALL_DRILLS } from '../data/endgames';
import { useApp, dueCards } from '../lib/store/app';
import { navigate } from '../lib/router';
import { LESSONS } from '../data/lessons';
import { getTrack } from '../lib/plan';
import { dueLabel } from '../lib/srs/scheduler';
import { Button, Header, Section } from '../components/ui';
import { MiniBoard } from '../components/MiniBoard';
import { CLASSICS } from '../data/classics';
import { ProgramTodayCard } from './Program';
import type { PuzzleCard } from '../lib/store/app';
import type { Track } from '../lib/lessons/types';

const TRACK_ORDER: Track[] = ['Pawn structures', 'Pieces & squares', 'Attack & defence', 'Thinking skills', 'Endgames'];

export function Train() {
  const cards = useApp((s) => s.cards);
  const lessons = useApp((s) => s.lessons);
  const plan = useApp((s) => s.plan);
  const program = useApp((s) => s.program);
  const quizBest = useApp((s) => s.quiz.best.library);
  const removeCard = useApp((s) => s.removeCard);
  const drills = useApp((s) => s.drills);
  const visionBest = useApp((s) => s.vision.find);
  const drillsPassed = ALL_DRILLS.filter((d) => drills[d.id]?.passed).length;
  const due = dueCards(cards);
  const all = Object.values(cards);
  const dueLines = due.filter((c) => c.kind === 'line').length;
  const duePuzzles = due.length - dueLines;
  const puzzles = all.filter((c): c is PuzzleCard => c.kind === 'puzzle').sort((a, b) => b.addedAt - a.addedAt);
  const nextDue = all.filter((c) => c.state.due > Date.now()).sort((a, b) => a.state.due - b.state.due)[0];
  const track = plan ? getTrack(plan.trackId) : undefined;

  return (
    <div className="page">
      <Header title="Train" sub="Spaced repetition for your lines and your own mistakes, plus lessons on the ideas behind them." />

      <div className="review-hero">
        <div className="review-hero-count">
          <span className="review-hero-num num">{due.length}</span>
          <span className="review-hero-label">{due.length === 1 ? 'card due' : 'cards due'}</span>
        </div>
        <div className="review-hero-body">
          <p className="muted">
            {due.length
              ? `${dueLines} opening line${dueLines === 1 ? '' : 's'} and ${duePuzzles} position${duePuzzles === 1 ? '' : 's'} from your games.`
              : all.length
                ? `All caught up. Next card ${nextDue ? dueLabel(nextDue.state).toLowerCase() : 'later'}.`
                : 'Your deck is empty. Learn an opening line or review a game — both add cards here.'}
          </p>
          <div className="row mt12">
            <Button icon={<Play size={16} />} disabled={!due.length} onClick={() => navigate('/train/review')}>
              Start review
            </Button>
            {duePuzzles > 0 && (
              <Button variant="secondary" onClick={() => navigate('/train/review?kind=puzzle')}>
                Only my mistakes
              </Button>
            )}
          </div>
        </div>
      </div>

      <Section title="Training program" action={<button className="link-btn" onClick={() => navigate('/program')}>{program ? 'Open' : 'Choose'} <ArrowRight size={14} /></button>}>
        {program ? (
          <ProgramTodayCard />
        ) : (
          <button className="program-cta" onClick={() => navigate('/program')}>
            <span>
              <strong>Pick a regimen</strong>
              <span className="muted small">All-round, tactics bootcamp, repertoire builder or positional mastery — with daily plans and weekly reviews.</span>
            </span>
            <ArrowRight size={18} />
          </button>
        )}
      </Section>

      <Section title="Opening quiz" action={<button className="link-btn" onClick={() => navigate('/openings/quiz')}>Start <ArrowRight size={14} /></button>}>
        <p className="muted">See a position, name the opening, then play the next theory move. {quizBest !== undefined ? `Best library score: ${quizBest}.` : ''}</p>
      </Section>

      <Section title="Courses & trainers" action={<button className="link-btn" onClick={() => navigate('/courses')}>All courses <ArrowRight size={14} /></button>}>
        <div className="trainer-grid">
          <button className="trainer-card is-featured" onClick={() => navigate('/courses')}>
            <GraduationCap size={22} />
            <span className="trainer-card-title">Courses</span>
            <span className="muted small">Mating patterns, attack, defence, calculation, blindfold, structures and endgames.</span>
          </button>
          <button className="trainer-card" onClick={() => navigate('/endgames')}>
            <Crown size={22} />
            <span className="trainer-card-title">Endgame course</span>
            <span className="muted small">Mates, pawn endings, fortresses and rook endings — drilled against the engine.</span>
            <span className="faint small num">{drillsPassed}/{ALL_DRILLS.length} drills passed</span>
          </button>
          <button className="trainer-card" onClick={() => navigate('/vision')}>
            <Eye size={22} />
            <span className="trainer-card-title">Board vision</span>
            <span className="muted small">Timed square, colour, diagonal and knight-route drills.</span>
            <span className="faint small num">{visionBest ? `Best find-the-square: ${visionBest}` : 'Not tried yet'}</span>
          </button>
          <button className="trainer-card" onClick={() => navigate('/repertoire')}>
            <GitBranch size={22} />
            <span className="trainer-card-title">My repertoires</span>
            <span className="muted small">Build your own opening tree with the coach, then drill it.</span>
          </button>
          <button className="trainer-card" onClick={() => navigate('/explorer')}>
            <Database size={22} />
            <span className="trainer-card-title">Opening explorer</span>
            <span className="muted small">What masters play in every position, with results and model games.</span>
          </button>
          <button className="trainer-card" onClick={() => navigate('/insights')}>
            <ChartNoAxesColumn size={22} />
            <span className="trainer-card-title">Insights</span>
            <span className="muted small">Accuracy trends, mistakes by phase, openings and time use.</span>
          </button>
        </div>
      </Section>

      <Section title="Topic tracks" action={<button className="link-btn" onClick={() => navigate('/train/plan')}>{track ? 'View plan' : 'Choose a plan'} <ArrowRight size={14} /></button>}>
        {track ? (
          <button className="plan-card" onClick={() => navigate('/train/plan')}>
            <span className="plan-card-title">{track.title}</span>
            <span className="plan-card-sub">{plan!.done.length} of {track.steps.length} steps done</span>
            <span className="meter"><span className="meter-fill" style={{ width: `${(plan!.done.length / track.steps.length) * 100}%` }} /></span>
          </button>
        ) : (
          <p className="muted">Follow a structured track — a repertoire, positional foundations or endgames — and your daily session will be built from it.</p>
        )}
      </Section>

      <Section title="Classic games" action={<button className="link-btn" onClick={() => navigate('/classics')}>All {CLASSICS.length} games <ArrowRight size={14} /></button>}>
        <p className="muted mb8">Tactics and strategy through the immortal games: replay them with commentary, or play the winner’s side and find the key moves.</p>
        <div className="classic-strip">
          {CLASSICS.slice(0, 6).map((g) => (
            <button key={g.id} className="classic-mini" onClick={() => navigate(`/classics/${g.id}`)}>
              <span className="classic-year num">{g.year}</span>
              <span className="classic-title">{g.title}</span>
              <span className="muted small">{g.white.split(' ').slice(-1)[0]} – {g.black.split(' ').slice(-1)[0]}</span>
            </button>
          ))}
        </div>
      </Section>

      <Section title="Lessons">
        {TRACK_ORDER.map((t) => {
          const items = LESSONS.filter((l) => l.track === t);
          if (!items.length) return null;
          return (
            <div key={t} className="lesson-group">
              <h3 className="lesson-group-title">{t}</h3>
              <div className="list">
                {items.map((l) => {
                  const p = lessons[l.id];
                  const tasks = l.sections.filter((s) => s.task).length;
                  return (
                    <button key={l.id} className="list-item" onClick={() => navigate(`/train/lesson/${l.id}`)}>
                      <span className={`lesson-check${p?.completed ? ' is-done' : ''}`}>{p?.completed ? <Check size={16} /> : null}</span>
                      <span className="list-item-main">
                        <span className="list-item-title">{l.title}</span>
                        <span className="list-item-sub">{l.summary}</span>
                      </span>
                      <span className="list-item-meta">
                        {l.minutes} min
                        <br />
                        {tasks ? `${p?.solved.length ?? 0}/${tasks} tasks` : l.level}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </Section>

      <Section title="From your games" action={puzzles.length > 0 ? <span className="muted small">{puzzles.length} positions</span> : undefined}>
        {puzzles.length === 0 ? (
          <p className="muted">When the coach reviews a game, your mistakes become positions to solve here — the fastest way to stop repeating them.</p>
        ) : (
          <div className="puzzle-grid">
            {puzzles.slice(0, 12).map((p) => (
              <div key={p.id} className="puzzle-tile">
                <MiniBoard fen={p.fen} orientation={p.fen.split(' ')[1] as 'w' | 'b'} />
                <div className="puzzle-tile-body">
                  <span className="puzzle-tile-title">{p.title}</span>
                  <span className="muted small">{dueLabel(p.state)}</span>
                  <button className="link-btn small" onClick={() => removeCard(p.id)}>Remove</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>
    </div>
  );
}
