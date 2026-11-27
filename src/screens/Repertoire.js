import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { repToOpening } from '../lib/repertoire';
import { RepTrainPanel } from './RepTrainer';
import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, ArrowRight, BookOpen, Check, ChevronLeft, ChevronsLeft, Plus, Repeat, Sparkles, Swords, Trash2, Wand2 } from 'lucide-react';
import { Chess, uid, pvToSan } from '../lib/chess/core';
import { useApp } from '../lib/store/app';
import { OPENINGS } from '../data/openings';
import { loadEco } from '../lib/openings/eco';
import { loadExplorer, lookup, scoreFor } from '../lib/explorer';
import { lineScore, formatScore } from '../lib/coach/eval';
import { useAnalysis } from '../lib/hooks';
import { addPath, autoBuild, childrenOf, fenAfter, findGaps, fromLibrary, lineName, linesOf, pathKey, removeBranch, setNote, suggestMove, turnAfter, } from '../lib/repertoire';
import { navigate } from '../lib/router';
import { soundForSan } from '../lib/sound';
import { dueLabel } from '../lib/srs/scheduler';
import { Board } from '../components/Board';
import { MoveList } from '../components/MoveList';
import { MasterMoves } from '../components/MasterMoves';
import { Button, Empty, Header, IconButton, Segmented, Sheet, Spinner } from '../components/ui';
import { toast } from '../components/Toast';
// ---------------------------------------------------------------------------
// List
export function RepertoireList() {
    const reps = useApp((s) => s.customReps);
    const cards = useApp((s) => s.cards);
    const saveRep = useApp((s) => s.saveRep);
    const [open, setOpen] = useState(false);
    const [name, setName] = useState('');
    const [side, setSide] = useState('w');
    const [from, setFrom] = useState('empty');
    const list = Object.values(reps).sort((a, b) => b.updatedAt - a.updatedAt);
    const create = () => {
        const id = uid('r');
        const lib = OPENINGS.find((o) => o.id === from);
        const rep = lib
            ? fromLibrary(lib, id, name.trim() || `My ${lib.name}`)
            : { id, name: name.trim() || (side === 'w' ? 'My White repertoire' : 'My Black repertoire'), side, nodes: {}, createdAt: Date.now(), updatedAt: Date.now() };
        saveRep(rep);
        setOpen(false);
        navigate(`/repertoire/${id}`);
    };
    return (_jsxs("div", { className: "page page-narrow", children: [_jsx(Header, { title: "My repertoires", backTo: "/openings", sub: "Build your own opening tree with the coach: master statistics and the engine at every move, gaps flagged, lines drilled with spaced repetition.", actions: _jsx(Button, { size: "sm", icon: _jsx(Plus, { size: 16 }), onClick: () => setOpen(true), children: "New" }) }), list.length === 0 ? (_jsx(Empty, { title: "No repertoire yet", action: _jsx(Button, { icon: _jsx(Plus, { size: 16 }), onClick: () => setOpen(true), children: "Build one" }), children: "Start empty and let the coach suggest moves, or start from one of the library openings and make it yours." })) : (_jsx("div", { className: "list", children: list.map((r) => {
                    const lines = linesOf(r);
                    const due = Object.values(cards).filter((c) => c.kind === 'line' && c.openingId === `rep:${r.id}` && c.state.due <= Date.now()).length;
                    return (_jsxs("button", { className: "list-item", onClick: () => navigate(`/repertoire/${r.id}`), children: [_jsx("span", { className: `pill-color pill-${r.side}` }), _jsxs("span", { className: "list-item-main", children: [_jsx("span", { className: "list-item-title", children: r.name }), _jsxs("span", { className: "list-item-sub", children: [lines.length, " line", lines.length === 1 ? '' : 's', " \u00B7 ", Object.keys(r.nodes).length, " moves", due ? ` · ${due} due` : ''] })] }), _jsx(ArrowRight, { size: 18, className: "muted" })] }, r.id));
                }) })), _jsx(Sheet, { open: open, onClose: () => setOpen(false), title: "New repertoire", children: _jsxs("div", { className: "stack", children: [_jsxs("label", { className: "field", children: [_jsx("span", { className: "field-label", children: "Name" }), _jsx("input", { className: "input", value: name, onChange: (e) => setName(e.target.value), placeholder: side === 'w' ? 'My White repertoire' : 'My Black repertoire' })] }), _jsx(Segmented, { value: side, onChange: setSide, label: "You play", options: [{ value: 'w', label: 'White' }, { value: 'b', label: 'Black' }] }), _jsxs("label", { className: "field", children: [_jsx("span", { className: "field-label", children: "Start from" }), _jsxs("select", { className: "select", value: from, onChange: (e) => setFrom(e.target.value), children: [_jsx("option", { value: "empty", children: "An empty board (the coach will suggest moves)" }), OPENINGS.filter((o) => o.side === side).map((o) => (_jsxs("option", { value: o.id, children: [o.name, " \u2014 library lines"] }, o.id)))] })] }), _jsx(Button, { onClick: create, children: "Create" })] }) })] }));
}
// ---------------------------------------------------------------------------
// Builder
export function RepertoireBuilder({ id }) {
    const rep = useApp((s) => s.customReps[id]);
    if (!rep) {
        return (_jsxs("div", { className: "page", children: [_jsx(Header, { title: "Repertoire", backTo: "/repertoire" }), _jsx(Empty, { title: "Repertoire not found" })] }));
    }
    return _jsx(Builder, { rep: rep }, id);
}
function Builder({ rep }) {
    const saveRep = useApp((s) => s.saveRep);
    const deleteRep = useApp((s) => s.deleteRep);
    const addLineCard = useApp((s) => s.addLineCard);
    const cards = useApp((s) => s.cards);
    const [path, setPath] = useState([]);
    const [ready, setReady] = useState(false);
    const [tab, setTab] = useState('coach');
    const [auto, setAuto] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState(false);
    const [noteDraft, setNoteDraft] = useState('');
    useEffect(() => {
        Promise.all([loadExplorer(), loadEco()]).then(() => setReady(true));
    }, []);
    const fen = useMemo(() => fenAfter(path), [path]);
    const turn = turnAfter(path);
    const mine = turn === rep.side;
    const children = childrenOf(rep, path);
    const lines = useMemo(() => linesOf(rep), [rep, ready]); // eslint-disable-line react-hooks/exhaustive-deps
    const gaps = useMemo(() => (ready ? findGaps(rep) : []), [rep, ready]);
    const node = path.length ? rep.nodes[pathKey(path)] : undefined;
    const { result: analysis } = useAnalysis(fen, { enabled: mine, multipv: 3, depth: 14 });
    const lastMove = useMemo(() => {
        if (!path.length)
            return null;
        const c = new Chess(fenAfter(path.slice(0, -1)));
        const m = c.move(path[path.length - 1]);
        return [m.from, m.to];
    }, [path]);
    useEffect(() => setNoteDraft(node?.note ?? ''), [node?.note, path]);
    const save = (r) => saveRep(r);
    const playSan = (san) => {
        const next = [...path, san];
        if (!(pathKey(next) in rep.nodes)) {
            save(addPath(rep, next));
            toast(`Added ${san} to your repertoire.`, 1600);
        }
        soundForSan(san);
        setPath(next);
    };
    const onMove = (mv) => {
        try {
            playSan(new Chess(fen).move(mv).san);
        }
        catch {
            /* illegal */
        }
    };
    const suggestion = ready && mine ? suggestMove(fen, rep.side) : null;
    const suggestArrow = useMemo(() => {
        if (!suggestion || children.length)
            return [];
        try {
            const m = new Chess(fen).move(suggestion.move.san);
            return [{ from: m.from, to: m.to, color: 'b' }];
        }
        catch {
            return [];
        }
    }, [suggestion?.move.san, fen, children.length]); // eslint-disable-line react-hooks/exhaustive-deps
    const masters = ready ? lookup(fen) : null;
    const engineBest = analysis?.lines[0];
    const chosen = mine ? children[0] : undefined;
    const chosenLine = analysis?.lines.find((l) => {
        try {
            return chosen && new Chess(fen).move(chosen) && pvToSan(fen, l.pv, 1)[0] === chosen;
        }
        catch {
            return false;
        }
    });
    const sign = turn === 'w' ? 1 : -1;
    const evalOf = (l) => {
        const s = lineScore(l);
        if (!s)
            return 0;
        return s.mate !== undefined ? (s.mate > 0 ? 10 : -10) * sign : ((s.cp ?? 0) / 100) * sign;
    };
    const chosenStats = chosen && masters ? masters.moves.find((m) => m.san === chosen) : undefined;
    const warnings = [];
    if (mine && children.length > 1)
        warnings.push(`You have ${children.length} moves here (${children.join(', ')}). A repertoire is easier to learn with one main move — remove the others unless you want both.`);
    if (chosen && chosenLine && engineBest && evalOf(engineBest) - evalOf(chosenLine) > 0.6)
        warnings.push(`The engine rates ${chosen} about ${(evalOf(engineBest) - evalOf(chosenLine)).toFixed(1)} pawns worse than ${pvToSan(fen, engineBest.pv, 1)[0]}.`);
    if (chosen && analysis && !chosenLine && analysis.depth >= 12)
        warnings.push(`${chosen} isn’t among the engine’s top three moves here — fine for surprise value, but check the critical replies.`);
    if (chosenStats && chosenStats.total >= 30 && scoreFor(chosenStats, rep.side) < 0.42)
        warnings.push(`Masters score only ${Math.round(scoreFor(chosenStats, rep.side) * 100)}% with ${chosen}.`);
    const replies = !mine && masters ? masters.moves.filter((m) => m.total / masters.total >= 0.03).slice(0, 6) : [];
    const addMainReplies = () => {
        let r = rep;
        for (const m of replies)
            if (m.total / masters.total >= 0.05)
                r = addPath(r, [...path, m.san]);
        save(r);
    };
    const dueFor = (lineId) => cards[`line:rep:${rep.id}:${lineId}:${rep.side}`];
    const pathName = path.length ? lineName(path) : 'Starting position';
    return (_jsxs("div", { className: "page board-screen-page", children: [_jsx(Header, { title: rep.name, backTo: "/repertoire", sub: `${rep.side === 'w' ? 'White' : 'Black'} · ${lines.length} line${lines.length === 1 ? '' : 's'} · ${gaps.length ? `${gaps.length} gap${gaps.length === 1 ? '' : 's'}` : 'no gaps'}` }), _jsxs("div", { className: "board-screen", children: [_jsxs("div", { className: "board-col", children: [_jsx(Board, { fen: fen, orientation: rep.side, movable: "both", onMove: onMove, lastMove: lastMove, arrows: suggestArrow }), _jsxs("div", { className: "controls", children: [_jsxs("div", { className: "controls-group", children: [_jsx(IconButton, { label: "Start", onClick: () => setPath([]), children: _jsx(ChevronsLeft, {}) }), _jsx(IconButton, { label: "Back", onClick: () => setPath(path.slice(0, -1)), disabled: !path.length, children: _jsx(ChevronLeft, {}) })] }), _jsxs("div", { className: "controls-group", children: [_jsx(IconButton, { label: "Coach: extend from here", onClick: () => setAuto(true), disabled: !ready, children: _jsx(Wand2, {}) }), _jsx(IconButton, { label: "Delete this move and everything after it", onClick: () => { const p = path.slice(0, -1); save(removeBranch(rep, path)); setPath(p); }, disabled: !path.length, children: _jsx(Trash2, {}) })] })] }), path.length > 0 && _jsx(MoveList, { moves: path.map((san) => ({ san })), current: path.length, onSelect: (p) => setPath(path.slice(0, p)) }), _jsx("p", { className: "muted small mt8", children: pathName })] }), _jsxs("div", { className: "side-col", children: [_jsx(RepTrainPanel, { opening: repToOpening(rep), side: rep.side }), _jsxs("div", { className: "tabs", role: "tablist", children: [_jsx("button", { role: "tab", className: `tab${tab === 'coach' ? ' is-on' : ''}`, "aria-selected": tab === 'coach', onClick: () => setTab('coach'), children: "Coach" }), _jsxs("button", { role: "tab", className: `tab${tab === 'lines' ? ' is-on' : ''}`, "aria-selected": tab === 'lines', onClick: () => setTab('lines'), children: ["Lines (", lines.length, ")"] })] }), tab === 'coach' && (_jsxs("div", { className: "stack", children: [!ready ? (_jsx(Spinner, { label: "Loading master games\u2026" })) : mine ? (_jsxs("div", { className: "panel stack rep-coach", children: [_jsxs("h3", { children: [_jsx(Sparkles, { size: 18, className: "inline-icon" }), " Your move"] }), chosen ? (_jsxs("p", { children: ["You play ", _jsx("strong", { className: "num", children: chosen }), chosenStats ? _jsxs("span", { className: "muted", children: [" \u2014 ", Math.round((chosenStats.total / masters.total) * 100), "% of master games, scoring ", Math.round(scoreFor(chosenStats, rep.side) * 100), "%."] }) : _jsx("span", { className: "muted", children: " \u2014 rare at master level." })] })) : (_jsx("p", { className: "muted", children: "Pick your move: play it on the board or tap a row in the master table." })), suggestion && suggestion.move.san !== chosen && (_jsxs("div", { className: "rep-suggest", children: [_jsxs("span", { children: ["Coach suggests ", _jsx("strong", { className: "num", children: suggestion.move.san }), " ", _jsxs("span", { className: "muted small", children: ["(", suggestion.reason, ")"] })] }), _jsx(Button, { size: "sm", variant: "secondary", onClick: () => playSan(suggestion.move.san), children: chosen ? 'Add as well' : 'Use it' })] })), analysis && analysis.lines.length > 0 && (_jsxs("div", { className: "rep-engine", children: [_jsxs("span", { className: "muted small", children: ["Engine (depth ", analysis.depth, ")"] }), analysis.lines.map((l) => {
                                                        const san = pvToSan(fen, l.pv, 1)[0];
                                                        return (_jsxs("button", { className: `rep-engine-line${san === chosen ? ' is-chosen' : ''}`, onClick: () => playSan(san), children: [_jsx("span", { className: "num", children: formatScore(lineScore(l)) }), _jsx("strong", { className: "num", children: san }), _jsx("span", { className: "faint small num", children: pvToSan(fen, l.pv, 5).slice(1).join(' ') })] }, l.multipv));
                                                    })] })), warnings.map((w, i) => (_jsxs("p", { className: "rep-warning", children: [_jsx(AlertTriangle, { size: 14, className: "inline-icon" }), " ", w] }, i)))] })) : (_jsxs("div", { className: "panel stack rep-coach", children: [_jsxs("h3", { children: [_jsx(Sparkles, { size: 18, className: "inline-icon" }), " Prepare for their replies"] }), replies.length ? (_jsxs(_Fragment, { children: [_jsx("div", { className: "rep-replies", children: replies.map((m) => {
                                                            const covered = children.includes(m.san);
                                                            const share = Math.round((m.total / masters.total) * 100);
                                                            return (_jsxs("button", { className: `rep-reply${covered ? ' is-covered' : share >= 8 ? ' is-gap' : ''}`, onClick: () => playSan(m.san), children: [_jsx("strong", { className: "num", children: m.san }), _jsxs("span", { className: "num small", children: [share, "%"] }), _jsx("span", { className: "small", children: covered ? _jsxs(_Fragment, { children: [_jsx(Check, { size: 12 }), " prepared"] }) : share >= 8 ? 'gap' : 'rare' })] }, m.san));
                                                        }) }), _jsx(Button, { size: "sm", variant: "secondary", onClick: addMainReplies, children: "Add every reply played 5%+ of the time" })] })) : (_jsx("p", { className: "muted", children: masters ? 'Masters rarely reach this position.' : 'Out of the master database here — add the replies you expect from your own opponents.' }))] })), children.length > 0 && (_jsxs("div", { className: "row", children: [_jsx("span", { className: "muted small", children: "Continue:" }), children.map((c) => _jsx("button", { className: "chip", onClick: () => setPath([...path, c]), children: c }, c))] })), path.length > 0 && (_jsxs("label", { className: "field", children: [_jsxs("span", { className: "field-label", children: ["Your note on ", path[path.length - 1]] }), _jsx("textarea", { className: "textarea", rows: 2, value: noteDraft, onChange: (e) => setNoteDraft(e.target.value), onBlur: () => noteDraft !== (node?.note ?? '') && save(setNote(rep, path, noteDraft)), placeholder: "The idea behind this move \u2014 shown when you learn the line." })] })), ready && _jsx("div", { className: "panel", children: _jsx(MasterMoves, { fen: fen, onPlay: playSan, showGames: false, limit: 8 }) }), gaps.length > 0 && (_jsxs("div", { className: "panel stack", children: [_jsx("h4", { children: "Coach check: gaps in your tree" }), gaps.slice(0, 5).map((g) => (_jsxs("button", { className: "rep-gap", onClick: () => { save(addPath(rep, [...g.path, g.move.san])); setPath([...g.path, g.move.san]); }, children: [_jsxs("span", { children: ["After ", g.path.length ? lineMoves(g.path) : 'the start', ", ", _jsx("strong", { children: g.move.san }), " is played in ", Math.round(g.share * 100), "% of master games."] }), _jsxs("span", { className: "link-btn small", children: ["Prepare it ", _jsx(ArrowRight, { size: 12 })] })] }, pathKey(g.path) + g.move.san)))] }))] })), tab === 'lines' && (_jsxs("div", { className: "stack", children: [lines.length === 0 ? (_jsx("p", { className: "muted", children: "No lines yet. Add moves on the Coach tab." })) : (_jsxs(_Fragment, { children: [_jsx(Button, { icon: _jsx(Repeat, { size: 16 }), onClick: () => { lines.forEach((l) => addLineCard(`rep:${rep.id}`, l.id, rep.side)); toast(`${lines.length} line${lines.length === 1 ? '' : 's'} in your review deck.`); }, children: "Add all lines to my review deck" }), _jsx("div", { className: "list", children: lines.map((l) => {
                                                    const card = dueFor(l.id);
                                                    return (_jsxs("div", { className: "list-item rep-line", children: [_jsxs("span", { className: "list-item-main", children: [_jsx("span", { className: "list-item-title", children: l.name }), _jsx("span", { className: "list-item-sub num", children: lineMoves(l.sans) }), card && _jsx("span", { className: "faint small", children: dueLabel(card.state) })] }), _jsxs("span", { className: "row", children: [_jsx(IconButton, { label: "Learn", onClick: () => navigate(`/openings/rep:${rep.id}/learn/${l.id}?side=${rep.side}`), children: _jsx(BookOpen, { size: 18 }) }), _jsx(IconButton, { label: "Drill", onClick: () => navigate(`/openings/rep:${rep.id}/drill/${l.id}?side=${rep.side}`), children: _jsx(Repeat, { size: 18 }) })] })] }, l.id));
                                                }) }), _jsx(Button, { variant: "secondary", icon: _jsx(Swords, { size: 16 }), onClick: () => navigate(`/play?opening=rep:${rep.id}&side=${rep.side}`), children: "Practice against a bot that plays your tree" })] })), _jsxs("button", { className: "link-btn danger mt16", onClick: () => setConfirmDelete(true), children: [_jsx(Trash2, { size: 14 }), " Delete this repertoire"] })] }))] })] }), _jsxs(Sheet, { open: auto, onClose: () => setAuto(false), title: "Let the coach extend the tree", children: [_jsx("p", { className: "muted", children: "From the current position, the coach adds the most popular, best-scoring master move for you and the main replies (10%+ of games, up to three) for your opponent." }), _jsx("div", { className: "row mt12", children: [6, 8, 10, 12].map((moves) => (_jsxs(Button, { variant: "secondary", onClick: () => {
                                const before = linesOf(rep).length;
                                const r = autoBuild(rep, path, moves * 2);
                                save(r);
                                setAuto(false);
                                toast(`Coach added ${Math.max(0, linesOf(r).length - before)} line${linesOf(r).length - before === 1 ? '' : 's'} (to move ${moves}).`);
                            }, children: ["To move ", moves] }, moves))) }), _jsx("p", { className: "faint small mt12", children: "You can delete or change anything afterwards." })] }), _jsxs(Sheet, { open: confirmDelete, onClose: () => setConfirmDelete(false), title: "Delete this repertoire?", children: [_jsx("p", { className: "muted", children: "Its lines and their review cards are removed from this device." }), _jsxs("div", { className: "row mt16", children: [_jsx(Button, { variant: "danger", icon: _jsx(Trash2, { size: 16 }), onClick: () => { deleteRep(rep.id); navigate('/repertoire'); }, children: "Delete" }), _jsx(Button, { variant: "ghost", onClick: () => setConfirmDelete(false), children: "Cancel" })] })] })] }));
}
function lineMoves(sans) {
    return sans.map((s, i) => (i % 2 === 0 ? `${i / 2 + 1}.${s}` : s)).join(' ');
}
