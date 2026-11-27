import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, Check, RotateCcw } from 'lucide-react';
import { Chess, uciOf } from '../lib/chess/core';
import { loadGameBody } from '../lib/store/gamesDb';
import { useApp } from '../lib/store/app';
import { CLASS_INFO } from '../lib/coach/explain';
import { navigate } from '../lib/router';
import { PuzzleDrill } from '../components/Trainers';
import { newCardState } from '../lib/srs/scheduler';
import { Button, Empty, Header, Spinner, NextDock } from '../components/ui';
function uciLine(fen, sans) {
    const c = new Chess(fen);
    const out = [];
    for (const s of sans) {
        try {
            out.push(uciOf(c.move(s)));
        }
        catch {
            break;
        }
    }
    return out;
}
/** Your mistakes in a reviewed game, worst first by lost winning chances. */
export function retryCandidates(moves, color) {
    return moves.filter((m) => m.color === color && (m.cls === 'mistake' || m.cls === 'blunder' || m.cls === 'miss') && !!m.bestUci);
}
export function RetryMistakes({ gameId }) {
    const meta = useApp((s) => s.games.find((g) => g.id === gameId));
    const logActivity = useApp((s) => s.logActivity);
    const [body, setBody] = useState(undefined);
    const [index, setIndex] = useState(0);
    const [results, setResults] = useState({});
    const [round, setRound] = useState(0);
    useEffect(() => {
        loadGameBody(gameId).then((g) => setBody(g ?? null));
    }, [gameId]);
    const color = meta?.myColor ?? null;
    const items = useMemo(() => (body?.review && color ? retryCandidates(body.review.moves, color) : []), [body, color]);
    const cards = useMemo(() => items.map((m) => ({
        id: `retry:${gameId}:${m.ply}`,
        kind: 'puzzle',
        fen: m.fenBefore,
        solution: m.bestLine?.length ? uciLine(m.fenBefore, m.bestLine) : [m.bestUci],
        played: m.uci,
        gameId,
        ply: m.ply,
        title: `Move ${Math.floor(m.ply / 2) + 1}: you played ${m.san} — ${CLASS_INFO[m.cls].label.toLowerCase()}`,
        note: m.headline,
        tags: m.tags,
        state: newCardState(0),
        addedAt: 0,
    })), [items, gameId]);
    if (body === undefined) {
        return (_jsxs("div", { className: "page", children: [_jsx(Header, { title: "Retry your mistakes", backTo: `/games/${gameId}` }), _jsx(Spinner, { label: "Loading the game\u2026" })] }));
    }
    if (!body?.review || !color || !cards.length) {
        return (_jsxs("div", { className: "page", children: [_jsx(Header, { title: "Retry your mistakes", backTo: `/games/${gameId}` }), _jsx(Empty, { title: !body?.review ? 'Review the game first' : 'No mistakes to retry', children: !body?.review ? 'Run a coach review, then come back to replay your mistakes.' : 'The coach found no mistakes or blunders by you in this game. Nice.' })] }));
    }
    const done = index >= cards.length;
    const solvedFirst = Object.values(results).filter(Boolean).length;
    const answered = results[index] !== undefined;
    if (done) {
        const missed = cards.filter((_, i) => !results[i]);
        return (_jsxs("div", { className: "page page-narrow", children: [_jsx(Header, { title: "Retry your mistakes", backTo: `/games/${gameId}` }), _jsxs("div", { className: "panel stack retry-done", children: [_jsxs("span", { className: "session-done-num num", children: [solvedFirst, "/", cards.length] }), _jsx("h2", { children: solvedFirst === cards.length ? 'Every mistake fixed on the first try.' : `${solvedFirst} fixed on the first try.` }), _jsx("p", { className: "muted", children: missed.length
                                ? `The ${missed.length} you missed are already in your review deck and will come back on their schedule.`
                                : 'These positions stay in your review deck so the lessons stick.' }), _jsxs("div", { className: "row", children: [missed.length > 0 && (_jsx(Button, { icon: _jsx(RotateCcw, { size: 16 }), onClick: () => { setIndex(cards.findIndex((_, i) => !results[i])); setResults(Object.fromEntries(Object.entries(results).filter(([, v]) => v))); setRound(round + 1); }, children: "Retry the missed ones" })), _jsx(Button, { variant: "secondary", onClick: () => navigate(`/games/${gameId}`), children: "Back to the game" })] })] })] }));
    }
    const next = () => {
        let n = index + 1;
        if (round > 0)
            while (n < cards.length && results[n])
                n++;
        setIndex(n);
    };
    return (_jsxs("div", { className: "page board-screen-page", children: [_jsx(Header, { title: "Retry your mistakes", backTo: `/games/${gameId}`, sub: `Mistake ${index + 1} of ${cards.length} · ${solvedFirst} fixed first try` }), _jsx("div", { className: "retry-progress", "aria-hidden": true, children: cards.map((_, i) => (_jsx("span", { className: `retry-dot${i === index ? ' is-current' : ''}${results[i] === true ? ' is-good' : results[i] === false ? ' is-bad' : ''}` }, i))) }), _jsx(PuzzleDrill, { card: cards[index], onDone: (r) => {
                    setResults((x) => ({ ...x, [index]: r.solved }));
                    logActivity('reviews');
                } }, `${index}:${round}`), answered && (_jsx(NextDock, { children: _jsx(Button, { size: "lg", icon: results[index] ? _jsx(Check, { size: 18 }) : _jsx(ArrowRight, { size: 18 }), onClick: next, children: index + 1 < cards.length ? 'Next mistake' : 'See results' }) }))] }));
}
