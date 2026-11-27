/** Classic opening traps for the trap trainer: the key move to find in each. */
import { OPENINGS } from './openings';
const EXTRA = [
    { id: 'fool', name: 'Fool’s mate', opening: 'Bird / King’s pawn', pgn: '1.f3 e5 2.g4 Qh4#', key: 'Qh4#', text: 'The fastest mate in chess: two weakening pawn moves open the e1–h4 diagonal.' },
    { id: 'scholar', name: 'Scholar’s mate', opening: 'King’s pawn', pgn: '1.e4 e5 2.Bc4 Nc6 3.Qh5 Nf6 4.Qxf7#', key: 'Qxf7#', text: 'Queen and bishop hit f7, defended only by the king. 3…g6 or 3…Qe7 stops it — and then White’s queen is the one out of play.' },
    { id: 'legal', name: 'Légal’s mate', opening: 'Philidor Defence', pgn: '1.e4 e5 2.Nf3 d6 3.Bc4 Bg4 4.Nc3 g6 5.Nxe5 Bxd1 6.Bxf7+ Ke7 7.Nd5#', key: 'Nxe5', text: 'The “pin” on f3 isn’t real: 5.Nxe5! gives up the queen for mate.' },
    { id: 'englund', name: 'Englund Gambit trap', opening: 'Englund Gambit', pgn: '1.d4 e5 2.dxe5 Nc6 3.Nf3 Qe7 4.Bf4 Qb4+ 5.Bd2 Qxb2 6.Bc3 Bb4 7.Qd2 Bxc3 8.Qxc3 Qc1#', key: 'Bb4', text: 'After 6.Bc3? the pin …Bb4 wins: the queen can’t keep everything covered and …Qc1 is mate.' },
    { id: 'lasker', name: 'Lasker trap', opening: 'Albin Countergambit', pgn: '1.d4 d5 2.c4 e5 3.dxe5 d4 4.e3 Bb4+ 5.Bd2 dxe3 6.Bxb4 exf2+ 7.Ke2 fxg1=N+', key: 'fxg1=N+', text: 'An underpromotion to a knight with check — a queen would allow Rxg1. Black wins material with a raging attack.' },
    { id: 'siberian', name: 'Siberian trap', opening: 'Smith–Morra Gambit', pgn: '1.e4 c5 2.d4 cxd4 3.c3 dxc3 4.Nxc3 Nc6 5.Nf3 e6 6.Bc4 Qc7 7.O-O Nf6 8.Qe2 Ng4 9.h3 Nd4 10.Nxd4 Qh2#', key: 'Nd4', text: 'With the queen on c7 aimed at h2, …Nd4! deflects the f3-knight: taking it allows …Qh2 mate.' },
    { id: 'kieninger', name: 'Kieninger trap', opening: 'Budapest Gambit', pgn: '1.d4 Nf6 2.c4 e5 3.dxe5 Ng4 4.Nf3 Nc6 5.Bf4 Bb4+ 6.Nbd2 Qe7 7.a3 Ngxe5 8.axb4 Nd3#', key: 'Nd3#', text: 'The e2-pawn is pinned by the queen on e7, so the knight lands on d3 with a smothered mate.' },
];
/** Key move for the library traps (by name). */
const LIBRARY_KEYS = {
    'Noah’s Ark trap': 'c4',
    'Blackburne Shilling trap (avoid!)': 'Qg5',
    'Fried Liver attack': 'Nxf7',
    'Elephant trap': 'Nxd5',
    'Advance queen trap (watch out!)': 'Bb5+',
    'Smothered mate in six': 'Nd6#',
};
export function allTraps() {
    const lib = OPENINGS.flatMap((o) => o.traps.filter((t) => LIBRARY_KEYS[t.name]).map((t) => ({ id: `${o.id}:${t.name}`, name: t.name.replace(/ \((avoid!|watch out!)\)/, ''), opening: o.name, pgn: t.pgn, key: LIBRARY_KEYS[t.name], text: t.text })));
    return [...EXTRA, ...lib];
}
