/** Training courses: lessons, trainers and themed puzzle sets grouped by skill. */

export type CourseItem =
  | { kind: 'lesson'; id: string }
  | { kind: 'trainer'; title: string; detail: string; to: string }
  | { kind: 'puzzles'; theme: string; label?: string };

export interface Course {
  id: string;
  title: string;
  blurb: string;
  /** Link straight to an existing hub instead of a course page. */
  to?: string;
  sections: { title: string; text?: string; items: CourseItem[] }[];
}

const puzzles = (...themes: string[]): CourseItem[] => themes.map((theme) => ({ kind: 'puzzles', theme }));

export const COURSES: Course[] = [
  {
    id: 'endgames',
    title: 'Endgame technique',
    blurb: 'Basic mates, king and pawn, unbalanced pawns, fortresses and rook endings — drilled against the engine with spaced reviews.',
    to: '/endgames',
    sections: [],
  },
  {
    id: 'mates',
    title: 'Checkmate patterns',
    blurb: 'Back rank, smothered, Anastasia, Arabian, Boden, epaulette, Légal: learn each picture, then find it in hundreds of real games.',
    sections: [
      { title: 'Lessons', items: [{ kind: 'lesson', id: 'mates-1' }, { kind: 'lesson', id: 'mates-2' }] },
      {
        title: 'Practice by pattern',
        text: 'Ten puzzles at a time from real games, each ending in the pattern.',
        items: puzzles('backRankMate', 'smotheredMate', 'anastasiaMate', 'arabianMate', 'bodenMate', 'hookMate', 'dovetailMate', 'doubleBishopMate', 'mateIn2', 'mateIn3'),
      },
    ],
  },
  {
    id: 'attack',
    title: 'Attacking the king',
    blurb: 'When the Greek gift works, the double-bishop sacrifice, opposite-side castling races, and how to count attackers and defenders.',
    sections: [
      { title: 'Lessons', items: [{ kind: 'lesson', id: 'attack-king' }, { kind: 'lesson', id: 'opposite-castling' }] },
      { title: 'Practice', items: puzzles('kingsideAttack', 'sacrifice', 'exposedKing', 'attraction', 'clearance', 'deflection') },
      { title: 'Attacking classics', items: [{ kind: 'trainer', title: 'Classic games', detail: 'Replay the immortal attacking games, or play the winner’s side and find the key moves.', to: '/classics' }] },
    ],
  },
  {
    id: 'defence',
    title: 'Defence',
    blurb: 'Spot the threat before you move, find only-moves, and hold worse positions. Most lost games start with an ignored threat.',
    sections: [
      { title: 'Lessons', items: [{ kind: 'lesson', id: 'defence-1' }, { kind: 'lesson', id: 'prophylaxis' }] },
      {
        title: 'Trainer',
        items: [{ kind: 'trainer', title: 'Threat spotter', detail: 'A position from a master game: show what your opponent threatens, then stop it. Checked by the engine.', to: '/train/threats' }],
      },
      { title: 'Practice', items: [...puzzles('defensiveMove', 'intermezzo', 'zugzwang'), { kind: 'trainer', title: 'Hold the draw', detail: 'Philidor, the stalemate defence and the wrong bishop — survive against the engine.', to: '/endgames/philidor' }] },
    ],
  },
  {
    id: 'calculation',
    title: 'Calculation & visualization',
    blurb: 'Checks, captures and threats first; then see the board after several moves without moving the pieces.',
    sections: [
      { title: 'Lesson', items: [{ kind: 'lesson', id: 'calculation' }] },
      {
        title: 'Trainers',
        items: [
          { kind: 'trainer', title: 'Checks & captures', detail: 'List every forcing move in a position before choosing one.', to: '/train/cct' },
          { kind: 'trainer', title: 'Visualize the line', detail: 'Moves are read out but the board stays still — pick the winning continuation.', to: '/train/visualize' },
          { kind: 'trainer', title: 'Board vision', detail: 'Squares, colours, diagonals and knight routes against the clock.', to: '/vision' },
        ],
      },
      { title: 'Long combinations', items: puzzles('mateIn3', 'mateIn4', 'quietMove', 'clearance') },
    ],
  },
  {
    id: 'blindfold',
    title: 'Blindfold chess',
    blurb: 'A step-by-step path from board vision to full games without seeing the pieces — the best visualization training there is.',
    sections: [
      {
        title: 'The path',
        items: [
          { kind: 'trainer', title: '1. Board vision', detail: 'Know every square’s name and colour without looking.', to: '/vision' },
          { kind: 'trainer', title: '2. Visualize the line', detail: 'Hold a position in your head while moves are read out.', to: '/train/visualize' },
          { kind: 'trainer', title: '3. Fading pieces', detail: 'A game against the coach where the pieces fade out over 20 moves.', to: '/play?blind=fade&bot=l3' },
          { kind: 'trainer', title: '4. Blindfold vs an easy bot', detail: 'No pieces at all. Use the move list; hold the eye to peek.', to: '/play?blind=hidden&bot=l2' },
          { kind: 'trainer', title: '5. Blindfold at your level', detail: 'The real test.', to: '/play?blind=hidden' },
        ],
      },
    ],
  },
  {
    id: 'structures',
    title: 'Pawn structures',
    blurb: 'The plans that come with each structure: IQP, Carlsbad from both sides, hanging pawns, chains, hedgehog, Stonewall, Benoni and the Maróczy bind.',
    sections: [
      { title: 'Part I', items: ['iqp', 'minority-attack', 'hanging-pawns', 'pawn-chains', 'hedgehog'].map((id) => ({ kind: 'lesson' as const, id })) },
      { title: 'Part II', items: ['stonewall', 'benoni', 'maroczy', 'carlsbad-black'].map((id) => ({ kind: 'lesson' as const, id })) },
    ],
  },
  {
    id: 'traps',
    title: 'Opening traps',
    blurb: 'Thirteen classic traps — Fool’s and Scholar’s mate, Légal, Noah’s Ark, the Elephant, Lasker, Siberian and more. Spring them, and never fall for them.',
    sections: [
      { title: 'Trainer', items: [{ kind: 'trainer', title: 'Spring the trap', detail: 'The game reaches the critical moment: find the move, then watch the trap close.', to: '/train/traps' }] },
      { title: 'Practice', items: [...puzzles('opening'), { kind: 'trainer', title: 'Opening quiz', detail: 'Name the opening from the position and play the next theory move.', to: '/openings/quiz' }] },
    ],
  },
  {
    id: 'endgame-practice',
    title: 'Practical endgames',
    blurb: 'Endgame positions from real games, by material: rook, pawn, queen, bishop and knight endings, plus promotion races and zugzwang.',
    sections: [
      { title: 'Puzzles from real endgames', items: puzzles('rookEndgame', 'pawnEndgame', 'queenEndgame', 'bishopEndgame', 'knightEndgame', 'zugzwang', 'promotion', 'advancedPawn') },
      { title: 'Technique', items: [{ kind: 'trainer', title: 'Endgame course', detail: 'Lessons and drills against the engine, with spaced reviews.', to: '/endgames' }] },
    ],
  },
  {
    id: 'guess',
    title: 'Guess the master’s move',
    blurb: 'Play through a top-level game as the winner and predict each move. Points for exact matches and for moves the engine rates as just as good.',
    sections: [
      { title: 'Trainer', items: [{ kind: 'trainer', title: 'Start a game', detail: 'A random game from 2,500 of the strongest over-the-board games in the database.', to: '/train/guess' }] },
    ],
  },
];

export function getCourse(id: string) {
  return COURSES.find((c) => c.id === id);
}
