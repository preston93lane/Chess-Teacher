import type { Level } from '../../lib/path/types';
import { choice, line, move, puzzles, say } from './helpers';

const OPERA = '1.e4 e5 2.Nf3 d6 3.d4 Bg4 4.dxe5 Bxf3 5.Qxf3 dxe5 6.Bc4 Nf6 7.Qb3 Qe7 8.Nc3 c6 9.Bg5 b5 10.Nxb5 cxb5 11.Bxb5+ Nbd7 12.O-O-O Rd8 13.Rxd7 Rxd7 14.Rd1 Qe6 15.Bxd7+ Nxd7';

export const intermediate: Level = {
  id: 'intermediate',
  title: 'Intermediate',
  range: [1000, 1500],
  band: [1000, 1600],
  pitch: 'Combinations, calculation, attacking the king, real plans and the endgames every club player needs.',
  units: [
    {
      id: 'i1',
      title: 'Remove the defender',
      about: 'Deflection, attraction and overloaded pieces.',
      themes: ['deflection', 'attraction', 'capturingDefender'],
      lessons: [
        {
          id: 'i1-1',
          title: 'The Opera Game',
          blurb: 'Morphy, Paris 1858',
          concept: 'defender',
          steps: [
            say('Every combination you’ll learn here removes a defender: you capture it, chase it away, or give it two jobs. Morphy’s Opera Game shows all of it in 17 moves.', { mood: 'wow' }),
            line(
              'Watch how fast development beats material.',
              `${OPERA.replace('9.Bg5', '9.Bg5 {Every White piece is out; Black’s are stuck.}').replace('10.Nxb5', '10.Nxb5! {A sacrifice to open lines to the king.}').replace('12.O-O-O', '12.O-O-O {The rook joins with a pin on d7.}').replace('13.Rxd7', '13.Rxd7 {Capture the defender…}').replace('14.Rd1', '14.Rd1 {…and pile up on the pinned rook.}')} 16.Qb8+! {The queen sacrifice drags away the last defender of d8.} Nxb8 17.Rd8# {Mate with the last two pieces.}`,
            ),
            move('Now you finish it like Morphy.', '', ['Qb8+', 'Nxb8', 'Rd8#'], 'Qb8+ deflects the knight that guards d8, then the rook mates.', { pgn: OPERA }),
            puzzles('Capture or remove the defender.', ['capturingDefender', 'deflection'], 4),
          ],
        },
        {
          id: 'i1-2',
          title: 'Overloaded pieces',
          blurb: 'One defender, two jobs',
          concept: 'defender',
          steps: [
            say('A piece guarding two things is overloaded. Attack one of its jobs and the other collapses. Here the rook on c8 guards both the knight and the back rank.', { fen: '2r3k1/5ppp/8/8/8/2n5/3Q1PPP/4R1K1 w - - 0 1', arrows: ['r:c8c3', 'r:c8e8'] }),
            move('Exploit the overloaded rook.', '2r3k1/5ppp/8/8/8/2n5/3Q1PPP/4R1K1 w - - 0 1', ['Qxc3', 'Rxc3', 'Re8#'], 'Qxc3! If the rook recaptures it abandons the back rank, and Re8 is mate. So Black is simply a knight down.'),
            puzzles('Deflections.', ['deflection'], 4),
          ],
        },
        {
          id: 'i1-3',
          title: 'Attraction',
          blurb: 'Lure the king onto a fork',
          concept: 'defender',
          steps: [
            say('Attraction pulls a piece — often the king — onto a bad square with a sacrifice. Then a fork or mate follows.', { mood: 'think' }),
            move('Lure the king to f8, then fork.', '6k1/6pp/1q6/4N3/8/8/6PP/5R1K w - - 0 1', ['Rf8+', 'Kxf8', 'Nd7+', 'Ke7', 'Nxb6'], 'Rf8+ forces Kxf8, and now the king and queen are a knight’s fork apart: Nd7+ wins the queen.'),
            puzzles('Attraction.', ['attraction'], 4),
          ],
        },
        {
          id: 'i1-4',
          title: 'Defender training',
          blurb: 'Mixed',
          concept: 'defender',
          steps: [say('Ask of every enemy piece: what is it guarding? Can I take it, chase it or overload it?', { mood: 'think' }), puzzles('Remove the defender.', ['deflection', 'attraction', 'capturingDefender'], 6)],
        },
      ],
    },
    {
      id: 'i2',
      title: 'Calculation',
      about: 'Checks, captures, threats — and moves in between.',
      themes: ['intermezzo', 'quietMove', 'mateIn3'],
      lessons: [
        {
          id: 'i2-1',
          title: 'Checks, captures, threats',
          blurb: 'A checklist for every move',
          concept: 'calculation',
          steps: [
            say('Strong players look at forcing moves first: every check, every capture, every threat — for both sides. It takes ten seconds and catches most tactics.', { mood: 'think' }),
            choice('In what order should you scan forcing moves?', ['Checks, captures, threats', 'Threats, then pawn moves', 'Captures only'], 0, 'Checks are the most forcing, so they come first. Then captures, then moves that threaten something.'),
            choice('Your opponent just moved. What should you ask first?', ['What does that move threaten?', 'What is my plan?', 'How much time do I have?'], 0, 'Most losses come from missing the opponent’s threat. Plans come after safety.'),
            puzzles('Forcing moves win.', ['fork', 'pin', 'discoveredAttack', 'sacrifice'], 5),
          ],
        },
        {
          id: 'i2-2',
          title: 'The in-between move',
          blurb: 'Zwischenzug',
          concept: 'calculation',
          steps: [
            say('When a recapture looks automatic, look for an in-between move first: a check or bigger threat that the opponent must answer. Then recapture with interest.', { mood: 'wow' }),
            choice('Your opponent takes your knight. What do you check before recapturing?', ['Is there a check or bigger threat first?', 'Nothing — always recapture at once', 'Whether I can resign'], 0, 'The recapture usually won’t run away. A forcing move first can win extra material.'),
            puzzles('In-between moves.', ['intermezzo'], 4),
          ],
        },
        {
          id: 'i2-3',
          title: 'Quiet moves',
          blurb: 'No check, no capture — still crushing',
          concept: 'calculation',
          steps: [
            say('Some winning moves don’t check or capture. They make a threat the opponent cannot meet, or take away the last escape square. These are the hardest to see.', { mood: 'think' }),
            puzzles('Find the quiet killer.', ['quietMove'], 4),
          ],
        },
        {
          id: 'i2-4',
          title: 'Three moves deep',
          blurb: 'Mate in three',
          concept: 'calculation',
          steps: [say('Calculate the forcing line to the end before you play the first move. Picture the board; don’t move pieces in your head too fast.', { mood: 'think' }), puzzles('Mate in three.', ['mateIn3'], 4)],
        },
      ],
    },
    {
      id: 'i3',
      title: 'Attack the king',
      about: 'Sacrifices, pawn storms and open lines.',
      themes: ['kingsideAttack', 'exposedKing', 'sacrifice'],
      lessons: [
        {
          id: 'i3-1',
          title: 'The Greek gift',
          blurb: 'Bxh7+!',
          concept: 'attack',
          steps: [
            say('The Greek gift: Bxh7+ Kxh7, Ng5+ and Qh5 storms the king. It works when White has a pawn on e5, the knight can reach g5, the queen can reach h5 — and Black can’t defend h7 in time.', { fen: 'rnb2rk1/ppqn1ppp/4p3/2ppP3/3P4/3B1N2/PPP2PPP/RN1Q1RK1 w - - 0 10', arrows: ['d3h7', 'b:f3g5', 'b:d1h5'] }),
            line('Here is the attack.', '10.Bxh7+ Kxh7 11.Ng5+ {The knight checks and clears the way for the queen. (Black’s toughest try is 11…Kg6, met by Qd3+ or Qg4.)} Kg8 12.Qh5 {Threat: Qh7 mate. Black has no knight on f6 to stop it.}', { fen: 'rnb2rk1/ppqn1ppp/4p3/2ppP3/3P4/3B1N2/PPP2PPP/RN1Q1RK1 w - - 0 10' }),
            choice('Which piece would most often stop the Greek gift?', ['A black knight on f6', 'A black rook on a8', 'A black pawn on a6'], 0, 'A knight on f6 guards h7 and h5. That’s why e5 (kicking it away) is part of the recipe.'),
            puzzles('Kingside attacks.', ['kingsideAttack'], 4),
          ],
        },
        {
          id: 'i3-2',
          title: 'Opposite-side castling',
          blurb: 'Race your pawns',
          concept: 'attack',
          steps: [
            say('Kings on opposite wings means a race: throw the pawns in front of the enemy king forward to open files. Your own pawns don’t shield your king, so speed is everything.', { mood: 'wow' }),
            choice('Kings castled on opposite sides. What usually matters most?', ['Speed of the attack', 'Winning a pawn', 'Trading queens'], 0, 'Whoever opens lines first usually wins. A pawn means little when your king is getting mated.'),
            puzzles('Exposed kings.', ['exposedKing'], 4),
          ],
        },
        {
          id: 'i3-3',
          title: 'Sacrifice to open lines',
          blurb: 'Material for the initiative',
          concept: 'attack',
          steps: [
            say('Sacrifices against the king work when more of your pieces are near it than defenders. Count attackers versus defenders before you sacrifice.', { mood: 'think' }),
            puzzles('Sacrifices.', ['sacrifice'], 4, { need: ['kingsideAttack'] }),
          ],
        },
        {
          id: 'i3-4',
          title: 'Attack training',
          blurb: 'Mixed attacks',
          concept: 'attack',
          steps: [say('Bring everything. An attack with two pieces rarely works; with four it rarely fails.', { mood: 'cheer' }), puzzles('Attack!', ['kingsideAttack', 'exposedKing', 'mateIn2'], 6)],
        },
      ],
    },
    {
      id: 'i4',
      title: 'Plans and structures',
      about: 'What to do when there’s no tactic.',
      themes: ['advantage', 'quietMove'],
      lessons: [
        {
          id: 'i4-1',
          title: 'Outposts',
          blurb: 'A square no pawn can attack',
          concept: 'positional',
          steps: [
            say('An outpost is a square in the enemy half that no enemy pawn can attack. A knight there can be stronger than a rook.', { fen: 'r4rk1/pp3ppp/3p4/3N4/2P1P3/8/PP3PPP/R4RK1 w - - 0 1', marks: ['d5'] }),
            choice('Why is d5 a great square for the white knight?', ['No black pawn can ever attack it', 'It attacks the king', 'It’s in the corner'], 0, 'With Black’s c- and e-pawns gone, nothing can chase the knight from d5.', { fen: 'r4rk1/pp3ppp/3p4/3N4/2P1P3/8/PP3PPP/R4RK1 w - - 0 1' }),
            choice('Which piece usually belongs on an outpost?', ['A knight', 'The king', 'A rook'], 0, 'Knights need close support points; bishops and rooks prefer long lines.'),
          ],
        },
        {
          id: 'i4-2',
          title: 'Open files',
          blurb: 'Rooks need air',
          concept: 'positional',
          steps: [
            say('Rooks belong on open files (no pawns) or half-open files (only enemy pawns). From there they invade the 7th rank.', { fen: '2r2rk1/pp3ppp/4p3/8/8/4P3/PP3PPP/R4RK1 w - - 0 1', marks: ['d1', 'c1'] }),
            move('Put a rook on the open file.', '2r2rk1/pp3ppp/4p3/8/8/4P3/PP3PPP/R4RK1 w - - 0 1', 'Rfd1', 'The d-file has no pawns at all. Rac1 to contest the c-file is fine too.', { accept: ['Rad1', 'Rac1', 'Rfc1'], noEngine: true }),
            choice('A rook on the 7th rank usually…', ['Attacks pawns and cuts off the king', 'Is trapped', 'Should go back'], 0, 'The 7th rank is where the enemy pawns sit and the king hides.'),
          ],
        },
        {
          id: 'i4-3',
          title: 'Good and bad bishops',
          blurb: 'Pawns on your bishop’s colour',
          concept: 'positional',
          steps: [
            say('A bishop is “bad” when its own pawns are fixed on its colour — it bites on granite. Put your pawns on the opposite colour of your bishop.', { fen: '4k3/8/3p4/2pPp3/2P1P3/3B4/8/4K3 w - - 0 1', marks: ['c4', 'e4'] }),
            choice('Which white bishop is bad here?', ['The light-squared one on d3', 'Neither'], 0, 'White’s pawns on c4 and e4 sit on light squares and block it.', { fen: '4k3/8/3p4/2pPp3/2P1P3/3B4/8/4K3 w - - 0 1' }),
            choice('You have a bad bishop. A good plan is…', ['Trade it, or put pawns on the other colour', 'Keep it forever', 'Push all pawns'], 0, 'Swap it for an active enemy piece, or change the pawn chain.'),
          ],
        },
        {
          id: 'i4-4',
          title: 'Isolated queen’s pawn',
          blurb: 'Dynamic strength, static weakness',
          concept: 'positional',
          steps: [
            say('A pawn on d4 with no pawns on the c- and e-files is isolated. With pieces on, it gives space and the e5 outpost — attack! In the endgame it becomes a target.', { fen: 'r1bq1rk1/pp2bppp/2n1pn2/8/3P4/2NB1N2/PP3PPP/R1BQ1RK1 w - - 0 1', marks: ['d4', 'e5'] }),
            choice('You have the isolated pawn. You want to…', ['Keep pieces on and attack', 'Trade into an endgame', 'Push a- and b-pawns'], 0, 'The isolani’s owner attacks; the defender trades pieces and blockades on d5.'),
            choice('You face an isolated pawn. A good square for your knight is…', ['In front of it (blockade)', 'Behind your own pawns', 'On the rim'], 0, 'A knight on d5 blockades the pawn and can’t be chased by a pawn.'),
          ],
        },
      ],
    },
    {
      id: 'i5',
      title: 'Rook endgames',
      about: 'Lucena, Philidor and the active rook.',
      themes: ['rookEndgame', 'zugzwang'],
      lessons: [
        {
          id: 'i5-1',
          title: 'Lucena: build a bridge',
          blurb: 'The winning method',
          concept: 'endgame',
          steps: [
            say('Lucena position: your pawn is on the 7th, your king in front, the enemy king cut off. To escape the checks, “build a bridge” — bring the rook to the 4th rank to block them.', { fen: '1K6/1P2k3/8/8/8/8/r7/3R4 w - - 0 1' }),
            move('Build the bridge.', '1K6/1P2k3/8/8/8/8/r7/3R4 w - - 0 1', 'Rd4', 'Next comes Kc7, and when the checks run out the rook blocks on b4 or c4.', { noEngine: true, hint: 'The rook goes to the 4th rank.' }),
            puzzles('Rook endings.', ['rookEndgame'], 4),
          ],
        },
        {
          id: 'i5-2',
          title: 'Philidor: hold the draw',
          blurb: 'The third-rank defence',
          concept: 'endgame',
          steps: [
            say('Defending rook vs rook and pawn: keep your rook on your third rank so the enemy king can’t come forward. When the pawn advances, drop back and check from behind.', { mood: 'think' }),
            choice('Black to move. Where should the rook go?', ['…Rb6, to the third rank', '…Rb1, waiting on the first rank', '…Kf8'], 0, 'Rb6 stops Kd6. If e6, then …Rb1 and checks from behind — the king has no shelter.', { fen: '4k3/7R/8/3KP3/8/8/8/1r6 b - - 0 1', orientation: 'b' }),
            puzzles('Rook endgames.', ['rookEndgame'], 4),
          ],
        },
        {
          id: 'i5-3',
          title: 'Outside passed pawn',
          blurb: 'A decoy that wins',
          concept: 'endgame',
          steps: [
            say('A passed pawn far from the other pawns drags the enemy king away. Your king then eats the pawns it left behind.', { fen: '8/5kpp/8/P7/8/6PP/5K2/8 w - - 0 1', marks: ['a5'] }),
            choice('Why is the a-pawn so strong here?', ['It pulls Black’s king to the queenside', 'It protects White’s king', 'It can’t be stopped'], 0, 'Black’s king must chase it — then White’s king wins the kingside pawns.'),
            puzzles('Pawn endgames.', ['pawnEndgame'], 4),
          ],
        },
        {
          id: 'i5-4',
          title: 'Zugzwang',
          blurb: 'Every move makes it worse',
          concept: 'endgame',
          steps: [say('Zugzwang: the side to move would love to pass. In endgames, a waiting move that hands the move over can win.', { mood: 'think' }), puzzles('Zugzwang.', ['zugzwang'], 4)],
        },
      ],
    },
  ],
};
