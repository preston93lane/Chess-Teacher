/** Helpers shared by the lesson player and the content tests. */
import { Chess, START_FEN } from '../chess/core';
import { parseMovetext } from '../chess/pgn';
import type { Arrow, Mark } from '../../components/Board';
import type { Diagram, LineStep } from './types';

export function diagramPosition(d: Diagram): { fen: string; last: [string, string] | null } {
  const c = new Chess(d.fen || START_FEN);
  let last: [string, string] | null = null;
  if (d.pgn) {
    for (const m of parseMovetext(d.pgn).sans) {
      const mv = c.move(m.san);
      last = [mv.from, mv.to];
    }
  }
  return { fen: c.fen(), last };
}

export function arrowsOf(list?: string[]): Arrow[] {
  return (list ?? []).map((a) => {
    const [prefix, body] = a.includes(':') ? a.split(':') : ['g', a];
    return { from: body.slice(0, 2), to: body.slice(2, 4), color: prefix as Arrow['color'] };
  });
}

export function marksOf(list?: string[]): Mark[] {
  return (list ?? []).map((m) => (m.startsWith('r:') ? { sq: m.slice(2), color: 'threat' as const } : { sq: m, color: 'focus' as const }));
}

export interface LinePly {
  fenBefore: string;
  fenAfter: string;
  san: string;
  from: string;
  to: string;
  comment?: string;
}

export function parseLineSteps(step: LineStep): LinePly[] {
  const start = diagramPosition(step).fen;
  const c = new Chess(start);
  return parseMovetext(step.line).sans.map((m) => {
    const fenBefore = c.fen();
    const mv = c.move(m.san);
    return { fenBefore, fenAfter: c.fen(), san: mv.san, from: mv.from, to: mv.to, comment: m.comment };
  });
}

const clean = (s: string) => s.replace(/[+#!?]/g, '').replace(/^0-0-0$/, 'O-O-O').replace(/^0-0$/, 'O-O');

/** Same move written with or without check marks and annotations. */
export function sameSan(a: string, b: string) {
  return clean(a) === clean(b);
}
