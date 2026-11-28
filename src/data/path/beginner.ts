import type { Level } from '../../lib/path/types';
import { choice, line, move, puzzles, say } from './helpers';

export const beginner: Level = {
  id: 'beginner',
  title: 'Beginner',
  range: [600, 1000],
  band: [600, 1100],
  pitch: 'The core tactics — forks, pins, skewers, discoveries — and the first mating patterns.',
  units: [
    {
      id: 'n1',
      title: 'Forks',
      about: 'One piece, two targets.',
      themes: ['fork'],
      lessons: [
        {
          id: 'n1-1',
          title: 'Knight forks',
          blurb: 'The sneakiest attacker',
          concept: 'fork',
          steps: [
            say('A fork is one piece attacking two things at once. The opponent can only save one. Knights are the best forkers because nothing can block a knight.', { fen: '4k3/8/2q1r3/8/3N4/8/8/4K3 w - - 0 1', arrows: ['d4c6', 'd4e6'] }),
            move('Fork the king and the rook. Then collect the rook.', 'r3k3/5ppp/8/3N4/8/8/5PPP/4K3 w - - 0 1', ['Nc7+', 'Kd7', 'Nxa8'], 'Nc7+ checks the king and attacks a8. A check plus a second attack is a “royal fork” — the strongest kind.'),
            move('Fork the king and queen — then take the queen.', '6k1/5ppp/2q5/3N4/8/8/5PPP/6K1 w - - 0 1', ['Ne7+', 'Kf8', 'Nxc6'], 'Ne7+ checks the king on g8 and attacks the queen on c6. The king must move, and the queen falls.'),
            say('Tip: when two enemy pieces stand a knight’s jump from the same square, look for a knight that can land there.', { mood: 'think' }),
            puzzles('Find the forks.', ['fork'], 4),
          ],
        },
        {
          id: 'n1-2',
          title: 'Queen forks',
          blurb: 'Check plus a loose piece',
          concept: 'fork',
          steps: [
            say('The queen forks in eight directions. Her favourite trick: give check and hit an undefended piece at the same time.', { mood: 'wow' }),
            move('The rook on a8 is loose. Win it with a queen fork.', 'r3k3/5ppp/8/8/8/3Q4/5PPP/6K1 w - - 0 1', ['Qe4+', 'Kd8', 'Qxa8+'], 'Qe4+ checks down the e-file and hits a8 along the diagonal. A rook can’t move diagonally, so it can’t hit back.'),
            choice('Why would Qa4+ be a blunder here?', ['The rook on a5 takes the queen', 'It isn’t check', 'The king takes the queen'], 0, 'Qa4+ attacks the rook along the a-file — so the rook attacks the queen too. Fork a rook on a diagonal, where it can’t hit back.', { fen: '4k3/5ppp/8/r7/8/8/5PPP/3QK3 w - - 0 1', arrows: ['r:a5a4'] }),
            puzzles('Queen and knight forks.', ['fork'], 4),
          ],
        },
        {
          id: 'n1-3',
          title: 'Pawn forks',
          blurb: 'The cheapest forker',
          concept: 'fork',
          steps: [
            say('A pawn forking two pieces is a disaster for your opponent: whichever one survives, they lose a piece for a pawn.', { mood: 'cheer' }),
            move('Two knights side by side… Fork them with a pawn!', '4k3/8/3n1n2/8/4P3/8/8/4K3 w - - 0 1', 'e5', 'The pawn attacks d6 and f6 at once. A knight for a pawn at least.'),
            line(
              'The “fork trick” in a real opening: a fake sacrifice that a pawn fork wins back.',
              '1.e4 e5 2.Nf3 Nc6 3.Bc4 Nf6 4.Nc3 Nxe4 {The knight takes e4 — it looks like it hangs to Nxe4…} 5.Nxe4 d5 {…but the pawn forks bishop and knight, so Black gets the piece back with a big centre.}',
            ),
            puzzles('Pawn and piece forks.', ['fork'], 4),
          ],
        },
        {
          id: 'n1-4',
          title: 'Fork training',
          blurb: 'Mixed forks',
          concept: 'fork',
          steps: [say('Six forks. Look for undefended pieces and the king — those are fork targets.', { mood: 'cheer' }), puzzles('Fork them all.', ['fork'], 6)],
        },
      ],
    },
    {
      id: 'n2',
      title: 'Pins and skewers',
      about: 'Attacks along a line.',
      themes: ['pin', 'skewer'],
      lessons: [
        {
          id: 'n2-1',
          title: 'The pin',
          blurb: 'Stuck in front of the king',
          concept: 'pin',
          steps: [
            say('A pin: a piece can’t move because something more valuable stands behind it. Here the knight on c6 is pinned to the king — moving it is illegal.', { fen: 'r1bqkbnr/ppp2ppp/2np4/1B2p3/4P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 0 4', arrows: ['r:b5e8'] }),
            move('The knight on c6 is pinned. Attack it again!', '4k3/1p4pp/2n5/1B6/3P4/8/6PP/4K3 w - - 0 1', 'd5', 'The pinned knight can’t run, so d5 wins it next move. Attack pinned pieces — they can’t escape.'),
            choice('A piece pinned to the king may…', ['Not move at all off the line', 'Move if it gives check', 'Move only forward'], 0, 'Moving it would expose the king to check, which is illegal. Pinned to the queen, it may move — but you lose the queen.'),
            puzzles('Pins in action.', ['pin'], 4),
          ],
        },
        {
          id: 'n2-2',
          title: 'Make a pin',
          blurb: 'Line up king and queen',
          concept: 'pin',
          steps: [
            say('When the enemy king and queen stand on the same line, a rook or bishop can pin the queen.', { mood: 'think', fen: '4k3/6pp/8/4q3/8/2N5/5KPP/R7 w - - 0 1', arrows: ['b:a1e1', 'r:e1e8'] }),
            move('Pin the queen to the king.', '4k3/6pp/8/4q3/8/2N5/5KPP/R7 w - - 0 1', 'Re1', 'The queen can’t leave the e-file — not even to take your knight. Her best is …Qxe1+ Kxe1: a queen for a rook.'),
            line(
              'But a pin to the queen is not a real pin — the piece may still move. Légal’s mate punishes a player who forgets that.',
              '1.e4 e5 2.Nf3 d6 3.Bc4 Bg4 {The knight looks pinned to the queen.} 4.Nc3 g6? 5.Nxe5! {It moves anyway!} Bxd1? {Greed.} 6.Bxf7+ Ke7 7.Nd5# {Three minor pieces mate the king.}',
            ),
            puzzles('Pin and win.', ['pin'], 4),
          ],
        },
        {
          id: 'n2-3',
          title: 'The skewer',
          blurb: 'A pin in reverse',
          concept: 'skewer',
          steps: [
            say('A skewer is a pin turned around: the valuable piece is in front. It must move, and you take what’s behind it.', { fen: '3q4/8/8/3k4/8/8/8/R5K1 w - - 0 1', arrows: ['b:a1d1', 'r:d1d8'] }),
            move('Skewer the king and queen.', '3q4/8/8/3k4/8/8/8/R5K1 w - - 0 1', ['Rd1+', 'Ke4', 'Rxd8'], 'Check first; when the king steps aside, the queen behind it falls.'),
            puzzles('Skewers.', ['skewer'], 4),
          ],
        },
        {
          id: 'n2-4',
          title: 'Line training',
          blurb: 'Pins and skewers mixed',
          concept: 'pin',
          steps: [say('Rooks, bishops and queens attack along lines. Look for two enemy pieces on the same line.', { mood: 'think' }), puzzles('Pins and skewers.', ['pin', 'skewer'], 6)],
        },
      ],
    },
    {
      id: 'n3',
      title: 'Mating patterns',
      about: 'Recognise the mates that keep coming back.',
      themes: ['mateIn2', 'backRankMate', 'smotheredMate'],
      lessons: [
        {
          id: 'n3-1',
          title: 'Back rank, again',
          blurb: 'When the defender is overworked',
          concept: 'backrank',
          steps: [
            say('Back-rank mates get bigger at this level: the defender of the back rank gets lured away or traded off.', { fen: '3r2k1/5ppp/8/8/8/8/3R1PPP/3R2K1 w - - 0 1', arrows: ['d2d8'] }),
            move('Two rooks against one. Take on d8 — it’s mate.', '3r2k1/5ppp/8/8/8/8/3R1PPP/3R2K1 w - - 0 1', 'Rxd8#', 'Black’s rook was the only back-rank guard. Doubling rooks on a file wins this fight.'),
            puzzles('Back-rank mates in two.', ['backRankMate'], 4),
          ],
        },
        {
          id: 'n3-2',
          title: 'Smothered mate',
          blurb: 'The king suffocated by its own army',
          concept: 'mate',
          steps: [
            say('When a king is surrounded by its own pieces, a knight check can be mate — nothing can block a knight.', { fen: '6rk/6pp/8/6N1/8/8/8/6K1 w - - 0 1', arrows: ['g5f7'] }),
            move('Smother the king.', '6rk/6pp/8/6N1/8/8/8/6K1 w - - 0 1', 'Nf7#', 'Rook on g8, pawns on g7 and h7: the king has nowhere to go.'),
            line(
              'The famous version, “Philidor’s legacy”: a queen sacrifice forces the rook onto g8.',
              '1.Nf7+ Kg8 2.Nh6+ {Double check: knight and queen.} Kh8 3.Qg8+ {The queen sacrifice!} Rxg8 4.Nf7# {Smothered.}',
              { fen: '4r2k/6pp/8/3Q2N1/8/8/8/6K1 w - - 0 1' },
            ),
            move('Now you play Philidor’s legacy.', '4r2k/6pp/8/3Q2N1/8/8/8/6K1 w - - 0 1', ['Nf7+', 'Kg8', 'Nh6+', 'Kh8', 'Qg8+', 'Rxg8', 'Nf7#'], 'Knight check, double check, queen sac, smothered mate.'),
            puzzles('Smothered mates.', ['smotheredMate'], 3),
          ],
        },
        {
          id: 'n3-3',
          title: 'Queen and bishop',
          blurb: 'Mate on h7',
          concept: 'attack',
          steps: [
            say('A queen backed by a bishop aimed at h7 (or h2) is a classic attack. The bishop protects the queen as she lands next to the king.', { fen: '5rk1/5ppp/8/7Q/8/3B4/8/6K1 w - - 0 1', arrows: ['d3h7', 'h5h7'] }),
            move('Mate in one.', '5rk1/5ppp/8/7Q/8/3B4/8/6K1 w - - 0 1', 'Qxh7#', 'The bishop guards h7; the rook on f8 blocks the king’s escape.'),
            puzzles('Kingside mates.', ['mateIn1', 'mateIn2'], 4, { need: ['kingsideAttack'] }),
          ],
        },
        {
          id: 'n3-4',
          title: 'Mate in two',
          blurb: 'Look one move deeper',
          concept: 'mate',
          steps: [
            say('Mate in two: your first move is often a check or sacrifice that forces the reply. Ask “if they had to answer with X, could I mate?”', { mood: 'think' }),
            puzzles('Mate in two.', ['mateIn2'], 5),
          ],
        },
      ],
    },
    {
      id: 'n4',
      title: 'Discovered attacks',
      about: 'Move one piece, attack with another.',
      themes: ['discoveredAttack', 'doubleCheck'],
      lessons: [
        {
          id: 'n4-1',
          title: 'Discovered attack',
          blurb: 'The hidden attacker',
          concept: 'discovered',
          steps: [
            say('When a piece moves out of the way, the piece behind it suddenly attacks. If the piece that moves makes its own threat, you have two attacks at once.', { fen: '4q1k1/5pp1/7p/8/4B3/8/5PPP/4R1K1 w - - 0 1', arrows: ['r:e1e8'] }),
            move('The bishop blocks your rook. Move it with check!', '4q1k1/5pp1/7p/8/4B3/8/5PPP/4R1K1 w - - 0 1', ['Bh7+', 'Kxh7', 'Rxe8'], 'Bh7+ forces the king to deal with the check, and the rook takes the queen. A bishop for a queen!'),
            puzzles('Discovered attacks.', ['discoveredAttack'], 4),
          ],
        },
        {
          id: 'n4-2',
          title: 'Discovered check',
          blurb: 'Check from behind',
          concept: 'discovered',
          steps: [
            say('A discovered check is even stronger: the opponent must answer the check, so the piece that moved can grab anything.', { mood: 'wow' }),
            move('Uncover check from the rook and win the queen.', '4k3/8/8/2q5/4N3/8/8/4R2K w - - 0 1', 'Nxc5+', 'The knight takes the queen while the rook gives check — Black has no time to recapture.'),
            puzzles('Discoveries with check.', ['discoveredAttack'], 4),
          ],
        },
        {
          id: 'n4-3',
          title: 'Double check',
          blurb: 'Only the king can move',
          concept: 'discovered',
          steps: [
            say('Double check: both the moving piece and the uncovered piece give check. You can’t block two lines or capture two pieces — the king must move.', { mood: 'think' }),
            move('Double check — and it’s mate.', '3qkb2/3p1p2/8/8/4N3/8/8/4R1K1 w - - 0 1', 'Nd6#', 'The knight and rook both check. The king’s own pieces block every escape.', { goal: 'mate' }),
            puzzles('Double checks and discoveries.', ['doubleCheck', 'discoveredAttack'], 4),
          ],
        },
        {
          id: 'n4-4',
          title: 'Discovery training',
          blurb: 'Mixed',
          concept: 'discovered',
          steps: [say('Look for your pieces lined up behind your own pieces — those are loaded guns.', { mood: 'cheer' }), puzzles('Discovered attacks.', ['discoveredAttack'], 6)],
        },
      ],
    },
    {
      id: 'n5',
      title: 'Endgame basics',
      about: 'Kings, pawns and rooks.',
      themes: ['pawnEndgame', 'rookEndgame', 'promotion'],
      lessons: [
        {
          id: 'n5-1',
          title: 'The square',
          blurb: 'Can the king catch the pawn?',
          concept: 'endgame',
          steps: [
            say('Draw a square from the pawn to its promotion rank. If the enemy king can step into that square, it catches the pawn.', { fen: '8/8/8/P3k3/8/8/8/K7 b - - 0 1', marks: ['a5', 'd5', 'd8', 'a8'] }),
            choice('Black to move. Can the king catch the pawn?', ['Yes — …Kd6 steps into the square', 'No, the pawn queens'], 0, 'After …Kd6 the king is inside the square a5–d5–d8–a8 and reaches a8 in time.', { fen: '8/8/8/P3k3/8/8/8/K7 b - - 0 1' }),
            puzzles('Pawn races.', ['pawnEndgame'], 3),
          ],
        },
        {
          id: 'n5-2',
          title: 'King in front',
          blurb: 'Lead your pawn home',
          concept: 'endgame',
          steps: [
            say('In king-and-pawn endings, put your king in front of the pawn, not behind it. The king clears the way.', { fen: '4k3/8/4K3/4P3/8/8/8/8 w - - 0 1', arrows: ['b:e6d7'] }),
            choice('King on the 6th in front of its pawn (not a rook pawn). Result?', ['White wins whoever moves', 'Draw', 'Only wins with White to move'], 0, 'With the king on the 6th ahead of the pawn, White always gets the king to a key square and wins.', { fen: '4k3/8/4K3/4P3/8/8/8/8 b - - 0 1' }),
            puzzles('Pawn endgames.', ['pawnEndgame'], 4),
          ],
        },
        {
          id: 'n5-3',
          title: 'Rooks belong behind',
          blurb: 'Behind passed pawns',
          concept: 'endgame',
          steps: [
            say('Rooks belong behind passed pawns — yours or theirs. Behind your pawn, the rook gains scope as the pawn advances.', { fen: '6k1/8/8/8/P7/8/5PPP/R5K1 w - - 0 1', arrows: ['b:a1a8'] }),
            choice('Where should a rook be against an enemy passed pawn?', ['Behind it', 'In front of it, far away', 'Beside it'], 0, 'Behind the pawn the rook keeps attacking it however far it runs.'),
            puzzles('Rook endgames.', ['rookEndgame'], 4),
          ],
        },
        {
          id: 'n5-4',
          title: 'Endgame practice',
          blurb: 'Mixed endgames',
          concept: 'endgame',
          steps: [say('Endgames reward precise counting. Take your time.', { mood: 'think' }), puzzles('Endgames.', ['pawnEndgame', 'rookEndgame', 'promotion'], 6)],
        },
      ],
    },
  ],
};
