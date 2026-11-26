import type { Opening } from '../../lib/openings/types';

export const najdorf: Opening = {
  id: 'najdorf',
  name: 'Sicilian Najdorf',
  eco: 'B90–B99',
  side: 'b',
  family: '1.e4',
  level: 'Advanced',
  tagline: 'The fighting choice of Fischer and Kasparov.',
  root: '1.e4 c5 2.Nf3 d6 3.d4 cxd4 4.Nxd4 Nf6 5.Nc3 a6',
  summary: [
    '5…a6 is a useful waiting move with many purposes: it takes b5 from White’s pieces, prepares …b5 expansion and keeps the choice between …e5 and …e6 open until White commits.',
    'White chooses the battlefield: the English Attack (Be3, f3, Qd2, g4), the sharp 6.Bg5, the positional 6.Be2 or the Fischer–Sozin 6.Bc4. Black’s counterplay always comes from the half-open c-file, …b5–b4 and central breaks with …d5.',
  ],
  ideas: [
    '…e5 grabs space and kicks the d4 knight; the d5 square becomes the key square for both sides.',
    '…b5 and …b4 drive away the c3 knight that guards e4 and d5.',
    'The c-file: …Rc8, …Qc7 and the thematic exchange sacrifice …Rxc3.',
    '…d5 break when White over-extends, especially with the king on the queenside.',
  ],
  opponentIdeas: [
    'Opposite-side castling and a kingside pawn storm (g4–g5, h4–h5).',
    'Control d5 with Nd5, Bc4 or f3–g4 to kick the f6 knight.',
    'Sacrificial attacks on e6 and b5 (Nd5, Nf5, Bxb5).',
  ],
  structures: ['open-sicilian'],
  plans: [
    {
      title: 'Race against the English Attack',
      text: 'White storms with g4–g5. Black must be quicker on the queenside: …b5–b4, …a5–a4 and …Qa5 or …Rc8. Every tempo counts — never make a passive move.',
    },
    {
      title: 'The d5 square',
      text: 'After …e5, d5 is a hole. Trade White’s pieces that can reach it (…Be6, …Nbd7–b6 or …Nxd5) or make sure a knight landing there can be exchanged.',
    },
  ],
  traps: [],
  lines: [
    {
      id: 'english-attack',
      name: 'English Attack: 6.Be3 e5',
      about: 'The most popular attacking system — a pure race.',
      pgn: `1.e4 c5 2.Nf3 d6 3.d4 cxd4 4.Nxd4 Nf6 5.Nc3 a6 {The Najdorf: flexible and prophylactic.} 6.Be3 {The English Attack: f3, Qd2, O-O-O and g4.} e5 {Space and tempo.} 7.Nb3 Be6 {Fighting for d5.} 8.f3 Be7 9.Qd2 O-O 10.O-O-O Nbd7 11.g4 b5 {Both sides attack — speed is everything.} 12.g5 b4 13.Ne2 Ne8 {The knight retreats but supports …f6 or …a5–a4.} 14.f4 a5`,
    },
    {
      id: 'bg5-main',
      name: '6.Bg5 e6 7.f4 Be7',
      about: 'The classical main line: White attacks with f4–f5 and g4.',
      pgn: `1.e4 c5 2.Nf3 d6 3.d4 cxd4 4.Nxd4 Nf6 5.Nc3 a6 6.Bg5 {Pins the knight and prepares f4.} e6 7.f4 Be7 8.Qf3 Qc7 9.O-O-O Nbd7 10.g4 b5 {Counterattack on the queenside.} 11.Bxf6 Nxf6 12.g5 Nd7 13.f5 {The thematic lever against e6.} Nc5`,
    },
    {
      id: 'poisoned-pawn',
      name: 'Poisoned Pawn: 7…Qb6',
      about: 'Black grabs b2 and survives a storm. Pure theory.',
      pgn: `1.e4 c5 2.Nf3 d6 3.d4 cxd4 4.Nxd4 Nf6 5.Nc3 a6 6.Bg5 e6 7.f4 Qb6 {Attacks d4 and b2.} 8.Qd2 Qxb2 {The Poisoned Pawn — Fischer’s favourite.} 9.Rb1 Qa3 10.f5 {White sacrifices more material for attack.} Nc6 11.fxe6 fxe6 12.Nxc6 bxc6 13.e5 dxe5 14.Bxf6 gxf6 15.Ne4 Be7 16.Be2 {A chaotic position where Black is two pawns up but must defend precisely.}`,
    },
    {
      id: 'be2-classical',
      name: '6.Be2: Classical',
      about: 'Positional — the fight for d5 in slow motion.',
      pgn: `1.e4 c5 2.Nf3 d6 3.d4 cxd4 4.Nxd4 Nf6 5.Nc3 a6 6.Be2 e5 7.Nb3 Be7 8.O-O O-O 9.Be3 Be6 10.Qd2 Nbd7 11.a4 {Restrains …b5.} Rc8 12.a5 {Fixing the queenside; Black plays …Qc7 and …Rfd8 with …d5 in mind.} Qc7`,
    },
    {
      id: 'sozin',
      name: '6.Bc4: Fischer–Sozin',
      about: 'The bishop aims at e6; Black must be careful with sacrifices there.',
      pgn: `1.e4 c5 2.Nf3 d6 3.d4 cxd4 4.Nxd4 Nf6 5.Nc3 a6 6.Bc4 {Aiming at e6 and f7.} e6 {Blunts the bishop.} 7.Bb3 b5 8.O-O Be7 9.Qf3 Qc7 10.Qg3 O-O 11.Bh6 Ne8 {Black defends calmly; next …Kh8 or …Bd7 and …Nc6.} 12.Rad1 Bd7`,
    },
  ],
  lessons: ['opposite-castling', 'outposts'],
};

export const dragon: Opening = {
  id: 'dragon',
  name: 'Sicilian Dragon',
  eco: 'B70–B79',
  side: 'b',
  family: '1.e4',
  level: 'Advanced',
  tagline: 'The long diagonal breathes fire.',
  root: '1.e4 c5 2.Nf3 d6 3.d4 cxd4 4.Nxd4 Nf6 5.Nc3 g6',
  summary: [
    'In the Dragon, Black fianchettoes the bishop on g7 where it rakes the long diagonal toward c3, b2 and White’s queenside king. The Yugoslav Attack (Be3, f3, Qd2, O-O-O, h4–h5) leads to some of the sharpest races in chess.',
    'Black’s counterplay: the c-file, …Ne5–c4, the exchange sacrifice …Rxc3 and the …d5 break.',
  ],
  ideas: [
    'The g7 bishop is the dragon — never trade it lightly.',
    '…Rxc3 exchange sacrifice to shatter White’s queenside.',
    '…Ne5–c4 hits the e3 bishop and the d2 queen.',
    '…d5 central break when White’s king is on c1.',
  ],
  opponentIdeas: [
    'h4–h5 to open the h-file, Bh6 to trade the dragon bishop.',
    'Nd5 to remove Black’s key defender on f6.',
    'Kb1 and b3 to make the king safe before attacking.',
  ],
  structures: ['open-sicilian'],
  plans: [
    {
      title: 'The Yugoslav race',
      text: 'White plays h4–h5, Bh6 and Qh6. Black plays …Rc8, …Ne5–c4, …Rxc3 and …Qa5. Count tempi; a defensive move is often a lost tempo.',
    },
  ],
  traps: [],
  lines: [
    {
      id: 'yugoslav-bc4',
      name: 'Yugoslav Attack: 9.Bc4',
      about: 'The main line: bishop on c4 to stop …d5.',
      pgn: `1.e4 c5 2.Nf3 d6 3.d4 cxd4 4.Nxd4 Nf6 5.Nc3 g6 {The Dragon.} 6.Be3 Bg7 7.f3 {Stops …Ng4 and prepares g4.} O-O 8.Qd2 Nc6 9.Bc4 {Controls d5 and aims at f7.} Bd7 10.O-O-O Rc8 11.Bb3 Ne5 {Heading for c4.} 12.Kb1 Re8 {A modern prophylactic move: …h5 is coming, and the bishop on g7 gets extra protection.} 13.h4 h5 14.Bg5 Rc5`,
    },
    {
      id: 'yugoslav-9oo',
      name: 'Yugoslav Attack: 9.O-O-O d5',
      about: 'Black strikes in the center immediately.',
      pgn: `1.e4 c5 2.Nf3 d6 3.d4 cxd4 4.Nxd4 Nf6 5.Nc3 g6 6.Be3 Bg7 7.f3 O-O 8.Qd2 Nc6 9.O-O-O d5 {The central break: open lines toward White’s king.} 10.exd5 Nxd5 11.Nxc6 bxc6 12.Bd4 e5 13.Bc5 Be6 14.Ne4 Re8 15.h4 {Black has active pieces and an open b-file; White has targets on c6 and a5.}`,
    },
    {
      id: 'classical',
      name: 'Classical: 6.Be2',
      about: 'White castles short: a slower, positional fight.',
      pgn: `1.e4 c5 2.Nf3 d6 3.d4 cxd4 4.Nxd4 Nf6 5.Nc3 g6 6.Be2 Bg7 7.O-O O-O 8.Nb3 Nc6 9.Kh1 {Prepares f4.} a5 10.a4 Be6 11.f4 Qc8 {Pressure on the c-file and against h3.}`,
    },
  ],
  lessons: ['opposite-castling'],
};

export const french: Opening = {
  id: 'french',
  name: 'French Defence',
  eco: 'C00–C19',
  side: 'b',
  family: '1.e4',
  level: 'Intermediate',
  tagline: 'Solid chains, sharp breaks.',
  root: '1.e4 e6 2.d4 d5',
  summary: [
    'The French concedes space for a rock-solid structure. White usually closes the center with e5, building a chain d4–e5; Black attacks the chain with …c5 (base) and …f6 (head).',
    'The price is the light-squared bishop on c8, which is blocked by the e6 pawn. Activating or trading it is a recurring theme.',
  ],
  ideas: [
    'Attack the base of the chain: …c5, …Nc6, …Qb6 and …Nf5 against d4.',
    'Undermine the head with …f6 once d4 is under pressure.',
    'Solve the c8-bishop: …b6 and …Ba6, or …Bd7–b5 to trade it.',
    'In the Winawer, accept the bishop-for-knight trade to damage White’s pawns.',
  ],
  opponentIdeas: [
    'Kingside attack: Qg4, Bd3, h4–h5 using e5 space.',
    'Protect d4 with c3, Nf3 and Be3.',
    'f4–f5 in Classical lines to open the f-file.',
  ],
  structures: ['french-chain'],
  plans: [
    {
      title: 'Base, then head',
      text: 'First pressure d4 with …c5, …Nc6, …Qb6, …Nf5. When White is tied to d4, break with …f6 to open the f-file for your rook.',
    },
  ],
  traps: [
    {
      name: 'Advance queen trap (watch out!)',
      pgn: '1.e4 e6 2.d4 d5 3.e5 c5 4.c3 Nc6 5.Nf3 Qb6 6.Bd3 cxd4 7.cxd4 Nxd4 8.Nxd4 Qxd4 9.Bb5+',
      text: 'Grabbing d4 too early: 9.Bb5+ uncovers the d1 queen and the Black queen on d4 falls. First play …Bd7.',
    },
  ],
  lines: [
    {
      id: 'winawer-poisoned',
      name: 'Winawer: Poisoned Pawn',
      about: 'The sharpest French: Black gives up g7 for central counterplay.',
      pgn: `1.e4 e6 2.d4 d5 3.Nc3 Bb4 {The Winawer: pins the knight and threatens …dxe4.} 4.e5 c5 5.a3 Bxc3+ 6.bxc3 Ne7 7.Qg4 {Attacks g7.} Qc7 {Black counterattacks c3 and e5.} 8.Qxg7 Rg8 9.Qxh7 cxd4 10.Ne2 Nbc6 11.f4 Bd7 12.Qd3 dxc3 {Black has destroyed White’s queenside; White has a passed h-pawn and a strong e5.}`,
    },
    {
      id: 'winawer-positional',
      name: 'Winawer: 7.Nf3 / a4 setup',
      about: 'White plays positionally; Black locks with …c4.',
      pgn: `1.e4 e6 2.d4 d5 3.Nc3 Bb4 4.e5 c5 5.a3 Bxc3+ 6.bxc3 Ne7 7.Nf3 Nbc6 8.a4 Qa5 9.Bd2 Bd7 10.Be2 c4 {Closing the queenside: White’s bishop pair loses power.} 11.O-O f6 {Undermining the e5 head.}`,
    },
    {
      id: 'classical-steinitz',
      name: 'Classical: Steinitz 4.e5',
      about: 'White builds the f4–e5 wall; Black attacks d4 and castles long or short.',
      pgn: `1.e4 e6 2.d4 d5 3.Nc3 Nf6 4.e5 Nfd7 5.f4 c5 {Hitting the base immediately.} 6.Nf3 Nc6 7.Be3 cxd4 8.Nxd4 Bc5 {Trading off White’s good dark-squared bishop.} 9.Qd2 O-O 10.O-O-O a6 11.h4 Nxd4 12.Bxd4 b5 {Opposite castling: Black attacks on the queenside.} 13.Rh3 b4`,
    },
    {
      id: 'advance',
      name: 'Advance Variation',
      about: 'The textbook chain: …c5, …Nc6, …Qb6, …Nf5.',
      pgn: `1.e4 e6 2.d4 d5 3.e5 {White claims space but the chain base d4 is now a target.} c5 4.c3 Nc6 5.Nf3 Bd7 {Avoiding the queen trap and preparing …Qb6 or …Nge7.} 6.Be2 Nge7 7.Na3 cxd4 8.cxd4 Nf5 {Maximum pressure on d4.} 9.Nc2 Qb6 10.O-O`,
    },
    {
      id: 'tarrasch',
      name: 'Tarrasch: 3.Nd2 c5',
      about: 'Black accepts an isolated pawn — or plays with free pieces after …Qxd5.',
      pgn: `1.e4 e6 2.d4 d5 3.Nd2 {Avoids the Winawer pin.} c5 4.exd5 Qxd5 {Black avoids the isolani and keeps a solid structure.} 5.Ngf3 cxd4 6.Bc4 Qd6 7.O-O Nf6 8.Nb3 Nc6 9.Nbxd4 Nxd4 10.Nxd4 a6 11.Re1 Qc7 12.Bb3 Bd6 {Black has a healthy pawn majority in the center; White a small lead in development.}`,
    },
  ],
  lessons: ['pawn-chains', 'bad-bishop'],
};

export const caroKann: Opening = {
  id: 'caro-kann',
  name: 'Caro-Kann Defence',
  eco: 'B10–B19',
  side: 'b',
  family: '1.e4',
  level: 'Intermediate',
  tagline: 'French solidity without the bad bishop.',
  root: '1.e4 c6 2.d4 d5',
  summary: [
    'The Caro-Kann prepares …d5 with …c6, so the light-squared bishop can develop to f5 or g4 before …e6. The result is a resilient structure with fewer weaknesses than the French.',
    'White chooses between the Classical (3.Nc3 dxe4), the space-grabbing Advance, or the IQP positions of the Panov.',
  ],
  ideas: [
    'Develop the c8-bishop outside the chain before …e6.',
    'In the Classical, accept a little less space for a very solid structure; castle where it is safest.',
    'Against the Advance, hit the chain with …c5 and use the f5 bishop actively.',
    'Against IQP positions, blockade d5 and trade pieces.',
  ],
  opponentIdeas: [
    'h4–h5 to harass the f5/g6 bishop.',
    'Space with e5 and kingside expansion (g4) in the Advance.',
    'IQP attack in the Panov–Botvinnik.',
  ],
  structures: ['iqp', 'carlsbad', 'french-chain'],
  plans: [
    {
      title: 'Classical: …c5 and …Qd5',
      text: 'After the queens and minor pieces are developed, the …c5 break and a centralised queen on d5 neutralise White’s space.',
    },
    {
      title: 'Exchange Variation: reverse minority attack',
      text: 'With the colours reversed from the QGD Exchange, Black can play …b5–b4 against White’s c3 pawn.',
    },
  ],
  traps: [
    {
      name: 'Smothered mate in six',
      pgn: '1.e4 c6 2.d4 d5 3.Nc3 dxe4 4.Nxe4 Nd7 5.Qe2 Ngf6?? 6.Nd6#',
      text: 'In the …Nd7 line, never play …Ngf6 while the e-file is pinned against your king: the e7 pawn cannot capture on d6.',
    },
  ],
  lines: [
    {
      id: 'classical',
      name: 'Classical: 4…Bf5',
      about: 'The bishop comes out first; h4–h5 is the critical test.',
      pgn: `1.e4 c6 2.d4 d5 3.Nc3 dxe4 4.Nxe4 Bf5 {The classical development.} 5.Ng3 Bg6 6.h4 {Harassing the bishop — White gains kingside space.} h6 7.Nf3 Nd7 8.h5 Bh7 9.Bd3 Bxd3 10.Qxd3 e6 11.Bd2 Ngf6 12.O-O-O Be7 13.Kb1 O-O 14.Ne4 Nxe4 15.Qxe4 Nf6 16.Qe2 Qd5 {The centralised queen and …c5 next give Black comfortable equality.}`,
    },
    {
      id: 'advance-short',
      name: 'Advance: Short System',
      about: 'Modern main line with Nf3, Be2 and Be3.',
      pgn: `1.e4 c6 2.d4 d5 3.e5 Bf5 {The bishop gets out before …e6.} 4.Nf3 e6 5.Be2 c5 {Hitting the chain base right away.} 6.Be3 Nd7 7.O-O Ne7 8.c4 dxc4 9.Na3 Nd5 10.Nxc4 Be7 {Black has a strong d5 knight; White has active pieces and e5 space.}`,
    },
    {
      id: 'panov',
      name: 'Panov–Botvinnik Attack',
      about: 'White takes on an isolani for activity.',
      pgn: `1.e4 c6 2.d4 d5 3.exd5 cxd5 4.c4 {White heads for an IQP position.} Nf6 5.Nc3 e6 6.Nf3 Be7 7.cxd5 Nxd5 8.Bd3 Nc6 9.O-O O-O 10.Re1 Bf6 {Pressure on d4.} 11.Be4 Nce7 {Heading for f5 and blockading d5.}`,
    },
    {
      id: 'exchange',
      name: 'Exchange Variation',
      about: 'A reversed Carlsbad — Black can run the minority attack.',
      pgn: `1.e4 c6 2.d4 d5 3.exd5 cxd5 4.Bd3 Nc6 5.c3 Nf6 6.Bf4 Bg4 {Developing the bishop actively before …e6.} 7.Qb3 Qd7 8.Nd2 e6 9.Ngf3 Bxf3 10.Nxf3 Bd6 11.Bxd6 Qxd6 12.O-O O-O 13.Rae1 {Black now plays …Rab8 and …b5–b4: the minority attack with colours reversed.} Rab8`,
    },
  ],
  lessons: ['iqp', 'minority-attack'],
};
