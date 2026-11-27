import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowRight, Eye, Lightbulb, RotateCcw, ScanSearch } from 'lucide-react';
import { applyUci } from '../lib/chess/core';
import { dailyPuzzle, isMaster, pickPuzzle, puzzleStart, THEME_INFO, updateRating, type Puzzle } from '../lib/puzzles';
import { describeMove } from '../lib/coach/explain';
import { lineOutcome, materialPhrase } from '../lib/coach/tactics';
import { useApp } from '../lib/store/app';
import { navigate, query, useRoute } from '../lib/router';
import { Button, Header, Spinner, NextDock } from '../components/ui';
import { PuzzleSolver, solutionLine, type SolveResult } from '../components/PuzzleSolver';
import { FollowUpPanel } from '../components/FollowUp';
import { MoveBreakdown } from '../components/MoveBreakdown';
import { usePuzzleDb } from './Puzzles';
import { getOpening } from '../lib/openings/book';
import { toast } from '../components/Toast';
import { BlockBanner, completeBlock } from '../components/BlockBanner';

function coachLine(p: Puzzle): string {
  const s = puzzleStart(p);
  const key = p.moves[1];
  const mv = applyUci(s.fen, key);
  if (!mv) return '';
  const out = lineOutcome(s.fen, p.moves.slice(1));
  const desc = describeMove(s.fen, mv.move)[0] ?? '';
  if (out.mateFor === s.side) return `${mv.move.san} forces mate${out.mateIn ? ` in ${out.mateIn}` : ''}. ${desc}`;
  const phrase = out.material >= 1 ? materialPhrase(out.lost[s.side === 'w' ? 'b' : 'w'], out.lost[s.side], out.material) : null;
  return `${mv.move.san}${phrase ? ` ${phrase}` : ''}. ${desc}`.trim();
}

export function PuzzleSession() {
  const path = useRoute();
  const q = query(path);
  const mode = q.get('mode') ?? 'rated';
  const theme = q.get('theme') ?? '';
  const openingId = q.get('id') ?? '';
  const mixThemes = (q.get('themes') ?? '').split(',').filter(Boolean);
  const target = +(q.get('count') ?? 0);
  const blockId = q.get('block');
  const [solvedInSet, setSolvedInSet] = useState(0);
  const { db } = usePuzzleDb();
  const ps = useApp((s) => s.puzzles);
  const record = useApp((s) => s.recordPuzzle);
  const addPuzzle = useApp((s) => s.addPuzzle);
  const settings = useApp((s) => s.settings);
  const [puzzle, setPuzzle] = useState<Puzzle | null>(null);
  const [result, setResult] = useState<(SolveResult & { delta?: number }) | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [showSolution, setShowSolution] = useState(false);
  const [hint, setHint] = useState(false);
  const [breakdown, setBreakdown] = useState(false);
  const [streak, setStreak] = useState(0);
  const rated = mode !== 'daily';

  const filter = useMemo(() => {
    if (mode === 'theme') return (p: Puzzle) => p.themes.includes(theme);
    if (mode === 'opening') return (p: Puzzle) => p.opening === openingId;
    if (mode === 'master') return isMaster;
    if (mode === 'mix')
      return (p: Puzzle) => mixThemes.some((t) => (t.startsWith('opening:') ? p.opening === t.slice(8) : p.themes.includes(t)));
    return undefined;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, theme, openingId, q.get('themes')]);

  const next = useCallback(() => {
    if (!db) return;
    const st = useApp.getState().puzzles;
    const p = mode === 'daily' ? dailyPuzzle(db, st.rating) : pickPuzzle(db, { rating: st.rating, seen: new Set(st.seen), filter });
    setPuzzle(p ?? null);
    setResult(null);
    setAttempt(0);
    setShowSolution(false);
    setHint(false);
  }, [db, mode, filter]);

  useEffect(() => {
    if (db && !puzzle) next();
  }, [db, puzzle, next]);

  const onResult = (r: SolveResult) => {
    if (!puzzle) return;
    let delta: number | undefined;
    if (attempt === 0) {
      const scored = rated && !hint;
      const newRating = scored ? updateRating(ps.rating, puzzle.rating, r.ok, ps.attempts) : ps.rating;
      delta = scored ? newRating - ps.rating : undefined;
      record({ id: puzzle.id, puzzleRating: puzzle.rating, ok: r.ok, rated: scored, newRating, daily: mode === 'daily', themes: puzzle.themes });
      setStreak(r.ok ? streak + 1 : 0);
      if (!r.ok) {
        const s = puzzleStart(puzzle);
        addPuzzle({
          id: `pz:lichess:${puzzle.id}`,
          fen: s.fen,
          solution: puzzle.moves.slice(1),
          played: r.wrong ?? '',
          title: `${puzzle.themes.map((t) => THEME_INFO[t]?.label).filter(Boolean)[0] ?? 'Tactic'} · rated ${puzzle.rating}`,
          note: 'A puzzle you missed — it comes back until it sticks.',
          tags: puzzle.themes,
        });
      }
    }
    setResult({ ...r, delta });
    if (attempt === 0) {
      const n = solvedInSet + 1;
      setSolvedInSet(n);
      if (target && n >= target && completeBlock(blockId)) toast('Block complete — nice work.');
    }
  };

  const retry = () => {
    setAttempt(attempt + 1);
    setResult(null);
    setShowSolution(false);
    const p = puzzle;
    setPuzzle(null);
    setTimeout(() => setPuzzle(p), 0);
  };

  if (!db || !puzzle) {
    return (
      <div className="page">
        <Header title="Puzzles" backTo="/puzzles" />
        <Spinner label="Loading puzzles…" />
      </div>
    );
  }

  const start = puzzleStart(puzzle);
  const titles: Record<string, string> = {
    rated: 'Rated puzzles',
    daily: 'Daily puzzle',
    master: 'Master games',
    mix: 'Mixed tactics',
    theme: THEME_INFO[theme]?.label ?? 'Theme',
    opening: getOpening(openingId)?.name ?? 'Opening tactics',
  };
  const themeLabels = puzzle.themes.map((t) => THEME_INFO[t]?.label).filter(Boolean) as string[];
  const mate = puzzle.themes.find((t) => /^mateIn\d$/.test(t));

  return (
    <div className="page board-screen-page">
      <Header
        title={titles[mode] ?? 'Puzzles'}
        backTo={blockId ? '/program' : '/puzzles'}
        sub={`Your rating ${ps.rating}${target ? ` · ${Math.min(solvedInSet, target)}/${target} in this set` : ''}${streak > 1 ? ` · streak ${streak}` : ''}`}
      />
      <BlockBanner />
      <div className="board-screen">
        <div className="board-col">
          <PuzzleSolver key={`${puzzle.id}-${attempt}`} puzzle={puzzle} onResult={onResult} showSolution={showSolution} hint={hint} />
        </div>
        <div className="side-col">
          <div className={`puzzle-status ${result ? (result.ok ? 'is-ok' : 'is-bad') : ''}`}>
            {!result ? (
              <>
                <p className="puzzle-prompt">
                  <span className={`pill-color pill-${start.side}`} /> {start.side === 'w' ? 'White' : 'Black'} to move
                </p>
                <p className="muted">{mate ? `Find mate in ${mate.slice(-1)}.` : 'Find the best move.'}</p>
                {mode !== 'rated' && mode !== 'daily' && <p className="faint small mt8">Rated {puzzle.rating}</p>}
              </>
            ) : result.ok ? (
              <>
                <p className="puzzle-verdict">Solved{result.delta !== undefined ? <span className="num delta up"> +{result.delta}</span> : null}</p>
                <p className="muted">{coachLine(puzzle)}</p>
              </>
            ) : (
              <>
                <p className="puzzle-verdict">Not the move{result.delta !== undefined ? <span className="num delta down"> {result.delta}</span> : null}</p>
                <p className="muted">{attempt === 0 ? 'Added to your review deck. ' : ''}Try again, or see the solution.</p>
              </>
            )}
          </div>

          {result && (
            <div className="panel panel-tight">
              <p className="small">
                <strong>Themes:</strong> {themeLabels.join(', ') || '—'} · rated {puzzle.rating}
              </p>
              {(result.ok || showSolution) && <p className="muted small mt8">{solutionLine(puzzle)}</p>}
              {puzzle.opening && <p className="faint small mt8">From a game in the {getOpening(puzzle.opening)?.name}.</p>}
            </div>
          )}

          {result && (result.ok || showSolution) && (
            <FollowUpPanel fen={start.fen} uci={puzzle.moves[1]} line={puzzle.moves.slice(1)} tried={result.wrong ? [result.wrong] : []} />
          )}

          <div className="row">
            {!result && !hint && (
              <Button variant="ghost" size="sm" icon={<Lightbulb size={16} />} onClick={() => setHint(true)}>
                Hint (unrated)
              </Button>
            )}
            {result && !result.ok && (
              <>
                <Button variant="secondary" icon={<RotateCcw size={16} />} onClick={retry}>Retry</Button>
                <Button variant="ghost" icon={<Eye size={16} />} onClick={() => setShowSolution(true)}>Show solution</Button>
              </>
            )}
            {result && (
              <Button variant="ghost" icon={<ScanSearch size={16} />} onClick={() => setBreakdown(true)}>
                Explain it
              </Button>
            )}
            {result && mode !== 'daily' && (
              <NextDock><Button icon={<ArrowRight size={16} />} onClick={next}>Next puzzle</Button></NextDock>
            )}
            {result && mode === 'daily' && (
              <Button onClick={() => { toast('See you tomorrow.'); navigate('/puzzles'); }}>Done</Button>
            )}
          </div>
        </div>
      </div>
      {breakdown && (
        <MoveBreakdown
          fenBefore={start.fen}
          uci={result?.ok || !result?.wrong ? puzzle.moves[1] : result.wrong}
          depth={settings.analysisDepth}
          showEval={settings.showEval}
          onClose={() => setBreakdown(false)}
        />
      )}
    </div>
  );
}

