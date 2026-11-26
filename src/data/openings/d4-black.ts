import type { Opening } from '../../lib/openings/types';

export const kingsIndian: Opening = {
  id: 'kings-indian',
  name: 'King’s Indian Defence',
  eco: 'E60–E99',
  side: 'b',
  family: '1.d4',
  level: 'Advanced',
  tagline: 'Let White build a center — then storm the king.',
  root: '1.d4 Nf6 2.c4 g6 3.Nc3 Bg7 4.e4 d6',
  summary: [
    'The King’s Indian is a hypermodern counterattack: Black allows White a big center, then strikes with …e5 (or …c5). When White closes the center with d5, the game becomes a race: White on the queenside, Black on the kingside with …f5–f4, …g5–g4.',
    'It demands courage and precise timing. Understanding the pawn-break logic is what separates club players from experts in this opening.',
  ],
  ideas: [
    '…e5 to challenge d4; if White plays d5, the center is locked and the wings decide.',
    '…Ne8/…Nd7, …f5, …f4, …g5–g4: the Mar del Plata storm.',
    'The g7 bishop may look blocked, but it returns to life after …f4 and …g4 or a later …e4.',
    'Rooks on the f-file, …Rf7 and …Bf8 for defence of c7.',
  ],
  opponentIdeas: [
    'Queenside break with c4–c5 to open the c-file toward c7.',
    'b4 (Bayonet) and Nd2–c4 to speed up the queenside attack.',
    'Sämisch with f3 and Be3, then a kingside pawn storm of White’s own.',
  ],
  structures: ['kid-chain', 'benoni'],
  plans: [
    {
      title: 'Mar del Plata storm',
      text: 'After 9.Ne1: …Nd7, …f5, …f4 to cramp White’s kingside, …g5–g4 to open lines, then …Rf6–h6 or …Qe8–h5. White uses c5 and Nb5/Nd3 to invade c7.',
    },
    {
      title: 'Benoni-style play with …c5',
      text: 'Against the Sämisch or Four Pawns, …c5 and …e6 lead to Benoni structures where Black’s queenside majority and e-file play compensate for White’s center.',
    },
  ],
  traps: [],
  lines: [
    {
      id: 'mar-del-plata',
      name: 'Classical: Mar del Plata',
      about: 'The iconic race — closed center, opposite-wing attacks.',
      pgn: `1.d4 Nf6 2.c4 g6 3.Nc3 Bg7 4.e4 d6 5.Nf3 O-O 6.Be2 e5 {The central challenge.} 7.O-O Nc6 8.d5 {White closes the center.} Ne7 9.Ne1 {Prepares f3 and Nd3 with c5.} Nd7 {Clears the f-pawn.} 10.Be3 f5 11.f3 f4 {Gains kingside space and locks in the e3 bishop.} 12.Bf2 g5 13.Nd3 Ng6 14.c5 {White’s break on the queenside.} Nf6 15.Rc1 Rf7 {Defends c7 along the seventh rank while preparing …Bf8 and …g4.}`,
    },
    {
      id: 'bayonet',
      name: 'Classical: Bayonet 9.b4',
      about: 'White speeds up the queenside attack immediately.',
      pgn: `1.d4 Nf6 2.c4 g6 3.Nc3 Bg7 4.e4 d6 5.Nf3 O-O 6.Be2 e5 7.O-O Nc6 8.d5 Ne7 9.b4 {The Bayonet: c5 comes fast.} Nh5 {Preparing …f5 and eyeing f4.} 10.Re1 f5 11.Ng5 Nf6 12.Bf3 c6 {Black strikes back on the queenside to slow c5.} 13.b5`,
    },
    {
      id: 'samisch',
      name: 'Sämisch: 5.f3',
      about: 'White solidifies e4 and prepares a kingside storm.',
      pgn: `1.d4 Nf6 2.c4 g6 3.Nc3 Bg7 4.e4 d6 5.f3 {Protects e4 and prepares Be3, Qd2 and g4–h4.} O-O 6.Be3 e5 7.Nge2 c6 {Preparing …b5 or …cxd5 to open the c-file.} 8.Qd2 Nbd7 9.O-O-O a6 {Opposite-side castling: Black plays …b5.} 10.Kb1 b5`,
    },
    {
      id: 'fianchetto',
      name: 'Fianchetto: Panno setup',
      about: 'Black plays …Nc6, …a6, …Rb8 and …b5 against White’s g3.',
      pgn: `1.d4 Nf6 2.c4 g6 3.Nf3 Bg7 4.g3 O-O 5.Bg2 d6 6.O-O Nc6 7.Nc3 a6 {The Panno: …Rb8 and …b5 next.} 8.d5 Na5 9.Nd2 c5 10.Qc2 Rb8 11.b3 b5 {Queenside counterplay; the g7 bishop hits the long diagonal.}`,
    },
  ],
  lessons: ['pawn-chains', 'opposite-castling'],
};

export const nimzoIndian: Opening = {
  id: 'nimzo-indian',
  name: 'Nimzo-Indian Defence',
  eco: 'E20–E59',
  side: 'b',
  family: '1.d4',
  level: 'Advanced',
  tagline: 'Bishop for knight — structure over material.',
  root: '1.d4 Nf6 2.c4 e6 3.Nc3 Bb4',
  summary: [
    '3…Bb4 pins the knight that would support e4. Black is often happy to give up the bishop pair to double White’s c-pawns, then blockade the position so the knights outperform the bishops.',
    'It is among the most respected defences at every level because it fights for the center with pieces rather than pawns, and it reaches rich, unbalanced structures.',
  ],
  ideas: [
    'Control e4: …Bb4, …b6/…Bb7, …Ne4 and …f5 in some lines.',
    '…Bxc3 doubles White’s pawns; then close the position with …d6, …e5, …c5.',
    'Target the c4 pawn with …Ba6, …Na5, …Rc8.',
    'The Rubinstein structure: after …dxc4 and …e5, Black frees the game.',
  ],
  opponentIdeas: [
    'The bishop pair — open the position with e4 and f3.',
    'Qc2 or a3 to avoid doubled pawns.',
    'Central expansion with f3 and e4 (Sämisch).',
  ],
  structures: ['hanging', 'iqp', 'locked-center'],
  plans: [
    {
      title: 'Knights vs. bishops',
      text: 'After …Bxc3, keep the position closed: pawns on dark squares (…c5, …d6, …e5) blunt White’s bishops and fix the doubled c-pawns as targets.',
    },
  ],
  traps: [],
  lines: [
    {
      id: 'rubinstein',
      name: 'Rubinstein: 4.e3',
      about: 'The main line — flexible development and a central fight.',
      pgn: `1.d4 Nf6 2.c4 e6 3.Nc3 Bb4 {The pin: e4 is now hard for White to achieve.} 4.e3 O-O 5.Bd3 d5 6.Nf3 c5 7.O-O Nc6 8.a3 Bxc3 9.bxc3 dxc4 10.Bxc4 Qc7 {Preparing …e5.} 11.Bd3 e5 {Black frees the position and challenges the center.} 12.Qc2 Re8`,
    },
    {
      id: 'classical-qc2',
      name: 'Classical: 4.Qc2',
      about: 'White avoids doubled pawns; Black plays for …b6 and …d5.',
      pgn: `1.d4 Nf6 2.c4 e6 3.Nc3 Bb4 4.Qc2 {Recapture on c3 with the queen.} O-O 5.a3 Bxc3+ 6.Qxc3 b6 {Fianchetto to fight for e4.} 7.Bg5 Bb7 8.f3 h6 9.Bh4 d5 10.e3 Nbd7 11.cxd5 Nxd5 12.Bxd8 Nxc3 13.Bh4 Nd5 14.Bf2 {An endgame where White’s bishops are balanced by Black’s lead in development.}`,
    },
    {
      id: 'samisch',
      name: 'Sämisch: 4.a3',
      about: 'White takes the bishop pair immediately; Capablanca’s …Ne8 plan.',
      pgn: `1.d4 Nf6 2.c4 e6 3.Nc3 Bb4 4.a3 Bxc3+ 5.bxc3 c5 {Fixing the doubled pawns.} 6.e3 Nc6 7.Bd3 O-O 8.Ne2 b6 9.e4 Ne8 {Capablanca’s idea: avoid the pin Bg5 and prepare …f5 to stop White’s kingside play.} 10.O-O Ba6 {Hitting the weak c4 pawn.}`,
    },
  ],
  lessons: ['hanging-pawns', 'bad-bishop'],
};

export const grunfeld: Opening = {
  id: 'grunfeld',
  name: 'Grünfeld Defence',
  eco: 'D70–D99',
  side: 'b',
  family: '1.d4',
  level: 'Advanced',
  tagline: 'Give White the center — then blow it up.',
  root: '1.d4 Nf6 2.c4 g6 3.Nc3 d5',
  summary: [
    'The Grünfeld invites White to build a big pawn center with e4 and then attacks it with pieces: …Bg7, …c5, …Nc6, …Bg4 and …Qa5. It is dynamic, concrete and loved by elite players.',
    'Precision matters: the Exchange Variation in particular is deeply analysed, but the plans repeat — pressure d4 and use the long diagonal.',
  ],
  ideas: [
    'Pressure d4: …Bg7, …c5, …Nc6, …Bg4 pinning the defender.',
    'The g7 bishop on the long diagonal is the main asset.',
    'Queenside counterplay with …Qa5 and …Rb8/…b6.',
    'Accept material imbalances (exchange sacrifices, pawn grabs) for activity.',
  ],
  opponentIdeas: [
    'Big center with e4 and d4; d5 advance to gain space.',
    'Rb1 against …Qa5 and b2; Be3 and Qd2 to support d4.',
    'Kingside attack with f4–f5 in some lines.',
  ],
  structures: ['open-center'],
  plans: [
    {
      title: 'Attack the center',
      text: 'Keep hitting d4. If White pushes d5, Black targets c3/e4 and the queenside with …e6 or …c4 depending on the setup.',
    },
  ],
  traps: [],
  lines: [
    {
      id: 'exchange-rb1',
      name: 'Exchange: 7.Nf3 and 8.Rb1',
      about: 'The modern main line — Black grabs a2.',
      pgn: `1.d4 Nf6 2.c4 g6 3.Nc3 d5 {The Grünfeld.} 4.cxd5 Nxd5 5.e4 Nxc3 6.bxc3 Bg7 {The bishop eyes d4 and c3.} 7.Nf3 c5 8.Rb1 {Defends b2 indirectly and prepares Be2.} O-O 9.Be2 cxd4 10.cxd4 Qa5+ 11.Bd2 Qxa2 {Black takes a pawn; White gets development and central space.} 12.O-O Bg4 13.Bg5`,
    },
    {
      id: 'exchange-bc4',
      name: 'Exchange: 7.Bc4 (Seville)',
      about: 'The classical main line with the famous exchange sacrifice.',
      pgn: `1.d4 Nf6 2.c4 g6 3.Nc3 d5 4.cxd5 Nxd5 5.e4 Nxc3 6.bxc3 Bg7 7.Bc4 c5 8.Ne2 Nc6 9.Be3 O-O 10.O-O Bg4 11.f3 Na5 12.Bd3 cxd4 13.cxd4 Be6 14.d5 {White offers the exchange for a mighty center.} Bxa1 15.Qxa1 f6 {Black blocks the long diagonal; a rich imbalance.}`,
    },
    {
      id: 'russian',
      name: 'Russian System: 5.Qb3',
      about: 'White pressures d5 with the queen; Black’s …Bg4 setup.',
      pgn: `1.d4 Nf6 2.c4 g6 3.Nc3 d5 4.Nf3 Bg7 5.Qb3 dxc4 6.Qxc4 O-O 7.e4 Bg4 {Pressure on d4 via the pinned f3 knight.} 8.Be3 Nfd7 {Preparing …Nb6 with tempo on the queen.} 9.Qb3 Nb6 10.Rd1 Nc6 11.d5 Ne5 {Trading off the f3 knight to weaken White’s kingside.} 12.Be2 Nxf3+ 13.gxf3 Bh5 {White has the center and the bishop pair; Black aims at d5 and the damaged kingside.}`,
    },
  ],
  lessons: ['iqp'],
};

export const slav: Opening = {
  id: 'slav',
  name: 'Slav & Semi-Slav',
  eco: 'D10–D49',
  side: 'b',
  family: '1.d4',
  level: 'Intermediate',
  tagline: 'Solid support for d5 without locking in the bishop.',
  root: '1.d4 d5 2.c4 c6',
  summary: [
    '2…c6 supports d5 while keeping the c8-bishop free. In the main Slav Black takes on c4 and develops the bishop to f5; in the Semi-Slav Black plays …e6 first and aims for the dynamic Meran with …dxc4 and …b5.',
    'The Slav teaches when to release the central tension and how to activate a queenside majority.',
  ],
  ideas: [
    '…dxc4 and …Bf5 (Slav) or …e6, …Nbd7, …dxc4, …b5 (Meran).',
    'Freeing breaks: …c5 and …e5.',
    'In the Exchange Slav, use the c-file and play symmetrically but actively.',
  ],
  opponentIdeas: [
    'a4 to stop …b5, then regain c4.',
    'e3–e4 to grab the center.',
    'Bg5 pin lines (Moscow, Anti-Moscow).',
  ],
  structures: ['slav-triangle', 'carlsbad'],
  plans: [
    {
      title: 'The Meran: queenside expansion',
      text: 'After …dxc4 and …b5, Black plays …Bb7, …a6 and …c5. The queenside majority and long-diagonal bishop give Black dynamic counterplay against White’s center.',
    },
  ],
  traps: [],
  lines: [
    {
      id: 'main-slav',
      name: 'Main Slav: 4…dxc4 5.a4 Bf5',
      about: 'The classical main line.',
      pgn: `1.d4 d5 2.c4 c6 3.Nf3 Nf6 4.Nc3 dxc4 5.a4 Bf5 {The bishop develops outside the pawn chain — the whole point of the Slav.} 6.e3 e6 7.Bxc4 Bb4 8.O-O O-O 9.Qe2 Nbd7 10.e4 Bg6 11.Bd3 Bh5 12.e5 Nd5 13.Nxd5 cxd5 14.Qe3`,
    },
    {
      id: 'meran',
      name: 'Semi-Slav: Meran',
      about: 'Dynamic queenside expansion with …b5.',
      pgn: `1.d4 d5 2.c4 c6 3.Nf3 Nf6 4.Nc3 e6 {The Semi-Slav triangle.} 5.e3 Nbd7 6.Bd3 dxc4 7.Bxc4 b5 {The Meran: queenside space with tempo.} 8.Bd3 Bb7 9.O-O a6 10.e4 c5 {The freeing break.} 11.d5 Qc7 12.dxe6 fxe6 13.Bc2`,
    },
    {
      id: 'moscow',
      name: 'Semi-Slav: Moscow 5.Bg5 h6',
      about: 'Black takes the bishop pair in exchange for a little space.',
      pgn: `1.d4 d5 2.c4 c6 3.Nf3 Nf6 4.Nc3 e6 5.Bg5 h6 6.Bxf6 Qxf6 {The bishop pair for Black.} 7.e3 Nd7 8.Bd3 dxc4 9.Bxc4 g6 {The bishop will be strong on g7.} 10.O-O Bg7`,
    },
    {
      id: 'exchange',
      name: 'Exchange Slav',
      about: 'Symmetry — but the side that controls the c-file wins it.',
      pgn: `1.d4 d5 2.c4 c6 3.cxd5 cxd5 {A symmetrical structure.} 4.Nc3 Nf6 5.Bf4 Nc6 6.e3 Bf5 7.Nf3 e6 8.Qb3 Bb4 9.Bb5 O-O 10.Bxc6 Bxc3+ 11.Qxc3 Rc8 12.Ne5 Ne4 {Equal, but the c-file decides who is active.}`,
    },
  ],
  lessons: ['minority-attack'],
};
