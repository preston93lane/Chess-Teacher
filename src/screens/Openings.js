import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMemo, useState } from 'react';
import { OPENINGS } from '../data/openings';
import { useApp } from '../lib/store/app';
import { navigate } from '../lib/router';
import { Header, Segmented } from '../components/ui';
import { MiniBoard } from '../components/MiniBoard';
import { parseMovetext } from '../lib/chess/pgn';
import { Chess } from '../lib/chess/core';
export function Openings() {
    const cards = useApp((s) => s.cards);
    const repertoire = useApp((s) => s.repertoire);
    const [filter, setFilter] = useState('all');
    const list = OPENINGS.filter((o) => filter === 'all' ? true : filter === 'mine' ? !!repertoire[o.id] : o.side === filter);
    const families = ['1.e4', '1.d4', 'Flank'];
    return (_jsxs("div", { className: "page", children: [_jsx(Header, { title: "Openings", sub: "Theory, ideas and plans. Learn a line, then drill it until it sticks.", actions: _jsxs("div", { className: "row", children: [_jsx("button", { className: "btn btn-secondary btn-sm", onClick: () => navigate('/repertoire'), children: _jsx("span", { children: "My repertoires" }) }), _jsx("button", { className: "btn btn-secondary btn-sm", onClick: () => navigate('/explorer'), children: _jsx("span", { children: "Master explorer" }) }), _jsx("button", { className: "btn btn-primary btn-sm", onClick: () => navigate('/openings/quiz'), children: _jsx("span", { children: "Opening quiz" }) })] }) }), _jsx(Segmented, { value: filter, onChange: setFilter, label: "Filter", options: [
                    { value: 'all', label: 'All' },
                    { value: 'w', label: 'As White' },
                    { value: 'b', label: 'As Black' },
                    { value: 'mine', label: 'My repertoire' },
                ] }), list.length === 0 && _jsx("p", { className: "muted mt16", children: "Nothing here yet. Open an opening and add it to your repertoire." }), families.map((fam) => {
                const items = list.filter((o) => o.family === fam);
                if (!items.length)
                    return null;
                return (_jsxs("section", { className: "section", children: [_jsx("div", { className: "section-head", children: _jsx("h2", { children: fam === 'Flank' ? 'Flank openings' : `${fam} openings` }) }), _jsx("div", { className: "opening-grid", children: items.map((o) => {
                                const learned = o.lines.filter((l) => cards[`line:${o.id}:${l.id}:w`] || cards[`line:${o.id}:${l.id}:b`]).length;
                                return (_jsxs("button", { className: "opening-card", onClick: () => navigate(`/openings/${o.id}`), children: [_jsx(OpeningThumb, { root: o.root, side: o.side }), _jsxs("span", { className: "opening-card-body", children: [_jsxs("span", { className: "opening-card-meta", children: [_jsx("span", { className: `pill-color pill-${o.side}` }), o.side === 'w' ? 'White' : 'Black', " \u00B7 ", o.eco, " \u00B7 ", o.level] }), _jsx("span", { className: "opening-card-name", children: o.name }), _jsx("span", { className: "opening-card-tag", children: o.tagline }), _jsxs("span", { className: "opening-card-progress", children: [_jsx("span", { className: "meter", children: _jsx("span", { className: "meter-fill", style: { width: `${(learned / o.lines.length) * 100}%` } }) }), _jsxs("span", { className: "num", children: [learned, "/", o.lines.length, " lines"] }), repertoire[o.id] && _jsx("span", { className: "chip chip-on", children: "Repertoire" })] })] })] }, o.id));
                            }) })] }, fam));
            })] }));
}
function OpeningThumb({ root, side }) {
    const fen = useMemo(() => {
        const c = new Chess();
        for (const m of parseMovetext(root).sans)
            c.move(m.san);
        return c.fen();
    }, [root]);
    return _jsx(MiniBoard, { fen: fen, orientation: side, className: "opening-thumb" });
}
