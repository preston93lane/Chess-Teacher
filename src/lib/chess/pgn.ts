import { Chess, START_FEN } from './core';

export interface ParsedMove {
  san: string;
  comment?: string;
}

export interface ParsedGame {
  headers: Record<string, string>;
  startFen: string;
  moves: ParsedMove[];
  /** Comment before the first move. */
  intro?: string;
  result: string;
  error?: string;
}

/** Split a PGN file containing many games. */
export function splitPgn(text: string): string[] {
  const normalized = text.replace(/\r\n?/g, '\n').replace(/^﻿/, '');
  const chunks: string[] = [];
  let current: string[] = [];
  let inMoves = false;
  for (const line of normalized.split('\n')) {
    const isHeader = /^\s*\[\w+\s+".*"\]\s*$/.test(line);
    if (isHeader && inMoves) {
      chunks.push(current.join('\n'));
      current = [];
      inMoves = false;
    }
    if (!isHeader && line.trim()) inMoves = true;
    current.push(line);
  }
  if (current.join('').trim()) chunks.push(current.join('\n'));
  return chunks.map((c) => c.trim()).filter(Boolean);
}

/**
 * Tokenise movetext: keeps the mainline only, attaching {comments} to the
 * preceding move. Variations (…), NAGs and move numbers are dropped.
 */
export function parseMovetext(movetext: string): { sans: ParsedMove[]; intro?: string; result?: string } {
  const sans: ParsedMove[] = [];
  let intro: string | undefined;
  let result: string | undefined;
  let depth = 0;
  let i = 0;
  const s = movetext;
  const pushComment = (text: string) => {
    const t = text.replace(/\[%[^\]]*\]/g, '').replace(/\s+/g, ' ').trim();
    if (!t) return;
    if (sans.length === 0) intro = intro ? `${intro} ${t}` : t;
    else {
      const last = sans[sans.length - 1];
      last.comment = last.comment ? `${last.comment} ${t}` : t;
    }
  };
  while (i < s.length) {
    const ch = s[i];
    if (ch === '{') {
      const end = s.indexOf('}', i + 1);
      const text = s.slice(i + 1, end === -1 ? s.length : end);
      if (depth === 0) pushComment(text);
      i = end === -1 ? s.length : end + 1;
      continue;
    }
    if (ch === ';') {
      const end = s.indexOf('\n', i + 1);
      const text = s.slice(i + 1, end === -1 ? s.length : end);
      if (depth === 0) pushComment(text);
      i = end === -1 ? s.length : end + 1;
      continue;
    }
    if (ch === '(') {
      depth++;
      i++;
      continue;
    }
    if (ch === ')') {
      depth = Math.max(0, depth - 1);
      i++;
      continue;
    }
    if (/\s/.test(ch)) {
      i++;
      continue;
    }
    // read a token
    let j = i;
    while (j < s.length && !/[\s{}();]/.test(s[j])) j++;
    const tok = s.slice(i, j);
    i = j;
    if (depth > 0) continue;
    if (/^(1-0|0-1|1\/2-1\/2|\*)$/.test(tok)) {
      result = tok;
      continue;
    }
    if (/^\$\d+$/.test(tok)) continue;
    const cleaned = tok.replace(/^\d+\.+/, '').replace(/[!?]+$/, '');
    if (!cleaned || /^\d+\.*$/.test(cleaned)) continue;
    sans.push({ san: cleaned.replace(/^0-0-0/, 'O-O-O').replace(/^0-0/, 'O-O') });
  }
  return { sans, intro, result };
}

export function parsePgn(text: string): ParsedGame {
  const headers: Record<string, string> = {};
  const lines = text.replace(/\r\n?/g, '\n').split('\n');
  const body: string[] = [];
  for (const line of lines) {
    const m = line.match(/^\s*\[(\w+)\s+"(.*)"\]\s*$/);
    if (m) headers[m[1]] = m[2].replace(/\\"/g, '"');
    else body.push(line);
  }
  const startFen = headers.FEN && headers.SetUp !== '0' ? headers.FEN : START_FEN;
  const { sans, intro, result } = parseMovetext(body.join('\n'));
  const chess = new Chess(startFen);
  const moves: ParsedMove[] = [];
  let error: string | undefined;
  for (const m of sans) {
    try {
      const mv = chess.move(m.san, { strict: false } as never);
      moves.push({ san: mv.san, comment: m.comment });
    } catch {
      error = `Stopped at illegal move "${m.san}" (move ${Math.floor(moves.length / 2) + 1}).`;
      break;
    }
  }
  return {
    headers,
    startFen,
    moves,
    intro,
    result: headers.Result || result || '*',
    error,
  };
}

export function parseManyPgn(text: string): ParsedGame[] {
  return splitPgn(text)
    .map(parsePgn)
    .filter((g) => g.moves.length > 0);
}

export function toPgn(opts: {
  headers: Record<string, string>;
  startFen?: string;
  sans: string[];
  comments?: Record<number, string>;
}): string {
  const h = { ...opts.headers };
  if (opts.startFen && opts.startFen !== START_FEN) {
    h.SetUp = '1';
    h.FEN = opts.startFen;
  }
  const head = Object.entries(h)
    .map(([k, v]) => `[${k} "${String(v).replace(/"/g, '\\"')}"]`)
    .join('\n');
  const startFen = opts.startFen ?? START_FEN;
  let num = parseInt(startFen.split(' ')[5] || '1', 10);
  let black = startFen.split(' ')[1] === 'b';
  const parts: string[] = [];
  opts.sans.forEach((san, i) => {
    if (!black) parts.push(`${num}.`);
    else if (i === 0) parts.push(`${num}...`);
    parts.push(san);
    const c = opts.comments?.[i];
    if (c) parts.push(`{ ${c.replace(/[{}]/g, '')} }`);
    if (black) num++;
    black = !black;
  });
  parts.push(h.Result || '*');
  // wrap at ~80 cols
  const lines: string[] = [];
  let cur = '';
  for (const p of parts) {
    if ((cur + ' ' + p).trim().length > 80) {
      lines.push(cur.trim());
      cur = p;
    } else cur += ' ' + p;
  }
  if (cur.trim()) lines.push(cur.trim());
  return `${head}\n\n${lines.join('\n')}\n`;
}
