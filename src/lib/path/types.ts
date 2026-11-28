/**
 * The Learn path: a Duolingo-style course from about 300 to 2000, taught by
 * Pip the pawn. Levels hold units, units hold short lessons, and a lesson is
 * a list of small steps: Pip explains, walks a line, asks for a move or a
 * multiple-choice answer, then hands over real puzzles on the same idea.
 */
import type { Color } from '../chess/core';

export type Mood = 'happy' | 'think' | 'cheer' | 'oops' | 'wave' | 'wow';
export type LevelId = 'basics' | 'beginner' | 'intermediate' | 'expert';

/** A board to show: `fen` (default: start position), then `pgn` moves played from it. */
export interface Diagram {
  fen?: string;
  pgn?: string;
  orientation?: Color;
  /** "e2e4"; prefix "r:" red, "b:" blue, "y:" yellow. */
  arrows?: string[];
  /** Squares to ring: "e4", or "r:e4" for a threat. */
  marks?: string[];
}

export interface SayStep extends Diagram {
  kind: 'say';
  text: string;
  mood?: Mood;
}

/** Pip plays through a line move by move; {comments} after a move are read out. */
export interface LineStep extends Diagram {
  kind: 'line';
  text: string;
  line: string;
}

/**
 * Find the move. `sol` alternates your moves and the replies (SAN). With
 * `goal`, any move that checks (or mates) is accepted for the first move.
 */
export interface MoveStep extends Diagram {
  kind: 'move';
  text: string;
  sol: string[];
  /** Other first moves that are just as good. */
  accept?: string[];
  goal?: 'check' | 'mate';
  hint?: string;
  explain: string;
  /** Skip the engine check in the content validator (e.g. several equal answers). */
  noEngine?: boolean;
}

export interface ChoiceStep extends Diagram {
  kind: 'choice';
  text: string;
  options: string[];
  answer: number;
  explain: string;
}

/** Real puzzles from the database: any of `themes`, all of `need`, rated within the level (or min–max). */
export interface PuzzleStep {
  kind: 'puzzles';
  text: string;
  themes: string[];
  need?: string[];
  count: number;
  min?: number;
  max?: number;
  opening?: string;
}

/** Play your side of a repertoire line from memory (the reply comes automatically). */
export interface PlayLineStep {
  kind: 'playline';
  text: string;
  opening: string;
  line: string;
  side: Color;
  /** Only the first N plies (early lessons). */
  plies?: number;
}

export type Step = SayStep | LineStep | MoveStep | ChoiceStep | PuzzleStep | PlayLineStep;

/** Ideas a lesson teaches — used to compare your games with what you practised. */
export type Concept =
  | 'hanging'
  | 'mate'
  | 'backrank'
  | 'fork'
  | 'pin'
  | 'skewer'
  | 'discovered'
  | 'defender'
  | 'opening'
  | 'endgame'
  | 'attack'
  | 'calculation'
  | 'positional'
  | 'defence';

export interface Lesson {
  id: string;
  title: string;
  /** One line under the title on the path. */
  blurb: string;
  concept?: Concept;
  steps: Step[];
  kind?: 'lesson' | 'review' | 'repertoire';
}

export interface Unit {
  id: string;
  title: string;
  about: string;
  /** Puzzle themes for the unit test. */
  themes: string[];
  lessons: Lesson[];
}

export interface Level {
  id: LevelId;
  title: string;
  /** Rough rating range the level takes you through. */
  range: [number, number];
  /** Puzzle rating band for this level. */
  band: [number, number];
  pitch: string;
  units: Unit[];
}
