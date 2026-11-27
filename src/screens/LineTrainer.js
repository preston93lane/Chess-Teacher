import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useCallback, useState } from 'react';
import { Repeat, Swords } from 'lucide-react';
import { getOpening } from '../lib/openings/book';
import { useApp } from '../lib/store/app';
import { gradeFromMistakes } from '../lib/srs/scheduler';
import { navigate, query, useRoute } from '../lib/router';
import { Button, Header } from '../components/ui';
import { LineDrill } from '../components/Trainers';
import { toast } from '../components/Toast';
import { BlockBanner, completeBlock } from '../components/BlockBanner';
export function LineTrainer({ openingId, lineId, mode }) {
    const path = useRoute();
    const q = query(path);
    const opening = getOpening(openingId);
    const side = q.get('side') ?? opening?.side ?? 'w';
    const addLineCard = useApp((s) => s.addLineCard);
    const gradeCard = useApp((s) => s.gradeCard);
    const logActivity = useApp((s) => s.logActivity);
    const markPlanStep = useApp((s) => s.markPlanStep);
    const card = useApp((s) => s.cards[`line:${openingId}:${lineId}:${side}`]);
    const [result, setResult] = useState(null);
    const [runKey, setRunKey] = useState(0);
    const line = opening?.lines.find((l) => l.id === lineId);
    const home = openingId.startsWith('rep:') ? `/repertoire/${openingId.slice(4)}` : `/openings/${openingId}`;
    const onDone = useCallback((r) => {
        setResult(r);
        const id = `line:${openingId}:${lineId}:${side}`;
        addLineCard(openingId, lineId, side);
        logActivity('lines');
        markPlanStep(`learn:${openingId}:${lineId}:${side}`);
        if (completeBlock(q.get('block')))
            toast('Block complete.');
        if (mode === 'drill') {
            gradeCard(id, gradeFromMistakes(r.mistakes, r.hints), r.weakPlies);
        }
        else if (!card) {
            toast('Line added to your review deck.');
        }
    }, 
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [openingId, lineId, side, mode, addLineCard, gradeCard, logActivity, markPlanStep, card]);
    if (!opening || !line)
        return _jsx("div", { className: "page", children: _jsx(Header, { title: "Line not found", backTo: "/openings" }) });
    return (_jsxs("div", { className: "page board-screen-page", children: [_jsx(Header, { title: opening.name, backTo: home, sub: mode === 'learn' ? 'Learn the moves and the reasons behind them' : 'Recall the line from memory' }), _jsx(BlockBanner, {}), _jsx(LineDrill, { openingId: openingId, lineId: lineId, side: side, mode: mode, onDone: onDone, focusPlies: card?.kind === 'line' ? card.weakPlies : undefined }, `${mode}-${runKey}`), result && (_jsxs("div", { className: "row mt16 trainer-next", children: [mode === 'learn' ? (_jsx(Button, { icon: _jsx(Repeat, { size: 16 }), onClick: () => navigate(`/openings/${openingId}/drill/${lineId}?side=${side}`, true), children: "Now recall it" })) : (_jsx(Button, { variant: "secondary", icon: _jsx(Repeat, { size: 16 }), onClick: () => { setResult(null); setRunKey(runKey + 1); }, children: "Drill again" })), _jsx(Button, { variant: "secondary", icon: _jsx(Swords, { size: 16 }), onClick: () => navigate(`/play?opening=${openingId}&line=${lineId}&side=${side}`), children: "Play it against the coach" }), _jsxs(Button, { variant: "ghost", onClick: () => navigate(home), children: ["Back to ", opening.name] })] }))] }));
}
