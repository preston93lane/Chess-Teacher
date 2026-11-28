import type { ReactNode } from 'react';
import type { Mood } from '../lib/path/types';

/**
 * Pip, the pawn who wants to be a queen. Drawn inline so it themes with the
 * app and animates per mood. A crown appears once the learner reaches Expert.
 */
export function Pip({ mood = 'happy', size = 72, crown = false, className = '' }: { mood?: Mood; size?: number; crown?: boolean; className?: string }) {
  const eyesUp = mood === 'think';
  const big = mood === 'wow' || mood === 'oops';
  const eyeRy = big ? 5.2 : 4.4;
  const pupilDy = eyesUp ? -2 : mood === 'oops' ? 1 : 0.6;
  const pupilDx = eyesUp ? 1.6 : 0;
  return (
    <svg className={`pip is-${mood} ${className}`} width={size} height={size * 1.25} viewBox="0 -12 120 150" role="img" aria-label="Pip the pawn">
      <defs>
        <linearGradient id="pip-body" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="var(--pip-hi)" />
          <stop offset="1" stopColor="var(--pip-body)" />
        </linearGradient>
      </defs>
      <ellipse cx="60" cy="133" rx="36" ry="4.5" className="pip-shadow" />
      <g className="pip-figure">
        {/* base */}
        <rect x="20" y="112" width="80" height="18" rx="9" fill="var(--pip-shade)" />
        <rect x="26" y="108" width="68" height="10" rx="5" fill="var(--pip-body)" />
        {/* body */}
        <path d="M42 62 C40 80 34 96 28 110 L92 110 C86 96 80 80 78 62 Z" fill="url(#pip-body)" />
        {/* arms */}
        <g className="pip-arm pip-arm-l">
          <path d="M38 82 C28 86 22 92 20 100" stroke="var(--pip-shade)" strokeWidth="7" strokeLinecap="round" fill="none" />
        </g>
        <g className="pip-arm pip-arm-r">
          <path d="M82 82 C92 86 98 92 100 100" stroke="var(--pip-shade)" strokeWidth="7" strokeLinecap="round" fill="none" />
        </g>
        {/* collar */}
        <ellipse cx="60" cy="60" rx="25" ry="7" fill="var(--pip-shade)" />
        {/* head */}
        <circle cx="60" cy="34" r="26" fill="url(#pip-body)" />
        <ellipse cx="51" cy="20" rx="8" ry="5" fill="#fff" opacity="0.28" />
        {crown && (
          <g className="pip-crown">
            <path d="M42 12 L46 -2 L53 8 L60 -6 L67 8 L74 -2 L78 12 Z" fill="#f6c443" stroke="#d99a1e" strokeWidth="2" strokeLinejoin="round" />
            <circle cx="60" cy="-6" r="2.6" fill="#ff6f7d" />
          </g>
        )}
        {/* face */}
        <g className="pip-eyes">
          <ellipse cx="50" cy="34" rx="5.6" ry={eyeRy + 1} fill="#fff" />
          <ellipse cx="70" cy="34" rx="5.6" ry={eyeRy + 1} fill="#fff" />
          <circle cx={50 + pupilDx} cy={34 + pupilDy} r={big ? 3.4 : 3} fill="#141831" />
          <circle cx={70 + pupilDx} cy={34 + pupilDy} r={big ? 3.4 : 3} fill="#141831" />
          <circle cx={51.2 + pupilDx} cy={32.6 + pupilDy} r="1" fill="#fff" />
          <circle cx={71.2 + pupilDx} cy={32.6 + pupilDy} r="1" fill="#fff" />
        </g>
        {mood === 'oops' && (
          <g stroke="#141831" strokeWidth="2.2" strokeLinecap="round">
            <path d="M43 25 L54 27.5" />
            <path d="M77 25 L66 27.5" />
          </g>
        )}
        {mood === 'think' && <path d="M64 24 Q70 21 76 24" stroke="#141831" strokeWidth="2.2" strokeLinecap="round" fill="none" />}
        <circle cx="42" cy="44" r="4" fill="#ff8f9c" opacity="0.55" />
        <circle cx="78" cy="44" r="4" fill="#ff8f9c" opacity="0.55" />
        <Mouth mood={mood} />
      </g>
    </svg>
  );
}

function Mouth({ mood }: { mood: Mood }) {
  switch (mood) {
    case 'cheer':
      return <path d="M50 44 Q60 58 70 44 Z" fill="#141831" />;
    case 'wow':
    case 'oops':
      return <ellipse cx="60" cy="48" rx="4" ry={mood === 'wow' ? 5 : 3.4} fill="#141831" />;
    case 'think':
      return <path d="M54 48 L64 46" stroke="#141831" strokeWidth="2.6" strokeLinecap="round" />;
    default:
      return <path d="M51 45 Q60 53 69 45" stroke="#141831" strokeWidth="2.8" strokeLinecap="round" fill="none" />;
  }
}

/** Pip with a speech bubble. */
export function PipSays({ mood = 'happy', children, crown, size = 64 }: { mood?: Mood; children: ReactNode; crown?: boolean; size?: number }) {
  return (
    <div className="pip-says">
      <Pip mood={mood} size={size} crown={crown} />
      <div className="pip-bubble" aria-live="polite">
        {children}
      </div>
    </div>
  );
}
