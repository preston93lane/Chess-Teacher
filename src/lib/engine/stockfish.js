/**
 * Thin UCI driver for the single-threaded Stockfish WASM build running in a
 * Web Worker. Jobs are serialised; a newer job can pre-empt an older one.
 */
import { sideToMove } from '../chess/core';
const BASE = `${import.meta.env.BASE_URL}engine/`;
/** Multi-threaded engine needs SharedArrayBuffer, which needs cross-origin isolation. */
export function threadsAvailable() {
    const isolated = typeof self !== 'undefined' && self.crossOriginIsolated === true;
    if (!isolated || typeof SharedArrayBuffer === 'undefined')
        return 1;
    const cores = typeof navigator !== 'undefined' ? navigator.hardwareConcurrency || 2 : 2;
    return Math.max(1, Math.min(4, cores - 1));
}
class StockfishEngine {
    worker = null;
    ready = null;
    queue = [];
    current = null;
    nextId = 1;
    cache = new Map();
    listeners = new Set();
    optionState = {};
    failed = false;
    onBusy(fn) {
        this.listeners.add(fn);
        return () => this.listeners.delete(fn);
    }
    emitBusy() {
        const busy = !!this.current || this.queue.length > 0;
        this.listeners.forEach((l) => l(busy));
    }
    /** Which build is running: threads > 1 means the multi-threaded one. */
    info = { threads: 1, build: 'lite-single' };
    init() {
        if (this.ready)
            return this.ready;
        const threads = threadsAvailable();
        this.ready = (threads > 1 ? this.boot('stockfish-18-lite.js', threads, 12000) : Promise.reject(new Error('single')))
            .catch(() => {
            this.worker?.terminate();
            this.worker = null;
            return this.boot('stockfish-18-lite-single.js', 1, 30000);
        })
            .catch((err) => {
            this.failed = true;
            throw err;
        });
        return this.ready;
    }
    boot(file, threads, timeoutMs) {
        return new Promise((resolve, reject) => {
            try {
                const w = new Worker(BASE + file);
                this.worker = w;
                let gotUci = false;
                const timeout = setTimeout(() => {
                    if (!gotUci || !this.started)
                        reject(new Error('Engine did not start'));
                }, timeoutMs);
                w.onmessage = (e) => {
                    const line = typeof e.data === 'string' ? e.data : String(e.data);
                    if (!gotUci) {
                        if (line === 'uciok') {
                            gotUci = true;
                            if (threads > 1)
                                this.send(`setoption name Threads value ${threads}`);
                            this.send(`setoption name Hash value ${threads > 1 ? 64 : 32}`);
                            this.send('isready');
                        }
                        return;
                    }
                    if (line === 'readyok' && !this.current && !this.started) {
                        this.started = true;
                        this.info = { threads, build: file.replace('stockfish-18-', '').replace('.js', '') };
                        clearTimeout(timeout);
                        resolve();
                        this.pump();
                        return;
                    }
                    this.handleLine(line);
                };
                w.onerror = (err) => {
                    clearTimeout(timeout);
                    reject(err);
                };
                this.send('uci');
            }
            catch (err) {
                reject(err);
            }
        });
    }
    started = false;
    send(cmd) {
        this.worker?.postMessage(cmd);
    }
    applyOptions(options) {
        for (const [name, value] of options) {
            if (this.optionState[name] === value)
                continue;
            this.optionState[name] = value;
            this.send(`setoption name ${name} value ${value}`);
        }
    }
    handleLine(line) {
        const job = this.current;
        if (!job)
            return;
        if (line.startsWith('info') && line.includes(' pv ')) {
            const parsed = parseInfo(line, job.fen);
            if (parsed) {
                job.lines.set(parsed.multipv, parsed);
                job.depth = Math.max(job.depth, parsed.depth);
                if (job.onInfo && !job.cancelled && parsed.multipv === job.multipv) {
                    job.onInfo(this.snapshot(job));
                }
            }
        }
        else if (line.startsWith('bestmove')) {
            const best = line.split(' ')[1];
            const res = this.snapshot(job);
            res.bestmove = best && best !== '(none)' ? best : undefined;
            this.current = null;
            if (!job.cancelled)
                job.resolve(res);
            else
                job.reject(new CancelledError());
            this.pump();
        }
    }
    snapshot(job) {
        const lines = [...job.lines.values()]
            .filter((l) => l.multipv <= job.multipv)
            .sort((a, b) => a.multipv - b.multipv);
        return { fen: job.fen, depth: job.depth, lines };
    }
    pump() {
        if (this.current || !this.started) {
            this.emitBusy();
            return;
        }
        const job = this.queue.shift();
        if (!job) {
            this.emitBusy();
            return;
        }
        this.current = job;
        this.emitBusy();
        this.applyOptions(job.options);
        for (const c of job.commands)
            this.send(c);
    }
    enqueue(fen, options, commands, multipv, onInfo, preempt = false) {
        return new Promise((resolve, reject) => {
            const job = {
                id: this.nextId++,
                options,
                commands,
                multipv,
                fen,
                resolve,
                reject,
                onInfo,
                lines: new Map(),
                depth: 0,
                cancelled: false,
            };
            if (preempt)
                this.cancelAll();
            this.queue.push(job);
            this.init()
                .then(() => this.pump())
                .catch(reject);
        });
    }
    /** Cancel queued jobs and stop the running search. */
    cancelAll() {
        for (const j of this.queue) {
            j.cancelled = true;
            j.reject(new CancelledError());
        }
        this.queue = [];
        if (this.current) {
            this.current.cancelled = true;
            this.send('stop');
        }
    }
    stop() {
        if (this.current)
            this.send('stop');
    }
    async analyze(fen, opts = {}, onInfo, preempt = false) {
        const multipv = opts.multipv ?? 1;
        const depth = opts.depth ?? 14;
        const key = `${fen}|${multipv}|${opts.searchmoves?.join(',') ?? ''}|${opts.chess960 ? 960 : ''}`;
        const cached = this.cache.get(key);
        if (cached && cached.depth >= depth && !opts.movetime) {
            onInfo?.(cached);
            return cached;
        }
        const go = ['go'];
        if (opts.movetime)
            go.push('movetime', String(opts.movetime));
        else
            go.push('depth', String(depth));
        if (opts.searchmoves?.length)
            go.push('searchmoves', ...opts.searchmoves);
        const options = [
            ['UCI_LimitStrength', 'false'],
            ['Skill Level', '20'],
            ['MultiPV', String(multipv)],
            ['UCI_Chess960', opts.chess960 ? 'true' : 'false'],
        ];
        const commands = [`position fen ${fen}`, go.join(' ')];
        const res = await this.enqueue(fen, options, commands, multipv, onInfo, preempt);
        if (res.lines.length) {
            this.cache.set(key, res);
            if (this.cache.size > 2000) {
                const first = this.cache.keys().next().value;
                if (first)
                    this.cache.delete(first);
            }
        }
        return res;
    }
    /** Ask the engine for a move at a limited strength. */
    async play(fen, opts) {
        const multipv = opts.multipv ?? 1;
        const options = [];
        if (opts.elo) {
            options.push(['UCI_LimitStrength', 'true']);
            options.push(['UCI_Elo', String(Math.max(1320, Math.min(3190, opts.elo)))]);
            options.push(['Skill Level', '20']);
        }
        else {
            options.push(['UCI_LimitStrength', 'false']);
            options.push(['Skill Level', String(opts.skill ?? 20)]);
        }
        options.push(['MultiPV', String(multipv)]);
        options.push(['UCI_Chess960', opts.chess960 ? 'true' : 'false']);
        const commands = [`position fen ${fen}`];
        const go = ['go'];
        if (opts.depth)
            go.push('depth', String(opts.depth));
        if (opts.movetime)
            go.push('movetime', String(opts.movetime));
        if (!opts.depth && !opts.movetime)
            go.push('movetime', '800');
        commands.push(go.join(' '));
        return this.enqueue(fen, options, commands, multipv);
    }
    newGame() {
        if (this.started)
            this.send('ucinewgame');
    }
}
export class CancelledError extends Error {
    constructor() {
        super('cancelled');
    }
}
function parseInfo(line, fen) {
    const tokens = line.split(' ');
    let depth = 0;
    let multipv = 1;
    let cp;
    let mate;
    let pv = [];
    let bound = false;
    for (let i = 0; i < tokens.length; i++) {
        const t = tokens[i];
        if (t === 'depth')
            depth = parseInt(tokens[++i], 10);
        else if (t === 'multipv')
            multipv = parseInt(tokens[++i], 10);
        else if (t === 'score') {
            const kind = tokens[++i];
            const val = parseInt(tokens[++i], 10);
            if (kind === 'cp')
                cp = val;
            else if (kind === 'mate')
                mate = val;
            if (tokens[i + 1] === 'lowerbound' || tokens[i + 1] === 'upperbound')
                bound = true;
        }
        else if (t === 'pv') {
            pv = tokens.slice(i + 1);
            break;
        }
    }
    if (bound || !pv.length)
        return null;
    // UCI scores are from the side to move; normalise to White.
    const sign = sideToMove(fen) === 'w' ? 1 : -1;
    return {
        multipv,
        depth,
        cp: cp !== undefined ? cp * sign : undefined,
        mate: mate !== undefined ? mate * sign : undefined,
        pv,
    };
}
export const engine = new StockfishEngine();
