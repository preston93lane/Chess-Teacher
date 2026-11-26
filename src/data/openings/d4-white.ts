import type { Opening } from '../../lib/openings/types';

export const queensGambit: Opening = {
  id: 'queens-gambit',
  name: 'Queen’s Gambit',
  eco: 'D06–D69',
  side: 'w',
  family: '1.d4',
  level: 'Intermediate',
  tagline: 'Classical pressure on d5 — and a lifetime of structures.',
  root: '1.d4 d5 2.c4',
  summary: [
    'The Queen’s Gambit offers the c-pawn to deflect Black’s d-pawn from the center. It is not a real gambit: after 2…dxc4 White regains the pawn easily. The real fight is about whether Black can free the position with …c5 or …e5.',
    'Studying the Queen’s Gambit teaches the most important middlegame structures in chess: the Carlsbad (minority attack), the isolated queen’s pawn and hanging pawns.',
  ],
  ideas: [
    'Pressure on d5 with c4, Nc3 and Bg5 (pinning the defender on f6).',
    'In the Exchange (cxd5 exd5), plan the minority attack: Rb1, b4–b5 to create a weak c6-pawn.',
    'Against the QGA, win the pawn back with e3 and Bxc4, then play with the isolani after …c5 and …cxd4.',
    'Rc1 and Qa4/Qb3 often target the c-file and Black’s queenside.',
  ],
  opponentIdeas: [
    'Free the game with …c5 or …e5.',
    'Simplify with …Ne4 or …Nd5 trades (Lasker / Tartakower ideas).',
    'Develop the problem bishop on c8 — via b7 after …b6 or with …dxc4 and …b5.',
  ],
  structures: ['carlsbad', 'iqp', 'hanging'],
  plans: [
    {
      title: 'Minority attack (Carlsbad)',
      text: 'With pawns on a2, b2 vs Black’s a7, b7, c6: play Rb1, b4, a4 and b5. After bxc6 Black is left with a weak pawn on c6 or d5 to attack for the rest of the game.',
    },
    {
      title: 'Isolated queen’s pawn',
      text: 'When the d4 pawn is isolated, keep pieces on, use e5 as an outpost and build a kingside attack with Bd3/Qc2, Re1 and a rook lift.',
    },
  ],
  traps: [
    {
      name: 'Elephant trap',
      pgn: '1.d4 d5 2.c4 e6 3.Nc3 Nf6 4.Bg5 Nbd7 5.cxd5 exd5 6.Nxd5? Nxd5 7.Bxd8 Bb4+ 8.Qd2 Bxd2+ 9.Kxd2 Kxd8',
      text: 'The knight on f6 looks pinned, but it is not: 6…Nxd5! offers the queen because 7…Bb4+ wins it back with a piece extra.',
    },
  ],
  lines: [
    {
      id: 'tartakower',
      name: 'QGD: Tartakower (Fischer–Spassky)',
      about: 'The famous 1972 Game 6 structure: hanging pawns for Black.',
      pgn: `1.d4 d5 2.c4 e6 3.Nc3 Nf6 4.Bg5 {Pins the knight that defends d5.} Be7 5.e3 O-O 6.Nf3 h6 7.Bh4 b6 {The Tartakower: …Bb7 solves the problem bishop.} 8.cxd5 Nxd5 9.Bxe7 Qxe7 10.Nxd5 exd5 11.Rc1 Be6 12.Qa4 c5 {Black accepts hanging pawns.} 13.Qa3 {Pressure on c5 — Black must keep the pawns protected.} Rc8 14.Bb5 a6 15.dxc5 bxc5 16.O-O Ra7 17.Be2 Nd7 18.Nd4 {Fischer’s plan: blockade and pressure the hanging pawns.}`,
    },
    {
      id: 'exchange-minority',
      name: 'Exchange: minority attack',
      about: 'The textbook Carlsbad plan with b4–b5.',
      pgn: `1.d4 d5 2.c4 e6 3.Nc3 Nf6 4.cxd5 {Fixes the structure early. Black’s bishop on c8 is now free, but the pawn structure is set.} exd5 5.Bg5 c6 6.e3 Be7 7.Bd3 Nbd7 8.Qc2 O-O 9.Nf3 Re8 10.O-O Nf8 {The knight heads for g6 or e6 to defend the kingside.} 11.Rab1 {Preparing b4–b5: the minority attack.} Ng6 12.b4 a6 13.a4 Be6 14.b5 axb5 15.axb5 Rc8 16.bxc6 bxc6 {The target: the backward pawn on c6. White piles on with Rb6/Qa4 and Na4–c5.}`,
    },
    {
      id: 'qga',
      name: 'Queen’s Gambit Accepted',
      about: 'White regains the pawn and plays with an isolani.',
      pgn: `1.d4 d5 2.c4 dxc4 {Black gives up the center temporarily to develop freely.} 3.Nf3 Nf6 4.e3 e6 5.Bxc4 c5 {The key freeing move.} 6.O-O a6 7.a4 {Stops …b5, which would gain space with tempo.} Nc6 8.Qe2 cxd4 9.Rd1 Be7 10.exd4 {White has an isolated d-pawn: active pieces and attacking chances in exchange for a long-term weakness.} O-O 11.Nc3 Nd5 12.Bd3 {The classic IQP battery toward h7.}`,
    },
    {
      id: 'vs-slav',
      name: 'Against the Slav: 5.a4',
      about: 'Regain c4 and fight for e4.',
      pgn: `1.d4 d5 2.c4 c6 {The Slav keeps the c8-bishop free.} 3.Nf3 Nf6 4.Nc3 dxc4 5.a4 {Prevents …b5 holding the pawn.} Bf5 6.e3 e6 7.Bxc4 Bb4 8.O-O O-O 9.Qe2 Nbd7 10.e4 {The thematic central advance.} Bg6 11.Bd3 Bh5 12.e5 Nd5 13.Nxd5 cxd5 14.Qe3 {White has space and kingside chances; Black has a solid position and pressure on the c-file.}`,
    },
  ],
  lessons: ['minority-attack', 'iqp', 'hanging-pawns'],
};

export const london: Opening = {
  id: 'london',
  name: 'London System',
  eco: 'D02 / A46',
  side: 'w',
  family: '1.d4',
  level: 'Intermediate',
  tagline: 'One setup, deep understanding.',
  root: '1.d4 d5 2.Bf4',
  summary: [
    'The London places the bishop on f4 before e3, then builds a solid triangle with c3, e3 and d4. It is a system, so understanding the middlegame plans and the critical move orders matters more than memorising theory.',
    'Advanced players use it as a flexible platform: Ne5 with f4 for a kingside attack, or a queenside push with b4 depending on Black’s setup.',
  ],
  ideas: [
    'Bf4 early, then e3, c3, Nd2, Ngf3, Bd3 and castle.',
    'Ne5 followed by f4 creates a Stonewall-like grip and a kingside attack.',
    'Keep Bg3 ready to preserve the bishop against …Nh5 or …Bd6.',
    'Meet …Qb6 (hitting b2) with Qb3 or Qc1 — know these in advance.',
  ],
  opponentIdeas: [
    'Early …c5 and …Qb6 targeting b2.',
    'Trade the London bishop with …Bd6 or …Nh5.',
    'A King’s Indian setup with …e5 to hit f4.',
  ],
  structures: ['stonewall', 'slav-triangle'],
  plans: [
    {
      title: 'Kingside attack with Ne5 and f4',
      text: 'Against …e6 setups, put the knight on e5 and support it with f4. Then Rf3–h3, Qf3/Qh5 and g4 ideas bring the attack.',
    },
    {
      title: 'Queenside expansion',
      text: 'When Black castles quickly and keeps the center closed, a4–a5 or b4 can grab queenside space.',
    },
  ],
  traps: [],
  lines: [
    {
      id: 'vs-c5-e6',
      name: 'Main setup vs …c5 and …e6',
      about: 'The classical structure and the Ne5 + f4 plan.',
      pgn: `1.d4 d5 2.Bf4 Nf6 3.e3 c5 4.c3 {The London triangle: d4 is rock solid.} Nc6 5.Nd2 e6 6.Ngf3 Bd6 {Challenging the bishop.} 7.Bg3 {Keeps the bishop; if …Bxg3, hxg3 opens the h-file.} O-O 8.Bd3 b6 9.Ne5 {The outpost knight.} Bb7 10.f4 {A Stonewall grip: White aims for Rf3–h3 or Qf3 and g4.}`,
    },
    {
      id: 'vs-qb6',
      name: 'Against the early …Qb6',
      about: 'Black hits b2; White keeps calm with Qb3 and Qc1.',
      pgn: `1.d4 d5 2.Bf4 Nf6 3.e3 c5 4.c3 Nc6 5.Nd2 Qb6 {Pressure on b2.} 6.Qb3 {Offering a queen trade that would improve White’s structure.} c4 7.Qc2 {The queen keeps an eye on f5 and b2.} g6 {Not 7…Bf5?? 8.Qxf5. Black first secures f5 so the bishop can develop there.} 8.Ngf3 Bf5 9.Qc1 {The queen guards b2 from c1 — a known London resource.} e6 10.Be2 {Next b3 to break up Black’s queenside chain.}`,
    },
    {
      id: 'vs-kid',
      name: 'Against the King’s Indian setup',
      about: 'h3 to keep the bishop, then queenside space.',
      pgn: `1.d4 Nf6 2.Nf3 g6 3.Bf4 Bg7 4.e3 O-O 5.Be2 d6 6.h3 {A retreat square for the bishop after …Nh5.} c5 7.c3 b6 8.O-O Bb7 9.a4 {Gaining space and preparing Na3–c4 or a5.} a6 10.Na3`,
    },
  ],
  lessons: ['outposts', 'opposite-castling'],
};

export const catalan: Opening = {
  id: 'catalan',
  name: 'Catalan',
  eco: 'E01–E09',
  side: 'w',
  family: '1.d4',
  level: 'Advanced',
  tagline: 'The long-diagonal bishop: positional pressure as an art form.',
  root: '1.d4 Nf6 2.c4 e6 3.g3 d5 4.Bg2',
  summary: [
    'The Catalan combines the Queen’s Gambit with a kingside fianchetto. The bishop on g2 rakes the long diagonal toward b7 and a8, making it hard for Black to develop the queenside.',
    'White is often happy to give a pawn on c4 temporarily: the pressure on the long diagonal and the c-file usually wins it back with interest.',
  ],
  ideas: [
    'The Bg2 bishop is the heart of the opening — keep it, and aim it at b7.',
    'Qc2 or Qa4+ to regain the c4 pawn in the Open Catalan.',
    'In the Closed Catalan, prepare e4 with Nbd2/Nc3, Qc2 and Rd1.',
    'Long-term pressure on the c-file and the c6/b7 squares.',
  ],
  opponentIdeas: [
    'Take on c4 and try to hold the pawn with …b5, or return it for development.',
    'Solid closed setup with …Nbd7, …c6 and …b6, aiming for …c5.',
    'Neutralise the bishop with …Bb7/…Be4 trades.',
  ],
  structures: ['slav-triangle'],
  plans: [
    {
      title: 'Regaining c4',
      text: 'Qc2 or Qa4+, then Qxc4. If Black defends with …b5, a4 undermines the chain, and the long diagonal hits a8.',
    },
    {
      title: 'The e4 break',
      text: 'In the Closed Catalan, e2–e4 gains central space and opens the long diagonal further.',
    },
  ],
  traps: [],
  lines: [
    {
      id: 'open-main',
      name: 'Open Catalan: 7.Qc2 a6',
      about: 'Black takes the pawn and tries to activate the bishop via b7.',
      pgn: `1.d4 Nf6 2.c4 e6 3.g3 d5 4.Bg2 {The Catalan bishop.} dxc4 {The Open Catalan.} 5.Nf3 Be7 6.O-O O-O 7.Qc2 {Regaining the pawn.} a6 {Black wants …b5 and …Bb7.} 8.Qxc4 b5 9.Qc2 Bb7 10.Bd2 {Heading for a5 to restrain Black’s queenside.} Be4 11.Qc1 {Avoiding a trade — the queen sits on the c-file, the bishop still eyes the long diagonal.}`,
    },
    {
      id: 'closed',
      name: 'Closed Catalan',
      about: 'A slow battle around the e4 and c5 breaks.',
      pgn: `1.d4 Nf6 2.c4 e6 3.g3 d5 4.Bg2 Be7 5.Nf3 O-O 6.O-O Nbd7 7.Qc2 c6 8.Nbd2 b6 9.e4 {The central break gains space.} Bb7 10.b3 Rc8 11.Bb2 {Both bishops point at Black’s king side; White keeps a pleasant space edge.}`,
    },
  ],
  lessons: ['prophylaxis'],
};

export const english: Opening = {
  id: 'english',
  name: 'English Opening',
  eco: 'A10–A39',
  side: 'w',
  family: 'Flank',
  level: 'Intermediate',
  tagline: 'A Sicilian with an extra tempo.',
  root: '1.c4',
  summary: [
    '1.c4 controls d5 from the flank. Against 1…e5 White gets a Reversed Sicilian with an extra move; against 1…c5 the Symmetrical English leads to rich maneuvering positions.',
    'The g3/Bg2 fianchetto is the backbone: it supports a queenside expansion with a3, b4 and Rb1.',
  ],
  ideas: [
    'Fianchetto with g3 and Bg2, aiming down the long diagonal.',
    'Queenside expansion: a3, b4, Rb1 — the reversed Sicilian plan.',
    'Control of d5 with c4, Nc3 and Bg2.',
    'Flexible center: d3 and e4 or d4 depending on Black’s setup.',
  ],
  opponentIdeas: [
    'Occupy the center with …e5 and …d5.',
    'Mirror White with …g6/…Bg7 or …c5.',
    'Kingside play with …f5 in closed structures.',
  ],
  structures: ['open-sicilian', 'maroczy'],
  plans: [
    {
      title: 'Reversed Sicilian expansion',
      text: 'With an extra tempo, White runs the queenside: a3, b4, Rb1 and b5 to hit the c6 knight and the e5 pawn.',
    },
  ],
  traps: [],
  lines: [
    {
      id: 'reversed-sicilian',
      name: 'Reversed Sicilian: 3…d5',
      about: 'Black plays an Open Sicilian a tempo down; White expands with b4.',
      pgn: `1.c4 e5 2.Nc3 Nf6 3.g3 d5 4.cxd5 Nxd5 5.Bg2 {Pressure on the d5 knight down the long diagonal.} Nb6 6.Nf3 Nc6 7.O-O Be7 8.d3 O-O 9.a3 {Preparing b4 — a Najdorf with colours reversed and an extra tempo.} Be6 10.b4`,
    },
    {
      id: 'four-knights',
      name: 'Four Knights: 4…Bb4',
      about: 'A sharp structure where White fights for d4.',
      pgn: `1.c4 e5 2.Nc3 Nf6 3.Nf3 Nc6 4.g3 Bb4 5.Bg2 O-O 6.O-O e4 7.Ng5 {Hitting e4 immediately.} Bxc3 8.bxc3 Re8 9.f3 {Undermining e4; White gets a big center after exf3.} exf3 10.Nxf3 d5 11.d4`,
    },
    {
      id: 'symmetrical',
      name: 'Symmetrical English',
      about: 'A quiet fianchetto battle that can open suddenly with d4.',
      pgn: `1.c4 c5 2.Nc3 Nc6 3.g3 g6 4.Bg2 Bg7 5.Nf3 Nf6 6.O-O O-O 7.d4 {Opening the position while Black mirrors.} cxd4 8.Nxd4 Nxd4 9.Qxd4 d6 10.Qd3 {White has a slight space plus and pressure on the long diagonal.}`,
    },
  ],
  lessons: ['hedgehog'],
};
