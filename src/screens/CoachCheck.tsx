import { useEffect, useMemo, useState } from 'react';
import { BookOpen, ChevronRight, Swords, Upload } from 'lucide-react';
import { useApp } from '../lib/store/app';
import { navigate } from '../lib/router';
import { runCheckIn, CONCEPT_LABEL, lessonFor, moveName, type CheckIn, type OpeningCheck } from '../lib/path/checkin';
import { findLesson } from '../data/path';
import { getOpening } from '../lib/openings/book';
import type { Concept } from '../lib/path/types';
import { RookieSays } from '../components/Mascot';
import { Button, Empty, Header, Section, Spinner } from '../components/ui';

export function CoachCheck() {
  const profile = useApp((s) => s.learn.profile);
  const done = useApp((s) => s.learn.done);
  const games = useApp((s) => s.games);
  const [data, setData] = useState<CheckIn | null>(null);

  useEffect(() => {
    if (!profile) return;
    let live = true;
    void runCheckIn(games, profile, done).then((d) => live && setData(d));
    return () => {
      live = false;
    };
  }, [games, profile, done]);

  if (!profile) {
    return (
      <div className="page page-narrow">
        <Header title="Coach check-in" backTo="/learn" />
        <Empty title="Take the personality quiz first" action={<Button onClick={() => navigate('/learn/start')}>Start the quiz</Button>}>
          I need to know your plan before I can compare your games with it.
        </Empty>
      </div>
    );
  }
  if (!data) return <div className="page page-narrow"><Header title="Coach check-in" backTo="/learn" /><Spinner label="Going through your games…" /></div>;
  if (!data.games) {
    return (
      <div className="page page-narrow">
        <Header title="Coach check-in" backTo="/learn" />
        <RookieSays mood="think">
          <p className="pl-text">No games yet! Play a bot or import your online games, and I’ll check whether you played your repertoire and used what you practised.</p>
        </RookieSays>
        <div className="row" style={{ gap: 8, marginTop: 16, flexWrap: 'wrap' }}>
          <Button icon={<Swords size={16} />} onClick={() => navigate('/play')}>Play a game</Button>
          <Button variant="secondary" icon={<Upload size={16} />} onClick={() => navigate('/import')}>Import games</Button>
        </div>
      </div>
    );
  }
  return <Report data={data} />;
}

function Report({ data }: { data: CheckIn }) {
  const profile = useApp((s) => s.learn.profile)!;
  const covered = data.openings.filter((o) => o.status !== 'uncovered');
  const followed = covered.filter((o) => o.status === 'followed' || o.status === 'they-left');
  const youLeft = covered.filter((o) => o.status === 'you-left');
  const theyLeft = covered.filter((o) => o.status === 'they-left');
  const uncovered = data.openings.filter((o) => o.status === 'uncovered');
  const avgDepth = covered.length ? Math.round(covered.reduce((a, o) => a + o.depth, 0) / covered.length / 2) : 0;

  const byConcept = useMemo(() => {
    const m = new Map<Concept, { missed: number; allowed: number }>();
    for (const t of data.tactics) {
      const e = m.get(t.concept) ?? { missed: 0, allowed: 0 };
      e[t.kind]++;
      m.set(t.concept, e);
    }
    return [...m.entries()].sort((a, b) => b[1].missed + b[1].allowed - (a[1].missed + a[1].allowed));
  }, [data.tactics]);

  const headline = (() => {
    const parts: string[] = [];
    if (covered.length) parts.push(`You stayed in your repertoire in ${followed.length} of ${covered.length} games${avgDepth ? `, about ${avgDepth} moves deep on average` : ''}.`);
    if (youLeft.length) parts.push(`You left it yourself ${youLeft.length} time${youLeft.length === 1 ? '' : 's'} — let’s fix those lines.`);
    if (byConcept.length) {
      const [c, n] = byConcept[0];
      parts.push(`The tactic that cost you most: ${CONCEPT_LABEL[c].toLowerCase()} (${n.missed + n.allowed}×).`);
    } else if (data.reviewed) parts.push('No missed forks, pins or loose pieces in your reviewed games — nice.');
    if (data.unreviewed) parts.push(`${data.unreviewed} game${data.unreviewed === 1 ? ' isn’t' : 's aren’t'} reviewed yet, so I can’t check tactics there.`);
    return parts.join(' ');
  })();

  return (
    <div className="page page-narrow coach-check">
      <Header title="Coach check-in" backTo="/learn" sub={`Your last ${data.games} game${data.games === 1 ? '' : 's'} against your plan`} />
      <RookieSays mood={youLeft.length || byConcept.length ? 'think' : 'cheer'}>
        <p className="pl-text">{headline}</p>
      </RookieSays>

      <Section title="Opening plan">
        <div className="cc-tiles">
          <Tile label="Followed" value={`${followed.length}/${covered.length || 0}`} tone="good" />
          <Tile label="You left it" value={youLeft.length} tone={youLeft.length ? 'bad' : 'good'} />
          <Tile label="They left it" value={theyLeft.length} tone="info" />
        </div>
        <ul className="cc-list">
          {[...youLeft, ...theyLeft, ...covered.filter((o) => o.status === 'followed')].map((o) => (
            <OpeningRow key={o.gameId} o={o} />
          ))}
          {uncovered.map((o) => (
            <li key={o.gameId} className="cc-row">
              <span className="cc-chip is-muted">Not in plan</span>
              <div className="cc-main">
                <b>vs {o.opponent}</b>
                <span>They opened 1.{o.played} — your plan covers 1.e4 and 1.d4.</span>
              </div>
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Tactics: practice vs games">
        {!data.reviewed ? (
          <p className="muted">Review your games (Games → open a game → Review) and I’ll match the tactics you missed with your lessons.</p>
        ) : !byConcept.length ? (
          <p className="muted">No missed or allowed forks, pins, skewers, discoveries, mates or loose pieces in {data.reviewed} reviewed game{data.reviewed === 1 ? '' : 's'}.</p>
        ) : (
          <ul className="cc-concepts">
            {byConcept.map(([c, n]) => {
              const studied = data.studied[c] ?? 0;
              const lid = lessonFor(c);
              const lesson = lid ? findLesson(lid)?.lesson : undefined;
              const notes = data.tactics.filter((t) => t.concept === c).slice(0, 4);
              return (
                <li key={c} className="cc-concept">
                  <div className="cc-concept-head">
                    <div>
                      <b>{CONCEPT_LABEL[c]}</b>
                      <span>
                        {n.missed ? `missed ${n.missed}×` : ''}
                        {n.missed && n.allowed ? ' · ' : ''}
                        {n.allowed ? `allowed ${n.allowed}×` : ''} · {studied ? `${studied} lesson${studied === 1 ? '' : 's'} done` : 'not studied yet'}
                      </span>
                    </div>
                    {lesson && (
                      <Button size="sm" variant={studied ? 'secondary' : 'primary'} onClick={() => navigate(`/learn/lesson/${lid}`)}>
                        {studied ? 'Review' : 'Learn it'}
                      </Button>
                    )}
                  </div>
                  <ul className="cc-notes">
                    {notes.map((t, i) => (
                      <li key={i}>
                        <button onClick={() => navigate(`/games/${t.gameId}?ply=${t.ply}`)}>
                          <span>
                            {t.kind === 'missed' ? (
                              <>
                                vs {t.opponent}: you played <b>{moveName(t.ply, t.played)}</b>, but <b>{t.move}</b> was there — {t.text.toLowerCase()}
                              </>
                            ) : (
                              <>
                                vs {t.opponent}: after <b>{moveName(t.ply, t.played)}</b> they had <b>{t.move}</b> — {t.text.toLowerCase()}
                              </>
                            )}
                          </span>
                          <ChevronRight size={16} />
                        </button>
                      </li>
                    ))}
                  </ul>
                </li>
              );
            })}
          </ul>
        )}
        {data.unreviewed > 0 && (
          <Button variant="secondary" onClick={() => navigate('/games')}>
            Review {data.unreviewed} more game{data.unreviewed === 1 ? '' : 's'}
          </Button>
        )}
      </Section>

      <Section title="Your repertoire">
        <div className="cc-reps">
          {(['white', 'vsE4', 'vsD4'] as const).map((slot) => {
            const o = getOpening(profile[slot]);
            if (!o) return null;
            return (
              <button key={slot} className="cc-rep" onClick={() => navigate(`/reptrain/${o.id}/tree?side=${o.side}&only=learned`)}>
                <BookOpen size={18} />
                <span>
                  <small>{slot === 'white' ? 'As White' : slot === 'vsE4' ? 'vs 1.e4' : 'vs 1.d4'}</small>
                  <b>{o.name}</b>
                </span>
                <ChevronRight size={16} />
              </button>
            );
          })}
        </div>
      </Section>
    </div>
  );
}

function Tile({ label, value, tone }: { label: string; value: string | number; tone: 'good' | 'bad' | 'info' }) {
  return (
    <div className={`cc-tile is-${tone}`}>
      <b>{value}</b>
      <span>{label}</span>
    </div>
  );
}

function OpeningRow({ o }: { o: OpeningCheck }) {
  const name = o.openingId ? getOpening(o.openingId)?.name ?? o.openingId : '';
  const chip = o.status === 'you-left' ? <span className="cc-chip is-bad">You left</span> : o.status === 'they-left' ? <span className="cc-chip is-info">They left</span> : <span className="cc-chip is-good">Followed</span>;
  return (
    <li className="cc-row">
      {chip}
      <div className="cc-main">
        <b>
          {name} vs {o.opponent} <small className={`cc-res is-${o.result}`}>{o.result === '?' ? '' : o.result}</small>
        </b>
        {o.status === 'you-left' && o.ply !== undefined && (
          <span>
            Move {Math.floor(o.ply / 2) + 1}: you played <b>{o.played}</b>; your repertoire plays <b>{o.expected?.join(' or ')}</b>.
          </span>
        )}
        {o.status === 'they-left' && o.ply !== undefined && (
          <span>
            They played <b>{moveName(o.ply, o.played!)}</b>, which your repertoire doesn’t cover yet.
          </span>
        )}
        {o.status === 'followed' && <span>{o.depth >= 2 ? `In book for ${Math.ceil(o.depth / 2)} moves` : 'Repertoire move order'}</span>}
      </div>
      <div className="cc-actions">
        {o.status === 'you-left' && o.openingId && (
          <Button size="sm" onClick={() => navigate(`/reptrain/${o.openingId}/tree?side=${o.color}`)}>
            Drill
          </Button>
        )}
        {o.openingId && (
          <Button size="sm" variant="ghost" onClick={() => navigate(`/puzzles/play?mode=opening&id=${o.openingId}&side=${o.color}`)}>
            Tactics
          </Button>
        )}
        <Button size="sm" variant="ghost" onClick={() => navigate(`/games/${o.gameId}?ply=${(o.ply ?? o.depth) || 0}`)}>
          Game
        </Button>
      </div>
    </li>
  );
}
