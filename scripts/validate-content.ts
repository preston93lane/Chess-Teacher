/**
 * Validates authored content: every opening line and lesson position must be
 * legal, and (with --engine) no theory move may lose much by engine standards.
 * Run: npx tsx scripts/validate-content.ts [--engine] [--depth 12]
 */
import { createRequire } from 'node:module';
import { Chess } from 'chess.js';
import { parseMovetext } from '../src/lib/chess/pgn';
import { OPENINGS } from '../src/data/openings/index';
import { LESSONS } from '../src/data/lessons/index';

const require = createRequire(import.meta.url);
const args = process.argv.slice(2);
const useEngine = args.includes('--engine');
const depth = Number(args[args.indexOf('--depth') + 1]) || 12;
const only = args.includes('--only') ? args[args.indexOf('--only') + 1] : undefined;

let errors = 0;
const fail = (msg: string) => {
  errors++;
  console.log('  ✗ ' + msg);
};

type Line = { label: string; sans: string[]; fens: string[]; isTrap?: boolean };
const lines: Line[] = [];

function play(label: string, pgn: string, startFen?: string): Line | null {
  const { sans } = parseMovetext(pgn);
  const c = new Chess(startFen);
  const fens = [c.fen()];
  const out: string[] = [];
  for (const m of sans) {
    try {
      out.push(c.move(m.san).san);
      fens.push(c.fen());
    } catch {
      fail(`${label}: illegal move "${m.san}" after ${out.join(' ')}`);
      return null;
    }
  }
  return { label, sans: out, fens };
}

for (const o of OPENINGS) {
  if (only && o.id !== only) continue;
  const ids = new Set<string>();
  for (const l of o.lines) {
    if (ids.has(l.id)) fail(`${o.id}: duplicate line id ${l.id}`);
    ids.add(l.id);
    const res = play(`${o.id}/${l.id}`, l.pgn);
    if (res) lines.push(res);
  }
  for (const t of o.traps) {
    const res = play(`${o.id}/trap ${t.name}`, t.pgn);
    if (res) lines.push({ ...res, isTrap: true });
  }
  const root = play(`${o.id}/root`, o.root);
  if (root) {
    const first = o.lines.map((l) => parseMovetext(l.pgn).sans.map((s) => s.san));
    if (!first.every((s) => root.sans.every((r, i) => s[i] === r)))
      console.log(`  ! ${o.id}: not all lines start with root ${o.root}`);
  }
}

for (const lesson of LESSONS) {
  for (const [i, s] of lesson.sections.entries()) {
    if (!s.pgn && !s.fen) continue;
    const res = play(`lesson ${lesson.id}#${i}`, s.pgn ?? '', s.fen);
    if (!res) continue;
    const fen = res.fens[res.fens.length - 1];
    if (s.task) {
      const c = new Chess(fen);
      for (const a of s.task.accept) {
        try {
          new Chess(fen).move(a);
        } catch {
          fail(`lesson ${lesson.id}#${i}: accepted move ${a} illegal in ${fen}`);
        }
      }
      if (c.isGameOver()) fail(`lesson ${lesson.id}#${i}: task position is game over`);
    }
  }
}

console.log(`Parsed ${lines.length} lines, ${errors} legality errors.`);

async function engineCheck() {
  const init = require('stockfish');
  const sf = await init('lite-single');
  let listener: ((l: string) => void) | null = null;
  sf.listener = (l: string) => listener?.(l);
  const send = (c: string) => sf.sendCommand(c);
  const wait = (pred: (l: string) => boolean) =>
    new Promise<string>((res) => {
      listener = (l) => {
        if (pred(l)) res(l);
      };
    });
  send('uci');
  await wait((l) => l === 'uciok');
  send('setoption name Hash value 64');
  send('isready');
  await wait((l) => l === 'readyok');
  const cache = new Map<string, { cp: number; best: string }>();
  async function evalFen(fen: string, searchmoves?: string) {
    const key = fen + (searchmoves ?? '');
    if (cache.has(key)) return cache.get(key)!;
    let cp = 0;
    const p = new Promise<string>((res) => {
      listener = (l) => {
        if (l.startsWith('info') && l.includes(' score ')) {
          const m = l.match(/score (cp|mate) (-?\d+)/);
          if (m) cp = m[1] === 'cp' ? +m[2] : (+m[2] > 0 ? 10000 : -10000);
        }
        if (l.startsWith('bestmove')) res(l.split(' ')[1]);
      };
    });
    send(`position fen ${fen}`);
    send(`go depth ${depth}${searchmoves ? ' searchmoves ' + searchmoves : ''}`);
    const best = await p;
    const sign = fen.split(' ')[1] === 'w' ? 1 : -1;
    const r = { cp: cp * sign, best };
    cache.set(key, r);
    return r;
  }
  for (const line of lines) {
    if (line.isTrap) continue;
    const issues: string[] = [];
    for (let i = 0; i < line.sans.length; i++) {
      const before = await evalFen(line.fens[i]);
      const after = await evalFen(line.fens[i + 1]);
      const mover = line.fens[i].split(' ')[1];
      const drop = mover === 'w' ? before.cp - after.cp : after.cp - before.cp;
      if (drop > 90) issues.push(`${Math.floor(i / 2) + 1}${mover === 'w' ? '.' : '…'}${line.sans[i]} drops ${drop}cp (best ${before.best})`);
    }
    const final = (await evalFen(line.fens[line.fens.length - 1])).cp;
    const tag = Math.abs(final) > 150 ? '!' : ' ';
    console.log(`${tag} ${line.label.padEnd(40)} final ${(final / 100).toFixed(2)}${issues.length ? '\n     ' + issues.join('\n     ') : ''}`);
  }
  process.exit(0);
}

if (useEngine) engineCheck();
else process.exit(errors ? 1 : 0);
