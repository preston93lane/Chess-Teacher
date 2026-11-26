// Builds src/data/eco.json from the lichess chess-openings TSV files (CC0).
// Key: the first four FEN fields (placement, side, castling, en passant).
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Chess } from 'chess.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = {};
let count = 0;
for (const f of ['a', 'b', 'c', 'd', 'e']) {
  const rows = readFileSync(join(root, 'data', 'eco', `${f}.tsv`), 'utf8').trim().split('\n').slice(1);
  for (const row of rows) {
    const [eco, name, pgn] = row.split('\t');
    const chess = new Chess();
    const sans = pgn.replace(/\d+\.(\.\.)?/g, ' ').trim().split(/\s+/);
    for (const san of sans) chess.move(san);
    const key = chess.fen().split(' ').slice(0, 4).join(' ');
    // Prefer the longer (more specific) PGN when two rows reach the same position.
    if (!out[key] || out[key][2] < sans.length) out[key] = [eco, name, sans.length];
    count++;
  }
}
const compact = Object.fromEntries(Object.entries(out).map(([k, v]) => [k, [v[0], v[1]]]));
mkdirSync(join(root, 'src', 'data'), { recursive: true });
writeFileSync(join(root, 'src', 'data', 'eco.json'), JSON.stringify(compact));
console.log(`[eco] ${count} rows -> ${Object.keys(compact).length} positions`);
