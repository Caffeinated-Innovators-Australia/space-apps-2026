// The AI clinical assistant (FR-62): an escalation for when Earth or the flight surgeon cannot be reached. It answers the
// crew medic in plain words, labelled as an AI suggestion. It never changes an alert: the rules set every tier.
// AI assistance: drafted with Claude Code (see AI_USE.md).
import { useState } from 'react';
import { AI_LABEL, askAssistant, assistantRoute, assistantSystem, loadAi, type ChatTurn } from '../core/ai.ts';
import { crewById, latestVitals, pathwayStatuses, vitalsAlerts, vitalsLine, type RuleFile, type Seed, type Setting, type State } from '../core/index.ts';

const REASONS = ['No link to Earth', 'Waiting for Earth to reply', 'The flight surgeon cannot be reached', 'Second opinion for the crew medic'];

/** What the assistant is told about the person: today's symptoms and the latest vital signs. Nothing else leaves the device. */
function contextLine(state: State, seed: Seed, rules: RuleFile, crewId: string, setting: Setting): string {
  const crew = crewById(seed, crewId);
  const symptoms = state.symptoms.filter((s) => s.crewId === crewId).map((s) => s.label);
  const v = latestVitals(state, crewId);
  // The app's own active alerts and their signed-off first steps, so the assistant builds on them rather than inventing its own.
  const alerts = [
    ...vitalsAlerts(state, rules, crewId, setting.gravityBand).map((a) => `${a.title} (first steps: ${a.steps.join(' ')})`),
    ...pathwayStatuses(state, seed, rules, crewId).filter((p) => p.level === 'amber' || p.level === 'red').map((p) => `${p.title} (first steps: ${p.steps.join(' ')})`),
  ];
  return [
    `Crew member: ${crew.name} (SYNTHETIC demo person).`,
    symptoms.length ? `Symptoms logged: ${symptoms.join(', ')}.` : 'No symptoms logged.',
    v ? `Latest vital signs: ${vitalsLine(v.values)}.` : 'No vital signs recorded.',
    alerts.length ? `Active alerts in the app: ${alerts.join(' | ')}` : 'No active alerts in the app.',
  ].join(' ');
}

export function Assistant({ state, seed, rules, setting, crewId, go }: { state: State; seed: Seed; rules: RuleFile; setting: Setting; crewId: string; go: (route: string, arg?: string) => void }) {
  const s = (() => { try { return loadAi(window.localStorage); } catch { return loadAi(); } })();
  const route = assistantRoute(s, setting.replySeconds);
  const [reason, setReason] = useState(state.ui.linkDown ? REASONS[0] : REASONS[1]);
  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState('');
  const send = async () => {
    if (!text.trim() || busy) return;
    const intro = turns.length === 0 ? `${contextLine(state, seed, rules, crewId, setting)}\n\n` : '';
    const next: ChatTurn[] = [...turns, { role: 'user', content: `${intro}${text.trim()}` }];
    setTurns(next); setText(''); setBusy(true); setProblem('');
    try {
      const reply = await askAssistant(s, setting.replySeconds, assistantSystem({ place: setting.label, reason, allowMedicines: s.allowMedicines }), next, (url, init) => fetch(url, init));
      setTurns([...next, { role: 'assistant', content: reply }]);
    } catch (e) { setProblem((e as Error).message); }
    setBusy(false);
  };
  return (
    <section className="stack" aria-labelledby="x-as-h">
      <h1 className="display" id="x-as-h">AI clinical assistant</h1>
      <p className="confirm" role="note"><strong>If anyone may be in danger, press Emergency before anything else.</strong> This assistant is for when Earth or the flight surgeon cannot be reached. {AI_LABEL}</p>
      {!route.use ? (
        <div className="card stack">
          <p>{route.why}</p>
          <div className="btn-row"><button type="button" className="btn" onClick={() => go('ai')}>Open AI connections</button></div>
        </div>
      ) : (
        <div className="card stack">
          <p className="caption">Using: {route.use === 'cloud' ? `cloud model (${s.cloud.model})` : `computer at this location (${s.onLocation.model})`}. It is sent today's symptoms, the latest vital signs and the app's active alerts with their first steps, and nothing else from the record.</p>
          <label className="field">Why the assistant is needed
            <select value={reason} onChange={(e) => setReason(e.target.value)}>{REASONS.map((r) => <option key={r}>{r}</option>)}</select>
          </label>
          <ol className="x-vo-log" aria-live="polite" aria-label="Conversation">
            {turns.map((t, i) => (
              <li key={i} className={t.role === 'user' ? 'you' : 'app'}>
                <span className="x-vo-who">{t.role === 'user' ? 'You' : 'AI'}</span> <span style={{ whiteSpace: 'pre-wrap' }}>{t.role === 'user' && i === 0 ? t.content.split('\n\n').slice(1).join('\n\n') : t.content}</span>
                {t.role === 'assistant' ? <p className="caption">{AI_LABEL}</p> : null}
              </li>
            ))}
          </ol>
          <form className="stack" onSubmit={(e) => { e.preventDefault(); void send(); }}>
            <label className="field">Ask, or describe what is happening<textarea rows={3} value={text} onChange={(e) => setText(e.target.value)} /></label>
            <div className="btn-row"><button type="submit" className="btn" disabled={busy || !text.trim()}>{busy ? 'Waiting for the AI…' : 'Send'}</button></div>
          </form>
          {problem ? <p className="x-vt-error" role="alert">Not sent: {problem}</p> : null}
        </div>
      )}
    </section>
  );
}
