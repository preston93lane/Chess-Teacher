import { create } from 'zustand';
import { persist, createJSONStorage, type StateStorage } from 'zustand/middleware';
import { get as idbGet, set as idbSet, del as idbDel } from 'idb-keyval';
import type { Color } from './chess/core';
import type { MoveReview } from './coach/explain';
import type { ClockState, TimeControl } from './clock';

export interface GameConfig {
  botId: string;
  userColor: Color;
  startFen: string;
  /** Moves pre-played from the start position (e.g. an opening line). */
  presetSans: string[];
  openingId?: string;
  coachLive: boolean;
  title?: string;
  timeControl?: TimeControl | null;
  /** Training-program block this game belongs to. */
  block?: string;
}

export interface LiveGame {
  id: string;
  config: GameConfig;
  sans: string[];
  reviews: Record<number, MoveReview>;
  bookNotes: Record<number, string>;
  status: 'playing' | 'ended';
  result?: string;
  endReason?: string;
  hints: number;
  takebacks: number;
  createdAt: number;
  saved?: boolean;
  clock?: ClockState;
}

interface SessionState {
  game: LiveGame | null;
  setGame: (g: LiveGame | null) => void;
  patch: (p: Partial<LiveGame>) => void;
}

const storage: StateStorage = {
  getItem: async (n) => (await idbGet<string>(n)) ?? null,
  setItem: async (n, v) => {
    await idbSet(n, v);
  },
  removeItem: async (n) => {
    await idbDel(n);
  },
};

export const useSession = create<SessionState>()(
  persist(
    (set, get) => ({
      game: null,
      setGame: (g) => set({ game: g }),
      patch: (p) => {
        const g = get().game;
        if (g) set({ game: { ...g, ...p } });
      },
    }),
    { name: 'outpost-live-game-v1', storage: createJSONStorage(() => storage) },
  ),
);
