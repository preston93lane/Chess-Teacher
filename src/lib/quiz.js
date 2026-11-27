/**
 * Opening quiz: recognise the opening from a position, then find the next
 * theory move.
 */
import { Chess, START_FEN, fenKey } from './chess/core';
import { OPENINGS } from '../data/openings';
import { allLines, openingBookMoves, lookupBook } from './openings/book';
let ecoLines = null;
export async function loadEcoLines() {
    if (!ecoLines) {
        const m = await import('../data/eco-lines.json');
        ecoLines = (m.default ?? m);
    }
    return ecoLines;
}
export const MAINSTREAM = [
    'Sicilian Defense', 'Ruy Lopez', 'French Defense', "Queen's Gambit Declined", 'Italian Game', 'English Opening',
    "King's Gambit", "King's Indian Defense", 'Caro-Kann Defense', 'Nimzo-Indian Defense', 'Semi-Slav Defense',
    'Dutch Defense', 'Benoni Defense', "Queen's Gambit Accepted", 'Grünfeld Defense', "Queen's Indian Defense",
    'Alekhine Defense', 'Scotch Game', 'Slav Defense', "Petrov's Defense", 'Four Knights Game', 'Scandinavian Defense',
    'Philidor Defense', 'Réti Opening', "Bishop's Opening", 'Vienna Game', 'Modern Defense', 'Catalan Opening',
    'Pirc Defense', 'Tarrasch Defense', 'Bogo-Indian Defense', 'Benko Gambit', 'London System', 'Trompowsky Attack',
];
export function familyOf(name) {
    const f = name.split(':')[0].trim();
    if (f.startsWith("King's Gambit"))
        return "King's Gambit";
    return f;
}
function shuffle(a) {
    const b = [...a];
    for (let i = b.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [b[i], b[j]] = [b[j], b[i]];
    }
    return b;
}
function sample(a, n) {
    return shuffle(a).slice(0, n);
}
function play(sans) {
    const c = new Chess(START_FEN);
    for (const s of sans)
        c.move(s);
    return c;
}
/** Book moves from the library tree and the ECO list at a position. */
function bookAt(fen, children) {
    const lib = lookupBook(fenKey(fen))?.moves.map((m) => m.san) ?? [];
    return [...new Set([...children, ...lib])];
}
export async function makeQuestions(source, count, repertoireIds) {
    if (source === 'repertoire' || source === 'library')
        return libraryQuestions(source === 'repertoire' ? repertoireIds : OPENINGS.map((o) => o.id), count);
    return ecoQuestions(source, count);
}
function libraryQuestions(ids, count) {
    const openings = OPENINGS.filter((o) => ids.includes(o.id));
    const pool = openings.length ? openings : OPENINGS;
    const out = [];
    const used = new Set();
    let guard = 0;
    while (out.length < count && guard++ < count * 20) {
        const o = pool[Math.floor(Math.random() * pool.length)];
        const lines = allLines(o);
        const line = lines[Math.floor(Math.random() * lines.length)];
        const min = Math.min(6, line.sans.length - 2);
        const max = Math.min(line.sans.length - 1, 18);
        if (max <= min)
            continue;
        const ply = min + Math.floor(Math.random() * (max - min + 1));
        const fen = line.fens[ply];
        const key = `${o.id}:${fenKey(fen)}`;
        if (used.has(key))
            continue;
        // The position must belong to this line only (otherwise the name is ambiguous).
        const sharing = lines.filter((l) => l.fens.some((f) => fenKey(f) === fenKey(fen)));
        if (sharing.length > 1 && ply < 10)
            continue;
        used.add(key);
        const answer = `${o.name} — ${line.name}`;
        const sameOpening = lines.filter((l) => l.lineId !== line.lineId && !sharing.includes(l)).map((l) => `${o.name} — ${l.name}`);
        const others = OPENINGS.filter((x) => x.id !== o.id).flatMap((x) => x.lines.map((l) => `${x.name} — ${l.name}`));
        const distractors = [...sample(sameOpening, 2), ...sample(others, 3)].filter((d) => d !== answer).slice(0, 3);
        const book = openingBookMoves(o, fen).map((b) => b.san);
        out.push({
            id: `${o.id}/${line.lineId}/${ply}`,
            fen,
            sans: line.sans.slice(0, ply),
            side: fen.split(' ')[1],
            answer,
            options: shuffle([answer, ...distractors]),
            next: line.sans[ply],
            alsoBook: book.filter((b) => b !== line.sans[ply]),
            note: line.comments[ply],
            openingId: o.id,
            lineId: line.lineId,
        });
    }
    return out;
}
async function ecoQuestions(source, count) {
    const lines = (await loadEcoLines()).map(([eco, name, mv]) => ({ eco, name, sans: mv.split(' '), family: familyOf(name) }));
    const children = (sans) => {
        const prefix = sans.join(' ') + ' ';
        const next = new Map();
        for (const l of lines) {
            if (l.sans.length > sans.length && l.sans.join(' ').startsWith(prefix)) {
                const m = l.sans[sans.length];
                next.set(m, (next.get(m) ?? 0) + 1);
            }
        }
        return [...next.entries()].sort((a, b) => b[1] - a[1]).map(([m]) => m);
    };
    const eligible = lines.filter((l) => MAINSTREAM.includes(l.family) &&
        l.sans.length >= (source === 'variations' ? 5 : 3) &&
        l.sans.length <= 16 &&
        (source === 'families' || l.name.includes(':')));
    const out = [];
    const used = new Set();
    let guard = 0;
    while (out.length < count && guard++ < count * 40) {
        const l = eligible[Math.floor(Math.random() * eligible.length)];
        if (used.has(l.name))
            continue;
        const kids = children(l.sans);
        if (!kids.length)
            continue;
        used.add(l.name);
        const c = play(l.sans);
        const fen = c.fen();
        let answer;
        let distractors;
        if (source === 'families') {
            answer = l.family;
            const sameStart = [...new Set(lines.filter((x) => MAINSTREAM.includes(x.family) && x.family !== l.family && x.sans[0] === l.sans[0]).map((x) => x.family))];
            const rest = MAINSTREAM.filter((f) => f !== l.family && !sameStart.includes(f));
            distractors = [...sample(sameStart, 3), ...sample(rest, 3)].slice(0, 3);
        }
        else {
            answer = l.name;
            const siblings = [...new Set(lines.filter((x) => x.family === l.family && x.name !== l.name && x.name.includes(':')).map((x) => x.name))];
            distractors = sample(siblings, 3);
            if (distractors.length < 3)
                continue;
        }
        out.push({
            id: `eco:${l.name}`,
            fen,
            sans: l.sans,
            side: c.turn(),
            answer,
            options: shuffle([answer, ...distractors]),
            next: kids[0],
            alsoBook: bookAt(fen, kids).filter((k) => k !== kids[0]),
            note: `${l.eco} · ${l.name}`,
        });
    }
    return out;
}
