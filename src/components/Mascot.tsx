import type { ReactNode } from 'react';
import type { Mood } from '../lib/path/types';

/**
 * Rookie, the little rook who coaches the Learn path. Drawn inline so it
 * themes with the app and animates per mood. Soft, rounded shapes, big eyes,
 * no arms. A gold crown appears once the learner reaches Expert.
 */
export function Rookie({ mood = 'happy', size = 72, crown = false, className = '' }: { mood?: Mood; size?: number; crown?: boolean; className?: string }) {
  const lookUp = mood === 'think';
  const big = mood === 'wow' || mood === 'oops';
  const happyShut = mood === 'cheer';
  const eyeR = big ? 16.5 : 15.5;
  const pupilR = big ? 11 : 10;
  const pdy = lookUp ? -3.5 : mood === 'oops' ? 1.5 : 1;
  const pdx = lookUp ? 2.5 : 0;
  return (
    <svg className={`rookie is-${mood} ${className}`} width={size} height={size * 1.15} viewBox="0 -14 120 138" role="img" aria-label="Rookie the rook">
      <defs>
        <linearGradient id="rookie-body" x1="0.15" y1="0" x2="0.85" y2="1">
          <stop offset="0" stopColor="var(--rookie-hi)" />
          <stop offset="0.55" stopColor="var(--rookie-body)" />
          <stop offset="1" stopColor="var(--rookie-shade)" />
        </linearGradient>
      </defs>
      <ellipse cx="60" cy="119" rx="38" ry="5" className="rookie-shadow" />
      <g className="rookie-figure">
        {/* base: a soft, squashed pill */}
        <rect x="12" y="96" width="96" height="22" rx="11" fill="var(--rookie-shade)" />
        {/* chubby body, a little wider at the bottom */}
        <path d="M32 34 C24 34 22 40 22 48 L19 86 C18 99 26 104 38 104 L82 104 C94 104 102 99 101 86 L98 48 C98 40 96 34 88 34 Z" fill="url(#rookie-body)" />
        {/* turret: three round-topped merlons on a band */}
        <rect x="15" y="4" width="27" height="32" rx="13" fill="url(#rookie-body)" />
        <rect x="46.5" y="1" width="27" height="35" rx="13" fill="url(#rookie-body)" />
        <rect x="78" y="4" width="27" height="32" rx="13" fill="url(#rookie-body)" />
        <rect x="15" y="22" width="90" height="18" rx="9" fill="var(--rookie-body)" />
        <ellipse cx="29" cy="11" rx="6.5" ry="3.6" fill="#fff" opacity="0.38" />
        <ellipse cx="60" cy="8" rx="6.5" ry="3.6" fill="#fff" opacity="0.32" />
        <path d="M24 50 Q23 70 24 84" stroke="#fff" strokeWidth="4" strokeLinecap="round" opacity="0.18" fill="none" />
        {crown && (
          <g className="rookie-crown">
            <path d="M44 4 L47 -10 L54 -2 L60 -14 L66 -2 L73 -10 L76 4 Z" fill="#f6c443" stroke="#d99a1e" strokeWidth="2" strokeLinejoin="round" />
            <circle cx="60" cy="-14" r="2.8" fill="#ff6f7d" />
          </g>
        )}
        {/* face */}
        {happyShut ? (
          <g stroke="#141831" strokeWidth="4.5" strokeLinecap="round" fill="none">
            <path d="M30 64 Q41 51 52 64" />
            <path d="M68 64 Q79 51 90 64" />
          </g>
        ) : (
          <g className="rookie-eyes">
            <circle cx="41" cy="62" r={eyeR} fill="#fff" />
            <circle cx="79" cy="62" r={eyeR} fill="#fff" />
            <circle cx={41 + pdx} cy={62 + pdy} r={pupilR} fill="#141831" />
            <circle cx={79 + pdx} cy={62 + pdy} r={pupilR} fill="#141831" />
            <circle cx={44.5 + pdx} cy={57.5 + pdy} r="3.8" fill="#fff" />
            <circle cx={82.5 + pdx} cy={57.5 + pdy} r="3.8" fill="#fff" />
            <circle cx={38 + pdx} cy={66 + pdy} r="1.8" fill="#fff" opacity="0.85" />
            <circle cx={76 + pdx} cy={66 + pdy} r="1.8" fill="#fff" opacity="0.85" />
          </g>
        )}
        {mood === 'oops' && (
          <g stroke="#141831" strokeWidth="3" strokeLinecap="round">
            <path d="M28 43 Q36 41 46 44" />
            <path d="M92 43 Q84 41 74 44" />
          </g>
        )}
        {mood === 'think' && <path d="M70 42 Q79 38 89 42" stroke="#141831" strokeWidth="3" strokeLinecap="round" fill="none" />}
        <ellipse cx="27" cy="82" rx="7" ry="4.2" fill="#ff8f9c" opacity="0.6" />
        <ellipse cx="93" cy="82" rx="7" ry="4.2" fill="#ff8f9c" opacity="0.6" />
        <Mouth mood={mood} />
      </g>
    </svg>
  );
}

function Mouth({ mood }: { mood: Mood }) {
  switch (mood) {
    case 'cheer':
      return <path d="M51 80 Q60 94 69 80 Z" fill="#141831" />;
    case 'wow':
    case 'oops':
      return <ellipse cx="60" cy="86" rx="4.2" ry={mood === 'wow' ? 5.2 : 3.6} fill="#141831" />;
    case 'think':
      return <path d="M55 86 Q60 84 65 85" stroke="#141831" strokeWidth="3" strokeLinecap="round" fill="none" />;
    case 'wave':
      return <path d="M52 81 Q60 91 68 81 Z" fill="#141831" />;
    default:
      return <path d="M53 82 Q60 89 67 82" stroke="#141831" strokeWidth="3.2" strokeLinecap="round" fill="none" />;
  }
}

/** Rookie with a speech bubble. */
export function RookieSays({ mood = 'happy', children, crown, size = 64 }: { mood?: Mood; children: ReactNode; crown?: boolean; size?: number }) {
  return (
    <div className="rookie-says">
      <Rookie mood={mood} size={size} crown={crown} />
      <div className="rookie-bubble" aria-live="polite">
        {children}
      </div>
    </div>
  );
}
