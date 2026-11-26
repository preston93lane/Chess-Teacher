import { useCallback, useState } from 'react';
import { Repeat, Swords } from 'lucide-react';
import { getOpening } from '../lib/openings/book';
import { useApp } from '../lib/store/app';
import { gradeFromMistakes } from '../lib/srs/scheduler';
import { navigate, query, useRoute } from '../lib/router';
import { Button, Header } from '../components/ui';
import { LineDrill, type DrillResult } from '../components/Trainers';
import type { Color } from '../lib/chess/core';
import { toast } from '../components/Toast';
import { BlockBanner, completeBlock } from '../components/BlockBanner';

export function LineTrainer({ openingId, lineId, mode }: { openingId: string; lineId: string; mode: 'learn' | 'drill' }) {
  const path = useRoute();
  const q = query(path);
  const opening = getOpening(openingId);
  const side = (q.get('side') as Color) ?? opening?.side ?? 'w';
  const addLineCard = useApp((s) => s.addLineCard);
  const gradeCard = useApp((s) => s.gradeCard);
  const logActivity = useApp((s) => s.logActivity);
  const markPlanStep = useApp((s) => s.markPlanStep);
  const card = useApp((s) => s.cards[`line:${openingId}:${lineId}:${side}`]);
  const [result, setResult] = useState<DrillResult | null>(null);
  const [runKey, setRunKey] = useState(0);
  const line = opening?.lines.find((l) => l.id === lineId);
  const home = openingId.startsWith('rep:') ? `/repertoire/${openingId.slice(4)}` : `/openings/${openingId}`;

  const onDone = useCallback(
    (r: DrillResult) => {
      setResult(r);
      const id = `line:${openingId}:${lineId}:${side}`;
      addLineCard(openingId, lineId, side);
      logActivity('lines');
      markPlanStep(`learn:${openingId}:${lineId}:${side}`);
      if (completeBlock(q.get('block'))) toast('Block complete.');
      if (mode === 'drill') {
        gradeCard(id, gradeFromMistakes(r.mistakes, r.hints), r.weakPlies);
      } else if (!card) {
        toast('Line added to your review deck.');
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [openingId, lineId, side, mode, addLineCard, gradeCard, logActivity, markPlanStep, card],
  );

  if (!opening || !line) return <div className="page"><Header title="Line not found" backTo="/openings" /></div>;

  return (
    <div className="page board-screen-page">
      <Header title={opening.name} backTo={home} sub={mode === 'learn' ? 'Learn the moves and the reasons behind them' : 'Recall the line from memory'} />
      <BlockBanner />
      <LineDrill
        key={`${mode}-${runKey}`}
        openingId={openingId}
        lineId={lineId}
        side={side}
        mode={mode}
        onDone={onDone}
        focusPlies={card?.kind === 'line' ? card.weakPlies : undefined}
      />
      {result && (
        <div className="row mt16 trainer-next">
          {mode === 'learn' ? (
            <Button icon={<Repeat size={16} />} onClick={() => navigate(`/openings/${openingId}/drill/${lineId}?side=${side}`, true)}>
              Now recall it
            </Button>
          ) : (
            <Button variant="secondary" icon={<Repeat size={16} />} onClick={() => { setResult(null); setRunKey(runKey + 1); }}>
              Drill again
            </Button>
          )}
          <Button variant="secondary" icon={<Swords size={16} />} onClick={() => navigate(`/play?opening=${openingId}&line=${lineId}&side=${side}`)}>
            Play it against the coach
          </Button>
          <Button variant="ghost" onClick={() => navigate(home)}>Back to {opening.name}</Button>
        </div>
      )}
    </div>
  );
}
