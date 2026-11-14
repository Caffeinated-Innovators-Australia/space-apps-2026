// Simple body figure drawn in code by the team's build assistant (AI-assisted code, see AI_USE.md).
import { useContext } from 'react';
import type { Tier } from '../core/rules.ts';
import { TierWords } from './ui';

interface Spot { group: string; label: string; x: number; y: number; target: string }

/** Each spot stands for a group of check-ins and opens one of them. */
const SPOTS: Spot[] = [
  { group: 'Mind and sleep', label: 'Mind and sleep', x: 160, y: 30, target: 'area:mind' },
  { group: 'Eyes', label: 'Eyes', x: 160, y: 58, target: 'area:eyes' },
  { group: 'Lungs', label: 'Lungs', x: 146, y: 102, target: 'area:lungs' },
  { group: 'Heart', label: 'Heart', x: 172, y: 126, target: 'area:heart' },
  { group: 'Kidneys and urine', label: 'Kidneys', x: 136, y: 152, target: 'pathway:KS-01' },
  { group: 'Gut', label: 'Gut', x: 160, y: 178, target: 'area:gut' },
  { group: 'Blood', label: 'Blood and immune', x: 221, y: 204, target: 'area:blood' },
  { group: 'Skin', label: 'Skin', x: 140, y: 252, target: 'area:skin' },
  { group: 'Muscle and bone', label: 'Muscle and bone', x: 180, y: 300, target: 'area:muscle' },
];

/** Tap a body area to open its screen ("area:"), or its symptom pathway where the target starts with "pathway:". `tiers` is keyed by group name and holds the most serious result in that group today. */
export function BodyFigure({ onOpen, tiers }: { onOpen: (indicatorId: string) => void; tiers: Record<string, Tier | undefined> }) {
  const words = useContext(TierWords);
  return (
    <svg className="figure" viewBox="70 0 320 400" role="group" aria-label="Body figure. Choose a body area to check.">
      <circle className="body" cx="160" cy="48" r="30" />
      <rect className="body" x="120" y="86" width="80" height="136" rx="26" />
      <rect className="body" x="88" y="94" width="22" height="132" rx="11" />
      <rect className="body" x="210" y="94" width="22" height="132" rx="11" />
      <rect className="body" x="124" y="226" width="32" height="160" rx="15" />
      <rect className="body" x="164" y="226" width="32" height="160" rx="15" />
      {SPOTS.map((s) => {
        const tier = tiers[s.group];
        const label = tier ? `${s.label}: ${words[tier]}` : s.label;
        return (
          <g key={s.group} className={`spot ${tier && tier !== 'green' ? tier : 'quiet'}`} role="button" tabIndex={0} aria-label={`${label}. Open this area.`} onClick={() => onOpen(s.target)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen(s.target); } }}>
            <line className="lead" x1={s.x} y1={s.y} x2={236} y2={s.y} />
            <circle className="ring" cx={s.x} cy={s.y} r="11" />
            <circle className="dot" cx={s.x} cy={s.y} r="4" />
            <text x={240} y={s.y + 4}>{s.label}{tier && tier !== 'green' ? <tspan className={`t-${tier}`}> {tier === 'amber' ? '\u25B2' : '\u25A0'}</tspan> : null}</text>
          </g>
        );
      })}
    </svg>
  );
}
