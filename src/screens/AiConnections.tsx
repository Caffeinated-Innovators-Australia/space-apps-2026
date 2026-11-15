// AI connections (FR-60, FR-62): settings for the small language model that understands what is said, and for the AI
// clinical assistant. Off by default. Kept on this device only; keys are never put in the record or a case.
// AI assistance: drafted with Claude Code (see AI_USE.md).
import { useState } from 'react';
import { assistantRoute, chatOpenAiCompatible, CLOUD_MAX_DELAY_SECONDS, loadAi, saveAi, type AiSettings, type ModelConnection } from '../core/ai.ts';
import type { Setting } from '../core/index.ts';

const store = (): Storage | undefined => { try { return window.localStorage; } catch { return undefined; } };

function Connection({ label, c, onChange, keyLabel, modelHint, endpointHint }: { label: string; c: ModelConnection; onChange: (c: ModelConnection) => void; keyLabel: string; modelHint: string; endpointHint: string }) {
  return (
    <fieldset className="stack">
      <legend className="why-label">{label}</legend>
      <label className="field">Server address<input value={c.endpoint} onChange={(e) => onChange({ ...c, endpoint: e.target.value })} placeholder={endpointHint} autoComplete="off" /></label>
      <label className="field">Model name<input value={c.model} onChange={(e) => onChange({ ...c, model: e.target.value })} placeholder={modelHint} autoComplete="off" /></label>
      <label className="field">{keyLabel}<input type="password" value={c.key ?? ''} onChange={(e) => onChange({ ...c, key: e.target.value || undefined })} autoComplete="off" /></label>
    </fieldset>
  );
}

export function AiConnections({ setting, go }: { setting: Setting; go: (route: string, arg?: string) => void }) {
  const [s, setS] = useState<AiSettings>(() => loadAi(store()));
  const [test, setTest] = useState('');
  const update = (next: AiSettings) => { setS(next); saveAi(next, store()); };
  const route = assistantRoute(s, setting.replySeconds);
  const testSlm = async () => {
    setTest('Testing…');
    try {
      const reply = await chatOpenAiCompatible(s.slm, [{ role: 'user', content: 'Reply with the single word: ready' }], (url, init) => fetch(url, init));
      setTest(`Connected. The model replied: "${reply.slice(0, 60)}"`);
    } catch (e) { setTest(`Not connected: ${(e as Error).message} The built-in understanding is used until it connects.`); }
  };
  return (
    <section className="stack" aria-labelledby="x-ai-h">
      <h1 className="display" id="x-ai-h">AI connections</h1>
      <p>Both are off unless you turn them on. The rules still set every alert. Anything an AI fills in is read back and checked like a typed value, and anything it suggests needs your tap.</p>

      <div className="card stack">
        <h2 className="title">Understanding what you say</h2>
        <p className="caption">A small language model can fill the check-ins, symptoms and vital signs from one spoken answer, and suggest which emergency checklist fits. It runs on the crew's own device or base computer, so it works with no link to Earth.</p>
        <div className="chips" role="radiogroup" aria-label="How spoken answers are understood">
          <button type="button" className="chip chip-toggle" role="radio" aria-checked={s.interpreter === 'built-in'} onClick={() => update({ ...s, interpreter: 'built-in' })}>Built-in word matching</button>
          <button type="button" className="chip chip-toggle" role="radio" aria-checked={s.interpreter === 'slm'} onClick={() => update({ ...s, interpreter: 'slm' })}>Small language model</button>
        </div>
        {s.interpreter === 'slm' ? (
          <>
            <Connection label="Small language model on this device or base computer" c={s.slm} onChange={(slm) => update({ ...s, slm })} keyLabel="Key, if the server needs one" modelHint="for example a Gemma E2B or E4B model, as named by your server" endpointHint="http://localhost:11434/v1/chat/completions" />
            <p className="caption">Any server that speaks the OpenAI chat format works, such as Ollama or llama.cpp. Today the browser turns speech into words and the model reads the words; a model that takes audio directly can replace that step later.</p>
            <div className="btn-row"><button type="button" className="btn secondary" onClick={() => { void testSlm(); }}>Test the connection</button></div>
            {test ? <p role="status">{test}</p> : null}
          </>
        ) : null}
      </div>

      <div className="card stack">
        <h2 className="title">AI clinical assistant</h2>
        <p className="caption">For when Earth or the flight surgeon cannot be reached. It supports the crew medic; it does not replace them.</p>
        <div className="chips" role="radiogroup" aria-label="AI clinical assistant">
          {([['off', 'Off'], ['cloud', 'Cloud frontier model'], ['on-location', 'Computer at this location']] as const).map(([v, l]) => (
            <button key={v} type="button" className="chip chip-toggle" role="radio" aria-checked={s.assistant === v} onClick={() => update({ ...s, assistant: v })}>{l}</button>
          ))}
        </div>
        {s.assistant === 'cloud' ? (
          <>
            <Connection label="Cloud frontier model (Anthropic API)" c={s.cloud} onChange={(cloud) => update({ ...s, cloud })} keyLabel="API key (kept on this device only)" modelHint="claude-opus-5-5" endpointHint="https://api.anthropic.com/v1/messages" />
            <p className="caption">For low Earth orbit, cislunar space and the Moon, where Earth answers within {CLOUD_MAX_DELAY_SECONDS} seconds. Further out, switch to a computer at your location.</p>
          </>
        ) : null}
        {s.assistant === 'on-location' ? (
          <>
            <Connection label="Model on a computer at this location" c={s.onLocation} onChange={(onLocation) => update({ ...s, onLocation })} keyLabel="Key, if the server needs one" modelHint="for example a Qwen, Gemma, Kimi or GLM model, as named by your server" endpointHint="http://base-computer:8000/v1/chat/completions" />
            <p className="caption">Any server that speaks the OpenAI chat format works, such as vLLM or Ollama. Works with no link to Earth, as on Mars or in transit.</p>
          </>
        ) : null}
        {s.assistant !== 'off' ? (
          <label className="x-vo-aloud"><input type="checkbox" checked={s.allowMedicines} onChange={(e) => update({ ...s, allowMedicines: e.target.checked })} /> Allow generic medicine names and doses, as suggestions for the crew medic to check (CR-50)</label>
        ) : null}
        <p role="status">{route.use ? `Ready here: ${route.use === 'cloud' ? 'cloud model' : 'computer at this location'}.` : route.why}</p>
        <div className="btn-row"><button type="button" className="btn" onClick={() => go('assistant')}>Open the AI clinical assistant</button></div>
      </div>
      <p className="caption">Settings and keys are kept in this browser only. They are not part of the crew record, a case, or the app's code.</p>
    </section>
  );
}
