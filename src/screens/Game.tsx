import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Flag,
  Handshake,
  Lightbulb,
  Microscope,
  Play,
  RefreshCw,
  Repeat,
  ScanSearch,
  SlidersHorizontal,
  Undo2,
} from 'lucide-react';
import { Chess, applySan, uciOf, type PieceSymbol, type Square } from '../lib/chess/core';
import { useSession, type LiveGame } from '../lib/gameSession';
import { getBot, botMove } from '../lib/bots';
import { engine, CancelledError, type AnalysisResult } from '../lib/engine/stockfish';
import { reviewMove, BAD_CLASSES, type MoveReview } from '../lib/coach/explain';
import { lineScore, winPct } from '../lib/coach/eval';
import { getOpening, openingBookMoves, pickWeighted } from '../lib/openings/book';
import { openingFor } from '../lib/openings/eco';
import { useApp } from '../lib/store/app';
import { saveGameBody } from '../lib/store/gamesDb';
import { navigate } from '../lib/router';
import { soundForSan, playSound } from '../lib/sound';
import { useArrowKeys } from '../lib/hooks';
import { Board, type Arrow, type Mark } from '../components/Board';
import { EvalBar } from '../components/EvalBar';
import { MoveList } from '../components/MoveList';
import { VerdictCard, HintPanel, PositionReportView } from '../components/Coach';
import { Button, Empty, Header, IconButton, Sheet, Spinner, Toggle } from '../components/ui';
import { InsightsPanel } from '../components/Insights';
import { MoveBreakdown } from '../components/MoveBreakdown';
import { toast } from '../components/Toast';

function replay(startFen: string, sans: string[]) {
  const c = new Chess(startFen);
  const fens = [c.fen()];
  const moves: { from: string; to: string }[] = [];
  for (const s of sans) {
    const m = c.move(s);
    fens.push(c.fen());
    moves.push({ from: m.from, to: m.to });
  }
  return { fens, moves };
}

function gameOverInfo(fen: string): { result: string; reason: string } | null {
  const c = new Chess(fen);
  if (c.isCheckmate()) return { result: c.turn() === 'w' ? '0-1' : '1-0', reason: 'Checkmate' };
  if (c.isStalemate()) return { result: '1/2-1/2', reason: 'Stalemate' };
  if (c.isInsufficientMaterial()) return { result: '1/2-1/2', reason: 'Insufficient material' };
  if (c.isThreefoldRepetition()) return { result: '1/2-1/2', reason: 'Threefold repetition' };
  if (c.isDraw()) return { result: '1/2-1/2', reason: 'Fifty-move rule' };
  return null;
}

export function GameScreen() {
  const game = useSession((s) => s.game);
  if (!game) {
    return (
      <div className="page page-narrow">
        <Header title="No game in progress" backTo="/play" />
        <Empty title="Start a game" action={<Button onClick={() => navigate('/play')}>Choose an opponent</Button>}>
          Play the coach from the standard position, an opening or any position you like.
        </Empty>
      </div>
    );
  }
  return <LiveGameView game={game} />;
}

function LiveGameView({ game }: { game: LiveGame }) {
  const patch = useSession((s) => s.patch);
  const setGame = useSession((s) => s.setGame);
  const settings = useApp((s) => s.settings);
  const addGame = useApp((s) => s.addGame);
  const logActivity = useApp((s) => s.logActivity);
  const markPlanStep = useApp((s) => s.markPlanStep);
  const updateSettings = useApp((s) => s.updateSettings);
  const { config } = game;
  const bot = getBot(config.botId);
  const opening = config.openingId ? getOpening(config.openingId) : undefined;
  const { fens, moves } = useMemo(() => replay(config.startFen, game.sans), [config.startFen, game.sans]);
  const fen = fens[fens.length - 1];
  const turn = fen.split(' ')[1] as 'w' | 'b';
  const userTurn = game.status === 'playing' && turn === config.userColor;
  const [viewPly, setViewPly] = useState<number | null>(null);
  const shownPly = viewPly ?? game.sans.length;
  const shownFen = fens[shownPly];
  const [orientation, setOrientation] = useState(config.userColor);
  const [thinking, setThinking] = useState(false);
  const [reviewing, setReviewing] = useState(false);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [arrows, setArrows] = useState<Arrow[]>([]);
  const [marks, setMarks] = useState<Mark[]>([]);
  const [showBetter, setShowBetter] = useState(false);
  const [tab, setTab] = useState<'coach' | 'moves' | 'plan'>('coach');
  const [endOpen, setEndOpen] = useState(false);
  const [confirmResign, setConfirmResign] = useState(false);
  const thinkingFor = useRef<string | null>(null);
  const depth = settings.analysisDepth;
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [breakdown, setBreakdown] = useState<{ fenBefore: string; uci: string } | null>(null);
  const [deepInsight, setDeepInsight] = useState(false);

  useEffect(() => setDeepInsight(false), [fen]);

  // The user's most recent move (for "Break it down").
  const lastUserPly = useMemo(() => {
    const startTurn = config.startFen.split(' ')[1];
    for (let p = game.sans.length - 1; p >= config.presetSans.length; p--) {
      const color = (p % 2 === 0) === (startTurn === 'w') ? 'w' : 'b';
      if (color === config.userColor) return p;
    }
    return -1;
  }, [game.sans.length, config.startFen, config.presetSans.length, config.userColor]);

  const openBreakdown = (ply: number) => {
    const m = applySan(fens[ply], game.sans[ply]);
    if (m) setBreakdown({ fenBefore: fens[ply], uci: uciOf(m.move) });
  };

  // ---- prefetch analysis on the user's turn (for hints and move review) ----
  useEffect(() => {
    if (!userTurn) return;
    let alive = true;
    setAnalysis(null);
    engine
      .analyze(fen, { depth, multipv: 3 })
      .then((r) => alive && setAnalysis(r))
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [fen, userTurn, depth]);

  // ---- end of game ----
  const finish = useCallback(
    async (result: string, reason: string, g: LiveGame) => {
      patch({ status: 'ended', result, endReason: reason });
      playSound('end');
      setEndOpen(true);
      if (g.saved) return;
      const opening = await openingFor(g.sans, g.config.startFen).catch(() => undefined);
      const you = 'You';
      const meta = {
        id: g.id,
        createdAt: g.createdAt,
        white: g.config.userColor === 'w' ? you : bot.name,
        black: g.config.userColor === 'b' ? you : bot.name,
        result,
        myColor: g.config.userColor,
        source: (g.config.openingId ? 'practice' : 'bot') as 'practice' | 'bot',
        opening: opening?.name ?? (g.config.openingId ? getOpening(g.config.openingId)?.name : undefined),
        eco: opening?.eco,
        botId: g.config.botId,
        plies: g.sans.length,
        date: new Date(g.createdAt).toISOString().slice(0, 10),
      };
      const comments: Record<number, string> = {};
      Object.values(g.reviews).forEach((r) => (comments[r.ply] = `${r.headline}`));
      await saveGameBody({
        id: g.id,
        headers: {
          Event: 'Outpost training game',
          Date: meta.date.replace(/-/g, '.'),
          White: meta.white,
          Black: meta.black,
          Result: result,
          Termination: reason,
        },
        startFen: g.config.startFen,
        sans: g.sans,
        openingId: g.config.openingId,
      });
      addGame(meta);
      logActivity('games');
      if (g.config.openingId) markPlanStep(`play:${g.config.openingId}:${g.config.userColor}`);
      patch({ saved: true });
    },
    [patch, addGame, logActivity, markPlanStep, bot.name],
  );

  useEffect(() => {
    if (game.status !== 'playing') return;
    const over = gameOverInfo(fen);
    if (over) void finish(over.result, over.reason, game);
  }, [fen, game, finish]);

  // ---- bot moves ----
  useEffect(() => {
    if (game.status !== 'playing' || turn === config.userColor || reviewing) return;
    if (gameOverInfo(fen)) return;
    if (thinkingFor.current === fen) return;
    thinkingFor.current = fen;
    setThinking(true);
    const plyAtStart = game.sans.length;
    (async () => {
      let uci: string | null = null;
      if (opening) {
        const book = openingBookMoves(opening, fen);
        const pick = pickWeighted(book);
        if (pick) {
          uci = pick.uci;
          await new Promise((r) => setTimeout(r, 500));
        }
      }
      if (!uci) uci = await botMove(fen, bot);
      const current = useSession.getState().game;
      if (!uci || !current || current.sans.length !== plyAtStart || current.status !== 'playing') return;
      const c = new Chess(fen);
      const m = c.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: (uci[4] as PieceSymbol) || undefined });
      soundForSan(m.san);
      patch({ sans: [...current.sans, m.san] });
    })()
      .catch((e) => {
        if (!(e instanceof CancelledError)) toast('The engine had a problem. Try taking back a move.');
      })
      .finally(() => {
        setThinking(false);
        thinkingFor.current = null;
      });
  }, [fen, turn, config.userColor, game.status, reviewing, opening, bot, game.sans.length, patch]);

  // ---- user moves ----
  const onMove = useCallback(
    async (mv: { from: Square; to: Square; promotion?: PieceSymbol }) => {
      if (!userTurn || viewPly !== null) return;
      const fenBefore = fen;
      const c = new Chess(fenBefore);
      let m;
      try {
        m = c.move(mv);
      } catch {
        return;
      }
      const ply = game.sans.length;
      const fenAfter = c.fen();
      setArrows([]);
      setMarks([]);
      setShowBetter(false);
      soundForSan(m.san);

      let inBook = false;
      let bookNote: string | undefined;
      if (opening) {
        const book = openingBookMoves(opening, fenBefore);
        if (book.length) {
          const hit = book.find((b) => b.san === m.san);
          if (hit) {
            inBook = true;
            bookNote = hit.note;
          } else {
            bookNote = `You left the ${opening.name} theory here. The book move${book.length > 1 ? 's are' : ' is'} ${book.map((b) => b.san).join(', ')}.`;
          }
        }
      }
      const doReview = config.coachLive;
      if (doReview) setReviewing(true);
      patch({ sans: [...game.sans, m.san], bookNotes: bookNote ? { ...game.bookNotes, [ply]: bookNote } : game.bookNotes });
      if (!doReview) return;
      try {
        const before = analysis && analysis.fen === fenBefore ? analysis : await engine.analyze(fenBefore, { depth, multipv: 3 });
        const after = gameOverInfo(fenAfter) ? null : await engine.analyze(fenAfter, { depth, multipv: 1 });
        const mk = (b: AnalysisResult, a: AnalysisResult | null) =>
          reviewMove({
            ply,
            fenBefore,
            uci: uciOf(m),
            before: b.lines,
            after: a?.lines[0],
            isBook: inBook,
            bookNote,
            openingName: inBook ? opening?.name : undefined,
            prevClass: useSession.getState().game?.reviews[ply - 1]?.cls,
            prevMoveTo: moves[ply - 1]?.to,
          });
        let review = mk(before, after);
        if (!inBook && [...BAD_CLASSES, 'brilliant', 'great'].includes(review.cls)) {
          // Double-check critical verdicts with a deeper search before showing them.
          const deepBefore = await engine.analyze(fenBefore, { depth: depth + 4, multipv: 3 });
          const deepAfter = after ? await engine.analyze(fenAfter, { depth: depth + 4, multipv: 1 }) : null;
          review = mk(deepBefore, deepAfter);
        }
        if (!inBook && bookNote) review.notes.unshift(bookNote);
        const cur = useSession.getState().game;
        if (cur && cur.id === game.id) patch({ reviews: { ...cur.reviews, [ply]: review } });
        if (BAD_CLASSES.includes(review.cls) && review.cls !== 'inaccuracy') playSound('bad');
        else if (review.cls === 'brilliant' || review.cls === 'great') playSound('good');
        setTab('coach');
      } catch (e) {
        if (!(e instanceof CancelledError)) console.warn(e);
      } finally {
        setReviewing(false);
      }
    },
    [userTurn, viewPly, fen, game, opening, config.coachLive, patch, analysis, depth, moves],
  );

  const takeBack = () => {
    engine.cancelAll();
    thinkingFor.current = null;
    setThinking(false);
    setReviewing(false);
    const n = game.sans.length;
    // Remove back to the last position where it was the user's turn.
    let target = n - 1;
    const startTurn = config.startFen.split(' ')[1];
    const colorAt = (ply: number) => ((ply % 2 === 0) === (startTurn === 'w') ? 'w' : 'b');
    while (target > config.presetSans.length && colorAt(target) !== config.userColor) target--;
    if (target < config.presetSans.length || colorAt(target) !== config.userColor) return;
    const reviews = { ...game.reviews };
    for (const k of Object.keys(reviews)) if (+k >= target) delete reviews[+k];
    patch({ sans: game.sans.slice(0, target), reviews, takebacks: game.takebacks + 1, status: 'playing', result: undefined, endReason: undefined });
    setViewPly(null);
    setArrows([]);
    setMarks([]);
    setEndOpen(false);
  };

  const resign = () => {
    setConfirmResign(false);
    void finish(config.userColor === 'w' ? '0-1' : '1-0', 'You resigned', game);
  };

  const offerDraw = async () => {
    const r = analysis ?? (await engine.analyze(fen, { depth: 12 }));
    const botWin = winPct(lineScore(r.lines[0]), config.userColor === 'w' ? 'b' : 'w');
    if (botWin <= 55 && game.sans.length >= 30) void finish('1/2-1/2', 'Draw agreed', game);
    else toast(`${bot.name} declines the draw.`);
  };

  const rematch = (swap: boolean) => {
    engine.newGame();
    const userColor = swap ? (config.userColor === 'w' ? 'b' : 'w') : config.userColor;
    setGame({
      ...game,
      id: `g${Date.now().toString(36)}`,
      config: { ...config, userColor },
      sans: [...config.presetSans],
      reviews: {},
      bookNotes: {},
      status: 'playing',
      result: undefined,
      endReason: undefined,
      hints: 0,
      takebacks: 0,
      createdAt: Date.now(),
      saved: false,
    });
    setOrientation(userColor);
    setViewPly(null);
    setEndOpen(false);
  };

  useArrowKeys({
    left: () => setViewPly((v) => Math.max(0, (v ?? game.sans.length) - 1)),
    right: () => setViewPly((v) => (v === null || v + 1 >= game.sans.length ? null : v + 1)),
  });

  // Latest review for the shown position
  const shownReview: MoveReview | undefined = useMemo(() => {
    if (viewPly !== null) return game.reviews[viewPly - 1];
    const plies = Object.keys(game.reviews).map(Number).sort((a, b) => b - a);
    return plies.length ? game.reviews[plies[0]] : undefined;
  }, [game.reviews, viewPly]);

  const latestBookNote = game.bookNotes[game.sans.length - (turn === config.userColor ? 2 : 1)];
  const lastMove = shownPly > 0 ? moves[shownPly - 1] : null;
  const betterArrows: Arrow[] =
    showBetter && shownReview?.bestUci
      ? [{ from: shownReview.bestUci.slice(0, 2), to: shownReview.bestUci.slice(2, 4), color: 'y' }]
      : [];
  const evalScore = analysis?.fen === shownFen ? lineScore(analysis.lines[0]) : shownReview && viewPly === null ? shownReview.evalAfter : undefined;
  const isLive = viewPly === null;
  const reviewBadge =
    shownReview && isLive && shownReview.ply === game.sans.length - 1
      ? { sq: moves[shownReview.ply].to, cls: shownReview.cls }
      : shownReview && viewPly !== null && shownReview.ply === viewPly - 1
        ? { sq: moves[shownReview.ply].to, cls: shownReview.cls }
        : null;
  const userLabel = 'You';
  const top = orientation === 'w' ? 'b' : 'w';
  const tag = (c: 'w' | 'b') =>
    c === config.userColor ? (
      <div className="player-tag"><span className={`pill-color pill-${c}`} />{userLabel}</div>
    ) : (
      <div className="player-tag">
        <span className={`pill-color pill-${c}`} />
        {bot.name} <span className="muted num">{bot.elo}</span>
        {thinking && <span className="thinking"><Spinner /></span>}
      </div>
    );

  return (
    <div className="page board-screen-page">
      <Header
        title={config.title ? `${config.title}` : `vs ${bot.name}`}
        backTo="/play"
        actions={
          <IconButton label="Coaching options" onClick={() => setOptionsOpen(true)}>
            <SlidersHorizontal size={20} />
          </IconButton>
        }
        sub={game.status === 'ended' ? `${game.result} · ${game.endReason}` : config.coachLive ? 'Coach is watching every move' : 'Coach off — review after the game'}
      />
      <div className="board-screen">
        <div className="board-col">
          {tag(top)}
          <div className="board-wrap">
            {settings.showEval && <EvalBar score={evalScore} orientation={orientation} pending={!evalScore} />}
            <div className="board-holder">
              <Board
                fen={shownFen}
                orientation={orientation}
                movable={isLive && userTurn && !reviewing ? config.userColor : null}
                onMove={onMove}
                lastMove={lastMove ? [lastMove.from, lastMove.to] : null}
                arrows={[...arrows, ...betterArrows]}
                marks={marks}
                badge={config.coachLive ? reviewBadge : null}
              />
            </div>
          </div>
          {tag(orientation)}
          <div className="controls">
            <div className="controls-group">
              <IconButton label="Previous move" onClick={() => setViewPly(Math.max(0, shownPly - 1))} disabled={shownPly === 0}>
                <ChevronLeft />
              </IconButton>
              <IconButton label="Next move" onClick={() => setViewPly(shownPly + 1 >= game.sans.length ? null : shownPly + 1)} disabled={isLive}>
                <ChevronRight />
              </IconButton>
            </div>
            <div className="controls-group">
              <IconButton label="Take back" onClick={takeBack} disabled={game.sans.length <= config.presetSans.length}>
                <Undo2 />
              </IconButton>
              <IconButton label="Hint" onClick={() => setTab('coach')} className={tab === 'coach' ? 'is-on' : ''}>
                <Lightbulb />
              </IconButton>
              <IconButton label="Break down my last move" onClick={() => openBreakdown(lastUserPly)} disabled={lastUserPly < 0}>
                <ScanSearch />
              </IconButton>
              <IconButton label="Flip board" onClick={() => setOrientation(orientation === 'w' ? 'b' : 'w')}>
                <RefreshCw />
              </IconButton>
              {game.status === 'playing' ? (
                <>
                  <IconButton label="Offer draw" onClick={offerDraw}>
                    <Handshake />
                  </IconButton>
                  <IconButton label="Resign" onClick={() => setConfirmResign(true)}>
                    <Flag />
                  </IconButton>
                </>
              ) : (
                <IconButton label="Game over" onClick={() => setEndOpen(true)}>
                  <Microscope />
                </IconButton>
              )}
            </div>
          </div>
          {!isLive && (
            <button className="back-to-live" onClick={() => setViewPly(null)}>
              <Play size={14} /> Back to the game
            </button>
          )}
        </div>

        <div className="side-col">
          <div className="tabs" role="tablist">
            {(['coach', 'moves', 'plan'] as const).map((t) => (
              <button key={t} role="tab" aria-selected={tab === t} className={`tab${tab === t ? ' is-on' : ''}`} onClick={() => setTab(t)}>
                {t === 'coach' ? 'Coach' : t === 'moves' ? 'Moves' : 'Plan'}
              </button>
            ))}
          </div>
          {tab === 'coach' && (
            <div className="stack">
              {reviewing && <div className="panel panel-tight"><Spinner label="Coach is looking at your move…" /></div>}
              {!reviewing && shownReview && (
                <>
                  <VerdictCard
                    review={shownReview}
                    onShowBetter={shownReview.better ? () => setShowBetter(!showBetter) : undefined}
                    showingBetter={showBetter}
                    showEval={settings.showEval}
                    onBreakdown={() => openBreakdown(shownReview.ply)}
                  />
                  {isLive && game.status === 'playing' && ['mistake', 'blunder', 'miss'].includes(shownReview.cls) && shownReview.ply === game.sans.length - (turn === config.userColor ? 2 : 1) && (
                    <Button variant="secondary" icon={<Undo2 size={16} />} onClick={takeBack}>
                      Take back and find a better move
                    </Button>
                  )}
                </>
              )}
              {!reviewing && !shownReview && latestBookNote && <p className="panel panel-tight muted">{latestBookNote}</p>}
              {!reviewing && !shownReview && !latestBookNote && (
                <p className="panel panel-tight muted">
                  {config.coachLive
                    ? 'Make a move. The coach will grade it and explain the ideas.'
                    : 'Live coaching is off. Use hints if you get stuck, and review the game when it ends.'}
                </p>
              )}
              {!reviewing && !shownReview && lastUserPly >= 0 && (
                <Button variant="secondary" icon={<ScanSearch size={16} />} onClick={() => openBreakdown(lastUserPly)}>
                  Break down my last move
                </Button>
              )}
              {isLive && userTurn && (settings.coachTalk || deepInsight) && (
                <div className="panel panel-tight">
                  <InsightsPanel
                    fen={fen}
                    forColor={config.userColor}
                    deep={deepInsight}
                    lines={analysis?.fen === fen ? analysis.lines : null}
                    max={deepInsight ? 6 : 3}
                    title={deepInsight ? 'What matters here' : 'Before you move'}
                    onMarks={setMarks}
                  />
                </div>
              )}
              {isLive && userTurn && !deepInsight && (
                <button className="link-btn" onClick={() => setDeepInsight(true)}>
                  <ScanSearch size={14} /> {settings.coachTalk ? 'Look deeper: threats and tactics' : 'What matters here?'}
                </button>
              )}
              {isLive && userTurn && (
                <HintPanel
                  fen={fen}
                  analysis={analysis}
                  onArrows={setArrows}
                  onMarks={setMarks}
                  onUsed={() => patch({ hints: game.hints + 1 })}
                />
              )}
            </div>
          )}
          {tab === 'moves' && (
            <MoveList
              moves={game.sans.map((san, i) => ({ san, cls: game.reviews[i]?.cls }))}
              current={shownPly}
              onSelect={(p) => setViewPly(p >= game.sans.length ? null : p)}
              startMoveNumber={parseInt(config.startFen.split(' ')[5] || '1', 10)}
              startColor={config.startFen.split(' ')[1] as 'w' | 'b'}
            />
          )}
          {tab === 'plan' && (
            <div className="panel">
              <PositionReportView fen={shownFen} forColor={config.userColor} />
            </div>
          )}
        </div>
      </div>

      <Sheet open={optionsOpen} onClose={() => setOptionsOpen(false)} title="Coaching options">
        <Toggle
          checked={config.coachLive}
          onChange={(v) => {
            patch({ config: { ...config, coachLive: v } });
            updateSettings({ coachLive: v });
          }}
          label="Live coach"
          hint="Grade and explain each of your moves as you play."
        />
        <Toggle
          checked={settings.coachTalk}
          onChange={(v) => updateSettings({ coachTalk: v })}
          label="Position talk"
          hint="Before your move, the coach points out what matters — loose pieces, pins, space — without naming a move."
        />
        <Toggle
          checked={settings.showEval}
          onChange={(v) => updateSettings({ showEval: v })}
          label="Evaluation bar & numbers"
          hint="Hide the engine’s score if you want to judge positions yourself."
        />
        <p className="muted small mt12">Hints and “Break it down” stay available either way. These choices become your defaults for new games.</p>
      </Sheet>

      {breakdown && (
        <MoveBreakdown
          fenBefore={breakdown.fenBefore}
          uci={breakdown.uci}
          depth={depth}
          showEval={settings.showEval}
          onClose={() => setBreakdown(null)}
        />
      )}

      <Sheet open={confirmResign} onClose={() => setConfirmResign(false)} title="Resign this game?">
        <p className="muted">The game is saved to your history so you can review it.</p>
        <div className="row mt16">
          <Button variant="danger" onClick={resign} icon={<Flag size={16} />}>Resign</Button>
          <Button variant="ghost" onClick={() => setConfirmResign(false)}>Keep playing</Button>
        </div>
      </Sheet>

      <Sheet open={endOpen} onClose={() => setEndOpen(false)} title={resultTitle(game)}>
        <p className="muted">{game.endReason}. {game.takebacks ? `${game.takebacks} takeback${game.takebacks > 1 ? 's' : ''}, ` : ''}{game.hints ? `${game.hints} hint${game.hints > 1 ? 's' : ''}.` : ''}</p>
        <div className="stack mt16">
          <Button size="lg" icon={<Microscope size={18} />} onClick={() => navigate(`/games/${game.id}?auto=1`)}>
            Review with the coach
          </Button>
          <div className="row">
            <Button variant="secondary" icon={<Repeat size={16} />} onClick={() => rematch(false)}>Rematch</Button>
            <Button variant="secondary" icon={<RefreshCw size={16} />} onClick={() => rematch(true)}>Switch colours</Button>
            <Button variant="ghost" onClick={() => navigate('/play')}>New setup</Button>
          </div>
        </div>
      </Sheet>
    </div>
  );
}

function resultTitle(g: LiveGame) {
  if (!g.result) return 'Game over';
  if (g.result === '1/2-1/2') return 'Draw';
  const userWon = (g.result === '1-0') === (g.config.userColor === 'w');
  return userWon ? 'You won' : 'You lost';
}
