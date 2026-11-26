import { Chess, START_FEN, fenKey } from '../chess/core';

type EcoMap = Record<string, [string, string]>;
let ecoPromise: Promise<EcoMap> | null = null;
let ecoData: EcoMap | null = null;

export function loadEco(): Promise<EcoMap> {
  if (!ecoPromise) {
    ecoPromise = import('../../data/eco.json').then((m) => {
      ecoData = (m.default ?? m) as unknown as EcoMap;
      return ecoData;
    });
  }
  return ecoPromise;
}

export async function ecoName(key: string): Promise<[string, string] | undefined> {
  const data = ecoData ?? (await loadEco());
  return data[key];
}

export function ecoNameSync(key: string): [string, string] | undefined {
  return ecoData?.[key];
}

/** Deepest named opening reached by a move sequence. */
export async function openingFor(sans: string[], startFen = START_FEN): Promise<{ eco: string; name: string; ply: number } | undefined> {
  const data = ecoData ?? (await loadEco());
  const c = new Chess(startFen);
  let found: { eco: string; name: string; ply: number } | undefined;
  for (let i = 0; i < Math.min(sans.length, 40); i++) {
    try {
      c.move(sans[i]);
    } catch {
      break;
    }
    const hit = data[fenKey(c.fen())];
    if (hit) found = { eco: hit[0], name: hit[1], ply: i + 1 };
  }
  return found;
}
