export interface OpeningHistory {
  namesake: string;
  origin: string;
  /** How the pioneers liked to play it — the opening's "personality". */
  style: string;
  eras: { when: string; title: string; text: string }[];
  /** Classic game ids (see classics.ts). */
  modelGames: string[];
}

export const OPENING_HISTORY: Record<string, OpeningHistory> = {
  'ruy-lopez': {
    namesake: 'Ruy López de Segura, a Spanish priest',
    origin:
      'López analysed 3.Bb5 in his 1561 book on chess, although the move already appears in an earlier Spanish manuscript. It became a mainstream opening in the 19th century and has been at the top of chess ever since.',
    style:
      'The Spanish is about slow, accumulating pressure: White rarely wins material early but keeps Black under strain for forty moves. Players who love it — Capablanca, Fischer, Karpov, Carlsen — are patient strategists who win long games.',
    eras: [
      { when: '1561', title: 'López’s analysis', text: 'The bishop attacks the defender of e5. López recommended it as the best way to play against 1…e5.' },
      { when: '1800s', title: 'Steinitz’s defence', text: 'Steinitz showed that a solid …d6 setup could hold. The opening became a battle of understanding rather than tricks.' },
      { when: '1900–1960', title: 'The Closed Ruy', text: 'Chigorin’s …Na5 and …c5 plan and Breyer’s …Nb8 reroute defined the main lines. White’s d2–f1–g3 knight tour became standard.' },
      { when: '1918', title: 'The Marshall Attack', text: 'Frank Marshall unveiled his pawn sacrifice against Capablanca. Capablanca won, but the gambit later became one of the most respected weapons in chess.' },
      { when: '2000', title: 'The Berlin Wall', text: 'Kramnik used the Berlin endgame to neutralise Kasparov in their World Championship match, and it became the main line at the top for two decades.' },
      { when: '2010s', title: 'Anti-Berlin', text: 'To avoid the endgame, elite players turned to 4.d3 and slow Italian-style setups, keeping queens on and the game complex.' },
    ],
    modelGames: ['capablanca-marshall'],
  },
  italian: {
    namesake: 'Italian masters of the 16th and 17th centuries',
    origin:
      'One of the oldest recorded openings. Italian players such as Polerio and Gioachino Greco analysed the Giuoco Piano (“quiet game”) and its sharp offshoots around 1600.',
    style:
      'Historically a romantic attacking opening — Greco’s traps, the Evans Gambit and the Fried Liver. Today it is the opposite: a slow, flexible “Pianissimo” where both sides maneuver and wait for the right break.',
    eras: [
      { when: 'c. 1600', title: 'Greco’s games', text: 'Greco published short attacking games that still teach the basic tactics against f7 and the uncastled king.' },
      { when: '1827', title: 'The Evans Gambit', text: 'Captain William Evans introduced 4.b4. It produced the Evergreen Game and dominated romantic-era chess.' },
      { when: '1895', title: 'Classical play', text: 'Steinitz showed how the c3–d4 center and the e-file could punish a king left in the middle (Steinitz–von Bardeleben).' },
      { when: '1900s–2000s', title: 'In the shadow of the Ruy', text: 'Masters judged the Ruy Lopez more testing, and the Italian became mainly a club opening.' },
      { when: '2010s', title: 'The Pianissimo revival', text: 'As the Berlin made the Ruy dry, elite players revived c3/d3 Italians with deep maneuvering plans. It is now a main battleground at the top.' },
    ],
    modelGames: ['evergreen', 'steinitz-bardeleben'],
  },
  'queens-gambit': {
    namesake: 'The gambit of the c-pawn (2.c4)',
    origin:
      'The Queen’s Gambit appears in some of the earliest printed chess sources. It became the dominant 1.d4 opening in the late 19th century as positional understanding grew.',
    style:
      'The classical way to play 1.d4: build pressure on d5, develop harmoniously and steer toward structures you understand better than your opponent — the Carlsbad, the isolani, hanging pawns.',
    eras: [
      { when: '1800s', title: 'Early theory', text: 'Masters considered the gambit dubious; Steinitz and Tarrasch showed its positional strength.' },
      { when: '1907', title: 'Rubinstein’s era', text: 'Akiba Rubinstein refined both sides of the opening; his games against the Tarrasch structure remain models.' },
      { when: '1927', title: 'Capablanca–Alekhine', text: 'The Queen’s Gambit Declined was played in almost every game of their World Championship match.' },
      { when: '1972', title: 'Fischer’s Game 6', text: 'Fischer, a lifelong 1.e4 player, opened with 1.c4 and beat Spassky in the Tartakower — a game Spassky himself applauded.' },
      { when: 'Today', title: 'Still the main road', text: 'The QGD, QGA and Slav remain core battlegrounds at every level.' },
    ],
    modelGames: ['rotlewi-rubinstein', 'fischer-spassky-6'],
  },
  london: {
    namesake: 'The London 1922 tournament',
    origin:
      'Several masters played the Bf4 setup at the London 1922 tournament, and the name stuck. For decades it was regarded as solid but harmless.',
    style:
      'A system rather than a line: the same setup against almost anything, aiming for a comfortable middlegame where understanding outweighs memorisation.',
    eras: [
      { when: '1922', title: 'London tournament', text: 'Capablanca and others employed Bf4 setups; the system got its name.' },
      { when: '1950–2000', title: 'A quiet reputation', text: 'Mostly a club-level choice; strong players regarded it as too passive to trouble Black.' },
      { when: '2010s', title: 'Elite revival', text: 'Kamsky, then Carlsen and others, showed that the London hides real poison — the Ne5/f4 attack and the queenside expansion — and it became hugely popular online.' },
    ],
    modelGames: [],
  },
  catalan: {
    namesake: 'Catalonia, the region around Barcelona',
    origin:
      'Savielly Tartakower introduced it at the 1929 Barcelona tournament, where the organisers asked for a new opening named after the region.',
    style:
      'The Catalan bishop on g2 exerts quiet, long-term pressure. It suits players who enjoy squeezing small advantages: Kramnik made it his signature weapon.',
    eras: [
      { when: '1929', title: 'Barcelona', text: 'Tartakower’s new opening combined the Queen’s Gambit with a kingside fianchetto.' },
      { when: '1950s–1990s', title: 'Positional weapon', text: 'Players such as Smyslov and Korchnoi used it to grind out long games.' },
      { when: '2000s', title: 'Kramnik’s Catalan', text: 'Kramnik played it in his World Championship matches; it became one of the most respected 1.d4 systems.' },
    ],
    modelGames: [],
  },
  english: {
    namesake: 'Howard Staunton, the leading English player of the 1840s',
    origin:
      'Staunton played 1.c4 in his 1843 match against Saint-Amant. The opening was rare for decades, then became a staple in the 20th century.',
    style:
      'Flexible and strategic. 1.c4 avoids forcing theory, often transposes, and rewards understanding of structures — a favourite of Botvinnik, Karpov and Kasparov.',
    eras: [
      { when: '1843', title: 'Staunton', text: 'The match against Saint-Amant gave the opening its name.' },
      { when: '1930s–1960s', title: 'Botvinnik’s system', text: 'Botvinnik’s setups with c4, Nc3, g3 and e4 built a theory of their own.' },
      { when: '1980s', title: 'World Championship weapon', text: 'Karpov and Kasparov used the English repeatedly in their matches.' },
    ],
    modelGames: [],
  },
  najdorf: {
    namesake: 'Miguel Najdorf, Polish-Argentine grandmaster',
    origin:
      'Najdorf developed 5…a6 in the 1940s and 50s. It became the most analysed opening in chess.',
    style:
      'Uncompromising counterattack. Black accepts risk to play for a win with the c-file, …b5–b4 and central breaks. Fischer and Kasparov made it their lifelong weapon.',
    eras: [
      { when: '1940s', title: 'Najdorf’s idea', text: 'The flexible 5…a6 keeps the choice between …e5 and …e6.' },
      { when: '1960s–70s', title: 'Fischer’s Najdorf', text: 'Fischer played it almost exclusively, including the Poisoned Pawn variation.' },
      { when: '1980s', title: 'The English Attack', text: 'English players developed Be3, f3, Qd2 and g4 — still one of White’s most dangerous systems.' },
      { when: '1990s–today', title: 'Kasparov and beyond', text: 'Kasparov’s deep preparation turned it into an encyclopedia; it remains the elite choice against 1.e4.' },
    ],
    modelGames: [],
  },
  dragon: {
    namesake: 'The constellation Draco',
    origin:
      'Fyodor Dus-Chotimirsky, an amateur astronomer, named it around 1901: Black’s pawn chain resembled the constellation of the dragon.',
    style:
      'A pure race. Black’s fianchettoed bishop breathes fire down the long diagonal, and the exchange sacrifice …Rxc3 is part of the opening’s DNA.',
    eras: [
      { when: '1901', title: 'The name', text: 'Dus-Chotimirsky named the variation after Draco.' },
      { when: '1950s', title: 'The Yugoslav Attack', text: 'Yugoslav masters developed Be3, f3, Qd2 and O-O-O with h4–h5 — the critical test ever since.' },
      { when: '1974', title: 'Karpov’s model game', text: 'Karpov’s win against Korchnoi became the textbook way to attack the Dragon.' },
      { when: 'Today', title: 'Engine-age theory', text: 'Huge theory in the Yugoslav Attack; the Dragon survives as a weapon for brave players.' },
    ],
    modelGames: ['karpov-korchnoi-2'],
  },
  french: {
    namesake: 'A Paris team in an 1834 correspondence match against London',
    origin:
      'Paris played 1…e6 successfully in the match, and the defence became known as the French.',
    style:
      'Resilient and counterpunching: Black concedes space, then attacks White’s pawn chain. Nimzowitsch built a theory of pawn chains around it; Botvinnik and Korchnoi were great French players.',
    eras: [
      { when: '1834', title: 'London vs Paris', text: 'The correspondence match gave the defence its name.' },
      { when: '1867', title: 'Winawer’s pin', text: 'Szymon Winawer’s 3…Bb4 created the sharpest branch of the opening.' },
      { when: '1920s', title: 'Nimzowitsch’s chain theory', text: '“Attack the base of the chain” — Nimzowitsch turned the Advance French into a lesson in strategy.' },
      { when: '1930', title: 'Alekhine’s answer', text: 'Alekhine’s crushing win over Nimzowitsch at San Remo showed how dangerous White’s space can be.' },
      { when: '1940s–80s', title: 'Botvinnik and Korchnoi', text: 'World-class players made the French a fighting defence at the highest level.' },
    ],
    modelGames: ['alekhine-nimzowitsch'],
  },
  'caro-kann': {
    namesake: 'Horatio Caro (England) and Marcus Kann (Austria)',
    origin: 'The two analysed 1…c6 in 1886; Kann had earlier won a famous short game with it.',
    style:
      'Rock-solid: Black develops the light-squared bishop before …e6 and aims for an endgame with a better structure. A choice of world champions like Capablanca, Botvinnik and Karpov.',
    eras: [
      { when: '1886', title: 'Caro and Kann', text: 'Their analysis gave the defence its name.' },
      { when: '1910', title: 'Réti’s miniature', text: 'Réti’s 11-move win against Tartakower became the famous warning about development.' },
      { when: '1950s–80s', title: 'Champions’ choice', text: 'Botvinnik and later Karpov used it to neutralise 1.e4.' },
      { when: '1990s', title: 'The Advance revival', text: 'Nigel Short’s Nf3/Be2 system breathed new life into 3.e5.' },
    ],
    modelGames: ['reti-tartakower'],
  },
  'kings-indian': {
    namesake: 'A hypermodern “Indian” fianchetto defence',
    origin:
      'Played occasionally in the 19th century, it became a major defence in the 1940s and 50s through Soviet players such as Bronstein, Boleslavsky and Geller.',
    style:
      'Hypermodern and aggressive: let White build a big center, then attack it — or, when the center locks, storm the king. Fischer and Kasparov made it a weapon of choice.',
    eras: [
      { when: '1940s', title: 'Soviet laboratory', text: 'Bronstein, Boleslavsky and Geller showed that Black’s …e5 and …f5 counterplay was fully viable.' },
      { when: '1950s', title: 'Mar del Plata', text: 'The 9.Ne1 Nd7 line was named after the Mar del Plata tournament of 1953 — the start of the famous race.' },
      { when: '1960s–70s', title: 'Fischer’s weapon', text: 'Fischer’s King’s Indians were full of attacking ideas against the king.' },
      { when: '1990s', title: 'The Bayonet', text: 'Kramnik’s 9.b4 posed such serious problems that Kasparov eventually gave up the defence at the top level.' },
    ],
    modelGames: [],
  },
  'nimzo-indian': {
    namesake: 'Aron Nimzowitsch',
    origin:
      'Nimzowitsch championed 3…Bb4 in the 1920s as part of his hypermodern teaching: control the center with pieces and give up the bishop pair for structural gains.',
    style:
      'Strategic and flexible: doubled pawns, blockades and the fight between knights and bishops. Respected at every level for a century.',
    eras: [
      { when: '1920s', title: 'Nimzowitsch’s system', text: 'The pin on c3 fights for e4 and often saddles White with doubled pawns.' },
      { when: '1930s', title: 'Rubinstein and Capablanca lines', text: '4.e3 and 4.Qc2 became the main tries for White; both bear their champions’ names.' },
      { when: '1938', title: 'Botvinnik–Capablanca', text: 'Botvinnik showed how doubled pawns plus the center can power a winning attack.' },
      { when: 'Today', title: 'Still a main line', text: 'From club players to world champions, the Nimzo remains one of the most reliable answers to 1.d4.' },
    ],
    modelGames: ['botvinnik-capablanca'],
  },
  grunfeld: {
    namesake: 'Ernst Grünfeld, Austrian grandmaster',
    origin: 'Grünfeld introduced 3…d5 in 1922. It became one of the most dynamic defences to 1.d4.',
    style:
      'Concrete and dynamic: give White the center, then attack it with pieces. Fischer, Kasparov and Svidler loved its open, tactical character.',
    eras: [
      { when: '1922', title: 'Grünfeld’s idea', text: 'A hypermodern counter-strike against the d4 center.' },
      { when: '1956', title: 'The Game of the Century', text: 'Thirteen-year-old Fischer’s win over Donald Byrne began as a Grünfeld.' },
      { when: '1980s–90s', title: 'Kasparov’s weapon', text: 'Kasparov used it in World Championship matches, deepening Exchange Variation theory.' },
      { when: 'Today', title: 'Engine-checked dynamism', text: 'Modern lines such as 8.Rb1 are deeply analysed; the opening remains a top-level favourite.' },
    ],
    modelGames: ['byrne-fischer'],
  },
  slav: {
    namesake: 'Slavic masters who developed the defence',
    origin:
      'Analysed by several Slavic players in the late 19th and early 20th century, it became a World Championship opening in the 1930s Euwe–Alekhine matches.',
    style:
      'Solid but active: Black supports d5 with a pawn while keeping the light-squared bishop free. The Semi-Slav adds dynamic …dxc4 and …b5 counterplay.',
    eras: [
      { when: '1924', title: 'The Meran', text: 'The Semi-Slav’s …dxc4 and …b5 system is named after the 1924 tournament in Merano.' },
      { when: '1930s', title: 'Euwe–Alekhine', text: 'The Slav was a mainstay of their World Championship matches.' },
      { when: '1990s–today', title: 'Elite reliability', text: 'Kramnik, Anand and many others relied on the Slav and Semi-Slav in world title matches.' },
    ],
    modelGames: [],
  },
};
