import { useRef, useState } from 'react';
import { FileUp, Download } from 'lucide-react';
import { useApp, type GameMeta } from '../lib/store/app';
import { fetchChessCom, fetchLichess, importPgnText } from '../lib/importGames';
import { navigate } from '../lib/router';
import { Button, Header, Section, Segmented, Spinner } from '../components/ui';

type Source = 'pgn' | 'lichess' | 'chesscom';

export function ImportScreen() {
  const settings = useApp((s) => s.settings);
  const updateSettings = useApp((s) => s.updateSettings);
  const games = useApp((s) => s.games);
  const addGame = useApp((s) => s.addGame);
  const [source, setSource] = useState<Source>('pgn');
  const [text, setText] = useState('');
  const [user, setUser] = useState(settings.usernames[0] ?? '');
  const [max, setMax] = useState('20');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ added: GameMeta[]; skipped: number; errors: string[] } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const run = async (pgn: string, src: GameMeta['source']) => {
    const names = [...new Set([...settings.usernames, user].filter(Boolean))];
    const res = await importPgnText(pgn, { source: src, usernames: names, existing: new Set(games.map((g) => g.id)) });
    // add oldest first so the newest ends on top
    [...res.added].sort((a, b) => a.createdAt - b.createdAt).forEach(addGame);
    setResult(res);
    if (!res.added.length && !res.skipped) setError('No games found in that PGN.');
  };

  const go = async () => {
    setError(null);
    setResult(null);
    setBusy(true);
    try {
      if (source === 'pgn') await run(text, 'pgn');
      else {
        if (!user.trim()) throw new Error('Enter a username first.');
        if (!navigator.onLine) throw new Error('You are offline. Importing from Lichess or Chess.com needs a connection — PGN import works offline.');
        if (!settings.usernames.map((u) => u.toLowerCase()).includes(user.trim().toLowerCase())) {
          updateSettings({ usernames: [...settings.usernames, user.trim()] });
        }
        const pgn = source === 'lichess' ? await fetchLichess(user.trim(), +max) : await fetchChessCom(user.trim(), +max);
        await run(pgn, source);
      }
    } catch (e) {
      setError((e as Error).message || 'Import failed.');
    } finally {
      setBusy(false);
    }
  };

  const onFile = async (f: File) => {
    const t = await f.text();
    setText(t);
  };

  return (
    <div className="page page-narrow">
      <Header title="Import games" backTo="/games" sub="Bring in your own games — the coach reviews them like any other." />
      <Segmented
        value={source}
        onChange={(v) => { setSource(v); setError(null); setResult(null); }}
        label="Import source"
        options={[
          { value: 'pgn', label: 'PGN' },
          { value: 'lichess', label: 'Lichess' },
          { value: 'chesscom', label: 'Chess.com' },
        ]}
      />

      {source === 'pgn' ? (
        <Section>
          <label className="field">
            <span className="field-label">Paste one or more games in PGN</span>
            <textarea className="textarea" value={text} onChange={(e) => setText(e.target.value)} placeholder={'[White "You"]\n[Black "Opponent"]\n\n1. e4 c5 2. Nf3 d6 …'} />
          </label>
          <div className="row mt12">
            <input ref={fileRef} type="file" accept=".pgn,.txt,application/x-chess-pgn,text/plain" hidden onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />
            <Button variant="secondary" size="sm" icon={<FileUp size={16} />} onClick={() => fileRef.current?.click()}>
              Choose a PGN file
            </Button>
          </div>
          <label className="field mt16">
            <span className="field-label">Your name in these games (optional)</span>
            <input className="input" value={user} onChange={(e) => setUser(e.target.value)} placeholder="Used to know which side you played" />
          </label>
        </Section>
      ) : (
        <Section>
          <div className="stack">
            <label className="field">
              <span className="field-label">{source === 'lichess' ? 'Lichess' : 'Chess.com'} username</span>
              <input className="input" value={user} onChange={(e) => setUser(e.target.value)} autoCapitalize="off" autoCorrect="off" spellCheck={false} />
            </label>
            <label className="field">
              <span className="field-label">How many recent games</span>
              <select className="select" value={max} onChange={(e) => setMax(e.target.value)}>
                {['10', '20', '50', '100'].map((n) => <option key={n}>{n}</option>)}
              </select>
            </label>
            <p className="muted small">Needs an internet connection. Games are stored on this device afterwards and work offline.</p>
          </div>
        </Section>
      )}

      <div className="row mt16">
        <Button icon={busy ? undefined : <Download size={16} />} onClick={go} disabled={busy || (source === 'pgn' && !text.trim())}>
          {busy ? 'Importing…' : 'Import'}
        </Button>
        {busy && <Spinner />}
      </div>
      {error && <p className="error-text mt12">{error}</p>}
      {result && (
        <div className="panel mt16 stack">
          <h3>
            {result.added.length} game{result.added.length === 1 ? '' : 's'} imported
            {result.skipped ? ` · ${result.skipped} already in your history` : ''}
          </h3>
          {result.errors.length > 0 && (
            <ul className="bullets small muted">
              {result.errors.slice(0, 5).map((e) => <li key={e}>{e}</li>)}
            </ul>
          )}
          {result.added.some((g) => !g.myColor) && (
            <p className="muted small">For games where your side is unknown, open the game and pick your colour before the review.</p>
          )}
          <div className="list">
            {result.added.slice(-8).reverse().map((g) => (
              <button key={g.id} className="list-item" onClick={() => navigate(`/games/${g.id}?auto=1`)}>
                <span className="list-item-main">
                  <span className="list-item-title">{g.white} vs {g.black}</span>
                  <span className="list-item-sub">{g.opening ?? ''} · {g.result}</span>
                </span>
                <span className="list-item-meta">Review</span>
              </button>
            ))}
          </div>
          <Button variant="secondary" onClick={() => navigate('/games')}>See all games</Button>
        </div>
      )}
    </div>
  );
}
