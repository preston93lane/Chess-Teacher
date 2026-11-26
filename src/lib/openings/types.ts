import type { Color } from '../chess/core';
import type { StructureId } from '../coach/structure';

export interface OpeningLine {
  id: string;
  name: string;
  /** Movetext from the initial position with {comments} after key moves. */
  pgn: string;
  /** One-sentence purpose of the line. */
  about?: string;
}

export interface Trap {
  name: string;
  pgn: string;
  text: string;
}

export interface Opening {
  id: string;
  name: string;
  eco: string;
  /** Side the student plays when studying this opening. */
  side: Color;
  family: '1.e4' | '1.d4' | 'Flank';
  level: 'Intermediate' | 'Advanced';
  tagline: string;
  summary: string[];
  /** Moves that define the opening (shown in the header). */
  root: string;
  ideas: string[];
  opponentIdeas: string[];
  structures: StructureId[];
  plans: { title: string; text: string }[];
  traps: Trap[];
  lines: OpeningLine[];
  /** Related strategy lessons. */
  lessons?: string[];
}

export interface ParsedLine {
  openingId: string;
  lineId: string;
  name: string;
  sans: string[];
  ucis: string[];
  fens: string[];
  comments: (string | undefined)[];
  intro?: string;
}
