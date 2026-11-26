import type { Color } from '../chess/core';

export interface LessonTask {
  prompt: string;
  /** Accepted moves in SAN. The first is the main answer. */
  accept: string[];
  explain: string;
  hint?: string;
}

export interface LessonSection {
  title: string;
  text: string[];
  /** Moves from the start position (or from `fen`) that lead to the diagram. */
  pgn?: string;
  fen?: string;
  orientation?: Color;
  /** Arrows as "e2e4"; prefix "r:" for red (threat) and "b:" for blue (plan). */
  arrows?: string[];
  marks?: string[];
  task?: LessonTask;
  /** Offer "Play this position vs the coach". */
  practice?: { side: Color; prompt: string };
  /** Endgame drill id to practise this position against the engine. */
  drill?: string;
}

export type Track = 'Pawn structures' | 'Pieces & squares' | 'Attack & defence' | 'Thinking skills' | 'Endgames';

export interface Lesson {
  id: string;
  title: string;
  track: Track;
  level: 'Intermediate' | 'Advanced';
  minutes: number;
  summary: string;
  sections: LessonSection[];
  openings?: string[];
}
