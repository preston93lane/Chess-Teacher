import { parseManyPgn } from './chess/pgn';
import { openingFor } from './openings/eco';
import { saveGameBody } from './store/gamesDb';
function hash(s) {
    let h = 2166136261;
    for (let i = 0; i < s.length; i++) {
        h ^= s.charCodeAt(i);
        h = Math.imul(h, 16777619);
    }
    return (h >>> 0).toString(36);
}
export async function fetchLichess(user, max, since) {
    const url = `https://lichess.org/api/games/user/${encodeURIComponent(user)}?max=${max}&clocks=false&evals=false&opening=true${since ? `&since=${since}` : ''}`;
    const res = await fetch(url, { headers: { Accept: 'application/x-chess-pgn' } });
    if (res.status === 404)
        throw new Error(`No Lichess user named “${user}”.`);
    if (!res.ok)
        throw new Error(`Lichess answered with an error (${res.status}). Try again in a minute.`);
    return res.text();
}
export async function fetchChessCom(user, max) {
    const base = `https://api.chess.com/pub/player/${encodeURIComponent(user.toLowerCase())}/games/archives`;
    const res = await fetch(base);
    if (res.status === 404)
        throw new Error(`No Chess.com user named “${user}”.`);
    if (!res.ok)
        throw new Error(`Chess.com answered with an error (${res.status}).`);
    const { archives } = (await res.json());
    const pgns = [];
    for (const url of [...archives].reverse()) {
        const r = await fetch(url);
        if (!r.ok)
            break;
        const data = (await r.json());
        const games = data.games.filter((g) => g.pgn && (g.rules ?? 'chess') === 'chess').reverse();
        for (const g of games) {
            pgns.push(g.pgn);
            if (pgns.length >= max)
                break;
        }
        if (pgns.length >= max)
            break;
    }
    return pgns.join('\n\n');
}
export async function importPgnText(text, opts) {
    const games = parseManyPgn(text);
    const added = [];
    const errors = [];
    let skipped = 0;
    const names = opts.usernames.map((u) => u.trim().toLowerCase()).filter(Boolean);
    for (const g of games) {
        const id = `imp_${hash(`${g.headers.White}|${g.headers.Black}|${g.headers.Date}|${g.headers.UTCTime ?? ''}|${g.moves.map((m) => m.san).join(' ')}`)}`;
        if (opts.existing.has(id)) {
            skipped++;
            continue;
        }
        if (g.error)
            errors.push(`${g.headers.White ?? '?'} vs ${g.headers.Black ?? '?'}: ${g.error}`);
        const myColor = detectColor(g, names);
        const op = await openingFor(g.moves.map((m) => m.san), g.startFen).catch(() => undefined);
        const comments = {};
        g.moves.forEach((m, i) => m.comment && (comments[i] = m.comment));
        await saveGameBody({ id, headers: g.headers, startFen: g.startFen, sans: g.moves.map((m) => m.san), comments });
        const date = (g.headers.UTCDate ?? g.headers.Date ?? '').replace(/\./g, '-');
        added.push({
            id,
            createdAt: Date.parse(date) || Date.now(),
            white: g.headers.White ?? 'White',
            black: g.headers.Black ?? 'Black',
            result: g.result,
            myColor,
            source: opts.source,
            opening: op?.name ?? g.headers.Opening,
            eco: op?.eco ?? g.headers.ECO,
            plies: g.moves.length,
            timeControl: g.headers.TimeControl,
            date: /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : undefined,
        });
        opts.existing.add(id);
    }
    return { added, skipped, errors };
}
function detectColor(g, names) {
    const w = (g.headers.White ?? '').toLowerCase();
    const b = (g.headers.Black ?? '').toLowerCase();
    if (names.includes(w))
        return 'w';
    if (names.includes(b))
        return 'b';
    return null;
}
