import type { Opening } from '../../lib/openings/types';

export const ruyLopez: Opening = {
  id: 'ruy-lopez',
  name: 'Ruy Lopez',
  eco: 'C60–C99',
  side: 'w',
  family: '1.e4',
  level: 'Advanced',
  tagline: 'The Spanish torture: slow, deep pressure on e5.',
  root: '1.e4 e5 2.Nf3 Nc6 3.Bb5',
  summary: [
    'The Ruy Lopez attacks the knight that defends e5. It is not a direct threat — 4.Bxc6 and 5.Nxe5 does not yet win a pawn because …Qd4 or …Qg5 regains it — but the pressure lasts deep into the middlegame.',
    'White builds a big center with c3 and d4, reroutes the queen’s knight via d2–f1–g3, and keeps the light-squared bishop on the b1–h7 diagonal. Black has several principled systems: the Closed (Breyer, Chigorin), the solid Berlin, the Open (5…Nxe4) and the Marshall gambit.',
  ],
  ideas: [
    'c3 + d4: build the ideal pawn center, with h3 to stop …Bg4 pinning the f3 knight.',
    'The Nb1–d2–f1–g3 maneuver brings the knight to the kingside where it eyes f5 and h5.',
    'Keep the Spanish bishop: retreat to c2 when attacked — it aims at Black’s king.',
    'a4 pries open the queenside when Black has played …b5.',
    'When the center locks (d5), play on the kingside with Nh2, f4 or g4 depending on Black’s setup.',
  ],
  opponentIdeas: [
    'Hold e5 at all costs (…d6, …Re8, …Bf8, …Nd7).',
    'Queenside expansion with …b5, …c5 and …c4, or the …Na5 Chigorin plan.',
    'Counterattack in the center with …d5 (Marshall, Open Ruy).',
  ],
  structures: ['kid-chain', 'open-center'],
  plans: [
    {
      title: 'Closed center (after d5)',
      text: 'With the center locked, White plays on the kingside: Nf1–g3, Nh2, f4 or g4–g5 ideas, sometimes a4 first to fix the queenside. Black aims for …c4, …Nc5 and …f5 counterplay.',
    },
    {
      title: 'Tension in the center',
      text: 'Keep the d4/e5 tension as long as possible. If Black releases with …exd4, White gets a classical center and easy development. If White releases with dxe5, Black often equalises.',
    },
  ],
  traps: [
    {
      name: 'Noah’s Ark trap',
      pgn: '1.e4 e5 2.Nf3 Nc6 3.Bb5 a6 4.Ba4 d6 5.d4 b5 6.Bb3 Nxd4 7.Nxd4 exd4 8.Qxd4? c5 9.Qd5 Be6 10.Qc6+ Bd7 11.Qd5 c4',
      text: 'Grabbing back the pawn with the queen lets …c5–c4 entomb the bishop on b3. White should play 8.c3 or 8.Bd5 instead.',
    },
  ],
  lines: [
    {
      id: 'breyer',
      name: 'Closed: Breyer Variation',
      about: 'The modern main line — Black reroutes the knight to d7 to keep e5 rock solid.',
      pgn: `1.e4 e5 2.Nf3 Nc6 3.Bb5 {Pressure on the defender of e5 — the Spanish begins.} a6 {Morphy’s question: the bishop must decide.} 4.Ba4 Nf6 5.O-O {White can ignore the attack on e4: 5…Nxe4 leads to the Open Ruy.} Be7 6.Re1 {Defends e4. Now Bxc6 followed by Nxe5 is a genuine threat.} b5 7.Bb3 d6 8.c3 {Prepares d4 and gives the bishop a home on c2.} O-O 9.h3 {Stops …Bg4, which would pin the knight that supports d4.} Nb8 {Breyer’s idea: the knight looks misplaced on c6, so it goes to d7 to support e5 and free the c-pawn.} 10.d4 Nbd7 11.Nbd2 Bb7 12.Bc2 Re8 13.Nf1 {The classic maneuver: d2–f1–g3.} Bf8 14.Ng3 g6 {The bishop will be strong on g7, where it presses d4.} 15.a4 {Opening a second front on the queenside.} c5 16.d5 {Closing the center gains space; play moves to the wings.} c4 {Black grabs space on the queenside and frees c5 for a knight.} 17.Bg5 h6 18.Be3 Nc5`,
    },
    {
      id: 'chigorin',
      name: 'Closed: Chigorin Variation',
      about: 'Black stakes out the queenside with …Na5 and …c5 and pressures d4.',
      pgn: `1.e4 e5 2.Nf3 Nc6 3.Bb5 a6 4.Ba4 Nf6 5.O-O Be7 6.Re1 b5 7.Bb3 d6 8.c3 O-O 9.h3 Na5 {Hits the bishop and prepares …c5.} 10.Bc2 c5 11.d4 Qc7 {Supports e5 and lines up on the c-file.} 12.Nbd2 cxd4 13.cxd4 Nc6 {Pressure on d4 — White must decide how to handle the center.} 14.Nb3 a5 {Kicking the knight with …a4.} 15.Be3 a4 16.Nbd2 Bd7 {Black is active on the queenside; White will look for Rc1 and kingside play.}`,
    },
    {
      id: 'berlin',
      name: 'Berlin Defence: the endgame',
      about: 'Black trades queens early for a solid, slightly passive position with the bishop pair.',
      pgn: `1.e4 e5 2.Nf3 Nc6 3.Bb5 Nf6 {The Berlin Defence — famously used by Kramnik to neutralise Kasparov.} 4.O-O Nxe4 5.d4 Nd6 6.Bxc6 dxc6 7.dxe5 Nf5 8.Qxd8+ Kxd8 {Black has lost castling rights and has doubled pawns, but holds the bishop pair and a very solid position.} 9.Nc3 Ke8 {The king tucks itself away; …h5 and …Be6 follow.} 10.h3 h5 {Restrains g4, which would kick the knight.} 11.Bf4 Be7 12.Rad1 Be6 13.Ng5 Rh6 {White has the kingside majority and e5 space; Black has the bishops. A long maneuvering battle.}`,
    },
    {
      id: 'anti-berlin',
      name: 'Anti-Berlin: 4.d3',
      about: 'Avoid the endgame and keep the pieces on with a slow Spanish setup.',
      pgn: `1.e4 e5 2.Nf3 Nc6 3.Bb5 Nf6 4.d3 {Protecting e4 and keeping the queens on.} Bc5 5.c3 O-O 6.O-O d6 7.h3 a6 8.Ba4 Ba7 {Preserving the bishop from d4 with tempo.} 9.Re1 Ne7 {The knight reroutes to g6 — typical in slow Spanish structures.} 10.Nbd2 Ng6 11.Nf1 c6 12.Ng3 {Both sides maneuver; White will look for d4 at the right moment.}`,
    },
    {
      id: 'marshall',
      name: 'Marshall Attack',
      about: 'Black sacrifices a pawn for a fierce kingside initiative.',
      pgn: `1.e4 e5 2.Nf3 Nc6 3.Bb5 a6 4.Ba4 Nf6 5.O-O Be7 6.Re1 b5 7.Bb3 O-O 8.c3 d5 {The Marshall gambit: a pawn for rapid development and attack.} 9.exd5 Nxd5 10.Nxe5 Nxe5 11.Rxe5 c6 12.d4 Bd6 {Every Black piece points at the White king.} 13.Re1 Qh4 14.g3 Qh3 {The queen sits in front of the king; …Bg4 and …Rae8 bring more fuel.} 15.Be3 Bg4 16.Qd3 Rae8 17.Nd2 Re6 {A rook lift toward the kingside. White must defend precisely, then the extra pawn may tell.} 18.a4`,
    },
    {
      id: 'exchange',
      name: 'Exchange Variation',
      about: 'White gives up the bishop pair for a healthier pawn structure and a kingside majority.',
      pgn: `1.e4 e5 2.Nf3 Nc6 3.Bb5 a6 4.Bxc6 {Fischer’s weapon: trade into a structure where White’s kingside majority can create a passed pawn.} dxc6 5.O-O {Now Nxe5 is a real threat.} f6 6.d4 exd4 7.Nxd4 c5 8.Nb3 Qxd1 9.Rxd1 Bg4 10.f3 Be6 11.Nc3 Bd6 {Black’s bishops compensate for the doubled pawns.} 12.Be3 b6 13.a4 {White fixes the queenside and plans a kingside pawn advance.}`,
    },
  ],
  lessons: ['pawn-chains', 'outposts'],
};

export const italian: Opening = {
  id: 'italian',
  name: 'Italian Game',
  eco: 'C50–C54',
  side: 'w',
  family: '1.e4',
  level: 'Intermediate',
  tagline: 'Giuoco Pianissimo: quiet moves, deep plans.',
  root: '1.e4 e5 2.Nf3 Nc6 3.Bc4',
  summary: [
    'The modern Italian is a maneuvering opening: White plays c3 and d3, keeps the pawn center flexible, and reroutes pieces before choosing a break with d4 or a kingside expansion.',
    'Understanding move-order tricks (…d5 breaks, early …Ng4, a4 vs …a5) and the typical Nbd2–f1–g3 maneuver is more important than memorising long lines.',
  ],
  ideas: [
    'c3 and d3 build a small but solid center; d3–d4 comes when Black can no longer meet it with …exd4 and pressure.',
    'a4 gains queenside space and gives the bishop a retreat on a2 after …a6/…b5.',
    'Re1, Nbd2–f1–g3 (or e3) brings pieces toward f5 and the kingside.',
    'Bg5 or Be3 to challenge Black’s dark-squared bishop on c5.',
  ],
  opponentIdeas: [
    'Mirror setup: …d6, …a6, …Ba7, …Ne7–g6 and …c6.',
    'Central break …d5 once White is underprepared.',
    'Early …Ng4 or …Bg4 tactics against f2 and the pinned knight.',
  ],
  structures: ['locked-center', 'open-center'],
  plans: [
    {
      title: 'The d4 break',
      text: 'Prepare d4 with c3, Re1 and Nbd2. If Black takes, recapture with the c-pawn for a classical center. If Black ignores it, dxe5 can open the d-file.',
    },
    {
      title: 'Kingside maneuvering',
      text: 'Ng3, h3 and sometimes Nh4–f5. A knight on f5 next to Black’s king is a classic Italian asset.',
    },
  ],
  traps: [
    {
      name: 'Blackburne Shilling trap (avoid!)',
      pgn: '1.e4 e5 2.Nf3 Nc6 3.Bc4 Nd4 4.Nxe5? Qg5 5.Nxf7 Qxg2 6.Rf1 Qxe4+ 7.Be2 Nf3#',
      text: 'After 3…Nd4 simply castle or take the free development — 4.Nxe5? walks into a smothered mate. Correct is 4.Nxd4 exd4 5.O-O.',
    },
    {
      name: 'Fried Liver attack',
      pgn: '1.e4 e5 2.Nf3 Nc6 3.Bc4 Nf6 4.Ng5 d5 5.exd5 Nxd5 6.Nxf7 Kxf7 7.Qf3+ Ke6 8.Nc3',
      text: 'If Black recaptures 5…Nxd5 against the Two Knights, the knight sacrifice drags the king into the open. Black should play 5…Na5.',
    },
  ],
  lines: [
    {
      id: 'pianissimo',
      name: 'Giuoco Pianissimo: main plan',
      about: 'c3, d3, a4, Re1 and the knight tour to g3.',
      pgn: `1.e4 e5 2.Nf3 Nc6 3.Bc4 Bc5 4.c3 {Prepares d4 and takes away b4/d4 from Black’s knight.} Nf6 5.d3 {The Pianissimo: solid, keeping options open.} d6 6.O-O a6 {Prepares …Ba7 so the bishop survives Na4 or d4 ideas.} 7.a4 {Space on the queenside and a2 as a retreat for the bishop.} Ba7 8.Re1 O-O 9.h3 {Stops …Bg4 and …Ng4.} Ne7 {Rerouting to g6 — Black mirrors White’s knight maneuver.} 10.Nbd2 Ng6 11.Nf1 c6 12.Ng3 {Both sides are set; White eyes d4 or Nf5.} h6 13.d4`,
    },
    {
      id: 'two-knights-d3',
      name: 'Two Knights: 4.d3',
      about: 'The solid response to 3…Nf6, avoiding sharp theory.',
      pgn: `1.e4 e5 2.Nf3 Nc6 3.Bc4 Nf6 4.d3 {Defends e4 calmly. Avoids the sharp 4.Ng5 and 4.d4 lines.} Be7 5.O-O O-O 6.Re1 d6 7.c3 {The typical Italian triangle.} Na5 {Black wants the bishop pair.} 8.Bb5 {Keeps the bishop by sidestepping: a6 is met by Ba4.} a6 9.Ba4 b5 10.Bc2 c5 11.Nbd2 {A Spanish-style structure.} Nc6 12.Nf1 Re8 13.Ng3`,
    },
    {
      id: 'evans-free',
      name: 'Center attack: 4.c3 Nf6 5.d4',
      about: 'The direct approach — a big center at the cost of some piece activity.',
      pgn: `1.e4 e5 2.Nf3 Nc6 3.Bc4 Bc5 4.c3 Nf6 5.d4 {Immediate central strike.} exd4 6.e5 {Kicking the knight before Black can play …d5 comfortably.} d5 {The only good reply: counterattacks the bishop.} 7.Bb5 Ne4 8.cxd4 Bb6 9.Nc3 O-O 10.Be3 {Black’s knight on e4 is strong but White has space; a dynamic balance.} Bg4`,
    },
  ],
  lessons: ['outposts', 'prophylaxis'],
};
