import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, Check, Eye, Play, RotateCcw, X } from 'lucide-react';
import { Chess, formatLine, START_FEN } from '../lib/chess/core';
import { makeQuestions } from '../lib/quiz';
import { useApp } from '../lib/store/app';
import { navigate, query, useRoute } from '../lib/router';
import { soundForSan, playSound } from '../lib/sound';
import { Board } from '../components/Board';
import { Button, Header, Section, Segmented, Spinner } from '../components/ui';
import { BlockBanner, completeBlock } from '../components/BlockBanner';
import { OPENINGS } from '../data/openings';
const SOURCES = [
    { value: 'repertoire', label: 'My repertoire', about: 'Lines from the openings you added to your repertoire.' },
    { value: 'library', label: 'Library lines', about: 'Name the exact line from the 14 library openings, then play the next theory move.' },
    { value: 'families', label: 'All openings', about: 'Recognise the opening family among 35 mainstream openings, then play the main continuation.' },
    { value: 'variations', label: 'Name the variation', about: 'Hard: pick the exact named variation from its siblings.' },
];
export function OpeningQuiz() {
    const path = useRoute();
    const q = query(path);
    const repertoire = useApp((s) => s.repertoire);
    const best = useApp((s) => s.quiz.best);
    const presetSource = q.get('source');
    const ids = q.get('ids')?.split(',').filter(Boolean);
    const [source, setSource] = useState(presetSource ?? (Object.keys(repertoire).length ? 'repertoire' : 'library'));
    const [count, setCount] = useState(+(q.get('count') ?? 10));
    const [started, setStarted] = useState(!!presetSource);
    if (!started) {
        return (_jsxs("div", { className: "page page-narrow", children: [_jsx(Header, { title: "Opening quiz", backTo: "/openings", sub: "You see a position. Name the opening, then play the move theory recommends." }), _jsx(Section, { title: "What to practise", children: _jsx("div", { className: "stack", children: SOURCES.map((s) => (_jsxs("button", { className: `source-card${source === s.value ? ' is-on' : ''}`, onClick: () => setSource(s.value), disabled: s.value === 'repertoire' && !Object.keys(repertoire).length, children: [_jsx("span", { className: "source-title", children: s.label }), _jsx("span", { className: "muted small", children: s.value === 'repertoire' && !Object.keys(repertoire).length ? 'Add openings to your repertoire first.' : s.about }), best[s.value] !== undefined && _jsxs("span", { className: "faint small num", children: ["Best: ", best[s.value]] })] }, s.value))) }) }), _jsx(Section, { title: "Questions", children: _jsx(Segmented, { value: String(count), onChange: (v) => setCount(+v), options: [{ value: '5', label: '5' }, { value: '10', label: '10' }, { value: '20', label: '20' }] }) }), _jsx("div", { className: "sticky-cta", children: _jsx(Button, { size: "lg", className: "btn-block", icon: _jsx(Play, { size: 18 }), onClick: () => setStarted(true), children: "Start quiz" }) })] }));
    }
    const scopedIds = source === 'repertoire' ? Object.keys(repertoire) : ids ?? OPENINGS.map((o) => o.id);
    return _jsx(QuizRound, { source: ids ? 'repertoire' : source, label: source, ids: scopedIds, count: count, onExit: () => setStarted(false) });
}
function QuizRound({ source, label, ids, count, onExit }) {
    const recordQuiz = useApp((s) => s.recordQuiz);
    const blockId = query(useRoute()).get('block');
    const [questions, setQuestions] = useState(null);
    const [i, setI] = useState(0);
    const [step, setStep] = useState('name');
    const [picked, setPicked] = useState(null);
    const [moveResult, setMoveResult] = useState(null);
    const [score, setScore] = useState(0);
    const [missed, setMissed] = useState([]);
    const [showMoves, setShowMoves] = useState(false);
    const [fen, setFen] = useState(null);
    const [finished, setFinished] = useState(false);
    useEffect(() => {
        makeQuestions(source, count, ids).then(setQuestions);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    const qn = questions?.[i];
    useEffect(() => {
        if (qn)
            setFen(qn.fen);
    }, [qn]);
    const max = (questions?.length ?? count) * 2;
    const pick = (opt) => {
        if (!qn || picked)
            return;
        setPicked(opt);
        const ok = opt === qn.answer;
        playSound(ok ? 'good' : 'bad');
        if (ok && !showMoves)
            setScore((s) => s + 1);
        if (!ok)
            setMissed((m) => [...m, qn]);
    };
    const onMove = (mv) => {
        if (!qn || step !== 'move' || moveResult)
            return;
        const c = new Chess(qn.fen);
        let m;
        try {
            m = c.move(mv);
        }
        catch {
            return;
        }
        soundForSan(m.san);
        setFen(c.fen());
        if (m.san === qn.next) {
            setMoveResult({ ok: true, san: m.san });
            setScore((s) => s + 1);
            playSound('good');
        }
        else if (qn.alsoBook.includes(m.san)) {
            setMoveResult({ ok: true, san: m.san, also: true });
            setScore((s) => s + 1);
            playSound('good');
        }
        else {
            setMoveResult({ ok: false, san: m.san });
            playSound('bad');
            if (!missed.includes(qn))
                setMissed((x) => [...x, qn]);
        }
    };
    const next = () => {
        if (!questions)
            return;
        if (i + 1 >= questions.length) {
            setFinished(true);
            recordQuiz(label, score, max);
            completeBlock(blockId);
            playSound('end');
            return;
        }
        setI(i + 1);
        setStep('name');
        setPicked(null);
        setMoveResult(null);
        setShowMoves(false);
    };
    const arrows = useMemo(() => {
        if (!qn || !moveResult || moveResult.ok)
            return [];
        const c = new Chess(qn.fen);
        const m = c.move(qn.next);
        return [{ from: m.from, to: m.to, color: 'y' }];
    }, [qn, moveResult]);
    if (!questions)
        return _jsxs("div", { className: "page", children: [_jsx(Header, { title: "Opening quiz", backTo: "/openings" }), _jsx(Spinner, { label: "Setting up positions\u2026" })] });
    if (!questions.length)
        return (_jsxs("div", { className: "page page-narrow", children: [_jsx(Header, { title: "Opening quiz", backTo: "/openings" }), _jsx("p", { className: "muted", children: "No positions available for this selection." }), _jsx(Button, { onClick: onExit, children: "Choose again" })] }));
    if (finished) {
        return (_jsxs("div", { className: "page page-narrow", children: [_jsx(Header, { title: "Quiz complete", backTo: "/openings" }), _jsx(BlockBanner, {}), _jsxs("div", { className: "panel stack", children: [_jsxs("p", { className: "session-done-num num", children: [score, "/", max] }), _jsx("p", { className: "muted", children: "One point for naming the opening, one for the move." }), missed.length > 0 && (_jsxs(_Fragment, { children: [_jsx("h4", { children: "To revisit" }), _jsx("ul", { className: "bullets", children: missed.map((m) => (_jsxs("li", { children: [_jsx("strong", { children: m.answer }), " \u2014 next move ", m.next, m.openingId && (_jsxs(_Fragment, { children: [' ', _jsx("button", { className: "link-btn small", onClick: () => navigate(`/openings/${m.openingId}/learn/${m.lineId}`), children: "Learn the line" })] }))] }, m.id))) })] })), _jsxs("div", { className: "row", children: [_jsx(Button, { icon: _jsx(RotateCcw, { size: 16 }), onClick: onExit, children: "New quiz" }), _jsx(Button, { variant: "secondary", onClick: () => navigate('/openings'), children: "Openings" })] })] })] }));
    }
    const q = qn;
    return (_jsxs("div", { className: "page board-screen-page", children: [_jsx(Header, { title: "Opening quiz", backTo: "/openings", sub: `Question ${i + 1} of ${questions.length} · score ${score}/${max}` }), _jsx(BlockBanner, {}), _jsxs("div", { className: "board-screen", children: [_jsx("div", { className: "board-col", children: _jsx(Board, { fen: fen ?? q.fen, orientation: q.side, movable: step === 'move' && !moveResult ? q.side : null, onMove: onMove, arrows: arrows }) }), _jsxs("div", { className: "side-col", children: [step === 'name' && (_jsxs("div", { className: "stack", children: [_jsx("h3", { children: label === 'families' ? 'Which opening is this?' : label === 'variations' ? 'Which variation is this?' : 'Which line is this?' }), _jsx("div", { className: "quiz-options", children: q.options.map((o) => {
                                            const state = picked ? (o === q.answer ? 'right' : o === picked ? 'wrong' : '') : '';
                                            return (_jsxs("button", { className: `quiz-option ${state}`, onClick: () => pick(o), disabled: !!picked, children: [state === 'right' && _jsx(Check, { size: 16 }), state === 'wrong' && _jsx(X, { size: 16 }), _jsx("span", { children: o })] }, o));
                                        }) }), !picked && !showMoves && (_jsxs("button", { className: "link-btn", onClick: () => setShowMoves(true), children: [_jsx(Eye, { size: 14 }), " Show the moves (no point for the name)"] })), showMoves && _jsx("p", { className: "muted small num", children: formatLine(START_FEN, q.sans) }), picked && (_jsxs(_Fragment, { children: [q.note && _jsx("p", { className: "muted small", children: q.note }), _jsx(Button, { icon: _jsx(ArrowRight, { size: 16 }), onClick: () => setStep('move'), children: "Now play the next move" })] }))] })), step === 'move' && (_jsxs("div", { className: "stack", children: [_jsxs("h3", { children: [q.side === 'w' ? 'White' : 'Black', " to move \u2014 what does theory play?"] }), _jsx("p", { className: "muted small num", children: formatLine(START_FEN, q.sans) }), moveResult && (_jsx("div", { className: `feedback ${moveResult.ok ? 'feedback-good' : 'feedback-bad'}`, children: _jsx("span", { children: moveResult.ok
                                                ? moveResult.also
                                                    ? `${moveResult.san} is theory too. The main move here is ${q.next}.`
                                                    : `${moveResult.san} — the main line.`
                                                : `${moveResult.san} isn’t theory here. The main move is ${q.next}.` }) })), moveResult && _jsx(Button, { icon: _jsx(ArrowRight, { size: 16 }), onClick: next, children: i + 1 >= questions.length ? 'See results' : 'Next position' })] }))] })] })] }));
}
