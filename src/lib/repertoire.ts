/**
 * Your own repertoires: a move tree from the starting position, stored as
 * paths ("e4 e5 Nf3" → node). Each repertoire also appears as an Opening
 * ("rep:<id>") so the existing learn / drill / review / play-vs-bot flows
 * work on it unchanged.
 */
import { Chess, START_FEN, type Color } from './chess/core';
import type { Opening, OpeningLine } from './openings/types';
import { ecoNameSync } from './openings/eco';
import { lookup, scoreFor, type ExplorerMove } from './explorer';
import { fenKey } from './chess/core';
import { parseMovetext } from './chess/pgn';

export interface Repertoire {
  id: string;
  name: string;
  side: Color;
  /** Every node in the tree, keyed by its path of SAN moves from the start. */
  nodes: Record<string, { note?: string }>;
  createdAt: number;
  updatedAt: number;
}

export const pathKey = (sans: string[]) => sans.join(' ');
export const splitPath = (key: string) => (key ? key.split(' ') : []);

export function childrenOf(rep: Repertoire, path: string[]): string[] {
  const prefix = path.length ? pathKey(path) + ' ' : '';
  const out = new Set<string>();
  for (const k of Object.keys(rep.nodes)) {
    if (!k.startsWith(prefix) || k === pathKey(path)) continue;
    const rest = k.slice(prefix.length).split(' ');
    if (rest.length >= 1 && rest[0]) out.add(rest[0]);
  }
  // keep insertion-ish order: by first appearance
  return [...out];
}

export function hasNode(rep: Repertoire, path: string[]) {
  return path.length === 0 || pathKey(path) in rep.nodes;
}

export function addPath(rep: Repertoire, path: string[]): Repertoire {
  const nodes = { ...rep.nodes };
  for (let i = 1; i <= path.length; i++) {
    const k = pathKey(path.slice(0, i));
    if (!(k in nodes)) nodes[k] = {};
  }
  return { ...rep, nodes, updatedAt: Date.now() };
}

export function removeBranch(rep: Repertoire, path: string[]): Repertoire {
  const k = pathKey(path);
  const nodes = Object.fromEntries(Object.entries(rep.nodes).filter(([key]) => key !== k && !key.startsWith(k + ' ')));
  return { ...rep, nodes, updatedAt: Date.now() };
}

export function setNote(rep: Repertoire, path: string[], note: string): Repertoire {
  const k = pathKey(path);
  return { ...rep, nodes: { ...rep.nodes, [k]: { ...rep.nodes[k], note: note.trim() || undefined } }, updatedAt: Date.now() };
}

/** Whose move it is after `path` (from the standard start). */
export function turnAfter(path: string[]): Color {
  return path.length % 2 === 0 ? 'w' : 'b';
}

export function fenAfter(path: string[]): string {
  const c = new Chess(START_FEN);
  for (const s of path) c.move(s);
  return c.fen();
}

function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(36);
}

export interface RepLine {
  id: string;
  sans: string[];
  name: string;
}

/** Every leaf is a line to learn. */
export function linesOf(rep: Repertoire): RepLine[] {
  const keys = Object.keys(rep.nodes);
  const leaves = keys.filter((k) => !keys.some((o) => o.startsWith(k + ' ')));
  const lines = leaves
    .map((k) => {
      const sans = splitPath(k);
      return { id: 'l' + hash(k), sans, name: lineName(sans) };
    })
    .sort((a, b) => a.sans.join(' ').localeCompare(b.sans.join(' ')));
  // Same opening name for several lines: tell them apart by their last moves.
  const seen = new Map<string, number>();
  for (const l of lines) seen.set(l.name, (seen.get(l.name) ?? 0) + 1);
  for (const l of lines) if ((seen.get(l.name) ?? 0) > 1) l.name = `${l.name} — ${movetext(l.sans.slice(-2), l.sans.length - 2)}`;
  return lines;
}

export function lineName(sans: string[]): string {
  // Deepest named position along the line, else the last few moves.
  try {
    const c = new Chess(START_FEN);
    let name: string | undefined;
    for (const s of sans) {
      c.move(s);
      const n = ecoNameSync(fenKey(c.fen()));
      if (n) name = n[1];
    }
    if (name) return name;
  } catch {
    /* fall through */
  }
  return movetext(sans.slice(-4), Math.max(0, sans.length - 4));
}

export function movetext(sans: string[], startPly = 0, notes?: (string | undefined)[]): string {
  return sans
    .map((s, i) => {
      const ply = startPly + i;
      const num = ply % 2 === 0 ? `${ply / 2 + 1}.` : i === 0 ? `${Math.floor(ply / 2) + 1}…` : '';
      const note = notes?.[i] ? ` {${notes[i]!.replace(/[{}]/g, '')}}` : '';
      return `${num}${s}${note}`;
    })
    .join(' ');
}

const openingCache = new Map<string, { at: number; o: Opening }>();

/** The repertoire as an Opening, for the line trainer, review deck and practice games. */
export function repToOpening(rep: Repertoire): Opening {
  const hit = openingCache.get(rep.id);
  if (hit && hit.at === rep.updatedAt) return hit.o;
  const lines: OpeningLine[] = linesOf(rep).map((l) => ({
    id: l.id,
    name: l.name,
    pgn: movetext(l.sans, 0, l.sans.map((_, i) => rep.nodes[pathKey(l.sans.slice(0, i + 1))]?.note)),
  }));
  const first = Object.keys(rep.nodes).find((k) => !k.includes(' '));
  const o: Opening = {
    id: `rep:${rep.id}`,
    name: rep.name,
    eco: '',
    side: rep.side,
    family: first === 'd4' ? '1.d4' : first === 'e4' ? '1.e4' : 'Flank',
    level: 'Intermediate',
    tagline: 'Your repertoire',
    summary: [],
    root: '',
    ideas: [],
    opponentIdeas: [],
    structures: [],
    plans: [],
    traps: [],
    lines,
  };
  openingCache.set(rep.id, { at: rep.updatedAt, o });
  return o;
}

// ---------------------------------------------------------------------------
// Coach guidance from the master database (requires the explorer loaded)

export interface Gap {
  path: string[];
  move: ExplorerMove;
  share: number;
}

/** Popular replies you haven't prepared for (opponent-to-move nodes only). */
export function findGaps(rep: Repertoire, minShare = 0.08): Gap[] {
  const out: Gap[] = [];
  const paths = [[] as string[], ...Object.keys(rep.nodes).map(splitPath)];
  for (const path of paths) {
    if (turnAfter(path) === rep.side) continue; // only where the opponent moves
    if (path.length && childrenOf(rep, path).length === 0) continue; // leaf: line ends here by choice
    let entry;
    try {
      entry = lookup(fenAfter(path));
    } catch {
      continue;
    }
    if (!entry) continue;
    const covered = new Set(childrenOf(rep, path));
    // Deep in the tree only the big alternatives count as gaps.
    const need = path.length < 8 ? minShare : Math.max(minShare, 0.2);
    for (const m of entry.moves) {
      const share = m.total / entry.total;
      if (share >= need && entry.total >= 20 && !covered.has(m.san)) out.push({ path, move: m, share });
    }
  }
  return out.sort((a, b) => b.share - a.share);
}

/** A sound, popular move for you: common in master games and scoring well. */
export function suggestMove(fen: string, side: Color): { move: ExplorerMove; reason: string } | null {
  const entry = lookup(fen);
  if (!entry || !entry.moves.length) return null;
  const candidates = entry.moves.filter((m) => m.total / entry.total >= 0.1 || m === entry.moves[0]);
  let best: ExplorerMove | null = null;
  let bestScore = -1;
  for (const m of candidates) {
    const s = scoreFor(m, side) * 0.7 + Math.min(1, m.total / entry.total / 0.5) * 0.3;
    if (s > bestScore) {
      bestScore = s;
      best = m;
    }
  }
  if (!best) return null;
  const share = Math.round((best.total / entry.total) * 100);
  const score = Math.round(scoreFor(best, side) * 100);
  return { move: best, reason: `${share}% of master games, scoring ${score}% for ${side === 'w' ? 'White' : 'Black'}` };
}

/**
 * Extend the tree from `path` to `maxPly`: for your moves the coach's
 * suggestion, for the opponent the replies played in at least `minShare` of
 * master games (up to `maxReplies`).
 */
export function autoBuild(rep: Repertoire, path: string[], maxPly: number, minShare = 0.1, maxReplies = 3): Repertoire {
  let r = rep;
  const walk = (p: string[]) => {
    if (p.length >= maxPly) return;
    const fen = fenAfter(p);
    const mine = turnAfter(p) === rep.side;
    const existing = childrenOf(r, p);
    if (mine) {
      let san = existing[0];
      if (!san) {
        const s = suggestMove(fen, rep.side);
        if (!s) return;
        san = s.move.san;
        r = addPath(r, [...p, san]);
      }
      walk([...p, san]);
    } else {
      const entry = lookup(fen);
      const replies = new Set(existing);
      if (entry) {
        // Fewer branches the deeper we go, so the tree stays learnable.
        const cap = p.length < 6 ? maxReplies : p.length < 12 ? Math.min(2, maxReplies) : 1;
        const need = p.length < 6 ? minShare : Math.max(minShare, 0.15);
        for (const m of entry.moves) {
          if (replies.size >= Math.max(cap, existing.length)) break;
          if (m.total / entry.total >= need) replies.add(m.san);
        }
      }
      for (const san of replies) {
        if (!hasNode(r, [...p, san])) r = addPath(r, [...p, san]);
        walk([...p, san]);
      }
    }
  };
  walk(path);
  return r;
}

/** Start a repertoire from one of the library openings' lines. */
export function fromLibrary(o: Opening, id: string, name?: string): Repertoire {
  let rep: Repertoire = { id, name: name ?? `My ${o.name}`, side: o.side, nodes: {}, createdAt: Date.now(), updatedAt: Date.now() };
  for (const line of o.lines) {
    const { sans: tokens } = parseMovetext(line.pgn);
    const c = new Chess(START_FEN);
    const sans: string[] = [];
    const notes: (string | undefined)[] = [];
    for (const t of tokens) {
      try {
        sans.push(c.move(t.san).san);
        notes.push(t.comment);
      } catch {
        break;
      }
    }
    rep = addPath(rep, sans);
    sans.forEach((_, i) => {
      if (notes[i]) rep = setNote(rep, sans.slice(0, i + 1), notes[i]!);
    });
  }
  return rep;
}
