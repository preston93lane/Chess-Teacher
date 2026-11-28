import { RepTrainPanel } from './RepTrainer';
import { useMemo, useState } from 'react';
import { BookOpen, Repeat, Swords, Plus, Check, ArrowRight, Database, Puzzle } from 'lucide-react';
import { getOpening, parseLine } from '../lib/openings/book';
import { useApp } from '../lib/store/app';
import { navigate } from '../lib/router';
import { dueLabel, strength } from '../lib/srs/scheduler';
import { Button, Header, Segmented } from '../components/ui';
import { MiniBoard } from '../components/MiniBoard';
import { STRUCTURES } from '../lib/coach/structure';
import { getLesson } from '../data/lessons';
import { formatLine, START_FEN, type Color } from '../lib/chess/core';
import { parseMovetext } from '../lib/chess/pgn';
import { OPENING_HISTORY } from '../data/openingHistory';
import { getClassic } from '../data/classics';

type Tab = 'lines' | 'ideas' | 'plans' | 'traps' | 'history';

export function OpeningDetail({ id }: { id: string }) {
  const opening = getOpening(id);
  const cards = useApp((s) => s.cards);
  const repertoire = useApp((s) => s.repertoire);
  const toggleRepertoire = useApp((s) => s.toggleRepertoire);
  const [side, setSide] = useState<Color>(repertoire[id]?.side ?? opening?.side ?? 'w');
  const [tab, setTab] = useState<Tab>('lines');
  const rootFen = useMemo(() => {
    if (!opening) return START_FEN;
    const first = parseLine(opening, opening.lines[0].id);
    const n = parseMovetext(opening.root).sans.length;
    return first.fens[Math.min(n, first.fens.length - 1)];
  }, [opening]);
  if (!opening) return <div className="page"><Header title="Opening not found" backTo="/openings" /></div>;
  const inRep = repertoire[id]?.side === side;
  const sideName = side === 'w' ? 'White' : 'Black';

  return (
    <div className="page">
      <Header title={opening.name} backTo="/openings" sub={`${opening.eco} · ${opening.root}`} />
      <div className="opening-hero">
        <MiniBoard fen={rootFen} orientation={side} className="opening-hero-board" />
        <div className="opening-hero-body">
          <p className="opening-tagline">{opening.tagline}</p>
          <div className="prose">
            {opening.summary.map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>
          <div className="row mt16">
            <Segmented
              value={side}
              onChange={setSide}
              label="Study as"
              options={[
                { value: 'w', label: 'Study as White' },
                { value: 'b', label: 'Study as Black' },
              ]}
            />
            <Button variant="ghost" size="sm" icon={<Database size={16} />} onClick={() => navigate(`/explorer?moves=${encodeURIComponent(opening.root)}`)}>
              Master games
            </Button>
            <Button variant="ghost" size="sm" icon={<Puzzle size={16} />} onClick={() => navigate(`/puzzles/play?mode=opening&id=${id}&side=${side}`)}>
              Tactics as {sideName}
            </Button>
            <Button
              variant={inRep ? 'secondary' : 'primary'}
              size="sm"
              icon={inRep ? <Check size={16} /> : <Plus size={16} />}
              onClick={() => toggleRepertoire(id, side)}
            >
              {inRep ? 'In your repertoire' : 'Add to repertoire'}
            </Button>
          </div>
          {side !== opening.side && (
            <p className="muted small mt8">
              This opening is written from {opening.side === 'w' ? 'White' : 'Black'}’s side, but you can drill {sideName}’s moves too — useful for knowing what to expect.
            </p>
          )}
        </div>
      </div>

      <div className="tabs mt24" role="tablist">
        {(['lines', 'ideas', 'plans', 'history', 'traps'] as Tab[]).filter((t) => t !== 'history' || OPENING_HISTORY[id]).map((t) => (
          <button key={t} role="tab" aria-selected={tab === t} className={`tab${tab === t ? ' is-on' : ''}`} onClick={() => setTab(t)}>
            {t === 'lines' ? `Lines (${opening.lines.length})` : t === 'ideas' ? 'Key ideas' : t === 'plans' ? 'Middlegame plans' : t === 'history' ? 'History' : `Traps (${opening.traps.length})`}
          </button>
        ))}
      </div>

      {tab === 'lines' && <RepTrainPanel opening={opening} side={side} />}
      {tab === 'lines' && (
        <div className="line-list">
          {opening.lines.map((l) => {
            const card = cards[`line:${id}:${l.id}:${side}`];
            const st = card ? strength(card.state) : 'new';
            const parsed = parseLine(opening, l.id);
            return (
              <div key={l.id} className="line-row">
                <div className="line-row-main">
                  <div className="line-row-head">
                    <h3>{l.name}</h3>
                    <span className={`chip strength-${st}`}>
                      {card ? (card.state.due <= Date.now() ? 'Due now' : `${labelFor(st)} · ${dueLabel(card.state)}`) : 'New'}
                    </span>
                  </div>
                  {l.about && <p className="muted">{l.about}</p>}
                  <p className="line-moves num">{formatLine(START_FEN, parsed.sans.slice(0, 14))}{parsed.sans.length > 14 ? ' …' : ''}</p>
                </div>
                <div className="line-row-actions">
                  <Button size="sm" variant={card ? 'secondary' : 'primary'} icon={<BookOpen size={16} />} onClick={() => navigate(`/openings/${id}/learn/${l.id}?side=${side}`)}>
                    Learn
                  </Button>
                  <Button size="sm" variant={card ? 'primary' : 'secondary'} icon={<Repeat size={16} />} onClick={() => navigate(`/openings/${id}/drill/${l.id}?side=${side}`)}>
                    Drill
                  </Button>
                  <Button size="sm" variant="ghost" icon={<Swords size={16} />} onClick={() => navigate(`/play?opening=${id}&line=${l.id}&side=${side}`)}>
                    Play it
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {tab === 'ideas' && (
        <div className="grid-2 mt8">
          <div className="panel">
            <h3>{opening.side === 'w' ? 'White' : 'Black'}’s ideas</h3>
            <ul className="bullets mt12">
              {opening.ideas.map((x) => (
                <li key={x}>{x}</li>
              ))}
            </ul>
          </div>
          <div className="panel">
            <h3>{opening.side === 'w' ? 'Black' : 'White'}’s ideas</h3>
            <ul className="bullets mt12">
              {opening.opponentIdeas.map((x) => (
                <li key={x}>{x}</li>
              ))}
            </ul>
          </div>
          {opening.structures.map((s) => {
            const info = STRUCTURES[s];
            return (
              <div key={s} className="panel">
                <h3>Structure: {info.name}</h3>
                <p className="muted mt8">{info.summary}</p>
                {info.lessonId && (
                  <button className="link-btn mt8" onClick={() => navigate(`/train/lesson/${info.lessonId}`)}>
                    Study the lesson <ArrowRight size={14} />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {tab === 'plans' && (
        <div className="stack mt8">
          {opening.plans.map((p) => (
            <div key={p.title} className="panel">
              <h3>{p.title}</h3>
              <p className="muted mt8">{p.text}</p>
            </div>
          ))}
          {opening.lessons?.length ? (
            <div className="panel">
              <h3>Related lessons</h3>
              <div className="chips mt12">
                {opening.lessons.map((lid) => {
                  const l = getLesson(lid);
                  return l ? (
                    <button key={lid} className="chip" onClick={() => navigate(`/train/lesson/${lid}`)}>
                      {l.title}
                    </button>
                  ) : null;
                })}
              </div>
            </div>
          ) : null}
        </div>
      )}

      {tab === 'history' && OPENING_HISTORY[id] && (
        <div className="history mt8">
          <div className="grid-2">
            <div className="panel">
              <h3>Named after</h3>
              <p className="mt8">{OPENING_HISTORY[id].namesake}</p>
              <p className="muted mt8">{OPENING_HISTORY[id].origin}</p>
            </div>
            <div className="panel">
              <h3>How its pioneers played it</h3>
              <p className="muted mt8">{OPENING_HISTORY[id].style}</p>
            </div>
          </div>
          <h3 className="mt24">How the theory evolved</h3>
          <ol className="timeline mt12">
            {OPENING_HISTORY[id].eras.map((e) => (
              <li key={e.when + e.title} className="timeline-item">
                <span className="timeline-when num">{e.when}</span>
                <span className="timeline-body">
                  <strong>{e.title}</strong>
                  <span className="muted">{e.text}</span>
                </span>
              </li>
            ))}
          </ol>
          {OPENING_HISTORY[id].modelGames.length > 0 && (
            <>
              <h3 className="mt24">Model games</h3>
              <div className="classic-strip mt12">
                {OPENING_HISTORY[id].modelGames.map((gid) => {
                  const g = getClassic(gid);
                  return g ? (
                    <button key={gid} className="classic-mini" onClick={() => navigate(`/classics/${gid}`)}>
                      <span className="classic-year num">{g.year}</span>
                      <span className="classic-title">{g.title}</span>
                      <span className="muted small">{g.white} – {g.black}</span>
                    </button>
                  ) : null;
                })}
              </div>
            </>
          )}
        </div>
      )}

      {tab === 'traps' && (
        <div className="stack mt8">
          {opening.traps.length === 0 && <p className="muted">No famous traps here — this opening is about understanding, not tricks.</p>}
          {opening.traps.map((t) => (
            <div key={t.name} className="panel">
              <h3>{t.name}</h3>
              <p className="line-moves num mt8">{t.pgn}</p>
              <p className="muted mt8">{t.text}</p>
              <button className="link-btn mt8" onClick={() => navigate(`/analysis?moves=${encodeURIComponent(t.pgn)}`)}>
                Play through on the analysis board <ArrowRight size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function labelFor(s: string) {
  return s === 'learning' ? 'Learning' : s === 'young' ? 'Reviewing' : s === 'mature' ? 'Mastered' : 'New';
}
