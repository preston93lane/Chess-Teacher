import { Chess, START_FEN, fenKey } from '../chess/core';
let ecoPromise = null;
let ecoData = null;
export function loadEco() {
    if (!ecoPromise) {
        ecoPromise = import('../../data/eco.json').then((m) => {
            ecoData = (m.default ?? m);
            return ecoData;
        });
    }
    return ecoPromise;
}
export async function ecoName(key) {
    const data = ecoData ?? (await loadEco());
    return data[key];
}
export function ecoNameSync(key) {
    return ecoData?.[key];
}
/** Deepest named opening reached by a move sequence. */
export async function openingFor(sans, startFen = START_FEN) {
    const data = ecoData ?? (await loadEco());
    const c = new Chess(startFen);
    let found;
    for (let i = 0; i < Math.min(sans.length, 40); i++) {
        try {
            c.move(sans[i]);
        }
        catch {
            break;
        }
        const hit = data[fenKey(c.fen())];
        if (hit)
            found = { eco: hit[0], name: hit[1], ply: i + 1 };
    }
    return found;
}
