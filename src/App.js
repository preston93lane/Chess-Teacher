import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect } from 'react';
import { Sunrise, Swords, BookOpen, Target, History, Puzzle, Settings as SettingsIcon } from 'lucide-react';
import { useApp, dueCards } from './lib/store/app';
import { match, navigate, useRoute } from './lib/router';
import { Toaster, toast } from './components/Toast';
import { syncGames } from './lib/sync';
import { Today } from './screens/Today';
import { PlaySetup } from './screens/PlaySetup';
import { GameScreen } from './screens/Game';
import { Openings } from './screens/Openings';
import { OpeningDetail } from './screens/OpeningDetail';
import { LineTrainer } from './screens/LineTrainer';
import { Train } from './screens/Train';
import { ReviewSession } from './screens/ReviewSession';
import { LessonScreen } from './screens/Lesson';
import { PlanScreen } from './screens/Plan';
import { Games } from './screens/Games';
import { AnalysisScreen } from './screens/Analysis';
import { ImportScreen } from './screens/Import';
import { SettingsScreen } from './screens/Settings';
import { Spinner } from './components/ui';
import { PuzzlesHub } from './screens/Puzzles';
import { PuzzleSession } from './screens/PuzzleSession';
import { PuzzleRush } from './screens/PuzzleRush';
import { ClassicsList, ClassicScreen } from './screens/Classics';
import { OpeningQuiz } from './screens/OpeningQuiz';
import { ProgramScreen } from './screens/Program';
import { VisionTrainer } from './screens/Vision';
import { EndgamesHub, DrillScreen } from './screens/Endgames';
import { ExplorerScreen } from './screens/Explorer';
import { InsightsScreen } from './screens/Insights';
import { RetryMistakes } from './screens/RetryMistakes';
import { WeeklyReport } from './screens/WeeklyReport';
import { ArenaSetup, ArenaGameScreen } from './screens/Arena';
import { ChessClock } from './screens/ChessClock';
import { RepertoireList, RepertoireBuilder } from './screens/Repertoire';
import { setCustomOpeningResolver } from './lib/openings/book';
import { repToOpening } from './lib/repertoire';
import { scoutOpening } from './lib/scout';
import { ScoutHome, ScoutReport } from './screens/Scout';
import { CoursesHub, CourseScreen } from './screens/Courses';
import { CctTrainer, VisualizeTrainer } from './screens/Calculation';
import { ThreatSpotter, GuessTheMove } from './screens/MasterTrainers';
import { TrapTrainer } from './screens/Traps';
// Your own repertoires resolve as openings ("rep:<id>") for the trainers.
setCustomOpeningResolver((id) => {
    if (id.startsWith('rep:')) {
        const rep = useApp.getState().customReps[id.slice(4)];
        return rep ? repToOpening(rep) : undefined;
    }
    if (id.startsWith('scout:')) {
        // scout:<site>:<user>:<their colour>
        const parts = id.split(':');
        const p = useApp.getState().scouts[`${parts[1]}:${parts[2]}`];
        return p ? scoutOpening(p, parts[3] === 'b' ? 'b' : 'w') : undefined;
    }
    return undefined;
});
const TABS = [
    { path: '/', label: 'Today', icon: Sunrise, match: (p) => p === '/' },
    { path: '/play', label: 'Play', icon: Swords, match: (p) => p.startsWith('/play') || p.startsWith('/clock') },
    { path: '/puzzles', label: 'Puzzles', icon: Puzzle, match: (p) => p.startsWith('/puzzles') },
    { path: '/openings', label: 'Openings', icon: BookOpen, match: (p) => p.startsWith('/openings') || p.startsWith('/explorer') || p.startsWith('/repertoire') },
    { path: '/train', label: 'Train', icon: Target, match: (p) => p.startsWith('/train') || p.startsWith('/classics') || p.startsWith('/program') || p.startsWith('/vision') || p.startsWith('/endgames') || p.startsWith('/insights') || p.startsWith('/report') || p.startsWith('/courses') },
    { path: '/games', label: 'Games', icon: History, match: (p) => p.startsWith('/games') || p.startsWith('/analysis') || p.startsWith('/import') || p.startsWith('/scout') },
];
function route(path) {
    const p = path.split('?')[0];
    let m;
    if (p === '/' || p === '')
        return _jsx(Today, {});
    if (p === '/play')
        return _jsx(PlaySetup, {});
    if (p === '/play/game')
        return _jsx(GameScreen, {});
    if (p === '/play/arena')
        return _jsx(ArenaSetup, {}, path);
    if (p === '/play/arena/game')
        return _jsx(ArenaGameScreen, {});
    if (p === '/clock')
        return _jsx(ChessClock, {});
    if (p === '/puzzles')
        return _jsx(PuzzlesHub, {});
    if (p === '/puzzles/play')
        return _jsx(PuzzleSession, {}, path);
    if (p === '/puzzles/rush')
        return _jsx(PuzzleRush, {}, path);
    if (p === '/openings')
        return _jsx(Openings, {});
    if (p === '/openings/quiz')
        return _jsx(OpeningQuiz, {}, path);
    if (p === '/program')
        return _jsx(ProgramScreen, {});
    if (p === '/vision')
        return _jsx(VisionTrainer, {});
    if (p === '/explorer')
        return _jsx(ExplorerScreen, {}, path);
    if (p === '/repertoire')
        return _jsx(RepertoireList, {});
    if (p === '/scout')
        return _jsx(ScoutHome, {});
    if ((m = match('/scout/:key', p)))
        return _jsx(ScoutReport, { scoutKey: decodeURIComponent(m.key) }, p);
    if ((m = match('/repertoire/:id', p)))
        return _jsx(RepertoireBuilder, { id: m.id }, p);
    if (p === '/insights')
        return _jsx(InsightsScreen, {});
    if (p === '/report')
        return _jsx(WeeklyReport, {});
    if (p === '/endgames')
        return _jsx(EndgamesHub, {});
    if ((m = match('/endgames/:id', p)))
        return _jsx(DrillScreen, { id: m.id }, p);
    if ((m = match('/openings/:id', p)))
        return _jsx(OpeningDetail, { id: m.id });
    if ((m = match("/openings/:id/:mode/:line", p)))
        return _jsx(LineTrainer, { openingId: m.id, lineId: m.line, mode: m.mode }, p);
    if (p === '/train')
        return _jsx(Train, {});
    if (p === '/classics')
        return _jsx(ClassicsList, {});
    if ((m = match('/classics/:id', p)))
        return _jsx(ClassicScreen, { id: m.id }, p);
    if (p === '/courses')
        return _jsx(CoursesHub, {});
    if ((m = match('/courses/:id', p)))
        return _jsx(CourseScreen, { id: m.id }, p);
    if (p === '/train/cct')
        return _jsx(CctTrainer, {});
    if (p === '/train/visualize')
        return _jsx(VisualizeTrainer, {});
    if (p === '/train/threats')
        return _jsx(ThreatSpotter, {});
    if (p === '/train/guess')
        return _jsx(GuessTheMove, {});
    if (p === '/train/traps')
        return _jsx(TrapTrainer, {});
    if (p === '/train/review')
        return _jsx(ReviewSession, {});
    if (p === '/train/plan')
        return _jsx(PlanScreen, {});
    if ((m = match('/train/lesson/:id', p)))
        return _jsx(LessonScreen, { id: m.id });
    if (p === '/games')
        return _jsx(Games, {});
    if (p === '/import')
        return _jsx(ImportScreen, {});
    if (p === '/analysis')
        return _jsx(AnalysisScreen, {});
    if ((m = match('/games/:id/retry', p)))
        return _jsx(RetryMistakes, { gameId: m.id }, p);
    if ((m = match('/games/:id', p)))
        return _jsx(AnalysisScreen, { gameId: m.id });
    if (p === '/settings')
        return _jsx(SettingsScreen, {});
    return _jsx(Today, {});
}
function BrandMark() {
    return (_jsxs("svg", { className: "nav-brand-mark", viewBox: "0 0 32 32", "aria-hidden": true, children: [_jsx("rect", { width: "32", height: "32", rx: "8", fill: "var(--primary)" }), _jsx("rect", { x: "6", y: "6", width: "10", height: "10", fill: "var(--primary-ink)" }), _jsx("rect", { x: "16", y: "16", width: "10", height: "10", fill: "var(--primary-ink)" }), _jsx("circle", { cx: "21", cy: "11", r: "3.2", fill: "#34d6c6" })] }));
}
export function App() {
    const path = useRoute();
    const hydrated = useApp((s) => s.hydrated);
    const theme = useApp((s) => s.settings.theme);
    const cards = useApp((s) => s.cards);
    const due = dueCards(cards).length;
    useEffect(() => {
        const root = document.documentElement;
        if (theme === 'system')
            root.removeAttribute('data-theme');
        else
            root.setAttribute('data-theme', theme);
        const meta = document.querySelector('meta[name="theme-color"]');
        const dark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
        meta?.setAttribute('content', dark ? '#11152b' : '#f3f4fa');
    }, [theme]);
    useEffect(() => {
        document.querySelector('.main')?.scrollTo(0, 0);
    }, [path]);
    // Pull new games from linked accounts once the saved state has loaded.
    useEffect(() => {
        if (!hydrated)
            return;
        const t = setTimeout(() => {
            syncGames().then((r) => {
                if (r.added)
                    toast(`${r.added} new game${r.added === 1 ? '' : 's'} synced — open Games to review ${r.added === 1 ? 'it' : 'them'}.`, 4200);
            });
        }, 1500);
        return () => clearTimeout(t);
    }, [hydrated]);
    return (_jsxs("div", { className: "shell", children: [_jsxs("nav", { className: "nav", "aria-label": "Main", children: [_jsxs("div", { className: "nav-brand", children: [_jsx(BrandMark, {}), _jsx("span", { children: "Outpost" })] }), TABS.map((t) => {
                        const Icon = t.icon;
                        const on = t.match(path);
                        return (_jsxs("button", { className: `nav-item${on ? ' is-on' : ''}`, onClick: () => navigate(t.path), "aria-current": on ? 'page' : undefined, children: [_jsx(Icon, { size: 22, strokeWidth: on ? 2.4 : 1.9 }), _jsx("span", { children: t.label }), t.path === '/train' && due > 0 && _jsx("span", { className: "nav-badge", children: due > 99 ? '99+' : due })] }, t.path));
                    }), _jsxs("button", { className: `nav-item nav-foot desktop-only${path === '/settings' ? ' is-on' : ''}`, onClick: () => navigate('/settings'), children: [_jsx(SettingsIcon, { size: 22, strokeWidth: 1.9 }), _jsx("span", { children: "Settings" })] })] }), _jsx("main", { className: "main", children: hydrated ? route(path) : _jsx("div", { className: "page", children: _jsx(Spinner, { label: "Loading your training data\u2026" }) }) }), _jsx(Toaster, {})] }));
}
