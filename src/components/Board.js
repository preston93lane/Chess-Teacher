import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Chess } from '../lib/chess/core';
import { useApp } from '../lib/store/app';
import { CLASS_INFO } from '../lib/coach/explain';
import { pieceUrl } from '../lib/pieces';
/** URL of a piece image ('wK', 'bN', …) in the chosen piece set. */
export function usePieceUrl() {
    const set = useApp((s) => s.settings.pieceSet);
    return (key) => pieceUrl(set, key);
}
const FILES = 'abcdefgh';
const sqIndex = (s) => s.charCodeAt(0) - 97 + (parseInt(s[1], 10) - 1) * 8;
const sqName = (i) => (FILES[i % 8] + (Math.floor(i / 8) + 1));
function parsePlacement(fen) {
    const rows = fen.split(' ')[0].split('/');
    const out = [];
    rows.forEach((row, r) => {
        let f = 0;
        for (const ch of row) {
            if (/\d/.test(ch))
                f += +ch;
            else {
                const color = ch === ch.toUpperCase() ? 'w' : 'b';
                out.push({ key: color + ch.toUpperCase(), sq: (7 - r) * 8 + f });
                f++;
            }
        }
    });
    return out;
}
let nextPieceId = 1;
function matchPieces(prev, next) {
    const result = [];
    const unmatchedPrev = [...prev];
    const unmatchedNext = [];
    for (const n of next) {
        const i = unmatchedPrev.findIndex((p) => p.key === n.key && p.sq === n.sq);
        if (i >= 0) {
            result.push(unmatchedPrev[i]);
            unmatchedPrev.splice(i, 1);
        }
        else
            unmatchedNext.push(n);
    }
    for (const n of unmatchedNext) {
        let best = -1;
        let bestDist = Infinity;
        unmatchedPrev.forEach((p, i) => {
            if (p.key !== n.key)
                return;
            const d = Math.abs((p.sq % 8) - (n.sq % 8)) + Math.abs(Math.floor(p.sq / 8) - Math.floor(n.sq / 8));
            if (d < bestDist) {
                bestDist = d;
                best = i;
            }
        });
        if (best >= 0) {
            result.push({ ...unmatchedPrev[best], sq: n.sq });
            unmatchedPrev.splice(best, 1);
        }
        else
            result.push({ id: nextPieceId++, key: n.key, sq: n.sq });
    }
    return result;
}
function BoardImpl({ fen, orientation = 'w', movable = null, onMove, lastMove, arrows = [], marks = [], badge, disabled, hintSquares, premoveColor = null, onPremove, premove = null, onCancelPremove, legalMoves, fog, pieceOpacity = 1, showDests = true, rotateColor = null, noCheck, }) {
    const pieceSrc = usePieceUrl();
    const settings = useApp((s) => s.settings);
    const ref = useRef(null);
    const piecesRef = useRef([]);
    const [selected, setSelected] = useState(null);
    const [drag, setDrag] = useState(null);
    const [promo, setPromo] = useState(null);
    const dragStart = useRef(null);
    const pieces = useMemo(() => {
        const next = matchPieces(piecesRef.current, parsePlacement(fen));
        piecesRef.current = next;
        return next;
    }, [fen]);
    const chess = useMemo(() => {
        try {
            return new Chess(fen);
        }
        catch {
            return null;
        }
    }, [fen]);
    const turn = (fen.split(' ')[1] ?? 'w');
    const canMoveColor = (c) => !disabled && (movable === 'both' || movable === c) && c === turn;
    const canPremoveColor = (c) => !disabled && !!onPremove && premoveColor === c && c !== turn;
    const fogSet = useMemo(() => new Set((fog ?? []).map(sqIndex)), [fog]);
    /** Moves available to the piece on `from`: legal moves, or (premove) moves as if it were our turn. */
    const movesFrom = useCallback((from) => {
        const p = piecesRef.current.find((x) => x.sq === from);
        if (!p)
            return [];
        const color = p.key[0];
        if (color !== turn) {
            // Premove: pretend it is our move in the current position.
            try {
                const parts = fen.split(' ');
                parts[1] = color;
                parts[3] = '-';
                const c = new Chess(parts.join(' '));
                return c.moves({ square: sqName(from), verbose: true }).map((m) => ({ to: m.to, promotion: m.promotion, captured: !!m.captured, color }));
            }
            catch {
                return [];
            }
        }
        if (legalMoves) {
            return legalMoves
                .filter((m) => m.from === sqName(from))
                .map((m) => ({ to: m.to, promotion: m.promotion, captured: !!pieceAtIndex(sqIndex(m.to)), color }));
        }
        if (!chess)
            return [];
        return chess.moves({ square: sqName(from), verbose: true }).map((m) => ({ to: m.to, promotion: m.promotion, captured: !!m.captured, color }));
    }, 
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [fen, chess, legalMoves, turn]);
    const pieceAtIndex = (i) => piecesRef.current.some((x) => x.sq === i && !fogSet.has(i));
    useEffect(() => {
        setSelected(null);
        setPromo(null);
    }, [fen]);
    const dests = useMemo(() => {
        const m = new Map();
        if (selected === null)
            return m;
        for (const mv of movesFrom(selected))
            m.set(sqIndex(mv.to), !!mv.captured);
        return m;
    }, [selected, movesFrom]);
    const checkSq = useMemo(() => {
        if (noCheck || !chess || !chess.inCheck())
            return null;
        const k = pieces.find((p) => p.key === turn + 'K');
        return k ? k.sq : null;
    }, [chess, pieces, turn, noCheck]);
    const toXY = (sq) => {
        const f = sq % 8;
        const r = Math.floor(sq / 8);
        return orientation === 'w' ? { x: f, y: 7 - r } : { x: 7 - f, y: r };
    };
    const pointToSq = (clientX, clientY) => {
        const el = ref.current;
        if (!el)
            return null;
        const rect = el.getBoundingClientRect();
        const x = Math.floor(((clientX - rect.left) / rect.width) * 8);
        const y = Math.floor(((clientY - rect.top) / rect.height) * 8);
        if (x < 0 || x > 7 || y < 0 || y > 7)
            return null;
        const f = orientation === 'w' ? x : 7 - x;
        const r = orientation === 'w' ? 7 - y : y;
        return r * 8 + f;
    };
    const pieceAt = (sq) => pieces.find((p) => p.sq === sq);
    const attemptMove = useCallback((from, to) => {
        const moves = movesFrom(from).filter((m) => m.to === sqName(to));
        if (!moves.length)
            return false;
        const isPremove = moves[0].color !== turn;
        const send = isPremove ? onPremove : onMove;
        if (!send)
            return false;
        if (moves.some((m) => m.promotion)) {
            if (settings.autoQueen || isPremove)
                send({ from: sqName(from), to: sqName(to), promotion: 'q' });
            else
                setPromo({ from, to, color: moves[0].color });
        }
        else
            send({ from: sqName(from), to: sqName(to) });
        setSelected(null);
        return true;
    }, [movesFrom, onMove, onPremove, settings.autoQueen, turn]);
    const onPointerDown = (e) => {
        if (promo)
            return;
        const sq = pointToSq(e.clientX, e.clientY);
        if (sq === null)
            return;
        const p = pieceAt(sq);
        if (selected !== null && dests.has(sq)) {
            attemptMove(selected, sq);
            return;
        }
        if (premove && onCancelPremove && !(p && canPremoveColor(p.key[0]))) {
            onCancelPremove();
            setSelected(null);
            return;
        }
        if (p && !fogSet.has(sq) && (canMoveColor(p.key[0]) || canPremoveColor(p.key[0]))) {
            const wasSelected = selected === sq;
            setSelected(sq);
            dragStart.current = { x: e.clientX, y: e.clientY, sq, wasSelected };
            e.currentTarget.setPointerCapture(e.pointerId);
            const rect = ref.current.getBoundingClientRect();
            setDrag({ sq, x: e.clientX - rect.left, y: e.clientY - rect.top, active: false });
        }
        else
            setSelected(null);
    };
    const onPointerMove = (e) => {
        if (!dragStart.current || !drag)
            return;
        const dx = e.clientX - dragStart.current.x;
        const dy = e.clientY - dragStart.current.y;
        const rect = ref.current.getBoundingClientRect();
        const active = drag.active || Math.hypot(dx, dy) > 5;
        setDrag({ sq: drag.sq, x: e.clientX - rect.left, y: e.clientY - rect.top, active });
    };
    const onPointerUp = (e) => {
        const start = dragStart.current;
        dragStart.current = null;
        if (!start) {
            setDrag(null);
            return;
        }
        if (drag?.active) {
            const target = pointToSq(e.clientX, e.clientY);
            if (target !== null && target !== start.sq && attemptMove(start.sq, target)) {
                setDrag(null);
                return;
            }
        }
        else if (start.wasSelected)
            setSelected(null);
        setDrag(null);
    };
    const theme = settings.boardTheme;
    const markMap = new Map(marks.map((m) => [sqIndex(m.sq), m.color ?? 'focus']));
    const hintSet = new Set((hintSquares ?? []).map(sqIndex));
    const lastFrom = lastMove ? sqIndex(lastMove[0]) : -1;
    const lastTo = lastMove ? sqIndex(lastMove[1]) : -1;
    const preFrom = premove ? sqIndex(premove[0]) : -1;
    const preTo = premove ? sqIndex(premove[1]) : -1;
    const squares = [];
    for (let y = 0; y < 8; y++) {
        for (let x = 0; x < 8; x++) {
            const f = orientation === 'w' ? x : 7 - x;
            const r = orientation === 'w' ? 7 - y : y;
            const sq = r * 8 + f;
            const light = (f + r) % 2 === 1;
            const cls = ['sq', light ? 'sq-light' : 'sq-dark'];
            if (sq === lastFrom || sq === lastTo)
                cls.push('sq-last');
            if (sq === preFrom || sq === preTo)
                cls.push('sq-premove');
            if (fogSet.has(sq))
                cls.push('sq-fog');
            if (sq === selected)
                cls.push('sq-selected');
            if (sq === checkSq)
                cls.push('sq-check');
            const mk = markMap.get(sq);
            if (mk)
                cls.push(`sq-mark-${mk}`);
            if (hintSet.has(sq))
                cls.push('sq-hint');
            const dest = dests.get(sq);
            squares.push(_jsxs("div", { className: cls.join(' '), "data-sq": sqName(sq), children: [dest !== undefined && showDests && _jsx("span", { className: dest ? 'dest dest-capture' : 'dest' }), settings.coordinates && x === 0 && _jsx("span", { className: "coord coord-rank", children: r + 1 }), settings.coordinates && y === 7 && _jsx("span", { className: "coord coord-file", children: FILES[f] })] }, sq));
        }
    }
    const badgePos = badge ? toXY(sqIndex(badge.sq)) : null;
    return (_jsxs("div", { className: `board board-${theme}${drag?.active ? ' is-dragging' : ''}`, ref: ref, onPointerDown: onPointerDown, onPointerMove: onPointerMove, onPointerUp: onPointerUp, onPointerCancel: () => {
            dragStart.current = null;
            setDrag(null);
        }, role: "grid", "aria-label": "Chess board", children: [_jsx("div", { className: "board-squares", children: squares }), _jsx("div", { className: "board-pieces", style: pieceOpacity < 1 ? { opacity: pieceOpacity } : undefined, children: pieces.map((p) => {
                    if (fogSet.has(p.sq))
                        return null;
                    const { x, y } = toXY(p.sq);
                    const dragging = drag?.active && drag.sq === p.sq;
                    const style = dragging
                        ? {
                            transform: `translate(calc(${drag.x}px - 50%), calc(${drag.y}px - 50%)) scale(1.12)`,
                            transition: 'none',
                            zIndex: 10,
                        }
                        : { transform: `translate(${x * 100}%, ${y * 100}%)` };
                    return (_jsx("div", { className: `piece${dragging ? ' piece-drag' : ''}${rotateColor && p.key[0] === rotateColor && !dragging ? ' piece-flip' : ''}`, style: style, children: _jsx("img", { src: pieceSrc(p.key), alt: p.key, draggable: false }) }, p.id));
                }) }), arrows.length > 0 && (_jsxs("svg", { className: "board-arrows", viewBox: "0 0 8 8", "aria-hidden": true, children: [_jsx("defs", { children: ['g', 'r', 'b', 'y'].map((c) => (_jsx("marker", { id: `ah-${c}`, markerWidth: "4", markerHeight: "4", refX: "2.05", refY: "2", orient: "auto", children: _jsx("path", { d: "M0,0 L4,2 L0,4 z", className: `arrow-head arrow-${c}` }) }, c))) }), arrows.map((a, i) => {
                        if (a.from.length < 2 || a.to.length < 2)
                            return null;
                        const p1 = toXY(sqIndex(a.from));
                        const p2 = toXY(sqIndex(a.to));
                        const x1 = p1.x + 0.5;
                        const y1 = p1.y + 0.5;
                        const x2 = p2.x + 0.5;
                        const y2 = p2.y + 0.5;
                        const len = Math.hypot(x2 - x1, y2 - y1);
                        const shorten = 0.32;
                        const ex = x2 - ((x2 - x1) / len) * shorten;
                        const ey = y2 - ((y2 - y1) / len) * shorten;
                        const c = a.color ?? 'g';
                        return (_jsxs("g", { children: [a.onClick && (_jsx("line", { x1: x1, y1: y1, x2: x2, y2: y2, className: "arrow-hit", strokeWidth: 0.7, onClick: (e) => { e.stopPropagation(); a.onClick(); }, onPointerDown: (e) => e.stopPropagation() })), _jsx("line", { x1: x1, y1: y1, x2: ex, y2: ey, className: `arrow arrow-${c}`, strokeWidth: 0.16, markerEnd: `url(#ah-${c})` })] }, i));
                    })] })), badge && badgePos && (_jsx("div", { className: `board-badge tone-${CLASS_INFO[badge.cls].tone}`, style: { left: `${(badgePos.x + 1) * 12.5}%`, top: `${badgePos.y * 12.5}%` }, "aria-label": CLASS_INFO[badge.cls].label, children: CLASS_INFO[badge.cls].glyph })), promo && (_jsx("div", { className: "promo", onPointerDown: (e) => e.stopPropagation(), children: _jsxs("div", { className: "promo-col", style: { left: `${toXY(promo.to).x * 12.5}%` }, children: [['q', 'n', 'r', 'b'].map((t) => (_jsx("button", { className: "promo-btn", onClick: () => {
                                onMove?.({ from: sqName(promo.from), to: sqName(promo.to), promotion: t });
                                setPromo(null);
                            }, children: _jsx("img", { src: pieceSrc(promo.color + t.toUpperCase()), alt: t }) }, t))), _jsx("button", { className: "promo-cancel", onClick: () => setPromo(null), children: "Cancel" })] }) }))] }));
}
export const Board = memo(BoardImpl);
