import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * Small SVG/HTML chart primitives for the Insights dashboard. One accent hue
 * for magnitude; move-quality tones only where the data *is* move quality.
 */
import { useEffect, useRef, useState } from 'react';
export function StatTile({ label, value, delta, deltaGood, sub }) {
    return (_jsxs("div", { className: "stat-tile", children: [_jsx("span", { className: "stat-tile-label", children: label }), _jsx("span", { className: "stat-tile-value", children: value }), delta && _jsx("span", { className: `stat-tile-delta${deltaGood === undefined ? '' : deltaGood ? ' is-good' : ' is-bad'}`, children: delta }), sub && _jsx("span", { className: "stat-tile-sub", children: sub })] }));
}
/** Single-series line with area wash, end label, crosshair and tooltip. */
export function TrendChart({ data, min = 0, max = 100, unit = '%', ticks = [50, 75, 100], height = 180, onSelect }) {
    const wrap = useRef(null);
    const [W, setW] = useState(640);
    useEffect(() => {
        const el = wrap.current;
        if (!el)
            return;
        const ro = new ResizeObserver(() => setW(Math.max(240, Math.round(el.clientWidth))));
        ro.observe(el);
        return () => ro.disconnect();
    }, []);
    const H = height;
    const padL = 34;
    const padR = 44;
    const padT = 12;
    const padB = 22;
    const [hover, setHover] = useState(null);
    const ref = useRef(null);
    if (!data.length)
        return null;
    const x = (i) => padL + (data.length === 1 ? (W - padL - padR) / 2 : (i / (data.length - 1)) * (W - padL - padR));
    const y = (v) => padT + (1 - (Math.max(min, Math.min(max, v)) - min) / (max - min)) * (H - padT - padB);
    const path = data.map((d, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(d.value).toFixed(1)}`).join(' ');
    const area = `${path} L${x(data.length - 1).toFixed(1)},${y(min)} L${x(0).toFixed(1)},${y(min)} Z`;
    const lastI = data.length - 1;
    const pick = (clientX) => {
        const r = ref.current?.getBoundingClientRect();
        if (!r)
            return;
        const px = ((clientX - r.left) / r.width) * W;
        let best = 0;
        for (let i = 1; i < data.length; i++)
            if (Math.abs(x(i) - px) < Math.abs(x(best) - px))
                best = i;
        setHover(best);
    };
    const h = hover !== null ? data[hover] : null;
    return (_jsxs("div", { className: "chart", ref: wrap, children: [_jsxs("svg", { ref: ref, viewBox: `0 0 ${W} ${H}`, className: "chart-svg", role: "img", "aria-label": `Trend of ${data.length} values, latest ${Math.round(data[lastI].value)}${unit}`, onPointerMove: (e) => pick(e.clientX), onPointerDown: (e) => pick(e.clientX), onPointerLeave: () => setHover(null), onClick: () => hover !== null && onSelect?.(hover), children: [ticks.map((t) => (_jsxs("g", { children: [_jsx("line", { x1: padL, x2: W - padR, y1: y(t), y2: y(t), className: "chart-grid" }), _jsx("text", { x: padL - 6, y: y(t), className: "chart-tick", textAnchor: "end", dominantBaseline: "middle", children: t })] }, t))), _jsx("path", { d: area, className: "chart-area" }), _jsx("path", { d: path, className: "chart-line" }), hover !== null && _jsx("line", { x1: x(hover), x2: x(hover), y1: padT, y2: H - padB, className: "chart-crosshair" }), _jsx("circle", { cx: x(lastI), cy: y(data[lastI].value), r: 5, className: "chart-dot" }), _jsxs("text", { x: x(lastI) + 9, y: y(data[lastI].value), className: "chart-end-label", dominantBaseline: "middle", children: [Math.round(data[lastI].value), unit] }), hover !== null && _jsx("circle", { cx: x(hover), cy: y(data[hover].value), r: 5, className: "chart-dot" }), _jsx("text", { x: padL, y: H - 4, className: "chart-tick", children: data[0].label }), data.length > 1 && _jsx("text", { x: W - padR, y: H - 4, className: "chart-tick", textAnchor: "end", children: data[lastI].label })] }), h && (_jsxs("div", { className: "chart-tip", style: { left: `${(x(hover) / W) * 100}%` }, children: [_jsxs("strong", { className: "num", children: [Math.round(h.value), unit] }), _jsx("span", { children: h.label }), h.detail && _jsx("span", { className: "muted", children: h.detail })] }))] }));
}
/** A list of named ratios: name, bar against a limit, figure. */
export function MeterList({ rows, max = 100, format = (v) => `${Math.round(v)}%` }) {
    return (_jsx("div", { className: "meter-list", children: rows.map((r, i) => (_jsxs("div", { className: "meter-row", title: r.note, children: [_jsx("span", { className: "meter-row-label", children: r.label }), _jsx("span", { className: "meter-row-track", children: r.value !== undefined && _jsx("span", { className: "meter-row-fill", style: { width: `${r.value > 0 ? Math.max(1.5, (r.value / max) * 100) : 0}%`, ...(r.tone ? { background: `var(--t-${r.tone})` } : {}) } }) }), _jsx("span", { className: "meter-row-value num", children: r.value !== undefined ? format(r.value) : '—' })] }, i))) }));
}
/** GitHub-style calendar of daily activity (one hue, light → dark). */
export function Heatmap({ days }) {
    const [tip, setTip] = useState(null);
    const max = Math.max(1, ...days.map((d) => d.count));
    const level = (c) => (c === 0 ? 0 : Math.min(4, 1 + Math.floor((c / max) * 3.999)));
    const weeks = [];
    days.forEach((d, i) => {
        if (i % 7 === 0)
            weeks.push([]);
        weeks[weeks.length - 1].push(d);
    });
    const fmt = (s) => new Date(s + 'T12:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    return (_jsxs("div", { className: "heatmap-wrap", children: [_jsx("div", { className: "heatmap", role: "img", "aria-label": `Activity over the last ${weeks.length} weeks: ${days.filter((d) => d.count).length} active days`, children: weeks.map((w, wi) => (_jsx("div", { className: "heat-week", children: w.map((d, di) => (_jsx("span", { className: `heat-cell heat-${level(d.count)}`, onPointerEnter: () => setTip({ ...d, i: wi * 7 + di }), onPointerDown: () => setTip({ ...d, i: wi * 7 + di }), onPointerLeave: () => setTip(null) }, d.date))) }, wi))) }), _jsxs("div", { className: "heatmap-foot", children: [_jsx("span", { className: "muted small", children: tip ? `${fmt(tip.date)}: ${tip.count ? `${tip.count} training item${tip.count === 1 ? '' : 's'}` : 'no training'}` : `${fmt(days[0].date)} – today` }), _jsxs("span", { className: "heat-legend small muted", children: ["Less ", [0, 1, 2, 3, 4].map((l) => _jsx("span", { className: `heat-cell heat-${l}` }, l)), " More"] })] })] }));
}
