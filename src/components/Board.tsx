import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Chess, type Color, type PieceSymbol, type Square } from '../lib/chess/core';
import { useApp } from '../lib/store/app';
import { CLASS_INFO, type MoveClass } from '../lib/coach/explain';

import wK from '../assets/pieces/wK.svg';
import wQ from '../assets/pieces/wQ.svg';
import wR from '../assets/pieces/wR.svg';
import wB from '../assets/pieces/wB.svg';
import wN from '../assets/pieces/wN.svg';
import wP from '../assets/pieces/wP.svg';
import bK from '../assets/pieces/bK.svg';
import bQ from '../assets/pieces/bQ.svg';
import bR from '../assets/pieces/bR.svg';
import bB from '../assets/pieces/bB.svg';
import bN from '../assets/pieces/bN.svg';
import bP from '../assets/pieces/bP.svg';

export const PIECE_IMG: Record<string, string> = { wK, wQ, wR, wB, wN, wP, bK, bQ, bR, bB, bN, bP };

export type ArrowColor = 'g' | 'r' | 'b' | 'y';
export interface Arrow {
  from: string;
  to: string;
  color?: ArrowColor;
}
export interface Mark {
  sq: string;
  color?: 'plan' | 'threat' | 'focus';
}

export interface BoardProps {
  fen: string;
  orientation?: Color;
  /** Which side may move pieces. */
  movable?: Color | 'both' | null;
  onMove?: (m: { from: Square; to: Square; promotion?: PieceSymbol }) => void;
  lastMove?: [string, string] | null;
  arrows?: Arrow[];
  marks?: Mark[];
  badge?: { sq: string; cls: MoveClass } | null;
  /** Restrict legal destinations (e.g. lessons) — optional. */
  disabled?: boolean;
  hintSquares?: string[];
}

interface PieceItem {
  id: number;
  key: string; // e.g. "wN"
  sq: number; // 0..63, a1 = 0
}

const FILES = 'abcdefgh';
const sqIndex = (s: string) => s.charCodeAt(0) - 97 + (parseInt(s[1], 10) - 1) * 8;
const sqName = (i: number) => (FILES[i % 8] + (Math.floor(i / 8) + 1)) as Square;

function parsePlacement(fen: string): { key: string; sq: number }[] {
  const rows = fen.split(' ')[0].split('/');
  const out: { key: string; sq: number }[] = [];
  rows.forEach((row, r) => {
    let f = 0;
    for (const ch of row) {
      if (/\d/.test(ch)) f += +ch;
      else {
        const color = ch === ch.toUpperCase() ? 'w' : 'b';
        out.push({ key: color + ch.toUpperCase(), sq: (7 - r) * 8 + f });
        f++;
      }
    }
  });
  return out;
}

let nextPieceId = 1;

function matchPieces(prev: PieceItem[], next: { key: string; sq: number }[]): PieceItem[] {
  const result: PieceItem[] = [];
  const unmatchedPrev = [...prev];
  const unmatchedNext: { key: string; sq: number }[] = [];
  for (const n of next) {
    const i = unmatchedPrev.findIndex((p) => p.key === n.key && p.sq === n.sq);
    if (i >= 0) {
      result.push(unmatchedPrev[i]);
      unmatchedPrev.splice(i, 1);
    } else unmatchedNext.push(n);
  }
  for (const n of unmatchedNext) {
    let best = -1;
    let bestDist = Infinity;
    unmatchedPrev.forEach((p, i) => {
      if (p.key !== n.key) return;
      const d = Math.abs((p.sq % 8) - (n.sq % 8)) + Math.abs(Math.floor(p.sq / 8) - Math.floor(n.sq / 8));
      if (d < bestDist) {
        bestDist = d;
        best = i;
      }
    });
    if (best >= 0) {
      result.push({ ...unmatchedPrev[best], sq: n.sq });
      unmatchedPrev.splice(best, 1);
    } else result.push({ id: nextPieceId++, key: n.key, sq: n.sq });
  }
  return result;
}

function BoardImpl({
  fen,
  orientation = 'w',
  movable = null,
  onMove,
  lastMove,
  arrows = [],
  marks = [],
  badge,
  disabled,
  hintSquares,
}: BoardProps) {
  const settings = useApp((s) => s.settings);
  const ref = useRef<HTMLDivElement>(null);
  const piecesRef = useRef<PieceItem[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [drag, setDrag] = useState<{ sq: number; x: number; y: number; active: boolean } | null>(null);
  const [promo, setPromo] = useState<{ from: number; to: number; color: Color } | null>(null);
  const dragStart = useRef<{ x: number; y: number; sq: number; wasSelected: boolean } | null>(null);

  const pieces = useMemo(() => {
    const next = matchPieces(piecesRef.current, parsePlacement(fen));
    piecesRef.current = next;
    return next;
  }, [fen]);

  const chess = useMemo(() => {
    try {
      return new Chess(fen);
    } catch {
      return null;
    }
  }, [fen]);

  const turn = (fen.split(' ')[1] ?? 'w') as Color;
  const canMoveColor = (c: Color) => !disabled && (movable === 'both' || movable === c) && c === turn;

  useEffect(() => {
    setSelected(null);
    setPromo(null);
  }, [fen]);

  const dests = useMemo(() => {
    if (selected === null || !chess) return new Map<number, boolean>();
    const moves = chess.moves({ square: sqName(selected), verbose: true });
    const m = new Map<number, boolean>();
    for (const mv of moves) m.set(sqIndex(mv.to), !!mv.captured);
    return m;
  }, [selected, chess]);

  const checkSq = useMemo(() => {
    if (!chess || !chess.inCheck()) return null;
    const k = pieces.find((p) => p.key === turn + 'K');
    return k ? k.sq : null;
  }, [chess, pieces, turn]);

  const toXY = (sq: number) => {
    const f = sq % 8;
    const r = Math.floor(sq / 8);
    return orientation === 'w' ? { x: f, y: 7 - r } : { x: 7 - f, y: r };
  };

  const pointToSq = (clientX: number, clientY: number): number | null => {
    const el = ref.current;
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    const x = Math.floor(((clientX - rect.left) / rect.width) * 8);
    const y = Math.floor(((clientY - rect.top) / rect.height) * 8);
    if (x < 0 || x > 7 || y < 0 || y > 7) return null;
    const f = orientation === 'w' ? x : 7 - x;
    const r = orientation === 'w' ? 7 - y : y;
    return r * 8 + f;
  };

  const pieceAt = (sq: number) => pieces.find((p) => p.sq === sq);

  const attemptMove = useCallback(
    (from: number, to: number) => {
      if (!chess || !onMove) return false;
      const moves = chess.moves({ square: sqName(from), verbose: true }).filter((m) => m.to === sqName(to));
      if (!moves.length) return false;
      if (moves.some((m) => m.promotion)) {
        if (settings.autoQueen) onMove({ from: sqName(from), to: sqName(to), promotion: 'q' });
        else setPromo({ from, to, color: moves[0].color });
      } else onMove({ from: sqName(from), to: sqName(to) });
      setSelected(null);
      return true;
    },
    [chess, onMove, settings.autoQueen],
  );

  const onPointerDown = (e: React.PointerEvent) => {
    if (promo) return;
    const sq = pointToSq(e.clientX, e.clientY);
    if (sq === null) return;
    const p = pieceAt(sq);
    if (selected !== null && dests.has(sq)) {
      attemptMove(selected, sq);
      return;
    }
    if (p && canMoveColor(p.key[0] as Color)) {
      const wasSelected = selected === sq;
      setSelected(sq);
      dragStart.current = { x: e.clientX, y: e.clientY, sq, wasSelected };
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      const rect = ref.current!.getBoundingClientRect();
      setDrag({ sq, x: e.clientX - rect.left, y: e.clientY - rect.top, active: false });
    } else setSelected(null);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragStart.current || !drag) return;
    const dx = e.clientX - dragStart.current.x;
    const dy = e.clientY - dragStart.current.y;
    const rect = ref.current!.getBoundingClientRect();
    const active = drag.active || Math.hypot(dx, dy) > 5;
    setDrag({ sq: drag.sq, x: e.clientX - rect.left, y: e.clientY - rect.top, active });
  };

  const onPointerUp = (e: React.PointerEvent) => {
    const start = dragStart.current;
    dragStart.current = null;
    if (!start) {
      setDrag(null);
      return;
    }
    if (drag?.active) {
      const target = pointToSq(e.clientX, e.clientY);
      if (target !== null && target !== start.sq && attemptMove(start.sq, target)) {
        setDrag(null);
        return;
      }
    } else if (start.wasSelected) setSelected(null);
    setDrag(null);
  };

  const theme = settings.boardTheme;
  const markMap = new Map(marks.map((m) => [sqIndex(m.sq), m.color ?? 'focus']));
  const hintSet = new Set((hintSquares ?? []).map(sqIndex));
  const lastFrom = lastMove ? sqIndex(lastMove[0]) : -1;
  const lastTo = lastMove ? sqIndex(lastMove[1]) : -1;

  const squares = [];
  for (let y = 0; y < 8; y++) {
    for (let x = 0; x < 8; x++) {
      const f = orientation === 'w' ? x : 7 - x;
      const r = orientation === 'w' ? 7 - y : y;
      const sq = r * 8 + f;
      const light = (f + r) % 2 === 1;
      const cls = ['sq', light ? 'sq-light' : 'sq-dark'];
      if (sq === lastFrom || sq === lastTo) cls.push('sq-last');
      if (sq === selected) cls.push('sq-selected');
      if (sq === checkSq) cls.push('sq-check');
      const mk = markMap.get(sq);
      if (mk) cls.push(`sq-mark-${mk}`);
      if (hintSet.has(sq)) cls.push('sq-hint');
      const dest = dests.get(sq);
      squares.push(
        <div key={sq} className={cls.join(' ')} data-sq={sqName(sq)}>
          {dest !== undefined && <span className={dest ? 'dest dest-capture' : 'dest'} />}
          {settings.coordinates && x === 0 && <span className="coord coord-rank">{r + 1}</span>}
          {settings.coordinates && y === 7 && <span className="coord coord-file">{FILES[f]}</span>}
        </div>,
      );
    }
  }

  const badgePos = badge ? toXY(sqIndex(badge.sq)) : null;

  return (
    <div
      className={`board board-${theme}${drag?.active ? ' is-dragging' : ''}`}
      ref={ref}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={() => {
        dragStart.current = null;
        setDrag(null);
      }}
      role="grid"
      aria-label="Chess board"
    >
      <div className="board-squares">{squares}</div>
      <div className="board-pieces">
        {pieces.map((p) => {
          const { x, y } = toXY(p.sq);
          const dragging = drag?.active && drag.sq === p.sq;
          const style: React.CSSProperties = dragging
            ? {
                transform: `translate(calc(${drag!.x}px - 50%), calc(${drag!.y}px - 50%)) scale(1.12)`,
                transition: 'none',
                zIndex: 10,
              }
            : { transform: `translate(${x * 100}%, ${y * 100}%)` };
          return (
            <div key={p.id} className={`piece${dragging ? ' piece-drag' : ''}`} style={style}>
              <img src={PIECE_IMG[p.key]} alt={p.key} draggable={false} />
            </div>
          );
        })}
      </div>
      {arrows.length > 0 && (
        <svg className="board-arrows" viewBox="0 0 8 8" aria-hidden>
          <defs>
            {(['g', 'r', 'b', 'y'] as ArrowColor[]).map((c) => (
              <marker key={c} id={`ah-${c}`} markerWidth="4" markerHeight="4" refX="2.05" refY="2" orient="auto">
                <path d="M0,0 L4,2 L0,4 z" className={`arrow-head arrow-${c}`} />
              </marker>
            ))}
          </defs>
          {arrows.map((a, i) => {
            if (a.from.length < 2 || a.to.length < 2) return null;
            const p1 = toXY(sqIndex(a.from));
            const p2 = toXY(sqIndex(a.to));
            const x1 = p1.x + 0.5;
            const y1 = p1.y + 0.5;
            const x2 = p2.x + 0.5;
            const y2 = p2.y + 0.5;
            const len = Math.hypot(x2 - x1, y2 - y1);
            const shorten = 0.32;
            const ex = x2 - ((x2 - x1) / len) * shorten;
            const ey = y2 - ((y2 - y1) / len) * shorten;
            const c = a.color ?? 'g';
            return (
              <line
                key={i}
                x1={x1}
                y1={y1}
                x2={ex}
                y2={ey}
                className={`arrow arrow-${c}`}
                strokeWidth={0.16}
                markerEnd={`url(#ah-${c})`}
              />
            );
          })}
        </svg>
      )}
      {badge && badgePos && (
        <div
          className={`board-badge tone-${CLASS_INFO[badge.cls].tone}`}
          style={{ left: `${(badgePos.x + 1) * 12.5}%`, top: `${badgePos.y * 12.5}%` }}
          aria-label={CLASS_INFO[badge.cls].label}
        >
          {CLASS_INFO[badge.cls].glyph}
        </div>
      )}
      {promo && (
        <div className="promo" onPointerDown={(e) => e.stopPropagation()}>
          <div className="promo-col" style={{ left: `${toXY(promo.to).x * 12.5}%` }}>
            {(['q', 'n', 'r', 'b'] as PieceSymbol[]).map((t) => (
              <button
                key={t}
                className="promo-btn"
                onClick={() => {
                  onMove?.({ from: sqName(promo.from), to: sqName(promo.to), promotion: t });
                  setPromo(null);
                }}
              >
                <img src={PIECE_IMG[promo.color + t.toUpperCase()]} alt={t} />
              </button>
            ))}
            <button className="promo-cancel" onClick={() => setPromo(null)}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export const Board = memo(BoardImpl);
