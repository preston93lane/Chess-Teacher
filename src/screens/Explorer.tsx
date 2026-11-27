import { eventLabel } from '../lib/explorer';
import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, FlipVertical2, Microscope, X } from 'lucide-react';
import { Chess, START_FEN, fenKey, type Color, type PieceSymbol, type Square } from '../lib/chess/core';
import { parseMovetext } from '../lib/chess/pgn';
import { openingFor } from '../lib/openings/eco';
import { explorerMeta, type MasterGame } from '../lib/explorer';
import { navigate, query, useRoute } from '../lib/router';
import { soundForSan } from '../lib/sound';
import { Board } from '../components/Board';
import { MoveList } from '../components/MoveList';
import { MasterMoves } from '../components/MasterMoves';
import { Button, Header, IconButton } from '../components/ui';

export function ExplorerScreen() {
  const path = useRoute();
  const init = useMemo(() => {
    const q = query(path);
    let startFen = START_FEN;
    const sans: string[] = [];
    try {
      const f = q.get('fen');
      if (f) startFen = new Chess(f).fen();
      const mv = q.get('moves');
      if (mv) {
        const c = new Chess(startFen);
        for (const m of parseMovetext(mv).sans) sans.push(c.move(m.san).san);
      }
    } catch {
      /* ignore bad params */
    }
    return { startFen, sans };
    // Only on first render: later moves are local state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [line, setLine] = useState<string[]>(init.sans);
  const [ply, setPly] = useState(init.sans.length);
  const [orientation, setOrientation] = useState<Color>('w');
  const [following, setFollowing] = useState<MasterGame | null>(null);
  const [opening, setOpening] = useState<{ eco: string; name: string } | null>(null);

  const fens = useMemo(() => {
    const c = new Chess(init.startFen);
    const out = [c.fen()];
    const moves: { from: string; to: string }[] = [];
    for (const san of line) {
      try {
        const m = c.move(san);
        moves.push({ from: m.from, to: m.to });
        out.push(c.fen());
      } catch {
        break;
      }
    }
    return { fens: out, moves };
  }, [init.startFen, line]);
  const fen = fens.fens[Math.min(ply, fens.fens.length - 1)];
  const last = ply > 0 ? fens.moves[ply - 1] : null;

  useEffect(() => {
    let alive = true;
    openingFor(line.slice(0, ply), init.startFen).then((o) => alive && setOpening(o ? { eco: o.eco, name: o.name } : null));
    return () => {
      alive = false;
    };
  }, [line, ply, init.startFen]);

  const go = (p: number) => setPly(Math.max(0, Math.min(fens.fens.length - 1, p)));

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === 'ArrowLeft') setPly((p) => Math.max(0, p - 1));
      else if (e.key === 'ArrowRight') setPly((p) => Math.min(fens.fens.length - 1, p + 1));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [fens.fens.length]);

  const play = (san: string) => {
    if (line[ply] === san) {
      setPly(ply + 1);
    } else {
      setLine([...line.slice(0, ply), san]);
      setPly(ply + 1);
      setFollowing(null);
    }
    soundForSan(san);
  };

  const onMove = (mv: { from: Square; to: Square; promotion?: PieceSymbol }) => {
    try {
      const m = new Chess(fen).move(mv);
      play(m.san);
    } catch {
      /* illegal */
    }
  };

  const openGame = (g: MasterGame) => {
    // Find where this game passes through the current position (it may have
    // arrived by a different move order).
    const key = fenKey(fen);
    const c = new Chess();
    let at = -1;
    if (fenKey(c.fen()) === key) at = 0;
    for (let i = 0; i < g.moves.length && at < 0; i++) {
      try {
        c.move(g.moves[i]);
      } catch {
        break;
      }
      if (fenKey(c.fen()) === key) at = i + 1;
    }
    if (at < 0 || init.startFen !== START_FEN) return;
    setLine(g.moves);
    setPly(at);
    setFollowing(g);
  };

  const meta = explorerMeta();

  return (
    <div className="page board-screen-page">
      <Header title="Opening explorer" backTo="/openings" sub={opening ? `${opening.eco} · ${opening.name}` : ply === 0 ? 'Starting position' : 'Unnamed position'} />
      <div className="board-screen">
        <div className="board-col">
          <Board fen={fen} orientation={orientation} movable="both" onMove={onMove} lastMove={last ? [last.from, last.to] : null} />
          <div className="controls">
            <div className="controls-group">
              <IconButton label="Start" onClick={() => go(0)}><ChevronsLeft /></IconButton>
              <IconButton label="Back" onClick={() => go(ply - 1)}><ChevronLeft /></IconButton>
              <IconButton label="Forward" onClick={() => go(ply + 1)}><ChevronRight /></IconButton>
              <IconButton label="End" onClick={() => go(fens.fens.length - 1)}><ChevronsRight /></IconButton>
            </div>
            <div className="controls-group">
              <IconButton label="Flip board" onClick={() => setOrientation(orientation === 'w' ? 'b' : 'w')}><FlipVertical2 /></IconButton>
              <Button size="sm" variant="secondary" icon={<Microscope size={16} />} onClick={() => navigate(`/analysis?moves=${encodeURIComponent(line.slice(0, ply).join(' '))}`)}>
                Analyse
              </Button>
            </div>
          </div>
          {line.length > 0 && (
            <MoveList moves={line.map((san) => ({ san }))} current={ply} onSelect={go} startMoveNumber={1} startColor="w" />
          )}
        </div>
        <div className="side-col">
          {following && (
            <div className="panel panel-tight following">
              <div className="row-between">
                <strong>{following.white} – {following.black}</strong>
                <IconButton label="Stop following" onClick={() => { setLine(line.slice(0, ply)); setFollowing(null); }}><X size={18} /></IconButton>
              </div>
              <p className="muted small">{eventLabel(following)} · {following.result === '1/2-1/2' ? '½–½' : following.result} · use the arrows to play through the game</p>
            </div>
          )}
          <div className="panel">
            <MasterMoves fen={fen} onPlay={play} onGame={init.startFen === START_FEN ? openGame : undefined} />
          </div>
          {meta && (
            <p className="faint small">
              {meta.games.toLocaleString()} over-the-board games (classical, rapid and blitz events) with both players rated 2300+, from the Lichess broadcast database (CC0). Positions are kept up to move 12 when at least ten games reached them.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
