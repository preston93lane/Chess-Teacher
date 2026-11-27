import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { ArrowRight, Check, Puzzle } from 'lucide-react';
import { COURSES, getCourse } from '../data/courses';
import { getLesson } from '../data/lessons';
import { THEME_INFO } from '../lib/puzzles';
import { useApp } from '../lib/store/app';
import { navigate } from '../lib/router';
import { Empty, Header, Section } from '../components/ui';
function lessonProgress(c, lessons) {
    const ids = c.sections.flatMap((s) => s.items.filter((i) => i.kind === 'lesson').map((i) => i.id));
    return { done: ids.filter((id) => lessons[id]?.completed).length, total: ids.length };
}
export function CoursesHub() {
    const lessons = useApp((s) => s.lessons);
    return (_jsxs("div", { className: "page", children: [_jsx(Header, { title: "Courses", backTo: "/train", sub: "Structured paths through one skill each: lessons with engine-checked tasks, trainers, and themed puzzles from real games." }), _jsx("div", { className: "course-grid", children: COURSES.map((c) => {
                    const p = lessonProgress(c, lessons);
                    return (_jsxs("button", { className: "course-card", onClick: () => navigate(c.to ?? `/courses/${c.id}`), children: [_jsx("span", { className: "course-card-title", children: c.title }), _jsx("span", { className: "muted small", children: c.blurb }), p.total > 0 && (_jsxs("span", { className: "course-card-progress", children: [_jsx("span", { className: "meter", children: _jsx("span", { className: "meter-fill", style: { width: `${(p.done / p.total) * 100}%` } }) }), _jsxs("span", { className: "faint small num", children: [p.done, "/", p.total, " lessons"] })] }))] }, c.id));
                }) })] }));
}
export function CourseScreen({ id }) {
    const c = getCourse(id);
    const lessons = useApp((s) => s.lessons);
    if (!c) {
        return (_jsxs("div", { className: "page", children: [_jsx(Header, { title: "Course", backTo: "/courses" }), _jsx(Empty, { title: "Course not found" })] }));
    }
    return (_jsxs("div", { className: "page page-narrow", children: [_jsx(Header, { title: c.title, backTo: "/courses", sub: c.blurb }), c.sections.map((s) => (_jsxs(Section, { title: s.title, children: [s.text && _jsx("p", { className: "muted mb8", children: s.text }), _jsx("div", { className: s.items.every((i) => i.kind === 'puzzles') ? 'chip-row' : 'list', children: s.items.map((item, i) => {
                            if (item.kind === 'lesson') {
                                const l = getLesson(item.id);
                                if (!l)
                                    return null;
                                const done = lessons[l.id]?.completed;
                                return (_jsxs("button", { className: "list-item", onClick: () => navigate(`/train/lesson/${l.id}`), children: [_jsx("span", { className: `lesson-check${done ? ' is-done' : ''}`, children: done ? _jsx(Check, { size: 16 }) : null }), _jsxs("span", { className: "list-item-main", children: [_jsx("span", { className: "list-item-title", children: l.title }), _jsx("span", { className: "list-item-sub", children: l.summary })] }), _jsxs("span", { className: "list-item-meta", children: [l.minutes, " min"] })] }, i));
                            }
                            if (item.kind === 'trainer') {
                                return (_jsxs("button", { className: "list-item", onClick: () => navigate(item.to), children: [_jsxs("span", { className: "list-item-main", children: [_jsx("span", { className: "list-item-title", children: item.title }), _jsx("span", { className: "list-item-sub", children: item.detail })] }), _jsx(ArrowRight, { size: 18, className: "muted" })] }, i));
                            }
                            return (_jsxs("button", { className: "chip", onClick: () => navigate(`/puzzles/play?mode=theme&theme=${item.theme}&count=10`), children: [_jsx(Puzzle, { size: 14, className: "inline-icon" }), " ", item.label ?? THEME_INFO[item.theme]?.label ?? item.theme] }, i));
                        }) })] }, s.title)))] }));
}
