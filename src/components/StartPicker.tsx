import { useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { unitSpots } from '../lib/path/placement';
import type { LevelId } from '../lib/path/types';

const TONE: Record<string, string> = { basics: 'teal', beginner: 'blue', intermediate: 'violet', expert: 'gold' };

/** Pick the unit to start the path from: a suggested spot, nudged up or down. */
export function StartPicker({ value, suggested, onChange }: { value: string; suggested: string; onChange: (unitId: string, level: LevelId) => void }) {
  const spots = useMemo(() => unitSpots(), []);
  const i = Math.max(0, spots.findIndex((s) => s.unit.id === value));
  const s = spots[i];
  const sug = spots.findIndex((x) => x.unit.id === suggested);
  const go = (j: number) => {
    const t = spots[Math.max(0, Math.min(spots.length - 1, j))];
    onChange(t.unit.id, t.level.id);
  };
  return (
    <div className={`sp tone-${TONE[s.level.id]}`}>
      <div className="sp-main">
        <button className="sp-arrow" onClick={() => go(i - 1)} disabled={i === 0} aria-label="Easier">
          <ChevronLeft size={22} />
        </button>
        <div className="sp-card">
          <span className="sp-kicker">
            {s.level.title} · Unit {i + 1}
            {i === sug ? ' · suggested' : i < sug ? ' · easier' : ' · harder'}
          </span>
          <b>{s.unit.title}</b>
          <small>Pitched around {s.rating}</small>
        </div>
        <button className="sp-arrow" onClick={() => go(i + 1)} disabled={i === spots.length - 1} aria-label="Harder">
          <ChevronRight size={22} />
        </button>
      </div>
      <div className="sp-track" role="radiogroup" aria-label="Starting unit">
        {spots.map((x, j) => (
          <button
            key={x.unit.id}
            role="radio"
            aria-checked={j === i}
            aria-label={`${x.level.title}: ${x.unit.title}`}
            className={`sp-tick tone-${TONE[x.level.id]}${j === i ? ' is-on' : ''}${j === sug ? ' is-sug' : ''}${j < i ? ' is-past' : ''}`}
            onClick={() => go(j)}
          />
        ))}
      </div>
      <div className="sp-scale">
        <span>300</span>
        <span>1000</span>
        <span>2000</span>
      </div>
    </div>
  );
}
