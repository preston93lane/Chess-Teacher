import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, Crosshair, Database, Eye, Swords } from 'lucide-react';
import { getLesson } from '../data/lessons';
import { Chess } from '../lib/chess/core';
import { uciOf } from '../lib/chess/core';
import { parseMovetext } from '../lib/chess/pgn';
import { useApp } from '../lib/store/app';
import { navigate } from '../lib/router';
import { engine } from '../lib/engine/stockfish';
import { lineScore, winPct } from '../lib/coach/eval';
import { soundForSan, playSound } from '../lib/sound';
import { FollowUpPanel } from '../components/FollowUp';
import { Board } from '../components/Board';
import { Button, Header, Spinner, NextDock } from '../components/ui';
import { BlockBanner, completeBlock, useBlockId } from '../components/BlockBanner';
function sectionPosition(s) {
    const c = new Chess(s.fen);
    let last = null;
    if (s.pgn) {
        for (const m of parseMovetext(s.pgn).sans) {
            const mv = c.move(m.san);
            last = [mv.from, mv.to];
        }
    }
    return { fen: c.fen(), last };
}
function parseArrows(list) {
    return (list ?? []).map((a) => {
        const [prefix, body] = a.includes(':') ? a.split(':') : ['g', a];
        return { from: body.slice(0, 2), to: body.slice(2, 4), color: prefix };
    });
}
export function LessonScreen({ id }) {
    const lesson = getLesson(id);
    const progress = useApp((s) => s.lessons[id]);
    const solveTask = useApp((s) => s.solveLessonTask);
    const complete = useApp((s) => s.completeLesson);
    const markPlanStep = useApp((s) => s.markPlanStep);
    const [index, setIndex] = useState(0);
    const blockId = useBlockId();
    if (!lesson)
        return _jsx("div", { className: "page", children: _jsx(Header, { title: "Lesson not found", backTo: "/train" }) });
    const section = lesson.sections[index];
    const tasks = lesson.sections.filter((s) => s.task).length;
    const last = index === lesson.sections.length - 1;
    const finish = () => {
        complete(id);
        markPlanStep(`lesson:${id}`);
        if (completeBlock(blockId) || blockId)
            navigate('/program');
        else
            navigate('/train');
    };
    return (_jsxs("div", { className: "page board-screen-page", children: [_jsx(Header, { title: lesson.title, backTo: "/train", sub: `${lesson.track} · ${lesson.minutes} min · ${progress?.completed ? 'Completed' : `${progress?.solved.length ?? 0}/${tasks} tasks solved`}` }), _jsx(BlockBanner, {}), _jsx("div", { className: "lesson-steps", "aria-label": "Lesson sections", children: lesson.sections.map((s, i) => (_jsx("button", { className: `lesson-step${i === index ? ' is-on' : ''}${progress?.solved.includes(String(i)) ? ' is-done' : ''}`, onClick: () => setIndex(i), "aria-label": `Section ${i + 1}: ${s.title}`, children: _jsx("span", { className: "num", children: i + 1 }) }, i))) }), _jsx(SectionView, { section: section, solved: !!progress?.solved.includes(String(index)), onSolved: () => solveTask(id, String(index), tasks) }, `${id}-${index}`), _jsxs("div", { className: "lesson-nav", children: [_jsx(Button, { variant: "ghost", icon: _jsx(ArrowLeft, { size: 16 }), disabled: index === 0, onClick: () => setIndex(index - 1), children: "Previous" }), last ? (_jsx(Button, { icon: _jsx(Check, { size: 16 }), onClick: finish, children: "Complete lesson" })) : (_jsx(Button, { icon: _jsx(ArrowRight, { size: 16 }), onClick: () => setIndex(index + 1), children: "Next" }))] }), section.task && progress?.solved.includes(String(index)) && (_jsx(NextDock, { children: last ? (_jsx(Button, { icon: _jsx(Check, { size: 16 }), onClick: finish, children: "Complete lesson" })) : (_jsx(Button, { icon: _jsx(ArrowRight, { size: 16 }), onClick: () => setIndex(index + 1), children: "Next" })) }))] }));
}
function SectionView({ section, solved, onSolved }) {
    const base = useMemo(() => sectionPosition(section), [section]);
    const [fen, setFen] = useState(base.fen);
    const [lastMove, setLastMove] = useState(base.last);
    const [state, setState] = useState(solved ? 'right' : 'idle');
    const [message, setMessage] = useState(null);
    const [tries, setTries] = useState(0);
    const [reveal, setReveal] = useState(false);
    const [played, setPlayed] = useState(null);
    const [tried, setTried] = useState([]);
    const turn = base.fen.split(' ')[1];
    const orientation = section.orientation ?? (section.task ? turn : section.practice?.side ?? 'w');
    const task = section.task;
    useEffect(() => {
        setFen(base.fen);
        setLastMove(base.last);
    }, [base]);
    const reset = () => {
        setFen(base.fen);
        setLastMove(base.last);
    };
    const onMove = async (mv) => {
        if (!task || state === 'checking')
            return;
        const c = new Chess(base.fen);
        let m;
        try {
            m = c.move(mv);
        }
        catch {
            return;
        }
        soundForSan(m.san);
        setFen(c.fen());
        setLastMove([m.from, m.to]);
        const t = tries + 1;
        setTries(t);
        if (task.accept.includes(m.san)) {
            setPlayed(uciOf(m));
            setState('right');
            playSound('good');
            setMessage(task.accept[0] === m.san ? task.explain : `${m.san} works. ${task.explain}`);
            onSolved();
            return;
        }
        setState('checking');
        try {
            const [mine, top] = await Promise.all([engine.analyze(c.fen(), { depth: 12 }), engine.analyze(base.fen, { depth: 12 })]);
            const diff = winPct(lineScore(top.lines[0]), turn) - winPct(lineScore(mine.lines[0]), turn);
            if (diff <= 4) {
                setPlayed(uciOf(m));
                setState('right');
                playSound('good');
                setMessage(`${m.san} is also a good move by engine standards. The lesson’s idea: ${task.accept[0]}. ${task.explain}`);
                onSolved();
            }
            else {
                setState('wrong');
                setTried((x) => (x.includes(uciOf(m)) ? x : [...x, uciOf(m)]));
                playSound('bad');
                setMessage(t >= 2 ? `Not quite. ${task.hint ?? ''} The answer is shown on the board.` : `${m.san} misses the point. ${task.hint ?? 'Try again.'}`);
                if (t >= 2)
                    setReveal(true);
                setTimeout(reset, 900);
            }
        }
        catch {
            setState('idle');
            reset();
        }
    };
    const answerArrow = useMemo(() => {
        if (!task || !reveal)
            return [];
        const c = new Chess(base.fen);
        try {
            const m = c.move(task.accept[0]);
            return [{ from: m.from, to: m.to, color: 'y' }];
        }
        catch {
            return [];
        }
    }, [task, reveal, base.fen]);
    const showDiagramArrows = !task || state === 'right';
    // The move to explain: yours if it was right, else the lesson's answer once shown.
    const explainUci = useMemo(() => {
        if (!task || (state !== 'right' && !reveal))
            return null;
        if (played)
            return played;
        try {
            return uciOf(new Chess(base.fen).move(task.accept[0]));
        }
        catch {
            return null;
        }
    }, [task, state, reveal, played, base.fen]);
    const marks = (section.marks ?? []).map((sq) => ({ sq, color: 'plan' }));
    const hasBoard = !!(section.pgn || section.fen);
    return (_jsxs("div", { className: "board-screen lesson-body", children: [hasBoard && (_jsx("div", { className: "board-col", children: _jsx(Board, { fen: fen, orientation: orientation, movable: task && state !== 'right' && state !== 'checking' ? turn : null, onMove: onMove, lastMove: lastMove, arrows: [...(showDiagramArrows ? parseArrows(section.arrows) : []), ...answerArrow], marks: task && state !== 'right' ? [] : marks }) })), _jsxs("div", { className: "side-col", children: [_jsx("h2", { className: "lesson-section-title", children: section.title }), _jsx("div", { className: "prose", children: section.text.map((p, i) => (_jsx("p", { children: p }, i))) }), task && (_jsxs("div", { className: `task task-${state}`, children: [_jsx("p", { className: "task-prompt", children: task.prompt }), state === 'checking' && _jsx(Spinner, { label: "Checking with the engine\u2026" }), message && _jsx("p", { className: "task-message", children: message }), state !== 'right' && !reveal && (_jsxs("button", { className: "link-btn", onClick: () => setReveal(true), children: [_jsx(Eye, { size: 14 }), " Show the answer"] }))] })), explainUci && _jsx(FollowUpPanel, { fen: base.fen, uci: explainUci, tried: tried }), section.practice && (_jsx(Button, { variant: "secondary", icon: _jsx(Swords, { size: 16 }), onClick: () => navigate(`/play?fen=${encodeURIComponent(base.fen)}&side=${section.practice.side}`), children: section.practice.prompt })), section.explore && (_jsx(Button, { variant: "secondary", icon: _jsx(Database, { size: 16 }), onClick: () => navigate(section.pgn ? `/explorer?moves=${encodeURIComponent(section.pgn)}` : `/explorer?fen=${encodeURIComponent(base.fen)}`), children: "Master games from here" })), section.drill && (_jsx(Button, { variant: "secondary", icon: _jsx(Crosshair, { size: 16 }), onClick: () => navigate(`/endgames/${section.drill}`), children: "Drill it against the engine" }))] })] }));
}
