// Talk: the app asks each question aloud, hears or reads the answer, fills the form, and reads it back.
// AI assistance: drafted with Claude Code (see AI_USE.md).
// The AI here listens and speaks. It never sets a tier: every value it takes down goes through the same checks and rules as a typed one.
import { useEffect, useRef, useState } from 'react';
import { spokenIntent } from '../core/speech.ts';
import { canListen, canSpeak, listenOnce, speak, stopSpeaking } from './voice.ts';
import './voice.css';

export interface VoiceQuestion { id: string; ask: string }
export type VoiceValues = Record<string, number | string>;

export interface VoiceTalkProps {
  /** What this conversation fills, for the heading: "vital signs", "daily check-in". */
  what: string;
  questions: VoiceQuestion[];
  /** Turn what was said into values, keyed by question. A string is a problem to say back. Undefined means nothing was understood. */
  understand: (text: string, currentId: string) => VoiceValues | string | undefined;
  readBack: (id: string, value: number | string) => string;
  /** Put the values into the form. */
  onFill: (values: VoiceValues) => void;
  /** Save the form. Returns what to say afterwards. */
  onFinish: () => string;
  /** One sentence showing how to say several answers at once, if the form takes that. */
  example?: string;
}

interface Line { who: 'app' | 'you'; text: string }
type Phase = 'off' | 'asking' | 'confirm';

export function VoiceTalk(props: VoiceTalkProps) {
  const p = useRef(props);
  p.current = props;
  const [lines, setLines] = useState<Line[]>([]);
  const [phase, setPhaseState] = useState<Phase>('off');
  const [status, setStatus] = useState<'idle' | 'speaking' | 'listening'>('idle');
  const [aloud, setAloud] = useState(true);
  const [typed, setTyped] = useState('');
  const phaseRef = useRef<Phase>('off');
  const idx = useRef(0);
  const answers = useRef<VoiceValues>({});
  const skipped = useRef<Set<string>>(new Set());
  const mic = useRef(false);
  const aloudRef = useRef(true);
  aloudRef.current = aloud;
  const listening = useRef<{ stop: () => void } | null>(null);
  const turnId = useRef(0);
  const setPhase = (ph: Phase) => { phaseRef.current = ph; setPhaseState(ph); };

  // Leaving the screen stops the listening. A sentence already being said is allowed to finish.
  useEffect(() => () => { turnId.current += 1; listening.current?.stop(); }, []);

  const add = (who: Line['who'], text: string) => setLines((l) => [...l, { who, text }].slice(-8));

  /** Say one thing, then listen for the answer if the microphone is on. */
  const say = async (text: string) => {
    const mine = ++turnId.current;
    listening.current?.stop();
    add('app', text);
    if (aloudRef.current && canSpeak()) { setStatus('speaking'); await speak(text); }
    if (mine !== turnId.current) return;
    if (!mic.current || phaseRef.current === 'off') { setStatus('idle'); return; }
    setStatus('listening');
    const l = listenOnce();
    listening.current = l;
    const heard = await l.heard;
    if (mine !== turnId.current) return;
    listening.current = null;
    setStatus('idle');
    if (heard) hear(heard);
    else { mic.current = false; add('app', 'I did not hear an answer. Tap Listen to carry on, or type it.'); }
  };

  const current = () => p.current.questions[idx.current];
  const nextOpen = (from: number) => p.current.questions.findIndex((q, i) => i >= from && answers.current[q.id] === undefined && !skipped.current.has(q.id));
  const summary = () => p.current.questions.filter((q) => answers.current[q.id] !== undefined).map((q) => p.current.readBack(q.id, answers.current[q.id])).join(' ');

  const advance = (lead: string) => {
    const n = nextOpen(idx.current + 1);
    if (n === -1) {
      if (Object.keys(answers.current).length === 0) { setPhase('off'); mic.current = false; void say(`${lead} Nothing to save.`.trim()); return; }
      setPhase('confirm');
      void say(`${lead} I have: ${summary()} Say save to keep it, or say start again.`.trim());
      return;
    }
    idx.current = n;
    void say(`${lead} ${current().ask}`.trim());
  };

  const begin = (withMic: boolean) => {
    mic.current = withMic && canListen();
    answers.current = {};
    skipped.current = new Set();
    idx.current = 0;
    setPhase('asking');
    setLines([]);
    void say(current().ask);
  };

  const stop = (line?: string) => {
    turnId.current += 1;
    listening.current?.stop();
    stopSpeaking();
    mic.current = false;
    setPhase('off');
    setStatus('idle');
    if (line) add('app', line);
  };

  function hear(text: string) {
    add('you', text);
    if (phaseRef.current === 'off') return;
    const intent = spokenIntent(text);
    if (intent === 'stop') { stop('Stopped. Nothing was saved by voice.'); return; }
    if (phaseRef.current === 'confirm') {
      if (intent === 'yes') {
        const after = p.current.onFinish();
        mic.current = false;
        setPhase('off');
        void say(after);
      } else if (intent === 'no') { answers.current = {}; skipped.current = new Set(); idx.current = 0; setPhase('asking'); void say(`Starting again. ${current().ask}`); }
      else void say('Say save to keep it, or say start again.');
      return;
    }
    if (intent === 'repeat') { void say(current().ask); return; }
    if (intent === 'back') { idx.current = Math.max(0, idx.current - 1); delete answers.current[current().id]; skipped.current.delete(current().id); void say(current().ask); return; }
    if (intent === 'skip') { skipped.current.add(current().id); advance('Left out.'); return; }
    const got = p.current.understand(text, current().id);
    if (typeof got === 'string') { void say(`${got} ${current().ask}`); return; }
    if (!got || Object.keys(got).length === 0) { void say(`I did not catch that. ${current().ask}`); return; }
    Object.assign(answers.current, got);
    p.current.onFill(got);
    const back = p.current.questions.filter((q) => got[q.id] !== undefined).map((q) => p.current.readBack(q.id, got[q.id])).join(' ');
    idx.current = -1;
    advance(back);
  }

  const send = () => { const t = typed.trim(); if (!t) return; setTyped(''); if (phaseRef.current === 'off') return; turnId.current += 1; listening.current?.stop(); stopSpeaking(); setStatus('idle'); hear(t); };
  const listenAgain = () => { mic.current = true; void say(phaseRef.current === 'confirm' ? 'Say save to keep it, or say start again.' : current().ask); };

  return (
    <section className="card x-vo" aria-labelledby="x-vo-h">
      <div className="card-head">
        <h2 className="title" id="x-vo-h">Talk</h2>
        <span className="x-vo-tag">AI voice</span>
      </div>
      {phase === 'off' ? (
        <>
          <p className="caption">The app asks for the {p.current.what} aloud, takes down what you say, and reads each value back. Touch still works at any time.</p>
          <div className="btn-row">
            {canListen() ? <button type="button" className="btn x-vo-big" onClick={() => begin(true)}>Start talking</button> : null}
            <button type="button" className={`btn x-vo-big${canListen() ? ' secondary' : ''}`} onClick={() => begin(false)}>{canListen() ? 'Answer by typing' : 'Start, and answer by typing'}</button>
          </div>
          {!canListen() ? <p className="caption">This browser has no speech recognition, so answers are typed. The app still speaks.</p> : null}
        </>
      ) : (
        <div className="btn-row">
          <span className="x-vo-status" role="status">{status === 'listening' ? 'Listening' : status === 'speaking' ? 'Speaking' : 'Waiting for your answer'}</span>
          {canListen() && status === 'idle' ? <button type="button" className="btn secondary" onClick={listenAgain}>Listen</button> : null}
          <button type="button" className="btn secondary" onClick={() => stop('Stopped. Nothing was saved by voice.')}>Stop</button>
        </div>
      )}
      {lines.length ? (
        <ol className="x-vo-log" aria-live="polite" aria-label="What was said">
          {lines.map((l, i) => <li key={i} className={`x-vo-${l.who}`}><span className="x-vo-who">{l.who === 'app' ? 'App' : 'You'}</span> {l.text}</li>)}
        </ol>
      ) : null}
      {phase !== 'off' ? (
        <form className="x-vo-type" onSubmit={(e) => { e.preventDefault(); send(); }}>
          <label htmlFor="x-vo-typed" className="caption">Or type what you would say</label>
          <div className="x-vo-typerow">
            <input id="x-vo-typed" autoComplete="off" value={typed} onChange={(e) => setTyped(e.target.value)} />
            <button type="submit" className="btn secondary">Send</button>
          </div>
          {p.current.example ? <p className="caption">Say one answer, or several at once: "{p.current.example}". Also: skip, back, repeat, stop.</p> : <p className="caption">Also: skip, back, repeat, stop.</p>}
        </form>
      ) : null}
      <label className="x-vo-aloud"><input type="checkbox" checked={aloud} onChange={(e) => { setAloud(e.target.checked); if (!e.target.checked) stopSpeaking(); }} /> Speak aloud</label>
      <details className="more">
        <summary>What the AI does here</summary>
        <div className="more-body">
          <p>Speech recognition and the voice are AI models in your browser. They listen and speak. They never set a tier, name a condition or change a rule. Every value is read back, checked like a typed value, and judged by the same signed rules.</p>
          <p>In some browsers speech recognition sends the audio to the browser maker and needs the internet. It is off until you tap Start talking. A flight version would run it on the device.</p>
        </div>
      </details>
    </section>
  );
}
