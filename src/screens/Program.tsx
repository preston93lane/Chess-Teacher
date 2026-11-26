import { useMemo, useState } from 'react';
import { ArrowRight, Check, CheckCircle2, ChevronDown, Flag, Play } from 'lucide-react';
import { PROGRAMS, allDays, currentDay, getProgram, isCheckpointWeek, withBlock, type Block, type DayPlan } from '../lib/program';
import { useApp } from '../lib/store/app';
import { estimateRating } from '../lib/plan';
import { navigate } from '../lib/router';
import { Button, Header, Section, Segmented, Sheet } from '../components/ui';

const KIND_LABEL: Record<Block['kind'], string> = {
  puzzles: 'Warm-up',
  mix: 'Review',
  lesson: 'Lesson',
  learn: 'Opening',
  classic: 'Classic game',
  quiz: 'Quiz',
  game: 'Game',
  review: 'Review',
  rush: 'Checkpoint',
  recap: 'Recap',
};

export function BlockList({ day, compact }: { day: DayPlan; compact?: boolean }) {
  const program = useApp((s) => s.program);
  const complete = useApp((s) => s.completeBlock);
  if (!program) return null;
  return (
    <ol className="session">
      {day.blocks.map((b, i) => {
        const done = program.done.includes(b.id);
        return (
          <li key={b.id}>
            <div className={`session-step program-block${done ? ' is-done' : ''}`}>
              <span className="session-num">{done ? <Check size={30} /> : i + 1}</span>
              <button className="session-main" onClick={() => navigate(withBlock(b.to, b.id))}>
                <span className="session-kind">{KIND_LABEL[b.kind]} · {b.minutes} min</span>
                <span className="session-title">{b.title}</span>
                {!compact && <span className="session-detail">{b.detail}</span>}
              </button>
              {done ? (
                <span className="block-done-tag">Done</span>
              ) : (
                <button className="link-btn small block-mark" onClick={() => complete(b.id)} title="Mark as done">
                  Mark done
                </button>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

export function ProgramScreen() {
  const program = useApp((s) => s.program);
  const stop = useApp((s) => s.stopProgram);
  const [confirmStop, setConfirmStop] = useState(false);
  if (!program) return <ProgramPicker />;
  const t = getProgram(program.templateId);
  if (!t) return <ProgramPicker />;
  return <ActiveProgramView onStop={() => setConfirmStop(true)} confirmStop={confirmStop} setConfirmStop={setConfirmStop} stop={stop} />;
}

function ActiveProgramView({ onStop, confirmStop, setConfirmStop, stop }: { onStop: () => void; confirmStop: boolean; setConfirmStop: (v: boolean) => void; stop: () => void }) {
  const program = useApp((s) => s.program)!;
  const puzzles = useApp((s) => s.puzzles);
  const t = getProgram(program.templateId)!;
  const days = useMemo(() => allDays(t, program), [t, program]);
  const today = currentDay(program);
  const totalBlocks = days.reduce((a, d) => a + d.blocks.length, 0);
  const pct = Math.round((program.done.length / totalBlocks) * 100);
  const [openWeek, setOpenWeek] = useState<number | null>(today?.week ?? null);

  return (
    <div className="page">
      <Header title={t.title} backTo="/train" sub={`${program.daysPerWeek} days a week · about ${program.minutesPerDay} minutes a day`} />
      <div className="program-progress">
        <div>
          <span className="program-pct num">{pct}%</span>
          <span className="muted small">complete</span>
        </div>
        <span className="meter program-meter"><span className="meter-fill" style={{ width: `${pct}%` }} /></span>
      </div>

      {today ? (
        <Section title={`Week ${today.week}, day ${today.day}: ${today.title}`}>
          {today.week && <p className="muted mb8">{today.review ? (today.checkpoint ? 'Checkpoint day — review everything so far, then measure your progress.' : 'Review day — everything due, plus earlier weeks mixed back in.') : t.weeks[today.week - 1].focus}</p>}
          <BlockList day={today} />
        </Section>
      ) : (
        <Section title="Program complete">
          <p className="muted">Every session done. Compare your checkpoints below, then start another program.</p>
        </Section>
      )}

      <Section title="Progress checkpoints">
        <table className="class-table">
          <thead>
            <tr><th /><th>Puzzle rating</th><th>Rush (survival)</th></tr>
          </thead>
          <tbody>
            <tr>
              <td>Start</td>
              <td className="num">{program.baseline.puzzleRating}</td>
              <td className="num">{program.baseline.rush}</td>
            </tr>
            {program.checkpoints.map((c) => (
              <tr key={c.week}>
                <td>Week {c.week}</td>
                <td className="num">{c.puzzleRating} <span className={c.puzzleRating >= program.baseline.puzzleRating ? 'tone-text-best' : 'tone-text-mistake'}>({c.puzzleRating - program.baseline.puzzleRating >= 0 ? '+' : ''}{c.puzzleRating - program.baseline.puzzleRating})</span></td>
                <td className="num">{c.rush}</td>
              </tr>
            ))}
            <tr>
              <td className="muted">Now</td>
              <td className="num muted">{puzzles.rating}</td>
              <td className="num muted">{puzzles.rush.survival ?? 0}</td>
            </tr>
          </tbody>
        </table>
      </Section>

      <Section title="The whole plan">
        <div className="week-list">
          {t.weeks.map((wk, wi) => {
            const w = wi + 1;
            const wDays = days.filter((d) => d.week === w);
            const wBlocks = wDays.flatMap((d) => d.blocks);
            const wDone = wBlocks.filter((b) => program.done.includes(b.id)).length;
            const open = openWeek === w;
            return (
              <div key={w} className={`week${open ? ' is-open' : ''}`}>
                <button className="week-head" onClick={() => setOpenWeek(open ? null : w)} aria-expanded={open}>
                  <span className="week-num num">{wDone === wBlocks.length ? <CheckCircle2 size={22} /> : w}</span>
                  <span className="week-main">
                    <span className="week-title">{wk.title}{isCheckpointWeek(t, w) && <Flag size={14} className="week-flag" />}</span>
                    <span className="muted small">{wk.focus}</span>
                  </span>
                  <span className="muted small num">{wDone}/{wBlocks.length}</span>
                  <ChevronDown size={18} className="week-chevron" />
                </button>
                {open && (
                  <div className="week-days">
                    {wDays.map((d) => (
                      <div key={d.day} className="week-day">
                        <h4>Day {d.day}: {d.title}</h4>
                        <BlockList day={d} compact />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Section>

      <div className="row mt24">
        <Button variant="danger" size="sm" onClick={onStop}>Leave program</Button>
      </div>
      <Sheet open={confirmStop} onClose={() => setConfirmStop(false)} title="Leave this program?">
        <p className="muted">Your progress in it is discarded. Your games, puzzles and review cards stay.</p>
        <div className="row mt16">
          <Button variant="danger" onClick={() => { stop(); setConfirmStop(false); }}>Leave program</Button>
          <Button variant="ghost" onClick={() => setConfirmStop(false)}>Keep going</Button>
        </div>
      </Sheet>
    </div>
  );
}

function ProgramPicker() {
  const start = useApp((s) => s.startProgram);
  const puzzles = useApp((s) => s.puzzles);
  const games = useApp((s) => s.games);
  const [pick, setPick] = useState(PROGRAMS[0].id);
  const [days, setDays] = useState('5');
  const [minutes, setMinutes] = useState('40');
  const t = getProgram(pick)!;
  const preview = useMemo(() => allDays(t, { daysPerWeek: +days, minutesPerDay: +minutes }).slice(0, +days), [t, days, minutes]);
  return (
    <div className="page page-narrow">
      <Header title="Training programs" backTo="/train" sub="A regimen with daily lesson plans, weekly review days and progress checkpoints." />
      <Section title="Choose a program">
        <div className="stack">
          {PROGRAMS.map((p) => (
            <button key={p.id} className={`source-card${pick === p.id ? ' is-on' : ''}`} onClick={() => setPick(p.id)}>
              <span className="source-title">{p.title}</span>
              <span className="muted small">{p.summary}</span>
              <span className="faint small">{p.weeks.length} weeks · {p.level}</span>
            </button>
          ))}
        </div>
      </Section>
      <Section title="Your schedule">
        <div className="field">
          <span className="field-label">Days per week (the last one is a review day)</span>
          <Segmented value={days} onChange={setDays} options={[{ value: '3', label: '3' }, { value: '5', label: '5' }, { value: '7', label: '7' }]} />
        </div>
        <div className="field mt16">
          <span className="field-label">Minutes per day</span>
          <Segmented value={minutes} onChange={setMinutes} options={[{ value: '20', label: '20' }, { value: '40', label: '40' }, { value: '60', label: '60' }]} />
        </div>
      </Section>
      <Section title="Week 1 at a glance">
        <ul className="bullets">
          {preview.map((d) => (
            <li key={d.day}>
              <strong>Day {d.day}{d.review ? ' (review)' : ''}:</strong> <span className="muted">{d.blocks.map((b) => b.title).join(' · ')}</span>
            </li>
          ))}
        </ul>
      </Section>
      <div className="sticky-cta">
        <Button
          size="lg"
          className="btn-block"
          icon={<Play size={18} />}
          onClick={() =>
            start({
              templateId: pick,
              daysPerWeek: +days,
              minutesPerDay: +minutes,
              baseline: { puzzleRating: puzzles.rating, botRating: estimateRating(games), rush: puzzles.rush.survival ?? 0 },
            })
          }
        >
          Start {t.title}
        </Button>
      </div>
    </div>
  );
}

export function ProgramTodayCard() {
  const program = useApp((s) => s.program);
  if (!program) return null;
  const t = getProgram(program.templateId);
  const day = currentDay(program);
  if (!t) return null;
  return (
    <div className="program-today">
      <div className="program-today-head">
        <div>
          <p className="today-date">{t.title}</p>
          <h2>{day ? `Week ${day.week}, day ${day.day}: ${day.title}` : 'Program complete'}</h2>
        </div>
        <button className="link-btn" onClick={() => navigate('/program')}>Full plan <ArrowRight size={14} /></button>
      </div>
      {day && <BlockList day={day} />}
    </div>
  );
}
