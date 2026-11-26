import { Check, ArrowRight } from 'lucide-react';
import { TRACKS, getTrack } from '../lib/plan';
import { useApp } from '../lib/store/app';
import { navigate } from '../lib/router';
import { Button, Header, Section } from '../components/ui';

const KIND: Record<string, string> = { lesson: 'Lesson', learn: 'Opening line', play: 'Practice game', drill: 'Drill', review: 'Review', analyse: 'Game review' };

export function PlanScreen() {
  const plan = useApp((s) => s.plan);
  const setPlan = useApp((s) => s.setPlan);
  const lessons = useApp((s) => s.lessons);
  const cards = useApp((s) => s.cards);
  const track = plan ? getTrack(plan.trackId) : undefined;

  const isDone = (stepId: string) => {
    if (plan?.done.includes(stepId)) return true;
    const [kind, a, b, c] = stepId.split(':');
    if (kind === 'lesson') return !!lessons[a]?.completed;
    if (kind === 'learn') return !!cards[`line:${a}:${b}:${c}`];
    return false;
  };

  return (
    <div className="page page-narrow">
      <Header title="Training plan" backTo="/train" sub="A track sets the order; the daily session mixes it with reviews and games." />
      {track && (
        <Section title={track.title} action={<button className="link-btn" onClick={() => setPlan(null)}>Leave plan</button>}>
          <p className="muted">{track.summary}</p>
          <ol className="plan-steps mt16">
            {track.steps.map((st, i) => {
              const done = isDone(st.id);
              return (
                <li key={st.id} className={`plan-step${done ? ' is-done' : ''}`}>
                  <span className="plan-step-num num">{done ? <Check size={16} /> : i + 1}</span>
                  <button className="plan-step-body" onClick={() => navigate(st.to)}>
                    <span className="plan-step-kind">{KIND[st.kind]} · {st.minutes} min</span>
                    <span className="plan-step-title">{st.title}</span>
                    <span className="plan-step-detail">{st.detail}</span>
                  </button>
                </li>
              );
            })}
          </ol>
        </Section>
      )}
      <Section title={track ? 'Other tracks' : 'Choose a track'}>
        <div className="stack">
          {TRACKS.filter((t) => t.id !== track?.id).map((t) => (
            <div key={t.id} className="panel track-card">
              <div className="track-card-head">
                <h3>{t.title}</h3>
                <span className="chip">{t.level}</span>
              </div>
              <p className="muted mt8">{t.summary}</p>
              <p className="faint small mt8">{t.steps.length} steps · {t.steps.reduce((a, s) => a + s.minutes, 0)} min total</p>
              <Button
                size="sm"
                className="mt12"
                icon={<ArrowRight size={16} />}
                onClick={() => setPlan({ trackId: t.id, startedAt: Date.now(), done: t.steps.filter((s) => isDone(s.id)).map((s) => s.id) })}
              >
                {track ? 'Switch to this track' : 'Start this track'}
              </Button>
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
}
