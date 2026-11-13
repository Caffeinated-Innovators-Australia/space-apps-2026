// Simple body figure drawn in code by the team's build assistant (AI-assisted code, see AI_USE.md).
import type { Tier } from '../engine/rules';
import { TIER_WORD } from './ui';

interface Spot { id: string; label: string; x: number; y: number; lx: number; anchor: 'start' | 'end'; active: boolean }

const SPOTS: Spot[] = [
  { id: 'eyes', label: 'Eyes', x: 160, y: 46, lx: 236, anchor: 'start', active: false },
  { id: 'heart', label: 'Heart', x: 172, y: 124, lx: 236, anchor: 'start', active: false },
  { id: 'blood', label: 'Blood', x: 221, y: 196, lx: 236, anchor: 'start', active: true },
  { id: 'bones', label: 'Bones', x: 180, y: 300, lx: 236, anchor: 'start', active: false },
];

export function BodyFigure({ onOpen, tier }: { onOpen: (id: string) => void; tier?: Tier }) {
  return (
    <svg className="figure" viewBox="70 0 300 400" role="group" aria-label="Body figure. Choose a body area to check.">
      <circle className="body" cx="160" cy="48" r="30" />
      <rect className="body" x="120" y="86" width="80" height="136" rx="26" />
      <rect className="body" x="88" y="94" width="22" height="132" rx="11" />
      <rect className="body" x="210" y="94" width="22" height="132" rx="11" />
      <rect className="body" x="124" y="226" width="32" height="160" rx="15" />
      <rect className="body" x="164" y="226" width="32" height="160" rx="15" />
      {SPOTS.map((s) => {
        const label = s.active ? `${s.label}${tier ? `: ${TIER_WORD[tier]}` : ''}` : s.label;
        const tx = s.anchor === 'start' ? s.lx + 4 : s.lx - 4;
        const inner = (
          <>
            <line className="lead" x1={s.x} y1={s.y} x2={s.lx} y2={s.y} />
            <circle className="ring" cx={s.x} cy={s.y} r="11" />
            <circle className="dot" cx={s.x} cy={s.y} r="4" />
            <text x={tx} y={s.y + 4} textAnchor={s.anchor}>{label}</text>
            {!s.active ? <text x={tx} y={s.y + 20} textAnchor={s.anchor} style={{ fontSize: 11 }}>Not in this demo</text> : <text x={tx} y={s.y + 20} textAnchor={s.anchor} style={{ fontSize: 11, fill: 'var(--advisory)' }}>Tap to check</text>}
          </>
        );
        return s.active ? (
          <g key={s.id} className="spot" role="button" tabIndex={0} aria-label={`${label}. Take a reading.`} onClick={() => onOpen(s.id)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen(s.id); } }}>
            {inner}
          </g>
        ) : (
          <g key={s.id} className="spot off" aria-label={`${s.label}. Not in this demo.`}>{inner}</g>
        );
      })}
    </svg>
  );
}
