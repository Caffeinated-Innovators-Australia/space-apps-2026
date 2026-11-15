// "Say what is happening" (FR-61): one spoken or typed sentence, and the app suggests which emergency checklist fits.
// With the small language model on, the model suggests it; otherwise the emergency module's own keywords do. The crew
// member taps to open it: the app never changes screen by itself.
// AI assistance: drafted with Claude Code (see AI_USE.md).
import { useState } from 'react';
import { interpret, loadAi, type Interpretation } from '../core/ai.ts';
import { canListen, listenOnce } from './voice.ts';

export function EmergencyVoice({ symptoms, onOpen }: { symptoms: string[]; onOpen: (construct: number) => void }) {
  const [said, setSaid] = useState('');
  const [busy, setBusy] = useState(false);
  const [got, setGot] = useState<Interpretation | null>(null);
  const run = async (text: string) => {
    if (!text.trim()) return;
    setSaid(text); setBusy(true);
    const s = (() => { try { return loadAi(window.localStorage); } catch { return loadAi(); } })();
    setGot(await interpret(s, { fields: [], symptoms }, text, (url, init) => fetch(url, init)));
    setBusy(false);
  };
  const listen = async () => { setBusy(true); const t = await listenOnce().heard; setBusy(false); if (t) void run(t); };
  return (
    <div className="card stack" aria-labelledby="x-ev-h">
      <h2 className="title" id="x-ev-h">Say what is happening</h2>
      <p className="caption">For example: "He is fitting", or "there is smoke and an alarm". The app suggests a checklist; you open it.</p>
      <form className="btn-row" onSubmit={(e) => { e.preventDefault(); void run(said); }}>
        {canListen() ? <button type="button" className="btn" onClick={() => { void listen(); }} disabled={busy}>Speak</button> : null}
        <input aria-label="Or type what is happening" value={said} onChange={(e) => setSaid(e.target.value)} />
        <button type="submit" className="btn secondary" disabled={busy || !said.trim()}>Suggest</button>
      </form>
      {busy ? <p role="status">Listening or thinking…</p> : null}
      {got && !busy ? (
        got.checklist ? (
          <div role="status" className="stack">
            <p><strong>Suggested: {got.checklist.name}.</strong> {got.checklist.reason} <span className="caption">({got.source === 'slm' ? 'small language model' : 'keywords'})</span></p>
            <div className="btn-row"><button type="button" className="x-em-button" onClick={() => onOpen(got.checklist!.construct)}>Open the {got.checklist.name} checklist</button></div>
          </div>
        ) : <p role="status">No checklist matched. If someone is not responding or not breathing normally, start the steps below.</p>
      ) : null}
    </div>
  );
}
