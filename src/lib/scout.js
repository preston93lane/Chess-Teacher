/**
 * Opponent scouting: download a player's recent games (Lichess or
 * Chess.com), then profile their openings, results and habits. Their games
 * also become a practice "opening" so a bot can play their lines.
 */
import { parseManyPgn } from './chess/pgn';
import { fetchChessCom, fetchLichess } from './importGames';
import { openingFor } from './openings/eco';
import { familyOf } from './quiz';
function hash(s) {
    let h = 2166136261;
    for (let i = 0; i < s.length; i++) {
        h ^= s.charCodeAt(i);
        h = Math.imul(h, 16777619);
    }
    return (h >>> 0).toString(36);
}
export function speedOf(tc) {
    if (!tc || tc === '-')
        return undefined;
    if (tc.includes('/'))
        return 'daily';
    const [base, inc] = tc.split('+').map((x) => parseInt(x, 10) || 0);
    const est = base + 40 * inc;
    return est < 180 ? 'bullet' : est < 480 ? 'blitz' : est < 1500 ? 'rapid' : 'classical';
}
export async function scoutPlayer(site, user, max) {
    const pgn = site === 'lichess' ? await fetchLichess(user, max) : await fetchChessCom(user, max);
    const parsed = parseManyPgn(pgn);
    const name = user.trim().toLowerCase();
    const games = [];
    for (const g of parsed) {
        if (g.startFen && !g.startFen.startsWith('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR'))
            continue; // variants
        const w = (g.headers.White ?? '').toLowerCase();
        const b = (g.headers.Black ?? '').toLowerCase();
        const color = w === name ? 'w' : b === name ? 'b' : null;
        if (!color || g.moves.length < 2)
            continue;
        const res = g.result;
        const result = res === '1/2-1/2' ? 'draw' : (res === '1-0') === (color === 'w') ? 'win' : res === '1-0' || res === '0-1' ? 'loss' : null;
        if (!result)
            continue;
        const sans = g.moves.map((m) => m.san);
        const term = `${g.headers.Termination ?? ''}`.toLowerCase();
        const ending = result === 'draw' ? 'draw' : term.includes('time') ? 'time' : sans[sans.length - 1]?.endsWith('#') || term.includes('checkmate') ? 'mate' : term.includes('resign') || term === 'normal' ? 'resign' : 'other';
        const op = await openingFor(sans).catch(() => undefined);
        const rating = parseInt(color === 'w' ? g.headers.WhiteElo : g.headers.BlackElo, 10);
        games.push({
            color,
            result,
            sans: sans.slice(0, 20),
            plies: sans.length,
            opening: op?.name ?? g.headers.Opening,
            eco: op?.eco ?? g.headers.ECO,
            ending,
            speed: speedOf(g.headers.TimeControl),
            rating: Number.isFinite(rating) ? rating : undefined,
            date: (g.headers.UTCDate ?? g.headers.Date)?.replace(/\./g, '-'),
        });
    }
    if (!games.length)
        throw new Error(`No games found where ${user} played.`);
    return { key: `${site}:${name}`, site, user: user.trim(), fetchedAt: Date.now(), games };
}
const pct = (a, b) => (b ? Math.round((a / b) * 100) : 0);
export function scoutStats(p, speed) {
    const games = speed ? p.games.filter((g) => g.speed === speed) : p.games;
    const byColor = { w: { n: 0, win: 0, draw: 0, loss: 0 }, b: { n: 0, win: 0, draw: 0, loss: 0 } };
    const openMap = { w: new Map(), b: new Map() };
    const count = (arr, k) => k && arr.set(k, (arr.get(k) ?? 0) + 1);
    const first = new Map();
    const e4 = new Map();
    const d4 = new Map();
    const losses = { mate: 0, resign: 0, time: 0, other: 0, short: 0, total: 0 };
    const speeds = new Map();
    const ratings = [];
    for (const g of games) {
        const c = byColor[g.color];
        c.n++;
        c[g.result]++;
        const fam = g.opening ? familyOf(g.opening) : 'Unknown';
        const row = openMap[g.color].get(fam) ?? { n: 0, pts: 0, sample: g.sans.slice(0, 8) };
        row.n++;
        row.pts += g.result === 'win' ? 1 : g.result === 'draw' ? 0.5 : 0;
        openMap[g.color].set(fam, row);
        if (g.color === 'w')
            count(first, g.sans[0]);
        else if (g.sans[0] === 'e4')
            count(e4, g.sans[1]);
        else if (g.sans[0] === 'd4')
            count(d4, g.sans[1]);
        if (g.result === 'loss') {
            losses.total++;
            if (g.ending === 'mate' || g.ending === 'resign' || g.ending === 'time')
                losses[g.ending]++;
            else
                losses.other++;
            if (g.plies < 50)
                losses.short++;
        }
        if (g.speed)
            speeds.set(g.speed, (speeds.get(g.speed) ?? 0) + 1);
        if (g.rating)
            ratings.push(g.rating);
    }
    const top = (m) => [...m.entries()].sort((a, b) => b[1] - a[1]).map(([san, n]) => ({ san, n }));
    const openings = {
        w: [...openMap.w.entries()].map(([name, r]) => ({ name, n: r.n, score: r.pts / r.n, sample: r.sample })).sort((a, b) => b.n - a.n),
        b: [...openMap.b.entries()].map(([name, r]) => ({ name, n: r.n, score: r.pts / r.n, sample: r.sample })).sort((a, b) => b.n - a.n),
    };
    const notes = [];
    const fm = top(first);
    if (fm[0] && byColor.w.n >= 5)
        notes.push(`As White they open 1.${fm[0].san} in ${pct(fm[0].n, byColor.w.n)}% of games${fm[1] ? `, otherwise 1.${fm[1].san}` : ''}.`);
    const re4 = top(e4);
    const totalE4 = re4.reduce((a, x) => a + x.n, 0);
    if (re4[0] && totalE4 >= 4)
        notes.push(`Against 1.e4 they answer 1…${re4[0].san} ${pct(re4[0].n, totalE4)}% of the time.`);
    const rd4 = top(d4);
    const totalD4 = rd4.reduce((a, x) => a + x.n, 0);
    if (rd4[0] && totalD4 >= 4)
        notes.push(`Against 1.d4 they play 1…${rd4[0].san} ${pct(rd4[0].n, totalD4)}% of the time.`);
    for (const c of ['w', 'b']) {
        const weak = openings[c].filter((o) => o.n >= 3 && o.score < 0.4).sort((a, b) => a.score - b.score)[0];
        if (weak)
            notes.push(`As ${c === 'w' ? 'White' : 'Black'} they score only ${Math.round(weak.score * 100)}% in the ${weak.name} (${weak.n} games) — steer for it.`);
        const strong = openings[c].filter((o) => o.n >= 4 && o.score >= 0.65).sort((a, b) => b.score - a.score)[0];
        if (strong)
            notes.push(`Beware their ${strong.name} as ${c === 'w' ? 'White' : 'Black'}: ${Math.round(strong.score * 100)}% over ${strong.n} games.`);
    }
    if (losses.total >= 4 && losses.time / losses.total >= 0.25)
        notes.push(`${pct(losses.time, losses.total)}% of their losses are on time. Keep the position complicated and the clock ticking.`);
    if (losses.total >= 4 && losses.short / losses.total >= 0.4)
        notes.push(`${pct(losses.short, losses.total)}% of their losses come before move 25 — they can be caught early.`);
    if (losses.total >= 4 && losses.mate / losses.total >= 0.3)
        notes.push(`They often play on until mate (${pct(losses.mate, losses.total)}% of losses).`);
    const ws = byColor.w.n ? (byColor.w.win + byColor.w.draw / 2) / byColor.w.n : 0;
    const bs = byColor.b.n ? (byColor.b.win + byColor.b.draw / 2) / byColor.b.n : 0;
    if (byColor.w.n >= 5 && byColor.b.n >= 5 && Math.abs(ws - bs) >= 0.15)
        notes.push(`They are noticeably stronger as ${ws > bs ? 'White' : 'Black'} (${Math.round(Math.max(ws, bs) * 100)}% vs ${Math.round(Math.min(ws, bs) * 100)}%).`);
    return {
        n: games.length,
        rating: ratings.length ? Math.round(ratings.slice(0, 10).reduce((a, b) => a + b, 0) / Math.min(10, ratings.length)) : undefined,
        byColor,
        openings,
        firstMove: fm,
        vsE4: re4,
        vsD4: rd4,
        losses,
        speeds: [...speeds.entries()].sort((a, b) => b[1] - a[1]),
        notes,
    };
}
/** Their games as an opening the practice bot can follow ("scout:<key>:<their colour>"). */
export function scoutOpening(p, theirColor) {
    const lines = p.games
        .filter((g) => g.color === theirColor)
        .map((g, i) => {
        const pgn = g.sans.slice(0, 16).map((s, j) => (j % 2 === 0 ? `${j / 2 + 1}.${s}` : s)).join(' ');
        return { id: `g${i}_${hash(pgn + p.fetchedAt)}`, name: g.opening ?? 'Game', pgn };
    });
    return {
        id: `scout:${p.key}:${theirColor}`,
        name: `${p.user}'s openings`,
        eco: '',
        side: theirColor === 'w' ? 'b' : 'w',
        family: 'Flank',
        level: 'Intermediate',
        tagline: `Lines ${p.user} actually plays`,
        summary: [],
        root: '',
        ideas: [],
        opponentIdeas: [],
        structures: [],
        plans: [],
        traps: [],
        lines,
    };
}
