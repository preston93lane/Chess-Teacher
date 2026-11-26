import { useEffect, useMemo, useState } from 'react';
import { Lightbulb, Target, Shield, Eye, Sparkles, BookOpen, ScanSearch } from 'lucide-react';
import { InsightsPanel } from './Insights';
import type { AnalysisResult, EngineLine } from '../lib/engine/stockfish';
import { engine, CancelledError } from '../lib/engine/stockfish';
import {
  CLASS_INFO,
  candidateSummary,
  describeThreat,
  nullMoveFen,
  positionReport,
  type MoveReview,
} from '../lib/coach/explain';
import { describeScore, formatScore, lineScore } from '../lib/coach/eval';
import { hangingPieces } from '../lib/coach/tactics';
import { parseBoard } from '../lib/coach/board';
import { PIECE_NAME, applyUci, sideToMove, type Color } from '../lib/chess/core';
import { navigate } from '../lib/router';
import type { Arrow, Mark } from './Board';
import { Glyph, Spinner } from './ui';

/** The verdict card: big annotation glyph + coach explanation. */
export function VerdictCard({
  review,
  onShowBetter,
  showingBetter,
  label,
  showEval = true,
  onBreakdown,
}: {
  review: MoveReview;
  onShowBetter?: () => void;
  showingBetter?: boolean;
  label?: string;
  showEval?: boolean;
  onBreakdown?: () => void;
}) {
  const info = CLASS_INFO[review.cls];
  return (
    <article className={`verdict tone-${info.tone}`} aria-live="polite">
      <div className="verdict-glyph" aria-hidden>
        {info.glyph}
      </div>
      <div className="verdict-body">
        <p className="verdict-kicker">
          <span className={`tone-text-${info.tone}`}>{info.label}</span>
          <span className="verdict-move">{label ?? review.san}</span>
          {showEval && review.evalAfter && <span className="verdict-eval">{formatScore(review.evalAfter)}</span>}
        </p>
        <h3 className="verdict-headline">{review.headline}</h3>
        {review.notes
          .filter((n) => showEval || !n.startsWith('Evaluation '))
          .map((n, i) => (
            <p key={i} className="verdict-note">
              {n}
            </p>
          ))}
        {review.better && (
          <div className="verdict-better">
            <p>{review.better}</p>
            {review.betterLine && <p className="verdict-line">{review.betterLine}</p>}
            {onShowBetter && (
              <button className="link-btn" onClick={onShowBetter}>
                {showingBetter ? 'Hide on board' : 'Show on board'}
              </button>
            )}
          </div>
        )}
        {onBreakdown && (
          <button className="btn btn-secondary btn-sm verdict-breakdown" onClick={onBreakdown}>
            <ScanSearch size={16} />
            <span>Break it down</span>
          </button>
        )}
      </div>
    </article>
  );
}

export function EngineLines({ fen, result, onPlay }: { fen: string; result: AnalysisResult | null; onPlay?: (uci: string) => void }) {
  if (!result || !result.lines.length) return <div className="engine-lines is-empty"><Spinner label="Engine thinking…" /></div>;
  return (
    <div className="engine-lines">
      <div className="engine-meta">Stockfish 18 · depth {result.depth}</div>
      {result.lines.map((l) => {
        const c = candidateSummary(fen, l);
        return (
          <button key={l.multipv} className="engine-line" onClick={() => onPlay?.(l.pv[0])}>
            <span className="engine-score">{formatScore(lineScore(l))}</span>
            <span className="engine-pv">{c.line}</span>
          </button>
        );
      })}
    </div>
  );
}

/** "What's going on?" — structure, plans and advice for a side. */
export function PositionReportView({ fen, forColor, compact }: { fen: string; forColor: Color; compact?: boolean }) {
  const report = useMemo(() => positionReport(fen, forColor), [fen, forColor]);
  return (
    <div className="report">
      <p className="report-line">
        <strong>{report.phase}.</strong> {report.material}
      </p>
      {report.structure && (
        <div className="report-structure">
          <h4>{report.structure.name}</h4>
          <p>{report.structure.summary}</p>
          {report.structure.plans.length > 0 && (
            <ul className="report-plans">
              {report.structure.plans.slice(0, compact ? 2 : 4).map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
          )}
          {report.structure.lessonId && (
            <button className="link-btn" onClick={() => navigate(`/train/lesson/${report.structure!.lessonId}`)}>
              <BookOpen size={14} /> Study this structure
            </button>
          )}
        </div>
      )}
      {report.advice.length > 0 && (
        <ul className="report-advice">
          {report.advice.slice(0, compact ? 3 : 5).map((a) => (
            <li key={a.text}>{a.text}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function reportMarks(fen: string, forColor: Color): Mark[] {
  const r = positionReport(fen, forColor);
  const sq = new Set<string>();
  for (const a of r.advice.slice(0, 2)) for (const s of a.squares ?? []) if (s.length === 2) sq.add(s);
  return [...sq].slice(0, 8).map((s) => ({ sq: s, color: 'plan' as const }));
}

type HintLevel = 0 | 1 | 2 | 3 | 4;

/** Tiered hints: threats → plan → candidate pieces → best move. */
export function HintPanel({
  fen,
  analysis,
  onArrows,
  onMarks,
  onUsed,
}: {
  fen: string;
  analysis: AnalysisResult | null;
  onArrows: (a: Arrow[]) => void;
  onMarks: (m: Mark[]) => void;
  onUsed?: (level: number) => void;
}) {
  const [level, setLevel] = useState<HintLevel>(0);
  const [threat, setThreat] = useState<string | null | undefined>(undefined);
  const me = sideToMove(fen);

  useEffect(() => {
    setLevel(0);
    setThreat(undefined);
    onArrows([]);
    onMarks([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fen]);

  const requestThreat = async () => {
    const flipped = nullMoveFen(fen);
    const loose = hangingPieces(parseBoard(fen), me);
    if (!flipped) {
      setThreat('You are in check — deal with it first.');
      return;
    }
    try {
      const res = await engine.analyze(flipped, { depth: 11, multipv: 1 });
      const line = res.lines[0];
      let text = line ? describeThreat(fen, line, analysis?.lines[0] ? lineScore(analysis.lines[0]) : undefined) : null;
      if (!text && loose.length) text = `Your ${PIECE_NAME[loose[0].piece.type]} on ${loose[0].square} is loose.`;
      setThreat(text ?? 'No immediate threat. You have time for a plan.');
      if (line && text && !text.startsWith('No')) {
        const mv = applyUci(flipped, line.pv[0]);
        if (mv) onArrows([{ from: mv.move.from, to: mv.move.to, color: 'r' }]);
      }
    } catch (e) {
      if (!(e instanceof CancelledError)) setThreat('Could not analyse threats.');
    }
  };

  const next = async () => {
    const n = Math.min(4, level + 1) as HintLevel;
    setLevel(n);
    onUsed?.(n);
    if (n === 1) {
      onMarks([]);
      await requestThreat();
    } else if (n === 2) {
      onArrows([]);
      onMarks(reportMarks(fen, me));
    } else if (n === 3) {
      onMarks(
        (analysis?.lines ?? []).slice(0, 3).map((l) => ({ sq: l.pv[0].slice(0, 2), color: 'focus' as const })),
      );
      onArrows([]);
    } else if (n === 4) {
      const best = analysis?.lines[0];
      if (best) onArrows([{ from: best.pv[0].slice(0, 2), to: best.pv[0].slice(2, 4), color: 'y' }]);
      onMarks([]);
    }
  };

  const labels = ['Get a hint', 'What matters here?', 'Which pieces?', 'Show the best move', 'All hints shown'];
  const icons = [Lightbulb, Shield, Target, Eye, Sparkles];
  const Icon = icons[level];

  const lines: EngineLine[] = analysis?.lines ?? [];
  return (
    <div className="hints">
      {level >= 1 && (
        <div className="hint-step">
          <span className="hint-tag">Threat check</span>
          <p>{threat === undefined ? <Spinner label="Looking at their ideas…" /> : threat}</p>
        </div>
      )}
      {level >= 2 && (
        <div className="hint-step">
          <span className="hint-tag">What matters</span>
          <InsightsPanel fen={fen} forColor={me} title={null} max={4} />
        </div>
      )}
      {level >= 3 && (
        <div className="hint-step">
          <span className="hint-tag">Candidates</span>
          <p>
            {lines.length
              ? `Look at the highlighted piece${lines.length > 1 ? 's' : ''}: ${[...new Set(lines.slice(0, 3).map((l) => l.pv[0].slice(0, 2)))].join(', ')}.`
              : 'Engine still thinking…'}
          </p>
        </div>
      )}
      {level >= 4 && lines[0] && (
        <div className="hint-step">
          <span className="hint-tag">Best</span>
          <p>
            {candidateSummary(fen, lines[0]).san} — {candidateSummary(fen, lines[0]).text || describeScore(lineScore(lines[0]))}
          </p>
        </div>
      )}
      {level < 4 && (
        <button className="btn btn-secondary btn-sm hint-next" onClick={next}>
          <Icon size={16} />
          <span>{labels[level]}</span>
        </button>
      )}
    </div>
  );
}

export { Glyph };
