import { describe, expect, it } from 'vitest';
import { Chess } from '../chess/core';
import { LEVELS, allLessons } from '../../data/path';
import { diagramPosition, parseLineSteps, sameSan } from './run';
import type { MoveStep } from './types';
import puzzlesDb from '../../data/puzzles.json';

const db = puzzlesDb as unknown as { themes: string[]; puzzles: [string, string, string, number, number[], number][] };

function playSol(step: MoveStep) {
  const c = new Chess(diagramPosition(step).fen);
  for (const san of step.sol) {
    const m = c.move(san);
    expect(m, `${san} in ${step.fen}`).toBeTruthy();
  }
  return c;
}

describe('Learn path content', () => {
  it('has unique lesson ids', () => {
    const ids = allLessons().map((l) => l.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  for (const level of LEVELS) {
    for (const unit of level.units) {
      for (const lesson of unit.lessons) {
        it(`${lesson.id} ${lesson.title}`, () => {
          expect(lesson.steps.length).toBeGreaterThan(0);
          for (const step of lesson.steps) {
            if (step.kind === 'say' || step.kind === 'choice') {
              expect(() => diagramPosition(step)).not.toThrow();
            }
            if (step.kind === 'choice') {
              expect(step.answer).toBeGreaterThanOrEqual(0);
              expect(step.answer).toBeLessThan(step.options.length);
            }
            if (step.kind === 'line') {
              const plies = parseLineSteps(step);
              expect(plies.length).toBeGreaterThan(0);
            }
            if (step.kind === 'move') {
              const c = playSol(step);
              if (step.goal === 'mate') expect(c.isCheckmate(), `${lesson.id}: ${step.sol.join(' ')} mates`).toBe(true);
              if (step.sol[step.sol.length - 1].endsWith('#')) expect(c.isCheckmate()).toBe(true);
              for (const a of step.accept ?? []) {
                const t = new Chess(diagramPosition(step).fen);
                expect(t.move(a), `${lesson.id}: alt ${a}`).toBeTruthy();
              }
              // The answer must be written as chess.js writes it, so it can be matched.
              const t = new Chess(diagramPosition(step).fen);
              const m = t.move(step.sol[0]);
              expect(sameSan(m.san, step.sol[0])).toBe(true);
            }
            if (step.kind === 'puzzles') {
              const want = step.themes.map((t) => db.themes.indexOf(t));
              const need = (step.need ?? []).map((t) => db.themes.indexOf(t));
              expect(want.every((i) => i >= 0) && need.every((i) => i >= 0), `${lesson.id} themes`).toBe(true);
              const lo = step.min ?? level.band[0];
              const hi = step.max ?? level.band[1];
              const pool = db.puzzles.filter((p) => p[3] >= lo - 250 && p[3] <= hi + 250 && want.some((i) => p[4].includes(i)) && need.every((i) => p[4].includes(i)));
              expect(pool.length, `${lesson.id} puzzle pool`).toBeGreaterThanOrEqual(step.count * 3);
            }
          }
        });
      }
    }
  }
});
