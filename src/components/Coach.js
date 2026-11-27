import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from 'react';
import { Lightbulb, Target, Shield, Eye, Sparkles, BookOpen, ScanSearch } from 'lucide-react';
import { InsightsPanel } from './Insights';
import { engine, CancelledError } from '../lib/engine/stockfish';
import { CLASS_INFO, candidateSummary, describeThreat, nullMoveFen, positionReport, } from '../lib/coach/explain';
import { describeScore, formatScore, lineScore } from '../lib/coach/eval';
import { hangingPieces } from '../lib/coach/tactics';
import { parseBoard } from '../lib/coach/board';
import { PIECE_NAME, applyUci, sideToMove } from '../lib/chess/core';
import { navigate } from '../lib/router';
import { Glyph, Spinner } from './ui';
/** The verdict card: big annotation glyph + coach explanation. */
export function VerdictCard({ review, onShowBetter, showingBetter, label, showEval = true, onBreakdown, }) {
    const info = CLASS_INFO[review.cls];
    return (_jsxs("article", { className: `verdict tone-${info.tone}`, "aria-live": "polite", children: [_jsx("div", { className: "verdict-glyph", "aria-hidden": true, children: info.glyph }), _jsxs("div", { className: "verdict-body", children: [_jsxs("p", { className: "verdict-kicker", children: [_jsx("span", { className: `tone-text-${info.tone}`, children: info.label }), _jsx("span", { className: "verdict-move", children: label ?? review.san }), showEval && review.evalAfter && _jsx("span", { className: "verdict-eval", children: formatScore(review.evalAfter) })] }), _jsx("h3", { className: "verdict-headline", children: review.headline }), review.notes
                        .filter((n) => showEval || !n.startsWith('Evaluation '))
                        .map((n, i) => (_jsx("p", { className: "verdict-note", children: n }, i))), review.better && (_jsxs("div", { className: "verdict-better", children: [_jsx("p", { children: review.better }), review.betterLine && _jsx("p", { className: "verdict-line", children: review.betterLine }), onShowBetter && (_jsx("button", { className: "link-btn", onClick: onShowBetter, children: showingBetter ? 'Hide on board' : 'Show on board' }))] })), onBreakdown && (_jsxs("button", { className: "btn btn-secondary btn-sm verdict-breakdown", onClick: onBreakdown, children: [_jsx(ScanSearch, { size: 16 }), _jsx("span", { children: "Break it down" })] }))] })] }));
}
export function EngineLines({ fen, result, onPlay }) {
    if (!result || !result.lines.length)
        return _jsx("div", { className: "engine-lines is-empty", children: _jsx(Spinner, { label: "Engine thinking\u2026" }) });
    return (_jsxs("div", { className: "engine-lines", children: [_jsxs("div", { className: "engine-meta", children: ["Stockfish 18 \u00B7 depth ", result.depth] }), result.lines.map((l) => {
                const c = candidateSummary(fen, l);
                return (_jsxs("button", { className: "engine-line", onClick: () => onPlay?.(l.pv[0]), children: [_jsx("span", { className: "engine-score", children: formatScore(lineScore(l)) }), _jsx("span", { className: "engine-pv", children: c.line })] }, l.multipv));
            })] }));
}
/** "What's going on?" — structure, plans and advice for a side. */
export function PositionReportView({ fen, forColor, compact }) {
    const report = useMemo(() => positionReport(fen, forColor), [fen, forColor]);
    return (_jsxs("div", { className: "report", children: [_jsxs("p", { className: "report-line", children: [_jsxs("strong", { children: [report.phase, "."] }), " ", report.material] }), report.structure && (_jsxs("div", { className: "report-structure", children: [_jsx("h4", { children: report.structure.name }), _jsx("p", { children: report.structure.summary }), report.structure.plans.length > 0 && (_jsx("ul", { className: "report-plans", children: report.structure.plans.slice(0, compact ? 2 : 4).map((p) => (_jsx("li", { children: p }, p))) })), report.structure.lessonId && (_jsxs("button", { className: "link-btn", onClick: () => navigate(`/train/lesson/${report.structure.lessonId}`), children: [_jsx(BookOpen, { size: 14 }), " Study this structure"] }))] })), report.advice.length > 0 && (_jsx("ul", { className: "report-advice", children: report.advice.slice(0, compact ? 3 : 5).map((a) => (_jsx("li", { children: a.text }, a.text))) }))] }));
}
export function reportMarks(fen, forColor) {
    const r = positionReport(fen, forColor);
    const sq = new Set();
    for (const a of r.advice.slice(0, 2))
        for (const s of a.squares ?? [])
            if (s.length === 2)
                sq.add(s);
    return [...sq].slice(0, 8).map((s) => ({ sq: s, color: 'plan' }));
}
/** Tiered hints: threats → plan → candidate pieces → best move. */
export function HintPanel({ fen, analysis, onArrows, onMarks, onUsed, }) {
    const [level, setLevel] = useState(0);
    const [threat, setThreat] = useState(undefined);
    const me = sideToMove(fen);
    useEffect(() => {
        setLevel(0);
        setThreat(undefined);
        onArrows([]);
        onMarks([]);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [fen]);
    const requestThreat = async () => {
        const flipped = nullMoveFen(fen);
        const loose = hangingPieces(parseBoard(fen), me);
        if (!flipped) {
            setThreat('You are in check — deal with it first.');
            return;
        }
        try {
            const res = await engine.analyze(flipped, { depth: 11, multipv: 1 });
            const line = res.lines[0];
            let text = line ? describeThreat(fen, line, analysis?.lines[0] ? lineScore(analysis.lines[0]) : undefined) : null;
            if (!text && loose.length)
                text = `Your ${PIECE_NAME[loose[0].piece.type]} on ${loose[0].square} is loose.`;
            setThreat(text ?? 'No immediate threat. You have time for a plan.');
            if (line && text && !text.startsWith('No')) {
                const mv = applyUci(flipped, line.pv[0]);
                if (mv)
                    onArrows([{ from: mv.move.from, to: mv.move.to, color: 'r' }]);
            }
        }
        catch (e) {
            if (!(e instanceof CancelledError))
                setThreat('Could not analyse threats.');
        }
    };
    const next = async () => {
        const n = Math.min(4, level + 1);
        setLevel(n);
        onUsed?.(n);
        if (n === 1) {
            onMarks([]);
            await requestThreat();
        }
        else if (n === 2) {
            onArrows([]);
            onMarks(reportMarks(fen, me));
        }
        else if (n === 3) {
            onMarks((analysis?.lines ?? []).slice(0, 3).map((l) => ({ sq: l.pv[0].slice(0, 2), color: 'focus' })));
            onArrows([]);
        }
        else if (n === 4) {
            const best = analysis?.lines[0];
            if (best)
                onArrows([{ from: best.pv[0].slice(0, 2), to: best.pv[0].slice(2, 4), color: 'y' }]);
            onMarks([]);
        }
    };
    const labels = ['Get a hint', 'What matters here?', 'Which pieces?', 'Show the best move', 'All hints shown'];
    const icons = [Lightbulb, Shield, Target, Eye, Sparkles];
    const Icon = icons[level];
    const lines = analysis?.lines ?? [];
    return (_jsxs("div", { className: "hints", children: [level >= 1 && (_jsxs("div", { className: "hint-step", children: [_jsx("span", { className: "hint-tag", children: "Threat check" }), _jsx("p", { children: threat === undefined ? _jsx(Spinner, { label: "Looking at their ideas\u2026" }) : threat })] })), level >= 2 && (_jsxs("div", { className: "hint-step", children: [_jsx("span", { className: "hint-tag", children: "What matters" }), _jsx(InsightsPanel, { fen: fen, forColor: me, title: null, max: 4 })] })), level >= 3 && (_jsxs("div", { className: "hint-step", children: [_jsx("span", { className: "hint-tag", children: "Candidates" }), _jsx("p", { children: lines.length
                            ? `Look at the highlighted piece${lines.length > 1 ? 's' : ''}: ${[...new Set(lines.slice(0, 3).map((l) => l.pv[0].slice(0, 2)))].join(', ')}.`
                            : 'Engine still thinking…' })] })), level >= 4 && lines[0] && (_jsxs("div", { className: "hint-step", children: [_jsx("span", { className: "hint-tag", children: "Best" }), _jsxs("p", { children: [candidateSummary(fen, lines[0]).san, " \u2014 ", candidateSummary(fen, lines[0]).text || describeScore(lineScore(lines[0]))] })] })), level < 4 && (_jsxs("button", { className: "btn btn-secondary btn-sm hint-next", onClick: next, children: [_jsx(Icon, { size: 16 }), _jsx("span", { children: labels[level] })] }))] }));
}
export { Glyph };
