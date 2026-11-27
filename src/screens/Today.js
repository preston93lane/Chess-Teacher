import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMemo } from 'react';
import { ArrowRight, Flame, Settings as SettingsIcon, Swords, Upload, Microscope } from 'lucide-react';
import { useApp, streak, dueCards, dueDrills, today } from '../lib/store/app';
import { dailySession, estimateRating, getTrack, findWeaknesses } from '../lib/plan';
import { navigate } from '../lib/router';
import { IconButton, Section } from '../components/ui';
import { OPENINGS } from '../data/openings';
import { ProgramTodayCard } from './Program';
import { currentDay } from '../lib/program';
import { WeeklyCard } from './WeeklyReport';
const KIND_LABEL = {
    review: 'Review',
    analyse: 'Game review',
    lesson: 'Lesson',
    learn: 'Opening',
    drill: 'Drill',
    play: 'Play',
};
export function Today() {
    const s = useApp();
    const steps = useMemo(() => dailySession({
        cards: s.cards,
        games: s.games,
        plan: s.plan,
        lessons: s.lessons,
        repertoire: s.repertoire,
        dailyPuzzleDone: s.puzzles.dailyDone === today(),
        dueDrills: dueDrills(s.drills),
    }), [s.cards, s.games, s.plan, s.lessons, s.repertoire, s.puzzles.dailyDone, s.drills]);
    const days = streak(s.activity);
    const due = dueCards(s.cards).length;
    const rating = estimateRating(s.games);
    const track = s.plan ? getTrack(s.plan.trackId) : undefined;
    const trackPct = track ? Math.round((s.plan.done.length / track.steps.length) * 100) : 0;
    const reviewed = s.games.filter((g) => g.reviewed && g.myColor && g.accuracy).slice(0, 12).reverse();
    const weaknesses = findWeaknesses(s.games);
    const todayAct = s.activity[today()];
    const programDay = s.program ? currentDay(s.program) : null;
    const extra = s.program ? steps.filter((st) => st.kind === 'review' || st.kind === 'analyse' || st.id === 'endgame-review') : steps;
    const openBlocks = programDay ? programDay.blocks.filter((b) => !s.program.done.includes(b.id)) : [];
    const stepCount = extra.length + openBlocks.length;
    const totalMinutes = extra.reduce((a, b) => a + b.minutes, 0) + openBlocks.reduce((a, b) => a + b.minutes, 0);
    const cardsTotal = Object.keys(s.cards).length;
    const lessonsDone = Object.values(s.lessons).filter((l) => l.completed).length;
    return (_jsxs("div", { className: "page today", children: [_jsxs("header", { className: "today-head", children: [_jsxs("div", { children: [_jsx("p", { className: "today-date", children: new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' }) }), _jsx("h1", { className: "today-title", children: "Today\u2019s session" }), _jsxs("p", { className: "today-sub", children: [stepCount, " step", stepCount === 1 ? '' : 's', " \u00B7 about ", totalMinutes, " min"] })] }), _jsx("div", { className: "today-head-actions", children: _jsx(IconButton, { label: "Settings", onClick: () => navigate('/settings'), className: "mobile-only", children: _jsx(SettingsIcon, { size: 22 }) }) })] }), _jsxs("div", { className: "today-grid", children: [_jsxs("div", { className: "today-main", children: [s.program && _jsx(ProgramTodayCard, {}), s.program && extra.length > 0 && _jsx("h3", { className: "also-today", children: "Also today" }), _jsx("ol", { className: "session", children: extra.map((st, i) => (_jsx("li", { children: _jsxs("button", { className: "session-step", onClick: () => navigate(st.to), children: [_jsx("span", { className: "session-num", children: i + 1 }), _jsxs("span", { className: "session-main", children: [_jsxs("span", { className: "session-kind", children: [KIND_LABEL[st.kind], " \u00B7 ", st.minutes, " min"] }), _jsx("span", { className: "session-title", children: st.title }), st.detail && _jsx("span", { className: "session-detail", children: st.detail })] }), _jsx(ArrowRight, { size: 20, className: "session-go" })] }) }, st.id))) }), !s.program && (_jsxs("button", { className: "program-cta", onClick: () => navigate('/program'), children: [_jsxs("span", { children: [_jsx("strong", { children: "Start a training program" }), _jsx("span", { className: "muted small", children: "Daily lesson plans, weekly review days and checkpoints \u2014 4 to 8 weeks." })] }), _jsx(ArrowRight, { size: 18 })] }))] }), _jsxs("aside", { className: "today-side", children: [_jsxs("div", { className: "stat-strip", children: [_jsxs("div", { className: "stat", children: [_jsxs("span", { className: "stat-value num", children: [days, days > 0 && _jsx(Flame, { size: 20, className: "stat-flame" })] }), _jsx("span", { className: "stat-label", children: "day streak" })] }), _jsxs("div", { className: "stat", children: [_jsx("span", { className: "stat-value num", children: due }), _jsx("span", { className: "stat-label", children: "cards due" })] }), _jsxs("div", { className: "stat", children: [_jsx("span", { className: "stat-value num", children: rating }), _jsx("span", { className: "stat-label", children: "est. rating vs bots" })] }), _jsxs("div", { className: "stat", children: [_jsx("span", { className: "stat-value num", children: s.puzzles.rating }), _jsx("span", { className: "stat-label", children: "puzzle rating" })] })] }), todayAct && (_jsxs("p", { className: "today-done muted", children: ["Done today: ", [todayAct.reviews && `${todayAct.reviews} reviews`, todayAct.lines && `${todayAct.lines} lines`, todayAct.lessons && `${todayAct.lessons} lessons`, todayAct.games && `${todayAct.games} games`].filter(Boolean).join(', ') || 'nothing yet'] })), _jsx(WeeklyCard, {}), _jsxs("div", { className: "quick-actions", children: [_jsxs("button", { className: "quick", onClick: () => navigate('/play'), children: [_jsx(Swords, { size: 20 }), _jsx("span", { children: "Play the coach" })] }), _jsxs("button", { className: "quick", onClick: () => navigate('/analysis'), children: [_jsx(Microscope, { size: 20 }), _jsx("span", { children: "Analysis board" })] }), _jsxs("button", { className: "quick", onClick: () => navigate('/import'), children: [_jsx(Upload, { size: 20 }), _jsx("span", { children: "Import games" })] })] })] })] }), _jsx(Section, { title: "Your plan", action: _jsx("button", { className: "link-btn", onClick: () => navigate('/train/plan'), children: track ? 'Change' : 'Choose a plan' }), children: track ? (_jsxs("button", { className: "plan-card", onClick: () => navigate('/train/plan'), children: [_jsx("span", { className: "plan-card-title", children: track.title }), _jsxs("span", { className: "plan-card-sub", children: [s.plan.done.length, " of ", track.steps.length, " steps \u00B7 ", trackPct, "%"] }), _jsx("span", { className: "meter", children: _jsx("span", { className: "meter-fill", style: { width: `${trackPct}%` } }) })] })) : (_jsx("p", { className: "muted", children: "Pick a training track \u2014 openings, structures or endgames \u2014 and the daily session will follow it." })) }), _jsx(Section, { title: "Progress", action: _jsxs("button", { className: "link-btn", onClick: () => navigate('/insights'), children: ["All insights ", _jsx(ArrowRight, { size: 14 })] }), children: _jsxs("div", { className: "progress-grid", children: [_jsxs("div", { className: "panel panel-tight", children: [_jsxs("h4", { children: ["Accuracy, last ", reviewed.length || 0, " reviewed games"] }), reviewed.length >= 2 ? (_jsx(Sparkline, { values: reviewed.map((g) => g.accuracy[g.myColor]) })) : (_jsx("p", { className: "muted small", children: "Play or import games and run a coach review to see your trend." }))] }), _jsxs("div", { className: "panel panel-tight", children: [_jsx("h4", { children: "Training totals" }), _jsxs("dl", { className: "totals", children: [_jsxs("div", { children: [_jsx("dt", { children: "Games" }), _jsx("dd", { className: "num", children: s.games.length })] }), _jsxs("div", { children: [_jsx("dt", { children: "Review cards" }), _jsx("dd", { className: "num", children: cardsTotal })] }), _jsxs("div", { children: [_jsx("dt", { children: "Lessons done" }), _jsx("dd", { className: "num", children: lessonsDone })] }), _jsxs("div", { children: [_jsx("dt", { children: "Openings in repertoire" }), _jsxs("dd", { className: "num", children: [Object.keys(s.repertoire).length, "/", OPENINGS.length] })] })] })] }), weaknesses.length > 0 && (_jsxs("div", { className: "panel panel-tight", children: [_jsx("h4", { children: "What the coach sees" }), _jsx("ul", { className: "bullets", children: weaknesses.map((w) => (_jsxs("li", { children: [_jsxs("strong", { children: [w.label, "."] }), " ", _jsx("span", { className: "muted", children: w.detail })] }, w.id))) })] }))] }) })] }));
}
function Sparkline({ values }) {
    const W = 300;
    const H = 70;
    const min = Math.min(...values, 50);
    const max = Math.max(...values, 100);
    const pts = values.map((v, i) => [(i / Math.max(1, values.length - 1)) * W, H - ((v - min) / (max - min || 1)) * (H - 10) - 5]);
    const d = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
    const last = values[values.length - 1];
    return (_jsxs("div", { className: "spark", children: [_jsxs("svg", { viewBox: `0 0 ${W} ${H}`, preserveAspectRatio: "none", className: "spark-svg", "aria-hidden": true, children: [_jsx("path", { d: d, className: "spark-line", vectorEffect: "non-scaling-stroke" }), pts.map(([x, y], i) => (_jsx("circle", { cx: x, cy: y, r: 2.6, className: "spark-dot" }, i)))] }), _jsxs("span", { className: "spark-last num", children: [Math.round(last), "%"] })] }));
}
