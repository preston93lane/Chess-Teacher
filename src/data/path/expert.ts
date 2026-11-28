import type { Level } from '../../lib/path/types';
import { choice, line, puzzles, say } from './helpers';

export const expert: Level = {
  id: 'expert',
  title: 'Expert',
  range: [1500, 2000],
  band: [1500, 2150],
  pitch: 'Deep combinations, real defence, positional judgement and endgame technique — the road to 2000.',
  units: [
    {
      id: 'x1',
      title: 'Hidden combinations',
      about: 'Clearance, interference, x-rays and desperados.',
      themes: ['clearance', 'interference', 'xRayAttack'],
      lessons: [
        {
          id: 'x1-1',
          title: 'Clearance',
          blurb: 'Get out of your own way',
          concept: 'calculation',
          steps: [
            say('Clearance: a piece moves — often with a sacrifice or a check — just to free a square or a line for another piece. When you see a perfect square occupied by your own piece, ask how to vacate it with tempo.', { mood: 'think' }),
            choice('What does a clearance sacrifice give up material for?', ['A square or line for another piece', 'A pawn structure', 'Time on the clock'], 0, 'The sacrificed piece was in the way. What matters is the piece that uses the square next.'),
            puzzles('Clearance.', ['clearance'], 4),
          ],
        },
        {
          id: 'x1-2',
          title: 'Interference',
          blurb: 'Cut the defender’s line',
          concept: 'defender',
          steps: [
            say('Interference drops a piece between a defender and what it protects. Two enemy pieces guarding each other along a line are the target: block the line on the square where both lines cross.', { mood: 'wow' }),
            puzzles('Interference.', ['interference'], 4),
          ],
        },
        {
          id: 'x1-3',
          title: 'X-rays and desperados',
          blurb: 'Attacks through pieces',
          concept: 'calculation',
          steps: [
            say('X-ray: a rook or bishop still defends a square through an enemy piece once that piece is exchanged off. Desperado: a piece that is lost anyway grabs as much as it can before it goes.', { mood: 'think' }),
            choice('Your knight is attacked and can’t be saved. What do you look for?', ['The most valuable thing it can take first', 'A square to hide it', 'Nothing — give it up'], 0, 'A doomed piece is a desperado. Sell it as dearly as possible.'),
            puzzles('X-ray attacks.', ['xRayAttack'], 4),
          ],
        },
        {
          id: 'x1-4',
          title: 'Combination training',
          blurb: 'Mixed',
          concept: 'calculation',
          steps: [say('Real games mix motifs: a deflection leads to a fork, a clearance to a mate. Name the motif, then calculate the line to the end.', { mood: 'think' }), puzzles('Combinations.', ['clearance', 'interference', 'deflection', 'attraction', 'xRayAttack'], 6)],
        },
      ],
    },
    {
      id: 'x2',
      title: 'Defence',
      about: 'Only moves, counterattack and saving lost positions.',
      themes: ['defensiveMove'],
      lessons: [
        {
          id: 'x2-1',
          title: 'Find the only move',
          blurb: 'When everything else loses',
          concept: 'defence',
          steps: [
            say('Before you look for your attack, look at your opponent’s. Ask: “What is the threat? If I could pass, what would they play?” Then find the move that stops it — sometimes there is only one.', { mood: 'think' }),
            puzzles('Only moves.', ['defensiveMove'], 4),
          ],
        },
        {
          id: 'x2-2',
          title: 'Counterattack',
          blurb: 'The best defence',
          concept: 'defence',
          steps: [
            say('Passive defence loses slowly. A counter-threat — a check, an attack on their queen, a mate threat of your own — can turn the game around because they must answer it first.', { mood: 'wow' }),
            choice('You are getting attacked and you’re a piece up. What is often strongest?', ['Return material to kill the attack', 'Hold on to everything', 'Move the king to the centre'], 0, 'Giving back material at the right moment trades off the attackers and keeps a winning endgame.'),
            choice('Lost position, opponent short of time. Your best practical choice?', ['Keep pieces on and set problems', 'Trade queens and hope', 'Resign'], 0, 'Complications are a losing side’s best friend.'),
            puzzles('Defend and counter.', ['defensiveMove'], 4),
          ],
        },
        {
          id: 'x2-3',
          title: 'Saving resources',
          blurb: 'Perpetual check and stalemate tricks',
          concept: 'defence',
          steps: [
            say('Down material? Look for perpetual check (endless checks the king can’t escape), stalemate tricks, and fortresses where the stronger side can’t break in.', { mood: 'think' }),
            choice('Which of these is a draw?', ['Endless checks the king can’t escape', 'Being a pawn down', 'Opposite-coloured bishops with queens on'], 0, 'Perpetual check. Opposite bishops draw in endgames, but with queens on they often help the attacker.'),
            puzzles('Endgame defence.', ['defensiveMove'], 4, { need: ['endgame'] }),
          ],
        },
        {
          id: 'x2-4',
          title: 'Defence training',
          blurb: 'Mixed',
          concept: 'defence',
          steps: [say('Six positions where you must defend. Spot the threat before you look for moves.', { mood: 'think' }), puzzles('Hold the position.', ['defensiveMove'], 6)],
        },
      ],
    },
    {
      id: 'x3',
      title: 'Positional mastery',
      about: 'Prophylaxis, pawn majorities and piece quality.',
      themes: ['quietMove', 'advantage'],
      lessons: [
        {
          id: 'x3-1',
          title: 'Prophylaxis',
          blurb: 'Stop their plan first',
          concept: 'positional',
          steps: [
            say('Prophylaxis: before improving your position, ask what your opponent wants to do, and make it impossible. A quiet h3, a rook to the file they want, a knight to the square they need.', { mood: 'think' }),
            choice('A prophylactic move is one that…', ['Prevents the opponent’s plan', 'Attacks their king', 'Wins material at once'], 0, 'Nimzowitsch and Petrosian built careers on it. It is the hallmark of strong positional players.'),
            puzzles('Quiet, strong moves.', ['quietMove'], 4),
          ],
        },
        {
          id: 'x3-2',
          title: 'The minority attack',
          blurb: 'Two pawns against three',
          concept: 'positional',
          steps: [
            say('In the Carlsbad structure White pushes the b-pawn (with the a-pawn) against Black’s three queenside pawns. After b5 and bxc6, Black is left with a weak pawn to attack for the rest of the game.', { mood: 'think' }),
            line(
              'The Queen’s Gambit Exchange: the textbook minority attack.',
              '1.d4 d5 2.c4 e6 3.Nc3 Nf6 4.cxd5 exd5 {The Carlsbad structure.} 5.Bg5 c6 6.e3 Be7 7.Bd3 Nbd7 8.Qc2 O-O 9.Nf3 Re8 10.O-O Nf8 11.Rab1 {The rook supports the b-pawn.} Ng6 12.b4 a6 13.a4 {Next b5, creating a weakness on c6 or d5.}',
            ),
            choice('What is the goal of the minority attack?', ['Create a weak pawn in Black’s queenside', 'Mate the king', 'Win the d5 pawn at once'], 0, 'After b5xc6 Black gets an isolated or backward pawn — a target for the endgame.'),
          ],
        },
        {
          id: 'x3-3',
          title: 'Pieces of different quality',
          blurb: 'Good knight, bad bishop, two bishops',
          concept: 'positional',
          steps: [
            say('Trade your worst piece for their best. Two bishops shine in open positions; knights love closed positions with outposts. A good knight against a bad bishop can win endgames on its own.', { mood: 'think' }),
            choice('The position is opening up. Which pair of minor pieces would you rather have?', ['The two bishops', 'Two knights', 'Knight and bad bishop'], 0, 'Open lines favour long-range pieces. The bishop pair is worth about half a pawn.'),
            choice('Closed centre, pawns locked on dark squares. Your bishop is light-squared. Is it good?', ['Yes — its pawns are on the other colour', 'No'], 0, 'Pawns on the opposite colour leave the bishop’s diagonals open.'),
          ],
        },
        {
          id: 'x3-4',
          title: 'When to trade',
          blurb: 'Simplify with purpose',
          concept: 'positional',
          steps: [
            say('Ahead in material: trade pieces, not pawns. Behind: trade pawns, not pieces. Cramped: trade to get space. Attacking: keep pieces on.', { mood: 'think' }),
            choice('You are a pawn up. What should you trade?', ['Pieces', 'Pawns', 'Nothing'], 0, 'Fewer pieces make the extra pawn count more; fewer pawns make a draw likelier.'),
            choice('You have less space. Trades are usually…', ['Good for you', 'Bad for you'], 0, 'A cramped side has too many pieces for too few squares. Each trade gives the rest more room.'),
          ],
        },
      ],
    },
    {
      id: 'x4',
      title: 'Deep calculation',
      about: 'Candidate moves, long lines and sacrifices.',
      themes: ['mateIn3', 'mateIn4', 'sacrifice', 'veryLong'],
      lessons: [
        {
          id: 'x4-1',
          title: 'Candidate moves',
          blurb: 'List before you calculate',
          concept: 'calculation',
          steps: [
            say('Kotov’s method: list every candidate move first — forcing moves included — then calculate each once, cleanly. Don’t jump back and forth between lines.', { mood: 'think' }),
            choice('Calculation goes wrong most often because…', ['A forcing reply was missed', 'Too many candidates', 'The clock'], 0, 'Most errors are a check or capture you didn’t consider for the opponent — check their forcing moves too.'),
            puzzles('Mate in three.', ['mateIn3'], 4),
          ],
        },
        {
          id: 'x4-2',
          title: 'Long combinations',
          blurb: 'Five moves and more',
          concept: 'calculation',
          steps: [say('Long lines are mostly forced: checks and captures. Find the forcing skeleton, then look for the quiet move hiding in it.', { mood: 'think' }), puzzles('Long combinations.', ['veryLong'], 4)],
        },
        {
          id: 'x4-3',
          title: 'Mate in four',
          blurb: 'Hold the board in your head',
          concept: 'calculation',
          steps: [say('Four moves deep. Visualise the final position before you move.', { mood: 'think' }), puzzles('Mate in four.', ['mateIn4'], 4)],
        },
        {
          id: 'x4-4',
          title: 'Sacrifice for the initiative',
          blurb: 'Not every sac needs a mate',
          concept: 'attack',
          steps: [
            say('Some sacrifices don’t win back material at once — they buy time, open lines or keep the opponent’s king stuck. Ask: if they accept, how many moves can they not develop?', { mood: 'wow' }),
            puzzles('Sacrifices.', ['sacrifice'], 5),
          ],
        },
      ],
    },
    {
      id: 'x5',
      title: 'Endgame mastery',
      about: 'Technique that wins the won positions.',
      themes: ['rookEndgame', 'pawnEndgame', 'queenEndgame'],
      lessons: [
        {
          id: 'x5-1',
          title: 'The active rook',
          blurb: 'Activity over material',
          concept: 'endgame',
          steps: [
            say('In rook endgames an active rook is often worth a pawn. Cut off the enemy king, attack pawns from behind, and don’t let your rook become a passive guard.', { mood: 'think' }),
            puzzles('Rook endgames.', ['rookEndgame'], 4),
          ],
        },
        {
          id: 'x5-2',
          title: 'Opposition and triangulation',
          blurb: 'Lose a move on purpose',
          concept: 'endgame',
          steps: [
            say('When the kings face each other, the side NOT to move has the opposition. If you have it on the wrong move, triangulate: walk three squares in a triangle while the enemy king can only shuffle two — and hand them the move.', { fen: '8/8/2k5/2Pp4/3K4/8/8/8 w - - 0 1', arrows: ['b:d4e3', 'b:e3d3', 'b:d3d4'] }),
            choice('Triangulation is a way to…', ['Pass the move to your opponent', 'Promote faster', 'Avoid stalemate'], 0, 'Three king moves end on the same square as one — the opponent is now the one in zugzwang.'),
            puzzles('Pawn endgames.', ['pawnEndgame'], 4),
          ],
        },
        {
          id: 'x5-3',
          title: 'Queen endings',
          blurb: 'Checks, checks, checks',
          concept: 'endgame',
          steps: [say('Queen endgames are about king safety and passed pawns. Centralise the queen and keep your king sheltered from perpetual check.', { mood: 'think' }), puzzles('Queen endings.', ['queenEndgame'], 4)],
        },
        {
          id: 'x5-4',
          title: 'Final exam',
          blurb: 'Everything together',
          concept: 'endgame',
          steps: [say('You made it to the end of the path! One last mixed test.', { mood: 'cheer' }), puzzles('Final exam.', ['sacrifice', 'defensiveMove', 'rookEndgame', 'quietMove', 'mateIn3'], 8)],
        },
      ],
    },
  ],
};
