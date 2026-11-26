import { useCallback, useEffect, useState } from 'react';
import { ArrowRight, Check } from 'lucide-react';
import { useApp, dueCards, type Card } from '../lib/store/app';
import { gradeFromMistakes, type Grade } from '../lib/srs/scheduler';
import { navigate, query, useRoute } from '../lib/router';
import { getOpening } from '../lib/openings/book';
import { Button, Empty, Header } from '../components/ui';
import { LineDrill, PuzzleDrill, type DrillResult } from '../components/Trainers';
import { BlockBanner, completeBlock } from '../components/BlockBanner';

export function ReviewSession() {
  const path = useRoute();
  const kind = query(path).get('kind');
  const gradeCard = useApp((s) => s.gradeCard);
  const logActivity = useApp((s) => s.logActivity);
  const [queue] = useState<Card[]>(() =>
    dueCards(useApp.getState().cards).filter((c) => !kind || c.kind === kind).slice(0, 30),
  );
  const [index, setIndex] = useState(0);
  const [graded, setGraded] = useState<Grade | null>(null);
  const [tally, setTally] = useState({ good: 0, again: 0 });
  const card = queue[index];
  const blockId = query(path).get('block');
  useEffect(() => {
    if (!card) completeBlock(blockId);
  }, [card, blockId]);

  const onLineDone = useCallback(
    (r: DrillResult) => {
      if (!card) return;
      const g = gradeFromMistakes(r.mistakes, r.hints);
      gradeCard(card.id, g, r.weakPlies);
      logActivity('reviews');
      setGraded(g);
      setTally((t) => (g === 'again' ? { ...t, again: t.again + 1 } : { ...t, good: t.good + 1 }));
    },
    [card, gradeCard, logActivity],
  );

  const onPuzzleDone = useCallback(
    (r: { solved: boolean; tries: number }) => {
      if (!card) return;
      const g: Grade = r.solved ? 'good' : r.tries <= 2 ? 'hard' : 'again';
      gradeCard(card.id, g);
      logActivity('puzzles');
      logActivity('reviews');
      setGraded(g);
      setTally((t) => (g === 'again' ? { ...t, again: t.again + 1 } : { ...t, good: t.good + 1 }));
    },
    [card, gradeCard, logActivity],
  );

  const next = () => {
    setGraded(null);
    setIndex(index + 1);
  };

  if (!queue.length) {
    return (
      <div className="page page-narrow">
        <Header title="Review" backTo={blockId ? '/program' : '/train'} />
        <BlockBanner />
        <Empty title="Nothing due" action={<Button onClick={() => navigate('/openings')}>Learn a new line</Button>}>
          You’re all caught up. New cards appear when you learn lines or review games.
        </Empty>
      </div>
    );
  }

  if (!card) {
    return (
      <div className="page page-narrow">
        <Header title="Session complete" backTo={blockId ? '/program' : '/train'} />
        <BlockBanner />
        <div className="panel stack">
          <p className="session-done-num num">{tally.good}/{queue.length}</p>
          <p className="muted">
            {tally.again
              ? `${tally.again} card${tally.again > 1 ? 's' : ''} will come back in a few minutes — repetition right after a miss is what fixes it.`
              : 'Every card recalled. They are scheduled further out now.'}
          </p>
          <div className="row">
            <Button onClick={() => navigate('/')} icon={<Check size={16} />}>Back to today</Button>
            <Button variant="secondary" onClick={() => navigate('/train')}>Train hub</Button>
          </div>
        </div>
      </div>
    );
  }

  const title = card.kind === 'line' ? getOpening(card.openingId)?.name ?? 'Opening' : 'Your mistakes';
  return (
    <div className="page board-screen-page">
      <Header title={title} backTo="/train" sub={`Card ${index + 1} of ${queue.length}`} />
      {card.kind === 'line' ? (
        <LineDrill key={card.id} openingId={card.openingId} lineId={card.lineId} side={card.side} mode="drill" onDone={onLineDone} focusPlies={card.weakPlies} />
      ) : (
        <PuzzleDrill key={card.id} card={card} onDone={onPuzzleDone} />
      )}
      {graded && (
        <div className="review-next">
          <span className={`grade grade-${graded}`}>{graded === 'good' ? 'Recalled' : graded === 'hard' ? 'Shaky' : 'Again soon'}</span>
          <Button onClick={next} icon={<ArrowRight size={16} />}>
            {index + 1 < queue.length ? 'Next card' : 'Finish'}
          </Button>
        </div>
      )}
    </div>
  );
}
