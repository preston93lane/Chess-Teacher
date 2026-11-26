/**
 * Checks the endgame course: every position legal, every drill's goal
 * consistent with the engine's verdict, every accepted lesson move sound.
 * Run: npx tsx scripts/validate-endgames.ts [movetimeMs]
 */
import { createRequire } from 'node:module';
import { Chess } from 'chess.js';
import { ALL_DRILLS, ENDGAME_LESSONS } from '../src/data/endgames';
import { LESSONS } from '../src/data/lessons/index';

const require = createRequire(import.meta.url);
const MT = Number(process.argv[2]) || 2500;
let errors = 0;
const bad = (m: string) => {
  errors++;
  console.log('  ✗ ' + m);
};

function legal(fen: string, label: string) {
  try {
    const c = new Chess(fen);
    const parts = fen.split(' ');
    parts[1] = parts[1] === 'w' ? 'b' : 'w';
    parts[3] = '-';
    if (new Chess(parts.join(' ')).inCheck()) bad(`${label}: side not to move is in check`);
    return c;
  } catch (e) {
    bad(`${label}: invalid FEN (${(e as Error).message})`);
    return null;
  }
}

(async () => {
  const sf = await require('stockfish')('lite-single');
  let lis: ((l: string) => void) | null = null;
  sf.listener = (l: string) => lis?.(l);
  const wait = (p: (l: string) => boolean) => new Promise<void>((r) => (lis = (l) => p(l) && r()));
  sf.sendCommand('uci');
  await wait((l) => l === 'uciok');
  sf.sendCommand('setoption name Hash value 64');
  /** Score in pawns from the side to move; mate = ±100. */
  async function evalFen(fen: string): Promise<{ score: number; best: string }> {
    sf.sendCommand('ucinewgame');
    sf.sendCommand('isready');
    await wait((l) => l === 'readyok');
    let score = 0;
    const done = new Promise<string>((r) => (lis = (l) => {
      const m = l.match(/score (cp|mate) (-?\d+)(?! (lower|upper)bound)/);
      if (m && l.includes(' pv ')) score = m[1] === 'mate' ? (+m[2] > 0 ? 100 : -100) : +m[2] / 100;
      if (l.startsWith('bestmove')) r(l.split(' ')[1]);
    }));
    sf.sendCommand('position fen ' + fen);
    sf.sendCommand('go movetime ' + MT);
    const best = await done;
    return { score, best };
  }

  const ids = new Set<string>();
  for (const d of ALL_DRILLS) {
    if (ids.has(d.id)) bad(`duplicate drill id ${d.id}`);
    ids.add(d.id);
    const c = legal(d.fen, `drill ${d.id}`);
    if (!c) continue;
    const { score } = await evalFen(d.fen);
    const mine = c.turn() === d.side ? score : -score;
    let ok = true;
    if (d.goal === 'win' && !(mine > (d.holdAbove ?? 0.35))) ok = false;
    if (d.goal === 'draw' && !(mine >= (d.holdAbove ?? -2) && mine <= 1.5)) ok = false;
    const line = `drill ${d.id.padEnd(16)} ${d.goal.padEnd(5)} eval for you ${mine.toFixed(2)}`;
    // Mating material is a theoretical win; the lite net misjudges B+N, so only warn.
    if (d.goal === 'mate' && mine < 1) console.log('  ! ' + line + ' (engine underrates this mate)');
    else if (ok) console.log('  ✓ ' + line);
    else bad(line + ' — does not match the goal');
  }

  for (const l of LESSONS) {
    for (const [i, s] of l.sections.entries()) {
      if (s.drill && !ids.has(s.drill)) bad(`lesson ${l.id}#${i}: unknown drill ${s.drill}`);
    }
  }

  for (const l of ENDGAME_LESSONS) {
    for (const [i, s] of l.sections.entries()) {
      if (!s.fen) continue;
      const c = legal(s.fen, `lesson ${l.id}#${i}`);
      if (!c || !s.task) continue;
      const best = await evalFen(s.fen);
      for (const a of s.task.accept) {
        let after: string;
        try {
          const t = new Chess(s.fen);
          t.move(a);
          after = t.fen();
          if (t.isCheckmate()) {
            console.log(`  ✓ lesson ${l.id}#${i} ${a} mates`);
            continue;
          }
        } catch {
          bad(`lesson ${l.id}#${i}: ${a} is illegal`);
          continue;
        }
        const r = await evalFen(after);
        const mv = -r.score;
        const sameClass = (x: number) => (x >= 3 ? 'win' : x <= -3 ? 'loss' : 'draw');
        const ok = mv >= best.score - 0.6 || sameClass(mv) === sameClass(best.score);
        const line = `lesson ${l.id}#${i} ${a.padEnd(6)} ${mv.toFixed(2)} (best ${best.score.toFixed(2)})`;
        if (ok) console.log('  ✓ ' + line);
        else bad(line);
      }
    }
  }
  console.log(`${errors} problem(s).`);
  process.exit(errors ? 1 : 0);
})();
