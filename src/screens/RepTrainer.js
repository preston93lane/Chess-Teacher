import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, BookOpen, Check, Eye, GitBranch, Repeat, Shuffle } from 'lucide-react';
import { Chess } from '../lib/chess/core';
import { getOpening } from '../lib/openings/book';
import { useApp } from '../lib/store/app';
import { navigate, query, useRoute } from '../lib/router';
import { playSound, soundForSan } from '../lib/sound';
import { describeMove } from '../lib/coach/explain';
import { ContinuationPanel } from '../components/Continuation';
import { loadExplorer } from '../lib/explorer';
import { addPath } from '../lib/repertoire';
import { buildTree, styledAnswer, surpriseReply, fenAt, isLearned, key, moveLabel, myKeys, myMoves, pickReply, summary, turnAt } from '../lib/repTrainer';
import { Board } from '../components/Board';
import { Button, Header, NextDock, Sheet, Toggle } from '../components/ui';
const RUNS = 5;
const NEW_PER_SESSION = 3;
const NAME = { w: 'White', b: 'Black' };
/** /reptrain/:openingId/:mode?line=&side=&only=learned */
export function RepTrainer({ openingId, mode }) {
    const q = query(useRoute());
    const opening = getOpening(openingId);
    if (!opening)
        return _jsx("div", { className: "page", children: _jsx(Header, { title: "Opening not found", backTo: "/openings" }) });
    const side = q.get('side') ?? opening.side;
    return _jsx(Trainer, { opening: opening, side: side, mode: mode, lineId: q.get('line'), onlyLearned: q.get('only') === 'learned', surpriseInit: q.get('surprise') === '1' }, `${openingId}-${mode}-${q.get('line') ?? ''}`);
}
function homeOf(o) {
    return o.id.startsWith('rep:') ? `/repertoire/${o.id.slice(4)}` : `/openings/${o.id}`;
}
function Trainer({ opening, side, mode, lineId, onlyLearned, surpriseInit }) {
    const oid = opening.id;
    const { tree, lines } = useMemo(() => buildTree(opening), [opening]);
    const stats = useApp((s) => s.repTrain[oid]) ?? {};
    const learnRepMoves = useApp((s) => s.learnRepMoves);
    const gradeRepMove = useApp((s) => s.gradeRepMove);
    const logActivity = useApp((s) => s.logActivity);
    // Which lines this session covers (learn: the next new ones; line: the chosen one).
    const [queue] = useState(() => {
        if (lineId)
            return lines.filter((l) => l.id === lineId);
        if (mode === 'learn')
            return lines.filter((l) => !isLearned(l, side, stats)).slice(0, NEW_PER_SESSION);
        return [];
    });
    const [qi, setQi] = useState(0);
    const target = mode === 'tree' ? null : queue[qi] ?? null;
    const [path, setPath] = useState([]);
    const [done, setDone] = useState(false);
    const [wrong, setWrong] = useState(null); // what you tried
    const [hint, setHint] = useState(false);
    const [failed, setFailed] = useState(new Set()); // keys missed this run
    const [graded, setGraded] = useState(new Set()); // keys graded this run
    const [callout, setCallout] = useState(null);
    const [session, setSession] = useState({ runs: 0, clean: 0, moves: 0, misses: 0, weak: [] });
    const [linesOpen, setLinesOpen] = useState(false);
    const finishedRef = useRef(false);
    // About one line in three steps off your preparation.
    const surpriseRun = useRef(Math.random() < 0.35);
    const [surprise, setSurpriseState] = useState(() => {
        try {
            return surpriseInit || localStorage.getItem('reptrain-surprise') === '1';
        }
        catch {
            return surpriseInit;
        }
    });
    const setSurprise = (v) => {
        setSurpriseState(v);
        try {
            localStorage.setItem('reptrain-surprise', v ? '1' : '0');
        }
        catch {
            /* ignore */
        }
    };
    const [offBook, setOffBook] = useState(null);
    const customRep = useApp((s) => (oid.startsWith('rep:') ? s.customReps[oid.slice(4)] : undefined));
    const saveRep = useApp((s) => s.saveRep);
    const [added, setAdded] = useState(false);
    useEffect(() => {
        if (surprise)
            loadExplorer().catch(() => null);
    }, [surprise]);
    const fen = useMemo(() => fenAt(path), [path]);
    const ply = path.length;
    const myTurn = turnAt(ply) === side;
    const atEnd = target ? ply >= target.sans.length : (tree.get(key(path))?.children.length ?? 0) === 0;
    // Expected move(s) here.
    const expected = target ? (target.sans[ply] ? [target.sans[ply]] : []) : myMoves(tree, path);
    const thisKey = key([...path, expected[0] ?? '']);
    const known = !!stats[thisKey];
    // A move you haven't met yet is taught, whatever the mode.
    const teaching = myTurn && !!expected[0] && !known && !graded.has(thisKey);
    // Opponent replies.
    useEffect(() => {
        if (done || myTurn)
            return;
        if (atEnd)
            return;
        const id = setTimeout(() => {
            // Now and then, step off your preparation with a popular master move.
            if (!target && surprise && surpriseRun.current && path.length < 14 && Math.random() < 0.45) {
                const s = surpriseReply(tree, path);
                if (s) {
                    soundForSan(s.san);
                    const p2 = [...path, s.san];
                    setOffBook({ ...s, ply });
                    setCallout(null);
                    setPath(p2);
                    finish(p2);
                    return;
                }
            }
            const san = target ? target.sans[ply] : pickReply(tree, path, side, stats, onlyLearned);
            if (!san) {
                finish(path);
                return;
            }
            const others = (tree.get(key(path))?.children ?? []).filter((s) => s !== san);
            setCallout({ san, ply, others, note: tree.get(key([...path, san]))?.note });
            soundForSan(san);
            setPath([...path, san]);
        }, path.length === 0 ? 250 : 550);
        return () => clearTimeout(id);
    }, [path, done, myTurn]); // eslint-disable-line react-hooks/exhaustive-deps
    // End of the line.
    useEffect(() => {
        if (!done && atEnd && path.length > 0)
            finish(path);
    }, [atEnd, done]); // eslint-disable-line react-hooks/exhaustive-deps
    function finish(p) {
        if (done || finishedRef.current)
            return;
        finishedRef.current = true;
        setDone(true);
        playSound('end');
        logActivity('lines');
        learnRepMoves(oid, myKeys(p, side));
        const mine = myKeys(p, side).length;
        setSession((s) => ({
            runs: s.runs + 1,
            clean: s.clean + (failed.size === 0 ? 1 : 0),
            moves: s.moves + mine,
            misses: s.misses + failed.size,
            weak: [...new Set([...s.weak, ...failed])],
        }));
    }
    function restart() {
        finishedRef.current = false;
        surpriseRun.current = Math.random() < 0.35;
        setPath([]);
        setDone(false);
        setWrong(null);
        setHint(false);
        setFailed(new Set());
        setGraded(new Set());
        setCallout(null);
        setOffBook(null);
        setAdded(false);
    }
    const onMove = (m) => {
        if (done || !myTurn)
            return;
        let san;
        try {
            san = new Chess(fen).move(m).san;
        }
        catch {
            return;
        }
        if (expected.includes(san)) {
            const k = key([...path, san]);
            if (!graded.has(k) && stats[k]) {
                const g = failed.has(k) ? 'again' : hint ? 'hard' : 'good';
                gradeRepMove(oid, k, g);
            }
            setGraded(new Set(graded).add(k));
            soundForSan(san);
            setPath([...path, san]);
            setWrong(null);
            setHint(false);
            setCallout(null);
        }
        else {
            playSound('bad');
            setWrong(san);
            setFailed(new Set(failed).add(thisKey));
        }
    };
    // The move to show: when teaching, after a miss, or on a hint.
    const reveal = myTurn && !done && expected[0] && (teaching || wrong || hint);
    const arrows = [];
    let explain = '';
    if (reveal) {
        const c = new Chess(fen);
        const mv = c.move(expected[0]);
        arrows.push({ from: mv.from, to: mv.to, color: 'g' });
        const note = tree.get(key([...path, expected[0]]))?.note;
        try {
            explain = note || describeMove(fen, mv)[0] || '';
        }
        catch {
            explain = note ?? '';
        }
    }
    const lastMove = useMemo(() => {
        if (!path.length)
            return null;
        const m = new Chess(fenAt(path.slice(0, -1))).move(path[path.length - 1]);
        return [m.from, m.to];
    }, [path]);
    const sum = summary(lines, side, stats);
    const lineName = target?.name ?? lines.find((l) => key(l.sans) === key(path))?.name ?? lines.find((l) => key(l.sans).startsWith(key(path)))?.name;
    const opp = NAME[side === 'w' ? 'b' : 'w'];
    const title = mode === 'learn' ? 'Learn' : mode === 'line' ? 'Practise a line' : 'Practise the repertoire';
    const sub = mode === 'learn' ? `${opening.name} · line ${Math.min(qi + 1, queue.length)} of ${queue.length}` : mode === 'line' ? `${opening.name} · ${target?.name ?? ''}` : `${opening.name} · ${Math.min(session.runs + (done ? 0 : 1), RUNS)} of ${RUNS} · ${opp} varies`;
    if (mode === 'learn' && queue.length === 0) {
        return (_jsxs("div", { className: "page", children: [_jsx(Header, { title: title, backTo: homeOf(opening), sub: opening.name }), _jsxs("div", { className: "panel stack", children: [_jsxs("h3", { children: [_jsx(Check, { size: 18, className: "inline-icon" }), " You\u2019ve learned every line"] }), _jsxs("p", { className: "muted", children: [sum.learnedLines, " lines, ", sum.learnedMoves, " of your moves. Now keep them fresh: practise against an opponent who varies their replies."] }), _jsx(Button, { icon: _jsx(Shuffle, { size: 16 }), onClick: () => navigate(`/reptrain/${oid}/tree?side=${side}`, true), children: "Practise the repertoire" })] })] }));
    }
    if (mode !== 'tree' && !target)
        return _jsx("div", { className: "page", children: _jsx(Header, { title: "Line not found", backTo: homeOf(opening) }) });
    const sessionOver = mode === 'tree' && done && session.runs >= RUNS;
    return (_jsxs("div", { className: "page board-screen-page", children: [_jsx(Header, { title: title, backTo: homeOf(opening), sub: sub }), _jsxs("div", { className: "board-screen", children: [_jsx("div", { className: "board-col", children: _jsx(Board, { fen: fen, orientation: side, movable: !done && myTurn ? side : null, onMove: onMove, lastMove: lastMove, arrows: arrows }) }), _jsxs("div", { className: "side-col", children: [_jsxs("div", { className: "panel stack reptrain", children: [lineName && _jsx("p", { className: "faint small", children: lineName }), _jsx("p", { className: "reptrain-moves num", children: path.length ? path.map((s, i) => _jsxs("span", { className: turnAt(i) === side ? 'is-mine' : '', children: [i % 2 === 0 || i === 0 ? moveLabel(i, s) : s, " "] }, i)) : _jsx("span", { className: "muted", children: "Starting position" }) }), callout && !done && (_jsxs("div", { className: "reptrain-branch", children: [_jsx(GitBranch, { size: 16 }), _jsxs("div", { children: [_jsxs("p", { children: [opp, " played ", _jsx("strong", { className: "num", children: moveLabel(callout.ply, callout.san) }), callout.others.length > 0 && _jsxs("span", { className: "muted", children: [" \u2014 your repertoire also covers ", callout.others.map((s) => moveLabel(callout.ply, s)).join(', '), "."] })] }), callout.note && mode === 'learn' && _jsx("p", { className: "muted small", children: callout.note })] })] })), !done && myTurn && (_jsxs(_Fragment, { children: [teaching ? (_jsxs("div", { className: "reptrain-teach", children: [_jsx("p", { className: "reptrain-kicker", children: "New move" }), _jsxs("p", { children: [callout ? _jsxs(_Fragment, { children: ["Against ", _jsx("strong", { className: "num", children: moveLabel(callout.ply, callout.san) }), " you play "] }) : _jsx(_Fragment, { children: "You play " }), _jsx("strong", { className: "num", children: moveLabel(ply, expected[0]) }), ". Play it on the board."] }), explain && _jsx("p", { className: "muted", children: explain })] })) : wrong ? (_jsxs("div", { className: "reptrain-wrong", children: [_jsxs("p", { children: [_jsx("strong", { className: "num", children: wrong }), ' ', target && myMoves(tree, path).includes(wrong) ? 'is in your repertoire too, but this line continues with' : 'isn’t your move here. Your repertoire plays', ' ', _jsx("strong", { className: "num", children: expected.join(' or ') }), "."] }), explain && _jsx("p", { className: "muted small", children: explain })] })) : (_jsx("p", { className: "drill-prompt", children: hint ? _jsxs(_Fragment, { children: ["Your move: ", _jsx("strong", { className: "num", children: expected[0] }), explain && _jsxs("span", { className: "muted small", children: [" \u2014 ", explain] })] }) : expected.length > 1 ? 'Your move — either of your repertoire moves counts.' : known ? 'Your move, from memory.' : 'Your move.' })), !teaching && !wrong && !hint && _jsxs("button", { className: "link-btn", onClick: () => setHint(true), children: [_jsx(Eye, { size: 14 }), " Show me"] })] })), !done && !myTurn && !atEnd && _jsxs("p", { className: "muted small", children: [opp, " is choosing a reply\u2026"] }), done && (_jsx("div", { className: "stack", children: mode === 'learn' ? (_jsxs(_Fragment, { children: [_jsxs("h3", { children: [_jsx(Check, { size: 18, className: "inline-icon" }), " Line learned"] }), _jsx("p", { className: "muted", children: failed.size === 0 ? 'Every known move right, and the new ones are in your memory schedule.' : `${failed.size} slip${failed.size === 1 ? '' : 's'} on moves you’d seen before — they’ll come up again soon.` })] })) : offBook ? (_jsx(OffBook, { offBook: offBook, sug: styledAnswer(tree, path, side), side: side, canAdd: !!customRep && !added, onAdd: (reply) => {
                                                if (!customRep)
                                                    return;
                                                saveRep(addPath(customRep, reply ? [...path, reply] : path));
                                                setAdded(true);
                                            }, added: added })) : sessionOver ? (_jsxs(_Fragment, { children: [_jsx("h3", { children: "Session done" }), _jsxs("p", { className: "num", children: [session.clean, " of ", session.runs, " lines without a slip \u00B7 ", session.moves - session.misses, " of ", session.moves, " moves right first time."] }), session.weak.length > 0 && _jsxs("p", { className: "muted small", children: ["To firm up: ", session.weak.map((k) => { const s = k.split(' '); return moveLabel(s.length - 1, s[s.length - 1]); }).join(', '), " \u2014 they\u2019ll come back sooner."] })] })) : (_jsxs(_Fragment, { children: [_jsx("h3", { children: failed.size === 0 ? _jsxs(_Fragment, { children: [_jsx(Check, { size: 18, className: "inline-icon" }), " Clean"] }) : `${failed.size} slip${failed.size === 1 ? '' : 's'}` }), _jsx("p", { className: "muted small", children: "End of your preparation in this line." })] })) }))] }), done && !sessionOver && _jsx(ContinuationPanel, { path: path, side: side, first: offBook ? styledAnswer(tree, path, side)?.san : undefined, title: offBook ? 'How to meet it' : 'Where it goes next' }, path.join(' ')), mode === 'tree' && (_jsx("div", { className: "panel panel-tight", children: _jsx(Toggle, { checked: surprise, onChange: setSurprise, label: "Surprise me", hint: "Now and then the opponent plays a popular master move you haven\u2019t prepared." }) })), _jsxs("p", { className: "muted small num", children: [sum.learnedLines, "/", sum.lines, " lines learned \u00B7 ", sum.due, " move", sum.due === 1 ? '' : 's', " due for review"] }), mode !== 'learn' && _jsx("button", { className: "link-btn small", onClick: () => setLinesOpen(true), children: "Practise a specific line instead" })] })] }), done && (_jsx(NextDock, { children: mode === 'learn' ? (qi + 1 < queue.length ? (_jsx(Button, { icon: _jsx(ArrowRight, { size: 16 }), onClick: () => { setQi(qi + 1); restart(); }, children: "Next new line" })) : (_jsx(Button, { icon: _jsx(Shuffle, { size: 16 }), onClick: () => navigate(`/reptrain/${oid}/tree?side=${side}&only=learned`, true), children: "Now practise them" }))) : mode === 'line' ? (_jsxs(_Fragment, { children: [_jsx(Button, { variant: "secondary", icon: _jsx(Repeat, { size: 16 }), onClick: restart, children: "Again" }), _jsx(Button, { icon: _jsx(Shuffle, { size: 16 }), onClick: () => navigate(`/reptrain/${oid}/tree?side=${side}`, true), children: "Mixed" })] })) : sessionOver ? (_jsxs(Button, { icon: _jsx(Repeat, { size: 16 }), onClick: () => { setSession({ runs: 0, clean: 0, moves: 0, misses: 0, weak: [] }); restart(); }, children: ["Another ", RUNS] })) : (_jsxs(Button, { icon: _jsx(ArrowRight, { size: 16 }), onClick: restart, children: ["Next line (", session.runs + 1, "/", RUNS, ")"] })) })), _jsx(LinePicker, { open: linesOpen, onClose: () => setLinesOpen(false), opening: opening, side: side, lines: lines, stats: stats })] }));
}
function LinePicker({ open, onClose, opening, side, lines, stats }) {
    return (_jsxs(Sheet, { open: open, onClose: onClose, title: "Practise one line", children: [_jsxs("p", { className: "muted small", children: [NAME[side === 'w' ? 'b' : 'w'], " follows this line exactly. Lines you haven\u2019t learned yet are taught first."] }), _jsx("div", { className: "list mt8", children: lines.map((l) => {
                    const learned = isLearned(l, side, stats);
                    return (_jsxs("button", { className: "list-item", onClick: () => { onClose(); navigate(`/reptrain/${opening.id}/${learned ? 'line' : 'learn'}?side=${side}&line=${l.id}`); }, children: [_jsxs("span", { className: "list-item-main", children: [_jsx("span", { className: "list-item-title", children: l.name }), _jsxs("span", { className: "muted small num", children: [l.sans.slice(0, 8).map((s, i) => (i % 2 === 0 ? `${i / 2 + 1}.${s}` : s)).join(' '), l.sans.length > 8 ? ' …' : ''] })] }), _jsx("span", { className: `small ${learned ? 'tone-text-best' : 'muted'}`, children: learned ? 'Learned' : _jsxs(_Fragment, { children: [_jsx(BookOpen, { size: 14 }), " New"] }) })] }, l.id));
                }) })] }));
}
/** Entry point shown on a repertoire or opening page: the two phases. */
export function RepTrainPanel({ opening, side }) {
    const stats = useApp((s) => s.repTrain[opening.id]) ?? {};
    const { lines } = useMemo(() => buildTree(opening), [opening]);
    const [open, setOpen] = useState(false);
    if (!lines.length)
        return null;
    const s = summary(lines, side, stats);
    const newLeft = s.lines - s.learnedLines;
    const base = `/reptrain/${opening.id}`;
    return (_jsxs("div", { className: "panel stack reptrain-panel", children: [_jsxs("div", { className: "row-between", children: [_jsx("h3", { children: "Train it" }), _jsxs("span", { className: "muted small num", children: [s.learnedLines, "/", s.lines, " lines \u00B7 ", s.due, " due"] })] }), _jsx("div", { className: "meter", children: _jsx("div", { className: "meter-fill", style: { width: `${s.moves ? (s.learnedMoves / s.moves) * 100 : 0}%` } }) }), _jsxs("button", { className: "reptrain-step", onClick: () => navigate(`${base}/learn?side=${side}`), disabled: newLeft === 0, children: [_jsx("span", { className: "reptrain-num", children: "1" }), _jsxs("span", { className: "list-item-main", children: [_jsx("strong", { children: "Learn" }), _jsx("span", { className: "muted small", children: newLeft ? `${Math.min(NEW_PER_SESSION, newLeft)} new line${Math.min(NEW_PER_SESSION, newLeft) === 1 ? '' : 's'} — each move shown and explained, and which reply gets which answer.` : 'Every line learned.' })] })] }), _jsxs("button", { className: "reptrain-step", onClick: () => navigate(`${base}/tree?side=${side}${s.learnedLines < s.lines && s.learnedLines > 0 ? '&only=learned' : ''}`), disabled: s.learnedLines === 0, children: [_jsx("span", { className: "reptrain-num", children: "2" }), _jsxs("span", { className: "list-item-main", children: [_jsxs("strong", { children: ["Practise the repertoire", s.due ? ` · ${s.due} due` : ''] }), _jsx("span", { className: "muted small", children: "The opponent varies between the replies in your tree, leaning on what you\u2019re due to review. Play your moves from memory." })] })] }), _jsx("button", { className: "link-btn", onClick: () => setOpen(true), children: "Practise one specific line" }), _jsx(LinePicker, { open: open, onClose: () => setOpen(false), opening: opening, side: side, lines: lines, stats: stats })] }));
}
function OffBook({ offBook, sug, side, canAdd, onAdd, added }) {
    const opp = NAME[side === 'w' ? 'b' : 'w'];
    return (_jsxs(_Fragment, { children: [_jsx("h3", { children: "Out of your preparation" }), _jsxs("p", { children: [opp, " played ", _jsx("strong", { className: "num", children: moveLabel(offBook.ply, offBook.san) }), _jsxs("span", { className: "muted", children: [" \u2014 ", Math.round(offBook.share * 100), "% of master games here (", offBook.games, "), and not in your repertoire."] })] }), sug ? (_jsxs("p", { children: ["Masters\u2019 choice: ", _jsx("strong", { className: "num", children: moveLabel(offBook.ply + 1, sug.san) }), " ", _jsxs("span", { className: "muted small", children: ["(", sug.reason, ")."] })] })) : (_jsx("p", { className: "muted", children: "The database has nothing more here \u2014 the engine line below shows a sensible way on." })), canAdd && _jsxs(Button, { size: "sm", variant: "secondary", onClick: () => onAdd(sug?.san), children: ["Add ", offBook.san, sug ? ` → ${sug.san}` : '', " to my repertoire"] }), added && _jsxs("p", { className: "tone-text-best small", children: [_jsx(Check, { size: 14, className: "inline-icon" }), " Added \u2014 it\u2019ll be taught as a new line."] })] }));
}
