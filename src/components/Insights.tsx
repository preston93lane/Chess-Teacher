import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Compass, Sparkles } from 'lucide-react';
import type { Color } from '../lib/chess/core';
import { engine, CancelledError, type EngineLine } from '../lib/engine/stockfish';
import { engineInsights, mergeInsights, staticInsights, type Insight, type InsightKind } from '../lib/coach/insights';
import { nullMoveFen } from '../lib/coach/explain';
import type { Mark } from './Board';
import { Spinner } from './ui';

const KIND_META: Record<InsightKind, { label: string; icon: typeof AlertTriangle }> = {
  danger: { label: 'Watch out', icon: AlertTriangle },
  opportunity: { label: 'Opportunity', icon: Sparkles },
  plan: { label: 'Plan', icon: Compass },
};

/**
 * "What matters here" — themes for one side, never the move itself.
 * With `deep`, the engine adds threats, hidden tactics and critical moments.
 */
export function InsightsPanel({
  fen,
  forColor,
  deep = false,
  lines,
  max = 6,
  onMarks,
  title = 'What matters here',
  intro,
}: {
  fen: string;
  forColor: Color;
  deep?: boolean;
  lines?: EngineLine[] | null;
  max?: number;
  onMarks?: (m: Mark[]) => void;
  title?: string | null;
  intro?: string;
}) {
  const base = useMemo(() => staticInsights(fen, forColor), [fen, forColor]);
  const [extra, setExtra] = useState<Insight[] | null>(deep ? null : []);
  const [active, setActive] = useState<string | null>(null);

  useEffect(() => {
    setActive(null);
    onMarks?.([]);
    if (!deep) {
      setExtra([]);
      return;
    }
    let alive = true;
    setExtra(null);
    (async () => {
      try {
        const myTurn = fen.split(' ')[1] === forColor;
        const ml = lines && lines.length >= 2 ? lines : myTurn ? (await engine.analyze(fen, { depth: 14, multipv: 2 })).lines : [];
        const flipped = myTurn ? nullMoveFen(fen) : null;
        const threat = flipped ? (await engine.analyze(flipped, { depth: 12 })).lines[0] : undefined;
        if (alive) setExtra(engineInsights(fen, forColor, ml, threat));
      } catch (e) {
        if (alive && !(e instanceof CancelledError)) setExtra([]);
      }
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fen, forColor, deep]);

  const items = mergeInsights(base, extra ?? [], max);

  const toggle = (i: Insight) => {
    if (!onMarks || !i.squares.length) return;
    if (active === i.id) {
      setActive(null);
      onMarks([]);
    } else {
      setActive(i.id);
      onMarks(i.squares.map((sq) => ({ sq, color: i.kind === 'danger' ? 'threat' : i.kind === 'opportunity' ? 'focus' : 'plan' })));
    }
  };

  return (
    <div className="insights">
      {title && <h4 className="insights-title">{title}</h4>}
      {intro && <p className="muted small">{intro}</p>}
      {items.length === 0 && extra !== null && <p className="muted small">Nothing urgent. Improve your least active piece and keep your pieces protected.</p>}
      <ul className="insight-list">
        {items.map((i) => {
          const meta = KIND_META[i.kind];
          const Icon = meta.icon;
          const clickable = !!onMarks && i.squares.length > 0;
          return (
            <li key={i.id}>
              <button
                className={`insight insight-${i.kind}${active === i.id ? ' is-on' : ''}${clickable ? '' : ' is-static'}`}
                onClick={() => toggle(i)}
                aria-pressed={clickable ? active === i.id : undefined}
              >
                <span className="insight-icon" aria-hidden>
                  <Icon size={16} />
                </span>
                <span className="insight-body">
                  <span className="insight-theme">
                    {i.theme}
                    <span className="insight-kind">{meta.label}</span>
                  </span>
                  <span className="insight-text">{i.text}</span>
                  {clickable && <span className="insight-show">{active === i.id ? 'Hide on board' : 'Show on board'}</span>}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      {deep && extra === null && <Spinner label="Coach is checking threats and tactics…" />}
    </div>
  );
}
