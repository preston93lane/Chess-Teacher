import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { RepTrainPanel } from './RepTrainer';
import { useMemo, useState } from 'react';
import { BookOpen, Repeat, Swords, Plus, Check, ArrowRight, Database } from 'lucide-react';
import { getOpening, parseLine } from '../lib/openings/book';
import { useApp } from '../lib/store/app';
import { navigate } from '../lib/router';
import { dueLabel, strength } from '../lib/srs/scheduler';
import { Button, Header, Segmented } from '../components/ui';
import { MiniBoard } from '../components/MiniBoard';
import { STRUCTURES } from '../lib/coach/structure';
import { getLesson } from '../data/lessons';
import { formatLine, START_FEN } from '../lib/chess/core';
import { parseMovetext } from '../lib/chess/pgn';
import { OPENING_HISTORY } from '../data/openingHistory';
import { getClassic } from '../data/classics';
export function OpeningDetail({ id }) {
    const opening = getOpening(id);
    const cards = useApp((s) => s.cards);
    const repertoire = useApp((s) => s.repertoire);
    const toggleRepertoire = useApp((s) => s.toggleRepertoire);
    const [side, setSide] = useState(repertoire[id]?.side ?? opening?.side ?? 'w');
    const [tab, setTab] = useState('lines');
    const rootFen = useMemo(() => {
        if (!opening)
            return START_FEN;
        const first = parseLine(opening, opening.lines[0].id);
        const n = parseMovetext(opening.root).sans.length;
        return first.fens[Math.min(n, first.fens.length - 1)];
    }, [opening]);
    if (!opening)
        return _jsx("div", { className: "page", children: _jsx(Header, { title: "Opening not found", backTo: "/openings" }) });
    const inRep = repertoire[id]?.side === side;
    const sideName = side === 'w' ? 'White' : 'Black';
    return (_jsxs("div", { className: "page", children: [_jsx(Header, { title: opening.name, backTo: "/openings", sub: `${opening.eco} · ${opening.root}` }), _jsxs("div", { className: "opening-hero", children: [_jsx(MiniBoard, { fen: rootFen, orientation: side, className: "opening-hero-board" }), _jsxs("div", { className: "opening-hero-body", children: [_jsx("p", { className: "opening-tagline", children: opening.tagline }), _jsx("div", { className: "prose", children: opening.summary.map((p, i) => (_jsx("p", { children: p }, i))) }), _jsxs("div", { className: "row mt16", children: [_jsx(Segmented, { value: side, onChange: setSide, label: "Study as", options: [
                                            { value: 'w', label: 'Study as White' },
                                            { value: 'b', label: 'Study as Black' },
                                        ] }), _jsx(Button, { variant: "ghost", size: "sm", icon: _jsx(Database, { size: 16 }), onClick: () => navigate(`/explorer?moves=${encodeURIComponent(opening.root)}`), children: "Master games" }), _jsx(Button, { variant: inRep ? 'secondary' : 'primary', size: "sm", icon: inRep ? _jsx(Check, { size: 16 }) : _jsx(Plus, { size: 16 }), onClick: () => toggleRepertoire(id, side), children: inRep ? 'In your repertoire' : 'Add to repertoire' })] }), side !== opening.side && (_jsxs("p", { className: "muted small mt8", children: ["This opening is written from ", opening.side === 'w' ? 'White' : 'Black', "\u2019s side, but you can drill ", sideName, "\u2019s moves too \u2014 useful for knowing what to expect."] }))] })] }), _jsx("div", { className: "tabs mt24", role: "tablist", children: ['lines', 'ideas', 'plans', 'history', 'traps'].filter((t) => t !== 'history' || OPENING_HISTORY[id]).map((t) => (_jsx("button", { role: "tab", "aria-selected": tab === t, className: `tab${tab === t ? ' is-on' : ''}`, onClick: () => setTab(t), children: t === 'lines' ? `Lines (${opening.lines.length})` : t === 'ideas' ? 'Key ideas' : t === 'plans' ? 'Middlegame plans' : t === 'history' ? 'History' : `Traps (${opening.traps.length})` }, t))) }), tab === 'lines' && _jsx(RepTrainPanel, { opening: opening, side: side }), tab === 'lines' && (_jsx("div", { className: "line-list", children: opening.lines.map((l) => {
                    const card = cards[`line:${id}:${l.id}:${side}`];
                    const st = card ? strength(card.state) : 'new';
                    const parsed = parseLine(opening, l.id);
                    return (_jsxs("div", { className: "line-row", children: [_jsxs("div", { className: "line-row-main", children: [_jsxs("div", { className: "line-row-head", children: [_jsx("h3", { children: l.name }), _jsx("span", { className: `chip strength-${st}`, children: card ? (card.state.due <= Date.now() ? 'Due now' : `${labelFor(st)} · ${dueLabel(card.state)}`) : 'New' })] }), l.about && _jsx("p", { className: "muted", children: l.about }), _jsxs("p", { className: "line-moves num", children: [formatLine(START_FEN, parsed.sans.slice(0, 14)), parsed.sans.length > 14 ? ' …' : ''] })] }), _jsxs("div", { className: "line-row-actions", children: [_jsx(Button, { size: "sm", variant: card ? 'secondary' : 'primary', icon: _jsx(BookOpen, { size: 16 }), onClick: () => navigate(`/openings/${id}/learn/${l.id}?side=${side}`), children: "Learn" }), _jsx(Button, { size: "sm", variant: card ? 'primary' : 'secondary', icon: _jsx(Repeat, { size: 16 }), onClick: () => navigate(`/openings/${id}/drill/${l.id}?side=${side}`), children: "Drill" }), _jsx(Button, { size: "sm", variant: "ghost", icon: _jsx(Swords, { size: 16 }), onClick: () => navigate(`/play?opening=${id}&line=${l.id}&side=${side}`), children: "Play it" })] })] }, l.id));
                }) })), tab === 'ideas' && (_jsxs("div", { className: "grid-2 mt8", children: [_jsxs("div", { className: "panel", children: [_jsxs("h3", { children: [opening.side === 'w' ? 'White' : 'Black', "\u2019s ideas"] }), _jsx("ul", { className: "bullets mt12", children: opening.ideas.map((x) => (_jsx("li", { children: x }, x))) })] }), _jsxs("div", { className: "panel", children: [_jsxs("h3", { children: [opening.side === 'w' ? 'Black' : 'White', "\u2019s ideas"] }), _jsx("ul", { className: "bullets mt12", children: opening.opponentIdeas.map((x) => (_jsx("li", { children: x }, x))) })] }), opening.structures.map((s) => {
                        const info = STRUCTURES[s];
                        return (_jsxs("div", { className: "panel", children: [_jsxs("h3", { children: ["Structure: ", info.name] }), _jsx("p", { className: "muted mt8", children: info.summary }), info.lessonId && (_jsxs("button", { className: "link-btn mt8", onClick: () => navigate(`/train/lesson/${info.lessonId}`), children: ["Study the lesson ", _jsx(ArrowRight, { size: 14 })] }))] }, s));
                    })] })), tab === 'plans' && (_jsxs("div", { className: "stack mt8", children: [opening.plans.map((p) => (_jsxs("div", { className: "panel", children: [_jsx("h3", { children: p.title }), _jsx("p", { className: "muted mt8", children: p.text })] }, p.title))), opening.lessons?.length ? (_jsxs("div", { className: "panel", children: [_jsx("h3", { children: "Related lessons" }), _jsx("div", { className: "chips mt12", children: opening.lessons.map((lid) => {
                                    const l = getLesson(lid);
                                    return l ? (_jsx("button", { className: "chip", onClick: () => navigate(`/train/lesson/${lid}`), children: l.title }, lid)) : null;
                                }) })] })) : null] })), tab === 'history' && OPENING_HISTORY[id] && (_jsxs("div", { className: "history mt8", children: [_jsxs("div", { className: "grid-2", children: [_jsxs("div", { className: "panel", children: [_jsx("h3", { children: "Named after" }), _jsx("p", { className: "mt8", children: OPENING_HISTORY[id].namesake }), _jsx("p", { className: "muted mt8", children: OPENING_HISTORY[id].origin })] }), _jsxs("div", { className: "panel", children: [_jsx("h3", { children: "How its pioneers played it" }), _jsx("p", { className: "muted mt8", children: OPENING_HISTORY[id].style })] })] }), _jsx("h3", { className: "mt24", children: "How the theory evolved" }), _jsx("ol", { className: "timeline mt12", children: OPENING_HISTORY[id].eras.map((e) => (_jsxs("li", { className: "timeline-item", children: [_jsx("span", { className: "timeline-when num", children: e.when }), _jsxs("span", { className: "timeline-body", children: [_jsx("strong", { children: e.title }), _jsx("span", { className: "muted", children: e.text })] })] }, e.when + e.title))) }), OPENING_HISTORY[id].modelGames.length > 0 && (_jsxs(_Fragment, { children: [_jsx("h3", { className: "mt24", children: "Model games" }), _jsx("div", { className: "classic-strip mt12", children: OPENING_HISTORY[id].modelGames.map((gid) => {
                                    const g = getClassic(gid);
                                    return g ? (_jsxs("button", { className: "classic-mini", onClick: () => navigate(`/classics/${gid}`), children: [_jsx("span", { className: "classic-year num", children: g.year }), _jsx("span", { className: "classic-title", children: g.title }), _jsxs("span", { className: "muted small", children: [g.white, " \u2013 ", g.black] })] }, gid)) : null;
                                }) })] }))] })), tab === 'traps' && (_jsxs("div", { className: "stack mt8", children: [opening.traps.length === 0 && _jsx("p", { className: "muted", children: "No famous traps here \u2014 this opening is about understanding, not tricks." }), opening.traps.map((t) => (_jsxs("div", { className: "panel", children: [_jsx("h3", { children: t.name }), _jsx("p", { className: "line-moves num mt8", children: t.pgn }), _jsx("p", { className: "muted mt8", children: t.text }), _jsxs("button", { className: "link-btn mt8", onClick: () => navigate(`/analysis?moves=${encodeURIComponent(t.pgn)}`), children: ["Play through on the analysis board ", _jsx(ArrowRight, { size: 14 })] })] }, t.name)))] }))] }));
}
function labelFor(s) {
    return s === 'learning' ? 'Learning' : s === 'young' ? 'Reviewing' : s === 'mature' ? 'Mastered' : 'New';
}
