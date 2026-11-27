import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMemo, useState } from 'react';
import { ArrowRight, ChevronLeft, ChevronsLeft, RefreshCw, Search, Swords, Trash2 } from 'lucide-react';
import { Chess, START_FEN } from '../lib/chess/core';
import { useApp } from '../lib/store/app';
import { scoutPlayer, scoutStats } from '../lib/scout';
import { BOTS } from '../lib/bots';
import { navigate } from '../lib/router';
import { Board } from '../components/Board';
import { Button, Empty, Header, IconButton, Section, Segmented } from '../components/ui';
import { StatTile } from '../components/Charts';
import { ResultBar } from '../components/MasterMoves';
import { toast } from '../components/Toast';
export function ScoutHome() {
    const scouts = useApp((s) => s.scouts);
    const save = useApp((s) => s.saveScout);
    const [site, setSite] = useState('lichess');
    const [user, setUser] = useState('');
    const [max, setMax] = useState('100');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState(null);
    const go = async (s = site, u = user, m = +max) => {
        if (!u.trim())
            return setError('Enter a username.');
        setBusy(true);
        setError(null);
        try {
            const p = await scoutPlayer(s, u.trim(), m);
            save(p);
            navigate(`/scout/${encodeURIComponent(p.key)}`);
        }
        catch (e) {
            setError(e.message || 'Could not download the games. Are you online?');
        }
        finally {
            setBusy(false);
        }
    };
    const list = Object.values(scouts).sort((a, b) => b.fetchedAt - a.fetchedAt);
    return (_jsxs("div", { className: "page page-narrow", children: [_jsx(Header, { title: "Scout an opponent", backTo: "/games", sub: "Download a player\u2019s recent games to see what they open with, where they score badly and how they lose \u2014 then practise against a bot that plays their lines." }), _jsx(Section, { children: _jsxs("div", { className: "stack", children: [_jsx(Segmented, { value: site, onChange: setSite, options: [{ value: 'lichess', label: 'Lichess' }, { value: 'chesscom', label: 'Chess.com' }] }), _jsxs("label", { className: "field", children: [_jsx("span", { className: "field-label", children: "Username" }), _jsx("input", { className: "input", value: user, onChange: (e) => setUser(e.target.value), onKeyDown: (e) => e.key === 'Enter' && go(), autoCapitalize: "off", autoCorrect: "off", spellCheck: false })] }), _jsx(Segmented, { value: max, onChange: setMax, label: "Games", options: [{ value: '50', label: '50 games' }, { value: '100', label: '100' }, { value: '200', label: '200' }] }), error && _jsx("p", { className: "tone-text-blunder small", children: error }), _jsx(Button, { icon: busy ? undefined : _jsx(Search, { size: 16 }), onClick: () => go(), disabled: busy, children: busy ? 'Downloading games…' : 'Scout' }), _jsx("p", { className: "faint small", children: "Needs an internet connection; the report is saved on this device afterwards." })] }) }), list.length > 0 && (_jsx(Section, { title: "Recent reports", children: _jsx("div", { className: "list", children: list.map((p) => (_jsxs("button", { className: "list-item", onClick: () => navigate(`/scout/${encodeURIComponent(p.key)}`), children: [_jsxs("span", { className: "list-item-main", children: [_jsx("span", { className: "list-item-title", children: p.user }), _jsxs("span", { className: "list-item-sub", children: [p.site === 'lichess' ? 'Lichess' : 'Chess.com', " \u00B7 ", p.games.length, " games \u00B7 ", new Date(p.fetchedAt).toLocaleDateString()] })] }), _jsx(ArrowRight, { size: 18, className: "muted" })] }, p.key))) }) }))] }));
}
const SPEED_LABEL = { bullet: 'Bullet', blitz: 'Blitz', rapid: 'Rapid', classical: 'Classical', daily: 'Daily' };
export function ScoutReport({ scoutKey }) {
    const p = useApp((s) => s.scouts[scoutKey]);
    const save = useApp((s) => s.saveScout);
    const del = useApp((s) => s.deleteScout);
    const [speed, setSpeed] = useState('all');
    const [refreshing, setRefreshing] = useState(false);
    const stats = useMemo(() => (p ? scoutStats(p, speed === 'all' ? undefined : speed) : null), [p, speed]);
    if (!p || !stats) {
        return (_jsxs("div", { className: "page", children: [_jsx(Header, { title: "Scouting report", backTo: "/scout" }), _jsx(Empty, { title: "Report not found" })] }));
    }
    const nearestBot = (r) => (r ? [...BOTS].sort((a, b) => Math.abs(a.elo - r) - Math.abs(b.elo - r))[0] : BOTS[4]);
    const bot = nearestBot(stats.rating);
    const practice = (yourColor) => navigate(`/play?opening=${encodeURIComponent(`scout:${p.key}:${yourColor === 'w' ? 'b' : 'w'}`)}&side=${yourColor}&bot=${bot.id}`);
    const refresh = async () => {
        setRefreshing(true);
        try {
            save(await scoutPlayer(p.site, p.user, Math.max(50, p.games.length)));
            toast('Report updated.');
        }
        catch (e) {
            toast(e.message);
        }
        finally {
            setRefreshing(false);
        }
    };
    const score = (c) => (stats.byColor[c].n ? Math.round(((stats.byColor[c].win + stats.byColor[c].draw / 2) / stats.byColor[c].n) * 100) : 0);
    return (_jsxs("div", { className: "page", children: [_jsx(Header, { title: p.user, backTo: "/scout", sub: `${p.site === 'lichess' ? 'Lichess' : 'Chess.com'} · ${stats.n} games${stats.rating ? ` · rated about ${stats.rating}` : ''}`, actions: _jsx(IconButton, { label: "Refresh", onClick: refresh, disabled: refreshing, children: _jsx(RefreshCw, {}) }) }), stats.speeds.length > 1 && (_jsxs("div", { className: "chip-row mb12", children: [_jsx("button", { className: `chip${speed === 'all' ? ' is-on' : ''}`, onClick: () => setSpeed('all'), children: "All" }), stats.speeds.map(([sp, n]) => (_jsxs("button", { className: `chip${speed === sp ? ' is-on' : ''}`, onClick: () => setSpeed(sp), children: [SPEED_LABEL[sp], " ", _jsx("span", { className: "faint num", children: n })] }, sp)))] })), _jsxs("div", { className: "kpi-row", children: [_jsx(StatTile, { label: "As White", value: `${score('w')}%`, sub: `${stats.byColor.w.win}W · ${stats.byColor.w.draw}D · ${stats.byColor.w.loss}L` }), _jsx(StatTile, { label: "As Black", value: `${score('b')}%`, sub: `${stats.byColor.b.win}W · ${stats.byColor.b.draw}D · ${stats.byColor.b.loss}L` }), _jsx(StatTile, { label: "Losses on time", value: `${stats.losses.total ? Math.round((stats.losses.time / stats.losses.total) * 100) : 0}%`, sub: `${stats.losses.total} losses` })] }), _jsx(Section, { title: "What to expect", children: stats.notes.length ? _jsx("ul", { className: "bullets", children: stats.notes.map((n, i) => _jsx("li", { children: n }, i)) }) : _jsx("p", { className: "muted", children: "Not enough games for clear patterns yet." }) }), _jsxs(Section, { title: "Prepare", children: [_jsxs("div", { className: "row", children: [_jsx(Button, { icon: _jsx(Swords, { size: 16 }), onClick: () => practice('w'), disabled: !stats.byColor.b.n, children: "Play their Black openings (you\u2019re White)" }), _jsx(Button, { variant: "secondary", icon: _jsx(Swords, { size: 16 }), onClick: () => practice('b'), disabled: !stats.byColor.w.n, children: "Play their White openings (you\u2019re Black)" })] }), _jsxs("p", { className: "faint small mt8", children: ["The bot (", bot.name, ", about ", bot.elo, ") plays the moves ", p.user, " chose in these games, as often as they chose them, then plays on its own."] })] }), _jsx("div", { className: "insights-grid", children: ['w', 'b'].map((c) => (_jsx(Section, { title: `Openings as ${c === 'w' ? 'White' : 'Black'}`, children: stats.openings[c].length ? (_jsxs("table", { className: "data-table", children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { children: "Opening" }), _jsx("th", { className: "num", children: "Games" }), _jsx("th", { className: "num", children: "Score" })] }) }), _jsx("tbody", { children: stats.openings[c].slice(0, 8).map((o) => (_jsxs("tr", { className: "is-click", onClick: () => navigate(`/explorer?moves=${encodeURIComponent(o.sample.join(' '))}`), children: [_jsx("td", { children: o.name }), _jsx("td", { className: "num", children: o.n }), _jsxs("td", { className: `num${o.n >= 3 && o.score < 0.4 ? ' tone-text-best' : o.n >= 4 && o.score >= 0.65 ? ' tone-text-mistake' : ''}`, children: [Math.round(o.score * 100), "%"] })] }, o.name))) })] })) : (_jsxs("p", { className: "muted", children: ["No games as ", c === 'w' ? 'White' : 'Black', "."] })) }, c))) }), _jsx("p", { className: "faint small", children: "Green scores are their weak spots, orange their strong ones. Tap an opening to see what masters play there." }), _jsx(Section, { title: "Their opening tree", children: _jsx(ScoutTree, { profile: p, speed: speed === 'all' ? undefined : speed }) }), _jsxs("button", { className: "link-btn danger mt16", onClick: () => { del(p.key); navigate('/scout'); }, children: [_jsx(Trash2, { size: 14 }), " Delete this report"] })] }));
}
function ScoutTree({ profile, speed }) {
    const [color, setColor] = useState('w');
    const [path, setPath] = useState([]);
    const games = profile.games.filter((g) => g.color === color && (!speed || g.speed === speed) && path.every((s, i) => g.sans[i] === s));
    const next = new Map();
    for (const g of games) {
        const san = g.sans[path.length];
        if (!san)
            continue;
        const r = next.get(san) ?? { n: 0, win: 0, draw: 0, loss: 0 };
        r.n++;
        r[g.result]++;
        next.set(san, r);
    }
    const rows = [...next.entries()].sort((a, b) => b[1].n - a[1].n).slice(0, 10);
    const fen = useMemo(() => {
        const c = new Chess(START_FEN);
        for (const s of path)
            c.move(s);
        return c.fen();
    }, [path]);
    const theirTurn = (path.length % 2 === 0) === (color === 'w');
    return (_jsxs("div", { className: "scout-tree", children: [_jsx(Segmented, { value: color, onChange: (v) => { setColor(v); setPath([]); }, options: [{ value: 'w', label: `${profile.user} as White` }, { value: 'b', label: `as Black` }] }), _jsxs("div", { className: "board-screen mt12", children: [_jsxs("div", { className: "board-col", children: [_jsx(Board, { fen: fen, orientation: color === 'w' ? 'b' : 'w' }), _jsxs("div", { className: "controls", children: [_jsxs("div", { className: "controls-group", children: [_jsx(IconButton, { label: "Start", onClick: () => setPath([]), children: _jsx(ChevronsLeft, {}) }), _jsx(IconButton, { label: "Back", onClick: () => setPath(path.slice(0, -1)), disabled: !path.length, children: _jsx(ChevronLeft, {}) })] }), _jsx("span", { className: "muted small num", children: path.map((s, i) => (i % 2 === 0 ? `${i / 2 + 1}.${s}` : s)).join(' ') || 'Start' })] })] }), _jsxs("div", { className: "side-col", children: [_jsxs("p", { className: "muted small mb8", children: [games.length, " game", games.length === 1 ? '' : 's', " reached this position. ", theirTurn ? `${profile.user}’s choices:` : 'What their opponents played, and how it went for them:'] }), rows.length ? (_jsx("table", { className: "masters-table", children: _jsx("tbody", { children: rows.map(([san, r]) => (_jsxs("tr", { className: "is-click", onClick: () => setPath([...path, san]), children: [_jsx("td", { className: "masters-san num", children: san }), _jsx("td", { className: "num", children: r.n }), _jsx("td", { className: "masters-bar-col", children: _jsx(ResultBar, { white: color === 'w' ? r.win : r.loss, draws: r.draw, black: color === 'w' ? r.loss : r.win }) })] }, san))) }) })) : (_jsx("p", { className: "muted", children: "They haven\u2019t gone further from here in these games." })), rows.length > 0 && _jsx("p", { className: "faint small mt8", children: "Bars show White wins, draws and Black wins." })] })] })] }));
}
