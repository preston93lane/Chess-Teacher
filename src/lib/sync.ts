/**
 * Auto-sync: pull new games from your Lichess and Chess.com accounts when the
 * app opens (at most every 30 minutes), or on demand from Settings.
 */
import { fetchChessCom, fetchLichess, importPgnText } from './importGames';
import { useApp } from './store/app';

const MIN_GAP = 30 * 60 * 1000;
let running: Promise<SyncResult> | null = null;

export interface SyncResult {
  added: number;
  errors: string[];
  skipped?: 'off' | 'recent' | 'offline' | 'no-accounts';
}

export function syncGames(opts: { force?: boolean } = {}): Promise<SyncResult> {
  if (running) return running;
  running = run(opts).finally(() => {
    running = null;
  });
  return running;
}

async function run({ force }: { force?: boolean }): Promise<SyncResult> {
  const st = useApp.getState();
  const cfg = st.settings.sync;
  if (!cfg || (!cfg.lichess && !cfg.chesscom)) return { added: 0, errors: [], skipped: 'no-accounts' };
  if (!force && !cfg.auto) return { added: 0, errors: [], skipped: 'off' };
  if (!force && cfg.lastSyncAt && Date.now() - cfg.lastSyncAt < MIN_GAP) return { added: 0, errors: [], skipped: 'recent' };
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return { added: 0, errors: [], skipped: 'offline' };
  const startedAt = Date.now();
  const errors: string[] = [];
  let added = 0;
  const names = [...new Set([...st.settings.usernames, cfg.lichess, cfg.chesscom].filter(Boolean) as string[])];
  const jobs: [string, () => Promise<string>, 'lichess' | 'chesscom'][] = [];
  // First sync: the last 30 games. Later: everything since the last sync (with a day of overlap).
  if (cfg.lichess) jobs.push(['Lichess', () => fetchLichess(cfg.lichess!, cfg.lastSyncAt ? 100 : 30, cfg.lastSyncAt ? cfg.lastSyncAt - 86400000 : undefined), 'lichess']);
  if (cfg.chesscom) jobs.push(['Chess.com', () => fetchChessCom(cfg.chesscom!, cfg.lastSyncAt ? 60 : 30), 'chesscom']);
  for (const [label, fetcher, source] of jobs) {
    try {
      const pgn = await fetcher();
      const existing = new Set(useApp.getState().games.map((g) => g.id));
      const res = await importPgnText(pgn, { source, usernames: names, existing });
      [...res.added].sort((a, b) => a.createdAt - b.createdAt).forEach((g) => useApp.getState().addGame(g));
      added += res.added.length;
    } catch (e) {
      errors.push(`${label}: ${(e as Error).message}`);
    }
  }
  const cur = useApp.getState().settings.sync;
  if (cur) useApp.getState().updateSettings({ sync: { ...cur, lastSyncAt: errors.length === jobs.length ? cur.lastSyncAt : startedAt } });
  return { added, errors };
}
