/**
 * Tags every puzzle in src/data/puzzles.json with:
 *   • the side the solver plays (w/b),
 *   • the opening family and variation from Lichess's OpeningTags, when the
 *     source game has one (pass the id → tags map built by build-puzzles.py),
 *   • tactic tags worked out from the solution moves, for puzzles whose
 *     Lichess themes name no tactic at all (fork, pin, skewer, discovered
 *     attack, double check, hanging piece, sacrifice, promotion).
 *
 * Usage: npx tsx scripts/tag-puzzles.ts [opening-tags.json]
 * Idempotent: re-running rewrites the same fields.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { Chess, type Move, type PieceSymbol } from '../src/lib/chess/core';
import { moveMotifs } from '../src/lib/coach/tactics';

type Row = [string, string, string, number, number[], number, ...unknown[]];
interface Db {
  source: string;
  themes: string[];
  openings: string[];
  families?: string[];
  variations?: string[];
  puzzles: Row[];
}

const PATH = 'src/data/puzzles.json';
const db = JSON.parse(readFileSync(PATH, 'utf8')) as Db;
const tagFile = process.argv[2];
const openingTags: Record<string, string> = {};
if (tagFile) {
  const raw = JSON.parse(readFileSync(tagFile, 'utf8')) as Record<string, string | [string, string]>;
  for (const [id, v] of Object.entries(raw)) openingTags[id] = Array.isArray(v) ? v[0] : v;
} else if (db.families) {
  // Keep the families already stored.
  for (const p of db.puzzles) {
    const f = p[7] as number;
    const v = p[8] as number;
    if (f >= 0) openingTags[p[0]] = [db.families[f], v >= 0 ? db.variations![v] : ''].filter(Boolean).join(' ');
  }
}

const TACTICS = new Set([
  'fork', 'pin', 'skewer', 'discoveredAttack', 'doubleCheck', 'sacrifice', 'deflection', 'attraction', 'clearance',
  'interference', 'xRayAttack', 'capturingDefender', 'intermezzo', 'hangingPiece', 'trappedPiece', 'promotion',
  'underPromotion', 'advancedPawn', 'zugzwang', 'quietMove', 'defensiveMove', 'exposedKing', 'kingsideAttack',
  'queensideAttack', 'enPassant', 'castling', 'mate', 'mateIn1', 'mateIn2', 'mateIn3', 'mateIn4', 'backRankMate',
  'smotheredMate', 'anastasiaMate', 'arabianMate', 'bodenMate', 'dovetailMate', 'hookMate', 'doubleBishopMate',
]);
const MOTIF_TAG: Record<string, string> = {
  fork: 'fork',
  pin: 'pin',
  skewer: 'skewer',
  'discovered-attack': 'discoveredAttack',
  'discovered-check': 'discoveredAttack',
  'double-check': 'doubleCheck',
  sacrifice: 'sacrifice',
  promotion: 'promotion',
};

const pretty = (s: string) => s.replace(/_/g, ' ').replace(/\bKings\b/g, 'King’s').replace(/\bQueens\b/g, 'Queen’s').trim();
const families: string[] = [];
const variations: string[] = [];
const famIdx = new Map<string, number>();
const varIdx = new Map<string, number>();
const indexOf = (list: string[], map: Map<string, number>, s: string) => {
  let i = map.get(s);
  if (i === undefined) {
    i = list.length;
    list.push(s);
    map.set(s, i);
  }
  return i;
};
const themeIdx = new Map(db.themes.map((t, i) => [t, i]));

let added = 0;
let stillBare = 0;
let withOpening = 0;
const sides = { w: 0, b: 0 };
for (const p of db.puzzles) {
  const [id, fen, mv, , th] = p;
  const moves = mv.split(' ');
  // Solver plays the side that moves after the opponent's first move.
  const side = fen.split(' ')[1] === 'w' ? 'b' : 'w';
  sides[side]++;

  // Tactics from the solution, only when Lichess named none.
  const names = th.map((i) => db.themes[i]);
  if (!names.some((n) => TACTICS.has(n))) {
    const c = new Chess(fen);
    const found = new Set<string>();
    for (let i = 0; i < moves.length; i++) {
      const u = moves[i];
      const before = c.fen();
      let m: Move;
      try {
        m = c.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: (u[4] as PieceSymbol) || undefined });
      } catch {
        break;
      }
      if (i % 2 === 1) {
        for (const k of moveMotifs(before, m)) {
          if (MOTIF_TAG[k.kind]) found.add(MOTIF_TAG[k.kind]);
          if (k.kind === 'free-capture' && i === 1) found.add('hangingPiece');
        }
      }
    }
    for (const t of found) {
      const ti = themeIdx.get(t);
      if (ti !== undefined && !th.includes(ti)) {
        th.push(ti);
        added++;
      }
    }
    if (!found.size) stillBare++;
  }

  // Opening family and variation.
  let f = -1;
  let v = -1;
  const ot = (openingTags[id] ?? '').trim();
  if (ot) {
    const parts = ot.split(/\s+/);
    const fam = parts[0];
    f = indexOf(families, famIdx, pretty(fam));
    const sub = parts[1]?.startsWith(fam + '_') ? parts[1].slice(fam.length + 1) : parts[1];
    if (sub) v = indexOf(variations, varIdx, pretty(sub));
    withOpening++;
  }
  p.length = 6;
  p.push(side, f, v);
}

db.families = families;
db.variations = variations;
const out = JSON.stringify(db).replace(/\],\[/g, '],\n[');
writeFileSync(PATH, out);
console.log(
  `${db.puzzles.length} puzzles · solver White ${sides.w}, Black ${sides.b} · opening known for ${withOpening} (${families.length} families) · ${added} computed tactic tags · ${stillBare} with no tactic tag (quiet or positional wins)`,
);
