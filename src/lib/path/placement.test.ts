import { describe, expect, it } from 'vitest';
import { Chess } from '../chess/core';
import { phaseFor, scorePlacement, startUnitFor, unitSpots, type UserMoveRecord } from './placement';
import { buildPath, pathStatus } from './plan';
import { scoreQuiz } from './profile';
import puzzlesDb from '../../data/puzzles.json';

const db = puzzlesDb as unknown as { families: string[]; puzzles: [string, string, string, number, number[], number, string, number, number][] };

const rec = (before: number, after: number, gift = 0, phase: UserMoveRecord['phase'] = 'strong'): UserMoveRecord => ({ ply: 0, san: 'e4', before, after, gift, phase });

describe('placement game', () => {
  it('gets weaker as the game goes on', () => {
    expect(phaseFor(1).id).toBe('strong');
    expect(phaseFor(9).id).toBe('steady');
    expect(phaseFor(15).id).toBe('shaky');
    expect(phaseFor(30).id).toBe('generous');
  });

  it('rates accurate players who punish gifts above sloppy ones', () => {
    const good = [...Array(12)].map(() => rec(30, 20)).concat([...Array(6)].map(() => rec(400, 390, 400, 'generous')));
    const bad = [...Array(12)].map(() => rec(30, -150)).concat([...Array(6)].map(() => rec(400, 20, 400, 'generous')));
    const g = scorePlacement(good, 1000, 'win');
    const b = scorePlacement(bad, 1000, 'loss');
    expect(g.elo).toBeGreaterThan(1500);
    expect(b.elo).toBeLessThan(800);
    expect(g.punished).toBe(6);
    expect(b.punished).toBe(0);
  });

  it('leans on the quiz answer when the game is short', () => {
    const r = scorePlacement([rec(30, 20), rec(30, 25)], 1600, 'stopped');
    expect(Math.abs(r.elo - 1600)).toBeLessThan(250);
  });

  it('maps ratings to a unit a little below', () => {
    expect(unitSpots()).toHaveLength(20);
    expect(startUnitFor(300).index).toBe(0);
    expect(startUnitFor(1200).level.id).toBe('intermediate');
    expect(startUnitFor(2200).index).toBe(19);
  });
});

describe('open path', () => {
  it('opens every lesson and starts at the chosen unit', () => {
    const profile = { ...scoreQuiz({ level: 3 }), createdAt: 0, startUnit: 'i2' };
    const units = buildPath(profile);
    const st = pathStatus(units, {}, profile);
    expect(st.nodes.every((n) => st.status(n) !== ('locked' as string))).toBe(true);
    expect(st.current?.unit.id).toBe('i2');
  });
});

describe('puzzle tags', () => {
  it('tags every puzzle with the solver’s side', () => {
    // The opponent moves first, so the solver is the side not to move in the FEN.
    for (const p of db.puzzles) expect(p[6], p[0]).toBe(p[1].split(' ')[1] === 'w' ? 'b' : 'w');
    // Spot-check by playing the first move.
    for (const p of db.puzzles.slice(0, 300)) {
      const c = new Chess(p[1]);
      const u = p[2].split(' ')[0];
      c.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] as 'q' | undefined });
      expect(p[6], p[0]).toBe(c.turn());
    }
  });
  it('has opening families for a large share', () => {
    const n = db.puzzles.filter((p) => p[7] >= 0).length;
    expect(n).toBeGreaterThan(10000);
    expect(db.families.length).toBeGreaterThan(50);
  });
});
