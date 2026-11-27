/**
 * Endgame course: technique lessons (shown with the normal lesson player) plus
 * goal-based drills played out against the engine. Every position and claim
 * here is checked by scripts/validate-endgames.ts.
 */
import type { Color } from '../lib/chess/core';
import type { Lesson } from '../lib/lessons/types';

export type DrillGoal = 'mate' | 'win' | 'draw';

export interface EndgameDrill {
  id: string;
  title: string;
  fen: string;
  /** The side you play. */
  side: Color;
  goal: DrillGoal;
  /** Draw drills: hold this many of your own moves (or reach a drawn result). */
  survive?: number;
  /** Fail when the evaluation, from your side, drops below this (pawns). */
  holdAbove?: number;
  task: string;
  hint: string;
  /** Shown when you pass. */
  idea: string;
}

export interface EndgameChapter {
  id: string;
  title: string;
  blurb: string;
  lessons: string[];
  drills: EndgameDrill[];
}

export const ENDGAME_LESSONS: Lesson[] = [
  {
    id: 'eg-basic-mates',
    title: 'Mating with queen and rook',
    track: 'Endgames',
    level: 'Intermediate',
    minutes: 8,
    summary: 'Shrink the box, bring the king, and never give stalemate — the two mates you must be able to play at speed.',
    sections: [
      {
        title: 'The queen: shrink the box',
        text: [
          'The queen can fence the enemy king in on her own. Keep her a knight’s move away from the king and follow it: every time it steps, the box gets smaller. Once the king is on the edge, stop chasing and walk your own king over — the queen can’t mate alone.',
          'The danger is stalemate. When the defending king is down to two or three squares, check every move: does it still have a legal move?',
        ],
        fen: 'k7/8/1K6/8/8/8/8/2Q5 w - - 0 1',
        task: {
          prompt: 'White to move: mate in one — and don’t stalemate.',
          accept: ['Qc8#'],
          hint: 'The king has no squares at all. You need a move that also gives check.',
          explain:
            'Qc8# checks along the back rank while your king covers a7 and b7. The tempting Qc7?? takes away b8 without check: Black has no legal move and it’s stalemate.',
        },
        drill: 'kqk',
      },
      {
        title: 'The rook: the box method',
        text: [
          'With a rook, cut the king off along a rank or file, then shrink that box one line at a time. When the rook is attacked, move it to the far side of the board; when there’s nothing to shrink, bring your king up so it faces the enemy king (the opposition).',
          'Mate comes on the edge, with the kings facing each other and the rook checking along the edge.',
        ],
        fen: '4k3/8/4K3/8/8/8/8/R7 w - - 0 1',
        task: {
          prompt: 'White to move: finish it.',
          accept: ['Ra8#'],
          hint: 'The kings face each other. Which line is left?',
          explain: 'Ra8# — the rook covers the whole back rank and your king takes d7, e7 and f7. This is the picture to aim for from the start.',
        },
        drill: 'krk',
      },
    ],
  },
  {
    id: 'eg-two-bishops',
    title: 'Mate with two bishops',
    track: 'Endgames',
    level: 'Intermediate',
    minutes: 8,
    summary: 'Side-by-side bishops form a wall the king can’t cross. Push it to the edge, then into any corner.',
    sections: [
      {
        title: 'A wall of two diagonals',
        text: [
          'Two bishops next to each other (on e3 and e4, say) cover two adjacent diagonals: a wall the king cannot cross. Move them in tandem like a rook, use your king to take squares the bishops can’t, and drive the defender toward the edge.',
          'Unlike bishop and knight, any corner will do. Keep your king close — about a knight’s move from the enemy king — and keep checking for stalemate once it’s cornered.',
        ],
        fen: '8/8/8/4k3/8/8/8/2B1KB2 w - - 0 1',
        drill: 'kbbk',
      },
      {
        title: 'The final picture',
        text: [
          'In the corner, one bishop takes the last flight square while the other delivers check along the long diagonal; your king covers the rest.',
        ],
        fen: '7k/8/4B1K1/8/8/8/3B4/8 w - - 0 1',
        task: {
          prompt: 'White to move: mate in one.',
          accept: ['Bc3#'],
          hint: 'The light-squared bishop already guards g8. The dark one needs to reach the long diagonal.',
          explain: 'Bc3# checks along c3–h8. g8 is covered by the bishop on e6, g7 and h7 by your king.',
        },
      },
    ],
  },
  {
    id: 'eg-bishop-knight',
    title: 'Mate with bishop and knight',
    track: 'Endgames',
    level: 'Advanced',
    minutes: 15,
    summary: 'The hardest basic mate: it only works in a corner of the bishop’s colour, so you must know how to herd the king there.',
    sections: [
      {
        title: 'Only the bishop’s corner',
        text: [
          'Bishop and knight can only force mate in a corner the bishop controls — a8 or h1 for a light-squared bishop, a1 or h8 for a dark-squared one. A good defender runs for the other corners, so the technique is about driving him from the wrong corner to the right one.',
          'It takes up to 33 moves with best play, so the 50-move rule matters: practise until the pattern is automatic.',
        ],
        fen: '8/8/8/3k4/8/8/8/1N2KB2 w - - 0 1',
        drill: 'kbnk-full',
      },
      {
        title: 'The final net',
        text: [
          'Here the king is already in a8 — the bishop’s corner. The knight heads for a6 or c7 to take b8, and the bishop gives the last check on the long diagonal.',
        ],
        fen: 'k7/8/1K6/8/8/8/8/3BN3 w - - 0 1',
        task: {
          prompt: 'White mates in five. Start the net.',
          accept: ['Nd3', 'Bg4', 'Nc2'],
          hint: 'The knight wants to reach a6 by way of b4; the bishop needs a quiet waiting square.',
          explain:
            '1.Nd3 Kb8 2.Bg4 Ka8 3.Nb4 Kb8 4.Na6+ Ka8 5.Bf3#. Bg4 and Nc2 first lead to the same mate: the bishop’s waiting move hands Black the move so the king has to step back into the corner.',
        },
        drill: 'kbnk-final',
      },
      {
        title: 'Out of the wrong corner',
        text: [
          'Now the king sits in h8, a dark corner, and the bishop is light-squared. Keep your king on f6 or f7 so the defender can’t run back to the centre, take g8 with the bishop, and use the knight (via e5, g6 or f7) to take the squares the bishop can’t.',
          'Then push the king along the eighth rank toward a8 with bishop checks while the knight follows in a W-shaped path (f7, e5, d7, c5, b7 in the classic version). Expect about 25 moves with best play.',
        ],
        fen: '7k/8/5K2/8/8/8/8/3BN3 w - - 0 1',
        arrows: ['b:d1b3'],
        drill: 'kbnk-w',
      },
    ],
  },
  {
    id: 'eg-opposition',
    title: 'King and pawn: square, key squares, opposition',
    track: 'Endgames',
    level: 'Intermediate',
    minutes: 15,
    summary: 'The three ideas behind every pawn ending — and Réti’s famous study that combines them.',
    sections: [
      {
        title: 'The rule of the square',
        text: [
          'Draw a square from the pawn to its queening rank. If the defending king can step inside it on its move, it catches the pawn; if not, the pawn queens.',
        ],
        fen: '8/8/8/p7/5K2/8/8/7k w - - 0 1',
        marks: ['a5', 'a1', 'e1', 'e5'],
        task: {
          prompt: 'White to move: catch the a-pawn.',
          accept: ['Ke4', 'Ke5', 'Ke3'],
          hint: 'The square runs from a5 to a1 to e1 to e5. Get on the e-file.',
          explain:
            'Ke3, Ke4 or Ke5 steps into the square and the pawn falls. With Black to move, …a4 would shrink the square first and the pawn would run home.',
        },
      },
      {
        title: 'Réti: chasing two hares',
        text: [
          'A king walking diagonally reaches the same rank as one walking straight — but it can aim at two targets at once. Réti’s 1921 study is the most famous proof.',
        ],
        fen: '7K/8/k1P5/7p/8/8/8/8 w - - 0 1',
        task: {
          prompt: 'White to move and draw.',
          accept: ['Kg7'],
          hint: 'You can’t catch the pawn by chasing it in a straight line. Head for the centre too.',
          explain:
            '1.Kg7! h4 2.Kf6 h3 3.Ke7 h2 4.c7 and both sides queen. If 1…Kb6 2.Kf6 h4 3.Ke5: now 3…Kxc6 4.Kf4 catches the pawn, and 3…h3 4.Kd6 supports c7. Every other first move loses.',
        },
        drill: 'reti',
      },
      {
        title: 'Key squares',
        text: [
          'Every pawn has key squares: if the stronger king reaches one, the pawn queens by force. For a pawn on its second, third or fourth rank, they are the three squares two ranks in front of it — here d4, e4 and f4.',
        ],
        fen: '8/8/4k3/8/8/4K3/4P3/8 w - - 0 1',
        marks: ['d4', 'e4', 'f4'],
        task: {
          prompt: 'White to move: make the win certain.',
          accept: ['Kd4', 'Ke4', 'Kf4'],
          hint: 'Step onto a key square right now.',
          explain: 'Kd4, Ke4 or Kf4 reaches a key square and the pawn will queen whatever Black does. The king leads, the pawn follows.',
        },
        drill: 'opp-win',
      },
      {
        title: 'The opposition',
        text: [
          'The defender keeps the attacking king off the key squares with the opposition: the kings face each other with one square between them, and the attacker has to move. Then wherever the attacking king goes, the defending king mirrors it.',
        ],
        fen: '8/8/4k3/8/8/4K3/4P3/8 b - - 0 1',
        orientation: 'b',
        task: {
          prompt: 'Black to move: hold the draw.',
          accept: ['Ke5'],
          hint: 'Face the White king with one square between you.',
          explain:
            '1…Ke5! takes the opposition: on 2.Kd3 Kd5 or 2.Kf3 Kf5 Black mirrors, and when White pushes the pawn Black keeps facing the king. Any other move lets the White king reach d4, e4 or f4.',
        },
        drill: 'opp-defend',
      },
    ],
  },
  {
    id: 'eg-pawn-majorities',
    title: 'Unbalanced pawns: majorities and passers',
    track: 'Endgames',
    level: 'Advanced',
    minutes: 15,
    summary: 'Outside passers, protected passers, breakthroughs and healthy versus crippled majorities — why pawn count alone tells you little.',
    sections: [
      {
        title: 'The outside passed pawn',
        text: [
          'A passed pawn far from the other pawns is a decoy. The defending king must go and stop it, and while it does, your king walks into the other wing and eats everything there.',
        ],
        fen: '8/5ppp/4k3/8/P7/4K3/5PPP/8 w - - 0 1',
        task: {
          prompt: 'White to move: start the winning plan.',
          accept: ['a5', 'Kd4', 'h4'],
          hint: 'Make Black’s king commit to the a-pawn.',
          explain:
            '1.a5 drags the king toward the queenside (1…Kd6 2.Ke4 Kc7). White’s king then marches to f5 or e5 and into the kingside pawns. Improving the king first (Kd4) or fixing the kingside (h4) comes to the same thing — the a-pawn will do the decoy work later.',
        },
        drill: 'outside-passer',
      },
      {
        title: 'The breakthrough',
        text: [
          'Three pawns against three, all blocked — but if the defending king is far away, a pawn sacrifice can tear a hole and let one pawn run.',
        ],
        fen: '8/ppp5/8/PPP5/8/7k/8/7K w - - 0 1',
        task: {
          prompt: 'White to move and queen a pawn.',
          accept: ['b6'],
          hint: 'Sacrifice the middle pawn.',
          explain:
            '1.b6! cxb6 2.a6! bxa6 3.c6 and the c-pawn runs through. If 1…axb6 2.c6! bxc6 3.a6. Only the middle pawn works: the side pawns give Black a defence.',
        },
        drill: 'breakthrough',
      },
      {
        title: 'The protected passed pawn',
        text: [
          'A passed pawn protected by another pawn can never be taken by the king. The defender’s king is chained to it for ever, while yours is free to go anywhere — usually that alone decides the game.',
        ],
        fen: '8/8/2k5/1pP5/1P6/3K4/8/8 w - - 0 1',
        drill: 'protected',
      },
      {
        title: 'Healthy majority, crippled majority',
        text: [
          'This is the pawn ending from the Exchange Ruy Lopez. Material is equal, but White’s four-against-three on the kingside can make a passed pawn, while Black’s four-against-three on the queenside can’t — the doubled c-pawns are worth one pawn there. That is why the exchange variation aims for endgames, and why the ending is a big edge for White.',
          'Rule of thumb when you push a majority: advance the candidate — the pawn with no enemy pawn in front of it — first, and keep the others behind it as support.',
        ],
        fen: '8/ppp2ppp/2p1k3/8/4P3/4K3/PPP2PPP/8 w - - 0 1',
        practice: { side: 'w', prompt: 'Play this ending against the coach' },
      },
    ],
  },
  {
    id: 'eg-queen-vs-pawn',
    title: 'Queen against a pawn on the seventh',
    track: 'Endgames',
    level: 'Advanced',
    minutes: 10,
    summary: 'Against a centre or knight pawn the queen wins by a staircase of checks; against a bishop or rook pawn, stalemate saves the defender.',
    sections: [
      {
        title: 'Centre pawns: the staircase',
        text: [
          'The method: check or pin until the defending king has to step in front of its own pawn. That gains one tempo — use it to bring your king a step closer, and repeat until it arrives.',
        ],
        fen: 'K7/8/8/8/8/8/3pk3/6Q1 w - - 0 1',
        task: {
          prompt: 'White to move: begin the staircase.',
          accept: ['Qh2+', 'Qg2+'],
          hint: 'Check from the side so the king must stay near d1.',
          explain:
            'Qh2+ or Qg2+ starts herding the king. Each time it is forced onto d1, the pawn is blocked and White’s king takes a step toward the action until the pawn falls.',
        },
        drill: 'q-vs-d',
      },
      {
        title: 'Bishop and rook pawns: the stalemate trick',
        text: [
          'With a c-pawn, the defending king answers checks by heading for the corner: if the queen ever takes the pawn on c2 while the king sits on a1, it is stalemate. With an a-pawn, the king hides in front of it on a1 or b1 with the same effect.',
          'Unless the attacking king is already close, these are draws — so as the defender, run toward the corner, not away from it.',
        ],
        fen: 'K7/8/8/8/8/8/2pk4/6Q1 w - - 0 1',
        orientation: 'b',
        drill: 'q-vs-c',
      },
    ],
  },
  {
    id: 'eg-fortress',
    title: 'Fortresses: rook pawns and the wrong bishop',
    track: 'Endgames',
    level: 'Intermediate',
    minutes: 8,
    summary: 'Positions where extra material can’t win — essential to save lost-looking games and to avoid trading into a draw.',
    sections: [
      {
        title: 'The rook pawn',
        text: [
          'King and rook pawn against king is a draw whenever the defending king reaches the corner in front of the pawn: it can never be driven out without stalemate.',
        ],
        fen: '8/8/8/8/4k3/8/6KP/8 b - - 0 1',
        orientation: 'b',
      },
      {
        title: 'The wrong bishop',
        text: [
          'Add a bishop of the wrong colour — one that can’t control the queening square — and it is still a draw. The defending king sits on h8 and the bishop can never chase it away.',
          'So when you are a piece and a rook pawn up, check the colour of the corner before you trade everything else.',
        ],
        fen: '8/8/8/4k3/8/8/6BP/6K1 b - - 0 1',
        orientation: 'b',
        task: {
          prompt: 'Black to move: reach the fortress.',
          accept: ['Kf6', 'Kf5', 'Kf4'],
          hint: 'h8 is a dark square; the bishop lives on light ones.',
          explain: 'The king heads for the corner — f6, g7, h8 are all dark squares the bishop can never cover. Once there, Black just shuffles between h8 and g8 (or h7).',
        },
        drill: 'wrong-bishop',
      },
    ],
  },
  {
    id: 'eg-rook-endings-2',
    title: 'Rook endings II: cut-offs, Vancura, rook behind the pawn',
    track: 'Endgames',
    level: 'Advanced',
    minutes: 14,
    summary: 'Rook against pawn, the Vancura defence against a rook pawn, four against three on one side, and why rooks belong behind passed pawns.',
    sections: [
      {
        title: 'Rook against pawn: the cut-off',
        text: [
          'A rook beats a lone pawn when the defending king can’t escort it. Here the rook on the e-file already cuts the Black king off from the e-file side, so it can’t get in front of the pawn’s path from there — your king simply walks over and the pawn falls.',
          'The rule of thumb: count whether your king reaches the pawn before it queens, and keep the rook where it cuts the enemy king off.',
        ],
        fen: '8/8/8/3k4/3p4/8/1K6/4R3 w - - 0 1',
        task: {
          prompt: 'White to move and win.',
          accept: ['Re8', 'Kc1', 'Kc2'],
          hint: 'Keep the cut-off on the e-file and bring the king.',
          explain: 'Re8 or a king move to c1/c2 wins: the e-file stays closed to the Black king, so it can’t support the pawn from the side, and White’s king arrives in time to win it.',
        },
        drill: 'rook-vs-pawn',
      },
      {
        title: 'The Vancura defence',
        text: [
          'A rook pawn on the sixth with the attacking rook in front of it (Ra8, a6) looks dangerous, but it’s a draw if the defender attacks the pawn from the side — rook on the sixth rank — with the king near g7.',
          'The side-on rook pins White’s rook to the pawn and checks the king away if it comes to help. Two traps: taking the pawn when White’s rook guards it (…Rxa6?? Rxa6) and letting the rook be cut off from the sixth rank.',
        ],
        fen: 'R7/6k1/P4r2/8/8/8/7K/8 b - - 0 1',
        orientation: 'b',
        task: {
          prompt: 'Black to move: keep the draw.',
          accept: ['Rg6', 'Re6', 'Rf3', 'Rf7', 'Kh7'],
          hint: 'Stay on the side of the pawn; don’t take it while it’s guarded.',
          explain: 'Moves like …Rg6 or …Re6 keep the rook on the sixth rank, attacking a6 from the side; if White’s king approaches, check it from the side. …Rxa6?? loses the rook to Rxa6.',
        },
        drill: 'vancura',
      },
      {
        title: 'Four against three on one side',
        text: [
          'An extra pawn with all the pawns on one wing is usually a draw in a rook ending. The defender keeps the pawns on the dark/light squares where they can’t be attacked easily, stays active with the rook, and avoids trading into a lost king-and-pawn ending.',
        ],
        fen: '3r2k1/5ppp/8/8/8/4P2P/2R2PP1/6K1 b - - 0 1',
        orientation: 'b',
        drill: 'four-vs-three',
      },
      {
        title: 'Rooks belong behind passed pawns',
        text: [
          'Tarrasch’s rule: a rook behind a passed pawn gains activity as the pawn advances; a rook in front of it (here Black’s on a7) becomes more and more passive. With the enemy rook tied to the a-pawn, White’s king walks into the kingside and wins pawns there.',
        ],
        fen: '8/r4pk1/P5p1/7p/7P/6P1/5PK1/R7 w - - 0 1',
        drill: 'rook-behind',
      },
    ],
  },
  {
    id: 'eg-minor-pieces',
    title: 'Minor pieces: bishops, fortresses and the rook against a minor piece',
    track: 'Endgames',
    level: 'Advanced',
    minutes: 12,
    summary: 'The right and wrong bishop, the opposite-coloured bishop fortress, and how to hold rook against bishop or knight.',
    sections: [
      {
        title: 'The right bishop',
        text: ['With a bishop that controls the queening square (here h8 is dark, like the bishop), the rook pawn wins: the defending king can be driven out of the corner. Compare the wrong-bishop fortress in the previous chapter.'],
        fen: '7k/8/8/5K1P/8/8/8/2B5 w - - 0 1',
        task: {
          prompt: 'White to move and win.',
          accept: ['Kg6', 'h6', 'Kf6'],
          hint: 'Take the g-file squares from the king and use the bishop to cover the corner.',
          explain: 'Kg6 (fastest), h6 or Kf6 all lead to mate: the bishop takes away g7 and h8 at the right moment, the pawn advances and the king is mated or the pawn queens.',
        },
        drill: 'right-bishop',
      },
      {
        title: 'Opposite-coloured bishops: the fortress',
        text: [
          'With bishops of opposite colours, even two extra pawns often don’t win. The defender blockades with the king on one pawn and the bishop on the other’s path — on squares the attacking bishop can never challenge.',
          'Here Black’s king holds f6 and the bishop sits on the dark diagonal stopping e4–e5. White can shuffle for ever.',
        ],
        fen: '8/8/5k2/4bP2/4P3/3K4/4B3/8 b - - 0 1',
        orientation: 'b',
        drill: 'ocb-fortress',
      },
      {
        title: 'Rook against bishop',
        text: [
          'Rook against bishop is usually a draw. The defending king heads for the corner the bishop does not control (here h8, a dark corner, with a light-squared bishop): checks along the back rank can be blocked by the bishop, and stalemate tricks appear. In the other corner the defence is much harder.',
        ],
        fen: '7k/8/6K1/8/2b5/8/8/R7 b - - 0 1',
        orientation: 'b',
        drill: 'r-vs-b',
      },
      {
        title: 'Rook against knight',
        text: ['Also a draw with correct play — as long as the knight stays next to its king. A knight that wanders away gets cut off and trapped.'],
        fen: '8/8/8/4k3/4n3/8/8/R3K3 b - - 0 1',
        orientation: 'b',
        drill: 'r-vs-n',
      },
    ],
  },
  {
    id: 'eg-pawn-races',
    title: 'Pawn races: who queens with tempo',
    track: 'Endgames',
    level: 'Intermediate',
    minutes: 6,
    summary: 'When both sides queen, the first new queen can sometimes win the other straight away. Count the moves, then look at the geometry.',
    sections: [
      {
        title: 'Queen first, then win the other queen',
        text: [
          'Both pawns run. White queens first — on a8, on the same long diagonal as h1 where Black will queen. So Black’s new queen would be lost at once, and White wins.',
          'In any race, count the moves to queen, then ask: does my new queen check, or attack the square where theirs appears?',
        ],
        fen: '8/8/P7/4k3/8/4K2p/8/8 w - - 0 1',
        task: {
          prompt: 'White to move and win.',
          accept: ['a7', 'Kf2', 'Kf3'],
          hint: 'Count: who queens first, and where?',
          explain: '1.a7 h2 2.a8=Q h1=Q 3.Qxh1 — the a8-queen controls the long diagonal. Stopping the pawn with the king (Kf2/Kf3) also wins, but the race is quicker.',
        },
        drill: 'race',
      },
    ],
  },
];

export const ENDGAME_CHAPTERS: EndgameChapter[] = [
  {
    id: 'mates',
    title: 'Basic mates',
    blurb: 'Queen, rook, two bishops, bishop and knight. Mate a defending engine before the 50-move rule.',
    lessons: ['eg-basic-mates', 'eg-two-bishops', 'eg-bishop-knight'],
    drills: [
      { id: 'kqk', title: 'Queen mate', fen: '8/8/8/4k3/8/8/8/1Q2K3 w - - 0 1', side: 'w', goal: 'mate', task: 'Mate with king and queen.', hint: 'Queen a knight’s move from the king, follow it, then bring your king. Watch for stalemate.', idea: 'Box, edge, king up, mate — about ten moves when done cleanly.' },
      { id: 'krk', title: 'Rook mate', fen: '8/8/8/4k3/8/8/8/R3K3 w - - 0 1', side: 'w', goal: 'mate', task: 'Mate with king and rook.', hint: 'Cut the king off, shrink the box, and use your king to take the opposition.', idea: 'The box method: never let the box grow, and use waiting rook moves to hand over the move.' },
      { id: 'kbbk', title: 'Two bishops', fen: '8/8/8/4k3/8/8/8/2B1KB2 w - - 0 1', side: 'w', goal: 'mate', task: 'Mate with two bishops.', hint: 'Put the bishops side by side as a wall and bring the king up behind them.', idea: 'Bishops in tandem act like a rook; any corner is a mating corner.' },
      { id: 'kbnk-final', title: 'Bishop & knight: final net', fen: 'k7/8/1K6/8/8/8/8/3BN3 w - - 0 1', side: 'w', goal: 'mate', task: 'The king is in the right corner. Mate it.', hint: 'Knight to b4 and a6; the bishop gives the final check on the long diagonal.', idea: 'Knight takes b8, king takes a7 and b7, bishop mates.' },
      { id: 'kbnk-w', title: 'Bishop & knight: wrong corner', fen: '7k/8/5K2/8/8/8/8/3BN3 w - - 0 1', side: 'w', goal: 'mate', task: 'Drive the king from h8 to a light corner and mate it.', hint: 'Take g8 with the bishop, keep your king on f6/f7, and walk the knight in a W along the edge.', idea: 'Herding along the edge: the bishop checks, the knight shadows, your king holds the rank.' },
      { id: 'kbnk-full', title: 'Bishop & knight: from scratch', fen: '8/8/8/3k4/8/8/8/1N2KB2 w - - 0 1', side: 'w', goal: 'mate', task: 'Mate with bishop and knight from the middle of the board.', hint: 'Push the king to the edge first; then drive it to a8 or h1 (the bishop’s colour).', idea: 'You did the hardest basic mate — the 50-move rule is no longer a worry.' },
    ],
  },
  {
    id: 'kp',
    title: 'King and pawn',
    blurb: 'The square, key squares, opposition — and Réti’s diagonal king walk.',
    lessons: ['eg-opposition'],
    drills: [
      { id: 'reti', title: 'Réti’s study', fen: '7K/8/k1P5/7p/8/8/8/8 w - - 0 1', side: 'w', goal: 'draw', survive: 10, holdAbove: -2, task: 'White to move and draw.', hint: 'Walk diagonally: chase the pawn and support your own at the same time.', idea: 'The king’s diagonal walk served two goals — the heart of Réti’s study.' },
      { id: 'opp-win', title: 'Key squares: win it', fen: '8/8/4k3/8/8/4K3/4P3/8 w - - 0 1', side: 'w', goal: 'win', holdAbove: 0.35, task: 'Win: queen the pawn.', hint: 'Get your king to d4, e4 or f4 before pushing the pawn.', idea: 'King on a key square first, pawn second.' },
      { id: 'opp-defend', title: 'Opposition: hold it', fen: '8/8/4k3/8/8/4K3/4P3/8 b - - 0 1', side: 'b', goal: 'draw', survive: 15, holdAbove: -2, task: 'Black to move: hold the draw.', hint: 'Take the opposition and keep it. When you have to retreat, step straight back so you can face the king again after the pawn moves.', idea: 'Opposition, mirroring, and the stalemate at the end.' },
    ],
  },
  {
    id: 'unbalanced',
    title: 'Unbalanced pawns',
    blurb: 'Outside and protected passers, breakthroughs and majorities.',
    lessons: ['eg-pawn-majorities'],
    drills: [
      { id: 'outside-passer', title: 'Outside passed pawn', fen: '8/5ppp/4k3/8/P7/4K3/5PPP/8 w - - 0 1', side: 'w', goal: 'win', holdAbove: 0.35, task: 'Win with the outside passer.', hint: 'Use the a-pawn as a decoy and invade the kingside with your king.', idea: 'The decoy drew the king away and your king did the rest.' },
      { id: 'breakthrough', title: 'Breakthrough', fen: '8/ppp5/8/PPP5/8/7k/8/7K w - - 0 1', side: 'w', goal: 'win', holdAbove: 0.35, task: 'Queen a pawn.', hint: 'Sacrifice the middle pawn first.', idea: 'b6!, then a6 or c6 — the classic three-pawn breakthrough.' },
      { id: 'protected', title: 'Protected passer', fen: '8/8/2k5/1pP5/1P6/3K4/8/8 w - - 0 1', side: 'w', goal: 'win', holdAbove: 0.35, task: 'Win with the protected passed pawn.', hint: 'Black’s king must guard c5’s path. Use your king to win b5 or escort the pawn.', idea: 'A protected passer ties the enemy king down for ever.' },
    ],
  },
  {
    id: 'queen',
    title: 'Queen vs pawn & fortresses',
    blurb: 'When the queen wins, when stalemate saves you, and the wrong bishop.',
    lessons: ['eg-queen-vs-pawn', 'eg-fortress'],
    drills: [
      { id: 'q-vs-d', title: 'Queen vs centre pawn', fen: 'K7/8/8/8/8/8/3pk3/6Q1 w - - 0 1', side: 'w', goal: 'win', holdAbove: 0.35, task: 'Win the pawn and keep the queen.', hint: 'Check until the king must stand on d1, then bring your king one step closer.', idea: 'The staircase: force the king in front of the pawn, gain a tempo, repeat.' },
      { id: 'q-vs-c', title: 'Stalemate defence', fen: 'K7/8/8/8/8/8/2pk4/6Q1 w - - 0 1', side: 'b', goal: 'draw', survive: 16, holdAbove: -5, task: 'You have the c-pawn. Hold the draw against the queen.', hint: 'When checked, head for the corner: if the queen takes c2 while you are on a1, it’s stalemate.', idea: 'Bishop pawns (and rook pawns) draw against a lone queen when the attacking king is far.' },
      { id: 'wrong-bishop', title: 'Wrong bishop', fen: '8/8/8/4k3/8/8/6BP/6K1 b - - 0 1', side: 'b', goal: 'draw', survive: 15, holdAbove: -3, task: 'A piece and a pawn down. Draw.', hint: 'Get to h8 — the light-squared bishop can never cover it.', idea: 'Wrong-colour bishop plus rook pawn: a fortress.' },
    ],
  },
  {
    id: 'rook',
    title: 'Rook endings',
    blurb: 'Lucena and Philidor — the two positions every rook ending revolves around.',
    lessons: ['rook-endgames'],
    drills: [
      { id: 'lucena', title: 'Lucena: build a bridge', fen: '1K6/1P1k4/8/8/8/8/r7/2R5 w - - 0 1', side: 'w', goal: 'win', holdAbove: 0.35, task: 'Queen the b-pawn.', hint: 'Cut the king off with a check, bring your rook to the fourth rank, then walk your king out.', idea: 'The bridge: the rook on the fourth rank blocks the checks.' },
      { id: 'philidor', title: 'Philidor: third-rank defence', fen: '4k3/8/r7/4PK2/8/8/8/1R6 b - - 0 1', side: 'b', goal: 'draw', survive: 20, holdAbove: -2.5, task: 'Black to move: hold the draw.', hint: 'Rook on the sixth rank until the pawn advances; then check from behind.', idea: 'Third rank first, checks from behind once the pawn steps forward.' },
    ],
  },
  {
    id: 'rook2',
    title: 'Rook endings II',
    blurb: 'Rook against pawn, the Vancura, four against three, and the rook behind the passed pawn.',
    lessons: ['eg-rook-endings-2'],
    drills: [
      { id: 'rook-vs-pawn', title: 'Rook against pawn', fen: '8/8/8/3k4/3p4/8/1K6/4R3 w - - 0 1', side: 'w', goal: 'win', holdAbove: 0.35, task: 'Win the pawn.', hint: 'Keep the Black king cut off along the e-file and bring your king.', idea: 'Cut the king off, bring your own: the rook wins against a pawn the king can’t escort.' },
      { id: 'vancura', title: 'The Vancura', fen: 'R7/6k1/P4r2/8/8/8/7K/8 b - - 0 1', side: 'b', goal: 'draw', survive: 20, holdAbove: -2.5, task: 'Hold the draw against the a-pawn.', hint: 'Rook on the sixth rank attacking a6 from the side; check the king if it comes close. Don’t take the pawn while it’s guarded.', idea: 'The side-on rook pins White’s rook to the pawn: the Vancura draw.' },
      { id: 'four-vs-three', title: 'Four against three', fen: '3r2k1/5ppp/8/8/8/4P2P/2R2PP1/6K1 b - - 0 1', side: 'b', goal: 'draw', survive: 20, holdAbove: -2.5, task: 'A pawn down, all on one side. Draw.', hint: 'Keep your rook active and your pawns compact; don’t trade into a lost pawn ending.', idea: 'An extra pawn on the same wing rarely wins a rook ending.' },
      { id: 'rook-behind', title: 'Rook behind the passer', fen: '8/r4pk1/P5p1/7p/7P/6P1/5PK1/R7 w - - 0 1', side: 'w', goal: 'win', holdAbove: 0.35, task: 'Convert the a-pawn.', hint: 'Black’s rook is tied to the pawn. March your king to the kingside pawns.', idea: 'Tarrasch’s rule: the rook behind the passer grows stronger, the rook in front grows weaker.' },
    ],
  },
  {
    id: 'minor',
    title: 'Minor pieces',
    blurb: 'The right bishop, the opposite-coloured fortress, and holding a rook with a bishop or a knight.',
    lessons: ['eg-minor-pieces', 'eg-pawn-races'],
    drills: [
      { id: 'right-bishop', title: 'The right bishop', fen: '7k/8/8/5K1P/8/8/8/2B5 w - - 0 1', side: 'w', goal: 'mate', task: 'Win with bishop and rook pawn.', hint: 'Your bishop controls h8: drive the king out with king and bishop, then push.', idea: 'Right-coloured bishop: the corner can’t hold.' },
      { id: 'ocb-fortress', title: 'Opposite bishops fortress', fen: '8/8/5k2/4bP2/4P3/3K4/4B3/8 b - - 0 1', side: 'b', goal: 'draw', survive: 20, holdAbove: -2.5, task: 'Two pawns down. Hold the fortress.', hint: 'King blocks f6/f7, bishop guards the e5 square on the dark diagonal. Don’t let the pawns get connected with support.', idea: 'Opposite-coloured bishops: blockade on your bishop’s colour.' },
      { id: 'r-vs-b', title: 'Rook against bishop', fen: '7k/8/6K1/8/2b5/8/8/R7 b - - 0 1', side: 'b', goal: 'draw', survive: 20, holdAbove: -4, task: 'Hold with the bishop.', hint: 'Stay in the corner the bishop doesn’t control; block back-rank checks with the bishop.', idea: 'The safe corner: opposite colour to your bishop.' },
      { id: 'r-vs-n', title: 'Rook against knight', fen: '8/8/8/4k3/4n3/8/8/R3K3 b - - 0 1', side: 'b', goal: 'draw', survive: 20, holdAbove: -4, task: 'Hold with the knight.', hint: 'Keep the knight next to your king.', idea: 'A knight beside its king can’t be trapped.' },
      { id: 'race', title: 'Pawn race', fen: '8/8/P7/4k3/8/4K2p/8/8 w - - 0 1', side: 'w', goal: 'win', holdAbove: 0.35, task: 'Win the race.', hint: 'Count the moves — and look at the long diagonal.', idea: 'Queen first on the long diagonal: the other queen falls the moment it appears.' },
    ],
  },
];

export const ALL_DRILLS: EndgameDrill[] = ENDGAME_CHAPTERS.flatMap((c) => c.drills);

export function getDrill(id: string) {
  return ALL_DRILLS.find((d) => d.id === id);
}

export function chapterOf(drillId: string) {
  return ENDGAME_CHAPTERS.find((c) => c.drills.some((d) => d.id === drillId));
}
