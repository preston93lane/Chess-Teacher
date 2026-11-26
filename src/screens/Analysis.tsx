import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  RefreshCw,
  Microscope,
  Swords,
  BookmarkPlus,
  Trash2,
  Download,
  X,
  FileInput,
  Gauge,
} from 'lucide-react';
import { Chess, START_FEN, formatLine, uciOf, type Color, type PieceSymbol, type Square } from '../lib/chess/core';
import { parsePgn, parseMovetext, toPgn } from '../lib/chess/pgn';
import { loadGameBody, saveReview, deleteGameBody, type StoredGame } from '../lib/store/gamesDb';
import { useApp } from '../lib/store/app';
import { reviewGame, puzzleCandidates, type GameReview } from '../lib/coach/review';
import { reviewMove, CLASS_INFO, type MoveClass, type MoveReview } from '../lib/coach/explain';
import { lineScore } from '../lib/coach/eval';
import { engine, CancelledError } from '../lib/engine/stockfish';
import { navigate, query, useRoute } from '../lib/router';
import { useAnalysis, useArrowKeys } from '../lib/hooks';
import { soundForSan } from '../lib/sound';
import { Board, type Arrow } from '../components/Board';
import { EvalBar } from '../components/EvalBar';
import { EvalGraph } from '../components/EvalGraph';
import { MoveList } from '../components/MoveList';
import { MasterMoves } from '../components/MasterMoves';
import { VerdictCard, EngineLines, PositionReportView } from '../components/Coach';
import { InsightsPanel } from '../components/Insights';
import { MoveBreakdown } from '../components/MoveBreakdown';
import type { Mark } from '../components/Board';
import { Button, Glyph, Header, IconButton, Meter, Segmented, Sheet, Spinner, Toggle } from '../components/ui';
import { toast } from '../components/Toast';
import { getOpening } from '../lib/openings/book';

type Tab = 'coach' | 'summary' | 'moves' | 'engine' | 'masters';

interface Source {
  startFen: string;
  sans: string[];
  headers: Record<string, string>;
  stored?: StoredGame;
}

export function AnalysisScreen({ gameId }: { gameId?: string }) {
  const path = useRoute();
  const q = query(path);
  const [source, setSource] = useState<Source | null>(null);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    let alive = true;
    if (gameId) {
      loadGameBody(gameId).then((g) => {
        if (!alive) return;
        if (!g) setMissing(true);
        else setSource({ startFen: g.startFen, sans: g.sans, headers: g.headers, stored: g });
      });
    } else {
      const fen = q.get('fen');
      const moves = q.get('moves');
      let startFen = START_FEN;
      let sans: string[] = [];
      try {
        if (fen) startFen = new Chess(fen).fen();
        if (moves) {
          const c = new Chess(startFen);
          for (const m of parseMovetext(moves).sans) sans.push(c.move(m.san).san);
        }
      } catch {
        sans = [];
      }
      setSource({ startFen, sans, headers: {} });
    }
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameId]);

  if (missing) return <div className="page"><Header title="Game not found" backTo="/games" /></div>;
  if (!source) return <div className="page"><Spinner label="Loading game…" /></div>;
  return <AnalysisView key={gameId ?? 'free'} gameId={gameId} source={source} autoReview={q.get('auto') === '1'} />;
}

function AnalysisView({ gameId, source, autoReview }: { gameId?: string; source: Source; autoReview: boolean }) {
  const meta = useApp((s) => s.games.find((g) => g.id === gameId));
  const updateGame = useApp((s) => s.updateGame);
  const removeGame = useApp((s) => s.removeGame);
  const addPuzzle = useApp((s) => s.addPuzzle);
  const markPlanStep = useApp((s) => s.markPlanStep);
  const settings = useApp((s) => s.settings);
  const updateSettings = useApp((s) => s.updateSettings);
  const [breakdown, setBreakdown] = useState<{ fenBefore: string; uci: string } | null>(null);
  const [marks, setMarks] = useState<Mark[]>([]);
  const [showStructure, setShowStructure] = useState(false);
  const free = !gameId;
  const [mainline, setMainline] = useState<string[]>(source.sans);
  const [startFen, setStartFen] = useState(source.startFen);
  const [ply, setPly] = useState(free ? source.sans.length : 0);
  const [explore, setExplore] = useState<{ base: number; sans: string[]; reviews: (MoveReview | null)[] } | null>(null);
  const [review, setReview] = useState<GameReview | null>(source.stored?.review ?? null);
  const [progress, setProgress] = useState<{ done: number; total: number; verifying?: { done: number; total: number } } | null>(null);
  const [tab, setTab] = useState<Tab>(source.stored?.review ? 'summary' : 'coach');
  const [orientation, setOrientation] = useState<Color>(meta?.myColor ?? 'w');
  const [engineOn, setEngineOn] = useState(true);
  const [showBetter, setShowBetter] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [loadOpen, setLoadOpen] = useState(false);
  const cancelRef = useRef<{ cancelled: boolean } | null>(null);
  const myColor = meta?.myColor ?? null;

  const { fens, moves } = useMemo(() => {
    const c = new Chess(startFen);
    const f = [c.fen()];
    const mv: { from: string; to: string }[] = [];
    for (const s of mainline) {
      const m = c.move(s);
      f.push(c.fen());
      mv.push({ from: m.from, to: m.to });
    }
    return { fens: f, moves: mv };
  }, [startFen, mainline]);

  const exploreFens = useMemo(() => {
    if (!explore) return null;
    const c = new Chess(fens[explore.base]);
    const f: string[] = [];
    const mv: { from: string; to: string }[] = [];
    for (const s of explore.sans) {
      const m = c.move(s);
      f.push(c.fen());
      mv.push({ from: m.from, to: m.to });
    }
    return { fens: f, moves: mv };
  }, [explore, fens]);

  const fen = explore && exploreFens?.fens.length ? exploreFens.fens[exploreFens.fens.length - 1] : fens[ply];
  const lastMove = explore && exploreFens?.moves.length ? exploreFens.moves[exploreFens.moves.length - 1] : ply > 0 ? moves[ply - 1] : null;
  const { result: live } = useAnalysis(fen, { enabled: engineOn, multipv: 3, depth: 18 });

  // ---- full game review ----
  const runReview = useCallback(async () => {
    if (progress) return;
    cancelRef.current = { cancelled: false };
    setProgress({ done: 0, total: mainline.length + 1 });
    setEngineOn(false);
    engine.cancelAll();
    try {
      const r = await reviewGame(mainline, {
        startFen,
        depth: settings.analysisDepth,
        signal: cancelRef.current,
        onProgress: (p) => setProgress({ done: p.done, total: p.total, verifying: p.verifying }),
      });
      setReview(r);
      setTab('summary');
      if (gameId) {
        await saveReview(gameId, r);
        const mine = myColor;
        updateGame(gameId, {
          reviewed: true,
          accuracy: r.accuracy,
          mistakes: mine ? (r.counts[mine].mistake ?? 0) + (r.counts[mine].miss ?? 0) : undefined,
          blunders: mine ? r.counts[mine].blunder ?? 0 : undefined,
          opening: meta?.opening ?? r.opening?.name,
          eco: meta?.eco ?? r.opening?.eco,
        });
        markPlanStep(`analyse:${gameId}`);
        if (mine) {
          let added = 0;
          for (const m of puzzleCandidates(r, mine)) {
            const ok = addPuzzle({
              id: `pz:${gameId}:${m.ply}`,
              fen: m.fenBefore,
              solution: (m.bestLine ?? []).length ? uciLine(m.fenBefore, m.bestLine!) : [m.bestUci!],
              played: m.uci,
              gameId,
              ply: m.ply,
              title: `${Math.floor(m.ply / 2) + 1}${m.color === 'w' ? '.' : '…'}${m.san} — ${CLASS_INFO[m.cls].label.toLowerCase()}`,
              note: m.headline,
              tags: m.tags,
            });
            if (ok) added++;
          }
          if (added) toast(`${added} position${added > 1 ? 's' : ''} from this game added to your review deck.`, 3600);
        }
      }
    } catch (e) {
      if (!(e instanceof CancelledError) && (e as Error).message !== 'cancelled') toast('Review stopped.');
    } finally {
      setProgress(null);
      setEngineOn(true);
    }
  }, [progress, mainline, startFen, settings.analysisDepth, gameId, myColor, updateGame, meta, addPuzzle, markPlanStep]);

  useEffect(() => {
    if (autoReview && !review && mainline.length > 0) void runReview();
    return () => {
      if (cancelRef.current) cancelRef.current.cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- moves on the board ----
  const onMove = async (mv: { from: Square; to: Square; promotion?: PieceSymbol }) => {
    const c = new Chess(fen);
    let m;
    try {
      m = c.move(mv);
    } catch {
      return;
    }
    soundForSan(m.san);
    setShowBetter(false);
    if (free && !explore) {
      setMainline([...mainline.slice(0, ply), m.san]);
      setPly(ply + 1);
      return;
    }
    // If it matches the game continuation, just step forward.
    if (!explore && mainline[ply] === m.san) {
      setPly(ply + 1);
      return;
    }
    const base = explore ? explore.base : ply;
    const prev = explore ? explore.sans : [];
    const fenBefore = fen;
    const idx = prev.length;
    const next = { base, sans: [...prev, m.san], reviews: [...(explore?.reviews ?? []), null] };
    setExplore(next);
    setTab('coach');
    // Coach comment on the explored move
    try {
      const before = live && live.fen === fenBefore ? live : await engine.analyze(fenBefore, { depth: 14, multipv: 3 });
      const after = await engine.analyze(c.fen(), { depth: 14 });
      const r = reviewMove({ ply: base + idx, fenBefore, uci: uciOf(m), before: before.lines, after: after.lines[0] });
      setExplore((cur) => {
        if (!cur || cur.sans.length <= idx || cur.sans[idx] !== m!.san) return cur;
        const reviews = [...cur.reviews];
        reviews[idx] = r;
        return { ...cur, reviews };
      });
    } catch {
      /* cancelled */
    }
  };

  useEffect(() => setMarks([]), [fen]);

  const go = (p: number) => {
    setExplore(null);
    setShowBetter(false);
    setPly(Math.max(0, Math.min(mainline.length, p)));
  };
  useArrowKeys({
    left: () => (explore ? setExplore(explore.sans.length > 1 ? { ...explore, sans: explore.sans.slice(0, -1), reviews: explore.reviews.slice(0, -1) } : null) : go(ply - 1)),
    right: () => go(ply + 1),
    up: () => go(0),
    down: () => go(mainline.length),
  });

  const currentReview: MoveReview | null = explore
    ? explore.reviews[explore.reviews.length - 1] ?? null
    : review && ply > 0
      ? review.moves[ply - 1]
      : null;

  const arrows: Arrow[] = [];
  if (showBetter && currentReview?.bestUci) arrows.push({ from: currentReview.bestUci.slice(0, 2), to: currentReview.bestUci.slice(2, 4), color: 'y' });
  else if (settings.showEval && engineOn && live?.lines[0] && !progress) arrows.push({ from: live.lines[0].pv[0].slice(0, 2), to: live.lines[0].pv[0].slice(2, 4), color: 'b' });

  const badge = currentReview && lastMove ? { sq: lastMove.to, cls: currentReview.cls } : null;
  const evalScore = live && live.fen === fen ? lineScore(live.lines[0]) : !explore && review ? review.evals[ply] : undefined;
  const sideToMove = fen.split(' ')[1] as Color;

  const savePuzzle = () => {
    const best = live?.fen === fen ? live.lines[0] : null;
    if (!best) {
      toast('Wait for the engine to finish thinking first.');
      return;
    }
    const ok = addPuzzle({
      id: `pz:manual:${fen}`,
      fen,
      solution: best.pv.slice(0, 6),
      played: '',
      title: `Saved position · ${sideToMove === 'w' ? 'White' : 'Black'} to move`,
      note: source.headers.White ? `${source.headers.White} vs ${source.headers.Black}` : undefined,
      tags: ['saved'],
    });
    toast(ok ? 'Saved to your review deck.' : 'Already in your review deck.');
  };

  const exportPgn = async () => {
    const pgn = toPgn({
      headers: { Event: '?', ...source.headers },
      startFen,
      sans: mainline,
      comments: review ? Object.fromEntries(review.moves.filter((m) => m.cls !== 'book' && m.cls !== 'best' && m.cls !== 'excellent' && m.cls !== 'good').map((m) => [m.ply, `${CLASS_INFO[m.cls].glyph} ${m.headline}${m.better ? ` ${m.better}` : ''}`])) : undefined,
    });
    try {
      await navigator.clipboard.writeText(pgn);
      toast('PGN copied to clipboard.');
    } catch {
      const blob = new Blob([pgn], { type: 'application/x-chess-pgn' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'game.pgn';
      a.click();
    }
  };

  const title = free ? 'Analysis board' : `${source.headers.White ?? 'White'} vs ${source.headers.Black ?? 'Black'}`;
  const sub = free
    ? 'Move pieces freely. The engine and coach follow along.'
    : [meta?.opening ?? review?.opening?.name, source.headers.Result, source.headers.Date?.replace(/\?/g, '').replace(/\.+$/, '')].filter(Boolean).join(' · ');

  const atEnd = !explore && ply >= mainline.length;
  const stepBack = () =>
    explore ? setExplore(explore.sans.length > 1 ? { ...explore, sans: explore.sans.slice(0, -1), reviews: explore.reviews.slice(0, -1) } : null) : go(ply - 1);
  const stepForward = () => go(ply + 1);

  return (
    <div className="page board-screen-page">
      <Header
        title={title}
        backTo={free ? '/' : '/games'}
        sub={sub}
        actions={
          <>
            {free && (
              <IconButton label="Load position or PGN" onClick={() => setLoadOpen(true)}>
                <FileInput size={20} />
              </IconButton>
            )}
            <IconButton
              label={settings.showEval ? 'Hide evaluation' : 'Show evaluation'}
              onClick={() => updateSettings({ showEval: !settings.showEval })}
              className={settings.showEval ? 'is-on' : ''}
            >
              <Gauge size={20} />
            </IconButton>
            <IconButton label="Export PGN" onClick={exportPgn}>
              <Download size={20} />
            </IconButton>
            {!free && (
              <IconButton label="Delete game" onClick={() => setConfirmDelete(true)}>
                <Trash2 size={20} />
              </IconButton>
            )}
          </>
        }
      />
      <div className="board-screen">
        <div className="board-col">
          <div className="board-wrap">
            {settings.showEval && <EvalBar score={evalScore} orientation={orientation} pending={!evalScore} />}
            <div className="board-holder">
              <Board
                fen={fen}
                orientation={orientation}
                movable="both"
                onMove={onMove}
                lastMove={lastMove ? [lastMove.from, lastMove.to] : null}
                arrows={arrows}
                badge={badge}
                marks={marks}
              />
            </div>
          </div>
          <div className="controls">
            <div className="controls-group">
              <IconButton label="Flip board" onClick={() => setOrientation(orientation === 'w' ? 'b' : 'w')}><RefreshCw /></IconButton>
              <IconButton label="Save position to review deck" onClick={savePuzzle}><BookmarkPlus /></IconButton>
              <IconButton label="Practice from here" onClick={() => navigate(`/play?fen=${encodeURIComponent(fen)}&side=${sideToMove}`)}><Swords /></IconButton>
            </div>
            <div className="controls-group">
              <IconButton label="Start" onClick={() => go(0)}><ChevronsLeft /></IconButton>
              <IconButton label="Previous" className="step-inline" onClick={stepBack}><ChevronLeft /></IconButton>
              <IconButton label="Next" className="step-inline" onClick={stepForward} disabled={atEnd}><ChevronRight /></IconButton>
              <IconButton label="End" onClick={() => go(mainline.length)}><ChevronsRight /></IconButton>
            </div>
          </div>
          {/* Phone: previous/next float in the right-thumb zone, above the tab bar. */}
          <div className="step-pill mobile-only" role="group" aria-label="Step through the game">
            <button className="step-btn" aria-label="Previous move" onClick={stepBack}><ChevronLeft size={24} /></button>
            <button className="step-btn step-next" aria-label="Next move" onClick={stepForward} disabled={atEnd}><ChevronRight size={28} /></button>
          </div>
          {explore && (
            <div className="explore-bar">
              <span className="muted small">Exploring: {formatLine(fens[explore.base], explore.sans)}</span>
              <button className="link-btn small" onClick={() => setExplore(null)}><X size={14} /> Back to game</button>
            </div>
          )}
          {review && mainline.length > 0 && (
            <EvalGraph evals={review.evals} moves={review.moves} current={ply} onSelect={go} />
          )}
        </div>

        <div className="side-col">
          {!free && !review && (
            <div className="panel stack review-cta">
              {progress ? (
                <>
                  <h3>Coach is reviewing the game…</h3>
                  <Meter value={progress.verifying ? progress.verifying.done : progress.done} max={progress.verifying ? progress.verifying.total : progress.total} />
                  <p className="muted small num">
                    {progress.verifying
                      ? `Double-checking critical moments deeper: ${progress.verifying.done} of ${progress.verifying.total}`
                      : `${progress.done} of ${progress.total} positions analysed`}
                  </p>
                  <Button variant="ghost" size="sm" onClick={() => cancelRef.current && (cancelRef.current.cancelled = true)}>Stop</Button>
                </>
              ) : (
                <>
                  <h3>Review this game with the coach</h3>
                  <p className="muted">Every move gets graded and explained. Your mistakes become positions in your review deck.</p>
                  {!myColor && <SidePicker gameId={gameId!} headers={source.headers} />}
                  <Button icon={<Microscope size={16} />} onClick={runReview}>Run coach review</Button>
                </>
              )}
            </div>
          )}

          <div className="tabs" role="tablist">
            {(['coach', 'summary', 'moves', 'masters', 'engine'] as Tab[])
              .filter((t) => t !== 'summary' || review)
              .map((t) => (
                <button key={t} role="tab" aria-selected={tab === t} className={`tab${tab === t ? ' is-on' : ''}`} onClick={() => setTab(t)}>
                  {t === 'coach' ? 'Coach' : t === 'summary' ? 'Summary' : t === 'moves' ? 'Moves' : t === 'masters' ? 'Masters' : 'Engine'}
                </button>
              ))}
          </div>

          {tab === 'coach' && (
            <div className="stack">
              {currentReview ? (
                <VerdictCard
                  review={currentReview}
                  onShowBetter={currentReview.better ? () => setShowBetter(!showBetter) : undefined}
                  showingBetter={showBetter}
                  showEval={settings.showEval}
                  onBreakdown={() => setBreakdown({ fenBefore: currentReview.fenBefore, uci: currentReview.uci })}
                />
              ) : explore ? (
                <div className="panel panel-tight"><Spinner label="Coach is looking at that move…" /></div>
              ) : null}
              <div className="panel">
                <InsightsPanel
                  key={fen}
                  fen={fen}
                  forColor={sideToMove}
                  deep={!!(live && live.fen === fen && live.depth >= 12 && live.lines.length >= 2) && !progress}
                  lines={live && live.fen === fen ? live.lines : null}
                  title={`${sideToMove === 'w' ? 'White' : 'Black'} to move — what matters`}
                  onMarks={setMarks}
                />
              </div>
              <button className="link-btn" onClick={() => setShowStructure(!showStructure)}>
                {showStructure ? 'Hide structure & plans' : 'Structure & long-term plans'}
              </button>
              {showStructure && (
                <div className="panel">
                  <PositionReportView fen={fen} forColor={sideToMove} />
                </div>
              )}
            </div>
          )}

          {tab === 'moves' && (
            <MoveList
              moves={mainline.map((san, i) => ({ san, cls: review?.moves[i]?.cls }))}
              current={explore ? explore.base : ply}
              onSelect={go}
              startMoveNumber={parseInt(startFen.split(' ')[5] || '1', 10)}
              startColor={startFen.split(' ')[1] as 'w' | 'b'}
            />
          )}

          {tab === 'engine' && (
            <div className="stack">
              <Toggle checked={engineOn} onChange={setEngineOn} label="Engine lines" hint="Stockfish 18, running on this device." />
              {engineOn && (
                <EngineLines
                  fen={fen}
                  result={live?.fen === fen ? live : null}
                  onPlay={(u) => onMove({ from: u.slice(0, 2) as Square, to: u.slice(2, 4) as Square, promotion: (u[4] as PieceSymbol) || undefined })}
                />
              )}
            </div>
          )}

          {tab === 'masters' && (
            <div className="panel">
              <MasterMoves
                fen={fen}
                showGames={false}
                onPlay={(san) => {
                  try {
                    const m = new Chess(fen).move(san);
                    onMove({ from: m.from, to: m.to, promotion: m.promotion });
                  } catch {
                    /* not legal here */
                  }
                }}
              />
            </div>
          )}

          {tab === 'summary' && review && <ReviewSummary review={review} myColor={myColor} onJump={(p) => { go(p); setTab('coach'); }} gameId={gameId} />}
        </div>
      </div>

      <Sheet open={confirmDelete} onClose={() => setConfirmDelete(false)} title="Delete this game?">
        <p className="muted">The game and its review are removed from this device. Review cards made from it stay in your deck.</p>
        <div className="row mt16">
          <Button
            variant="danger"
            icon={<Trash2 size={16} />}
            onClick={async () => {
              await deleteGameBody(gameId!);
              removeGame(gameId!);
              navigate('/games', true);
            }}
          >
            Delete game
          </Button>
          <Button variant="ghost" onClick={() => setConfirmDelete(false)}>Cancel</Button>
        </div>
      </Sheet>

      {breakdown && (
        <MoveBreakdown
          fenBefore={breakdown.fenBefore}
          uci={breakdown.uci}
          depth={settings.analysisDepth}
          showEval={settings.showEval}
          onClose={() => setBreakdown(null)}
        />
      )}

      <LoadSheet
        open={loadOpen}
        onClose={() => setLoadOpen(false)}
        onLoad={(f, s) => {
          setStartFen(f);
          setMainline(s);
          setExplore(null);
          setPly(s.length);
          setLoadOpen(false);
        }}
      />
    </div>
  );
}

function uciLine(fen: string, sans: string[]): string[] {
  const c = new Chess(fen);
  const out: string[] = [];
  for (const s of sans) {
    try {
      out.push(uciOf(c.move(s)));
    } catch {
      break;
    }
  }
  return out;
}

const SUMMARY_CLASSES: MoveClass[] = ['brilliant', 'great', 'best', 'excellent', 'good', 'book', 'inaccuracy', 'mistake', 'miss', 'blunder'];

function ReviewSummary({ review, myColor, onJump, gameId }: { review: GameReview; myColor: Color | null; onJump: (ply: number) => void; gameId?: string }) {
  const openingId = useMemo(() => {
    const name = review.opening?.name?.toLowerCase() ?? '';
    const map: [string, string][] = [
      ['najdorf', 'najdorf'], ['dragon', 'dragon'], ['french', 'french'], ['caro-kann', 'caro-kann'], ['ruy lopez', 'ruy-lopez'],
      ['italian', 'italian'], ['giuoco', 'italian'], ["queen's gambit", 'queens-gambit'], ['london', 'london'], ['catalan', 'catalan'],
      ['english', 'english'], ["king's indian", 'kings-indian'], ['nimzo', 'nimzo-indian'], ['grünfeld', 'grunfeld'], ['grunfeld', 'grunfeld'], ['slav', 'slav'],
    ];
    return map.find(([k]) => name.includes(k))?.[1];
  }, [review]);
  const opening = openingId ? getOpening(openingId) : undefined;
  const cards = useApp((s) => s.cards);
  const fromGame = gameId ? Object.values(cards).filter((c) => c.kind === 'puzzle' && c.gameId === gameId).length : 0;
  return (
    <div className="stack">
      <div className="acc-row">
        {(['w', 'b'] as Color[]).map((c) => (
          <div key={c} className={`acc-card${myColor === c ? ' is-me' : ''}`}>
            <span className="acc-side"><span className={`pill-color pill-${c}`} /> {c === 'w' ? 'White' : 'Black'}{myColor === c ? ' (you)' : ''}</span>
            <span className="acc-value num">{review.accuracy[c].toFixed(1)}</span>
            <span className="acc-label">accuracy</span>
          </div>
        ))}
      </div>
      {review.summary.length > 0 && (
        <div className="panel prose">
          {review.summary.map((s, i) => <p key={i}>{s}</p>)}
        </div>
      )}
      <table className="class-table">
        <thead>
          <tr><th /><th>White</th><th>Black</th></tr>
        </thead>
        <tbody>
          {SUMMARY_CLASSES.map((cls) => (
            <tr key={cls}>
              <td><Glyph cls={cls} size="sm" /> {CLASS_INFO[cls].label}</td>
              <td className="num">{review.counts.w[cls] ?? 0}</td>
              <td className="num">{review.counts.b[cls] ?? 0}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {myColor && (
        <div className="panel panel-tight">
          <h4>Your accuracy by phase</h4>
          <div className="phase-bars mt8">
            {(['opening', 'middlegame', 'endgame'] as const).map((ph) => {
              const v = review.phaseAccuracy[myColor][ph];
              return (
                <div key={ph} className="phase-bar">
                  <span className="phase-name">{ph[0].toUpperCase() + ph.slice(1)}</span>
                  {v !== undefined ? <Meter value={v} /> : <span className="faint small">—</span>}
                  <span className="num small">{v ?? ''}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
      {review.keyMoments.length > 0 && (
        <div className="panel panel-tight">
          <h4>Key moments</h4>
          <div className="list mt8">
            {review.keyMoments.map((p) => {
              const m = review.moves[p];
              return (
                <button key={p} className="list-item" onClick={() => onJump(p + 1)}>
                  <Glyph cls={m.cls} />
                  <span className="list-item-main">
                    <span className="list-item-title">{Math.floor(p / 2) + 1}{m.color === 'w' ? '.' : '…'}{m.san}</span>
                    <span className="list-item-sub">{m.headline}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
      <div className="panel panel-tight">
        <h4>Turn this game into training</h4>
        <ul className="bullets mt8">
          {fromGame > 0 && <li>{fromGame} position{fromGame > 1 ? 's' : ''} from this game {fromGame > 1 ? 'are' : 'is'} in your review deck.</li>}
          {opening && (
            <li>
              Opening: <button className="link-btn" onClick={() => navigate(`/openings/${opening.id}`)}>study the {opening.name}</button> — theory lasted {Math.ceil(review.bookPly / 2)} moves.
            </li>
          )}
          <li>
            <button className="link-btn" onClick={() => navigate('/train/review?kind=puzzle')}>Solve your mistakes now</button>
          </li>
        </ul>
      </div>
    </div>
  );
}

function SidePicker({ gameId, headers }: { gameId: string; headers: Record<string, string> }) {
  const updateGame = useApp((s) => s.updateGame);
  const meta = useApp((s) => s.games.find((g) => g.id === gameId));
  const [v, setV] = useState<'w' | 'b' | 'none'>(meta?.myColor ?? 'none');
  return (
    <div className="field">
      <span className="field-label">Which side were you? (so the coach can build your review cards)</span>
      <Segmented
        value={v}
        onChange={(x) => {
          setV(x);
          updateGame(gameId, { myColor: x === 'none' ? null : x });
        }}
        options={[
          { value: 'w', label: headers.White ?? 'White' },
          { value: 'b', label: headers.Black ?? 'Black' },
          { value: 'none', label: 'Neither' },
        ]}
      />
    </div>
  );
}

function LoadSheet({ open, onClose, onLoad }: { open: boolean; onClose: () => void; onLoad: (fen: string, sans: string[]) => void }) {
  const [text, setText] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const load = () => {
    const t = text.trim();
    if (!t) return;
    try {
      const fen = new Chess(t).fen();
      onLoad(fen, []);
      return;
    } catch {
      /* not a FEN */
    }
    const g = parsePgn(t);
    if (!g.moves.length) {
      setErr('Could not read that as a FEN or PGN.');
      return;
    }
    onLoad(g.startFen, g.moves.map((m) => m.san));
  };
  return (
    <Sheet open={open} onClose={onClose} title="Load a position">
      <label className="field">
        <span className="field-label">Paste a FEN or PGN</span>
        <textarea className="textarea" value={text} onChange={(e) => { setText(e.target.value); setErr(null); }} />
      </label>
      {err && <p className="error-text">{err}</p>}
      <div className="row mt12">
        <Button onClick={load}>Load</Button>
        <Button variant="ghost" onClick={() => onLoad(START_FEN, [])}>Reset to start</Button>
      </div>
    </Sheet>
  );
}
