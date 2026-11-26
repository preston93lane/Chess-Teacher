import { Chess, START_FEN, fenKey, uciOf, type Color } from '../chess/core';
import { parseMovetext } from '../chess/pgn';
import { OPENINGS } from '../../data/openings';
import type { Opening, ParsedLine } from './types';

export interface BookMove {
  san: string;
  uci: string;
  count: number;
  note?: string;
  refs: { openingId: string; lineId: string }[];
}

export interface BookNode {
  moves: BookMove[];
}

const parsedCache = new Map<string, ParsedLine>();
let index: Map<string, BookNode> | null = null;

export function parseLine(opening: Opening, lineId: string): ParsedLine {
  const key = `${opening.id}/${lineId}`;
  const cached = parsedCache.get(key);
  if (cached) return cached;
  const line = opening.lines.find((l) => l.id === lineId);
  if (!line) throw new Error(`Unknown line ${key}`);
  const { sans: tokens, intro } = parseMovetext(line.pgn);
  const chess = new Chess(START_FEN);
  const fens = [chess.fen()];
  const sans: string[] = [];
  const ucis: string[] = [];
  const comments: (string | undefined)[] = [];
  for (const t of tokens) {
    const m = chess.move(t.san);
    sans.push(m.san);
    ucis.push(uciOf(m));
    fens.push(chess.fen());
    comments.push(t.comment);
  }
  const parsed: ParsedLine = { openingId: opening.id, lineId, name: line.name, sans, ucis, fens, comments, intro };
  parsedCache.set(key, parsed);
  return parsed;
}

export function allLines(opening: Opening): ParsedLine[] {
  return opening.lines.map((l) => parseLine(opening, l.id));
}

function buildIndex() {
  const map = new Map<string, BookNode>();
  for (const o of OPENINGS) {
    for (const l of allLines(o)) {
      l.sans.forEach((san, i) => {
        const key = fenKey(l.fens[i]);
        let node = map.get(key);
        if (!node) {
          node = { moves: [] };
          map.set(key, node);
        }
        let bm = node.moves.find((m) => m.san === san);
        if (!bm) {
          bm = { san, uci: l.ucis[i], count: 0, refs: [] };
          node.moves.push(bm);
        }
        bm.count++;
        if (!bm.note && l.comments[i]) bm.note = l.comments[i];
        if (!bm.refs.some((r) => r.openingId === o.id && r.lineId === l.lineId)) bm.refs.push({ openingId: o.id, lineId: l.lineId });
      });
    }
  }
  return map;
}

export function lookupBook(key: string): BookNode | undefined {
  if (!index) index = buildIndex();
  return index.get(key);
}

/** Book moves restricted to one opening (used by the practice bot). */
export function openingBookMoves(opening: Opening, fen: string): BookMove[] {
  const key = fenKey(fen);
  const res = new Map<string, BookMove>();
  for (const l of allLines(opening)) {
    l.fens.forEach((f, i) => {
      if (i >= l.sans.length) return;
      if (fenKey(f) !== key) return;
      const san = l.sans[i];
      const bm = res.get(san) ?? { san, uci: l.ucis[i], count: 0, refs: [] };
      bm.count++;
      bm.refs.push({ openingId: opening.id, lineId: l.lineId });
      if (!bm.note && l.comments[i]) bm.note = l.comments[i];
      res.set(san, bm);
    });
  }
  return [...res.values()];
}

export function getOpening(id: string): Opening | undefined {
  return OPENINGS.find((o) => o.id === id);
}

/** Positions in a line where the student must find a move. */
export function studentPlies(line: ParsedLine, side: Color): number[] {
  const startTurn = line.fens[0].split(' ')[1] as Color;
  return line.sans
    .map((_, i) => i)
    .filter((i) => (i % 2 === 0 ? startTurn : startTurn === 'w' ? 'b' : 'w') === side);
}

export function pickWeighted<T extends { count: number }>(items: T[]): T | undefined {
  const total = items.reduce((s, i) => s + i.count, 0);
  let r = Math.random() * total;
  for (const it of items) {
    r -= it.count;
    if (r <= 0) return it;
  }
  return items[0];
}
