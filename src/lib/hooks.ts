import { useEffect, useRef, useState } from 'react';
import { engine, CancelledError, type AnalysisResult } from './engine/stockfish';

/** Live engine analysis that follows the given FEN. */
export function useAnalysis(fen: string | null, opts: { enabled: boolean; multipv?: number; depth?: number }) {
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [busy, setBusy] = useState(false);
  const token = useRef(0);
  useEffect(() => {
    if (!fen || !opts.enabled) {
      setResult(null);
      return;
    }
    const my = ++token.current;
    setBusy(true);
    setResult(null);
    engine
      .analyze(
        fen,
        { depth: opts.depth ?? 16, multipv: opts.multipv ?? 3 },
        (r) => {
          if (token.current === my && r.depth >= 6) setResult(r);
        },
        true,
      )
      .then((r) => {
        if (token.current === my) {
          setResult(r);
          setBusy(false);
        }
      })
      .catch((e) => {
        if (!(e instanceof CancelledError) && token.current === my) setBusy(false);
      });
    return () => {
      token.current++;
    };
  }, [fen, opts.enabled, opts.multipv, opts.depth]);
  return { result, busy };
}

export function useMediaQuery(q: string) {
  const [m, setM] = useState(() => window.matchMedia(q).matches);
  useEffect(() => {
    const mq = window.matchMedia(q);
    const on = () => setM(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, [q]);
  return m;
}

/** Keyboard navigation for move lists. */
export function useArrowKeys(handlers: { left?: () => void; right?: () => void; up?: () => void; down?: () => void }) {
  const ref = useRef(handlers);
  ref.current = handlers;
  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT')) return;
      if (e.key === 'ArrowLeft') ref.current.left?.();
      else if (e.key === 'ArrowRight') ref.current.right?.();
      else if (e.key === 'ArrowUp') ref.current.up?.();
      else if (e.key === 'ArrowDown') ref.current.down?.();
      else return;
      e.preventDefault();
    };
    window.addEventListener('keydown', on);
    return () => window.removeEventListener('keydown', on);
  }, []);
}

export function useEngineStatus() {
  const [busy, setBusy] = useState(false);
  useEffect(() => engine.onBusy(setBusy) as unknown as () => void, []);
  return busy;
}
