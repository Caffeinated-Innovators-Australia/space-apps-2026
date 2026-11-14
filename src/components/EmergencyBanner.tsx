// The red banner shown on every screen while an emergency symptom is logged. It tells the person to press Emergency now.
// AI assistance: drafted with Claude Code (see AI_USE.md).
import '../screens/emergency.css';
import { More } from './ui.tsx';

interface Alert { ruleId: string; title: string; why: string; source: string; confidence: string; placeholder: boolean; symptoms: string[] }
const list = (xs: string[]) => (xs.length < 2 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`);

/** Red is the Act now colour, drawn with its square. The button keeps the Emergency button's own look so it is found at once. */
export function EmergencyBanner({ alert, go }: { alert: Alert | null; go: (route: string, arg?: string) => void }) {
  if (!alert) return null;
  return (
    <div className="x-em-banner" role="alert">
      <svg className="glyph" viewBox="0 0 16 16" width="20" height="20" aria-hidden="true"><rect x="1" y="1" width="14" height="14" /></svg>
      <div className="x-em-banner-text">
        <strong>{alert.title}</strong>
        <span>You logged {list(alert.symptoms.map((s) => s.toLowerCase()))}. Not a diagnosis.</span>
        <More label="Why this banner?">
          <p>{alert.why} Tap the symptom again if it was a slip.</p>
          <p className="source">Rule {alert.ruleId}. Source: {alert.source} Rule confidence: {alert.confidence}</p>
          {alert.placeholder ? <span className="placeholder">Placeholder rule, awaiting clinician review (CR-59)</span> : null}
        </More>
      </div>
      <button type="button" className="x-em-button" onClick={() => go('emergency')}>Emergency</button>
    </div>
  );
}
