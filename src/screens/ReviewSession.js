import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useCallback, useEffect, useState } from 'react';
import { ArrowRight, Check } from 'lucide-react';
import { useApp, dueCards } from '../lib/store/app';
import { gradeFromMistakes } from '../lib/srs/scheduler';
import { navigate, query, useRoute } from '../lib/router';
import { getOpening } from '../lib/openings/book';
import { Button, Empty, Header } from '../components/ui';
import { LineDrill, PuzzleDrill } from '../components/Trainers';
import { BlockBanner, completeBlock } from '../components/BlockBanner';
export function ReviewSession() {
    const path = useRoute();
    const kind = query(path).get('kind');
    const gradeCard = useApp((s) => s.gradeCard);
    const logActivity = useApp((s) => s.logActivity);
    const [queue] = useState(() => dueCards(useApp.getState().cards).filter((c) => !kind || c.kind === kind).slice(0, 30));
    const [index, setIndex] = useState(0);
    const [graded, setGraded] = useState(null);
    const [tally, setTally] = useState({ good: 0, again: 0 });
    const card = queue[index];
    const blockId = query(path).get('block');
    useEffect(() => {
        if (!card)
            completeBlock(blockId);
    }, [card, blockId]);
    const onLineDone = useCallback((r) => {
        if (!card)
            return;
        const g = gradeFromMistakes(r.mistakes, r.hints);
        gradeCard(card.id, g, r.weakPlies);
        logActivity('reviews');
        setGraded(g);
        setTally((t) => (g === 'again' ? { ...t, again: t.again + 1 } : { ...t, good: t.good + 1 }));
    }, [card, gradeCard, logActivity]);
    const onPuzzleDone = useCallback((r) => {
        if (!card)
            return;
        const g = r.solved ? 'good' : r.tries <= 2 ? 'hard' : 'again';
        gradeCard(card.id, g);
        logActivity('puzzles');
        logActivity('reviews');
        setGraded(g);
        setTally((t) => (g === 'again' ? { ...t, again: t.again + 1 } : { ...t, good: t.good + 1 }));
    }, [card, gradeCard, logActivity]);
    const next = () => {
        setGraded(null);
        setIndex(index + 1);
    };
    if (!queue.length) {
        return (_jsxs("div", { className: "page page-narrow", children: [_jsx(Header, { title: "Review", backTo: blockId ? '/program' : '/train' }), _jsx(BlockBanner, {}), _jsx(Empty, { title: "Nothing due", action: _jsx(Button, { onClick: () => navigate('/openings'), children: "Learn a new line" }), children: "You\u2019re all caught up. New cards appear when you learn lines or review games." })] }));
    }
    if (!card) {
        return (_jsxs("div", { className: "page page-narrow", children: [_jsx(Header, { title: "Session complete", backTo: blockId ? '/program' : '/train' }), _jsx(BlockBanner, {}), _jsxs("div", { className: "panel stack", children: [_jsxs("p", { className: "session-done-num num", children: [tally.good, "/", queue.length] }), _jsx("p", { className: "muted", children: tally.again
                                ? `${tally.again} card${tally.again > 1 ? 's' : ''} will come back in a few minutes — repetition right after a miss is what fixes it.`
                                : 'Every card recalled. They are scheduled further out now.' }), _jsxs("div", { className: "row", children: [_jsx(Button, { onClick: () => navigate('/'), icon: _jsx(Check, { size: 16 }), children: "Back to today" }), _jsx(Button, { variant: "secondary", onClick: () => navigate('/train'), children: "Train hub" })] })] })] }));
    }
    const title = card.kind === 'line' ? getOpening(card.openingId)?.name ?? 'Opening' : 'Your mistakes';
    return (_jsxs("div", { className: "page board-screen-page", children: [_jsx(Header, { title: title, backTo: "/train", sub: `Card ${index + 1} of ${queue.length}` }), card.kind === 'line' ? (_jsx(LineDrill, { openingId: card.openingId, lineId: card.lineId, side: card.side, mode: "drill", onDone: onLineDone, focusPlies: card.weakPlies }, card.id)) : (_jsx(PuzzleDrill, { card: card, onDone: onPuzzleDone }, card.id)), graded && (_jsxs("div", { className: "review-next", children: [_jsx("span", { className: `grade grade-${graded}`, children: graded === 'good' ? 'Recalled' : graded === 'hard' ? 'Shaky' : 'Again soon' }), _jsx(Button, { onClick: next, icon: _jsx(ArrowRight, { size: 16 }), children: index + 1 < queue.length ? 'Next card' : 'Finish' })] }))] }));
}
