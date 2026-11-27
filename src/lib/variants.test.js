import { describe, expect, it } from 'vitest';
import { chess960Fen, fogFor, legalMoves, newGame, play, undo, visibleSquares } from './variants';
const seq = (mode, fen, moves) => {
    let s = newGame(mode, fen);
    for (const m of moves) {
        const n = play(s, { from: m.slice(0, 2), to: m.slice(2, 4), promotion: m[4] });
        if (!n)
            throw new Error('illegal ' + m);
        s = n;
    }
    return s;
};
describe('Chess960', () => {
    it('position 518 is the normal set-up', () => {
        expect(chess960Fen(518).split(' ')[0]).toBe('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR');
    });
    it('every position has opposite bishops and the king between the rooks', () => {
        for (let n = 0; n < 960; n += 7) {
            const rank = chess960Fen(n).split('/')[7].split(' ')[0];
            const b = [...rank].map((c, i) => (c === 'B' ? i : -1)).filter((i) => i >= 0);
            expect(b.length).toBe(2);
            expect((b[0] + b[1]) % 2).toBe(1);
            const r = [...rank].map((c, i) => (c === 'R' ? i : -1)).filter((i) => i >= 0);
            const k = rank.indexOf('K');
            expect(r[0] < k && k < r[1]).toBe(true);
        }
    });
    it('castles by moving the king onto its rook, or to the usual square', () => {
        const fen = chess960Fen(518); // normal set-up, Chess960 castling rules
        const s = seq('chess960', fen, ['e2e4', 'e7e5', 'g1f3', 'g8f6', 'f1c4', 'f8c5']);
        const moves = legalMoves(s);
        expect(moves.some((m) => m.from === 'e1' && m.to === 'h1')).toBe(true);
        expect(moves.some((m) => m.from === 'e1' && m.to === 'g1')).toBe(true);
        for (const target of ['h1', 'g1']) {
            const after = play(s, { from: 'e1', to: target });
            expect(after.plies[after.plies.length - 1].san).toBe('O-O');
            expect(after.pos.board.get(6)?.role).toBe('king'); // g1
            expect(after.pos.board.get(5)?.role).toBe('rook'); // f1
        }
    });
    it('standard games end in checkmate and support undo', () => {
        const s = seq('standard', undefined, ['f2f3', 'e7e5', 'g2g4', 'd8h4']);
        expect(s.result).toBe('0-1');
        expect(s.reason).toBe('Checkmate');
        expect(undo(s, 1).plies.length).toBe(3);
    });
});
describe('Fog of War', () => {
    it('allows moving into check and ends on king capture', () => {
        // 1.e4 f6 2.Qh5+ — the king is "in check", but Black may ignore it…
        const s = seq('fog', undefined, ['e2e4', 'f7f6', 'd1h5', 'a7a6']);
        expect(s.result).toBeUndefined();
        const won = play(s, { from: 'h5', to: 'e8' });
        expect(won.result).toBe('1-0');
        expect(won.reason).toBe('King captured');
    });
    it('hides squares the player can’t reach', () => {
        const s = newGame('fog');
        const fog = fogFor(s, 'w');
        expect(fog).toContain('e7'); // enemy pawns hidden at the start
        expect(fog).not.toContain('e4'); // a square our pawn can move to
        expect(visibleSquares(s.pos, 'w').has('e2')).toBe(true);
    });
});
