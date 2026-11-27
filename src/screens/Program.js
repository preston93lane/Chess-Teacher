import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMemo, useState } from 'react';
import { ArrowRight, Check, CheckCircle2, ChevronDown, Flag, Play } from 'lucide-react';
import { PROGRAMS, allDays, currentDay, getProgram, isCheckpointWeek, withBlock } from '../lib/program';
import { useApp } from '../lib/store/app';
import { estimateRating } from '../lib/plan';
import { navigate } from '../lib/router';
import { Button, Header, Section, Segmented, Sheet } from '../components/ui';
const KIND_LABEL = {
    puzzles: 'Warm-up',
    mix: 'Review',
    lesson: 'Lesson',
    learn: 'Opening',
    classic: 'Classic game',
    quiz: 'Quiz',
    game: 'Game',
    review: 'Review',
    rush: 'Checkpoint',
    recap: 'Recap',
};
export function BlockList({ day, compact }) {
    const program = useApp((s) => s.program);
    const complete = useApp((s) => s.completeBlock);
    if (!program)
        return null;
    return (_jsx("ol", { className: "session", children: day.blocks.map((b, i) => {
            const done = program.done.includes(b.id);
            return (_jsx("li", { children: _jsxs("div", { className: `session-step program-block${done ? ' is-done' : ''}`, children: [_jsx("span", { className: "session-num", children: done ? _jsx(Check, { size: 30 }) : i + 1 }), _jsxs("button", { className: "session-main", onClick: () => navigate(withBlock(b.to, b.id)), children: [_jsxs("span", { className: "session-kind", children: [KIND_LABEL[b.kind], " \u00B7 ", b.minutes, " min"] }), _jsx("span", { className: "session-title", children: b.title }), !compact && _jsx("span", { className: "session-detail", children: b.detail })] }), done ? (_jsx("span", { className: "block-done-tag", children: "Done" })) : (_jsx("button", { className: "link-btn small block-mark", onClick: () => complete(b.id), title: "Mark as done", children: "Mark done" }))] }) }, b.id));
        }) }));
}
export function ProgramScreen() {
    const program = useApp((s) => s.program);
    const stop = useApp((s) => s.stopProgram);
    const [confirmStop, setConfirmStop] = useState(false);
    if (!program)
        return _jsx(ProgramPicker, {});
    const t = getProgram(program.templateId);
    if (!t)
        return _jsx(ProgramPicker, {});
    return _jsx(ActiveProgramView, { onStop: () => setConfirmStop(true), confirmStop: confirmStop, setConfirmStop: setConfirmStop, stop: stop });
}
function ActiveProgramView({ onStop, confirmStop, setConfirmStop, stop }) {
    const program = useApp((s) => s.program);
    const puzzles = useApp((s) => s.puzzles);
    const t = getProgram(program.templateId);
    const days = useMemo(() => allDays(t, program), [t, program]);
    const today = currentDay(program);
    const totalBlocks = days.reduce((a, d) => a + d.blocks.length, 0);
    const pct = Math.round((program.done.length / totalBlocks) * 100);
    const [openWeek, setOpenWeek] = useState(today?.week ?? null);
    return (_jsxs("div", { className: "page", children: [_jsx(Header, { title: t.title, backTo: "/train", sub: `${program.daysPerWeek} days a week · about ${program.minutesPerDay} minutes a day` }), _jsxs("div", { className: "program-progress", children: [_jsxs("div", { children: [_jsxs("span", { className: "program-pct num", children: [pct, "%"] }), _jsx("span", { className: "muted small", children: "complete" })] }), _jsx("span", { className: "meter program-meter", children: _jsx("span", { className: "meter-fill", style: { width: `${pct}%` } }) })] }), today ? (_jsxs(Section, { title: `Week ${today.week}, day ${today.day}: ${today.title}`, children: [today.week && _jsx("p", { className: "muted mb8", children: today.review ? (today.checkpoint ? 'Checkpoint day — review everything so far, then measure your progress.' : 'Review day — everything due, plus earlier weeks mixed back in.') : t.weeks[today.week - 1].focus }), _jsx(BlockList, { day: today })] })) : (_jsx(Section, { title: "Program complete", children: _jsx("p", { className: "muted", children: "Every session done. Compare your checkpoints below, then start another program." }) })), _jsx(Section, { title: "Progress checkpoints", children: _jsxs("table", { className: "class-table", children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", {}), _jsx("th", { children: "Puzzle rating" }), _jsx("th", { children: "Rush (survival)" })] }) }), _jsxs("tbody", { children: [_jsxs("tr", { children: [_jsx("td", { children: "Start" }), _jsx("td", { className: "num", children: program.baseline.puzzleRating }), _jsx("td", { className: "num", children: program.baseline.rush })] }), program.checkpoints.map((c) => (_jsxs("tr", { children: [_jsxs("td", { children: ["Week ", c.week] }), _jsxs("td", { className: "num", children: [c.puzzleRating, " ", _jsxs("span", { className: c.puzzleRating >= program.baseline.puzzleRating ? 'tone-text-best' : 'tone-text-mistake', children: ["(", c.puzzleRating - program.baseline.puzzleRating >= 0 ? '+' : '', c.puzzleRating - program.baseline.puzzleRating, ")"] })] }), _jsx("td", { className: "num", children: c.rush })] }, c.week))), _jsxs("tr", { children: [_jsx("td", { className: "muted", children: "Now" }), _jsx("td", { className: "num muted", children: puzzles.rating }), _jsx("td", { className: "num muted", children: puzzles.rush.survival ?? 0 })] })] })] }) }), _jsx(Section, { title: "The whole plan", children: _jsx("div", { className: "week-list", children: t.weeks.map((wk, wi) => {
                        const w = wi + 1;
                        const wDays = days.filter((d) => d.week === w);
                        const wBlocks = wDays.flatMap((d) => d.blocks);
                        const wDone = wBlocks.filter((b) => program.done.includes(b.id)).length;
                        const open = openWeek === w;
                        return (_jsxs("div", { className: `week${open ? ' is-open' : ''}`, children: [_jsxs("button", { className: "week-head", onClick: () => setOpenWeek(open ? null : w), "aria-expanded": open, children: [_jsx("span", { className: "week-num num", children: wDone === wBlocks.length ? _jsx(CheckCircle2, { size: 22 }) : w }), _jsxs("span", { className: "week-main", children: [_jsxs("span", { className: "week-title", children: [wk.title, isCheckpointWeek(t, w) && _jsx(Flag, { size: 14, className: "week-flag" })] }), _jsx("span", { className: "muted small", children: wk.focus })] }), _jsxs("span", { className: "muted small num", children: [wDone, "/", wBlocks.length] }), _jsx(ChevronDown, { size: 18, className: "week-chevron" })] }), open && (_jsx("div", { className: "week-days", children: wDays.map((d) => (_jsxs("div", { className: "week-day", children: [_jsxs("h4", { children: ["Day ", d.day, ": ", d.title] }), _jsx(BlockList, { day: d, compact: true })] }, d.day))) }))] }, w));
                    }) }) }), _jsx("div", { className: "row mt24", children: _jsx(Button, { variant: "danger", size: "sm", onClick: onStop, children: "Leave program" }) }), _jsxs(Sheet, { open: confirmStop, onClose: () => setConfirmStop(false), title: "Leave this program?", children: [_jsx("p", { className: "muted", children: "Your progress in it is discarded. Your games, puzzles and review cards stay." }), _jsxs("div", { className: "row mt16", children: [_jsx(Button, { variant: "danger", onClick: () => { stop(); setConfirmStop(false); }, children: "Leave program" }), _jsx(Button, { variant: "ghost", onClick: () => setConfirmStop(false), children: "Keep going" })] })] })] }));
}
function ProgramPicker() {
    const start = useApp((s) => s.startProgram);
    const puzzles = useApp((s) => s.puzzles);
    const games = useApp((s) => s.games);
    const [pick, setPick] = useState(PROGRAMS[0].id);
    const [days, setDays] = useState('5');
    const [minutes, setMinutes] = useState('40');
    const t = getProgram(pick);
    const preview = useMemo(() => allDays(t, { daysPerWeek: +days, minutesPerDay: +minutes }).slice(0, +days), [t, days, minutes]);
    return (_jsxs("div", { className: "page page-narrow", children: [_jsx(Header, { title: "Training programs", backTo: "/train", sub: "A regimen with daily lesson plans, weekly review days and progress checkpoints." }), _jsx(Section, { title: "Choose a program", children: _jsx("div", { className: "stack", children: PROGRAMS.map((p) => (_jsxs("button", { className: `source-card${pick === p.id ? ' is-on' : ''}`, onClick: () => setPick(p.id), children: [_jsx("span", { className: "source-title", children: p.title }), _jsx("span", { className: "muted small", children: p.summary }), _jsxs("span", { className: "faint small", children: [p.weeks.length, " weeks \u00B7 ", p.level] })] }, p.id))) }) }), _jsxs(Section, { title: "Your schedule", children: [_jsxs("div", { className: "field", children: [_jsx("span", { className: "field-label", children: "Days per week (the last one is a review day)" }), _jsx(Segmented, { value: days, onChange: setDays, options: [{ value: '3', label: '3' }, { value: '5', label: '5' }, { value: '7', label: '7' }] })] }), _jsxs("div", { className: "field mt16", children: [_jsx("span", { className: "field-label", children: "Minutes per day" }), _jsx(Segmented, { value: minutes, onChange: setMinutes, options: [{ value: '20', label: '20' }, { value: '40', label: '40' }, { value: '60', label: '60' }] })] })] }), _jsx(Section, { title: "Week 1 at a glance", children: _jsx("ul", { className: "bullets", children: preview.map((d) => (_jsxs("li", { children: [_jsxs("strong", { children: ["Day ", d.day, d.review ? ' (review)' : '', ":"] }), " ", _jsx("span", { className: "muted", children: d.blocks.map((b) => b.title).join(' · ') })] }, d.day))) }) }), _jsx("div", { className: "sticky-cta", children: _jsxs(Button, { size: "lg", className: "btn-block", icon: _jsx(Play, { size: 18 }), onClick: () => start({
                        templateId: pick,
                        daysPerWeek: +days,
                        minutesPerDay: +minutes,
                        baseline: { puzzleRating: puzzles.rating, botRating: estimateRating(games), rush: puzzles.rush.survival ?? 0 },
                    }), children: ["Start ", t.title] }) })] }));
}
export function ProgramTodayCard() {
    const program = useApp((s) => s.program);
    if (!program)
        return null;
    const t = getProgram(program.templateId);
    const day = currentDay(program);
    if (!t)
        return null;
    return (_jsxs("div", { className: "program-today", children: [_jsxs("div", { className: "program-today-head", children: [_jsxs("div", { children: [_jsx("p", { className: "today-date", children: t.title }), _jsx("h2", { children: day ? `Week ${day.week}, day ${day.day}: ${day.title}` : 'Program complete' })] }), _jsxs("button", { className: "link-btn", onClick: () => navigate('/program'), children: ["Full plan ", _jsx(ArrowRight, { size: 14 })] })] }), day && _jsx(BlockList, { day: day })] }));
}
