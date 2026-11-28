import { useEffect, useMemo, useRef, useState } from 'react';
import { BookOpen, Check, Crown, Flame, Star, Target, Zap, ClipboardCheck, Sparkles, ChevronRight, Flag, Swords } from 'lucide-react';
import { useApp, streak, today } from '../lib/store/app';
import { navigate } from '../lib/router';
import { buildPath, pathStatus, startUnitIndex, LEVEL_ORDER, type NodeStatus, type PathNode } from '../lib/path/plan';
import { FOCUS_INFO, STYLE_PORTRAIT } from '../lib/path/profile';
import { getOpening } from '../lib/openings/book';
import { Rookie } from '../components/Mascot';
import { Button, Sheet } from '../components/ui';
import { StartPicker } from '../components/StartPicker';
import { startUnitFor } from '../lib/path/placement';

const OFFSETS = [0, 44, 70, 44, 0, -44, -70, -44];

const LEVEL_TONE: Record<string, string> = {
  basics: 'teal',
  beginner: 'blue',
  intermediate: 'violet',
  expert: 'gold',
};

export function LearnScreen() {
  const learn = useApp((s) => s.learn);
  const activity = useApp((s) => s.activity);
  const profile = learn.profile;
  const units = useMemo(() => buildPath(profile), [profile]);
  const { current, status, nodes, start } = useMemo(() => pathStatus(units, learn.done, profile), [units, learn.done, profile]);
  const startUnit = startUnitIndex(units, profile);
  const [open, setOpen] = useState<string | null>(null);
  const currentRef = useRef<HTMLDivElement | null>(null);
  const days = streak(activity);
  const todayXp = learn.daily[today()] ?? 0;
  const goal = profile?.goal ?? 30;
  const doneCount = nodes.filter((n) => learn.done[n.lesson.id]).length;

  useEffect(() => {
    const t = setTimeout(() => currentRef.current?.scrollIntoView({ block: 'center', behavior: 'smooth' }), 250);
    return () => clearTimeout(t);
  }, []);

  let lastLevel = '';
  let unitNo = 0;
  return (
    <div className="page learn">
      <div className="learn-stats">
        <span className={`learn-stat is-streak${days > 0 ? ' is-on' : ''}`} title="Day streak">
          <Flame size={20} fill={days > 0 ? 'currentColor' : 'none'} />
          {days}
        </span>
        <span className="learn-stat is-xp" title="Total XP">
          <Zap size={20} fill="currentColor" />
          {learn.xp} XP
        </span>
        <GoalRing value={todayXp} goal={goal} />
      </div>

      {!profile ? (
        <div className="learn-hero">
          <Rookie mood="wave" size={92} />
          <div>
            <h1>Hi, I’m Rookie!</h1>
            <p>I’ll take you from your first moves to 2000 — one short lesson at a time. Tell me how you play and I’ll build your plan and your own opening repertoire.</p>
            <div className="row" style={{ flexWrap: 'wrap', gap: 8 }}>
              <Button size="lg" icon={<Sparkles size={18} />} onClick={() => navigate('/learn/start')}>
                Find my chess personality
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <ProfileCard />
      )}

      <div className="learn-path">
        {units.map((pu, ui) => {
          const showLevel = pu.level.id !== lastLevel;
          lastLevel = pu.level.id;
          unitNo++;
          const tone = LEVEL_TONE[pu.level.id];
          const unitDone = pu.nodes.every((n) => learn.done[n.lesson.id]);
          const focused = profile && FOCUS_INFO[profile.focus].units.includes(pu.unit.id);
          return (
            <section key={pu.unit.id} className={`learn-unit tone-${tone}`}>
              {showLevel && (
                <div className="learn-level">
                  <span className="learn-level-range">
                    {pu.level.range[0]}–{pu.level.range[1]}
                  </span>
                  <h2>{pu.level.title}</h2>
                  <p>{pu.level.pitch}</p>
                </div>
              )}
              <div className="learn-unit-head">
                <div>
                  <span className="learn-unit-kicker">
                    Unit {unitNo}
                    {profile && ui === startUnit ? ' · your starting point' : ''}
                    {focused ? ' · your focus' : ''}
                  </span>
                  <h3>{pu.unit.title}</h3>
                  <p>{pu.unit.about}</p>
                </div>
                {unitDone && <Crown size={28} className="learn-unit-crown" />}
              </div>
              <div className="learn-nodes">
                {pu.nodes.map((n, i) => {
                  const st = status(n);
                  const isCurrent = current?.lesson.id === n.lesson.id;
                  return (
                    <div
                      key={n.lesson.id}
                      className={`learn-node-wrap${open === n.lesson.id ? ' is-open' : ''}${profile && n.index < start && st !== 'done' ? ' is-before' : ''}`}
                      style={{ transform: `translateX(${OFFSETS[i % OFFSETS.length]}px)` }}
                      ref={isCurrent ? currentRef : undefined}
                    >
                      {isCurrent && (
                        <div className="learn-start-tag">
                          {doneCount === 0 ? 'Start' : 'Next'}
                        </div>
                      )}
                      <NodeButton node={n} status={st} stars={learn.done[n.lesson.id]?.stars ?? 0} onClick={() => setOpen(open === n.lesson.id ? null : n.lesson.id)} />
                      {isCurrent && <Rookie mood="happy" size={46} className={`learn-node-rookie${OFFSETS[i % OFFSETS.length] > 0 ? ' is-left' : ''}`} crown={pu.level.id === 'expert'} />}
                      {open === n.lesson.id && <NodeCard node={n} status={st} offset={OFFSETS[i % OFFSETS.length]} onClose={() => setOpen(null)} />}
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })}
        <div className="learn-finish">
          <Rookie mood="cheer" size={96} crown />
          <h3>From rookie to master</h3>
          <p>Finish every unit to complete the path.</p>
        </div>
      </div>
    </div>
  );
}

function GoalRing({ value, goal }: { value: number; goal: number }) {
  const pct = Math.min(1, value / goal);
  const r = 15;
  const c = 2 * Math.PI * r;
  return (
    <span className={`learn-goal${pct >= 1 ? ' is-met' : ''}`} title={`Daily goal: ${value} of ${goal} XP`}>
      <svg width="36" height="36" viewBox="0 0 36 36" aria-hidden>
        <circle cx="18" cy="18" r={r} className="learn-goal-track" />
        <circle cx="18" cy="18" r={r} className="learn-goal-fill" strokeDasharray={`${c * pct} ${c}`} transform="rotate(-90 18 18)" />
      </svg>
      <span>
        {Math.min(value, goal)}/{goal}
      </span>
    </span>
  );
}

function NodeButton({ node, status, stars, onClick }: { node: PathNode; status: NodeStatus; stars: number; onClick: () => void }) {
  const kind = node.lesson.kind ?? 'lesson';
  const Icon = status === 'done' && kind !== 'review' ? Check : kind === 'review' ? Crown : kind === 'repertoire' ? BookOpen : Star;
  return (
    <button className={`learn-node is-${status} kind-${kind}`} onClick={onClick} aria-label={`${node.lesson.title} — ${status}`}>
      <span className="learn-node-face">
        <Icon size={30} strokeWidth={2.6} fill={Icon === Star || Icon === Crown ? 'currentColor' : 'none'} />
      </span>
      {status === 'done' && (
        <span className="learn-node-stars" aria-hidden>
          {[1, 2, 3].map((s) => (
            <Star key={s} size={11} fill={s <= stars ? 'currentColor' : 'none'} className={s <= stars ? 'is-on' : ''} />
          ))}
        </span>
      )}
    </button>
  );
}

function NodeCard({ node, status, offset, onClose }: { node: PathNode; status: NodeStatus; offset: number; onClose: () => void }) {
  const ref = useRef<HTMLDivElement | null>(null);
  const kind = node.lesson.kind ?? 'lesson';
  const steps = node.lesson.steps.length;
  const xp = kind === 'review' ? 20 : 10;
  useEffect(() => {
    const h = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', h);
    ref.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);
  return (
    <div ref={ref} className={`learn-card is-${status}`} role="dialog" aria-label={node.lesson.title} style={{ transform: `translateX(calc(-50% - ${offset}px))`, ['--tip' as string]: `${offset}px` }}>
      <span className="learn-card-kicker">{kind === 'review' ? 'Unit test' : kind === 'repertoire' ? 'Your repertoire' : node.unit.title}</span>
      <h4>{node.lesson.title}</h4>
      <p>{node.lesson.blurb}</p>
      <Button size="lg" onClick={() => navigate(`/learn/lesson/${node.lesson.id}`)} className="learn-card-btn">
        {status === 'done' ? `Practise again · +${xp} XP` : `Start · +${xp} XP`}
      </Button>
      <span className="learn-card-meta">
        {node.level.title} · {steps} steps
      </span>
    </div>
  );
}

function ProfileCard() {
  const profile = useApp((s) => s.learn.profile)!;
  const setProfile = useApp((s) => s.setLearnProfile);
  const [picking, setPicking] = useState(false);
  const suggested = startUnitFor(profile.placement?.elo ?? profile.rating).unit.id;
  const games = useApp((s) => s.games.filter((g) => g.myColor).length);
  const p = STYLE_PORTRAIT[profile.style];
  const names = [profile.white, profile.vsE4, profile.vsD4].map((id) => getOpening(id)?.name ?? id);
  return (
    <div className="learn-profile">
      <div className="learn-profile-top">
        <Rookie mood="happy" size={56} crown={profile.level === 'expert'} />
        <div className="learn-profile-main">
          <span className="learn-profile-kicker">Your chess personality</span>
          <h2>{p.name}</h2>
          <p>
            {profile.placement ? `Placement rating ~${profile.placement.elo}` : `Started at ${LEVEL_ORDER.indexOf(profile.level) >= 0 ? profile.level[0].toUpperCase() + profile.level.slice(1) : ''}`} · Focus: {FOCUS_INFO[profile.focus].label.toLowerCase()}
          </p>
        </div>
      </div>
      <div className="learn-rep">
        {names.map((n, i) => (
          <span key={i} className="learn-rep-chip">
            <span>{['White', 'vs 1.e4', 'vs 1.d4'][i]}</span>
            {n}
          </span>
        ))}
      </div>
      <div className="learn-profile-actions">
        <button className="learn-coach-btn" onClick={() => navigate('/learn/coach')}>
          <ClipboardCheck size={20} />
          <span>
            <b>Coach check-in</b>
            <small>{games ? `Compare your ${games} game${games === 1 ? '' : 's'} with your plan` : 'Play or import games to compare them with your plan'}</small>
          </span>
          <ChevronRight size={18} />
        </button>
        <div className="learn-links">
          <button className="learn-link" onClick={() => setPicking(true)}>
            <Flag size={14} /> Starting point
          </button>
          <button className="learn-link" onClick={() => navigate('/learn/placement')}>
            <Swords size={14} /> {profile.placement ? 'Replay placement game' : 'Placement game'}
          </button>
          <button className="learn-link" onClick={() => navigate('/learn/start')}>
            <Target size={14} /> Retake the quiz
          </button>
        </div>
      </div>
      {picking && (
        <Sheet open onClose={() => setPicking(false)} title="Where to start">
          <StartPicker
            value={profile.startUnit ?? suggested}
            suggested={suggested}
            onChange={(unitId, level) => setProfile({ ...profile, startUnit: unitId, level })}
          />
          <p className="ls-note">Every lesson stays open — this only moves your “Next” marker and where your repertoire lessons begin.</p>
          <Button size="lg" onClick={() => setPicking(false)} style={{ width: '100%' }}>
            Done
          </Button>
        </Sheet>
      )}
    </div>
  );
}

/** “Continue your path” card for the Today screen. */
export function LearnTodayCard() {
  const learn = useApp((s) => s.learn);
  const units = useMemo(() => buildPath(learn.profile), [learn.profile]);
  const { current } = useMemo(() => pathStatus(units, learn.done, learn.profile), [units, learn.done, learn.profile]);
  const todayXp = learn.daily[today()] ?? 0;
  const goal = learn.profile?.goal ?? 30;
  if (!current) return null;
  return (
    <button className="learn-today" onClick={() => navigate(learn.profile ? `/learn/lesson/${current.lesson.id}` : '/learn')}>
      <Rookie mood={todayXp >= goal ? 'cheer' : 'wave'} size={48} crown={current.level.id === 'expert'} />
      <span className="learn-today-main">
        <small>{learn.profile ? `Your path · ${current.level.title} · ${current.unit.title}` : 'New: the Learn path'}</small>
        <b>{learn.profile ? current.lesson.title : 'Meet Rookie and find your chess personality'}</b>
        <span>{learn.profile ? `${Math.min(todayXp, goal)}/${goal} XP today` : 'Lessons from 300 to 2000, built around how you play'}</span>
      </span>
      <ChevronRight size={20} />
    </button>
  );
}
