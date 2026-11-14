// Emergency module screen: embeds the team's separate ASTRA prototype in a frame and runs the message bridge to it.
// AI assistance: drafted with Claude Code (see AI_USE.md).
import { useCallback, useEffect, useRef, useState } from 'react';
import { helloMsg, openPathwayMsg, profileMsg, readInbound, recordModuleAlert, setPatientMsg, vitalsMsg, type AstraOutbound } from '../core/astra.ts';
import type { RuleFile, Seed, Setting, State } from '../core/index.ts';
import './x-as.css';

export interface AstraProps {
  state: State;
  commit: (s: State) => void;
  ui: (p: Partial<State['ui']>) => void;
  setting: Setting;
  crewId: string;
  seed: Seed;
  rules: RuleFile;
  go: (route: string, arg?: string) => void;
  say: (text: string, s: Setting) => string;
  hhmm: (t: number) => string;
  /** A pathway number in the module to open, for example "12". */
  arg?: string;
}

const SRC = `${import.meta.env.BASE_URL}astra/index.html`;
/** How long to wait for the module to answer the handshake before showing the calm card. */
const READY_WAIT_MS = 8000;
/** The module treats a vital sign older than 60 seconds as stale, so the latest readings are sent again well within that. */
const REFRESH_MS = 30_000;

/** The module's own simulator writes over fed vitals. There is no message to switch it off, so this presses the module's own
 *  "Monitor source: External app" control, which works because the frame is served from this app's own address. */
function switchOffSimulator(frame: HTMLIFrameElement): boolean {
  try {
    const doc = frame.contentDocument;
    if (!doc?.body) return false;
    const b = doc.createElement('button');
    b.type = 'button';
    b.hidden = true;
    b.dataset.act = 'mmode';
    b.dataset.a = 'external';
    doc.body.appendChild(b);
    b.click();
    b.remove();
    return true;
  } catch {
    return false;
  }
}

export function Astra({ state, commit, setting, crewId, seed, rules, go, arg }: AstraProps) {
  const frame = useRef<HTMLIFrameElement | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'failed'>('loading');
  const loaded = useRef(false);
  const lastVitals = useRef('');
  const lastProfile = useRef('');
  const stateRef = useRef(state);
  stateRef.current = state;

  const target = typeof window !== 'undefined' && window.location.origin !== 'null' ? window.location.origin : '*';
  const send = useCallback((msg: AstraOutbound) => {
    try { frame.current?.contentWindow?.postMessage(msg, target); } catch { /* frame gone */ }
  }, [target]);

  const sendVitals = useCallback((force: boolean) => {
    const m = vitalsMsg(stateRef.current, seed, rules, crewId);
    const key = JSON.stringify([crewId, m.observations]);
    if (m.observations.length === 0 || (!force && key === lastVitals.current)) return;
    lastVitals.current = key;
    send(m);
  }, [seed, rules, crewId, send]);

  const onLoad = () => {
    const f = frame.current;
    if (!f) return;
    loaded.current = true;
    send(helloMsg());
    switchOffSimulator(f);
    const p = profileMsg(setting);
    lastProfile.current = String(p.profile);
    send(p);
    lastVitals.current = '';
    sendVitals(true);
    send(setPatientMsg(crewId));
    const n = arg !== undefined && /^\d+$/.test(arg.trim()) ? Number(arg.trim()) : NaN;
    if (Number.isInteger(n)) send(openPathwayMsg(n, crewId));
  };

  // Messages are accepted only from this frame's own window.
  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      if (!frame.current || e.source !== frame.current.contentWindow) return;
      const m = readInbound(e.data);
      if (!m) return;
      if (m.type === 'astra.ready') setStatus('ready');
      if (m.type === 'astra.monitorAlert' && seed.crew.some((c) => c.id === m.crewId)) {
        const s = stateRef.current;
        const next = recordModuleAlert(s, m, Date.now() + (s.ui.skipMs ?? 0));
        if (next !== s) commit(next);
      }
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [commit, seed]);

  // No answer to the handshake in time: show the calm card instead.
  useEffect(() => {
    if (status !== 'loading') return;
    const t = window.setTimeout(() => setStatus((s) => (s === 'loading' ? 'failed' : s)), READY_WAIT_MS);
    return () => window.clearTimeout(t);
  }, [status]);

  // This app holds the master place: tell the module again whenever it changes.
  useEffect(() => {
    const m = profileMsg(setting);
    if (!loaded.current || m.profile === lastProfile.current) return;
    lastProfile.current = String(m.profile);
    send(m);
  }, [setting, send]);

  // Send the readings again when they change, or the person changes.
  useEffect(() => {
    if (loaded.current) sendVitals(false);
  }, [state.vitals, state.readings, state.pathwayTests, sendVitals]);
  useEffect(() => {
    if (loaded.current) send(setPatientMsg(crewId));
  }, [crewId, send]);

  // Keep the module's copy fresh while this screen is open.
  useEffect(() => {
    const t = window.setInterval(() => { if (loaded.current) sendVitals(true); }, REFRESH_MS);
    return () => window.clearInterval(t);
  }, [sendVitals]);

  return (
    <section className="x-as-screen" aria-label="Emergency module">
      <div className="x-as-bar">
        <button type="button" className="btn secondary x-as-back" onClick={() => go('home')}>Back</button>
        <p className="x-as-note">Emergency module (ASTRA) · a separate team prototype · not for clinical use</p>
        <p className="x-as-note">It uses its own crew labels and does not model the signal delay: a report it marks delivered has only been queued. Values shown in it are SYNTHETIC.</p>
      </div>
      {status === 'failed' ? (
        <div className="card x-as-failed" role="status">
          <h2 className="title">The emergency module did not open</h2>
          <p className="muted">It may still be loading, or it is not on this device. Everything else in the app still works, and nothing you logged is lost.</p>
          <div className="btn-row">
            <button type="button" className="btn" onClick={() => go('home')}>Back</button>
            <button type="button" className="btn secondary" onClick={() => { loaded.current = false; setStatus('loading'); frame.current?.contentWindow?.location.reload(); }}>Try again</button>
          </div>
        </div>
      ) : null}
      <iframe
        ref={frame}
        className="x-as-frame"
        src={SRC}
        title="Emergency module"
        hidden={status === 'failed'}
        onLoad={onLoad}
        onError={() => setStatus('failed')}
      />
    </section>
  );
}
