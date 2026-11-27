import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, Check, RotateCcw } from 'lucide-react';
import { Chess, uciOf } from '../lib/chess/core';
import { loadGameBody, type StoredGame } from '../lib/store/gamesDb';
import { useApp, type PuzzleCard } from '../lib/store/app';
import { CLASS_INFO, type MoveReview } from '../lib/coach/explain';
import { navigate } from '../lib/router';
import { PuzzleDrill } from '../components/Trainers';
import { newCardState } from '../lib/srs/scheduler';
import { Button, Empty, Header, Spinner, NextDock } from '../components/ui';

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

/** Your mistakes in a reviewed game, worst first by lost winning chances. */
export function retryCandidates(moves: MoveReview[], color: 'w' | 'b'): MoveReview[] {
  return moves.filter((m) => m.color === color && (m.cls === 'mistake' || m.cls === 'blunder' || m.cls === 'miss') && !!m.bestUci);
}

export function RetryMistakes({ gameId }: { gameId: string }) {
  const meta = useApp((s) => s.games.find((g) => g.id === gameId));
  const logActivity = useApp((s) => s.logActivity);
  const [body, setBody] = useState<StoredGame | null | undefined>(undefined);
  const [index, setIndex] = useState(0);
  const [results, setResults] = useState<Record<number, boolean>>({});
  const [round, setRound] = useState(0);

  useEffect(() => {
    loadGameBody(gameId).then((g) => setBody(g ?? null));
  }, [gameId]);

  const color = meta?.myColor ?? null;
  const items = useMemo(() => (body?.review && color ? retryCandidates(body.review.moves, color) : []), [body, color]);
  const cards: PuzzleCard[] = useMemo(
    () =>
      items.map((m) => ({
        id: `retry:${gameId}:${m.ply}`,
        kind: 'puzzle',
        fen: m.fenBefore,
        solution: m.bestLine?.length ? uciLine(m.fenBefore, m.bestLine) : [m.bestUci!],
        played: m.uci,
        gameId,
        ply: m.ply,
        title: `Move ${Math.floor(m.ply / 2) + 1}: you played ${m.san} — ${CLASS_INFO[m.cls].label.toLowerCase()}`,
        note: m.headline,
        tags: m.tags,
        state: newCardState(0),
        addedAt: 0,
      })),
    [items, gameId],
  );

  if (body === undefined) {
    return (
      <div className="page">
        <Header title="Retry your mistakes" backTo={`/games/${gameId}`} />
        <Spinner label="Loading the game…" />
      </div>
    );
  }
  if (!body?.review || !color || !cards.length) {
    return (
      <div className="page">
        <Header title="Retry your mistakes" backTo={`/games/${gameId}`} />
        <Empty title={!body?.review ? 'Review the game first' : 'No mistakes to retry'}>
          {!body?.review ? 'Run a coach review, then come back to replay your mistakes.' : 'The coach found no mistakes or blunders by you in this game. Nice.'}
        </Empty>
      </div>
    );
  }

  const done = index >= cards.length;
  const solvedFirst = Object.values(results).filter(Boolean).length;
  const answered = results[index] !== undefined;

  if (done) {
    const missed = cards.filter((_, i) => !results[i]);
    return (
      <div className="page page-narrow">
        <Header title="Retry your mistakes" backTo={`/games/${gameId}`} />
        <div className="panel stack retry-done">
          <span className="session-done-num num">{solvedFirst}/{cards.length}</span>
          <h2>{solvedFirst === cards.length ? 'Every mistake fixed on the first try.' : `${solvedFirst} fixed on the first try.`}</h2>
          <p className="muted">
            {missed.length
              ? `The ${missed.length} you missed are already in your review deck and will come back on their schedule.`
              : 'These positions stay in your review deck so the lessons stick.'}
          </p>
          <div className="row">
            {missed.length > 0 && (
              <Button icon={<RotateCcw size={16} />} onClick={() => { setIndex(cards.findIndex((_, i) => !results[i])); setResults(Object.fromEntries(Object.entries(results).filter(([, v]) => v))); setRound(round + 1); }}>
                Retry the missed ones
              </Button>
            )}
            <Button variant="secondary" onClick={() => navigate(`/games/${gameId}`)}>Back to the game</Button>
          </div>
        </div>
      </div>
    );
  }

  const next = () => {
    let n = index + 1;
    if (round > 0) while (n < cards.length && results[n]) n++;
    setIndex(n);
  };

  return (
    <div className="page board-screen-page">
      <Header title="Retry your mistakes" backTo={`/games/${gameId}`} sub={`Mistake ${index + 1} of ${cards.length} · ${solvedFirst} fixed first try`} />
      <div className="retry-progress" aria-hidden>
        {cards.map((_, i) => (
          <span key={i} className={`retry-dot${i === index ? ' is-current' : ''}${results[i] === true ? ' is-good' : results[i] === false ? ' is-bad' : ''}`} />
        ))}
      </div>
      <PuzzleDrill
        key={`${index}:${round}`}
        card={cards[index]}
        onDone={(r) => {
          setResults((x) => ({ ...x, [index]: r.solved }));
          logActivity('reviews');
        }}
      />
      {answered && (
        <NextDock>
          <Button size="lg" icon={results[index] ? <Check size={18} /> : <ArrowRight size={18} />} onClick={next}>
            {index + 1 < cards.length ? 'Next mistake' : 'See results'}
          </Button>
        </NextDock>
      )}
    </div>
  );
}
