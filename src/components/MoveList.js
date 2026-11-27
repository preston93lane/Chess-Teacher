import { jsxs as _jsxs, jsx as _jsx } from "react/jsx-runtime";
import { useEffect, useRef } from 'react';
import { CLASS_INFO } from '../lib/coach/explain';
/** Book-style inline notation. `current` = number of plies played (0 = start). */
export function MoveList({ moves, current, onSelect, startMoveNumber = 1, startColor = 'w', compact, }) {
    const ref = useRef(null);
    useEffect(() => {
        const el = ref.current?.querySelector('.mv.is-current');
        if (el && ref.current) {
            const box = ref.current;
            const top = el.offsetTop - box.offsetTop;
            if (top < box.scrollTop || top > box.scrollTop + box.clientHeight - 30)
                box.scrollTop = top - 40;
            const left = el.offsetLeft - box.offsetLeft;
            if (compact)
                box.scrollLeft = left - box.clientWidth / 2;
        }
    }, [current, compact]);
    const items = [];
    let num = startMoveNumber;
    let color = startColor;
    moves.forEach((m, i) => {
        if (color === 'w')
            items.push(_jsxs("span", { className: "mv-num", children: [num, "."] }, `n${i}`));
        else if (i === 0)
            items.push(_jsxs("span", { className: "mv-num", children: [num, "\u2026"] }, `n${i}`));
        const info = m.cls ? CLASS_INFO[m.cls] : null;
        const showGlyph = m.cls && !['best', 'excellent', 'good', 'book'].includes(m.cls);
        items.push(_jsxs("button", { className: `mv${i + 1 === current ? ' is-current' : ''}${info ? ` tone-text-${info.tone}` : ''}`, onClick: () => onSelect(i + 1), children: [m.san, showGlyph && info && _jsx("sup", { className: "mv-glyph", children: info.glyph })] }, i));
        if (color === 'b')
            num++;
        color = color === 'w' ? 'b' : 'w';
    });
    return (_jsx("div", { className: `movelist${compact ? ' movelist-compact' : ''}`, ref: ref, children: moves.length ? items : _jsx("span", { className: "movelist-empty", children: "No moves yet" }) }));
}
