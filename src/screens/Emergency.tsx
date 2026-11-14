// Emergency screen: walks a crew member who is not a medical expert through basic life support, one step at a time.
// AI assistance: drafted with Claude Code (see AI_USE.md).
import { useCallback, useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import { activeEmergency, emergencySummary, endEmergency, gravityLine, reachStep, startEmergency, type EmergencyProtocol } from '../core/emergency.ts';
import type { RuleFile, Seed, Setting, State } from '../core/index.ts';
import protocolJson from '../data/emergency.json';
import './emergency.css';

const protocol = protocolJson as EmergencyProtocol;
const HOLD_MS = 3000;

export interface EmergencyProps {
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
}

/* Speech recognition is not in every browser or in the standard DOM types, so only the parts used here are described. */
interface Recogniser {
  continuous: boolean; interimResults: boolean; lang: string;
  onresult: ((e: { resultIndex: number; results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null;
  onend: (() => void) | null; onerror: (() => void) | null;
  start(): void; stop(): void;
}
type RecogniserCtor = new () => Recogniser;
function recogniserCtor(): RecogniserCtor | undefined {
  if (typeof window === 'undefined') return undefined;
  const w = window as unknown as { SpeechRecognition?: RecogniserCtor; webkitSpeechRecognition?: RecogniserCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition;
}
function speechOut(): SpeechSynthesis | undefined {
  try { return typeof window !== 'undefined' && 'speechSynthesis' in window ? window.speechSynthesis : undefined; } catch { return undefined; }
}
function reducedMotion(): boolean {
  try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch { return false; }
}
function mmss(ms: number): string {
  const s = Math.max(0, Math.round(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

export function Emergency({ state, commit, crewId, go, hhmm, setting }: EmergencyProps) {
  const steps = protocol.steps;
  const run = activeEmergency(state);
  const [endedId, setEndedId] = useState<string | null>(null);
  const [index, setIndex] = useState(() => {
    // Coming back to an open run resumes at the furthest step already reached.
    const open = activeEmergency(state);
    if (!open) return 0;
    return Math.max(0, ...open.steps.map((s) => steps.findIndex((p) => p.id === s.id)));
  });
  const step = steps[index];
  const ended = endedId ? (state.emergencies ?? []).find((r) => r.id === endedId) : undefined;

  // Keep the latest state for callbacks fired by timers, speech and pointer events.
  const stateRef = useRef(state);
  stateRef.current = state;
  const startedRef = useRef(false);

  // Start a run on arrival if none is open, and record the first step in the same change.
  useEffect(() => {
    if (endedId || startedRef.current) return;
    startedRef.current = true;
    const s = stateRef.current;
    if (activeEmergency(s)) return;
    const now = Date.now();
    const started = startEmergency(s, { crewId, at: now });
    commit(reachStep(started.state, started.run.id, steps[0].id, now));
  }, [crewId, commit, endedId, steps]);

  // Record each step the first time it is reached.
  useEffect(() => {
    if (!run || endedId) return;
    if (run.steps.some((s) => s.id === step.id)) return;
    commit(reachStep(stateRef.current, run.id, step.id, Date.now()));
  }, [run, step.id, endedId, commit]);

  const next = useCallback(() => setIndex((i) => Math.min(steps.length - 1, i + 1)), [steps.length]);
  const back = useCallback(() => setIndex((i) => Math.max(0, i - 1)), []);

  // Read aloud: on by default where the browser can speak (it works offline).
  const synth = speechOut();
  const [readAloud, setReadAloud] = useState(true);
  useEffect(() => {
    if (!synth || endedId) return;
    try {
      synth.cancel();
      if (!readAloud) return;
      const g = gravityLine(step, setting.gravityBand);
      const u = new SpeechSynthesisUtterance(`${step.name}. ${g ? `${g} ` : ''}${step.say}`);
      u.lang = 'en-AU';
      synth.speak(u);
    } catch { /* Speech is a help, never a requirement. */ }
  }, [synth, readAloud, step, endedId, setting.gravityBand]);
  useEffect(() => () => { try { speechOut()?.cancel(); } catch { /* ignore */ } }, []);

  // Listen for "next" and "back": experimental, off by default, shown only where the browser has it.
  const Ctor = recogniserCtor();
  const [listening, setListening] = useState(false);
  const [heard, setHeard] = useState('');
  const handlers = useRef({ next, back });
  handlers.current = { next, back };
  useEffect(() => {
    if (!Ctor || !listening || endedId) return;
    let stopped = false;
    let rec: Recogniser;
    try {
      rec = new Ctor();
      rec.continuous = true; rec.interimResults = false; rec.lang = 'en-AU';
      rec.onresult = (e) => {
        for (let i = e.resultIndex; i < e.results.length; i++) {
          if (!e.results[i].isFinal) continue;
          const text = e.results[i][0].transcript.trim().toLowerCase();
          setHeard(text);
          // Ignore anything heard while the device itself is speaking, and act only on the single word.
          if (speechOut()?.speaking) continue;
          const word = text.replace(/[^a-z ]/g, '').trim();
          if (word === 'next') handlers.current.next();
          else if (word === 'back') handlers.current.back();
        }
      };
      rec.onend = () => { if (!stopped) { try { rec.start(); } catch { /* ignore */ } } };
      rec.onerror = () => { /* onend follows and restarts, or the toggle is switched off */ };
      rec.start();
    } catch { setListening(false); return; }
    return () => { stopped = true; try { rec.stop(); } catch { /* ignore */ } };
  }, [Ctor, listening, endedId]);

  // Pace marker at the CPR step, only where the protocol data carries a sourced pace.
  const pace = step.pace;
  const [still] = useState(reducedMotion);
  const [click, setClick] = useState(false);
  const [count, setCount] = useState(0);
  const audio = useRef<AudioContext | null>(null);
  useEffect(() => {
    if (!pace || endedId) return;
    const cycle = step.ratio?.compressions;
    setCount(0);
    const id = window.setInterval(() => {
      setCount((c) => (cycle ? (c % cycle) + 1 : c + 1));
      if (click && audio.current) {
        try {
          const ctx = audio.current;
          const osc = ctx.createOscillator(); const gain = ctx.createGain();
          osc.frequency.value = 880; gain.gain.setValueAtTime(0.05, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.05);
          osc.connect(gain).connect(ctx.destination); osc.start(); osc.stop(ctx.currentTime + 0.06);
        } catch { /* ignore */ }
      }
    }, 60000 / pace.perMinute);
    return () => window.clearInterval(id);
  }, [pace, click, endedId, step.ratio]);
  const toggleClick = () => {
    if (!click && !audio.current) {
      try {
        const A = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (A) audio.current = new A();
      } catch { /* no sound available */ }
    }
    try { void audio.current?.resume(); } catch { /* ignore */ }
    setClick((c) => !c);
  };
  useEffect(() => () => { try { void audio.current?.close(); } catch { /* ignore */ } }, []);

  // Press and hold for three seconds to end. A short press only explains.
  const [held, setHeld] = useState(0);
  const [holdHint, setHoldHint] = useState(false);
  const holdStart = useRef<number | null>(null);
  const frame = useRef<number | null>(null);
  const finish = useCallback(() => {
    const r = activeEmergency(stateRef.current);
    if (!r) return;
    commit(endEmergency(stateRef.current, r.id, Date.now()));
    setEndedId(r.id);
    setListening(false);
    setClick(false);
    try { speechOut()?.cancel(); } catch { /* ignore */ }
  }, [commit]);
  const tick = useCallback(() => {
    if (holdStart.current === null) return;
    const p = Math.min(1, (performance.now() - holdStart.current) / HOLD_MS);
    setHeld(p);
    if (p >= 1) { holdStart.current = null; finish(); return; }
    frame.current = requestAnimationFrame(tick);
  }, [finish]);
  const beginHold = () => {
    if (holdStart.current !== null) return;
    holdStart.current = performance.now();
    setHoldHint(false);
    frame.current = requestAnimationFrame(tick);
  };
  const cancelHold = () => {
    if (holdStart.current === null) return;
    holdStart.current = null;
    if (frame.current !== null) cancelAnimationFrame(frame.current);
    setHeld(0);
    setHoldHint(true);
  };
  useEffect(() => () => { if (frame.current !== null) cancelAnimationFrame(frame.current); }, []);
  const holdKeyDown = (e: ReactKeyboardEvent) => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); if (!e.repeat) beginHold(); } };
  const holdKeyUp = (e: ReactKeyboardEvent) => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); cancelHold(); } };

  const notice = (
    <div className="x-em-notice" role="note">
      <p><strong>This guides basic life support. It does not diagnose. {protocol.status}.</strong></p>
      <p>These steps were written for Earth. At 0 g the CPR step also asks you to strap the person down (set by the clinical lead). Nothing else has been adapted for low gravity or for a habitat.</p>
      <p className="source">Source: <a href={protocol.source.url} target="_blank" rel="noreferrer">{protocol.source.name}</a>, read {protocol.source.read}. Wording is ours, not the guideline's.</p>
    </div>
  );

  if (ended) {
    const sum = emergencySummary(ended, protocol);
    return (
      <section className="x-em" aria-labelledby="x-em-h">
        {notice}
        <div className="card">
          <h1 id="x-em-h" className="display">Emergency ended</h1>
          <p>Total time <span className="mono">{mmss(sum.durationMs)}</span>, from <span className="mono">{hhmm(sum.startedAt)}</span> to <span className="mono">{hhmm(sum.endedAt ?? sum.startedAt)}</span>.</p>
          <h2 className="title">Steps reached, for the handover</h2>
          <ol className="x-em-summary rows" aria-label="Steps reached">
            {sum.reached.map((r) => (
              <li key={r.id}>
                <span className="x-em-letter" aria-hidden="true">{r.letter}</span>
                <span className="row-name">{r.name}</span>
                <span className="mono">{hhmm(r.at)}</span>
                <span className="caption">(+<span className="mono">{mmss(r.at - sum.startedAt)}</span>)</span>
              </li>
            ))}
          </ol>
          {sum.notReached.length ? <p className="caption">Not reached: {sum.notReached.join(', ')}.</p> : null}
          <p>This summary stays on this device. It is not sent anywhere.</p>
          <div className="btn-row">
            <button type="button" className="btn" onClick={() => go('home')}>Back to today</button>
            <button type="button" className="btn secondary" onClick={() => go('outbox')}>Open outbox</button>
          </div>
        </div>
      </section>
    );
  }

  const last = index === steps.length - 1;
  const showUntil = protocol.continueUntil && (step.id === 'C' || last);
  return (
    <section className="x-em" aria-labelledby="x-em-h">
      {notice}
      <p className="x-em-other">Not a collapse? <button type="button" className="btn secondary" onClick={() => go('astra')}>Open the emergency checklists</button></p>
      <h1 id="x-em-h" className="title">Emergency: step {index + 1} of {steps.length}</h1>
      <ol className="x-em-rail" aria-label="Basic life support steps">
        {steps.map((s, i) => {
          const st = i < index ? 'done' : i === index ? 'current' : 'todo';
          return (
            <li key={s.id} data-state={st} aria-current={st === 'current' ? 'step' : undefined} aria-label={`${s.name}${st === 'done' ? ', done' : st === 'current' ? ', current step' : ''}`}>
              <span aria-hidden="true">{s.letter}</span>
              {st === 'done' ? <span className="x-em-tick" aria-hidden="true">✓</span> : null}
            </li>
          );
        })}
      </ol>

      <div className="x-em-step">
        <p className="x-em-stepname"><span aria-hidden="true">{step.letter} · </span>{step.name}</p>
        {gravityLine(step, setting.gravityBand) ? <p className="x-em-say">{gravityLine(step, setting.gravityBand)}</p> : null}
        <p className="x-em-say" aria-live="assertive">{step.say}</p>
        {step.detail ? <p className="x-em-detail">{step.detail}</p> : null}
        {step.ratio ? <p className="source"><span className="mono">{step.ratio.compressions}</span> compressions to <span className="mono">{step.ratio.breaths}</span> breaths: {step.ratio.source}.</p> : null}
        {pace ? (
          <div className="x-em-pace">
            {still
              ? <span className="x-em-count" aria-hidden="true">{count || '·'}</span>
              : <span className="x-em-dot" aria-hidden="true" style={{ animationDuration: `${60 / pace.perMinute}s` }} />}
            <div>
              <p><strong>Pace marker</strong>: beats <span className="mono">{pace.perMinute}</span> a minute{pace.range ? <> (guideline: about <span className="mono">{pace.range[0]}</span> to <span className="mono">{pace.range[1]}</span>)</> : null}{still && step.ratio ? `, counting to ${step.ratio.compressions}` : ''}.</p>
              <p className="source">{pace.source}</p>
            </div>
            <button type="button" className="chip chip-toggle" aria-pressed={click} onClick={toggleClick}>Soft click: {click ? 'on' : 'off'}</button>
          </div>
        ) : null}
        {showUntil ? <p className="x-em-until">{protocol.continueUntil!.say} <span className="source">({protocol.continueUntil!.source})</span></p> : null}
        <p className="placeholder">{protocol.status}</p>
      </div>

      <div className="x-em-nav">
        <button type="button" className="btn secondary x-em-back" onClick={back} disabled={index === 0}>Back</button>
        <button type="button" className="btn x-em-next" onClick={next} disabled={last} aria-describedby={last ? 'x-em-last' : undefined}>Next</button>
      </div>
      {last ? <p id="x-em-last" className="caption">This is the last step. When it is over, hold End emergency below.</p> : null}

      <div className="x-em-toggles">
        {synth ? <button type="button" className="chip chip-toggle" aria-pressed={readAloud} onClick={() => setReadAloud((v) => !v)}>Read aloud: {readAloud ? 'on' : 'off'}</button> : null}
        {Ctor ? (
          <>
            <button type="button" className="chip chip-toggle" aria-pressed={listening} aria-describedby="x-em-listen-note" onClick={() => { setListening((v) => !v); setHeard(''); }}>Listen for 'next'</button>
            <span id="x-em-listen-note" className="caption">Experimental. Needs a network in some browsers.</span>
            {listening ? <span className="x-em-heard" role="status">Heard: {heard || '…'}</span> : null}
          </>
        ) : null}
      </div>

      <button
        type="button"
        className="x-em-hold"
        aria-describedby="x-em-hold-hint"
        onPointerDown={(e) => { e.currentTarget.setPointerCapture?.(e.pointerId); beginHold(); }}
        onPointerUp={cancelHold}
        onPointerCancel={cancelHold}
        onPointerLeave={cancelHold}
        onKeyDown={holdKeyDown}
        onKeyUp={holdKeyUp}
        onContextMenu={(e) => e.preventDefault()}
      >
        <span className="x-em-fill" style={{ width: `${Math.round(held * 100)}%` }} aria-hidden="true" />
        <span className="x-em-holdlabel">End emergency</span>
      </button>
      <p id="x-em-hold-hint" className="caption" role="status">{holdHint ? 'Hold for 3 seconds to end.' : held > 0 ? 'Keep holding…' : 'Press and hold for 3 seconds to end.'}</p>
    </section>
  );
}
