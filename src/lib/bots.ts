import { Chess, uciOf } from './chess/core';
import { engine, type EngineLine } from './engine/stockfish';
import { pickStyled, styleMargin, type StyleId } from './styles';

export interface Bot {
  id: string;
  name: string;
  elo: number;
  blurb: string;
  play: {
    elo?: number;
    skill?: number;
    depth?: number;
    movetime?: number;
    multipv?: number;
    /** Chance of picking a weaker candidate instead of the engine’s choice. */
    noise?: number;
    /** Chance of a careless move (random legal move). */
    blunder?: number;
  };
}

export const BOTS: Bot[] = [
  { id: 'l1', name: 'Sprout', elo: 800, blurb: 'Knows the rules and likes to grab material. Leaves pieces hanging.', play: { skill: 0, depth: 1, multipv: 5, noise: 0.55, blunder: 0.18 } },
  { id: 'l2', name: 'Café', elo: 1100, blurb: 'Develops pieces but misses two-move tactics.', play: { skill: 0, depth: 3, multipv: 4, noise: 0.35, blunder: 0.07 } },
  { id: 'l3', name: 'Club', elo: 1300, blurb: 'Solid fundamentals, occasional oversights.', play: { skill: 3, depth: 5, multipv: 3, noise: 0.2, blunder: 0.03 } },
  { id: 'l4', name: 'League', elo: 1500, blurb: 'Plays sensibly and punishes loose pieces.', play: { elo: 1500, movetime: 350 } },
  { id: 'l5', name: 'Tournament', elo: 1700, blurb: 'Comfortable in the middlegame; sees short combinations.', play: { elo: 1700, movetime: 450 } },
  { id: 'l6', name: 'Expert', elo: 1900, blurb: 'Rarely blunders. You need a plan to win.', play: { elo: 1900, movetime: 550 } },
  { id: 'l7', name: 'Candidate', elo: 2100, blurb: 'Strong positional understanding and accurate tactics.', play: { elo: 2100, movetime: 700 } },
  { id: 'l8', name: 'Master', elo: 2300, blurb: 'Master-strength play. Mistakes get punished.', play: { elo: 2300, movetime: 900 } },
  { id: 'l9', name: 'Grandmaster', elo: 2600, blurb: 'Very strong. Use it to test prepared lines.', play: { elo: 2600, movetime: 1200 } },
  { id: 'l10', name: 'Stockfish', elo: 3000, blurb: 'Full strength. For analysis-style sparring.', play: { skill: 20, movetime: 1500 } },
];

export function getBot(id: string) {
  return BOTS.find((b) => b.id === id) ?? BOTS[3];
}

/** Choose the bot’s move for a position. */
export async function botMove(
  fen: string,
  bot: Bot,
  opts: { budgetMs?: number; pressure?: number; style?: StyleId } = {},
): Promise<string | null> {
  const chess = new Chess(fen);
  const legal = chess.moves({ verbose: true });
  if (!legal.length) return null;
  const p = bot.play;
  const pressure = opts.pressure ?? 0;
  if (p.blunder && Math.random() < p.blunder + pressure * 0.03) {
    const pick = legal[Math.floor(Math.random() * legal.length)];
    return uciOf(pick);
  }
  const styled = opts.style && opts.style !== 'balanced';
  const multipv = Math.max(p.multipv ?? 1, pressure > 0 ? 3 : 1, styled ? 4 : 1);
  // Search time never exceeds the human-like budget for this move.
  const movetime = p.movetime ? Math.min(p.movetime, Math.max(120, (opts.budgetMs ?? p.movetime) * 0.75)) : undefined;
  const res = await engine.play(fen, { skill: p.skill, elo: p.elo, depth: p.depth, movetime, multipv });
  if (p.noise && res.lines.length > 1 && Math.random() < p.noise) {
    const alts: EngineLine[] = res.lines.slice(1);
    const pick = alts[Math.floor(Math.random() * alts.length)];
    if (pick?.pv[0]) return pick.pv[0];
  }
  // Time-pressure slips: a slightly worse move than this bot would normally play.
  if (pressure > 0 && res.lines.length > 1 && Math.random() < 0.12 + 0.45 * pressure) {
    const sign = fen.split(' ')[1] === 'w' ? 1 : -1;
    const cp = (l: EngineLine) => (l.mate !== undefined ? (l.mate > 0 ? 10000 : -10000) : l.cp ?? 0) * sign;
    const best = cp(res.lines[0]);
    const margin = 60 + 160 * pressure;
    const near = res.lines.slice(1).filter((l) => best - cp(l) <= margin && l.pv[0]);
    if (near.length) return near[Math.floor(Math.random() * near.length)].pv[0];
    if (Math.random() < 0.12 * pressure && res.lines[1]?.pv[0]) return res.lines[1].pv[0];
  }
  const choice = res.bestmove ?? res.lines[0]?.pv[0] ?? uciOf(legal[0]);
  if (styled) return pickStyled(opts.style!, fen, res.lines, styleMargin(bot.elo), choice) ?? choice;
  return choice;
}
