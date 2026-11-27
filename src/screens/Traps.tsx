import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, Eye } from 'lucide-react';
import { Chess, type PieceSymbol, type Square } from '../lib/chess/core';
import { parseMovetext } from '../lib/chess/pgn';
import { allTraps, type Trap } from '../data/traps';
import { useApp } from '../lib/store/app';
import { playSound, soundForSan } from '../lib/sound';
import { Board, type Arrow } from '../components/Board';
import { Button, Header } from '../components/ui';

export function TrapTrainer() {
  const traps = useMemo(() => allTraps().sort(() => Math.random() - 0.5), []);
  const [i, setI] = useState(0);
  const [score, setScore] = useState({ ok: 0, n: 0 });
  return <TrapRound key={i} t={traps[i % traps.length]} total={traps.length} score={score} onResult={(ok) => setScore((s) => ({ ok: s.ok + (ok ? 1 : 0), n: s.n + 1 }))} onNext={() => setI(i + 1)} />;
}

function TrapRound({ t, total, score, onResult, onNext }: { t: Trap; total: number; score: { ok: number; n: number }; onResult: (firstTry: boolean) => void; onNext: () => void }) {
  const logActivity = useApp((s) => s.logActivity);
  const [stage, setStage] = useState<'find' | 'play' | 'done'>('find');
  const [tries, setTries] = useState(0);
  const sans = useMemo(() => parseMovetext(t.pgn).sans.map((x) => x.san), [t]);
  const keyIdx = sans.indexOf(t.key);
  const fens = useMemo(() => {
    const c = new Chess();
    const out = [c.fen()];
    const moves: [string, string][] = [];
    for (const s of sans) {
      const m = c.move(s);
      moves.push([m.from, m.to]);
      out.push(c.fen());
    }
    return { out, moves };
  }, [sans]);

  const [shown, setShown] = useState(keyIdx);

  // After the key move, play the rest of the trap out.
  useEffect(() => {
    if (stage !== 'play') return;
    if (shown >= sans.length) {
      setStage('done');
      return;
    }
    const id = setTimeout(() => {
      soundForSan(sans[shown]);
      setShown(shown + 1);
    }, 700);
    return () => clearTimeout(id);
  }, [stage, shown, sans]);

  const side = keyIdx % 2 === 0 ? 'w' : 'b';
  const onMove = (m: { from: Square; to: Square; promotion?: PieceSymbol }) => {
    if (stage !== 'find') return;
    let san: string;
    try {
      san = new Chess(fens.out[keyIdx]).move(m).san;
    } catch {
      return;
    }
    if (san === t.key) {
      playSound('good');
      onResult(tries === 0);
      setShown(keyIdx + 1);
      setStage('play');
      logActivity('puzzles');
    } else {
      playSound('bad');
      setTries(tries + 1);
    }
  };
  const reveal = () => {
    onResult(false);
    setShown(keyIdx);
    setStage('play');
  };

  const arrows: Arrow[] = stage === 'find' && tries >= 2 ? [{ from: fens.moves[keyIdx][0], to: fens.moves[keyIdx][1], color: 'y' }] : [];
  const moveText = sans.slice(0, keyIdx).map((s, j) => (j % 2 === 0 ? `${j / 2 + 1}.${s}` : s)).join(' ');

  return (
    <div className="page board-screen-page">
      <Header title="Opening traps" backTo="/courses/traps" sub={`${t.name} · ${t.opening}`} />
      <div className="board-screen">
        <div className="board-col">
          <Board fen={fens.out[shown]} orientation={side} movable={stage === 'find' ? side : null} onMove={onMove} lastMove={shown > 0 ? fens.moves[shown - 1] : null} arrows={arrows} />
        </div>
        <div className="side-col">
          <div className="panel stack">
            <p className="muted small num">{moveText}</p>
            {stage === 'find' ? (
              <>
                <p className="drill-prompt">{side === 'w' ? 'White' : 'Black'} to move: spring the trap.</p>
                {tries > 0 && <p className="tone-text-mistake small">{tries >= 2 ? 'Here’s a hint (yellow arrow).' : 'Not that one — look for the forcing idea.'}</p>}
                <button className="link-btn" onClick={reveal}><Eye size={14} /> Show me</button>
              </>
            ) : (
              <>
                <p className="drill-prompt">{t.key}{t.key.endsWith('#') ? '' : '!'} {stage === 'done' ? '' : 'Watch how it ends…'}</p>
                {stage === 'done' && <p>{t.text}</p>}
                {stage === 'done' && <Button icon={<ArrowRight size={16} />} onClick={onNext}>Next trap</Button>}
              </>
            )}
          </div>
          <p className="muted small num">Found first time: {score.ok}/{score.n} · {total} traps in the set</p>
        </div>
      </div>
    </div>
  );
}
