import { create } from 'zustand';
import { persist, createJSONStorage, type StateStorage } from 'zustand/middleware';
import { get as idbGet, set as idbSet, del as idbDel } from 'idb-keyval';
import type { Color } from '../chess/core';
import { newCardState, schedule, type CardState, type Grade } from '../srs/scheduler';
import { buildDay, getProgram, type ActiveProgram } from '../program';

export type ThemePref = 'dark' | 'light' | 'system';
export type BoardTheme = 'slate' | 'walnut' | 'sage' | 'mono';

export interface Settings {
  theme: ThemePref;
  boardTheme: BoardTheme;
  coordinates: boolean;
  sound: boolean;
  coachLive: boolean;
  /** Coach comments on what matters before each of your moves. */
  coachTalk: boolean;
  /** Evaluation bar and numeric evaluations. */
  showEval: boolean;
  /** Last chosen time-control preset id. */
  timeControl?: string;
  analysisDepth: number;
  autoQueen: boolean;
  /** Usernames used to work out which side you played in imported games. */
  usernames: string[];
}

export interface GameMeta {
  id: string;
  createdAt: number;
  white: string;
  black: string;
  result: string;
  myColor: Color | null;
  source: 'bot' | 'pgn' | 'lichess' | 'chesscom' | 'practice';
  opening?: string;
  eco?: string;
  botId?: string;
  plies: number;
  accuracy?: { w: number; b: number };
  reviewed?: boolean;
  mistakes?: number;
  blunders?: number;
  timeControl?: string;
  date?: string;
}

export type CardKind = 'line' | 'puzzle';

export interface LineCard {
  id: string;
  kind: 'line';
  openingId: string;
  lineId: string;
  side: Color;
  state: CardState;
  addedAt: number;
  /** Ply indices the student missed last time. */
  weakPlies?: number[];
}

export interface PuzzleCard {
  id: string;
  kind: 'puzzle';
  fen: string;
  solution: string[];
  /** The move actually played in the game. */
  played: string;
  gameId?: string;
  ply?: number;
  title: string;
  note?: string;
  tags: string[];
  state: CardState;
  addedAt: number;
}

export type Card = LineCard | PuzzleCard;

export interface DayActivity {
  reviews: number;
  puzzles: number;
  games: number;
  lessons: number;
  lines: number;
}

export interface LessonProgress {
  solved: string[];
  completed: boolean;
  updatedAt: number;
}

export interface PuzzleStats {
  rating: number;
  attempts: number;
  solved: number;
  failed: number;
  history: { id: string; ok: boolean; rating: number; after: number; t: number; themes?: string[] }[];
  seen: string[];
  rush: Record<string, number>;
  dailyDone?: string;
}

export const defaultPuzzleStats: PuzzleStats = { rating: 1500, attempts: 0, solved: 0, failed: 0, history: [], seen: [], rush: {} };

export interface PlanState {
  trackId: string;
  startedAt: number;
  done: string[];
}

interface AppState {
  hydrated: boolean;
  settings: Settings;
  games: GameMeta[];
  cards: Record<string, Card>;
  lessons: Record<string, LessonProgress>;
  repertoire: Record<string, { side: Color; addedAt: number }>;
  activity: Record<string, DayActivity>;
  plan: PlanState | null;
  puzzles: PuzzleStats;
  classics: Record<string, { best: number; total: number }>;
  program: ActiveProgram | null;
  vision: Record<string, number>;
  recordVision: (mode: string, score: number) => void;
  drills: Record<string, { passed: boolean; attempts: number; bestMoves?: number }>;
  recordDrill: (id: string, passed: boolean, moves: number) => void;
  startProgram: (p: Omit<ActiveProgram, 'done' | 'checkpoints' | 'startedAt'>) => void;
  stopProgram: () => void;
  completeBlock: (id: string | null | undefined) => boolean;
  quiz: { best: Record<string, number>; rounds: number; history: { source: string; score: number; max: number; t: number }[] };
  recordQuiz: (source: string, score: number, max: number) => void;
  recordClassic: (id: string, found: number, total: number) => void;
  recordPuzzle: (r: { id: string; puzzleRating: number; ok: boolean; rated: boolean; newRating?: number; daily?: boolean; themes?: string[] }) => void;
  recordRush: (mode: string, score: number) => void;
  updateSettings: (s: Partial<Settings>) => void;
  addGame: (g: GameMeta) => void;
  updateGame: (id: string, patch: Partial<GameMeta>) => void;
  removeGame: (id: string) => void;
  addLineCard: (openingId: string, lineId: string, side: Color) => void;
  removeCard: (id: string) => void;
  gradeCard: (id: string, grade: Grade, weakPlies?: number[]) => void;
  addPuzzle: (p: Omit<PuzzleCard, 'state' | 'addedAt' | 'kind'>) => boolean;
  solveLessonTask: (lessonId: string, key: string, total: number) => void;
  completeLesson: (lessonId: string) => void;
  toggleRepertoire: (openingId: string, side: Color) => void;
  logActivity: (k: keyof DayActivity, n?: number) => void;
  setPlan: (p: PlanState | null) => void;
  markPlanStep: (stepId: string) => void;
  importState: (data: Partial<AppState>) => void;
  resetAll: () => void;
}

const idbStorage: StateStorage = {
  getItem: async (name) => (await idbGet<string>(name)) ?? null,
  setItem: async (name, value) => {
    await idbSet(name, value);
  },
  removeItem: async (name) => {
    await idbDel(name);
  },
};

export function today(d = new Date()) {
  return d.toISOString().slice(0, 10);
}

export const defaultSettings: Settings = {
  theme: 'dark',
  boardTheme: 'slate',
  coordinates: true,
  sound: true,
  coachLive: true,
  coachTalk: true,
  showEval: true,
  analysisDepth: 13,
  autoQueen: true,
  usernames: [],
};

const emptyDay = (): DayActivity => ({ reviews: 0, puzzles: 0, games: 0, lessons: 0, lines: 0 });

export const useApp = create<AppState>()(
  persist(
    (set, get) => ({
      hydrated: false,
      settings: defaultSettings,
      games: [],
      cards: {},
      lessons: {},
      repertoire: {},
      activity: {},
      plan: null,
      puzzles: defaultPuzzleStats,
      classics: {},
      program: null,
      vision: {},
      recordVision: (mode, score) => {
        if ((get().vision[mode] ?? 0) < score) set({ vision: { ...get().vision, [mode]: score } });
        get().logActivity('puzzles');
      },
      drills: {},
      recordDrill: (id, passed, moves) => {
        const cur = get().drills[id] ?? { passed: false, attempts: 0 };
        set({
          drills: {
            ...get().drills,
            [id]: {
              passed: cur.passed || passed,
              attempts: cur.attempts + 1,
              bestMoves: passed ? Math.min(cur.bestMoves ?? Infinity, moves) : cur.bestMoves,
            },
          },
        });
        get().logActivity('lessons');
      },
      startProgram: (p) => set({ program: { ...p, done: [], checkpoints: [], startedAt: Date.now() } }),
      stopProgram: () => set({ program: null }),
      completeBlock: (id) => {
        const p = get().program;
        if (!p || !id || !id.startsWith(p.templateId + ':') || p.done.includes(id)) return false;
        const done = [...p.done, id];
        let checkpoints = p.checkpoints;
        const m = id.match(/:w(\d+):d(\d+):/);
        const t = getProgram(p.templateId);
        if (m && t) {
          const day = buildDay(t, +m[1], +m[2], p.daysPerWeek, p.minutesPerDay);
          if (day.checkpoint && day.blocks.every((b) => done.includes(b.id))) {
            const st = get();
            checkpoints = [
              ...checkpoints.filter((c) => c.week !== day.week),
              { week: day.week, puzzleRating: st.puzzles.rating, botRating: 0, rush: st.puzzles.rush.survival ?? 0, at: Date.now() },
            ];
          }
        }
        set({ program: { ...p, done, checkpoints } });
        return true;
      },
      quiz: { best: {}, rounds: 0, history: [] },
      recordQuiz: (source, score, max) => {
        const q = get().quiz;
        set({
          quiz: {
            best: { ...q.best, [source]: Math.max(q.best[source] ?? 0, score) },
            rounds: q.rounds + 1,
            history: [{ source, score, max, t: Date.now() }, ...q.history].slice(0, 100),
          },
        });
        get().logActivity('lines');
      },
      recordClassic: (id, found, total) => {
        const cur = get().classics[id];
        if (!cur || found > cur.best) set({ classics: { ...get().classics, [id]: { best: found, total } } });
        get().logActivity('lessons');
      },
      recordPuzzle: ({ id, puzzleRating, ok, rated, newRating, daily, themes }) => {
        const ps = get().puzzles;
        const rating = rated && newRating !== undefined ? newRating : ps.rating;
        set({
          puzzles: {
            ...ps,
            rating,
            attempts: ps.attempts + (rated ? 1 : 0),
            solved: ps.solved + (ok ? 1 : 0),
            failed: ps.failed + (ok ? 0 : 1),
            history: [{ id, ok, rating: puzzleRating, after: rating, t: Date.now(), ...(themes ? { themes } : {}) }, ...ps.history].slice(0, 500),
            seen: [id, ...ps.seen.filter((x) => x !== id)].slice(0, 4000),
            dailyDone: daily ? today() : ps.dailyDone,
          },
        });
        get().logActivity('puzzles');
      },
      recordRush: (mode, score) => {
        const ps = get().puzzles;
        if ((ps.rush[mode] ?? 0) >= score) return;
        set({ puzzles: { ...ps, rush: { ...ps.rush, [mode]: score } } });
      },
      updateSettings: (s) => set({ settings: { ...get().settings, ...s } }),
      addGame: (g) => set({ games: [g, ...get().games.filter((x) => x.id !== g.id)] }),
      updateGame: (id, patch) => set({ games: get().games.map((g) => (g.id === id ? { ...g, ...patch } : g)) }),
      removeGame: (id) => set({ games: get().games.filter((g) => g.id !== id) }),
      addLineCard: (openingId, lineId, side) => {
        const id = `line:${openingId}:${lineId}:${side}`;
        if (get().cards[id]) return;
        const card: LineCard = { id, kind: 'line', openingId, lineId, side, state: newCardState(), addedAt: Date.now() };
        set({ cards: { ...get().cards, [id]: card } });
      },
      removeCard: (id) => {
        const cards = { ...get().cards };
        delete cards[id];
        set({ cards });
      },
      gradeCard: (id, grade, weakPlies) => {
        const card = get().cards[id];
        if (!card) return;
        const next = { ...card, state: schedule(card.state, grade) } as Card;
        if (next.kind === 'line') next.weakPlies = weakPlies;
        set({ cards: { ...get().cards, [id]: next } });
      },
      addPuzzle: (p) => {
        const id = p.id;
        if (get().cards[id]) return false;
        const card: PuzzleCard = { ...p, kind: 'puzzle', state: newCardState(), addedAt: Date.now() };
        set({ cards: { ...get().cards, [id]: card } });
        return true;
      },
      solveLessonTask: (lessonId, key, total) => {
        const cur = get().lessons[lessonId] ?? { solved: [], completed: false, updatedAt: 0 };
        const solved = cur.solved.includes(key) ? cur.solved : [...cur.solved, key];
        set({
          lessons: {
            ...get().lessons,
            [lessonId]: { solved, completed: cur.completed || solved.length >= total, updatedAt: Date.now() },
          },
        });
      },
      completeLesson: (lessonId) => {
        const cur = get().lessons[lessonId] ?? { solved: [], completed: false, updatedAt: 0 };
        if (!cur.completed) get().logActivity('lessons');
        set({ lessons: { ...get().lessons, [lessonId]: { ...cur, completed: true, updatedAt: Date.now() } } });
      },
      toggleRepertoire: (openingId, side) => {
        const rep = { ...get().repertoire };
        if (rep[openingId]?.side === side) delete rep[openingId];
        else rep[openingId] = { side, addedAt: Date.now() };
        set({ repertoire: rep });
      },
      logActivity: (k, n = 1) => {
        const key = today();
        const day = { ...(get().activity[key] ?? emptyDay()) };
        day[k] += n;
        set({ activity: { ...get().activity, [key]: day } });
      },
      setPlan: (p) => set({ plan: p }),
      markPlanStep: (stepId) => {
        const p = get().plan;
        if (!p || p.done.includes(stepId)) return;
        set({ plan: { ...p, done: [...p.done, stepId] } });
      },
      importState: (data) =>
        set({
          settings: { ...defaultSettings, ...(data.settings ?? {}) },
          games: data.games ?? [],
          cards: data.cards ?? {},
          lessons: data.lessons ?? {},
          repertoire: data.repertoire ?? {},
          activity: data.activity ?? {},
          plan: data.plan ?? null,
          puzzles: { ...defaultPuzzleStats, ...(data.puzzles ?? {}) },
          classics: data.classics ?? {},
          program: data.program ?? null,
          vision: data.vision ?? {},
          drills: data.drills ?? {},
          quiz: data.quiz ?? { best: {}, rounds: 0, history: [] },
        }),
      resetAll: () =>
        set({ settings: defaultSettings, games: [], cards: {}, lessons: {}, repertoire: {}, activity: {}, plan: null, puzzles: defaultPuzzleStats, classics: {}, program: null, quiz: { best: {}, rounds: 0, history: [] }, vision: {}, drills: {} }),
    }),
    {
      name: 'outpost-state-v1',
      storage: createJSONStorage(() => idbStorage),
      partialize: (s) => ({
        settings: s.settings,
        games: s.games,
        cards: s.cards,
        lessons: s.lessons,
        repertoire: s.repertoire,
        activity: s.activity,
        plan: s.plan,
        puzzles: s.puzzles,
        classics: s.classics,
        program: s.program,
        quiz: s.quiz,
        vision: s.vision,
        drills: s.drills,
      }),
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<AppState>;
        return {
          ...current,
          ...p,
          settings: { ...defaultSettings, ...(p.settings ?? {}) },
          puzzles: { ...defaultPuzzleStats, ...(p.puzzles ?? {}) },
        };
      },
      onRehydrateStorage: () => () => {
        useApp.setState({ hydrated: true });
      },
    },
  ),
);

/** Consecutive days (ending today or yesterday) with any training activity. */
export function streak(activity: Record<string, DayActivity>): number {
  let n = 0;
  const d = new Date();
  const has = (key: string) => {
    const a = activity[key];
    return a && a.reviews + a.puzzles + a.games + a.lessons + a.lines > 0;
  };
  if (!has(today(d))) d.setDate(d.getDate() - 1);
  while (has(today(d))) {
    n++;
    d.setDate(d.getDate() - 1);
  }
  return n;
}

export function dueCards(cards: Record<string, Card>, now = Date.now()) {
  return Object.values(cards)
    .filter((c) => c.state.due <= now)
    .sort((a, b) => a.state.due - b.state.due);
}
