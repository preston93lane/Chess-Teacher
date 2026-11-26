import type { Color } from '../lib/chess/core';
import { formatScore, winPctWhite, type Score } from '../lib/coach/eval';

export function EvalBar({ score, orientation = 'w', pending }: { score?: Score; orientation?: Color; pending?: boolean }) {
  const white = score ? winPctWhite(score) : 50;
  const label = score ? formatScore(score) : '';
  const whiteOnBottom = orientation === 'w';
  const leaderWhite = white >= 50;
  return (
    <div className={`evalbar${pending ? ' is-pending' : ''}`} aria-label={`Evaluation ${label}`}>
      <div
        className="evalbar-white"
        style={{ height: `${white}%`, [whiteOnBottom ? 'bottom' : 'top']: 0 } as React.CSSProperties}
      />
      {label && (
        <span
          className={`evalbar-label ${leaderWhite ? 'on-white' : 'on-black'}`}
          style={{ [leaderWhite === whiteOnBottom ? 'bottom' : 'top']: 4 } as React.CSSProperties}
        >
          {label.replace('+', '')}
        </span>
      )}
    </div>
  );
}
