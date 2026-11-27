import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { eventLabel } from '../lib/explorer';
import { useEffect, useState } from 'react';
import { Database } from 'lucide-react';
import { explorerMeta, loadExplorer, lookup, pct } from '../lib/explorer';
import { Spinner } from './ui';
/** Hook: master statistics for a position, loading the database on first use. */
export function useMasters(fen) {
    const [ready, setReady] = useState(!!explorerMeta());
    useEffect(() => {
        if (ready)
            return;
        let alive = true;
        loadExplorer().then(() => alive && setReady(true));
        return () => {
            alive = false;
        };
    }, [ready]);
    return { entry: ready ? lookup(fen) : null, ready };
}
export function ResultBar({ white, draws, black, labels = true }) {
    const total = white + draws + black || 1;
    const w = (white / total) * 100;
    const d = (draws / total) * 100;
    const b = (black / total) * 100;
    return (_jsxs("span", { className: "rbar", role: "img", "aria-label": `White wins ${Math.round(w)}%, draws ${Math.round(d)}%, Black wins ${Math.round(b)}%`, children: [w > 0 && _jsx("span", { className: "rbar-w", style: { width: `${w}%` }, children: labels && w >= 22 ? `${Math.round(w)}%` : '' }), d > 0 && _jsx("span", { className: "rbar-d", style: { width: `${d}%` }, children: labels && d >= 22 ? `${Math.round(d)}%` : '' }), b > 0 && _jsx("span", { className: "rbar-b", style: { width: `${b}%` }, children: labels && b >= 22 ? `${Math.round(b)}%` : '' })] }));
}
export function MasterMoves({ fen, onPlay, onGame, limit = 12, showGames = true, }) {
    const { entry, ready } = useMasters(fen);
    if (!ready)
        return _jsx(Spinner, { label: "Loading master games\u2026" });
    if (!entry) {
        return (_jsxs("p", { className: "muted small", children: [_jsx(Database, { size: 14, className: "inline-icon" }), " Out of the master database \u2014 fewer than ten games reached this position."] }));
    }
    return (_jsxs("div", { className: "masters", children: [_jsxs("div", { className: "masters-head", children: [_jsxs("span", { className: "muted small num", children: [entry.total.toLocaleString(), " master games"] }), _jsxs("span", { className: "rbar-legend small", children: [_jsxs("span", { children: [_jsx("i", { className: "rbar-key rbar-w" }), " White"] }), _jsxs("span", { children: [_jsx("i", { className: "rbar-key rbar-d" }), " Draw"] }), _jsxs("span", { children: [_jsx("i", { className: "rbar-key rbar-b" }), " Black"] })] })] }), _jsxs("table", { className: "masters-table", children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { children: "Move" }), _jsx("th", { className: "num", children: "Games" }), _jsx("th", { className: "masters-bar-col", children: "Results" }), _jsx("th", { className: "num masters-elo", children: "Avg" })] }) }), _jsx("tbody", { children: entry.moves.slice(0, limit).map((m) => (_jsxs("tr", { onClick: () => onPlay?.(m.san), className: onPlay ? 'is-click' : '', title: `${m.white} white wins · ${m.draws} draws · ${m.black} black wins`, children: [_jsx("td", { className: "masters-san num", children: m.san }), _jsxs("td", { className: "num", children: [m.total.toLocaleString(), _jsxs("span", { className: "faint small", children: [" ", pct(m.total, entry.total), "%"] })] }), _jsx("td", { className: "masters-bar-col", children: _jsx(ResultBar, { white: m.white, draws: m.draws, black: m.black }) }), _jsx("td", { className: "num masters-elo faint", children: m.avgElo })] }, m.san))) })] }), showGames && entry.games.length > 0 && (_jsxs("div", { className: "masters-games", children: [_jsx("h4", { children: "Top games" }), entry.games.map((g) => (_jsxs("button", { className: "master-game", onClick: () => onGame?.(g), disabled: !onGame, children: [_jsxs("span", { className: "master-game-players", children: [_jsxs("span", { children: [g.white, " ", _jsx("span", { className: "faint num", children: g.whiteElo })] }), _jsxs("span", { children: [g.black, " ", _jsx("span", { className: "faint num", children: g.blackElo })] })] }), _jsx("span", { className: `master-game-result num${g.result === '1-0' ? ' is-w' : g.result === '0-1' ? ' is-b' : ''}`, children: g.result === '1/2-1/2' ? '½–½' : g.result.replace('-', '–') }), _jsx("span", { className: "faint small master-game-event", children: eventLabel(g) })] }, g.index)))] }))] }));
}
