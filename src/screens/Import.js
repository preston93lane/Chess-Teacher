import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useRef, useState } from 'react';
import { FileUp, Download } from 'lucide-react';
import { useApp } from '../lib/store/app';
import { fetchChessCom, fetchLichess, importPgnText } from '../lib/importGames';
import { navigate } from '../lib/router';
import { Button, Header, Section, Segmented, Spinner } from '../components/ui';
export function ImportScreen() {
    const settings = useApp((s) => s.settings);
    const updateSettings = useApp((s) => s.updateSettings);
    const games = useApp((s) => s.games);
    const addGame = useApp((s) => s.addGame);
    const [source, setSource] = useState('pgn');
    const [text, setText] = useState('');
    const [user, setUser] = useState(settings.usernames[0] ?? '');
    const [max, setMax] = useState('20');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState(null);
    const [result, setResult] = useState(null);
    const fileRef = useRef(null);
    const run = async (pgn, src) => {
        const names = [...new Set([...settings.usernames, user].filter(Boolean))];
        const res = await importPgnText(pgn, { source: src, usernames: names, existing: new Set(games.map((g) => g.id)) });
        // add oldest first so the newest ends on top
        [...res.added].sort((a, b) => a.createdAt - b.createdAt).forEach(addGame);
        setResult(res);
        if (!res.added.length && !res.skipped)
            setError('No games found in that PGN.');
    };
    const go = async () => {
        setError(null);
        setResult(null);
        setBusy(true);
        try {
            if (source === 'pgn')
                await run(text, 'pgn');
            else {
                if (!user.trim())
                    throw new Error('Enter a username first.');
                if (!navigator.onLine)
                    throw new Error('You are offline. Importing from Lichess or Chess.com needs a connection — PGN import works offline.');
                if (!settings.usernames.map((u) => u.toLowerCase()).includes(user.trim().toLowerCase())) {
                    updateSettings({ usernames: [...settings.usernames, user.trim()] });
                }
                const pgn = source === 'lichess' ? await fetchLichess(user.trim(), +max) : await fetchChessCom(user.trim(), +max);
                await run(pgn, source);
            }
        }
        catch (e) {
            setError(e.message || 'Import failed.');
        }
        finally {
            setBusy(false);
        }
    };
    const onFile = async (f) => {
        const t = await f.text();
        setText(t);
    };
    return (_jsxs("div", { className: "page page-narrow", children: [_jsx(Header, { title: "Import games", backTo: "/games", sub: "Bring in your own games \u2014 the coach reviews them like any other." }), _jsx(Segmented, { value: source, onChange: (v) => { setSource(v); setError(null); setResult(null); }, label: "Import source", options: [
                    { value: 'pgn', label: 'PGN' },
                    { value: 'lichess', label: 'Lichess' },
                    { value: 'chesscom', label: 'Chess.com' },
                ] }), source === 'pgn' ? (_jsxs(Section, { children: [_jsxs("label", { className: "field", children: [_jsx("span", { className: "field-label", children: "Paste one or more games in PGN" }), _jsx("textarea", { className: "textarea", value: text, onChange: (e) => setText(e.target.value), placeholder: '[White "You"]\n[Black "Opponent"]\n\n1. e4 c5 2. Nf3 d6 …' })] }), _jsxs("div", { className: "row mt12", children: [_jsx("input", { ref: fileRef, type: "file", accept: ".pgn,.txt,application/x-chess-pgn,text/plain", hidden: true, onChange: (e) => e.target.files?.[0] && onFile(e.target.files[0]) }), _jsx(Button, { variant: "secondary", size: "sm", icon: _jsx(FileUp, { size: 16 }), onClick: () => fileRef.current?.click(), children: "Choose a PGN file" })] }), _jsxs("label", { className: "field mt16", children: [_jsx("span", { className: "field-label", children: "Your name in these games (optional)" }), _jsx("input", { className: "input", value: user, onChange: (e) => setUser(e.target.value), placeholder: "Used to know which side you played" })] })] })) : (_jsx(Section, { children: _jsxs("div", { className: "stack", children: [_jsxs("label", { className: "field", children: [_jsxs("span", { className: "field-label", children: [source === 'lichess' ? 'Lichess' : 'Chess.com', " username"] }), _jsx("input", { className: "input", value: user, onChange: (e) => setUser(e.target.value), autoCapitalize: "off", autoCorrect: "off", spellCheck: false })] }), _jsxs("label", { className: "field", children: [_jsx("span", { className: "field-label", children: "How many recent games" }), _jsx("select", { className: "select", value: max, onChange: (e) => setMax(e.target.value), children: ['10', '20', '50', '100'].map((n) => _jsx("option", { children: n }, n)) })] }), _jsx("p", { className: "muted small", children: "Needs an internet connection. Games are stored on this device afterwards and work offline." })] }) })), _jsxs("div", { className: "row mt16", children: [_jsx(Button, { icon: busy ? undefined : _jsx(Download, { size: 16 }), onClick: go, disabled: busy || (source === 'pgn' && !text.trim()), children: busy ? 'Importing…' : 'Import' }), busy && _jsx(Spinner, {})] }), error && _jsx("p", { className: "error-text mt12", children: error }), result && (_jsxs("div", { className: "panel mt16 stack", children: [_jsxs("h3", { children: [result.added.length, " game", result.added.length === 1 ? '' : 's', " imported", result.skipped ? ` · ${result.skipped} already in your history` : ''] }), result.errors.length > 0 && (_jsx("ul", { className: "bullets small muted", children: result.errors.slice(0, 5).map((e) => _jsx("li", { children: e }, e)) })), result.added.some((g) => !g.myColor) && (_jsx("p", { className: "muted small", children: "For games where your side is unknown, open the game and pick your colour before the review." })), _jsx("div", { className: "list", children: result.added.slice(-8).reverse().map((g) => (_jsxs("button", { className: "list-item", onClick: () => navigate(`/games/${g.id}?auto=1`), children: [_jsxs("span", { className: "list-item-main", children: [_jsxs("span", { className: "list-item-title", children: [g.white, " vs ", g.black] }), _jsxs("span", { className: "list-item-sub", children: [g.opening ?? '', " \u00B7 ", g.result] })] }), _jsx("span", { className: "list-item-meta", children: "Review" })] }, g.id))) }), _jsx(Button, { variant: "secondary", onClick: () => navigate('/games'), children: "See all games" })] }))] }));
}
