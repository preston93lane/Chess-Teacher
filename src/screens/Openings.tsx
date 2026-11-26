import { useMemo, useState } from 'react';
import { OPENINGS } from '../data/openings';
import { useApp } from '../lib/store/app';
import { navigate } from '../lib/router';
import { Header, Segmented } from '../components/ui';
import { MiniBoard } from '../components/MiniBoard';
import { parseMovetext } from '../lib/chess/pgn';
import { Chess } from '../lib/chess/core';

type Filter = 'all' | 'w' | 'b' | 'mine';

export function Openings() {
  const cards = useApp((s) => s.cards);
  const repertoire = useApp((s) => s.repertoire);
  const [filter, setFilter] = useState<Filter>('all');
  const list = OPENINGS.filter((o) =>
    filter === 'all' ? true : filter === 'mine' ? !!repertoire[o.id] : o.side === filter,
  );
  const families = ['1.e4', '1.d4', 'Flank'] as const;

  return (
    <div className="page">
      <Header
        title="Openings"
        sub="Theory, ideas and plans. Learn a line, then drill it until it sticks."
        actions={
          <div className="row">
            <button className="btn btn-secondary btn-sm" onClick={() => navigate('/repertoire')}>
              <span>My repertoires</span>
            </button>
            <button className="btn btn-secondary btn-sm" onClick={() => navigate('/explorer')}>
              <span>Master explorer</span>
            </button>
            <button className="btn btn-primary btn-sm" onClick={() => navigate('/openings/quiz')}>
              <span>Opening quiz</span>
            </button>
          </div>
        }
      />
      <Segmented
        value={filter}
        onChange={setFilter}
        label="Filter"
        options={[
          { value: 'all', label: 'All' },
          { value: 'w', label: 'As White' },
          { value: 'b', label: 'As Black' },
          { value: 'mine', label: 'My repertoire' },
        ]}
      />
      {list.length === 0 && <p className="muted mt16">Nothing here yet. Open an opening and add it to your repertoire.</p>}
      {families.map((fam) => {
        const items = list.filter((o) => o.family === fam);
        if (!items.length) return null;
        return (
          <section key={fam} className="section">
            <div className="section-head">
              <h2>{fam === 'Flank' ? 'Flank openings' : `${fam} openings`}</h2>
            </div>
            <div className="opening-grid">
              {items.map((o) => {
                const learned = o.lines.filter((l) => cards[`line:${o.id}:${l.id}:w`] || cards[`line:${o.id}:${l.id}:b`]).length;
                return (
                  <button key={o.id} className="opening-card" onClick={() => navigate(`/openings/${o.id}`)}>
                    <OpeningThumb root={o.root} side={o.side} />
                    <span className="opening-card-body">
                      <span className="opening-card-meta">
                        <span className={`pill-color pill-${o.side}`} />
                        {o.side === 'w' ? 'White' : 'Black'} · {o.eco} · {o.level}
                      </span>
                      <span className="opening-card-name">{o.name}</span>
                      <span className="opening-card-tag">{o.tagline}</span>
                      <span className="opening-card-progress">
                        <span className="meter"><span className="meter-fill" style={{ width: `${(learned / o.lines.length) * 100}%` }} /></span>
                        <span className="num">{learned}/{o.lines.length} lines</span>
                        {repertoire[o.id] && <span className="chip chip-on">Repertoire</span>}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function OpeningThumb({ root, side }: { root: string; side: 'w' | 'b' }) {
  const fen = useMemo(() => {
    const c = new Chess();
    for (const m of parseMovetext(root).sans) c.move(m.san);
    return c.fen();
  }, [root]);
  return <MiniBoard fen={fen} orientation={side} className="opening-thumb" />;
}
