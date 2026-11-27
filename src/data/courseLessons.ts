/**
 * Lessons for the training courses (mates, attack, defence, structures II).
 * Every task is checked with scripts/validate-courses.ts.
 */
import type { Lesson } from '../lib/lessons/types';

export const COURSE_LESSONS: Lesson[] = [
  {
    id: 'mates-1',
    title: 'Mating patterns I: back rank, smothered, Anastasia, Arabian',
    track: 'Attack & defence',
    level: 'Intermediate',
    minutes: 12,
    summary: 'The four mates that decide the most games. Learn the picture, then you’ll see the combination that leads to it.',
    sections: [
      {
        title: 'Back-rank mate',
        text: ['The castled king behind three unmoved pawns has no air. A rook or queen landing on the back rank mates if nothing can block or capture. Always ask: is my back rank covered — and is theirs?'],
        fen: '6k1/5ppp/8/8/8/8/5PPP/3R2K1 w - - 0 1',
        task: { prompt: 'White to move: mate in one.', accept: ['Rd8#'], hint: 'The king is boxed in by its own pawns.', explain: 'Rd8# — the rook controls the whole back rank and the pawns on f7, g7, h7 take away every flight square.' },
      },
      {
        title: 'Smothered mate',
        text: ['A king surrounded by its own pieces can be mated by a knight alone. The classic set-up is a king on h8 with a rook on g8 and pawns on g7 and h7 — the knight check on f7 is mate.'],
        fen: '6rk/6pp/8/6N1/8/8/8/6K1 w - - 0 1',
        task: { prompt: 'White to move: mate in one.', accept: ['Nf7#'], hint: 'Which piece can check a king it can’t be blocked from?', explain: 'Nf7# — the king’s own rook and pawns take every flight square, and a knight check can’t be blocked.' },
      },
      {
        title: 'Philidor’s legacy',
        text: ['The famous way to reach the smothered mate: check with the knight, check again with a discovered queen check, then sacrifice the queen on g8 so the rook has to take it and smother its own king.'],
        fen: 'r6k/6pp/8/3Q2N1/8/8/8/6K1 w - - 0 1',
        task: { prompt: 'White to move and mate.', accept: ['Nf7+'], hint: 'Start with a knight check.', explain: '1.Nf7+ Kg8 2.Nh6+ (double check from knight and queen) Kh8 3.Qg8+! Rxg8 4.Nf7#. If 2…Kf8, 3.Qf7# also works.' },
        practice: { side: 'w', prompt: 'Play it out against the coach' },
      },
      {
        title: 'Anastasia’s mate',
        text: ['A knight on e7 takes g8 and g6 from a king on h7; a rook or queen on the h-file finishes. Typical after the defender’s g-pawn has stayed on g7.'],
        fen: '8/4N1pk/8/8/8/R7/8/6K1 w - - 0 1',
        task: { prompt: 'White to move: mate in one.', accept: ['Rh3#'], hint: 'Swing the rook to the open file.', explain: 'Rh3# — the knight covers g8 and g6, the g7-pawn blocks the king, the rook controls the h-file.' },
      },
      {
        title: 'The Arabian mate',
        text: ['Rook and knight together: the knight on f6 protects the rook on h7 and covers g8. One of the oldest known mating patterns.'],
        fen: '7k/1R6/5N2/8/8/8/8/6K1 w - - 0 1',
        task: { prompt: 'White to move: mate in one.', accept: ['Rh7#'], hint: 'The knight protects one square next to the king.', explain: 'Rh7# — protected by the knight, which also covers g8; the rook covers g7.' },
      },
    ],
  },
  {
    id: 'mates-2',
    title: 'Mating patterns II: Boden, epaulette and Légal',
    track: 'Attack & defence',
    level: 'Intermediate',
    minutes: 10,
    summary: 'Criss-crossing bishops, a king hemmed in by its own rooks, and the oldest opening trap in the book.',
    sections: [
      {
        title: 'Boden’s mate',
        text: ['Two bishops on crossing diagonals mate a king castled queenside. It usually follows a sacrifice on c6 or b7 that opens the a6–c8 diagonal.'],
        fen: '2kr4/p2n1ppp/2p5/8/5B2/3B4/8/6K1 w - - 0 1',
        task: { prompt: 'White to move: mate in one.', accept: ['Ba6#'], hint: 'One bishop is already covering b8 and c7.', explain: 'Ba6# — the f4-bishop covers b8 and c7, the a6-bishop checks and covers b7; d7 and d8 are blocked by Black’s own pieces.' },
      },
      {
        title: 'Epaulette mate',
        text: ['A king flanked by its own rooks (the “epaulettes”) can be mated by a queen check from two squares in front, which also covers the three squares in between.'],
        fen: '3rkr2/ppp3pp/8/8/8/7Q/PPP3PP/6K1 w - - 0 1',
        task: { prompt: 'White to move: mate in one.', accept: ['Qe6#'], hint: 'The rooks on d8 and f8 are in their own king’s way.', explain: 'Qe6# covers d7, e7 and f7; the king can’t step sideways because of its own rooks.' },
      },
      {
        title: 'Légal’s mate',
        text: ['Pinning a knight to the queen isn’t a real pin. Here White ignores it, gives up the queen and mates with the minor pieces.'],
        pgn: '1.e4 e5 2.Nf3 d6 3.Bc4 Bg4 4.Nc3 g6 5.Nxe5 Bxd1',
        task: { prompt: 'White to move: Black has just taken the queen. Punish it.', accept: ['Bxf7+'], hint: 'Check first — the king has only one square.', explain: '6.Bxf7+ Ke7 7.Nd5# — the knights and bishop cover every square. The lesson: before you win the queen, check what it costs.' },
      },
    ],
  },
  {
    id: 'attack-king',
    title: 'Attacking the castled king',
    track: 'Attack & defence',
    level: 'Advanced',
    minutes: 14,
    summary: 'The Greek gift and the double-bishop sacrifice — when they work, and the checklist to run before you sacrifice.',
    sections: [
      {
        title: 'Before you sacrifice: the checklist',
        text: [
          'A king attack needs more attackers than defenders near the king. Count them. Look for a knight that can reach g5 with tempo, a queen that can join on h5, and missing defenders — above all a knight on f6, the best defender of h7.',
          'If the defence can bring a piece over in one move, or the king can run, the sacrifice is usually unsound. Calculate the forcing lines to the end.',
        ],
        fen: 'rnbq1rk1/pppn1ppp/4p3/3pP3/1b1P4/2NB1N2/PPP2PPP/R1BQK2R w KQ - 0 7',
        task: {
          prompt: 'White to move. Is the Greek gift on?',
          accept: ['Bxh7+'],
          hint: 'No knight on f6, a knight ready for g5, the queen one step from h5.',
          explain: '1.Bxh7+! Kxh7 2.Ng5+ Kg8 3.Qh5, threatening Qh7 mate: Black has to give up the queen with …Qxg5. It works because there is no knight on f6 to defend h7, the e5-pawn keeps one out, and Black’s pieces are too far away to help.',
        },
        explore: true,
      },
      {
        title: 'The double-bishop sacrifice (Lasker–Bauer, 1889)',
        text: ['Both bishops on the long diagonals give themselves up to strip the king bare: Bxh7+ and then Bxg7. The rook lift Rf3–h3 brings the final attacker.'],
        pgn: '1.f4 d5 2.e3 Nf6 3.b3 e6 4.Bb2 Be7 5.Bd3 b6 6.Nc3 Bb7 7.Nf3 Nbd7 8.O-O O-O 9.Ne2 c5 10.Ng3 Qc7 11.Ne5 Nxe5 12.Bxe5 Qc6 13.Qe2 a6 14.Nh5 Nxh5',
        task: {
          prompt: 'White to move: find Lasker’s combination.',
          accept: ['Bxh7+'],
          hint: 'Both bishops are aimed at the king.',
          explain: '15.Bxh7+! Kxh7 16.Qxh5+ Kg8 17.Bxg7! Kxg7 18.Qg4+ Kh7 19.Rf3 e5 20.Rh3+ Qh6 21.Rxh6+ Kxh6 22.Qd7 — and the double attack wins a bishop. The pattern still bears Lasker’s name.',
        },
      },
    ],
  },
  {
    id: 'defence-1',
    title: 'Defence: ask what your opponent wants',
    track: 'Attack & defence',
    level: 'Intermediate',
    minutes: 10,
    summary: 'Most lost games start with an ignored threat. The defensive habit: before every move, ask what the last move threatens.',
    sections: [
      {
        title: 'The question to ask every move',
        text: [
          'Before choosing your move, ask: “If I passed, what would my opponent play?” That shows the threat. Then choose among moves that parry it — preferably with tempo, or by improving a piece at the same time.',
          'Here White threatens Qe8+ Rxe8 Rxe8 mate: the back rank is weak.',
        ],
        fen: '3r2k1/ppq2ppp/8/8/8/8/PP2QPPP/4R1K1 b - - 0 1',
        orientation: 'b',
        task: {
          prompt: 'Black to move: deal with the threat.',
          accept: ['h6', 'g6', 'h5', 'Kf8', 'f6', 'Qd7', 'Qd6', 'Rf8', 'Qc8', 'Qb8'],
          hint: 'Give the king air, or cover e8.',
          explain: 'A move like …h6 (“luft”) ends back-rank tricks for good; covering e8 with the queen, or …Rf8, also holds. Careless moves lose at once — …Re8?? even allows Qxe8 mate.',
        },
      },
    ],
  },
  {
    id: 'stonewall',
    title: 'Structures II: the Stonewall',
    track: 'Pawn structures',
    level: 'Intermediate',
    minutes: 10,
    summary: 'Pawns on c6, d5, e6 and f5: a fortress with a hole on e5 and a bad light-squared bishop. How both sides play it.',
    openings: [],
    sections: [
      {
        title: 'The Dutch Stonewall',
        text: [
          'Black’s pawns on d5 and f5 give a firm grip on e4 — a knight there is a monster. The price: e5 is a permanent hole for White’s knight, and Black’s light-squared bishop is shut in.',
          'White’s plans: occupy e5, exchange dark-squared bishops (Ba3 or Bf4) to make e5 and the dark squares weaker still, and play on the queenside with b4–b5. Black’s plans: …Ne4, kingside play with …Qe8–h5 or …g5, and freeing the bishop via …b6/…Bb7 or …Bd7–e8–h5.',
        ],
        pgn: '1.d4 f5 2.c4 Nf6 3.g3 e6 4.Bg2 d5 5.Nf3 c6 6.O-O Bd6 7.b3 Qe7 8.Ne5 O-O 9.Bb2',
        orientation: 'b',
        explore: true,
      },
    ],
  },
  {
    id: 'benoni',
    title: 'Structures II: the Modern Benoni',
    track: 'Pawn structures',
    level: 'Advanced',
    minutes: 10,
    summary: 'A queenside majority for Black against a central majority for White — a race between …b5 and e4–e5.',
    sections: [
      {
        title: 'Majority against majority',
        text: [
          'After …exd5, White has a central majority (d5 plus e4, and f2) and Black a queenside majority (a-, b- and c-pawns against two). Black’s bishop on g7 is superb; White’s d5-pawn cramps Black.',
          'Black wants …a6 and …b5 to roll the queenside majority, with the rook on e8 pressing e4. White wants e4–e5 (prepared with f4 or Nd2–c4) to open the centre while Black’s pieces are on the queenside.',
        ],
        pgn: '1.d4 Nf6 2.c4 c5 3.d5 e6 4.Nc3 exd5 5.cxd5 d6 6.e4 g6 7.Nf3 Bg7 8.Be2 O-O 9.O-O Re8 10.Nd2',
        orientation: 'b',
        explore: true,
      },
    ],
  },
  {
    id: 'maroczy',
    title: 'Structures II: the Maróczy bind',
    track: 'Pawn structures',
    level: 'Advanced',
    minutes: 10,
    summary: 'White’s pawns on c4 and e4 clamp d5. Black plays for the …b5 and …f5 breaks, or trades pieces to ease the bind.',
    sections: [
      {
        title: 'Living with the bind',
        text: [
          'With pawns on c4 and e4, White stops …d5 for good and gains space. Black’s counterplay: trade a pair of knights with …Nxd4 to relieve the cramp, put the bishop on c6, and prepare …a5, …b5 or …f5.',
          'White’s plan is simple: keep everything covered, then expand with f4, b4 or c5 at the right moment. Trades usually help the side with less space — Black.',
        ],
        pgn: '1.e4 c5 2.Nf3 Nc6 3.d4 cxd4 4.Nxd4 g6 5.c4 Bg7 6.Be3 Nf6 7.Nc3 O-O 8.Be2 d6 9.O-O Bd7',
        explore: true,
      },
    ],
  },
  {
    id: 'carlsbad-black',
    title: 'Structures II: the Carlsbad from Black’s side',
    track: 'Pawn structures',
    level: 'Advanced',
    minutes: 10,
    summary: 'Against the minority attack, Black’s best answer is often a kingside attack: …Ne4, …f5 and the rook lift.',
    sections: [
      {
        title: 'Counter-attack on the kingside',
        text: [
          'White’s minority attack (b4–b5) creates a weak pawn on c6 or d5 — slow but strong. Black shouldn’t wait for it. The knight jumps to e4, supported by …f5 if needed, and the rooks swing over via e6 to h6 or g6.',
          'The structure gives Black a half-open e-file and a solid d5-pawn; the knight on e4 can’t easily be challenged because White’s f-pawn is needed at home.',
        ],
        pgn: '1.d4 d5 2.c4 e6 3.Nc3 Nf6 4.cxd5 exd5 5.Bg5 c6 6.e3 Be7 7.Bd3 Nbd7 8.Qc2 O-O 9.Nge2 Re8 10.O-O Nf8 11.f3',
        orientation: 'b',
        explore: true,
      },
    ],
  },
];
