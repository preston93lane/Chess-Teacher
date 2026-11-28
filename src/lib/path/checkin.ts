/**
 * Coach check-in: compare recent games with the learner's plan, like a coach
 * going through your games after a week of training.
 *  - Opening: did you play your repertoire, and where did you (or they) leave it?
 *  - Tactics: in reviewed games, which motifs you missed or allowed, set
 *    against the lessons you've done on them.
 */
import { Chess, START_FEN, type Color } from '../chess/core';
import { getOpening } from '../openings/book';
import { moveMotifs, type MotifKind } from '../coach/tactics';
import { loadGameBody } from '../store/gamesDb';
import type { GameMeta } from '../store/app';
import { buildTree, key, turnAt } from '../repTrainer';
import { allLessons } from '../../data/path';
import type { Concept } from './types';
import type { PlayerProfile } from './profile';

export interface OpeningCheck {
  gameId: string;
  opponent: string;
  color: Color;
  result: 'win' | 'draw' | 'loss' | '?';
  openingId?: string;
  slot?: 'white' | 'vsE4' | 'vsD4';
  status: 'followed' | 'you-left' | 'they-left' | 'uncovered';
  /** Plies played inside your repertoire. */
  depth: number;
  ply?: number;
  played?: string;
  expected?: string[];
}

export interface TacticNote {
  gameId: string;
  opponent: string;
  ply: number;
  concept: Concept;
  kind: 'missed' | 'allowed';
  played: string;
  move: string;
  text: string;
}

export interface CheckIn {
  games: number;
  reviewed: number;
  unreviewed: number;
  openings: OpeningCheck[];
  tactics: TacticNote[];
  studied: Partial<Record<Concept, number>>;
}

const MOTIF_CONCEPT: Partial<Record<MotifKind, Concept>> = {
  fork: 'fork',
  pin: 'pin',
  skewer: 'skewer',
  'discovered-attack': 'discovered',
  'discovered-check': 'discovered',
  'double-check': 'discovered',
  mate: 'mate',
  'free-capture': 'hanging',
  hangs: 'hanging',
};

export const CONCEPT_LABEL: Record<Concept, string> = {
  hanging: 'Loose pieces',
  mate: 'Checkmates',
  backrank: 'Back-rank mates',
  fork: 'Forks',
  pin: 'Pins',
  skewer: 'Skewers',
  discovered: 'Discovered attacks',
  defender: 'Removing the defender',
  opening: 'Openings',
  endgame: 'Endgames',
  attack: 'Attacking the king',
  calculation: 'Calculation',
  positional: 'Plans',
  defence: 'Defence',
};

/** The first lesson on a concept, to send you back to. */
export function lessonFor(concept: Concept): string | undefined {
  return allLessons().find((l) => l.concept === concept)?.id;
}

function conceptOf(fen: string, san: string): { concept: Concept; text: string } | null {
  try {
    const c = new Chess(fen);
    const m = c.move(san);
    for (const motif of moveMotifs(fen, m)) {
      const concept = MOTIF_CONCEPT[motif.kind];
      if (concept) return { concept, text: motif.text };
    }
  } catch {
    /* not a legal move here */
  }
  return null;
}

function resultFor(g: GameMeta): OpeningCheck['result'] {
  if (!g.myColor) return '?';
  if (g.result === '1/2-1/2') return 'draw';
  if (g.result === '1-0') return g.myColor === 'w' ? 'win' : 'loss';
  if (g.result === '0-1') return g.myColor === 'b' ? 'win' : 'loss';
  return '?';
}

export async function runCheckIn(games: GameMeta[], profile: PlayerProfile, done: Record<string, unknown>, limit = 20): Promise<CheckIn> {
  const mine = games
    .filter((g) => g.myColor)
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, limit);
  const openings: OpeningCheck[] = [];
  const tactics: TacticNote[] = [];
  let reviewed = 0;
  for (const g of mine) {
    const body = await loadGameBody(g.id);
    if (!body || body.startFen !== START_FEN || !body.sans.length) continue;
    const color = g.myColor!;
    const opponent = color === 'w' ? g.black : g.white;
    const sans = body.sans;

    // --- opening ---
    const slot = color === 'w' ? 'white' : sans[0] === 'e4' ? 'vsE4' : sans[0] === 'd4' ? 'vsD4' : undefined;
    const base = { gameId: g.id, opponent, color, result: resultFor(g) };
    if (!slot) openings.push({ ...base, status: 'uncovered', depth: 0, ply: 0, played: sans[0] });
    else {
      const oid = profile[slot];
      const o = getOpening(oid);
      if (o) {
        const { tree } = buildTree(o);
        let check: OpeningCheck = { ...base, openingId: oid, slot, status: 'followed', depth: 0 };
        for (let i = 0; i < sans.length; i++) {
          const node = tree.get(key(sans.slice(0, i)));
          if (!node || !node.children.length) break;
          if (node.children.includes(sans[i])) {
            check.depth = i + 1;
            continue;
          }
          check = { ...check, status: turnAt(i) === color ? 'you-left' : 'they-left', ply: i, played: sans[i], expected: node.children };
          break;
        }
        openings.push(check);
      }
    }

    // --- tactics (reviewed games only) ---
    const review = body.review;
    if (!review) continue;
    reviewed++;
    for (const m of review.moves) {
      if (m.color !== color || !['mistake', 'blunder', 'miss'].includes(m.cls)) continue;
      const best = m.bestLine?.[0];
      if (best) {
        const hit = conceptOf(m.fenBefore, best);
        if (hit) tactics.push({ gameId: g.id, opponent, ply: m.ply, concept: hit.concept, kind: 'missed', played: m.san, move: best, text: hit.text });
      }
      const reply = m.replyLine?.[0];
      if (reply && (m.cls === 'blunder' || m.cls === 'mistake')) {
        const hit = conceptOf(m.fenAfter, reply);
        if (hit) tactics.push({ gameId: g.id, opponent, ply: m.ply, concept: hit.concept, kind: 'allowed', played: m.san, move: reply, text: hit.text });
      }
    }
  }
  const studied: Partial<Record<Concept, number>> = {};
  for (const l of allLessons()) if (l.concept && done[l.id]) studied[l.concept] = (studied[l.concept] ?? 0) + 1;
  return { games: mine.length, reviewed, unreviewed: mine.length - reviewed, openings, tactics, studied };
}

export function moveName(ply: number, san: string) {
  return ply % 2 === 0 ? `${ply / 2 + 1}.${san}` : `${Math.floor(ply / 2) + 1}…${san}`;
}
