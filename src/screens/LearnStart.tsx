import { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronLeft, X } from 'lucide-react';
import { useApp } from '../lib/store/app';
import { navigate } from '../lib/router';
import { QUIZ, FOCUS_INFO, SLOT_CHOICES, STYLE_PORTRAIT, scoreQuiz, type PlayerProfile } from '../lib/path/profile';
import { getLevel } from '../data/path';
import { diagramPosition } from '../lib/path/run';
import { getOpening } from '../lib/openings/book';
import { Board } from '../components/Board';
import { Pip, PipSays } from '../components/Mascot';
import { Button, Sheet } from '../components/ui';

type Slot = 'white' | 'vsE4' | 'vsD4';
const SLOT_LABEL: Record<Slot, string> = { white: 'As White', vsE4: 'Against 1.e4', vsD4: 'Against 1.d4' };

function Foot({ children }: { children: React.ReactNode }) {
  return createPortal(
    <div className="pl-foot is-info">
      <div className="pl-foot-inner">
        <div className="pl-foot-actions">{children}</div>
      </div>
    </div>,
    document.body,
  );
}

export function LearnStart() {
  const setProfile = useApp((s) => s.setLearnProfile);
  const [step, setStep] = useState(-1);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [draft, setDraft] = useState<PlayerProfile | null>(null);
  const [pickSlot, setPickSlot] = useState<Slot | null>(null);

  const q = step >= 0 && step < QUIZ.length ? QUIZ[step] : null;
  const progress = step < 0 ? 0 : Math.min(1, step / QUIZ.length);

  const answer = (i: number) => {
    const next = { ...answers, [q!.id]: i };
    setAnswers(next);
    if (step + 1 >= QUIZ.length) {
      setDraft({ ...scoreQuiz(next), createdAt: Date.now() });
      setStep(QUIZ.length);
    } else setStep(step + 1);
  };

  return (
    <div className="pl learn-start">
      <div className="pl-top">
        {step > 0 && step <= QUIZ.length ? (
          <button className="pl-close" aria-label="Back" onClick={() => setStep(step - 1)}>
            <ChevronLeft size={24} />
          </button>
        ) : (
          <button className="pl-close" aria-label="Close" onClick={() => navigate('/learn')}>
            <X size={24} />
          </button>
        )}
        <div className="pl-progress">
          <span style={{ width: `${Math.max(4, progress * 100)}%` }} />
        </div>
      </div>
      <div className="pl-body">
        {step < 0 && (
          <>
            <div className="ls-intro">
              <Pip mood="wave" size={130} />
              <h1>Let’s build your plan</h1>
              <p>Eight quick questions. I’ll work out your chess personality, where to start, and an opening repertoire that suits you — then teach it to you a little at a time.</p>
            </div>
            <Foot>
              <Button size="lg" className="pl-foot-btn" onClick={() => setStep(0)}>
                Let’s go
              </Button>
            </Foot>
          </>
        )}
        {q && <QuestionView key={q.id} q={q} picked={answers[q.id]} onPick={answer} />}
        {step >= QUIZ.length && draft && (
          <Reveal
            draft={draft}
            onChange={(slot) => setPickSlot(slot)}
            onStart={() => {
              setProfile(draft);
              navigate('/learn');
            }}
          />
        )}
      </div>
      {pickSlot && draft && (
        <Sheet open onClose={() => setPickSlot(null)} title={SLOT_LABEL[pickSlot]}>
          <div className="ls-picks">
            {SLOT_CHOICES[pickSlot].map((id) => {
              const o = getOpening(id);
              if (!o) return null;
              return (
                <button
                  key={id}
                  className={`ls-pick${draft[pickSlot] === id ? ' is-on' : ''}`}
                  onClick={() => {
                    setDraft({ ...draft, [pickSlot]: id });
                    setPickSlot(null);
                  }}
                >
                  <b>{o.name}</b>
                  <span>{o.tagline}</span>
                  <small>{o.level}</small>
                </button>
              );
            })}
          </div>
        </Sheet>
      )}
    </div>
  );
}

function QuestionView({ q, picked, onPick }: { q: (typeof QUIZ)[number]; picked?: number; onPick: (i: number) => void }) {
  const pos = useMemo(() => (q.pgn || q.fen ? diagramPosition({ fen: q.fen, pgn: q.pgn }) : null), [q]);
  return (
    <>
      <PipSays mood="think">
        <p className="pl-text">{q.ask}</p>
      </PipSays>
      {pos && (
        <div className="pl-board ls-board">
          <Board fen={pos.fen} orientation={q.orientation ?? 'w'} movable={null} lastMove={pos.last} />
        </div>
      )}
      <div className="pl-options">
        {q.options.map((o, i) => (
          <button key={i} className={`pl-option${picked === i ? ' is-picked' : ''}`} onClick={() => onPick(i)}>
            <span className="pl-option-key">{String.fromCharCode(65 + i)}</span>
            <span className="pl-option-body">
              {o.label}
              {o.sub && <small>{o.sub}</small>}
            </span>
          </button>
        ))}
      </div>
    </>
  );
}

function Reveal({ draft, onChange, onStart }: { draft: PlayerProfile; onChange: (s: Slot) => void; onStart: () => void }) {
  const p = STYLE_PORTRAIT[draft.style];
  const level = getLevel(draft.level);
  return (
    <>
      <div className="ls-reveal">
        <Pip mood="cheer" size={110} className="pip-celebrate" />
        <span className="ls-kicker">Your chess personality</span>
        <h1>{p.name}</h1>
        <p className="ls-line">{p.line}</p>
        <div className="ls-traits">
          <div>
            <span>Strengths</span>
            <p>{p.strengths}</p>
          </div>
          <div>
            <span>Watch out for</span>
            <p>{p.watch}</p>
          </div>
        </div>
      </div>
      <div className="ls-plan">
        <h2>Your plan</h2>
        <div className="ls-plan-row">
          <span>Start at</span>
          <b>
            {level.title} <small>({level.range[0]}–{level.range[1]})</small>
          </b>
        </div>
        <div className="ls-plan-row">
          <span>Focus</span>
          <b>{FOCUS_INFO[draft.focus].label}</b>
        </div>
        <div className="ls-plan-row">
          <span>Daily goal</span>
          <b>{draft.goal} XP</b>
        </div>
        <h2>Your repertoire</h2>
        <p className="ls-note">Chosen for your style and level. I’ll teach it one line at a time between your lessons, then quiz you on it with spaced repetition.</p>
        {(['white', 'vsE4', 'vsD4'] as Slot[]).map((slot) => {
          const o = getOpening(draft[slot]);
          return (
            <button key={slot} className="ls-slot" onClick={() => onChange(slot)}>
              <span className="ls-slot-label">{SLOT_LABEL[slot]}</span>
              <b>{o?.name ?? draft[slot]}</b>
              <span className="ls-slot-tag">{o?.tagline}</span>
              <span className="ls-slot-change">Change</span>
            </button>
          );
        })}
      </div>
      <Foot>
        <Button size="lg" className="pl-foot-btn" onClick={onStart}>
          Start my path
        </Button>
      </Foot>
    </>
  );
}
