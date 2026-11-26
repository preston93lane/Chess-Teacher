import { useEffect, useRef } from 'react';
import { CLASS_INFO, type MoveClass } from '../lib/coach/explain';

export interface MoveListItem {
  san: string;
  cls?: MoveClass;
}

/** Book-style inline notation. `current` = number of plies played (0 = start). */
export function MoveList({
  moves,
  current,
  onSelect,
  startMoveNumber = 1,
  startColor = 'w',
  compact,
}: {
  moves: MoveListItem[];
  current: number;
  onSelect: (ply: number) => void;
  startMoveNumber?: number;
  startColor?: 'w' | 'b';
  compact?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current?.querySelector('.mv.is-current') as HTMLElement | null;
    if (el && ref.current) {
      const box = ref.current;
      const top = el.offsetTop - box.offsetTop;
      if (top < box.scrollTop || top > box.scrollTop + box.clientHeight - 30) box.scrollTop = top - 40;
      const left = el.offsetLeft - box.offsetLeft;
      if (compact) box.scrollLeft = left - box.clientWidth / 2;
    }
  }, [current, compact]);

  const items: React.ReactNode[] = [];
  let num = startMoveNumber;
  let color = startColor;
  moves.forEach((m, i) => {
    if (color === 'w') items.push(<span key={`n${i}`} className="mv-num">{num}.</span>);
    else if (i === 0) items.push(<span key={`n${i}`} className="mv-num">{num}…</span>);
    const info = m.cls ? CLASS_INFO[m.cls] : null;
    const showGlyph = m.cls && !['best', 'excellent', 'good', 'book'].includes(m.cls);
    items.push(
      <button
        key={i}
        className={`mv${i + 1 === current ? ' is-current' : ''}${info ? ` tone-text-${info.tone}` : ''}`}
        onClick={() => onSelect(i + 1)}
      >
        {m.san}
        {showGlyph && info && <sup className="mv-glyph">{info.glyph}</sup>}
      </button>,
    );
    if (color === 'b') num++;
    color = color === 'w' ? 'b' : 'w';
  });
  return (
    <div className={`movelist${compact ? ' movelist-compact' : ''}`} ref={ref}>
      {moves.length ? items : <span className="movelist-empty">No moves yet</span>}
    </div>
  );
}
