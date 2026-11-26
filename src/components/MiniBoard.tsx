import { memo } from 'react';
import type { Color } from '../lib/chess/core';
import { usePieceUrl } from './Board';
import { useApp } from '../lib/store/app';

/** Static, non-interactive board for thumbnails and lists. */
function MiniBoardImpl({ fen, orientation = 'w', className = '', highlight }: { fen: string; orientation?: Color; className?: string; highlight?: string[] }) {
  const theme = useApp((s) => s.settings.boardTheme);
  const pieceSrc = usePieceUrl();
  const rows = fen.split(' ')[0].split('/');
  const grid: (string | null)[][] = rows.map((row) => {
    const out: (string | null)[] = [];
    for (const ch of row) {
      if (/\d/.test(ch)) for (let i = 0; i < +ch; i++) out.push(null);
      else out.push((ch === ch.toUpperCase() ? 'w' : 'b') + ch.toUpperCase());
    }
    return out;
  });
  const cells = [];
  const hl = new Set(highlight ?? []);
  for (let y = 0; y < 8; y++) {
    for (let x = 0; x < 8; x++) {
      const r = orientation === 'w' ? y : 7 - y;
      const f = orientation === 'w' ? x : 7 - x;
      const piece = grid[r][f];
      const light = (r + f) % 2 === 0;
      const name = 'abcdefgh'[f] + (8 - r);
      cells.push(
        <div key={`${x}${y}`} className={`mini-sq ${light ? 'sq-light' : 'sq-dark'}${hl.has(name) ? ' sq-last' : ''}`}>
          {piece && <img src={pieceSrc(piece)} alt="" />}
        </div>,
      );
    }
  }
  return <div className={`mini-board board-${theme} ${className}`} aria-hidden>{cells}</div>;
}

export const MiniBoard = memo(MiniBoardImpl);
