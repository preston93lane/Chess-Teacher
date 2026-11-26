import { useEffect, type ReactNode } from 'react';
import { Sunrise, Swords, BookOpen, Target, History, Puzzle, Settings as SettingsIcon } from 'lucide-react';
import { useApp, dueCards } from './lib/store/app';
import { match, navigate, useRoute } from './lib/router';
import { Toaster } from './components/Toast';
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

const TABS = [
  { path: '/', label: 'Today', icon: Sunrise, match: (p: string) => p === '/' },
  { path: '/play', label: 'Play', icon: Swords, match: (p: string) => p.startsWith('/play') },
  { path: '/puzzles', label: 'Puzzles', icon: Puzzle, match: (p: string) => p.startsWith('/puzzles') },
  { path: '/openings', label: 'Openings', icon: BookOpen, match: (p: string) => p.startsWith('/openings') || p.startsWith('/explorer') },
  { path: '/train', label: 'Train', icon: Target, match: (p: string) => p.startsWith('/train') || p.startsWith('/classics') || p.startsWith('/program') || p.startsWith('/vision') || p.startsWith('/endgames') || p.startsWith('/insights') },
  { path: '/games', label: 'Games', icon: History, match: (p: string) => p.startsWith('/games') || p.startsWith('/analysis') || p.startsWith('/import') },
];

function route(path: string): ReactNode {
  const p = path.split('?')[0];
  let m: Record<string, string> | null;
  if (p === '/' || p === '') return <Today />;
  if (p === '/play') return <PlaySetup />;
  if (p === '/play/game') return <GameScreen />;
  if (p === '/puzzles') return <PuzzlesHub />;
  if (p === '/puzzles/play') return <PuzzleSession key={path} />;
  if (p === '/puzzles/rush') return <PuzzleRush key={path} />;
  if (p === '/openings') return <Openings />;
  if (p === '/openings/quiz') return <OpeningQuiz key={path} />;
  if (p === '/program') return <ProgramScreen />;
  if (p === '/vision') return <VisionTrainer />;
  if (p === '/explorer') return <ExplorerScreen key={path} />;
  if (p === '/insights') return <InsightsScreen />;
  if (p === '/endgames') return <EndgamesHub />;
  if ((m = match('/endgames/:id', p))) return <DrillScreen key={p} id={m.id} />;
  if ((m = match('/openings/:id', p))) return <OpeningDetail id={m.id} />;
  if ((m = match("/openings/:id/:mode/:line", p))) return <LineTrainer key={p} openingId={m.id} lineId={m.line} mode={m.mode as 'learn' | 'drill'} />;
  if (p === '/train') return <Train />;
  if (p === '/classics') return <ClassicsList />;
  if ((m = match('/classics/:id', p))) return <ClassicScreen key={p} id={m.id} />;
  if (p === '/train/review') return <ReviewSession />;
  if (p === '/train/plan') return <PlanScreen />;
  if ((m = match('/train/lesson/:id', p))) return <LessonScreen id={m.id} />;
  if (p === '/games') return <Games />;
  if (p === '/import') return <ImportScreen />;
  if (p === '/analysis') return <AnalysisScreen />;
  if ((m = match('/games/:id', p))) return <AnalysisScreen gameId={m.id} />;
  if (p === '/settings') return <SettingsScreen />;
  return <Today />;
}

function BrandMark() {
  return (
    <svg className="nav-brand-mark" viewBox="0 0 32 32" aria-hidden>
      <rect width="32" height="32" rx="8" fill="var(--primary)" />
      <rect x="6" y="6" width="10" height="10" fill="var(--primary-ink)" />
      <rect x="16" y="16" width="10" height="10" fill="var(--primary-ink)" />
      <circle cx="21" cy="11" r="3.2" fill="#34d6c6" />
    </svg>
  );
}

export function App() {
  const path = useRoute();
  const hydrated = useApp((s) => s.hydrated);
  const theme = useApp((s) => s.settings.theme);
  const cards = useApp((s) => s.cards);
  const due = dueCards(cards).length;

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'system') root.removeAttribute('data-theme');
    else root.setAttribute('data-theme', theme);
    const meta = document.querySelector('meta[name="theme-color"]');
    const dark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    meta?.setAttribute('content', dark ? '#11152b' : '#f3f4fa');
  }, [theme]);

  useEffect(() => {
    document.querySelector('.main')?.scrollTo(0, 0);
  }, [path]);

  return (
    <div className="shell">
      <nav className="nav" aria-label="Main">
        <div className="nav-brand">
          <BrandMark />
          <span>Outpost</span>
        </div>
        {TABS.map((t) => {
          const Icon = t.icon;
          const on = t.match(path);
          return (
            <button key={t.path} className={`nav-item${on ? ' is-on' : ''}`} onClick={() => navigate(t.path)} aria-current={on ? 'page' : undefined}>
              <Icon size={22} strokeWidth={on ? 2.4 : 1.9} />
              <span>{t.label}</span>
              {t.path === '/train' && due > 0 && <span className="nav-badge">{due > 99 ? '99+' : due}</span>}
            </button>
          );
        })}
        <button className={`nav-item nav-foot desktop-only${path === '/settings' ? ' is-on' : ''}`} onClick={() => navigate('/settings')}>
          <SettingsIcon size={22} strokeWidth={1.9} />
          <span>Settings</span>
        </button>
      </nav>
      <main className="main">{hydrated ? route(path) : <div className="page"><Spinner label="Loading your training data…" /></div>}</main>
      <Toaster />
    </div>
  );
}
