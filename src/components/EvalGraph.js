import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMemo } from 'react';
import { winPctWhite } from '../lib/coach/eval';
import { CLASS_INFO } from '../lib/coach/explain';
/** Win-probability graph across a game. Index 0 = start position. */
export function EvalGraph({ evals, moves, current, onSelect, }) {
    const W = 600;
    const H = 96;
    const n = Math.max(1, evals.length - 1);
    const pts = useMemo(() => evals.map((e, i) => [(i / n) * W, H - (winPctWhite(e) / 100) * H]), [evals, n]);
    const path = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
    const area = `${path} L${W},${H} L0,${H} Z`;
    const cx = (current / n) * W;
    const handle = (e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const ratio = (e.clientX - rect.left) / rect.width;
        onSelect(Math.max(0, Math.min(n, Math.round(ratio * n))));
    };
    return (_jsxs("svg", { className: "evalgraph", viewBox: `0 0 ${W} ${H}`, preserveAspectRatio: "none", onPointerDown: handle, onPointerMove: (e) => e.buttons && handle(e), role: "img", "aria-label": "Evaluation graph", children: [_jsx("rect", { x: "0", y: "0", width: W, height: H, className: "evalgraph-bg" }), _jsx("path", { d: area, className: "evalgraph-area" }), _jsx("line", { x1: "0", x2: W, y1: H / 2, y2: H / 2, className: "evalgraph-mid" }), moves?.map((m) => {
                if (!['blunder', 'mistake', 'miss', 'brilliant', 'great'].includes(m.cls))
                    return null;
                const [x, y] = pts[m.ply + 1] ?? [0, 0];
                return _jsx("circle", { cx: x, cy: y, r: 4.5, className: `evalgraph-dot tone-fill-${CLASS_INFO[m.cls].tone}`, vectorEffect: "non-scaling-stroke" }, m.ply);
            }), _jsx("line", { x1: cx, x2: cx, y1: 0, y2: H, className: "evalgraph-cursor", vectorEffect: "non-scaling-stroke" })] }));
}
