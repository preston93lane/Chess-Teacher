import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMemo, useState } from 'react';
import { ArrowRight, Play } from 'lucide-react';
import { BOTS } from '../lib/bots';
import { STYLES } from '../lib/styles';
import { Chess, START_FEN, uid } from '../lib/chess/core';
import { useApp } from '../lib/store/app';
import { useSession } from '../lib/gameSession';
import { navigate, query, useRoute } from '../lib/router';
import { estimateRating, suggestBot } from '../lib/plan';
import { Button, Header, Section, Segmented, Toggle } from '../components/ui';
import { OPENINGS } from '../data/openings';
import { getOpening } from '../lib/openings/book';
import { allLines } from '../lib/openings/book';
import { engine } from '../lib/engine/stockfish';
import { TIME_PRESETS } from '../lib/clock';
export function PlaySetup() {
    const path = useRoute();
    const q = query(path);
    const games = useApp((s) => s.games);
    const settings = useApp((s) => s.settings);
    const updateSettings = useApp((s) => s.updateSettings);
    const live = useSession((s) => s.game);
    const setGame = useSession((s) => s.setGame);
    const rating = estimateRating(games);
    const [botId, setBotId] = useState(q.get('bot') ?? suggestBot(rating).id);
    const [styleId, setStyleId] = useState(q.get('style') ?? 'balanced');
    const [blind, setBlind] = useState(q.get('blind') ?? 'off');
    const [color, setColor] = useState(q.get('side') ?? 'w');
    const [mode, setMode] = useState(q.get('opening') ? 'opening' : q.get('fen') ? 'fen' : 'standard');
    const [openingId, setOpeningId] = useState(q.get('opening') ?? OPENINGS[0].id);
    const [lineId, setLineId] = useState(q.get('line') ?? 'any');
    const [skipBook, setSkipBook] = useState(false);
    const [fen, setFen] = useState(q.get('fen') ?? '');
    const [coachLive, setCoachLive] = useState(settings.coachLive);
    const [tcId, setTcId] = useState(q.get('tc') ?? settings.timeControl ?? 'none');
    const preset = TIME_PRESETS.find((t) => t.id === tcId) ?? TIME_PRESETS[0];
    const customReps = useApp((x) => x.customReps);
    const opening = getOpening(openingId) ?? OPENINGS[0];
    const fenError = useMemo(() => {
        if (mode !== 'fen' || !fen.trim())
            return null;
        try {
            new Chess(fen.trim());
            return null;
        }
        catch {
            return 'That FEN is not a legal position.';
        }
    }, [fen, mode]);
    const start = () => {
        const userColor = color === 'random' ? (Math.random() < 0.5 ? 'w' : 'b') : color;
        let startFen = START_FEN;
        let presetSans = [];
        if (mode === 'fen' && fen.trim() && !fenError)
            startFen = fen.trim();
        if (mode === 'opening' && skipBook) {
            const lines = allLines(opening).filter((l) => lineId === 'any' || l.lineId === lineId);
            const line = lines[Math.floor(Math.random() * lines.length)];
            presetSans = line.sans;
        }
        engine.newGame();
        updateSettings({ coachLive, timeControl: tcId });
        setGame({
            id: uid('g'),
            config: {
                botId,
                userColor,
                startFen,
                presetSans,
                openingId: mode === 'opening' ? openingId : undefined,
                coachLive,
                title: mode === 'opening' ? opening.name : undefined,
                timeControl: preset.tc,
                block: q.get('block') ?? undefined,
                styleId: styleId === 'balanced' ? undefined : styleId,
                blind: blind === 'off' ? undefined : blind,
            },
            clock: preset.tc ? { w: preset.tc.initial, b: preset.tc.initial, running: null, since: null } : undefined,
            sans: [...presetSans],
            reviews: {},
            bookNotes: {},
            status: 'playing',
            hints: 0,
            takebacks: 0,
            createdAt: Date.now(),
        });
        navigate('/play/game');
    };
    return (_jsxs("div", { className: "page page-narrow", children: [_jsx(Header, { title: "Play the coach", sub: "Choose an opponent, a starting point and how much coaching you want." }), live && live.status === 'playing' && (_jsxs("button", { className: "resume", onClick: () => navigate('/play/game'), children: [_jsx(Play, { size: 18 }), _jsxs("span", { children: [_jsx("strong", { children: "Resume your game" }), _jsxs("span", { className: "muted", children: [" vs ", BOTS.find((b) => b.id === live.config.botId)?.name, " \u00B7 move ", Math.ceil(live.sans.length / 2)] })] })] })), _jsxs("button", { className: "program-cta", onClick: () => navigate('/play/arena'), children: [_jsxs("span", { children: [_jsx("strong", { children: "More ways to play" }), _jsx("span", { className: "muted small", children: "Chess960, Fog of War, two players on one device, and a chess clock for real boards." })] }), _jsx(ArrowRight, { size: 18 })] }), _jsxs(Section, { title: "Opponent", children: [_jsx("div", { className: "bot-grid", role: "radiogroup", "aria-label": "Opponent", children: BOTS.map((b) => (_jsxs("button", { role: "radio", "aria-checked": b.id === botId, className: `bot-card${b.id === botId ? ' is-on' : ''}`, onClick: () => setBotId(b.id), children: [_jsx("span", { className: "bot-elo num", children: b.elo }), _jsx("span", { className: "bot-name", children: b.name }), _jsx("span", { className: "bot-blurb", children: b.blurb })] }, b.id))) }), _jsxs("p", { className: "muted small mt8", children: ["Your estimated strength against the bots: ", rating, ". Strength labels are approximate."] })] }), _jsxs(Section, { title: "Playing style", children: [_jsx("div", { className: "style-grid", role: "radiogroup", "aria-label": "Playing style", children: STYLES.map((st) => (_jsx("button", { role: "radio", "aria-checked": st.id === styleId, className: `style-chip${st.id === styleId ? ' is-on' : ''}`, onClick: () => setStyleId(st.id), children: _jsx("span", { className: "style-name", children: st.name }) }, st.id))) }), _jsxs("p", { className: "muted small mt8", children: [STYLES.find((st) => st.id === styleId)?.blurb, styleId !== 'balanced' && mode === 'opening' ? ' (In opening practice the bot follows the chosen opening first.)' : ''] })] }), _jsxs(Section, { title: "Board", children: [_jsx(Segmented, { value: blind, onChange: setBlind, options: [{ value: 'off', label: 'Normal' }, { value: 'fade', label: 'Fading pieces' }, { value: 'hidden', label: 'Blindfold' }] }), _jsx("p", { className: "muted small mt8", children: blind === 'fade' ? 'Pieces fade out over the first 20 moves — keep the position in your head. Hold the eye button to peek.' : blind === 'hidden' ? 'No pieces on the board at all: play from memory and the move list. Hold the eye button to peek.' : 'Visualization training: try Fading pieces, then Blindfold.' })] }), _jsxs(Section, { title: "Time control", children: [_jsx("div", { className: "tc-grid", role: "radiogroup", "aria-label": "Time control", children: TIME_PRESETS.map((t) => (_jsxs("button", { role: "radio", "aria-checked": t.id === tcId, className: `tc-chip${t.id === tcId ? ' is-on' : ''}`, onClick: () => setTcId(t.id), children: [_jsx("span", { className: "tc-label num", children: t.label }), _jsx("span", { className: "tc-kind", children: t.kind })] }, t.id))) }), preset.tc && (_jsx("p", { className: "muted small mt8", children: "The bot manages its clock like a person: quick in known positions and obvious recaptures, slower when it\u2019s sharp, faster the stronger it is \u2014 and shakier when it\u2019s short of time. The live coach\u2019s review time doesn\u2019t count against either clock." }))] }), _jsx(Section, { title: "You play", children: _jsx(Segmented, { value: color, onChange: setColor, label: "Your color", options: [
                        { value: 'w', label: 'White' },
                        { value: 'b', label: 'Black' },
                        { value: 'random', label: 'Random' },
                    ] }) }), _jsxs(Section, { title: "Start from", children: [_jsx(Segmented, { value: mode, onChange: setMode, label: "Start position", options: [
                            { value: 'standard', label: 'Standard' },
                            { value: 'opening', label: 'An opening' },
                            { value: 'fen', label: 'A position' },
                        ] }), mode === 'opening' && (_jsxs("div", { className: "stack mt12", children: [_jsxs("label", { className: "field", children: [_jsx("span", { className: "field-label", children: "Opening" }), _jsxs("select", { className: "select", value: openingId, onChange: (e) => { setOpeningId(e.target.value); setLineId('any'); }, children: [OPENINGS.map((o) => (_jsxs("option", { value: o.id, children: [o.name, " (", o.side === 'w' ? 'White' : 'Black', " repertoire)"] }, o.id))), openingId.startsWith('scout:') && _jsx("option", { value: openingId, children: opening.name }), Object.values(customReps).length > 0 && (_jsx("optgroup", { label: "Your repertoires", children: Object.values(customReps).map((r) => (_jsx("option", { value: `rep:${r.id}`, children: r.name }, r.id))) }))] })] }), !openingId.startsWith('scout:') && (_jsxs("label", { className: "field", children: [_jsx("span", { className: "field-label", children: "Line" }), _jsxs("select", { className: "select", value: lineId, onChange: (e) => setLineId(e.target.value), children: [_jsx("option", { value: "any", children: "Any line (the bot picks)" }), opening.lines.map((l) => (_jsx("option", { value: l.id, children: l.name }, l.id)))] })] })), _jsx(Toggle, { checked: skipBook, onChange: setSkipBook, label: "Skip to the end of the theory", hint: "Start the game where the line ends, to practise the middlegame plans." }), _jsx("p", { className: "muted small", children: skipBook
                                    ? 'The game begins at the final position of a line.'
                                    : 'The bot plays theory moves from this opening. If you leave the book, the coach tells you what theory recommends.' })] })), mode === 'fen' && (_jsxs("label", { className: "field mt12", children: [_jsx("span", { className: "field-label", children: "FEN" }), _jsx("input", { className: "input", value: fen, onChange: (e) => setFen(e.target.value), placeholder: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1" }), fenError && _jsx("span", { className: "error-text", children: fenError })] }))] }), _jsxs(Section, { title: "Coaching", children: [_jsx(Toggle, { checked: coachLive, onChange: setCoachLive, label: "Live coach", hint: "After each of your moves the coach grades it and explains what changed. Turn off for a serious game; you can still review afterwards." }), _jsx(Toggle, { checked: settings.coachTalk, onChange: (v) => updateSettings({ coachTalk: v }), label: "Position talk", hint: "Before your move, the coach names what matters \u2014 threats, loose pieces, pins, space \u2014 but never the move." }), _jsx(Toggle, { checked: settings.showEval, onChange: (v) => updateSettings({ showEval: v }), label: "Evaluation bar & numbers", hint: "You can change all of these mid-game from the sliders button." })] }), _jsx("div", { className: "sticky-cta", children: _jsx(Button, { size: "lg", className: "btn-block", onClick: start, disabled: !!fenError, icon: _jsx(Play, { size: 18 }), children: "Start game" }) })] }));
}
