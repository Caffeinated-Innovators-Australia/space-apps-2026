// Simple body figure drawn in code by the team's build assistant (AI-assisted code, see AI_USE.md).
import { useContext } from 'react';
import type { Tier } from '../core/rules.ts';
import { TierWords } from './ui';

interface Spot { id: string; label: string; x: number; y: number; target?: string }

const SPOTS: Spot[] = [
  { id: 'mind', label: 'Mind', x: 160, y: 44, target: 'mood' },
  { id: 'heart', label: 'Heart', x: 172, y: 124, target: 'resting-hr' },
  { id: 'blood', label: 'Blood', x: 221, y: 196, target: 'haemoglobin' },
  { id: 'bones', label: 'Bones', x: 180, y: 300 },
];

/** Tap a body area to open its check-in. `tiers` is keyed by indicator id. */
export function BodyFigure({ onOpen, tiers }: { onOpen: (indicatorId: string) => void; tiers: Record<string, Tier | undefined> }) {
  const words = useContext(TierWords);
  return (
    <svg className="figure" viewBox="70 0 300 400" role="group" aria-label="Body figure. Choose a body area to check.">
      <circle className="body" cx="160" cy="48" r="30" />
      <rect className="body" x="120" y="86" width="80" height="136" rx="26" />
      <rect className="body" x="88" y="94" width="22" height="132" rx="11" />
      <rect className="body" x="210" y="94" width="22" height="132" rx="11" />
      <rect className="body" x="124" y="226" width="32" height="160" rx="15" />
      <rect className="body" x="164" y="226" width="32" height="160" rx="15" />
      {SPOTS.map((s) => {
        const tier = s.target ? tiers[s.target] : undefined;
        const label = s.target && tier ? `${s.label}: ${words[tier]}` : s.label;
        const inner = (
          <>
            <line className="lead" x1={s.x} y1={s.y} x2={236} y2={s.y} />
            <circle className="ring" cx={s.x} cy={s.y} r="11" />
            <circle className="dot" cx={s.x} cy={s.y} r="4" />
            <text x={240} y={s.y + 4}>{label}</text>
            <text x={240} y={s.y + 20} style={{ fontSize: 11, fill: s.target ? 'var(--advisory)' : undefined }}>{s.target ? 'Tap to check' : 'Not in this demo'}</text>
          </>
        );
        return s.target ? (
          <g key={s.id} className="spot" role="button" tabIndex={0} aria-label={`${label}. Open the check-in.`} onClick={() => onOpen(s.target!)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen(s.target!); } }}>
            {inner}
          </g>
        ) : (
          <g key={s.id} className="spot off" aria-label={`${s.label}. Not in this demo.`}>{inner}</g>
        );
      })}
    </svg>
  );
}
