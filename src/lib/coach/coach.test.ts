import { describe, expect, it } from 'vitest';
import { Chess } from '../chess/core';
import { parseManyPgn, parseMovetext } from '../chess/pgn';
import { moveMotifs, lineOutcome } from './tactics';
import { analyzePosition } from './structure';
import { reviewMove } from './explain';
import { see, parseBoard, idx } from './board';
import { schedule, newCardState } from '../srs/scheduler';
import { OPENINGS } from '../../data/openings';
import { LESSONS } from '../../data/lessons';

function play(moves: string, fen?: string) {
  const c = new Chess(fen);
  for (const m of parseMovetext(moves).sans) c.move(m.san);
  return c;
}

describe('pgn', () => {
  it('keeps the mainline and attaches comments', () => {
    const { sans } = parseMovetext('1.e4 {King pawn} e5 (1...c5 2.Nf3) 2.Nf3 $1 Nc6 1-0');
    expect(sans.map((s) => s.san)).toEqual(['e4', 'e5', 'Nf3', 'Nc6']);
    expect(sans[0].comment).toBe('King pawn');
  });
  it('splits multi-game files', () => {
    const games = parseManyPgn('[White "A"]\n[Black "B"]\n\n1.e4 e5 1-0\n\n[White "C"]\n[Black "D"]\n\n1.d4 d5 0-1');
    expect(games).toHaveLength(2);
    expect(games[1].headers.White).toBe('C');
  });
});

describe('tactics', () => {
  it('detects a knight fork', () => {
    const fen = 'r3k3/8/8/1N6/8/8/8/4K3 w - - 0 1';
    const c = new Chess(fen);
    const m = c.move('Nc7+');
    expect(moveMotifs(fen, m).map((x) => x.kind)).toContain('fork');
  });
  it('does not call a queen facing a queen a skewer', () => {
    const before = play('1.e4 e5 2.Nf3 d6 3.d4 Bg4 4.dxe5 Bxf3 5.Qxf3 dxe5 6.Bc4');
    const fen = before.fen();
    const m = new Chess(fen).move('Qf6');
    expect(moveMotifs(fen, m).map((x) => x.kind)).not.toContain('skewer');
  });
  it('static exchange evaluation sees a defended pawn', () => {
    const b = parseBoard('4k3/8/3p4/4p3/3P4/8/8/4K3 w - - 0 1');
    expect(see(b, idx('e5'), 'w')).toBeCloseTo(0);
  });
  it('measures material won along a line', () => {
    const fen = 'r3k3/8/8/1N6/8/8/8/4K3 w - - 0 1';
    const out = lineOutcome(fen, ['b5c7', 'e8d7', 'c7a8']);
    expect(out.material).toBeGreaterThanOrEqual(5);
  });
});

describe('structures', () => {
  it('recognises an isolated queen’s pawn', () => {
    const c = play('1.d4 d5 2.c4 dxc4 3.Nf3 Nf6 4.e3 e6 5.Bxc4 c5 6.O-O a6 7.a4 Nc6 8.Qe2 cxd4 9.Rd1 Be7 10.exd4 O-O 11.Nc3');
    expect(analyzePosition(c.fen()).structures.map((s) => s.id)).toContain('iqp');
  });
  it('recognises the Carlsbad structure', () => {
    const c = play('1.d4 d5 2.c4 e6 3.Nc3 Nf6 4.cxd5 exd5 5.Bg5 c6 6.e3 Be7 7.Bd3 Nbd7 8.Qc2 O-O');
    expect(analyzePosition(c.fen()).structures.map((s) => s.id)).toContain('carlsbad');
  });
});

describe('move review', () => {
  it('flags a hung queen as a blunder', () => {
    const fen = play('1.e4 d5').fen();
    const r = reviewMove({
      ply: 2,
      fenBefore: fen,
      uci: 'd1g4',
      before: [{ multipv: 1, depth: 14, cp: 40, pv: ['e4d5'] }],
      after: { multipv: 1, depth: 14, cp: -900, pv: ['c8g4', 'f1e2', 'g4e2'] },
    });
    expect(['blunder', 'mistake']).toContain(r.cls);
    expect(r.better).toContain('exd5');
  });
});

describe('spaced repetition', () => {
  it('grows intervals on success and resets on failure', () => {
    let s = newCardState(0);
    s = schedule(s, 'good', 0);
    s = schedule(s, 'good', 0);
    const i2 = s.interval;
    s = schedule(s, 'good', 0);
    expect(s.interval).toBeGreaterThan(i2);
    s = schedule(s, 'again', 0);
    expect(s.interval).toBe(0);
  });
});

describe('content', () => {
  it('every opening line is legal', () => {
    for (const o of OPENINGS)
      for (const l of o.lines) {
        const c = new Chess();
        for (const m of parseMovetext(l.pgn).sans) expect(() => c.move(m.san), `${o.id}/${l.id} ${m.san}`).not.toThrow();
      }
  });
  it('every lesson task answer is legal', () => {
    for (const lesson of LESSONS)
      for (const s of lesson.sections) {
        if (!s.task) continue;
        const fen = play(s.pgn ?? '', s.fen).fen();
        for (const a of s.task.accept) expect(() => new Chess(fen).move(a), `${lesson.id}: ${a}`).not.toThrow();
      }
  });
});

import { staticInsights, engineInsights } from './insights';

describe('what-matters insights', () => {
  const ids = (fen: string, c: 'w' | 'b') => staticInsights(fen, c).map((i) => i.id);
  it('spots a pinned knight for the side that suffers it', () => {
    const fen = play('1.e4 e5 2.Nf3 Nc6 3.Bb5 d6').fen();
    expect(ids(fen, 'b')).toContain('pinned-c6');
    expect(ids(fen, 'w')).toContain('their-pin-c6');
  });
  it('warns about a knight fork', () => {
    expect(ids('r3k3/8/8/1N6/8/8/8/4K3 b - - 0 1', 'b').some((i) => i.startsWith('fork-'))).toBe(true);
  });
  it('warns about a weak back rank', () => {
    expect(ids('3r2k1/5ppp/8/8/8/8/5PPP/6K1 w - - 0 1', 'w')).toContain('back-rank');
  });
  it('notices doubled pawns', () => {
    const fen = play('1.d4 Nf6 2.c4 e6 3.Nc3 Bb4 4.a3 Bxc3+ 5.bxc3').fen();
    expect(ids(fen, 'w')).toContain('doubled-c');
  });
  it('flags a hidden tactic without naming the move', () => {
    const fen = 'r3k3/8/8/1N6/8/8/8/4K3 w - - 0 1';
    const ins = engineInsights(fen, 'w', [{ multipv: 1, depth: 12, cp: 500, pv: ['b5c7', 'e8d7', 'c7a8'] }]);
    const tactic = ins.find((i) => i.id === 'tactic');
    expect(tactic).toBeTruthy();
    expect(tactic!.text).not.toMatch(/Nc7/);
  });
});

describe('material loss wording', () => {
  it('calls an unsound bishop sacrifice a hung piece', () => {
    const fen = 'r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4';
    const r = reviewMove({
      ply: 6,
      fenBefore: fen,
      uci: 'c4f7',
      before: [{ multipv: 1, depth: 14, cp: 25, pv: ['d2d3'] }],
      after: { multipv: 1, depth: 14, cp: -250, pv: ['e8f7', 'e1g1', 'd7d6'] },
    });
    expect(r.headline).toMatch(/Hangs the bishop/);
  });
});

import { botThinkTime, timePressure, hasMatingMaterial } from '../clock';
import { BOTS } from '../bots';
import { updateRating } from '../puzzles';

describe('human-like clock use', () => {
  const tc = { initial: 180_000, increment: 2_000 };
  const middlegame = play('1.e4 e5 2.Nf3 Nc6 3.Bb5 a6 4.Ba4 Nf6 5.O-O Be7 6.Re1 b5 7.Bb3 d6 8.c3 O-O 9.h3 Nb8 10.d4 Nbd7').fen();
  const avg = (botId: string) => {
    const bot = BOTS.find((b) => b.id === botId)!;
    let s = 0;
    for (let i = 0; i < 300; i++) s += botThinkTime({ fen: middlegame, bot, tc, remaining: 150_000 });
    return s / 300;
  };
  it('stronger bots think faster on average', () => {
    expect(avg('l9')).toBeLessThan(avg('l2'));
  });
  it('is never instant and never reckless', () => {
    for (const b of BOTS) {
      for (let i = 0; i < 50; i++) {
        const t = botThinkTime({ fen: middlegame, bot: b, tc, remaining: 150_000 });
        expect(t).toBeGreaterThanOrEqual(200);
        expect(t).toBeLessThan(150_000 * 0.2);
      }
    }
  });
  it('plays forced moves quickly', () => {
    const fen = '7k/8/8/8/8/8/6q1/7K w - - 0 1'; // only Kxg2
    expect(botThinkTime({ fen, bot: BOTS[5], tc, remaining: 150_000 })).toBeLessThan(800);
  });
  it('speeds up and feels pressure when short of time', () => {
    expect(timePressure(5_000, tc)).toBeGreaterThan(0.7);
    expect(timePressure(150_000, tc)).toBe(0);
    for (let i = 0; i < 50; i++) expect(botThinkTime({ fen: middlegame, bot: BOTS[5], tc, remaining: 5_000 })).toBeLessThan(1_500);
  });
  it('knows when a flag is a draw', () => {
    expect(hasMatingMaterial('8/8/8/4k3/8/8/8/4KN2 w - - 0 1', 'w')).toBe(false);
    expect(hasMatingMaterial('8/8/8/4k3/8/8/8/4KR2 w - - 0 1', 'w')).toBe(true);
  });
  it('puzzle rating moves in the right direction', () => {
    expect(updateRating(1500, 1500, true, 0)).toBeGreaterThan(1500);
    expect(updateRating(1500, 1500, false, 0)).toBeLessThan(1500);
  });
});

import { PROGRAMS, allDays, buildDay } from '../program';
import { makeQuestions } from '../quiz';

describe('training programs', () => {
  it('every program day has blocks, a review day closes each week, checkpoints exist', () => {
    for (const t of PROGRAMS) {
      for (const dpw of [3, 5, 7]) {
        for (const mins of [20, 40, 60]) {
          const days = allDays(t, { daysPerWeek: dpw, minutesPerDay: mins });
          expect(days.length).toBe(t.weeks.length * dpw);
          for (const d of days) {
            expect(d.blocks.length).toBeGreaterThan(0);
            for (const b of d.blocks) expect(b.to.startsWith('/')).toBe(true);
          }
          expect(days.filter((d) => d.review).length).toBe(t.weeks.length);
          expect(days.some((d) => d.checkpoint)).toBe(true);
        }
      }
    }
  });
  it('spreads every week item across the regular days', () => {
    const t = PROGRAMS[0];
    const titles = [1, 2, 3, 4].flatMap((d) => buildDay(t, 1, d, 5, 40).blocks.map((b) => b.title));
    expect(titles.some((x) => x.startsWith('Lesson:'))).toBe(true);
    expect(titles.some((x) => x.startsWith('Italian Game:'))).toBe(true);
    expect(titles.some((x) => x.startsWith('Classic:'))).toBe(true);
    expect(titles).toContain('Opening quiz');
  });
  it('review days interleave earlier weeks', () => {
    const d = buildDay(PROGRAMS[0], 3, 5, 5, 40);
    const quiz = d.blocks.find((b) => b.kind === 'quiz')!;
    expect(quiz.to).toContain('italian');
    expect(quiz.to).toContain('caro-kann');
  });
});

describe('opening quiz', () => {
  it('library questions name the line and expect a legal theory move', async () => {
    const qs = await makeQuestions('library', 12, []);
    expect(qs.length).toBeGreaterThan(8);
    for (const q of qs) {
      expect(q.options).toContain(q.answer);
      expect(new Set(q.options).size).toBe(q.options.length);
      expect(() => new Chess(q.fen).move(q.next)).not.toThrow();
    }
  });
  it('family questions come from mainstream openings with legal next moves', async () => {
    for (const source of ['families', 'variations'] as const) {
      const qs = await makeQuestions(source, 8, []);
      expect(qs.length).toBeGreaterThan(5);
      for (const q of qs) {
        expect(q.options.length).toBe(4);
        expect(() => new Chess(q.fen).move(q.next)).not.toThrow();
      }
    }
  });
});
