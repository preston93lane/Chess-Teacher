import { describe, expect, it } from 'vitest';
import { Chess } from './chess/core';
import { pickStyled, styleScore, styleMargin, STYLES, getStyle } from './styles';
import { computeInsights, phaseOf, recommendations } from './insightsData';
import { ALL_DRILLS, ENDGAME_CHAPTERS, ENDGAME_LESSONS } from '../data/endgames';
import { LESSONS } from '../data/lessons';
describe('bot styles', () => {
    it('has a balanced default and unique ids', () => {
        expect(getStyle(undefined).id).toBe('balanced');
        expect(new Set(STYLES.map((s) => s.id)).size).toBe(STYLES.length);
    });
    it('attacker prefers checks, the wall prefers castling', () => {
        const fen = 'r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4';
        const c = new Chess(fen);
        const castle = c.move('O-O');
        const check = new Chess(fen).move('Bxf7+');
        expect(styleScore('attacker', fen, check)).toBeGreaterThan(styleScore('attacker', fen, castle));
        expect(styleScore('solid', fen, castle)).toBeGreaterThan(styleScore('solid', fen, check));
    });
    it('only strays within the margin of the move it would play', () => {
        const fen = 'r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4';
        const lines = [
            { multipv: 1, depth: 12, cp: 40, pv: ['e1g1'] },
            { multipv: 2, depth: 12, cp: 30, pv: ['d2d3'] },
            { multipv: 3, depth: 12, cp: -200, pv: ['c4f7'] },
        ];
        // Bxf7+ is in character for the attacker but loses 2.4 pawns: not chosen.
        expect(pickStyled('attacker', fen, lines, styleMargin(1500))).not.toBe('c4f7');
        expect(pickStyled('balanced', fen, lines, 50)).toBeNull();
        expect(styleMargin(3000)).toBeLessThan(styleMargin(1200));
    });
});
describe('endgame course', () => {
    it('every drill position is legal with the side not to move out of check', () => {
        for (const d of ALL_DRILLS) {
            const c = new Chess(d.fen);
            const parts = d.fen.split(' ');
            parts[1] = parts[1] === 'w' ? 'b' : 'w';
            parts[3] = '-';
            expect(new Chess(parts.join(' ')).inCheck(), d.id).toBe(false);
            expect(c.isGameOver(), d.id).toBe(false);
        }
    });
    it('drill ids are unique and lessons are registered', () => {
        expect(new Set(ALL_DRILLS.map((d) => d.id)).size).toBe(ALL_DRILLS.length);
        for (const ch of ENDGAME_CHAPTERS)
            for (const id of ch.lessons)
                expect(LESSONS.some((l) => l.id === id), id).toBe(true);
        for (const l of ENDGAME_LESSONS)
            for (const s of l.sections)
                if (s.drill)
                    expect(ALL_DRILLS.some((d) => d.id === s.drill), s.drill).toBe(true);
    });
    it('lesson tasks accept only legal moves', () => {
        for (const l of ENDGAME_LESSONS)
            for (const s of l.sections)
                if (s.fen && s.task)
                    for (const a of s.task.accept)
                        expect(() => new Chess(s.fen).move(a), `${l.id} ${a}`).not.toThrow();
    });
});
const defaultPuzzleStats = { rating: 1500, attempts: 0, solved: 0, failed: 0, history: [], seen: [], rush: {} };
describe('insights', () => {
    it('classifies phases by move number and material', () => {
        expect(phaseOf('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', 4)).toBe('opening');
        expect(phaseOf('r1bq1rk1/pp3ppp/2n2n2/3p4/3P4/2N2N2/PP3PPP/R1BQ1RK1 w - - 0 12', 24)).toBe('middlegame');
        expect(phaseOf('8/5pk1/6p1/8/3R4/6P1/5PK1/3r4 w - - 0 40', 80)).toBe('endgame');
    });
    it('aggregates results, mistakes and clock use', () => {
        const sans = ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Nd4', 'Nxe5', 'Qg5'];
        const c = new Chess();
        const moves = sans.map((san, i) => {
            const before = c.fen();
            const m = c.move(san);
            return { ply: i, san, uci: m.from + m.to, color: m.color, fenBefore: before, fenAfter: c.fen(), winBefore: 50, winAfter: 50, accuracy: i === 6 ? 10 : 90, cls: i === 6 ? 'blunder' : 'best', headline: '', notes: [], tags: [] };
        });
        const meta = { id: 'g1', createdAt: 1, white: 'You', black: 'Bot', result: '0-1', myColor: 'w', source: 'bot', opening: 'Italian Game: Blackburne Shilling Gambit', plies: 8, accuracy: { w: 70, b: 90 }, reviewed: true, timeControl: '3+2' };
        const body = {
            id: 'g1',
            headers: {},
            startFen: new Chess().fen(),
            sans,
            review: { depth: 12, moves, evals: [], accuracy: { w: 70, b: 90 }, counts: { w: {}, b: {} }, bookPly: 4, keyMoments: [], phaseAccuracy: { w: {}, b: {} }, summary: [], completedAt: 1 },
            clocks: { 0: 182000, 1: 182000, 2: 178000, 3: 180000, 4: 160000, 5: 175000, 6: 8000, 7: 170000 },
            tc: { initial: 180000, increment: 2000 },
        };
        const ins = computeInsights([meta], new Map([['g1', body]]), defaultPuzzleStats, {});
        expect(ins.results.w.loss).toBe(1);
        expect(ins.mistakes.blunder).toBe(1);
        expect(ins.mistakes.moves).toBe(4);
        expect(ins.openings[0].name).toBe('Italian Game');
        expect(ins.time?.games).toBe(1);
        // The blunder came with 8 s left: in time trouble.
        expect(ins.time?.troubleErrorsShare).toBe(1);
        expect(ins.heat.length).toBeGreaterThan(100);
        expect(recommendations(ins, (t) => t)).toBeInstanceOf(Array);
    });
});
describe('opening traps', () => {
    it('every trap line is legal and contains its key move', async () => {
        const { allTraps } = await import('../data/traps');
        const { parseMovetext } = await import('./chess/pgn');
        const traps = allTraps();
        expect(traps.length).toBeGreaterThanOrEqual(13);
        for (const t of traps) {
            const c = new Chess();
            const sans = parseMovetext(t.pgn).sans.map((x) => c.move(x.san).san);
            expect(sans.indexOf(t.key), t.name).toBeGreaterThan(0);
        }
    });
});
describe('follow-up annotation', () => {
    it('walks a line and notes each move', async () => {
        const { annotateLine } = await import('./coach/followup');
        // Légal: after 5...Bxd1, 6.Bxf7+ Ke7 7.Nd5#
        const fen = 'rn1qkbnr/ppp2p1p/3p2p1/4N3/2B1P3/2N5/PPPP1PPP/R1BbK2R w KQkq - 0 6';
        const plies = annotateLine(fen, ['c4f7', 'e8e7', 'c3d5']);
        expect(plies.map((p) => p.san)).toEqual(['Bxf7+', 'Ke7', 'Nd5#']);
        expect(plies[2].note).toBe('Checkmate.');
        expect(plies[0].note.length).toBeGreaterThan(0);
    });
});
