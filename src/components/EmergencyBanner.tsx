// The red banner shown on every screen while a life threat is active. It sends the crew to the right emergency checklist in one tap.
// AI assistance: drafted with Claude Code (see AI_USE.md).
import '../screens/emergency.css';
import type { LifeThreat } from '../core/index.ts';
import { More } from './ui.tsx';

/** Red is the Act now colour, drawn with its square. The buttons keep the Emergency button's own look so they are found at once. */
export function EmergencyBanner({ threats, go }: { threats: LifeThreat[]; go: (route: string, arg?: string) => void }) {
  if (threats.length === 0) return null;
  const first = threats[0];
  // One button for each place to go: two symptoms that open the same checklist share a button.
  const actions = threats.filter((t, i) => threats.findIndex((x) => x.construct === t.construct) === i);
  // Symptoms share one sentence; any other threat after the first is named with its own title.
  const symptoms = threats.filter((t) => t.kind === 'symptom').map((t) => t.detail.replace(/^You logged /, '').replace(/\.$/, ''));
  const lines = [
    ...(symptoms.length ? [`You logged ${symptoms.length < 2 ? symptoms[0] : `${symptoms.slice(0, -1).join(', ')} and ${symptoms[symptoms.length - 1]}`}.`] : []),
    ...threats.filter((t) => t.kind !== 'symptom').map((t) => (t === first ? t.detail : `${t.title}. ${t.detail}`)),
  ];
  return (
    <div className="x-em-banner" role="alert">
      <svg className="glyph" viewBox="0 0 16 16" width="20" height="20" aria-hidden="true"><rect x="1" y="1" width="14" height="14" /></svg>
      <div className="x-em-banner-text">
        <strong>{first.title}</strong>
        <span>{lines.join(' ')} Not a diagnosis.</span>
        <More label="Why this banner?">
          {threats.filter((t, i) => threats.findIndex((x) => x.ruleId === t.ruleId) === i).map((t) => (
            <p className="source" key={t.ruleId}>Rule {t.ruleId}. Source: {t.source} Rule confidence: {t.confidence}{t.placeholder ? ' Placeholder rule, awaiting clinician review.' : ''}</p>
          ))}
          <p className="caption">The banner clears when the symptom is tapped again, or when a newer set of vital signs no longer raises the alert.</p>
        </More>
      </div>
      <div className="x-em-banner-actions">
        {actions.map((t) => <button key={t.key} type="button" className="x-em-button" onClick={() => (t.construct === undefined ? go('emergency') : go('astra', String(t.construct)))}>{t.action}</button>)}
      </div>
    </div>
  );
}
