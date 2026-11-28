/**
 * Builds the learner's path: the fixed course, a unit test after every unit,
 * and — once the personality quiz is done — lessons on the learner's own
 * repertoire, spread one or two per unit from their starting level onward.
 */
import type { Color } from '../chess/core';
import { getOpening, parseLine } from '../openings/book';
import { parseMovetext } from '../chess/pgn';
import { LEVELS } from '../../data/path';
import type { Lesson, Level, LevelId, Step, Unit } from './types';
import type { PlayerProfile } from './profile';
import puzzleMeta from './puzzleOpenings';

export interface PathNode {
  lesson: Lesson;
  unit: Unit;
  level: Level;
  /** Position in the whole path. */
  index: number;
  opening?: { id: string; side: Color; lineId?: string; plies?: number };
}

export interface PathUnit {
  unit: Unit;
  level: Level;
  nodes: PathNode[];
}

export const LEVEL_ORDER: LevelId[] = ['basics', 'beginner', 'intermediate', 'expert'];

function unitTest(unit: Unit): Lesson {
  return {
    id: `${unit.id}-test`,
    title: 'Unit test',
    blurb: `Prove it: ${unit.title.toLowerCase()}`,
    kind: 'review',
    steps: [
      { kind: 'say', text: `Unit test: ${unit.title}. Eight puzzles — solve six to pass and earn the crown.`, mood: 'cheer' },
      { kind: 'puzzles', text: 'Unit test', themes: unit.themes, count: 8 },
    ],
  };
}

function movetext(sans: string[], comments: (string | undefined)[], upto: number) {
  return sans
    .slice(0, upto)
    .map((s, i) => `${i % 2 === 0 ? `${i / 2 + 1}.` : ''}${s}${comments[i] ? ` {${comments[i]!.replace(/[{}]/g, '')}}` : ''}`)
    .join(' ');
}

const SLOT_NAME: Record<'white' | 'vsE4' | 'vsD4', string> = { white: 'Your White opening', vsE4: 'Your answer to 1.e4', vsD4: 'Your answer to 1.d4' };

/** Lessons that teach one repertoire opening, a line at a time. */
export function openingLessons(openingId: string, slot: 'white' | 'vsE4' | 'vsD4'): { lesson: Lesson; opening: PathNode['opening'] }[] {
  const o = getOpening(openingId);
  if (!o || !o.lines.length) return [];
  const side = o.side;
  const first = parseLine(o, o.lines[0].id);
  const rootPlies = Math.min(first.sans.length, Math.max(4, parseMovetext(o.root).sans.length));
  const introPlies = Math.min(first.sans.length, rootPlies + 4);
  const hasPuzzles = puzzleMeta.includes(o.id);
  const puzzleStep = (count: number): Step[] =>
    hasPuzzles ? [{ kind: 'puzzles', text: `Tactics from real ${o.name} games — you play ${side === 'w' ? 'White' : 'Black'}, like in your repertoire.`, themes: [], count, opening: o.id, side }] : [];
  const out: { lesson: Lesson; opening: PathNode['opening'] }[] = [];
  out.push({
    opening: { id: o.id, side, lineId: o.lines[0].id, plies: introPlies },
    lesson: {
      id: `op:${o.id}:intro`,
      kind: 'repertoire',
      concept: 'opening',
      title: o.name,
      blurb: SLOT_NAME[slot],
      steps: [
        { kind: 'say', text: `${SLOT_NAME[slot]}: the ${o.name}. ${o.tagline}`, mood: 'wave', pgn: o.root, orientation: side },
        { kind: 'say', text: o.summary[0], mood: 'think', pgn: o.root, orientation: side },
        { kind: 'say', text: `The plans to remember:\n${o.ideas.slice(0, 3).map((i) => `• ${i}`).join('\n')}`, mood: 'think', pgn: o.root, orientation: side },
        { kind: 'line', text: 'Here are the first moves.', line: movetext(first.sans, first.comments, introPlies), orientation: side },
        { kind: 'playline', text: 'Now you play them — your moves only.', opening: o.id, line: o.lines[0].id, side, plies: introPlies },
        ...puzzleStep(3),
      ],
    },
  });
  for (const l of o.lines) {
    const p = parseLine(o, l.id);
    out.push({
      opening: { id: o.id, side, lineId: l.id },
      lesson: {
        id: `op:${o.id}:${l.id}`,
        kind: 'repertoire',
        concept: 'opening',
        title: l.name,
        blurb: o.name,
        steps: [
          { kind: 'say', text: l.about ?? `A main line of the ${o.name}. Watch the ideas behind each move — then you’ll play it yourself.`, mood: 'think', orientation: side },
          { kind: 'line', text: l.name, line: movetext(p.sans, p.comments, p.sans.length), orientation: side },
          { kind: 'playline', text: 'Your turn: play your side of the line.', opening: o.id, line: l.id, side },
          ...puzzleStep(3),
        ],
      },
    });
  }
  return out;
}

export function buildPath(profile: PlayerProfile | null): PathUnit[] {
  const units: PathUnit[] = [];
  let index = 0;
  for (const level of LEVELS)
    for (const unit of level.units) {
      const nodes: PathNode[] = unit.lessons.map((lesson) => ({ lesson, unit, level, index: 0 }));
      nodes.push({ lesson: unitTest(unit), unit, level, index: 0 });
      units.push({ unit, level, nodes });
    }

  if (profile) {
    const lists = (['white', 'vsE4', 'vsD4'] as const).map((slot) => openingLessons(profile[slot], slot));
    const queue: { lesson: Lesson; opening: PathNode['opening'] }[] = [];
    for (let i = 0; lists.some((l) => i < l.length); i++) for (const l of lists) if (l[i]) queue.push(l[i]);
    const startUnit = startUnitIndex(units, profile);
    const slots = units.length - startUnit;
    const per = Math.max(1, Math.ceil(queue.length / slots));
    let q = 0;
    for (let u = startUnit; u < units.length && q < queue.length; u++) {
      const pu = units[u];
      // Repertoire lessons go after the unit’s first lesson and before its test.
      const insertAt = Math.min(2, pu.nodes.length - 1);
      const batch = queue.slice(q, q + per).map((x) => ({ lesson: x.lesson, opening: x.opening, unit: pu.unit, level: pu.level, index: 0 }));
      pu.nodes.splice(insertAt, 0, ...batch);
      q += per;
    }
  }
  for (const u of units) for (const n of u.nodes) n.index = index++;
  return units;
}

export type NodeStatus = 'done' | 'current' | 'open';

/** Index of the unit the learner starts from. */
export function startUnitIndex(units: { unit: Unit; level: Level }[], profile: PlayerProfile | null): number {
  if (!profile) return 0;
  const byUnit = profile.startUnit ? units.findIndex((u) => u.unit.id === profile.startUnit) : -1;
  if (byUnit >= 0) return byUnit;
  return Math.max(0, units.findIndex((u) => u.level.id === profile.level));
}

/**
 * Every lesson is open — scroll anywhere on the path. “Current” is the first
 * unfinished lesson from the learner’s starting point onward.
 */
export function pathStatus(units: PathUnit[], done: Record<string, unknown>, profile: PlayerProfile | null) {
  const nodes = units.flatMap((u) => u.nodes);
  const su = startUnitIndex(units, profile);
  const start = units[su]?.nodes[0]?.index ?? 0;
  let current = nodes.findIndex((n, i) => i >= start && !done[n.lesson.id]);
  if (current < 0) current = nodes.findIndex((n) => !done[n.lesson.id]);
  const status = (n: PathNode): NodeStatus => {
    if (done[n.lesson.id]) return 'done';
    if (n.index === current) return 'current';
    return 'open';
  };
  return { nodes, current: current >= 0 ? nodes[current] : null, status, start };
}

export function findNode(units: PathUnit[], id: string): PathNode | undefined {
  for (const u of units) for (const n of u.nodes) if (n.lesson.id === id) return n;
  return undefined;
}
