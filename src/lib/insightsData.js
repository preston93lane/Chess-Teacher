/**
 * Aggregates for the Insights dashboard: accuracy trend, phases, mistake
 * profile, openings, time use, puzzle themes and activity.
 */
import { Chess } from './chess/core';
import { familyOf } from './quiz';
export const PHASES = ['opening', 'middlegame', 'endgame'];
const VALUE = { q: 9, r: 5, b: 3, n: 3 };
/** Material-based phase: first ten moves are the opening; the endgame starts when little material is left. */
export function phaseOf(fen, ply) {
    if (ply < 20)
        return 'opening';
    let m = 0;
    for (const ch of fen.split(' ')[0])
        m += VALUE[ch.toLowerCase()] ?? 0;
    return m <= 26 ? 'endgame' : 'middlegame';
}
function myResult(g) {
    if (!g.myColor)
        return null;
    if (g.result === '1/2-1/2')
        return 'draw';
    if (g.result === '1-0')
        return g.myColor === 'w' ? 'win' : 'loss';
    if (g.result === '0-1')
        return g.myColor === 'b' ? 'win' : 'loss';
    return null;
}
const avg = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : undefined);
export function computeInsights(games, bodies, puzzles, activity) {
    const mine = games.filter((g) => g.myColor);
    const chrono = [...mine].sort((a, b) => a.createdAt - b.createdAt);
    // Accuracy trend (reviewed games)
    const trend = chrono
        .filter((g) => g.accuracy && g.reviewed)
        .map((g) => ({
        gameId: g.id,
        date: g.date ?? new Date(g.createdAt).toISOString().slice(0, 10),
        opponent: g.myColor === 'w' ? g.black : g.white,
        acc: g.accuracy[g.myColor],
        result: myResult(g) ?? 'draw',
    }))
        .slice(-40);
    const accRecent = avg(trend.slice(-10).map((p) => p.acc));
    const accPrevious = trend.length >= 20 ? avg(trend.slice(-20, -10).map((p) => p.acc)) : undefined;
    // Results by colour
    const results = { w: { win: 0, draw: 0, loss: 0 }, b: { win: 0, draw: 0, loss: 0 } };
    for (const g of mine) {
        const r = myResult(g);
        if (r)
            results[g.myColor][r]++;
    }
    // Phases, mistakes and time from stored reviews
    const phaseAcc = { opening: [], middlegame: [], endgame: [] };
    const mistakes = { moves: 0, inaccuracy: 0, mistake: 0, blunder: 0, miss: 0 };
    const think = { opening: [], middlegame: [], endgame: [] };
    let timedGames = 0;
    let timedMoves = 0;
    let troubleMoves = 0;
    let errors = 0;
    let troubleErrors = 0;
    for (const g of mine) {
        const body = bodies.get(g.id);
        if (!body)
            continue;
        const color = g.myColor;
        const review = body.review;
        const fens = [];
        if (review || body.clocks) {
            try {
                const c = new Chess(body.startFen);
                fens.push(c.fen());
                for (const san of body.sans) {
                    c.move(san);
                    fens.push(c.fen());
                }
            }
            catch {
                /* keep what we have */
            }
        }
        const errorPlies = new Set();
        if (review) {
            for (const m of review.moves) {
                if (m.color !== color)
                    continue;
                const ph = phaseOf(m.fenBefore, m.ply);
                phaseAcc[ph].push(m.accuracy);
                mistakes.moves++;
                if (m.cls === 'inaccuracy' || m.cls === 'mistake' || m.cls === 'blunder' || m.cls === 'miss') {
                    mistakes[m.cls]++;
                    if (m.cls !== 'inaccuracy')
                        errorPlies.add(m.ply);
                }
            }
        }
        if (body.clocks && body.tc) {
            timedGames++;
            const first = new Chess(body.startFen).turn();
            let prev = body.tc.initial;
            let firstOwn = true;
            for (let ply = 0; ply < body.sans.length; ply++) {
                const mover = (ply % 2 === 0) === (first === 'w') ? 'w' : 'b';
                if (mover !== color)
                    continue;
                const left = body.clocks[ply];
                if (left === undefined)
                    continue;
                const spent = Math.max(0, prev - (left - body.tc.increment));
                prev = left;
                // The clock doesn't run for your first move.
                if (!firstOwn)
                    think[phaseOf(fens[ply] ?? body.startFen, ply)].push(spent);
                firstOwn = false;
                timedMoves++;
                const trouble = left - body.tc.increment < Math.max(15000, body.tc.initial * 0.1);
                if (trouble)
                    troubleMoves++;
                if (errorPlies.has(ply)) {
                    errors++;
                    if (trouble)
                        troubleErrors++;
                }
            }
        }
    }
    // Openings
    const byOpening = new Map();
    for (const g of mine) {
        if (!g.opening)
            continue;
        const name = familyOf(g.opening);
        const r = myResult(g);
        const row = byOpening.get(name) ?? { games: 0, points: 0, acc: [], w: 0, b: 0 };
        row.games++;
        row.points += r === 'win' ? 1 : r === 'draw' ? 0.5 : 0;
        if (g.accuracy && g.reviewed)
            row.acc.push(g.accuracy[g.myColor]);
        if (g.myColor === 'w')
            row.w++;
        else
            row.b++;
        byOpening.set(name, row);
    }
    const openings = [...byOpening.entries()]
        .map(([name, r]) => ({ name, games: r.games, score: r.points / r.games, acc: avg(r.acc), asWhite: r.w, asBlack: r.b }))
        .sort((a, b) => b.games - a.games || b.score - a.score)
        .slice(0, 10);
    // Puzzle themes
    const themeMap = new Map();
    for (const h of puzzles.history) {
        for (const t of h.themes ?? []) {
            const r = themeMap.get(t) ?? { n: 0, ok: 0 };
            r.n++;
            if (h.ok)
                r.ok++;
            themeMap.set(t, r);
        }
    }
    const themes = [...themeMap.entries()]
        .filter(([, r]) => r.n >= 4)
        .map(([theme, r]) => ({ theme, n: r.n, rate: r.ok / r.n }))
        .sort((a, b) => b.rate - a.rate);
    const chronoPuzzles = [...puzzles.history].reverse();
    const step = Math.max(1, Math.ceil(chronoPuzzles.length / 60));
    const puzzleTrend = chronoPuzzles
        .filter((_, i) => i % step === 0 || i === chronoPuzzles.length - 1)
        .map((h) => ({ t: h.t, rating: Math.round(h.after) }));
    // Activity heatmap: the last 18 weeks, ending today
    const heat = [];
    const end = new Date();
    const start = new Date(end);
    start.setDate(start.getDate() - (7 * 18 - 1) - start.getDay());
    for (const d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const key = d.toISOString().slice(0, 10);
        const a = activity[key];
        heat.push({ date: key, count: a ? a.reviews + a.puzzles + a.games + a.lessons + a.lines : 0 });
    }
    return {
        games: mine.length,
        reviewed: trend.length,
        trend,
        accRecent,
        accPrevious,
        results,
        phase: {
            opening: { acc: avg(phaseAcc.opening), moves: phaseAcc.opening.length },
            middlegame: { acc: avg(phaseAcc.middlegame), moves: phaseAcc.middlegame.length },
            endgame: { acc: avg(phaseAcc.endgame), moves: phaseAcc.endgame.length },
        },
        mistakes,
        openings,
        time: timedGames
            ? {
                games: timedGames,
                avgThink: { opening: avg(think.opening), middlegame: avg(think.middlegame), endgame: avg(think.endgame) },
                troubleMovesShare: timedMoves ? troubleMoves / timedMoves : 0,
                troubleErrorsShare: errors ? troubleErrors / errors : 0,
                errors,
            }
            : undefined,
        themes,
        puzzleTrend,
        heat,
    };
}
export function recommendations(ins, themeLabel) {
    const out = [];
    const phases = PHASES.filter((p) => ins.phase[p].acc !== undefined && ins.phase[p].moves >= 15);
    if (phases.length >= 2) {
        const worst = phases.reduce((a, b) => (ins.phase[a].acc <= ins.phase[b].acc ? a : b));
        const best = phases.reduce((a, b) => (ins.phase[a].acc >= ins.phase[b].acc ? a : b));
        if (ins.phase[best].acc - ins.phase[worst].acc >= 4) {
            if (worst === 'endgame')
                out.push({ text: `Your endgame accuracy (${Math.round(ins.phase.endgame.acc)}%) trails your ${best}. Technique is trainable: work through the endgame course drills.`, to: '/endgames', cta: 'Endgame course' });
            else if (worst === 'opening')
                out.push({ text: `You lose the most accuracy in the opening (${Math.round(ins.phase.opening.acc)}%). Drill your repertoire lines until they’re automatic.`, to: '/train/review', cta: 'Review lines' });
            else
                out.push({ text: `The middlegame is where your accuracy dips (${Math.round(ins.phase.middlegame.acc)}%). Daily tactics and the calculation lesson help most here.`, to: '/puzzles', cta: 'Puzzles' });
        }
    }
    const weakTheme = [...ins.themes].reverse().find((t) => t.rate < 0.6 && t.n >= 5);
    if (weakTheme)
        out.push({ text: `You solve only ${Math.round(weakTheme.rate * 100)}% of ${themeLabel(weakTheme.theme).toLowerCase()} puzzles. A focused set will make the pattern stick.`, to: `/puzzles/play?mode=theme&theme=${weakTheme.theme}`, cta: `${themeLabel(weakTheme.theme)} puzzles` });
    if (ins.time && ins.time.errors >= 4 && ins.time.troubleErrorsShare >= 0.4) {
        out.push({ text: `${Math.round(ins.time.troubleErrorsShare * 100)}% of your mistakes come when you’re low on time. Spend less in the opening — your book moves should be quick.`, to: '/play', cta: 'Play a timed game' });
    }
    const weakOpening = ins.openings.find((o) => o.games >= 3 && o.score < 0.4);
    if (weakOpening)
        out.push({ text: `You score ${Math.round(weakOpening.score * 100)}% in the ${weakOpening.name}. Look at what masters play there, then drill the line.`, to: '/explorer', cta: 'Opening explorer' });
    const m = ins.mistakes;
    if (m.moves >= 80 && (m.blunder / m.moves) * 40 >= 1) {
        out.push({ text: `You average ${((m.blunder / m.moves) * 40).toFixed(1)} blunders per 40 moves. Before each move, check what the opponent’s last move attacks.`, to: '/train/review?kind=puzzle', cta: 'Review your mistakes' });
    }
    return out.slice(0, 4);
}
