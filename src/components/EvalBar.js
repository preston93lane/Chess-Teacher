import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { formatScore, winPctWhite } from '../lib/coach/eval';
export function EvalBar({ score, orientation = 'w', pending }) {
    const white = score ? winPctWhite(score) : 50;
    const label = score ? formatScore(score) : '';
    const whiteOnBottom = orientation === 'w';
    const leaderWhite = white >= 50;
    return (_jsxs("div", { className: `evalbar${pending ? ' is-pending' : ''}`, "aria-label": `Evaluation ${label}`, children: [_jsx("div", { className: "evalbar-white", style: { height: `${white}%`, [whiteOnBottom ? 'bottom' : 'top']: 0 } }), label && (_jsx("span", { className: `evalbar-label ${leaderWhite ? 'on-white' : 'on-black'}`, style: { [leaderWhite === whiteOnBottom ? 'bottom' : 'top']: 4 }, children: label.replace('+', '') }))] }));
}
