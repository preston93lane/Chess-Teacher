/** Live state of a variant / two-player game (persisted so it survives closing the app). */
import { create } from 'zustand';
import { persist, createJSONStorage, type StateStorage } from 'zustand/middleware';
import { get as idbGet, set as idbSet, del as idbDel } from 'idb-keyval';
import type { ClockState, TimeControl } from './clock';
import type { VariantMode, VMove } from './variants';

export interface ArenaConfig {
  mode: VariantMode;
  opponent: 'bot' | 'human';
  botId?: string;
  /** Your colour against a bot. */
  userColor: 'w' | 'b';
  tc: TimeControl | null;
  /** Two players at a table: board fixed, Black's pieces upside down. */
  tableMode?: boolean;
  startFen: string;
  /** Chess960 position number, for display. */
  number?: number;
}

export interface ArenaGame {
  id: string;
  config: ArenaConfig;
  moves: VMove[];
  clock?: ClockState;
  status: 'playing' | 'ended';
  result?: string;
  reason?: string;
  saved?: boolean;
  createdAt: number;
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

export const useArena = create<{ game: ArenaGame | null; setGame: (g: ArenaGame | null) => void; patch: (p: Partial<ArenaGame>) => void }>()(
  persist(
    (set, get) => ({
      game: null,
      setGame: (g) => set({ game: g }),
      patch: (p) => {
        const g = get().game;
        if (g) set({ game: { ...g, ...p } });
      },
    }),
    { name: 'outpost-arena-v1', storage: createJSONStorage(() => storage) },
  ),
);
