import type { Lesson } from '../../lib/lessons/types';
import { ENDGAME_LESSONS } from '../endgames';

const QGA_IQP =
  '1.d4 d5 2.c4 dxc4 3.Nf3 Nf6 4.e3 e6 5.Bxc4 c5 6.O-O a6 7.a4 Nc6 8.Qe2 cxd4 9.Rd1 Be7 10.exd4 O-O 11.Nc3';
const PANOV =
  '1.e4 c6 2.d4 d5 3.exd5 cxd5 4.c4 Nf6 5.Nc3 e6 6.Nf3 Be7 7.cxd5 Nxd5 8.Bd3 Nc6 9.O-O O-O 10.Re1 Bf6 11.Be4 Nce7';
const CARLSBAD =
  '1.d4 d5 2.c4 e6 3.Nc3 Nf6 4.cxd5 exd5 5.Bg5 c6 6.e3 Be7 7.Bd3 Nbd7 8.Qc2 O-O 9.Nf3 Re8 10.O-O Nf8 11.Rab1 Ng6';
const TARTAKOWER =
  '1.d4 d5 2.c4 e6 3.Nc3 Nf6 4.Bg5 Be7 5.e3 O-O 6.Nf3 h6 7.Bh4 b6 8.cxd5 Nxd5 9.Bxe7 Qxe7 10.Nxd5 exd5 11.Rc1 Be6 12.Qa4 c5 13.Qa3 Rc8 14.Bb5 a6 15.dxc5 bxc5 16.O-O Ra7 17.Be2 Nd7';
const MDP = '1.d4 Nf6 2.c4 g6 3.Nc3 Bg7 4.e4 d6 5.Nf3 O-O 6.Be2 e5 7.O-O Nc6 8.d5 Ne7 9.Ne1';
const HEDGEHOG =
  '1.c4 c5 2.Nf3 Nf6 3.Nc3 e6 4.g3 b6 5.Bg2 Bb7 6.O-O Be7 7.d4 cxd4 8.Qxd4 d6 9.Rd1 a6 10.b3 Nbd7 11.e4 Qc7 12.Bb2 O-O';
const DRAGON =
  '1.e4 c5 2.Nf3 d6 3.d4 cxd4 4.Nxd4 Nf6 5.Nc3 g6 6.Be3 Bg7 7.f3 O-O 8.Qd2 Nc6 9.Bc4 Bd7 10.O-O-O Rc8 11.Bb3 Ne5';
const ENGLISH_ATTACK =
  '1.e4 c5 2.Nf3 d6 3.d4 cxd4 4.Nxd4 Nf6 5.Nc3 a6 6.Be3 e5 7.Nb3 Be6 8.f3 Be7 9.Qd2 O-O 10.O-O-O Nbd7 11.g4';
const SVESH = '1.e4 c5 2.Nf3 Nc6 3.d4 cxd4 4.Nxd4 Nf6 5.Nc3 e5 6.Ndb5 d6 7.Bg5 a6 8.Na3 b5 9.Bxf6 gxf6';

export const LESSONS: Lesson[] = [
  {
    id: 'iqp',
    title: 'The isolated queen’s pawn',
    track: 'Pawn structures',
    level: 'Advanced',
    minutes: 12,
    summary: 'Dynamic strength or static weakness? Learn both plans — attacking with the isolani and blockading it.',
    openings: ['queens-gambit', 'caro-kann', 'nimzo-indian'],
    sections: [
      {
        title: 'What the isolani gives you',
        text: [
          'A pawn on d4 with no c- or e-pawn beside it is an isolated queen’s pawn (IQP). It can never be defended by another pawn, and the square in front of it (d5) can never be attacked by one.',
          'In return, the IQP side gets space, two half-open files (c and e), and outposts on e5 and c5. The middlegame is its best phase: with pieces on the board, the pawn supports an attack.',
        ],
        pgn: QGA_IQP,
        marks: ['d4', 'd5', 'e5', 'c5'],
        arrows: ['b:f3e5', 'b:c3e4'],
      },
      {
        title: 'Against the isolani: blockade',
        text: [
          'Nimzowitsch’s rule: first restrain, then blockade, then destroy. The ideal blockader is a knight on the square in front of the pawn — it cannot be chased away by pawns and it radiates to both wings.',
        ],
        pgn: QGA_IQP,
        orientation: 'b',
        task: {
          prompt: 'Black to move. Start the blockade of d5.',
          accept: ['Nb4', 'Nd5'],
          hint: 'Which knight can reach d5, and by which route?',
          explain:
            '…Nb4 heads for d5 while also eyeing d3 and c2; …Nd5 occupies the blockade square at once. Either way a knight on d5 blunts White’s pieces and makes the pawn a long-term target.',
        },
      },
      {
        title: 'With the isolani: attack',
        text: [
          'The IQP side must be active. Pieces go to aggressive squares: a knight on e5, a bishop on the b1–h7 diagonal, a rook ready to swing to the kingside. Each piece trade weakens the pawn, so avoid them.',
        ],
        pgn: PANOV,
        task: {
          prompt: 'White to move. Occupy the outpost that the isolani supports.',
          accept: ['Ne5', 'Qd3'],
          hint: 'The d4 pawn protects one central square in Black’s half.',
          explain:
            'Ne5! — the knight is untouchable by pawns and supports Ng4 or Qd3 ideas against the king. Qd3 (building a battery toward h7) is also thematic.',
        },
        practice: { side: 'w', prompt: 'Play the IQP attack as White from here.' },
      },
    ],
  },
  {
    id: 'minority-attack',
    title: 'The minority attack',
    track: 'Pawn structures',
    level: 'Intermediate',
    minutes: 10,
    summary: 'Two pawns attacking three: how b4–b5 creates a permanent weakness in the Carlsbad structure.',
    openings: ['queens-gambit', 'caro-kann', 'slav'],
    sections: [
      {
        title: 'The Carlsbad structure',
        text: [
          'After the Exchange Variation, White has pawns on a2 and b2 against Black’s a7, b7 and c6. Advancing the minority with b4–b5 forces a concession: if Black takes on b5, the c6/d5 pawns are weakened; if Black lets White take on c6, a backward c-pawn appears.',
          'The rook on b1 supports the advance; the queen on c2 and bishop on d3 keep Black’s kingside counterplay in check.',
        ],
        pgn: CARLSBAD,
        arrows: ['b:b2b4', 'b:b4b5'],
        marks: ['c6', 'd5'],
        task: {
          prompt: 'White to move. Launch the minority attack.',
          accept: ['b4'],
          hint: 'The b-pawn wants to reach b5.',
          explain:
            'b4! starts the plan; a4 and b5 follow. h3 first (to stop …Ne4/…Bg4 ideas) is also playable — the plan matters more than the exact move order.',
        },
      },
      {
        title: 'Collecting the weakness',
        text: [
          'Once the files are open, Black has a backward pawn on c6 fixed on a half-open file. White piles up: knight to c5, rooks on the c- and b-files, queen behind.',
        ],
        pgn: `${CARLSBAD} 12.b4 a6 13.a4 Be6 14.b5 axb5 15.axb5 Rc8 16.bxc6 bxc6`,
        marks: ['c6', 'c5'],
        task: {
          prompt: 'White to move. Find the knight route to the ideal square.',
          accept: ['Na4', 'Bxf6'],
          hint: 'c5 is the perfect square — no Black pawn can ever attack it.',
          explain:
            'Na4 heading for c5 eyes the weak c6 pawn and the bishop on e6. Bxf6 first (removing a defender of d5) followed by Na4 is equally strong.',
        },
        practice: { side: 'w', prompt: 'Squeeze the weak c6-pawn against the coach.' },
      },
    ],
  },
  {
    id: 'hanging-pawns',
    title: 'Hanging pawns',
    track: 'Pawn structures',
    level: 'Advanced',
    minutes: 8,
    summary: 'Side-by-side pawns on c5 and d5: when they are a strength, and how Fischer took them apart.',
    openings: ['queens-gambit', 'nimzo-indian'],
    sections: [
      {
        title: 'Strength while mobile',
        text: [
          'Hanging pawns control many central squares and can advance to open lines. But they have no neighbours: when one advances, the other becomes isolated, and the square in front of the advanced pawn becomes an outpost.',
          'The plan against them: pressure with pieces to force one forward, then blockade.',
        ],
        pgn: TARTAKOWER,
        marks: ['c5', 'd5', 'd4'],
        task: {
          prompt: 'White to move (Fischer–Spassky 1972, game 6). Find the blockading move.',
          accept: ['Nd4', 'Rfd1'],
          hint: 'Which square in front of the pawns does no Black pawn control?',
          explain:
            'Fischer played 18.Nd4! — the knight sits in front of d5, hits e6 and invites trades that leave the pawns weak. Rfd1 adding pressure on d5 is a strong alternative.',
        },
        practice: { side: 'w', prompt: 'Play Fischer’s side against the hanging pawns.' },
      },
    ],
  },
  {
    id: 'pawn-chains',
    title: 'Pawn chains: attack the base',
    track: 'Pawn structures',
    level: 'Intermediate',
    minutes: 10,
    summary: 'Nimzowitsch’s chain rule in the French and the King’s Indian — break at the base, then at the head.',
    openings: ['french', 'kings-indian', 'caro-kann'],
    sections: [
      {
        title: 'The French chain',
        text: [
          'A pawn chain is only as strong as its base. In the Advance French, White’s chain d4–e5 rests on d4. Black attacks it with …c5, piles up with …Nc6, …Qb6 and …Nf5, and only then hits the head with …f6.',
        ],
        pgn: '1.e4 e6 2.d4 d5 3.e5 c5 4.c3 Nc6 5.Nf3',
        orientation: 'b',
        marks: ['d4'],
        arrows: ['r:c5d4', 'r:c6d4'],
        task: {
          prompt: 'Black to move. Add pressure to the base of the chain.',
          accept: ['Qb6', 'Nge7', 'cxd4', 'Bd7'],
          hint: 'Count attackers and defenders of d4.',
          explain:
            '…Qb6 hits d4 and b2 at once — the main line. …Nge7 heading to f5 and …Bd7 (preparing Qb6 without allowing tricks) are the other standard moves.',
        },
      },
      {
        title: 'The King’s Indian chain',
        text: [
          'After d5 in the King’s Indian, the chains point at opposite wings. Black attacks the base of White’s chain (e4) with …f5; White attacks the base of Black’s chain (d6) with c4–c5. Whoever breaks through first usually wins.',
        ],
        pgn: MDP,
        orientation: 'b',
        arrows: ['b:f7f5', 'r:c4c5'],
        task: {
          prompt: 'Black to move. Prepare the thematic pawn break.',
          accept: ['Nd7', 'Ne8', 'a5'],
          hint: 'The f-pawn is blocked by a knight.',
          explain:
            '…Nd7 (or …Ne8) unblocks the f-pawn so that …f5 can strike at e4. …a5 first, slowing White’s queenside, is also a top choice.',
        },
        practice: { side: 'b', prompt: 'Race White in the King’s Indian.' },
      },
    ],
  },
  {
    id: 'hedgehog',
    title: 'Hedgehog & Maróczy bind',
    track: 'Pawn structures',
    level: 'Advanced',
    minutes: 8,
    summary: 'Space vs. resilience: how to squeeze the hedgehog and how the hedgehog bites back.',
    openings: ['english'],
    sections: [
      {
        title: 'The setup',
        text: [
          'White’s pawns on c4 and e4 form a Maróczy bind that clamps d5. Black sets pawns on a6, b6, d6 and e6 — a compact, spiky formation that waits for …b5 or …d5.',
          'For White: restrain both breaks before doing anything ambitious. For Black: patience, then strike when White over-extends.',
        ],
        pgn: HEDGEHOG,
        marks: ['b5', 'd5'],
        arrows: ['b:b6b5', 'b:d6d5'],
        practice: { side: 'b', prompt: 'Play the hedgehog as Black: wait, then break.' },
      },
    ],
  },
  {
    id: 'opposite-castling',
    title: 'Opposite-side castling races',
    track: 'Attack & defence',
    level: 'Advanced',
    minutes: 10,
    summary: 'When kings live on opposite wings, tempo beats material. Learn to count the race.',
    openings: ['najdorf', 'dragon', 'kings-indian'],
    sections: [
      {
        title: 'Prophylaxis before the storm',
        text: [
          'In the Yugoslav Attack, White storms with h4–h5 while Black uses the c-file and …Nc4. One quiet king move can be worth more than an extra attacking move: Kb1 removes the king from the c1–h6 diagonal and the c-file pins.',
        ],
        pgn: DRAGON,
        task: {
          prompt: 'White to move. Make the king safe — or start the storm.',
          accept: ['Kb1', 'h4'],
          hint: 'Black’s knight is coming to c4.',
          explain:
            'Kb1 is the engine’s top choice: it pre-empts checks and pins before opening lines. h4 immediately is the aggressive alternative.',
        },
      },
      {
        title: 'Counterattack, don’t defend',
        text: [
          'In the English Attack, White’s g-pawn is rolling. A passive defensive move loses the race. Black must create threats on the queenside just as fast.',
        ],
        pgn: ENGLISH_ATTACK,
        orientation: 'b',
        task: {
          prompt: 'Black to move. Join the race.',
          accept: ['b5'],
          hint: 'Use your pawns the way White uses theirs.',
          explain: '…b5! with …b4 next to kick the c3 knight. Every tempo counts — White’s g5 is coming too.',
        },
        practice: { side: 'b', prompt: 'Race White’s English Attack.' },
      },
    ],
  },
  {
    id: 'bad-bishop',
    title: 'Knight vs. a helpless bishop',
    track: 'Pieces & squares',
    level: 'Intermediate',
    minutes: 8,
    summary: 'Fix the enemy pawns on the colour their bishop cannot reach — then let the knight feast.',
    openings: ['french', 'nimzo-indian'],
    sections: [
      {
        title: 'Weaknesses on the wrong colour',
        text: [
          'Black’s pawns on b6 and d6 are fixed on dark squares by White’s pawns. Black’s bishop is light-squared, so it can never defend them. Black’s pawn on g6 and the bishop’s friends restrict it further.',
          'A knight is the ideal attacker here: it can hit dark squares and reach outposts the bishop cannot challenge.',
        ],
        fen: '2b5/5k2/1p1p2p1/pP1Pp1P1/P3P3/3NK3/8/8 w - - 0 1',
        marks: ['b6', 'd6', 'c4'],
        task: {
          prompt: 'White to move. Find the decisive knight route.',
          accept: ['Nb2'],
          hint: 'Which square attacks both b6 and d6?',
          explain:
            'Nb2! heading for c4, where the knight attacks b6 and d6 at once. The bishop can never cover those dark squares — one pawn falls, and the game with it. Every other move lets Black regroup.',
        },
        practice: { side: 'w', prompt: 'Convert the knight vs. bishop endgame.' },
      },
    ],
  },
  {
    id: 'outposts',
    title: 'Outposts and holes',
    track: 'Pieces & squares',
    level: 'Intermediate',
    minutes: 8,
    summary: 'A square no pawn can attack is a home for a knight. Learn to spot holes and route pieces to them.',
    openings: ['najdorf', 'ruy-lopez', 'italian', 'london'],
    sections: [
      {
        title: 'The d5 hole',
        text: [
          'In the Sveshnikov and Najdorf, Black plays …e5 and leaves a hole on d5: no Black pawn can ever attack it after …e5 and …b5. White’s whole strategy revolves around that square.',
        ],
        pgn: SVESH,
        marks: ['d5'],
        task: {
          prompt: 'White to move. Occupy the outpost.',
          accept: ['Nd5'],
          hint: 'Which knight can land on the hole right now?',
          explain:
            'Nd5! — the knight dominates from d5, eyes f6, c7 and b6, and can only be removed by a piece exchange. Every other move lets Black play …f5 and …Bg7 with full activity.',
        },
      },
      {
        title: 'Fighting the outpost',
        text: [
          'The defending side has two remedies: trade the knight (…Ne7 or …Bxd5), or create counterplay elsewhere — here …f5 opens the g-file and challenges e4.',
        ],
        pgn: `${SVESH} 10.Nd5`,
        orientation: 'b',
        arrows: ['b:f6f5', 'b:c6e7'],
      },
    ],
  },
  {
    id: 'open-files',
    title: 'Open files and the seventh rank',
    track: 'Pieces & squares',
    level: 'Intermediate',
    minutes: 6,
    summary: 'Rooks need open files; open files lead to the seventh rank.',
    sections: [
      {
        title: 'Invade',
        text: [
          'Rooks belong on open files — files without pawns. The goal of an open file is usually invasion: a rook on the seventh rank attacks pawns from the side, where they are hardest to defend, and cuts off the enemy king.',
        ],
        fen: 'r4rk1/pp3ppp/2p5/8/8/2P5/PP3PPP/R3R1K1 w - - 0 1',
        marks: ['e7', 'b7', 'f7'],
        task: {
          prompt: 'White to move. Use the open file.',
          accept: ['Re7'],
          hint: 'Your rook already controls the only open file.',
          explain:
            'Re7! invades the seventh rank and hits b7. Black must passively defend with …b5 or …Rab8. Quiet moves like Kf1 are fine, but give Black time to contest the e-file with …Rfe8.',
        },
        practice: { side: 'w', prompt: 'Play the rook ending from here.' },
      },
    ],
  },
  {
    id: 'prophylaxis',
    title: 'Prophylaxis: what does my opponent want?',
    track: 'Thinking skills',
    level: 'Advanced',
    minutes: 8,
    summary: 'Before every move, ask what the opponent wants — then make a move that prevents it and improves your position.',
    openings: ['ruy-lopez', 'catalan', 'najdorf'],
    sections: [
      {
        title: 'Stopping the pin',
        text: [
          'In the Closed Ruy Lopez White wants d4. Black wants …Bg4, pinning the knight that defends d4. A small pawn move prevents the pin for the rest of the game.',
        ],
        pgn: '1.e4 e5 2.Nf3 Nc6 3.Bb5 a6 4.Ba4 Nf6 5.O-O Be7 6.Re1 b5 7.Bb3 d6 8.c3 O-O',
        marks: ['g4'],
        arrows: ['r:c8g4'],
        task: {
          prompt: 'White to move. Prevent Black’s most useful idea before playing d4.',
          accept: ['h3', 'a4', 'd4'],
          hint: 'Where does the c8-bishop want to go?',
          explain:
            '9.h3! takes g4 away from the bishop (and knight), so d4 can follow without allowing a pin. a4 and the immediate d4 are respectable alternatives, but h3 is the classical solution.',
        },
      },
      {
        title: 'Stopping the expansion',
        text: [
          'In the Najdorf, Black’s main source of counterplay is …b5–b4. White can take it away with a single move.',
        ],
        pgn: '1.e4 c5 2.Nf3 d6 3.d4 cxd4 4.Nxd4 Nf6 5.Nc3 a6 6.Be2 e5 7.Nb3 Be7 8.O-O O-O 9.Be3 Be6 10.Qd2 Nbd7',
        task: {
          prompt: 'White to move. Restrain Black’s queenside play.',
          accept: ['a4'],
          hint: 'Which pawn move stops …b5?',
          explain: 'a4! stops …b5. Next a5 fixes the queenside, and Black loses the most natural plan.',
        },
      },
    ],
  },
  {
    id: 'calculation',
    title: 'Checks, captures, threats',
    track: 'Thinking skills',
    level: 'Intermediate',
    minutes: 12,
    summary: 'The forcing-move checklist, trained on famous opening traps that still catch strong players.',
    sections: [
      {
        title: 'Look at every forcing move',
        text: [
          'Before choosing a quiet move, list every check, capture and threat — for both sides. Most tactics hide among forcing moves the eye rejects because they “lose material”.',
        ],
        pgn: '1.e4 e5 2.Nf3 d6 3.Bc4 Bg4 4.Nc3 g6',
        task: {
          prompt: 'White to move. A capture that seems to drop the queen.',
          accept: ['Nxe5'],
          hint: 'If …Bxd1, what checks follow?',
          explain:
            'Nxe5! If 5…Bxd1?? 6.Bxf7+ Ke7 7.Nd5# — Légal’s mate. After 5…dxe5 6.Qxg4 White is simply a pawn up.',
        },
      },
      {
        title: 'Pins can be broken',
        text: ['A pinned piece is only pinned if moving it really loses. Check whether a counter-threat changes the picture.'],
        pgn: '1.d4 d5 2.c4 e6 3.Nc3 Nf6 4.Bg5 Nbd7 5.cxd5 exd5 6.Nxd5',
        orientation: 'b',
        task: {
          prompt: 'Black to move. White just grabbed d5. Punish it.',
          accept: ['Nxd5'],
          hint: 'What happens if White takes your queen?',
          explain: '6…Nxd5! 7.Bxd8 Bb4+ 8.Qd2 Bxd2+ 9.Kxd2 Kxd8 — the Elephant trap. Black wins a piece.',
        },
      },
      {
        title: 'Greed punished',
        text: ['When your opponent grabs material, look for ways to trap the piece that did the grabbing — or a piece left behind.'],
        pgn: '1.e4 e5 2.Nf3 Nc6 3.Bb5 a6 4.Ba4 d6 5.d4 b5 6.Bb3 Nxd4 7.Nxd4 exd4 8.Qxd4',
        orientation: 'b',
        task: {
          prompt: 'Black to move. Trap a White piece.',
          accept: ['c5'],
          hint: 'The b3 bishop has very few squares.',
          explain: '8…c5! 9.Qd5 Be6 10.Qc6+ Bd7 11.Qd5 c4 — Noah’s Ark: the bishop on b3 is entombed.',
        },
      },
      {
        title: 'Smothered',
        text: ['Pieces that block their own king can be fatal. Check what each knight jump does when the king has no flight squares.'],
        pgn: '1.e4 c6 2.d4 d5 3.Nc3 dxe4 4.Nxe4 Nd7 5.Qe2 Ngf6',
        task: {
          prompt: 'White to move. Mate in one.',
          accept: ['Nd6#'],
          hint: 'The e7-pawn is pinned by your queen.',
          explain: '6.Nd6# — the e-pawn cannot capture because it is pinned against the king. Smothered by its own pieces.',
        },
      },
      {
        title: 'Counter-punch',
        text: ['When the opponent grabs a pawn and attacks you, look for the counterattack with tempo.'],
        pgn: '1.e4 e5 2.Nf3 Nc6 3.Bc4 Nd4 4.Nxe5',
        orientation: 'b',
        task: {
          prompt: 'Black to move. Punish White’s greed.',
          accept: ['Qg5'],
          hint: 'Two White targets on the g-file and e5.',
          explain:
            '4…Qg5! hits the e5 knight and g2. If 5.Nxf7?? Qxg2 6.Rf1 Qxe4+ 7.Be2 Nf3# — the Blackburne Shilling trap.',
        },
      },
    ],
  },
  {
    id: 'rook-endgames',
    title: 'Rook endgames: Lucena & Philidor',
    track: 'Endgames',
    level: 'Intermediate',
    minutes: 12,
    summary: 'The two positions every serious player must know: how to win with the bridge and how to draw with the third-rank defence.',
    sections: [
      {
        title: 'Lucena: build a bridge',
        text: [
          'White’s pawn is on the seventh, the king in front of it, and the Black king cut off. The winning method: drive the enemy king one file further away, then bring the rook to the fourth rank to block checks — the “bridge”.',
        ],
        fen: '1K6/1P1k4/8/8/8/8/r7/2R5 w - - 0 1',
        task: {
          prompt: 'White to move and win.',
          accept: ['Rd1+', 'Rc7+', 'Rc4', 'Rc3'],
          hint: 'First push the king away with check, then prepare a shield on the fourth rank.',
          explain:
            'Rd1+ Ke7 2.Rd4! (the bridge) and the king walks out: Kc7, Kb6, Kc6, Kb5 and Rb4 blocks the checks. Rc4 and Rc7+ are other ways into the same idea.',
        },
        practice: { side: 'w', prompt: 'Win the Lucena position against the coach.' },
        drill: 'lucena',
      },
      {
        title: 'Philidor: the third-rank defence',
        text: [
          'The defender keeps the rook on its third rank (the sixth for Black), stopping the White king from advancing. Only when the pawn advances to the sixth does the rook drop to the back rank and check from behind.',
        ],
        fen: '4k3/8/r7/4PK2/8/8/8/1R6 b - - 0 1',
        orientation: 'b',
        task: {
          prompt: 'Black to move. Hold the draw.',
          accept: ['Ke7', 'Kf8', 'Kd7', 'Kf7', 'Rb6', 'Rc6', 'Rh6'],
          hint: 'Keep the rook on the sixth rank; don’t let the king in front of the pawn.',
          explain:
            'Waiting moves with the king, or keeping the rook on the sixth, draw. If e6 comes, the rook goes to the back rank and checks from behind. Never put the rook on d6 or f6 here — the pawn or king takes it.',
        },
        practice: { side: 'b', prompt: 'Defend the Philidor position.' },
        drill: 'philidor',
      },
    ],
  },
];

LESSONS.push(...ENDGAME_LESSONS);

export function getLesson(id: string) {
  return LESSONS.find((l) => l.id === id);
}
