import { useEffect, useState } from 'react';
import { Database } from 'lucide-react';
import { explorerMeta, loadExplorer, lookup, pct, type ExplorerEntry, type MasterGame } from '../lib/explorer';
import { Spinner } from './ui';

/** Hook: master statistics for a position, loading the database on first use. */
export function useMasters(fen: string): { entry: ExplorerEntry | null; ready: boolean } {
  const [ready, setReady] = useState(!!explorerMeta());
  useEffect(() => {
    if (ready) return;
    let alive = true;
    loadExplorer().then(() => alive && setReady(true));
    return () => {
      alive = false;
    };
  }, [ready]);
  return { entry: ready ? lookup(fen) : null, ready };
}

export function ResultBar({ white, draws, black, labels = true }: { white: number; draws: number; black: number; labels?: boolean }) {
  const total = white + draws + black || 1;
  const w = (white / total) * 100;
  const d = (draws / total) * 100;
  const b = (black / total) * 100;
  return (
    <span className="rbar" role="img" aria-label={`White wins ${Math.round(w)}%, draws ${Math.round(d)}%, Black wins ${Math.round(b)}%`}>
      {w > 0 && <span className="rbar-w" style={{ width: `${w}%` }}>{labels && w >= 22 ? `${Math.round(w)}%` : ''}</span>}
      {d > 0 && <span className="rbar-d" style={{ width: `${d}%` }}>{labels && d >= 22 ? `${Math.round(d)}%` : ''}</span>}
      {b > 0 && <span className="rbar-b" style={{ width: `${b}%` }}>{labels && b >= 22 ? `${Math.round(b)}%` : ''}</span>}
    </span>
  );
}

export function MasterMoves({
  fen,
  onPlay,
  onGame,
  limit = 12,
  showGames = true,
}: {
  fen: string;
  onPlay?: (san: string) => void;
  onGame?: (g: MasterGame) => void;
  limit?: number;
  showGames?: boolean;
}) {
  const { entry, ready } = useMasters(fen);
  if (!ready) return <Spinner label="Loading master games…" />;
  if (!entry) {
    return (
      <p className="muted small">
        <Database size={14} className="inline-icon" /> Out of the master database — fewer than ten games reached this position.
      </p>
    );
  }
  return (
    <div className="masters">
      <div className="masters-head">
        <span className="muted small num">{entry.total.toLocaleString()} master games</span>
        <span className="rbar-legend small">
          <span><i className="rbar-key rbar-w" /> White</span>
          <span><i className="rbar-key rbar-d" /> Draw</span>
          <span><i className="rbar-key rbar-b" /> Black</span>
        </span>
      </div>
      <table className="masters-table">
        <thead>
          <tr>
            <th>Move</th>
            <th className="num">Games</th>
            <th className="masters-bar-col">Results</th>
            <th className="num masters-elo">Avg</th>
          </tr>
        </thead>
        <tbody>
          {entry.moves.slice(0, limit).map((m) => (
            <tr key={m.san} onClick={() => onPlay?.(m.san)} className={onPlay ? 'is-click' : ''} title={`${m.white} white wins · ${m.draws} draws · ${m.black} black wins`}>
              <td className="masters-san num">{m.san}</td>
              <td className="num">
                {m.total.toLocaleString()}
                <span className="faint small"> {pct(m.total, entry.total)}%</span>
              </td>
              <td className="masters-bar-col">
                <ResultBar white={m.white} draws={m.draws} black={m.black} />
              </td>
              <td className="num masters-elo faint">{m.avgElo}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {showGames && entry.games.length > 0 && (
        <div className="masters-games">
          <h4>Top games</h4>
          {entry.games.map((g) => (
            <button key={g.index} className="master-game" onClick={() => onGame?.(g)} disabled={!onGame}>
              <span className="master-game-players">
                <span>{g.white} <span className="faint num">{g.whiteElo}</span></span>
                <span>{g.black} <span className="faint num">{g.blackElo}</span></span>
              </span>
              <span className={`master-game-result num${g.result === '1-0' ? ' is-w' : g.result === '0-1' ? ' is-b' : ''}`}>{g.result === '1/2-1/2' ? '½–½' : g.result.replace('-', '–')}</span>
              <span className="faint small master-game-event">{g.event} {g.year}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
