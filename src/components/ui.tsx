// Shared components, written during the hackathon to the team design system.
// AI assistance: drafted with Claude Code (see AI_USE.md).
import { createContext, useContext, type ReactNode } from 'react';
import type { Assessment, Tier } from '../core/rules.ts';

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

/** Advisory: blue, a diamond and the word. Information that asks nothing urgent of the crew. */
export function AdvisoryPill({ children = 'Advisory' }: { children?: ReactNode }) {
  return (
    <span className="pill pill-advisory">
      <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><path d="M8 1l7 7-7 7-7-7z" /></svg>
      <span>{children}</span>
    </span>
  );
}

/** An arrow after a reading that has crossed a caution or warning limit, pointing the way it moved. */
export function LimitArrow({ tier, delta }: { tier?: Tier; delta?: number }) {
  if (!tier || tier === 'green' || !delta) return null;
  const up = delta > 0;
  return <span className={`arrow arrow-${tier}`} role="img" aria-label={up ? 'above your range' : 'below your range'}>{up ? '\u2191' : '\u2193'}</span>;
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

export function ReadingTile({ label, value, unit, delta, tier, arrow }: { label: string; value: string; unit: string; delta?: string; tier?: Tier; arrow?: ReactNode }) {
  return (
    <div className="reading">
      <div className="reading-label">{label}</div>
      <div className="reading-value">
        <span className="num">{value}</span>
        <span className="unit">{unit}</span>
        {arrow}
      </div>
      {delta ? <div className="delta">{delta}</div> : null}
      {tier ? <div><TierPill tier={tier} /></div> : null}
    </div>
  );
}

/** Detail on demand. The screen stays short; the reason, the source and the fine print are one tap away. */
export function More({ label, children, open }: { label: string; children: ReactNode; open?: boolean }) {
  return (
    <details className="more" open={open}>
      <summary>{label}</summary>
      <div className="more-body">{children}</div>
    </details>
  );
}

/** A ring that fills as a count is completed, with the count inside. A picture of progress in place of a sentence. */
export function Ring({ done, total, size = 44 }: { done: number; total: number; size?: number }) {
  const r = 16;
  const c = 2 * Math.PI * r;
  const frac = total > 0 ? Math.min(1, done / total) : 1;
  return (
    <svg className="ring" viewBox="0 0 40 40" width={size} height={size} role="img" aria-label={`${done} of ${total} done`}>
      <circle className="ring-track" cx="20" cy="20" r={r} />
      <circle className="ring-fill" cx="20" cy="20" r={r} strokeDasharray={`${c * frac} ${c}`} transform="rotate(-90 20 20)" />
      <text x="20" y="25" textAnchor="middle">{done}/{total}</text>
    </svg>
  );
}

/**
 * A result: the tier, a title and the steps. The reason and its source sit behind "Why", one tap away.
 * `actions` stay visible under the steps; `children` are extra detail and go inside "Why".
 */
export function AlertCard({ a, synthetic, actions, children }: { a: Assessment; synthetic?: boolean; actions?: ReactNode; children?: ReactNode }) {
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
      {actions}
      <More label={a.tier === 'green' ? 'Why this result?' : 'Why this alert?'}>
        <p>{a.why}</p>
        <p className="source">
          Source: {a.source.replace(/\.$/, '')} · Rule confidence: {a.confidence}
        </p>
        {a.reviewedBy ? <ReviewBadge role={a.reviewedBy} /> : <span className="placeholder">Placeholder rule, awaiting clinician review</span>}
        {children}
      </More>
    </section>
  );
}
