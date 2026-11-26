/**
 * Validates src/data/classics.ts: legal moves, key moves present, and the
 * final position consistent with the result (mate, or a decisive engine eval).
 * Run: npx tsx scripts/validate-classics.ts
 */
import { createRequire } from 'node:module';
import { Chess } from 'chess.js';
import { parseMovetext } from '../src/lib/chess/pgn';
import { CLASSICS } from '../src/data/classics';

const require = createRequire(import.meta.url);
let errors = 0;
const finals: { id: string; fen: string; result: string; mate: boolean }[] = [];
for (const g of CLASSICS) {
  const c = new Chess();
  const labels: string[] = [];
  let ok = true;
  for (const m of parseMovetext(g.pgn).sans) {
    const fullmove = c.moveNumber();
    const white = c.turn() === 'w';
    try {
      const mv = c.move(m.san);
      labels.push(`${fullmove}${white ? '.' : '…'}${mv.san}`);
    } catch {
      console.log(`✗ ${g.id}: illegal ${m.san} after ${labels.slice(-3).join(' ')}`);
      errors++;
      ok = false;
      break;
    }
  }
  if (!ok) continue;
  for (const k of g.keys) if (!labels.includes(k)) { console.log(`✗ ${g.id}: key ${k} not found`); errors++; }
  finals.push({ id: g.id, fen: c.fen(), result: g.result, mate: c.isCheckmate() });
  if (c.isCheckmate()) {
    const winner = c.turn() === 'w' ? '0-1' : '1-0';
    if (winner !== g.result) { console.log(`✗ ${g.id}: mate but result ${g.result}`); errors++; }
  }
}
(async () => {
  const sf = await require('stockfish')('lite-single');
  let lis: ((l: string) => void) | null = null;
  sf.listener = (l: string) => lis?.(l);
  const wait = (p: (l: string) => boolean) => new Promise<void>((r) => (lis = (l) => p(l) && r()));
  sf.sendCommand('uci'); await wait((l) => l === 'uciok');
  sf.sendCommand('isready'); await wait((l) => l === 'readyok');
  for (const f of finals) {
    if (f.mate) { console.log(`✓ ${f.id.padEnd(22)} ends in mate (${f.result})`); continue; }
    let score = '';
    const done = new Promise<void>((r) => (lis = (l) => {
      const m = l.match(/score (cp|mate) (-?\d+)/);
      if (m) score = `${m[1]} ${m[2]}`;
      if (l.startsWith('bestmove')) r();
    }));
    sf.sendCommand('position fen ' + f.fen); sf.sendCommand('go depth 16'); await done;
    const [kind, v] = score.split(' ');
    const stm = f.fen.split(' ')[1];
    const white = (kind === 'mate' ? (+v > 0 ? 10000 : -10000) : +v) * (stm === 'w' ? 1 : -1);
    const good = f.result === '1-0' ? white > 200 : f.result === '0-1' ? white < -200 : Math.abs(white) < 150;
    if (!good) errors++;
    console.log(`${good ? '✓' : '✗'} ${f.id.padEnd(22)} final ${kind} ${v} (white ${white}) result ${f.result}`);
  }
  console.log(`${errors} problems`);
  process.exit(errors ? 1 : 0);
})();
