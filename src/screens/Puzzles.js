import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from 'react';
import { CalendarDays, Crown, Flame, Play, Timer, Zap } from 'lucide-react';
import { loadPuzzles, THEME_INFO, isMaster } from '../lib/puzzles';
import { useApp, today } from '../lib/store/app';
import { navigate } from '../lib/router';
import { Header, Section, Spinner } from '../components/ui';
import { OPENINGS } from '../data/openings';
export function usePuzzleDb() {
    const [db, setDb] = useState(null);
    const [error, setError] = useState(false);
    useEffect(() => {
        loadPuzzles().then(setDb).catch(() => setError(true));
    }, []);
    return { db, error };
}
const GROUPS = ['Motifs', 'Mates', 'Style', 'Endgames', 'Phase'];
export function PuzzlesHub() {
    const { db } = usePuzzleDb();
    const ps = useApp((s) => s.puzzles);
    const repertoire = useApp((s) => s.repertoire);
    const counts = useMemo(() => {
        const m = new Map();
        const o = new Map();
        let masters = 0;
        for (const p of db ?? []) {
            for (const t of p.themes)
                m.set(t, (m.get(t) ?? 0) + 1);
            if (p.opening)
                o.set(p.opening, (o.get(p.opening) ?? 0) + 1);
            if (isMaster(p))
                masters++;
        }
        return { themes: m, openings: o, masters };
    }, [db]);
    const recent = ps.history.slice(0, 20);
    const recentRate = recent.length ? Math.round((recent.filter((h) => h.ok).length / recent.length) * 100) : null;
    const dailyDone = ps.dailyDone === today();
    const repOpenings = OPENINGS.filter((o) => repertoire[o.id]);
    return (_jsxs("div", { className: "page", children: [_jsx(Header, { title: "Puzzles", sub: db ? `${db.length.toLocaleString()} puzzles on this device — from real games, rated and sorted by theme.` : 'Loading the puzzle collection…' }), _jsxs("div", { className: "puzzle-hero", children: [_jsxs("div", { className: "puzzle-rating", children: [_jsx("span", { className: "puzzle-rating-num num", children: ps.rating }), _jsx("span", { className: "puzzle-rating-label", children: "puzzle rating" }), _jsxs("span", { className: "muted small num", children: [ps.solved, " solved", recentRate !== null ? ` · ${recentRate}% of the last ${recent.length}` : ''] })] }), _jsxs("div", { className: "puzzle-actions", children: [_jsxs("button", { className: "puzzle-action puzzle-action-main", onClick: () => navigate('/puzzles/play?mode=rated'), disabled: !db, children: [_jsx(Play, { size: 20 }), _jsxs("span", { children: [_jsx("strong", { children: "Rated puzzles" }), _jsx("span", { className: "muted small", children: "Adapts to your rating" })] })] }), _jsxs("button", { className: "puzzle-action", onClick: () => navigate('/puzzles/play?mode=daily'), disabled: !db, children: [_jsx(CalendarDays, { size: 20 }), _jsxs("span", { children: [_jsx("strong", { children: "Daily puzzle" }), _jsx("span", { className: "muted small", children: dailyDone ? 'Done for today' : 'A new one every day' })] })] })] })] }), _jsxs(Section, { title: "Puzzle Rush", children: [_jsx("div", { className: "rush-grid", children: [
                            { mode: '3', label: '3 minutes', icon: Zap },
                            { mode: '5', label: '5 minutes', icon: Timer },
                            { mode: 'survival', label: 'Survival', icon: Flame },
                        ].map((r) => (_jsxs("button", { className: "rush-card", onClick: () => navigate(`/puzzles/rush?mode=${r.mode}`), disabled: !db, children: [_jsx(r.icon, { size: 22 }), _jsx("span", { className: "rush-label", children: r.label }), _jsxs("span", { className: "muted small num", children: ["Best: ", ps.rush[r.mode] ?? 0] })] }, r.mode))) }), _jsx("p", { className: "muted small mt8", children: "Puzzles get harder as you go. Three mistakes and the run ends." })] }), _jsx(Section, { title: "From master games", children: _jsxs("button", { className: "list-item list-standalone", onClick: () => navigate('/puzzles/play?mode=master'), disabled: !db, children: [_jsx(Crown, { size: 20 }), _jsxs("span", { className: "list-item-main", children: [_jsx("span", { className: "list-item-title", children: "Master & grandmaster games" }), _jsx("span", { className: "list-item-sub", children: "Tactics that occurred between titled players." })] }), _jsx("span", { className: "list-item-meta num", children: counts.masters })] }) }), _jsxs(Section, { title: "Tactics in your openings", children: [repOpenings.length === 0 && _jsx("p", { className: "muted small mb8", children: "Add openings to your repertoire to see them first. All 14 library openings have puzzles from real games." }), _jsx("div", { className: "chips", children: [...repOpenings, ...OPENINGS.filter((o) => !repertoire[o.id])].map((o) => (_jsxs("button", { className: `chip${repertoire[o.id] ? ' chip-on' : ''}`, onClick: () => navigate(`/puzzles/play?mode=opening&id=${o.id}`), disabled: !counts.openings.get(o.id), children: [o.name, " ", _jsx("span", { className: "num", children: counts.openings.get(o.id) ?? 0 })] }, o.id))) })] }), _jsxs(Section, { title: "Practise a theme", children: [!db && _jsx(Spinner, {}), db &&
                        GROUPS.map((g) => (_jsxs("div", { className: "theme-group", children: [_jsx("h3", { className: "lesson-group-title", children: g }), _jsx("div", { className: "theme-grid", children: Object.entries(THEME_INFO)
                                        .filter(([, v]) => v.group === g)
                                        .filter(([k]) => (counts.themes.get(k) ?? 0) >= 10)
                                        .map(([k, v]) => (_jsxs("button", { className: "theme-card", onClick: () => navigate(`/puzzles/play?mode=theme&theme=${k}`), children: [_jsx("span", { className: "theme-card-label", children: v.label }), _jsx("span", { className: "theme-card-about", children: v.about }), _jsx("span", { className: "theme-card-count num", children: counts.themes.get(k) })] }, k))) })] }, g)))] }), recent.length > 0 && (_jsx(Section, { title: "Recent", children: _jsx("div", { className: "recent-strip", children: recent.map((h) => (_jsx("span", { className: `recent-dot ${h.ok ? 'ok' : 'bad'}`, title: `${h.rating}`, children: h.ok ? '✓' : '✕' }, h.id + h.t))) }) })), _jsx("p", { className: "faint small mt24", children: "Puzzles from the Lichess puzzle database (CC0)." })] }));
}
