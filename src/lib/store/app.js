import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { get as idbGet, set as idbSet, del as idbDel } from 'idb-keyval';
import { newCardState, schedule } from '../srs/scheduler';
import { buildDay, getProgram } from '../program';
import { linesOf } from '../repertoire';
export const defaultPuzzleStats = { rating: 1500, attempts: 0, solved: 0, failed: 0, history: [], seen: [], rush: {} };
const idbStorage = {
    getItem: async (name) => (await idbGet(name)) ?? null,
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
export const defaultSettings = {
    theme: 'dark',
    boardTheme: 'slate',
    pieceSet: 'cburnett',
    coordinates: true,
    sound: true,
    coachLive: true,
    coachTalk: true,
    showEval: true,
    analysisDepth: 13,
    autoQueen: true,
    usernames: [],
};
const emptyDay = () => ({ reviews: 0, puzzles: 0, games: 0, lessons: 0, lines: 0 });
export const useApp = create()(persist((set, get) => ({
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
        if ((get().vision[mode] ?? 0) < score)
            set({ vision: { ...get().vision, [mode]: score } });
        get().logActivity('puzzles');
    },
    scouts: {},
    saveScout: (p) => {
        // Keep the eight most recent scouting reports.
        const all = { ...get().scouts, [p.key]: p };
        const keep = Object.values(all).sort((a, b) => b.fetchedAt - a.fetchedAt).slice(0, 8);
        set({ scouts: Object.fromEntries(keep.map((x) => [x.key, x])) });
    },
    deleteScout: (key) => {
        const all = { ...get().scouts };
        delete all[key];
        set({ scouts: all });
    },
    customReps: {},
    saveRep: (rep) => {
        const old = get().customReps[rep.id];
        const oid = `rep:${rep.id}`;
        // Keep review cards in step with the tree: a line that grew keeps its schedule.
        const oldLines = old ? linesOf(old) : [];
        const newLines = linesOf(rep);
        const cards = { ...get().cards };
        for (const [cid, c] of Object.entries(cards)) {
            if (c.kind !== 'line' || c.openingId !== oid)
                continue;
            if (newLines.some((l) => l.id === c.lineId))
                continue;
            const was = oldLines.find((l) => l.id === c.lineId);
            const grown = was && newLines.find((l) => l.sans.length >= was.sans.length && was.sans.every((s, i) => l.sans[i] === s));
            delete cards[cid];
            if (grown) {
                const id = `line:${oid}:${grown.id}:${c.side}`;
                if (!cards[id])
                    cards[id] = { ...c, id, lineId: grown.id };
            }
        }
        set({ customReps: { ...get().customReps, [rep.id]: rep }, cards });
    },
    deleteRep: (id) => {
        const reps = { ...get().customReps };
        delete reps[id];
        const cards = Object.fromEntries(Object.entries(get().cards).filter(([, c]) => !(c.kind === 'line' && c.openingId === `rep:${id}`)));
        set({ customReps: reps, cards });
    },
    variantStats: {},
    recordVariant: (mode, outcome) => {
        const cur = get().variantStats[mode] ?? { w: 0, d: 0, l: 0 };
        set({ variantStats: { ...get().variantStats, [mode]: { ...cur, [outcome]: cur[outcome] + 1 } } });
        get().logActivity('games');
    },
    repTrain: {},
    learnRepMoves: (oid, keys) => {
        const now = Date.now();
        const cur = { ...(get().repTrain[oid] ?? {}) };
        // Just learned: first review a few hours later (practising straight away still works).
        for (const k of keys)
            if (!cur[k])
                cur[k] = { ...newCardState(now), due: now + 4 * 60 * 60 * 1000, history: [{ t: now, g: 'good' }], last: now };
        set({ repTrain: { ...get().repTrain, [oid]: cur } });
    },
    gradeRepMove: (oid, key, grade) => {
        const now = Date.now();
        const cur = { ...(get().repTrain[oid] ?? {}) };
        cur[key] = schedule(cur[key] ?? newCardState(now), grade, now);
        set({ repTrain: { ...get().repTrain, [oid]: cur } });
    },
    drills: {},
    recordDrill: (id, passed, moves, grade) => {
        const cur = get().drills[id] ?? { passed: false, attempts: 0 };
        const now = Date.now();
        const srs = passed ? schedule(cur.srs ?? newCardState(now), grade ?? 'good', now) : cur.srs ? schedule(cur.srs, 'again', now) : undefined;
        set({
            drills: {
                ...get().drills,
                [id]: {
                    passed: cur.passed || passed,
                    attempts: cur.attempts + 1,
                    bestMoves: passed ? Math.min(cur.bestMoves ?? Infinity, moves) : cur.bestMoves,
                    srs,
                    log: [...(cur.log ?? []), { t: now, passed }].slice(-30),
                },
            },
        });
        get().logActivity('lessons');
    },
    startProgram: (p) => set({ program: { ...p, done: [], checkpoints: [], startedAt: Date.now() } }),
    stopProgram: () => set({ program: null }),
    completeBlock: (id) => {
        const p = get().program;
        if (!p || !id || !id.startsWith(p.templateId + ':') || p.done.includes(id))
            return false;
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
        if (!cur || found > cur.best)
            set({ classics: { ...get().classics, [id]: { best: found, total } } });
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
        if ((ps.rush[mode] ?? 0) >= score)
            return;
        set({ puzzles: { ...ps, rush: { ...ps.rush, [mode]: score } } });
    },
    updateSettings: (s) => set({ settings: { ...get().settings, ...s } }),
    addGame: (g) => set({ games: [g, ...get().games.filter((x) => x.id !== g.id)] }),
    updateGame: (id, patch) => set({ games: get().games.map((g) => (g.id === id ? { ...g, ...patch } : g)) }),
    removeGame: (id) => set({ games: get().games.filter((g) => g.id !== id) }),
    addLineCard: (openingId, lineId, side) => {
        const id = `line:${openingId}:${lineId}:${side}`;
        if (get().cards[id])
            return;
        const card = { id, kind: 'line', openingId, lineId, side, state: newCardState(), addedAt: Date.now() };
        set({ cards: { ...get().cards, [id]: card } });
    },
    removeCard: (id) => {
        const cards = { ...get().cards };
        delete cards[id];
        set({ cards });
    },
    gradeCard: (id, grade, weakPlies) => {
        const card = get().cards[id];
        if (!card)
            return;
        const next = { ...card, state: schedule(card.state, grade) };
        if (next.kind === 'line')
            next.weakPlies = weakPlies;
        set({ cards: { ...get().cards, [id]: next } });
    },
    addPuzzle: (p) => {
        const id = p.id;
        if (get().cards[id])
            return false;
        const card = { ...p, kind: 'puzzle', state: newCardState(), addedAt: Date.now() };
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
        if (!cur.completed)
            get().logActivity('lessons');
        set({ lessons: { ...get().lessons, [lessonId]: { ...cur, completed: true, updatedAt: Date.now() } } });
    },
    toggleRepertoire: (openingId, side) => {
        const rep = { ...get().repertoire };
        if (rep[openingId]?.side === side)
            delete rep[openingId];
        else
            rep[openingId] = { side, addedAt: Date.now() };
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
        if (!p || p.done.includes(stepId))
            return;
        set({ plan: { ...p, done: [...p.done, stepId] } });
    },
    importState: (data) => set({
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
        repTrain: data.repTrain ?? {},
        variantStats: data.variantStats ?? {},
        customReps: data.customReps ?? {},
        scouts: data.scouts ?? {},
        quiz: data.quiz ?? { best: {}, rounds: 0, history: [] },
    }),
    resetAll: () => set({ settings: defaultSettings, games: [], cards: {}, lessons: {}, repertoire: {}, activity: {}, plan: null, puzzles: defaultPuzzleStats, classics: {}, program: null, quiz: { best: {}, rounds: 0, history: [] }, vision: {}, drills: {}, repTrain: {}, variantStats: {}, customReps: {}, scouts: {} }),
}), {
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
        repTrain: s.repTrain,
        variantStats: s.variantStats,
        customReps: s.customReps,
        scouts: s.scouts,
    }),
    merge: (persisted, current) => {
        const p = (persisted ?? {});
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
}));
/** Consecutive days (ending today or yesterday) with any training activity. */
/** Endgame drills whose review is due (learned drills only). */
export function dueDrills(drills, now = Date.now()) {
    return Object.entries(drills)
        .filter(([, d]) => d.srs && d.srs.due <= now)
        .sort((a, b) => a[1].srs.due - b[1].srs.due)
        .map(([id]) => id);
}
export function streak(activity) {
    let n = 0;
    const d = new Date();
    const has = (key) => {
        const a = activity[key];
        return a && a.reviews + a.puzzles + a.games + a.lessons + a.lines > 0;
    };
    if (!has(today(d)))
        d.setDate(d.getDate() - 1);
    while (has(today(d))) {
        n++;
        d.setDate(d.getDate() - 1);
    }
    return n;
}
export function dueCards(cards, now = Date.now()) {
    return Object.values(cards)
        .filter((c) => c.state.due <= now)
        .sort((a, b) => a.state.due - b.state.due);
}
