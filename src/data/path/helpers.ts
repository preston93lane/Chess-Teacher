import type { ChoiceStep, Diagram, LineStep, Mood, MoveStep, PuzzleStep, SayStep } from '../../lib/path/types';

export const EMPTY = '4k3/8/8/8/8/8/8/4K3 w - - 0 1';

export const say = (text: string, d: Diagram & { mood?: Mood } = {}): SayStep => ({ kind: 'say', text, ...d });

export const line = (text: string, moves: string, d: Diagram = {}): LineStep => ({ kind: 'line', text, line: moves, ...d });

export const move = (
  text: string,
  fen: string,
  sol: string | string[],
  explain: string,
  extra: Partial<Omit<MoveStep, 'kind' | 'text' | 'fen' | 'sol' | 'explain'>> = {},
): MoveStep => ({ kind: 'move', text, fen, sol: Array.isArray(sol) ? sol : [sol], explain, ...extra });

export const choice = (text: string, options: string[], answer: number, explain: string, d: Diagram = {}): ChoiceStep => ({
  kind: 'choice',
  text,
  options,
  answer,
  explain,
  ...d,
});

export const puzzles = (text: string, themes: string[], count = 4, extra: Partial<Omit<PuzzleStep, 'kind' | 'text' | 'themes' | 'count'>> = {}): PuzzleStep => ({
  kind: 'puzzles',
  text,
  themes,
  count,
  ...extra,
});
