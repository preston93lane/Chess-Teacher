import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { useMemo, useState } from 'react';
import { Microscope, Upload, UserSearch } from 'lucide-react';
import { useApp } from '../lib/store/app';
import { navigate } from '../lib/router';
import { Button, Empty, Header, Segmented } from '../components/ui';
function outcome(g) {
    if (!g.myColor || !g.result || g.result === '*')
        return 'none';
    if (g.result === '1/2-1/2')
        return 'draw';
    return (g.result === '1-0') === (g.myColor === 'w') ? 'win' : 'loss';
}
export function Games() {
    const games = useApp((s) => s.games);
    const [filter, setFilter] = useState('all');
    const list = games.filter((g) => filter === 'all' ? true : filter === 'coach' ? g.source === 'bot' || g.source === 'practice' : g.source !== 'bot' && g.source !== 'practice');
    const stats = useMemo(() => {
        const s = { win: 0, loss: 0, draw: 0 };
        for (const g of games) {
            const o = outcome(g);
            if (o !== 'none')
                s[o]++;
        }
        const reviewed = games.filter((g) => g.reviewed && g.myColor && g.accuracy);
        const acc = reviewed.length ? reviewed.reduce((a, g) => a + g.accuracy[g.myColor], 0) / reviewed.length : null;
        const byOpening = new Map();
        for (const g of games) {
            if (!g.opening || outcome(g) === 'none')
                continue;
            const key = g.opening.split(':')[0];
            const cur = byOpening.get(key) ?? { n: 0, score: 0 };
            cur.n++;
            cur.score += outcome(g) === 'win' ? 1 : outcome(g) === 'draw' ? 0.5 : 0;
            byOpening.set(key, cur);
        }
        const openings = [...byOpening.entries()].sort((a, b) => b[1].n - a[1].n).slice(0, 6);
        return { ...s, acc, openings };
    }, [games]);
    return (_jsxs("div", { className: "page", children: [_jsx(Header, { title: "Games", sub: "Everything you\u2019ve played or imported. Open a game to review it with the coach.", actions: _jsxs(_Fragment, { children: [_jsx(Button, { size: "sm", variant: "secondary", icon: _jsx(Microscope, { size: 16 }), onClick: () => navigate('/analysis'), children: _jsx("span", { className: "hide-sm", children: "Analysis" }) }), _jsx(Button, { size: "sm", variant: "secondary", icon: _jsx(UserSearch, { size: 16 }), onClick: () => navigate('/scout'), children: _jsx("span", { className: "hide-sm", children: "Scout" }) }), _jsx(Button, { size: "sm", icon: _jsx(Upload, { size: 16 }), onClick: () => navigate('/import'), children: "Import" })] }) }), games.length > 0 && (_jsxs("div", { className: "games-stats", children: [_jsxs("div", { className: "wdl", children: [_jsxs("span", { className: "wdl-item", children: [_jsx("span", { className: "wdl-num num", children: stats.win }), " won"] }), _jsxs("span", { className: "wdl-item", children: [_jsx("span", { className: "wdl-num num", children: stats.draw }), " drawn"] }), _jsxs("span", { className: "wdl-item", children: [_jsx("span", { className: "wdl-num num", children: stats.loss }), " lost"] }), stats.acc !== null && _jsxs("span", { className: "wdl-item", children: [_jsxs("span", { className: "wdl-num num", children: [stats.acc.toFixed(0), "%"] }), " avg. accuracy"] })] }), stats.openings.length > 0 && (_jsx("div", { className: "opening-scores", children: stats.openings.map(([name, v]) => (_jsxs("div", { className: "opening-score", children: [_jsx("span", { className: "opening-score-name", children: name }), _jsx("span", { className: "meter", children: _jsx("span", { className: "meter-fill", style: { width: `${(v.score / v.n) * 100}%` } }) }), _jsxs("span", { className: "num small muted", children: [v.score, "/", v.n] })] }, name))) }))] })), _jsx("div", { className: "mt16", children: _jsx(Segmented, { value: filter, onChange: setFilter, label: "Filter games", options: [
                        { value: 'all', label: 'All' },
                        { value: 'coach', label: 'Vs the coach' },
                        { value: 'imported', label: 'Imported' },
                    ] }) }), list.length === 0 ? (_jsx("div", { className: "mt16", children: _jsx(Empty, { title: "No games yet", action: _jsxs("div", { className: "row", style: { justifyContent: 'center' }, children: [_jsx(Button, { onClick: () => navigate('/play'), children: "Play the coach" }), _jsx(Button, { variant: "secondary", onClick: () => navigate('/import'), children: "Import games" })] }), children: "Play a game against the coach, or import your games from a PGN file, Lichess or Chess.com." }) })) : (_jsx("div", { className: "list mt16", children: list.map((g) => {
                    const o = outcome(g);
                    return (_jsxs("button", { className: "list-item game-row", onClick: () => navigate(`/games/${g.id}`), children: [_jsx("span", { className: `result-badge result-${o}`, children: o === 'win' ? 'W' : o === 'loss' ? 'L' : o === 'draw' ? '½' : g.result === '*' ? '–' : g.result }), _jsxs("span", { className: "list-item-main", children: [_jsxs("span", { className: "list-item-title", children: [g.white, " ", _jsx("span", { className: "faint", children: "vs" }), " ", g.black] }), _jsxs("span", { className: "list-item-sub", children: [g.opening ?? 'Opening unknown', " \u00B7 ", Math.ceil(g.plies / 2), " moves"] })] }), _jsxs("span", { className: "list-item-meta", children: [g.reviewed && g.accuracy && g.myColor ? _jsxs("span", { className: "acc-pill num", children: [Math.round(g.accuracy[g.myColor]), "%"] }) : _jsx("span", { className: "faint", children: "Not reviewed" }), _jsx("br", {}), g.date ?? new Date(g.createdAt).toISOString().slice(0, 10)] })] }, g.id));
                }) }))] }));
}
