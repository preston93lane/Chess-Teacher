import { useEffect, useRef, useState } from 'react';
import { engine, threadsAvailable } from '../lib/engine/stockfish';
import { Download, RefreshCw, Upload, Trash2 } from 'lucide-react';
import { syncGames } from '../lib/sync';
import { entries, set as idbSet, clear as idbClear } from 'idb-keyval';
import { useApp, type BoardTheme, type ThemePref } from '../lib/store/app';
import { Button, Header, Section, Segmented, Sheet, Toggle } from '../components/ui';
import { MiniBoard } from '../components/MiniBoard';
import { PIECE_SETS, pieceUrl } from '../lib/pieces';
import { toast } from '../components/Toast';

const BOARD_THEMES: { id: BoardTheme; name: string }[] = [
  { id: 'slate', name: 'Slate' },
  { id: 'walnut', name: 'Walnut' },
  { id: 'brown', name: 'Brown' },
  { id: 'green', name: 'Tournament' },
  { id: 'blue', name: 'Ice' },
  { id: 'sage', name: 'Sage' },
  { id: 'purple', name: 'Lavender' },
  { id: 'coral', name: 'Coral' },
  { id: 'mono', name: 'Graphite' },
  { id: 'night', name: 'Night' },
];

export function SettingsScreen() {
  const s = useApp((x) => x.settings);
  const update = useApp((x) => x.updateSettings);
  const importState = useApp((x) => x.importState);
  const resetAll = useApp((x) => x.resetAll);
  const [confirmReset, setConfirmReset] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [names, setNames] = useState(s.usernames.join(', '));

  const exportBackup = async () => {
    const all = await entries();
    const data = Object.fromEntries(all.map(([k, v]) => [String(k), v]));
    const blob = new Blob([JSON.stringify({ app: 'outpost', version: 1, exportedAt: new Date().toISOString(), data })], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `outpost-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    toast('Backup downloaded.');
  };

  const importBackup = async (f: File) => {
    try {
      const json = JSON.parse(await f.text());
      if (json.app !== 'outpost' || !json.data) throw new Error('bad');
      for (const [k, v] of Object.entries(json.data)) {
        if (k === 'outpost-state-v1') continue;
        await idbSet(k, v);
      }
      const state = json.data['outpost-state-v1'];
      if (state) importState(JSON.parse(state as string).state);
      toast('Backup restored.');
    } catch {
      toast('That file is not an Outpost backup.');
    }
  };

  return (
    <div className="page page-narrow">
      <Header title="Settings" backTo="/" />
      <Section title="Appearance">
        <div className="field">
          <span className="field-label">Theme</span>
          <Segmented
            value={s.theme}
            onChange={(v: ThemePref) => update({ theme: v })}
            options={[
              { value: 'dark', label: 'Dark' },
              { value: 'light', label: 'Light' },
              { value: 'system', label: 'System' },
            ]}
          />
        </div>
        <div className="field mt16">
          <span className="field-label">Board</span>
          <div className="theme-swatches">
            {BOARD_THEMES.map((t) => (
              <button key={t.id} className={`swatch${s.boardTheme === t.id ? ' is-on' : ''}`} onClick={() => update({ boardTheme: t.id })} aria-pressed={s.boardTheme === t.id}>
                <div className={`board-${t.id}`}>
                  <MiniBoard fen="r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3" className={`board-${t.id}`} />
                </div>
                <span>{t.name}</span>
              </button>
            ))}
          </div>
        </div>
        <div className="field mt16">
          <span className="field-label">Pieces</span>
          <div className="piece-sets">
            {PIECE_SETS.map((p) => (
              <button key={p.id} className={`piece-set${(s.pieceSet ?? 'cburnett') === p.id ? ' is-on' : ''}`} onClick={() => update({ pieceSet: p.id })} aria-pressed={(s.pieceSet ?? 'cburnett') === p.id}>
                <span className={`piece-set-demo board-${s.boardTheme}`}>
                  <img src={pieceUrl(p.id, 'wN')} alt="" />
                  <img src={pieceUrl(p.id, 'bQ')} alt="" />
                </span>
                <span>{p.name}</span>
              </button>
            ))}
          </div>
        </div>
        <Toggle checked={s.coordinates} onChange={(v) => update({ coordinates: v })} label="Board coordinates" />
        <Toggle checked={s.sound} onChange={(v) => update({ sound: v })} label="Sounds" />
      </Section>

      <Section title="Coach & engine">
        <Toggle checked={s.coachLive} onChange={(v) => update({ coachLive: v })} label="Live coach by default" hint="Grade and explain each move during games against the coach." />
        <Toggle checked={s.coachTalk} onChange={(v) => update({ coachTalk: v })} label="Position talk" hint="Before each of your moves, the coach points out what matters in the position without naming a move." />
        <Toggle checked={s.showEval} onChange={(v) => update({ showEval: v })} label="Evaluation bar & numbers" hint="Show the engine’s score. Turn off to judge positions yourself." />
        <Toggle checked={s.autoQueen} onChange={(v) => update({ autoQueen: v })} label="Always promote to a queen" />
        <div className="field mt16">
          <span className="field-label">Analysis depth</span>
          <Segmented
            value={String(s.analysisDepth)}
            onChange={(v) => update({ analysisDepth: +v })}
            options={[
              { value: '10', label: 'Fast' },
              { value: '13', label: 'Balanced' },
              { value: '16', label: 'Deep' },
              { value: '19', label: 'Deepest' },
            ]}
          />
          <span className="muted small">Deeper reviews are more accurate but slower on a phone. Balanced reviews a 40-move game in about a minute.</span>
          <EngineStatus />
        </div>
      </Section>

      <Section title="Your accounts">
        <label className="field">
          <span className="field-label">Usernames (comma-separated)</span>
          <input className="input" value={names} onChange={(e) => setNames(e.target.value)} onBlur={() => update({ usernames: names.split(',').map((x) => x.trim()).filter(Boolean) })} />
          <span className="muted small">Used to recognise your side in imported games.</span>
        </label>
        <SyncSettings />
      </Section>

      <Section title="Your data">
        <p className="muted">Everything lives on this device — no account, no server. Export a backup to move to another device.</p>
        <div className="row mt12">
          <Button variant="secondary" icon={<Download size={16} />} onClick={exportBackup}>Export backup</Button>
          <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={(e) => e.target.files?.[0] && importBackup(e.target.files[0])} />
          <Button variant="secondary" icon={<Upload size={16} />} onClick={() => fileRef.current?.click()}>Restore backup</Button>
          <Button variant="danger" icon={<Trash2 size={16} />} onClick={() => setConfirmReset(true)}>Erase everything</Button>
        </div>
      </Section>

      <Section title="Install on iPhone">
        <ol className="bullets">
          <li>Open this site in Safari.</li>
          <li>Tap the Share button, then “Add to Home Screen”.</li>
          <li>Open Outpost from the home screen once while online. After that it works fully offline — engine included.</li>
        </ol>
      </Section>

      <Section title="About">
        <p className="muted small">
          Analysis by Stockfish 18 (GPLv3), running on your device via WebAssembly. Pieces by Colin M.L. Burnett (GPLv2+). Opening names from the lichess chess-openings dataset (CC0).
        </p>
      </Section>

      <Sheet open={confirmReset} onClose={() => setConfirmReset(false)} title="Erase all data?">
        <p className="muted">Games, review cards, lesson progress and settings will be deleted from this device. This cannot be undone.</p>
        <div className="row mt16">
          <Button
            variant="danger"
            icon={<Trash2 size={16} />}
            onClick={async () => {
              await idbClear();
              resetAll();
              setConfirmReset(false);
              toast('All data erased.');
            }}
          >
            Erase everything
          </Button>
          <Button variant="ghost" onClick={() => setConfirmReset(false)}>Cancel</Button>
        </div>
      </Sheet>
    </div>
  );
}

function SyncSettings() {
  const sync = useApp((x) => x.settings.sync) ?? { auto: true };
  const update = useApp((x) => x.updateSettings);
  const [lichess, setLichess] = useState(sync.lichess ?? '');
  const [chesscom, setChesscom] = useState(sync.chesscom ?? '');
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const save = (patch: Partial<NonNullable<typeof sync>>) => update({ sync: { ...sync, auto: sync.auto ?? true, ...patch } });
  const now = async () => {
    save({ lichess: lichess.trim() || undefined, chesscom: chesscom.trim() || undefined });
    setBusy(true);
    setStatus(null);
    const r = await syncGames({ force: true });
    setBusy(false);
    setStatus(r.skipped === 'no-accounts' ? 'Add a username first.' : r.skipped === 'offline' ? 'You’re offline.' : `${r.added} new game${r.added === 1 ? '' : 's'} imported.${r.errors.length ? ' ' + r.errors.join(' ') : ''}`);
  };
  return (
    <div className="stack mt16">
      <h3 className="field-label">Sync games automatically</h3>
      <div className="sync-grid">
        <label className="field">
          <span className="field-label">Lichess username</span>
          <input className="input" value={lichess} onChange={(e) => setLichess(e.target.value)} onBlur={() => save({ lichess: lichess.trim() || undefined })} autoCapitalize="off" autoCorrect="off" spellCheck={false} />
        </label>
        <label className="field">
          <span className="field-label">Chess.com username</span>
          <input className="input" value={chesscom} onChange={(e) => setChesscom(e.target.value)} onBlur={() => save({ chesscom: chesscom.trim() || undefined })} autoCapitalize="off" autoCorrect="off" spellCheck={false} />
        </label>
      </div>
      <Toggle checked={sync.auto ?? true} onChange={(v) => save({ auto: v })} label="Import new games when the app opens" hint="Checks at most every 30 minutes, only when you’re online. New games appear in Games, ready for a coach review." />
      <div className="row">
        <Button variant="secondary" size="sm" icon={<RefreshCw size={16} />} onClick={now} disabled={busy}>{busy ? 'Syncing…' : 'Sync now'}</Button>
        <span className="muted small">{status ?? (sync.lastSyncAt ? `Last synced ${new Date(sync.lastSyncAt).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}` : 'Not synced yet')}</span>
      </div>
    </div>
  );
}

function EngineStatus() {
  const [info, setInfo] = useState<{ threads: number } | null>(null);
  useEffect(() => {
    let alive = true;
    engine.init().then(() => alive && setInfo({ ...engine.info })).catch(() => alive && setInfo({ threads: 0 }));
    return () => {
      alive = false;
    };
  }, []);
  return (
    <span className="faint small">
      {!info ? 'Starting the engine…' : info.threads === 0 ? 'The engine failed to start.' : info.threads > 1 ? `Stockfish 18 running on ${info.threads} threads.` : `Stockfish 18 running on one thread${threadsAvailable() === 1 && !window.crossOriginIsolated ? ' (reopen the app once to enable multi-threading)' : ''}.`}
    </span>
  );
}
