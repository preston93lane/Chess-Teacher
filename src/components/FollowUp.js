import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Lightbulb, Pause, Play } from 'lucide-react';
import { explainMove } from '../lib/coach/followup';
import { Board } from './Board';
import { IconButton, Spinner } from './ui';
/**
 * "Why it works": steps through the follow-up after a key move with a coach
 * note on each move, then explains why the tempting alternatives are worse.
 */
export function FollowUpPanel({ fen, uci, line, tried, title, }) {
    const [data, setData] = useState(null);
    const [error, setError] = useState(false);
    const [view, setView] = useState(null);
    const [step, setStep] = useState(1);
    const [auto, setAuto] = useState(false);
    useEffect(() => {
        let alive = true;
        setData(null);
        setError(false);
        explainMove(fen, uci, { line, tried })
            .then((d) => {
            if (!alive)
                return;
            setData(d);
            setView({ label: d.san, plies: d.plies });
            setStep(1);
        })
            .catch(() => alive && setError(true));
        return () => {
            alive = false;
        };
    }, [fen, uci, line?.join(' '), tried?.join(' ')]); // eslint-disable-line react-hooks/exhaustive-deps
    const plies = view?.plies ?? [];
    useEffect(() => {
        if (!auto)
            return;
        if (step >= plies.length) {
            setAuto(false);
            return;
        }
        const id = setTimeout(() => setStep((s) => s + 1), 1100);
        return () => clearTimeout(id);
    }, [auto, step, plies.length]);
    if (error)
        return null;
    if (!data || !view) {
        return (_jsx("div", { className: "panel followup", children: _jsx(Spinner, { label: "Working out the follow-up\u2026" }) }));
    }
    const cur = plies[Math.max(0, step - 1)];
    const boardFen = step === 0 ? fen : cur?.fenAfter ?? fen;
    const show = (label, p) => {
        setView({ label, plies: p });
        setStep(1);
        setAuto(false);
    };
    const isMain = view.label === data.san;
    return (_jsxs("div", { className: "panel followup stack", children: [_jsxs("h3", { className: "followup-title", children: [_jsx(Lightbulb, { size: 18, className: "inline-icon" }), " ", title ?? `Why ${data.san} works`] }), _jsxs("p", { children: [_jsx("strong", { children: data.verdict }), data.score && _jsxs("span", { className: "faint small num", children: [" \u00B7 engine ", data.score] })] }), data.threat && _jsx("p", { className: "muted", children: data.threat.replace(/ is threatened — it /, ' is the threat — it ') }), _jsxs("div", { className: "followup-body", children: [_jsxs("div", { className: "followup-board", children: [_jsx(Board, { fen: boardFen, orientation: data.mover, lastMove: step > 0 && cur ? [cur.from, cur.to] : null }), _jsxs("div", { className: "controls", children: [_jsxs("div", { className: "controls-group", children: [_jsx(IconButton, { label: "Back", onClick: () => setStep(Math.max(0, step - 1)), disabled: step === 0, children: _jsx(ChevronLeft, {}) }), _jsx(IconButton, { label: auto ? 'Pause' : 'Play the line', onClick: () => { if (step >= plies.length)
                                                    setStep(0); setAuto(!auto); }, children: auto ? _jsx(Pause, {}) : _jsx(Play, {}) }), _jsx(IconButton, { label: "Forward", onClick: () => setStep(Math.min(plies.length, step + 1)), disabled: step >= plies.length, children: _jsx(ChevronRight, {}) })] }), _jsxs("span", { className: "muted small num", children: [step, "/", plies.length] })] })] }), _jsxs("div", { className: "followup-text", children: [!isMain && _jsx("p", { className: "muted small", children: view.label === data.bait?.san ? _jsxs(_Fragment, { children: ["After ", _jsx("strong", { children: data.san }), ", if they reply ", _jsx("strong", { children: view.label }), ":"] }) : _jsxs(_Fragment, { children: ["The line after ", _jsx("strong", { children: view.label }), " instead:"] }) }), _jsx("p", { className: "followup-line num", children: plies.map((p, i) => {
                                    const num = i === 0 || p.color === 'w' ? (p.color === 'w' ? `${moveNo(p.fenBefore)}.` : `${moveNo(p.fenBefore)}…`) : '';
                                    return (_jsxs("button", { className: `followup-move${i + 1 === step ? ' is-on' : ''}`, onClick: () => { setStep(i + 1); setAuto(false); }, children: [num, p.san] }, i));
                                }) }), cur && step > 0 && _jsx("p", { className: "followup-note", children: cur.note || '—' }), !isMain && _jsxs("button", { className: "link-btn small", onClick: () => show(data.san, data.plies), children: ["Back to ", data.san] })] })] }), data.bait && (_jsxs("button", { className: `followup-alt followup-bait${view.label === data.bait.san ? ' is-on' : ''}`, onClick: () => show(data.bait.san, data.bait.plies), children: [_jsxs("strong", { children: ["If they take the bait: ", data.bait.san, "?"] }), _jsx("span", { className: "muted small", children: data.bait.verdict })] })), data.alternatives.length > 0 && (_jsxs("div", { className: "followup-alts", children: [_jsx("h4", { children: "Why not\u2026" }), data.alternatives.map((a) => (_jsxs("button", { className: `followup-alt${view.label === a.san ? ' is-on' : ''}`, onClick: () => show(a.san, a.plies), children: [_jsxs("strong", { className: "num", children: [a.san, a.tried ? _jsx("span", { className: "faint small", children: " (your try)" }) : null] }), _jsx("span", { className: "muted small", children: a.verdict })] }, a.uci)))] }))] }));
}
function moveNo(fen) {
    return fen.split(' ')[5] ?? '1';
}
