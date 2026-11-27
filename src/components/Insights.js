import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Compass, Sparkles } from 'lucide-react';
import { engine, CancelledError } from '../lib/engine/stockfish';
import { engineInsights, mergeInsights, staticInsights } from '../lib/coach/insights';
import { nullMoveFen } from '../lib/coach/explain';
import { Spinner } from './ui';
const KIND_META = {
    danger: { label: 'Watch out', icon: AlertTriangle },
    opportunity: { label: 'Opportunity', icon: Sparkles },
    plan: { label: 'Plan', icon: Compass },
};
/**
 * "What matters here" — themes for one side, never the move itself.
 * With `deep`, the engine adds threats, hidden tactics and critical moments.
 */
export function InsightsPanel({ fen, forColor, deep = false, lines, max = 6, onMarks, title = 'What matters here', intro, }) {
    const base = useMemo(() => staticInsights(fen, forColor), [fen, forColor]);
    const [extra, setExtra] = useState(deep ? null : []);
    const [active, setActive] = useState(null);
    useEffect(() => {
        setActive(null);
        onMarks?.([]);
        if (!deep) {
            setExtra([]);
            return;
        }
        let alive = true;
        setExtra(null);
        (async () => {
            try {
                const myTurn = fen.split(' ')[1] === forColor;
                const ml = lines && lines.length >= 2 ? lines : myTurn ? (await engine.analyze(fen, { depth: 14, multipv: 2 })).lines : [];
                const flipped = myTurn ? nullMoveFen(fen) : null;
                const threat = flipped ? (await engine.analyze(flipped, { depth: 12 })).lines[0] : undefined;
                if (alive)
                    setExtra(engineInsights(fen, forColor, ml, threat));
            }
            catch (e) {
                if (alive && !(e instanceof CancelledError))
                    setExtra([]);
            }
        })();
        return () => {
            alive = false;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [fen, forColor, deep]);
    const items = mergeInsights(base, extra ?? [], max);
    const toggle = (i) => {
        if (!onMarks || !i.squares.length)
            return;
        if (active === i.id) {
            setActive(null);
            onMarks([]);
        }
        else {
            setActive(i.id);
            onMarks(i.squares.map((sq) => ({ sq, color: i.kind === 'danger' ? 'threat' : i.kind === 'opportunity' ? 'focus' : 'plan' })));
        }
    };
    return (_jsxs("div", { className: "insights", children: [title && _jsx("h4", { className: "insights-title", children: title }), intro && _jsx("p", { className: "muted small", children: intro }), items.length === 0 && extra !== null && _jsx("p", { className: "muted small", children: "Nothing urgent. Improve your least active piece and keep your pieces protected." }), _jsx("ul", { className: "insight-list", children: items.map((i) => {
                    const meta = KIND_META[i.kind];
                    const Icon = meta.icon;
                    const clickable = !!onMarks && i.squares.length > 0;
                    return (_jsx("li", { children: _jsxs("button", { className: `insight insight-${i.kind}${active === i.id ? ' is-on' : ''}${clickable ? '' : ' is-static'}`, onClick: () => toggle(i), "aria-pressed": clickable ? active === i.id : undefined, children: [_jsx("span", { className: "insight-icon", "aria-hidden": true, children: _jsx(Icon, { size: 16 }) }), _jsxs("span", { className: "insight-body", children: [_jsxs("span", { className: "insight-theme", children: [i.theme, _jsx("span", { className: "insight-kind", children: meta.label })] }), _jsx("span", { className: "insight-text", children: i.text }), clickable && _jsx("span", { className: "insight-show", children: active === i.id ? 'Hide on board' : 'Show on board' })] })] }) }, i.id));
                }) }), deep && extra === null && _jsx(Spinner, { label: "Coach is checking threats and tactics\u2026" })] }));
}
