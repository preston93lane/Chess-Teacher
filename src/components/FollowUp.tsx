import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Lightbulb, Pause, Play } from 'lucide-react';
import { explainMove, type FollowPly, type FollowUp } from '../lib/coach/followup';
import { Board } from './Board';
import { IconButton, Spinner } from './ui';

/**
 * "Why it works": steps through the follow-up after a key move with a coach
 * note on each move, then explains why the tempting alternatives are worse.
 */
export function FollowUpPanel({
  fen,
  uci,
  line,
  tried,
  title,
}: {
  /** Position before the key move. */
  fen: string;
  /** The key move (UCI). */
  uci: string;
  /** Known solution line starting with the key move (puzzles). */
  line?: string[];
  /** Moves you tried first — explained as "why not". */
  tried?: string[];
  title?: string;
}) {
  const [data, setData] = useState<FollowUp | null>(null);
  const [error, setError] = useState(false);
  const [view, setView] = useState<{ label: string; plies: FollowPly[] } | null>(null);
  const [step, setStep] = useState(1);
  const [auto, setAuto] = useState(false);

  useEffect(() => {
    let alive = true;
    setData(null);
    setError(false);
    explainMove(fen, uci, { line, tried })
      .then((d) => {
        if (!alive) return;
        setData(d);
        setView({ label: d.san, plies: d.plies });
        setStep(1);
      })
      .catch(() => alive && setError(true));
    return () => {
      alive = false;
    };
  }, [fen, uci, line?.join(' '), tried?.join(' ')]); // eslint-disable-line react-hooks/exhaustive-deps

  const plies = view?.plies ?? [];
  useEffect(() => {
    if (!auto) return;
    if (step >= plies.length) {
      setAuto(false);
      return;
    }
    const id = setTimeout(() => setStep((s) => s + 1), 1100);
    return () => clearTimeout(id);
  }, [auto, step, plies.length]);

  if (error) return null;
  if (!data || !view) {
    return (
      <div className="panel followup">
        <Spinner label="Working out the follow-up…" />
      </div>
    );
  }

  const cur = plies[Math.max(0, step - 1)];
  const boardFen = step === 0 ? fen : cur?.fenAfter ?? fen;
  const show = (label: string, p: FollowPly[]) => {
    setView({ label, plies: p });
    setStep(1);
    setAuto(false);
  };
  const isMain = view.label === data.san;

  return (
    <div className="panel followup stack">
      <h3 className="followup-title"><Lightbulb size={18} className="inline-icon" /> {title ?? `Why ${data.san} works`}</h3>
      <p><strong>{data.verdict}</strong>{data.score && <span className="faint small num"> · engine {data.score}</span>}</p>
      {data.threat && <p className="muted">{data.threat.replace(/ is threatened — it /, ' is the threat — it ')}</p>}

      <div className="followup-body">
        <div className="followup-board">
          <Board fen={boardFen} orientation={data.mover} lastMove={step > 0 && cur ? [cur.from, cur.to] : null} />
          <div className="controls">
            <div className="controls-group">
              <IconButton label="Back" onClick={() => setStep(Math.max(0, step - 1))} disabled={step === 0}><ChevronLeft /></IconButton>
              <IconButton label={auto ? 'Pause' : 'Play the line'} onClick={() => { if (step >= plies.length) setStep(0); setAuto(!auto); }}>{auto ? <Pause /> : <Play />}</IconButton>
              <IconButton label="Forward" onClick={() => setStep(Math.min(plies.length, step + 1))} disabled={step >= plies.length}><ChevronRight /></IconButton>
            </div>
            <span className="muted small num">{step}/{plies.length}</span>
          </div>
        </div>
        <div className="followup-text">
          {!isMain && <p className="muted small">{view.label === data.bait?.san ? <>After <strong>{data.san}</strong>, if they reply <strong>{view.label}</strong>:</> : <>The line after <strong>{view.label}</strong> instead:</>}</p>}
          <p className="followup-line num">
            {plies.map((p, i) => {
              const num = i === 0 || p.color === 'w' ? (p.color === 'w' ? `${moveNo(p.fenBefore)}.` : `${moveNo(p.fenBefore)}…`) : '';
              return (
                <button key={i} className={`followup-move${i + 1 === step ? ' is-on' : ''}`} onClick={() => { setStep(i + 1); setAuto(false); }}>
                  {num}{p.san}
                </button>
              );
            })}
          </p>
          {cur && step > 0 && <p className="followup-note">{cur.note || '—'}</p>}
          {!isMain && <button className="link-btn small" onClick={() => show(data.san, data.plies)}>Back to {data.san}</button>}
        </div>
      </div>

      {data.bait && (
        <button className={`followup-alt followup-bait${view.label === data.bait.san ? ' is-on' : ''}`} onClick={() => show(data.bait!.san, data.bait!.plies)}>
          <strong>If they take the bait: {data.bait.san}?</strong>
          <span className="muted small">{data.bait.verdict}</span>
        </button>
      )}

      {data.alternatives.length > 0 && (
        <div className="followup-alts">
          <h4>Why not…</h4>
          {data.alternatives.map((a) => (
            <button key={a.uci} className={`followup-alt${view.label === a.san ? ' is-on' : ''}`} onClick={() => show(a.san, a.plies)}>
              <strong className="num">{a.san}{a.tried ? <span className="faint small"> (your try)</span> : null}</strong>
              <span className="muted small">{a.verdict}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function moveNo(fen: string) {
  return fen.split(' ')[5] ?? '1';
}
