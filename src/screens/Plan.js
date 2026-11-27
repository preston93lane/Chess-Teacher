import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Check, ArrowRight } from 'lucide-react';
import { TRACKS, getTrack } from '../lib/plan';
import { useApp } from '../lib/store/app';
import { navigate } from '../lib/router';
import { Button, Header, Section } from '../components/ui';
const KIND = { lesson: 'Lesson', learn: 'Opening line', play: 'Practice game', drill: 'Drill', review: 'Review', analyse: 'Game review' };
export function PlanScreen() {
    const plan = useApp((s) => s.plan);
    const setPlan = useApp((s) => s.setPlan);
    const lessons = useApp((s) => s.lessons);
    const cards = useApp((s) => s.cards);
    const track = plan ? getTrack(plan.trackId) : undefined;
    const isDone = (stepId) => {
        if (plan?.done.includes(stepId))
            return true;
        const [kind, a, b, c] = stepId.split(':');
        if (kind === 'lesson')
            return !!lessons[a]?.completed;
        if (kind === 'learn')
            return !!cards[`line:${a}:${b}:${c}`];
        return false;
    };
    return (_jsxs("div", { className: "page page-narrow", children: [_jsx(Header, { title: "Training plan", backTo: "/train", sub: "A track sets the order; the daily session mixes it with reviews and games." }), track && (_jsxs(Section, { title: track.title, action: _jsx("button", { className: "link-btn", onClick: () => setPlan(null), children: "Leave plan" }), children: [_jsx("p", { className: "muted", children: track.summary }), _jsx("ol", { className: "plan-steps mt16", children: track.steps.map((st, i) => {
                            const done = isDone(st.id);
                            return (_jsxs("li", { className: `plan-step${done ? ' is-done' : ''}`, children: [_jsx("span", { className: "plan-step-num num", children: done ? _jsx(Check, { size: 16 }) : i + 1 }), _jsxs("button", { className: "plan-step-body", onClick: () => navigate(st.to), children: [_jsxs("span", { className: "plan-step-kind", children: [KIND[st.kind], " \u00B7 ", st.minutes, " min"] }), _jsx("span", { className: "plan-step-title", children: st.title }), _jsx("span", { className: "plan-step-detail", children: st.detail })] })] }, st.id));
                        }) })] })), _jsx(Section, { title: track ? 'Other tracks' : 'Choose a track', children: _jsx("div", { className: "stack", children: TRACKS.filter((t) => t.id !== track?.id).map((t) => (_jsxs("div", { className: "panel track-card", children: [_jsxs("div", { className: "track-card-head", children: [_jsx("h3", { children: t.title }), _jsx("span", { className: "chip", children: t.level })] }), _jsx("p", { className: "muted mt8", children: t.summary }), _jsxs("p", { className: "faint small mt8", children: [t.steps.length, " steps \u00B7 ", t.steps.reduce((a, s) => a + s.minutes, 0), " min total"] }), _jsx(Button, { size: "sm", className: "mt12", icon: _jsx(ArrowRight, { size: 16 }), onClick: () => setPlan({ trackId: t.id, startedAt: Date.now(), done: t.steps.filter((s) => isDone(s.id)).map((s) => s.id) }), children: track ? 'Switch to this track' : 'Start this track' })] }, t.id))) }) })] }));
}
