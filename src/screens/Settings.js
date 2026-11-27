import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useRef, useState } from 'react';
import { engine, threadsAvailable } from '../lib/engine/stockfish';
import { Download, RefreshCw, Upload, Trash2 } from 'lucide-react';
import { syncGames } from '../lib/sync';
import { entries, set as idbSet, clear as idbClear } from 'idb-keyval';
import { useApp } from '../lib/store/app';
import { Button, Header, Section, Segmented, Sheet, Toggle } from '../components/ui';
import { MiniBoard } from '../components/MiniBoard';
import { PIECE_SETS, pieceUrl } from '../lib/pieces';
import { toast } from '../components/Toast';
const BOARD_THEMES = [
    { id: 'slate', name: 'Slate' },
    { id: 'walnut', name: 'Walnut' },
    { id: 'brown', name: 'Brown' },
    { id: 'green', name: 'Tournament' },
    { id: 'blue', name: 'Ice' },
    { id: 'sage', name: 'Sage' },
    { id: 'purple', name: 'Lavender' },
    { id: 'coral', name: 'Coral' },
    { id: 'mono', name: 'Graphite' },
    { id: 'night', name: 'Night' },
];
export function SettingsScreen() {
    const s = useApp((x) => x.settings);
    const update = useApp((x) => x.updateSettings);
    const importState = useApp((x) => x.importState);
    const resetAll = useApp((x) => x.resetAll);
    const [confirmReset, setConfirmReset] = useState(false);
    const fileRef = useRef(null);
    const [names, setNames] = useState(s.usernames.join(', '));
    const exportBackup = async () => {
        const all = await entries();
        const data = Object.fromEntries(all.map(([k, v]) => [String(k), v]));
        const blob = new Blob([JSON.stringify({ app: 'outpost', version: 1, exportedAt: new Date().toISOString(), data })], { type: 'application/json' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `outpost-backup-${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        toast('Backup downloaded.');
    };
    const importBackup = async (f) => {
        try {
            const json = JSON.parse(await f.text());
            if (json.app !== 'outpost' || !json.data)
                throw new Error('bad');
            for (const [k, v] of Object.entries(json.data)) {
                if (k === 'outpost-state-v1')
                    continue;
                await idbSet(k, v);
            }
            const state = json.data['outpost-state-v1'];
            if (state)
                importState(JSON.parse(state).state);
            toast('Backup restored.');
        }
        catch {
            toast('That file is not an Outpost backup.');
        }
    };
    return (_jsxs("div", { className: "page page-narrow", children: [_jsx(Header, { title: "Settings", backTo: "/" }), _jsxs(Section, { title: "Appearance", children: [_jsxs("div", { className: "field", children: [_jsx("span", { className: "field-label", children: "Theme" }), _jsx(Segmented, { value: s.theme, onChange: (v) => update({ theme: v }), options: [
                                    { value: 'dark', label: 'Dark' },
                                    { value: 'light', label: 'Light' },
                                    { value: 'system', label: 'System' },
                                ] })] }), _jsxs("div", { className: "field mt16", children: [_jsx("span", { className: "field-label", children: "Board" }), _jsx("div", { className: "theme-swatches", children: BOARD_THEMES.map((t) => (_jsxs("button", { className: `swatch${s.boardTheme === t.id ? ' is-on' : ''}`, onClick: () => update({ boardTheme: t.id }), "aria-pressed": s.boardTheme === t.id, children: [_jsx("div", { className: `board-${t.id}`, children: _jsx(MiniBoard, { fen: "r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3", className: `board-${t.id}` }) }), _jsx("span", { children: t.name })] }, t.id))) })] }), _jsxs("div", { className: "field mt16", children: [_jsx("span", { className: "field-label", children: "Pieces" }), _jsx("div", { className: "piece-sets", children: PIECE_SETS.map((p) => (_jsxs("button", { className: `piece-set${(s.pieceSet ?? 'cburnett') === p.id ? ' is-on' : ''}`, onClick: () => update({ pieceSet: p.id }), "aria-pressed": (s.pieceSet ?? 'cburnett') === p.id, children: [_jsxs("span", { className: `piece-set-demo board-${s.boardTheme}`, children: [_jsx("img", { src: pieceUrl(p.id, 'wN'), alt: "" }), _jsx("img", { src: pieceUrl(p.id, 'bQ'), alt: "" })] }), _jsx("span", { children: p.name })] }, p.id))) })] }), _jsx(Toggle, { checked: s.coordinates, onChange: (v) => update({ coordinates: v }), label: "Board coordinates" }), _jsx(Toggle, { checked: s.sound, onChange: (v) => update({ sound: v }), label: "Sounds" })] }), _jsxs(Section, { title: "Coach & engine", children: [_jsx(Toggle, { checked: s.coachLive, onChange: (v) => update({ coachLive: v }), label: "Live coach by default", hint: "Grade and explain each move during games against the coach." }), _jsx(Toggle, { checked: s.coachTalk, onChange: (v) => update({ coachTalk: v }), label: "Position talk", hint: "Before each of your moves, the coach points out what matters in the position without naming a move." }), _jsx(Toggle, { checked: s.showEval, onChange: (v) => update({ showEval: v }), label: "Evaluation bar & numbers", hint: "Show the engine\u2019s score. Turn off to judge positions yourself." }), _jsx(Toggle, { checked: s.autoQueen, onChange: (v) => update({ autoQueen: v }), label: "Always promote to a queen" }), _jsxs("div", { className: "field mt16", children: [_jsx("span", { className: "field-label", children: "Analysis depth" }), _jsx(Segmented, { value: String(s.analysisDepth), onChange: (v) => update({ analysisDepth: +v }), options: [
                                    { value: '10', label: 'Fast' },
                                    { value: '13', label: 'Balanced' },
                                    { value: '16', label: 'Deep' },
                                    { value: '19', label: 'Deepest' },
                                ] }), _jsx("span", { className: "muted small", children: "Deeper reviews are more accurate but slower on a phone. Balanced reviews a 40-move game in about a minute." }), _jsx(EngineStatus, {})] })] }), _jsxs(Section, { title: "Your accounts", children: [_jsxs("label", { className: "field", children: [_jsx("span", { className: "field-label", children: "Usernames (comma-separated)" }), _jsx("input", { className: "input", value: names, onChange: (e) => setNames(e.target.value), onBlur: () => update({ usernames: names.split(',').map((x) => x.trim()).filter(Boolean) }) }), _jsx("span", { className: "muted small", children: "Used to recognise your side in imported games." })] }), _jsx(SyncSettings, {})] }), _jsxs(Section, { title: "Your data", children: [_jsx("p", { className: "muted", children: "Everything lives on this device \u2014 no account, no server. Export a backup to move to another device." }), _jsxs("div", { className: "row mt12", children: [_jsx(Button, { variant: "secondary", icon: _jsx(Download, { size: 16 }), onClick: exportBackup, children: "Export backup" }), _jsx("input", { ref: fileRef, type: "file", accept: "application/json,.json", hidden: true, onChange: (e) => e.target.files?.[0] && importBackup(e.target.files[0]) }), _jsx(Button, { variant: "secondary", icon: _jsx(Upload, { size: 16 }), onClick: () => fileRef.current?.click(), children: "Restore backup" }), _jsx(Button, { variant: "danger", icon: _jsx(Trash2, { size: 16 }), onClick: () => setConfirmReset(true), children: "Erase everything" })] })] }), _jsx(Section, { title: "Install on iPhone", children: _jsxs("ol", { className: "bullets", children: [_jsx("li", { children: "Open this site in Safari." }), _jsx("li", { children: "Tap the Share button, then \u201CAdd to Home Screen\u201D." }), _jsx("li", { children: "Open Outpost from the home screen once while online. After that it works fully offline \u2014 engine included." })] }) }), _jsx(Section, { title: "About", children: _jsx("p", { className: "muted small", children: "Analysis by Stockfish 18 (GPLv3), running on your device via WebAssembly. Pieces by Colin M.L. Burnett (GPLv2+). Opening names from the lichess chess-openings dataset (CC0)." }) }), _jsxs(Sheet, { open: confirmReset, onClose: () => setConfirmReset(false), title: "Erase all data?", children: [_jsx("p", { className: "muted", children: "Games, review cards, lesson progress and settings will be deleted from this device. This cannot be undone." }), _jsxs("div", { className: "row mt16", children: [_jsx(Button, { variant: "danger", icon: _jsx(Trash2, { size: 16 }), onClick: async () => {
                                    await idbClear();
                                    resetAll();
                                    setConfirmReset(false);
                                    toast('All data erased.');
                                }, children: "Erase everything" }), _jsx(Button, { variant: "ghost", onClick: () => setConfirmReset(false), children: "Cancel" })] })] })] }));
}
function SyncSettings() {
    const sync = useApp((x) => x.settings.sync) ?? { auto: true };
    const update = useApp((x) => x.updateSettings);
    const [lichess, setLichess] = useState(sync.lichess ?? '');
    const [chesscom, setChesscom] = useState(sync.chesscom ?? '');
    const [busy, setBusy] = useState(false);
    const [status, setStatus] = useState(null);
    const save = (patch) => update({ sync: { ...sync, auto: sync.auto ?? true, ...patch } });
    const now = async () => {
        save({ lichess: lichess.trim() || undefined, chesscom: chesscom.trim() || undefined });
        setBusy(true);
        setStatus(null);
        const r = await syncGames({ force: true });
        setBusy(false);
        setStatus(r.skipped === 'no-accounts' ? 'Add a username first.' : r.skipped === 'offline' ? 'You’re offline.' : `${r.added} new game${r.added === 1 ? '' : 's'} imported.${r.errors.length ? ' ' + r.errors.join(' ') : ''}`);
    };
    return (_jsxs("div", { className: "stack mt16", children: [_jsx("h3", { className: "field-label", children: "Sync games automatically" }), _jsxs("div", { className: "sync-grid", children: [_jsxs("label", { className: "field", children: [_jsx("span", { className: "field-label", children: "Lichess username" }), _jsx("input", { className: "input", value: lichess, onChange: (e) => setLichess(e.target.value), onBlur: () => save({ lichess: lichess.trim() || undefined }), autoCapitalize: "off", autoCorrect: "off", spellCheck: false })] }), _jsxs("label", { className: "field", children: [_jsx("span", { className: "field-label", children: "Chess.com username" }), _jsx("input", { className: "input", value: chesscom, onChange: (e) => setChesscom(e.target.value), onBlur: () => save({ chesscom: chesscom.trim() || undefined }), autoCapitalize: "off", autoCorrect: "off", spellCheck: false })] })] }), _jsx(Toggle, { checked: sync.auto ?? true, onChange: (v) => save({ auto: v }), label: "Import new games when the app opens", hint: "Checks at most every 30 minutes, only when you\u2019re online. New games appear in Games, ready for a coach review." }), _jsxs("div", { className: "row", children: [_jsx(Button, { variant: "secondary", size: "sm", icon: _jsx(RefreshCw, { size: 16 }), onClick: now, disabled: busy, children: busy ? 'Syncing…' : 'Sync now' }), _jsx("span", { className: "muted small", children: status ?? (sync.lastSyncAt ? `Last synced ${new Date(sync.lastSyncAt).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}` : 'Not synced yet') })] })] }));
}
function EngineStatus() {
    const [info, setInfo] = useState(null);
    useEffect(() => {
        let alive = true;
        engine.init().then(() => alive && setInfo({ ...engine.info })).catch(() => alive && setInfo({ threads: 0 }));
        return () => {
            alive = false;
        };
    }, []);
    return (_jsx("span", { className: "faint small", children: !info ? 'Starting the engine…' : info.threads === 0 ? 'The engine failed to start.' : info.threads > 1 ? `Stockfish 18 running on ${info.threads} threads.` : `Stockfish 18 running on one thread${threadsAvailable() === 1 && !window.crossOriginIsolated ? ' (reopen the app once to enable multi-threading)' : ''}.` }));
}
