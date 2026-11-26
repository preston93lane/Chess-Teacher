// Builds src/data/explorer.json — an offline opening explorer from Lichess
// broadcast games (over-the-board events with FIDE ratings; CC0 database).
//
// Usage (streams months, keeps nothing large on disk):
//   for m in 2024-11 2024-12 ...; do
//     curl -s https://database.lichess.org/broadcast/lichess_db_broadcast_$m.pgn.zst \
//       | python3 -c "import sys,zstandard; zstandard.ZstdDecompressor().copy_stream(sys.stdin.buffer, sys.stdout.buffer)"
//   done | node scripts/build-explorer.mjs
import { createInterface } from 'node:readline';
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Chess } from 'chess.js';

const MIN_ELO = +(process.env.MIN_ELO ?? 2300);
const MAX_PLY = +(process.env.MAX_PLY ?? 24);
const MIN_POS = +(process.env.MIN_POS ?? 10);
const TOP_ELO = +(process.env.TOP_ELO ?? 2640);
const MAX_TOP = +(process.env.MAX_TOP ?? 2500);
const MAX_ELO = 2900;
const ENGINE_RE = /\b(TCEC|CCC|Stockfish|LCZero|Lc0|Leela|Komodo|Reckless|engine|computer)\b/i;

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const tree = new Map();
const seen = new Set();
const top = [];
let games = 0;
let kept = 0;

function fenKey(chess) {
  const parts = chess.fen().split(' ');
  if (parts[3] !== '-' && !chess.moves({ verbose: true }).some((m) => m.flags.includes('e'))) parts[3] = '-';
  return parts.slice(0, 4).join(' ');
}

function tokens(movetext) {
  let s = movetext.replace(/\{[^}]*\}/g, ' ').replace(/;[^\n]*/g, ' ');
  let depth = 0;
  let out = '';
  for (const ch of s) {
    if (ch === '(') depth++;
    else if (ch === ')') depth = Math.max(0, depth - 1);
    else if (depth === 0) out += ch;
  }
  return out
    .split(/\s+/)
    .map((t) => t.replace(/^\d+\.+/, ''))
    .filter((t) => t && !/^\$\d+$/.test(t) && !/^(1-0|0-1|1\/2-1\/2|\*)$/.test(t) && !/^\d+\.*$/.test(t));
}

function processGame(h, movetext) {
  games++;
  if (h.Variant && h.Variant !== 'Standard') return;
  if (h.FEN || h.SetUp === '1') return;
  const we = parseInt(h.WhiteElo, 10);
  const be = parseInt(h.BlackElo, 10);
  if (!(we >= MIN_ELO && be >= MIN_ELO)) return;
  // Human games only: engine events (TCEC, CCC…) are broadcast too.
  if (we > MAX_ELO || be > MAX_ELO) return;
  if (ENGINE_RE.test(`${h.White} ${h.Black} ${h.Event ?? ''} ${h.BroadcastName ?? ''}`)) return;
  const res = h.Result;
  if (!['1-0', '0-1', '1/2-1/2'].includes(res)) return;
  const sans = tokens(movetext);
  if (sans.length < 10) return;
  const key = `${h.White}|${h.Black}|${h.UTCDate ?? h.Date}|${sans.slice(0, 24).join(' ')}`;
  if (seen.has(key)) return;
  seen.add(key);
  const chess = new Chess();
  const played = [];
  const path = [];
  try {
    for (let i = 0; i < sans.length; i++) {
      const k = i < MAX_PLY ? fenKey(chess) : null;
      const m = chess.move(sans[i]);
      played.push(m.san);
      if (k) path.push([k, m.san]);
    }
  } catch {
    if (played.length < 10) return;
  }
  kept++;
  const avg = Math.round((we + be) / 2);
  const r = res === '1-0' ? 0 : res === '1/2-1/2' ? 1 : 2;
  let gi = -1;
  if (avg >= TOP_ELO) {
    const year = (h.UTCDate ?? h.Date ?? '').slice(0, 4);
    const event = (h.BroadcastName ?? h.Event ?? '').replace(/\s*\|.*$/, '').slice(0, 60);
    top.push({ w: h.White, b: h.Black, we, be, year, r: res, event, avg, moves: played.join(' '), path: path.map((p) => p[0]) });
    gi = top.length - 1;
  }
  for (const [k, san] of path) {
    let node = tree.get(k);
    if (!node) tree.set(k, (node = { n: 0, moves: new Map(), games: [] }));
    node.n++;
    let st = node.moves.get(san);
    if (!st) node.moves.set(san, (st = [0, 0, 0, 0]));
    st[r]++;
    st[3] += avg;
  }
}

const rl = createInterface({ input: process.stdin, crlfDelay: Infinity });
let headers = {};
let moves = [];
let inMoves = false;
for await (const line of rl) {
  const m = line.match(/^\[(\w+)\s+"(.*)"\]$/);
  if (m) {
    if (inMoves) {
      processGame(headers, moves.join(' '));
      headers = {};
      moves = [];
      inMoves = false;
    }
    headers[m[1]] = m[2];
  } else if (line.trim()) {
    inMoves = true;
    moves.push(line);
  }
  if (games && games % 20000 === 0 && !inMoves && Object.keys(headers).length === 0) process.stderr.write(`  ${games} games read, ${kept} kept\n`);
}
if (inMoves) processGame(headers, moves.join(' '));

// Top games: strongest first, capped
top.sort((a, b) => b.avg - a.avg);
const topKept = top.slice(0, MAX_TOP);
const topIndex = new Map(topKept.map((g, i) => [g, i]));
for (const g of topKept) {
  for (const k of g.path) {
    const node = tree.get(k);
    if (node && node.games.length < 6) node.games.push(topIndex.get(g));
  }
}

const positions = {};
let posCount = 0;
for (const [k, node] of tree) {
  if (node.n < MIN_POS) continue;
  const mv = [...node.moves.entries()]
    .filter(([, st], i) => st[0] + st[1] + st[2] >= 2 || i === 0)
    .sort((a, b) => b[1][0] + b[1][1] + b[1][2] - (a[1][0] + a[1][1] + a[1][2]))
    .slice(0, 12)
    .map(([san, st]) => [san, st[0], st[1], st[2], Math.round(st[3] / (st[0] + st[1] + st[2]))]);
  positions[k] = node.games.length ? [mv, node.games] : [mv];
  posCount++;
}
const out = {
  source: 'Lichess broadcast database (CC0) — over-the-board games, both players rated ' + MIN_ELO + '+',
  games: kept,
  positions,
  top: topKept.map((g) => [g.w, g.b, g.we, g.be, g.year, g.r, g.event, g.moves]),
};
const dest = join(root, 'src', 'data', 'explorer.json');
writeFileSync(dest, JSON.stringify(out));
process.stderr.write(`read ${games}, kept ${kept} master games, ${posCount} positions, ${topKept.length} top games -> ${dest}\n`);
