// Shared components, written during the hackathon to the team design system.
// AI assistance: drafted with Claude Code (see AI_USE.md).
import { createContext, useContext, type ReactNode } from 'react';
import type { Assessment, Tier } from '../engine/rules';

export const TIER_WORD: Record<Tier, string> = { green: 'Self-manage', amber: 'Crew medic', red: 'Urgent' };

/** Tier words can change with the setting (for example on Earth); colour and shape never do. */
export const TierWords = createContext<Record<Tier, string>>(TIER_WORD);

export function TierShape({ tier, size = 14 }: { tier: Tier; size?: number }) {
  return (
    <svg viewBox="0 0 16 16" width={size} height={size} aria-hidden="true">
      {tier === 'green' ? <circle cx="8" cy="8" r="6.5" /> : tier === 'amber' ? <path d="M8 1.5L15 14H1z" /> : <path d="M5.2 1h5.6L15 5.2v5.6L10.8 15H5.2L1 10.8V5.2z" />}
    </svg>
  );
}

export function TierPill({ tier }: { tier: Tier }) {
  const words = useContext(TierWords);
  return (
    <span className={`pill pill-${tier}`}>
      <TierShape tier={tier} />
      <span>{words[tier]}</span>
    </span>
  );
}

export function SyntheticTag() {
  return <span className="synthetic">SYNTHETIC</span>;
}

export function ReviewBadge({ role }: { role: string }) {
  return (
    <span className="review">
      <svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true">
        <path d="M3 8.5l3 3 7-7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      Reviewed by our {role}
    </span>
  );
}

export function ReadingTile({ label, value, unit, delta, tier }: { label: string; value: string; unit: string; delta?: string; tier?: Tier }) {
  return (
    <div className="reading">
      <div className="reading-label">{label}</div>
      <div className="reading-value">
        <span className="num">{value}</span>
        <span className="unit">{unit}</span>
      </div>
      {delta ? <div className="delta">{delta}</div> : null}
      {tier ? <div><TierPill tier={tier} /></div> : null}
    </div>
  );
}

export function AlertCard({ a, synthetic, children }: { a: Assessment; synthetic?: boolean; children?: ReactNode }) {
  return (
    <section className={`alert alert-${a.tier}`} aria-live="polite">
      <div className="card-head">
        <TierPill tier={a.tier} />
        {synthetic ? <SyntheticTag /> : null}
      </div>
      <h2 className="title">{a.title}</h2>
      <ol className="steps">
        {a.steps.map((s) => (
          <li key={s}>{s}</li>
        ))}
      </ol>
      <div className="why">
        <span className="why-label">Why this alert?</span>
        <p>{a.why}</p>
        <p className="source">
          Source: {a.source.replace(/\.$/, '')} · Confidence: {a.confidence}
        </p>
      </div>
      {a.reviewedBy ? <ReviewBadge role={a.reviewedBy} /> : <span className="placeholder">Placeholder rule, awaiting clinician review</span>}
      {children}
    </section>
  );
}
