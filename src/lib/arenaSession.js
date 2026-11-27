/** Live state of a variant / two-player game (persisted so it survives closing the app). */
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { get as idbGet, set as idbSet, del as idbDel } from 'idb-keyval';
const storage = {
    getItem: async (n) => (await idbGet(n)) ?? null,
    setItem: async (n, v) => {
        await idbSet(n, v);
    },
    removeItem: async (n) => {
        await idbDel(n);
    },
};
export const useArena = create()(persist((set, get) => ({
    game: null,
    setGame: (g) => set({ game: g }),
    patch: (p) => {
        const g = get().game;
        if (g)
            set({ game: { ...g, ...p } });
    },
}), { name: 'outpost-arena-v1', storage: createJSONStorage(() => storage) }));
