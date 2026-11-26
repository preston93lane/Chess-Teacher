import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, ArrowRight, BookOpen, Check, ChevronLeft, ChevronsLeft, Plus, Repeat, Sparkles, Swords, Trash2, Wand2 } from 'lucide-react';
import { Chess, uid, pvToSan, type Color, type PieceSymbol, type Square } from '../lib/chess/core';
import { useApp } from '../lib/store/app';
import { OPENINGS } from '../data/openings';
import { loadEco } from '../lib/openings/eco';
import { loadExplorer, lookup, scoreFor } from '../lib/explorer';
import { lineScore, formatScore } from '../lib/coach/eval';
import { useAnalysis } from '../lib/hooks';
import {
  addPath, autoBuild, childrenOf, fenAfter, findGaps, fromLibrary, lineName, linesOf, pathKey, removeBranch, setNote, suggestMove, turnAfter, type Repertoire,
} from '../lib/repertoire';
import { navigate } from '../lib/router';
import { soundForSan } from '../lib/sound';
import { dueLabel } from '../lib/srs/scheduler';
import { Board } from '../components/Board';
import { MoveList } from '../components/MoveList';
import { MasterMoves } from '../components/MasterMoves';
import { Button, Empty, Header, IconButton, Segmented, Sheet, Spinner } from '../components/ui';
import { toast } from '../components/Toast';

// ---------------------------------------------------------------------------
// List

export function RepertoireList() {
  const reps = useApp((s) => s.customReps);
  const cards = useApp((s) => s.cards);
  const saveRep = useApp((s) => s.saveRep);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [side, setSide] = useState<Color>('w');
  const [from, setFrom] = useState('empty');
  const list = Object.values(reps).sort((a, b) => b.updatedAt - a.updatedAt);

  const create = () => {
    const id = uid('r');
    const lib = OPENINGS.find((o) => o.id === from);
    const rep: Repertoire = lib
      ? fromLibrary(lib, id, name.trim() || `My ${lib.name}`)
      : { id, name: name.trim() || (side === 'w' ? 'My White repertoire' : 'My Black repertoire'), side, nodes: {}, createdAt: Date.now(), updatedAt: Date.now() };
    saveRep(rep);
    setOpen(false);
    navigate(`/repertoire/${id}`);
  };

  return (
    <div className="page page-narrow">
      <Header
        title="My repertoires"
        backTo="/openings"
        sub="Build your own opening tree with the coach: master statistics and the engine at every move, gaps flagged, lines drilled with spaced repetition."
        actions={<Button size="sm" icon={<Plus size={16} />} onClick={() => setOpen(true)}>New</Button>}
      />
      {list.length === 0 ? (
        <Empty title="No repertoire yet" action={<Button icon={<Plus size={16} />} onClick={() => setOpen(true)}>Build one</Button>}>
          Start empty and let the coach suggest moves, or start from one of the library openings and make it yours.
        </Empty>
      ) : (
        <div className="list">
          {list.map((r) => {
            const lines = linesOf(r);
            const due = Object.values(cards).filter((c) => c.kind === 'line' && c.openingId === `rep:${r.id}` && c.state.due <= Date.now()).length;
            return (
              <button key={r.id} className="list-item" onClick={() => navigate(`/repertoire/${r.id}`)}>
                <span className={`pill-color pill-${r.side}`} />
                <span className="list-item-main">
                  <span className="list-item-title">{r.name}</span>
                  <span className="list-item-sub">{lines.length} line{lines.length === 1 ? '' : 's'} · {Object.keys(r.nodes).length} moves{due ? ` · ${due} due` : ''}</span>
                </span>
                <ArrowRight size={18} className="muted" />
              </button>
            );
          })}
        </div>
      )}
      <Sheet open={open} onClose={() => setOpen(false)} title="New repertoire">
        <div className="stack">
          <label className="field">
            <span className="field-label">Name</span>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder={side === 'w' ? 'My White repertoire' : 'My Black repertoire'} />
          </label>
          <Segmented value={side} onChange={setSide} label="You play" options={[{ value: 'w', label: 'White' }, { value: 'b', label: 'Black' }]} />
          <label className="field">
            <span className="field-label">Start from</span>
            <select className="select" value={from} onChange={(e) => setFrom(e.target.value)}>
              <option value="empty">An empty board (the coach will suggest moves)</option>
              {OPENINGS.filter((o) => o.side === side).map((o) => (
                <option key={o.id} value={o.id}>{o.name} — library lines</option>
              ))}
            </select>
          </label>
          <Button onClick={create}>Create</Button>
        </div>
      </Sheet>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Builder

export function RepertoireBuilder({ id }: { id: string }) {
  const rep = useApp((s) => s.customReps[id]);
  if (!rep) {
    return (
      <div className="page">
        <Header title="Repertoire" backTo="/repertoire" />
        <Empty title="Repertoire not found" />
      </div>
    );
  }
  return <Builder key={id} rep={rep} />;
}

function Builder({ rep }: { rep: Repertoire }) {
  const saveRep = useApp((s) => s.saveRep);
  const deleteRep = useApp((s) => s.deleteRep);
  const addLineCard = useApp((s) => s.addLineCard);
  const cards = useApp((s) => s.cards);
  const [path, setPath] = useState<string[]>([]);
  const [ready, setReady] = useState(false);
  const [tab, setTab] = useState<'coach' | 'lines'>('coach');
  const [auto, setAuto] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [noteDraft, setNoteDraft] = useState('');

  useEffect(() => {
    Promise.all([loadExplorer(), loadEco()]).then(() => setReady(true));
  }, []);

  const fen = useMemo(() => fenAfter(path), [path]);
  const turn = turnAfter(path);
  const mine = turn === rep.side;
  const children = childrenOf(rep, path);
  const lines = useMemo(() => linesOf(rep), [rep, ready]); // eslint-disable-line react-hooks/exhaustive-deps
  const gaps = useMemo(() => (ready ? findGaps(rep) : []), [rep, ready]);
  const node = path.length ? rep.nodes[pathKey(path)] : undefined;
  const { result: analysis } = useAnalysis(fen, { enabled: mine, multipv: 3, depth: 14 });
  const lastMove = useMemo(() => {
    if (!path.length) return null;
    const c = new Chess(fenAfter(path.slice(0, -1)));
    const m = c.move(path[path.length - 1]);
    return [m.from, m.to] as [string, string];
  }, [path]);

  useEffect(() => setNoteDraft(node?.note ?? ''), [node?.note, path]);

  const save = (r: Repertoire) => saveRep(r);

  const playSan = (san: string) => {
    const next = [...path, san];
    if (!(pathKey(next) in rep.nodes)) {
      save(addPath(rep, next));
      toast(`Added ${san} to your repertoire.`, 1600);
    }
    soundForSan(san);
    setPath(next);
  };

  const onMove = (mv: { from: Square; to: Square; promotion?: PieceSymbol }) => {
    try {
      playSan(new Chess(fen).move(mv).san);
    } catch {
      /* illegal */
    }
  };

  const suggestion = ready && mine ? suggestMove(fen, rep.side) : null;
  const suggestArrow = useMemo(() => {
    if (!suggestion || children.length) return [];
    try {
      const m = new Chess(fen).move(suggestion.move.san);
      return [{ from: m.from, to: m.to, color: 'b' as const }];
    } catch {
      return [];
    }
  }, [suggestion?.move.san, fen, children.length]); // eslint-disable-line react-hooks/exhaustive-deps
  const masters = ready ? lookup(fen) : null;
  const engineBest = analysis?.lines[0];
  const chosen = mine ? children[0] : undefined;
  const chosenLine = analysis?.lines.find((l) => {
    try {
      return chosen && new Chess(fen).move(chosen) && pvToSan(fen, l.pv, 1)[0] === chosen;
    } catch {
      return false;
    }
  });
  const sign = turn === 'w' ? 1 : -1;
  const evalOf = (l?: typeof engineBest) => {
    const s = lineScore(l);
    if (!s) return 0;
    return s.mate !== undefined ? (s.mate > 0 ? 10 : -10) * sign : ((s.cp ?? 0) / 100) * sign;
  };
  const chosenStats = chosen && masters ? masters.moves.find((m) => m.san === chosen) : undefined;
  const warnings: string[] = [];
  if (mine && children.length > 1) warnings.push(`You have ${children.length} moves here (${children.join(', ')}). A repertoire is easier to learn with one main move — remove the others unless you want both.`);
  if (chosen && chosenLine && engineBest && evalOf(engineBest) - evalOf(chosenLine) > 0.6) warnings.push(`The engine rates ${chosen} about ${(evalOf(engineBest) - evalOf(chosenLine)).toFixed(1)} pawns worse than ${pvToSan(fen, engineBest.pv, 1)[0]}.`);
  if (chosen && analysis && !chosenLine && analysis.depth >= 12) warnings.push(`${chosen} isn’t among the engine’s top three moves here — fine for surprise value, but check the critical replies.`);
  if (chosenStats && chosenStats.total >= 30 && scoreFor(chosenStats, rep.side) < 0.42) warnings.push(`Masters score only ${Math.round(scoreFor(chosenStats, rep.side) * 100)}% with ${chosen}.`);

  const replies = !mine && masters ? masters.moves.filter((m) => m.total / masters.total >= 0.03).slice(0, 6) : [];
  const addMainReplies = () => {
    let r = rep;
    for (const m of replies) if (m.total / masters!.total >= 0.05) r = addPath(r, [...path, m.san]);
    save(r);
  };

  const dueFor = (lineId: string) => cards[`line:rep:${rep.id}:${lineId}:${rep.side}`];
  const pathName = path.length ? lineName(path) : 'Starting position';

  return (
    <div className="page board-screen-page">
      <Header title={rep.name} backTo="/repertoire" sub={`${rep.side === 'w' ? 'White' : 'Black'} · ${lines.length} line${lines.length === 1 ? '' : 's'} · ${gaps.length ? `${gaps.length} gap${gaps.length === 1 ? '' : 's'}` : 'no gaps'}`} />
      <div className="board-screen">
        <div className="board-col">
          <Board fen={fen} orientation={rep.side} movable="both" onMove={onMove} lastMove={lastMove} arrows={suggestArrow} />
          <div className="controls">
            <div className="controls-group">
              <IconButton label="Start" onClick={() => setPath([])}><ChevronsLeft /></IconButton>
              <IconButton label="Back" onClick={() => setPath(path.slice(0, -1))} disabled={!path.length}><ChevronLeft /></IconButton>
            </div>
            <div className="controls-group">
              <IconButton label="Coach: extend from here" onClick={() => setAuto(true)} disabled={!ready}><Wand2 /></IconButton>
              <IconButton label="Delete this move and everything after it" onClick={() => { const p = path.slice(0, -1); save(removeBranch(rep, path)); setPath(p); }} disabled={!path.length}><Trash2 /></IconButton>
            </div>
          </div>
          {path.length > 0 && <MoveList moves={path.map((san) => ({ san }))} current={path.length} onSelect={(p) => setPath(path.slice(0, p))} />}
          <p className="muted small mt8">{pathName}</p>
        </div>

        <div className="side-col">
          <div className="tabs" role="tablist">
            <button role="tab" className={`tab${tab === 'coach' ? ' is-on' : ''}`} aria-selected={tab === 'coach'} onClick={() => setTab('coach')}>Coach</button>
            <button role="tab" className={`tab${tab === 'lines' ? ' is-on' : ''}`} aria-selected={tab === 'lines'} onClick={() => setTab('lines')}>Lines ({lines.length})</button>
          </div>

          {tab === 'coach' && (
            <div className="stack">
              {!ready ? (
                <Spinner label="Loading master games…" />
              ) : mine ? (
                <div className="panel stack rep-coach">
                  <h3><Sparkles size={18} className="inline-icon" /> Your move</h3>
                  {chosen ? (
                    <p>You play <strong className="num">{chosen}</strong>{chosenStats ? <span className="muted"> — {Math.round((chosenStats.total / masters!.total) * 100)}% of master games, scoring {Math.round(scoreFor(chosenStats, rep.side) * 100)}%.</span> : <span className="muted"> — rare at master level.</span>}</p>
                  ) : (
                    <p className="muted">Pick your move: play it on the board or tap a row in the master table.</p>
                  )}
                  {suggestion && suggestion.move.san !== chosen && (
                    <div className="rep-suggest">
                      <span>Coach suggests <strong className="num">{suggestion.move.san}</strong> <span className="muted small">({suggestion.reason})</span></span>
                      <Button size="sm" variant="secondary" onClick={() => playSan(suggestion.move.san)}>{chosen ? 'Add as well' : 'Use it'}</Button>
                    </div>
                  )}
                  {analysis && analysis.lines.length > 0 && (
                    <div className="rep-engine">
                      <span className="muted small">Engine (depth {analysis.depth})</span>
                      {analysis.lines.map((l) => {
                        const san = pvToSan(fen, l.pv, 1)[0];
                        return (
                          <button key={l.multipv} className={`rep-engine-line${san === chosen ? ' is-chosen' : ''}`} onClick={() => playSan(san)}>
                            <span className="num">{formatScore(lineScore(l))}</span>
                            <strong className="num">{san}</strong>
                            <span className="faint small num">{pvToSan(fen, l.pv, 5).slice(1).join(' ')}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                  {warnings.map((w, i) => (
                    <p key={i} className="rep-warning"><AlertTriangle size={14} className="inline-icon" /> {w}</p>
                  ))}
                </div>
              ) : (
                <div className="panel stack rep-coach">
                  <h3><Sparkles size={18} className="inline-icon" /> Prepare for their replies</h3>
                  {replies.length ? (
                    <>
                      <div className="rep-replies">
                        {replies.map((m) => {
                          const covered = children.includes(m.san);
                          const share = Math.round((m.total / masters!.total) * 100);
                          return (
                            <button key={m.san} className={`rep-reply${covered ? ' is-covered' : share >= 8 ? ' is-gap' : ''}`} onClick={() => playSan(m.san)}>
                              <strong className="num">{m.san}</strong>
                              <span className="num small">{share}%</span>
                              <span className="small">{covered ? <><Check size={12} /> prepared</> : share >= 8 ? 'gap' : 'rare'}</span>
                            </button>
                          );
                        })}
                      </div>
                      <Button size="sm" variant="secondary" onClick={addMainReplies}>Add every reply played 5%+ of the time</Button>
                    </>
                  ) : (
                    <p className="muted">{masters ? 'Masters rarely reach this position.' : 'Out of the master database here — add the replies you expect from your own opponents.'}</p>
                  )}
                </div>
              )}

              {children.length > 0 && (
                <div className="row">
                  <span className="muted small">Continue:</span>
                  {children.map((c) => <button key={c} className="chip" onClick={() => setPath([...path, c])}>{c}</button>)}
                </div>
              )}

              {path.length > 0 && (
                <label className="field">
                  <span className="field-label">Your note on {path[path.length - 1]}</span>
                  <textarea className="textarea" rows={2} value={noteDraft} onChange={(e) => setNoteDraft(e.target.value)} onBlur={() => noteDraft !== (node?.note ?? '') && save(setNote(rep, path, noteDraft))} placeholder="The idea behind this move — shown when you learn the line." />
                </label>
              )}

              {ready && <div className="panel"><MasterMoves fen={fen} onPlay={playSan} showGames={false} limit={8} /></div>}

              {gaps.length > 0 && (
                <div className="panel stack">
                  <h4>Coach check: gaps in your tree</h4>
                  {gaps.slice(0, 5).map((g) => (
                    <button key={pathKey(g.path) + g.move.san} className="rep-gap" onClick={() => { save(addPath(rep, [...g.path, g.move.san])); setPath([...g.path, g.move.san]); }}>
                      <span>After {g.path.length ? lineMoves(g.path) : 'the start'}, <strong>{g.move.san}</strong> is played in {Math.round(g.share * 100)}% of master games.</span>
                      <span className="link-btn small">Prepare it <ArrowRight size={12} /></span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {tab === 'lines' && (
            <div className="stack">
              {lines.length === 0 ? (
                <p className="muted">No lines yet. Add moves on the Coach tab.</p>
              ) : (
                <>
                  <Button icon={<Repeat size={16} />} onClick={() => { lines.forEach((l) => addLineCard(`rep:${rep.id}`, l.id, rep.side)); toast(`${lines.length} line${lines.length === 1 ? '' : 's'} in your review deck.`); }}>
                    Add all lines to my review deck
                  </Button>
                  <div className="list">
                    {lines.map((l) => {
                      const card = dueFor(l.id);
                      return (
                        <div key={l.id} className="list-item rep-line">
                          <span className="list-item-main">
                            <span className="list-item-title">{l.name}</span>
                            <span className="list-item-sub num">{lineMoves(l.sans)}</span>
                            {card && <span className="faint small">{dueLabel(card.state)}</span>}
                          </span>
                          <span className="row">
                            <IconButton label="Learn" onClick={() => navigate(`/openings/rep:${rep.id}/learn/${l.id}?side=${rep.side}`)}><BookOpen size={18} /></IconButton>
                            <IconButton label="Drill" onClick={() => navigate(`/openings/rep:${rep.id}/drill/${l.id}?side=${rep.side}`)}><Repeat size={18} /></IconButton>
                          </span>
                        </div>
                      );
                    })}
                  </div>
                  <Button variant="secondary" icon={<Swords size={16} />} onClick={() => navigate(`/play?opening=rep:${rep.id}&side=${rep.side}`)}>
                    Practice against a bot that plays your tree
                  </Button>
                </>
              )}
              <button className="link-btn danger mt16" onClick={() => setConfirmDelete(true)}><Trash2 size={14} /> Delete this repertoire</button>
            </div>
          )}
        </div>
      </div>

      <Sheet open={auto} onClose={() => setAuto(false)} title="Let the coach extend the tree">
        <p className="muted">From the current position, the coach adds the most popular, best-scoring master move for you and the main replies (10%+ of games, up to three) for your opponent.</p>
        <div className="row mt12">
          {[6, 8, 10, 12].map((moves) => (
            <Button key={moves} variant="secondary" onClick={() => {
              const before = linesOf(rep).length;
              const r = autoBuild(rep, path, moves * 2);
              save(r);
              setAuto(false);
              toast(`Coach added ${Math.max(0, linesOf(r).length - before)} line${linesOf(r).length - before === 1 ? '' : 's'} (to move ${moves}).`);
            }}>To move {moves}</Button>
          ))}
        </div>
        <p className="faint small mt12">You can delete or change anything afterwards.</p>
      </Sheet>

      <Sheet open={confirmDelete} onClose={() => setConfirmDelete(false)} title="Delete this repertoire?">
        <p className="muted">Its lines and their review cards are removed from this device.</p>
        <div className="row mt16">
          <Button variant="danger" icon={<Trash2 size={16} />} onClick={() => { deleteRep(rep.id); navigate('/repertoire'); }}>Delete</Button>
          <Button variant="ghost" onClick={() => setConfirmDelete(false)}>Cancel</Button>
        </div>
      </Sheet>
    </div>
  );
}

function lineMoves(sans: string[]) {
  return sans.map((s, i) => (i % 2 === 0 ? `${i / 2 + 1}.${s}` : s)).join(' ');
}

