import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { CheckCircle2, ListChecks } from 'lucide-react';
import { useApp } from '../lib/store/app';
import { findBlock } from '../lib/program';
import { navigate, query, useRoute } from '../lib/router';
export function useBlockId() {
    const path = useRoute();
    return query(path).get('block');
}
/** Shown on screens launched from a training-program day. */
export function BlockBanner({ id }) {
    const routeId = useBlockId();
    const blockId = id ?? routeId;
    const program = useApp((s) => s.program);
    const found = findBlock(program, blockId);
    if (!found || !program)
        return null;
    const done = program.done.includes(found.block.id);
    return (_jsxs("div", { className: `block-banner${done ? ' is-done' : ''}`, children: [done ? _jsx(CheckCircle2, { size: 18 }) : _jsx(ListChecks, { size: 18 }), _jsxs("span", { className: "block-banner-text", children: [_jsxs("span", { className: "block-banner-day", children: ["Week ", found.day.week, " \u00B7 Day ", found.day.day] }), _jsx("span", { className: "block-banner-title", children: found.block.title })] }), _jsx("button", { className: "link-btn", onClick: () => navigate('/program'), children: done ? 'Done — back to plan' : 'Today’s plan' })] }));
}
export function completeBlock(id) {
    return useApp.getState().completeBlock(id);
}
