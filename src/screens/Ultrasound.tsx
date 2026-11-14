// Guided ultrasound screen: four step cards, one at a time, that guide a crew member who is not an expert to place the probe.
// AI assistance: drafted with Claude Code (see AI_USE.md).
import { useState } from 'react';
import type { RuleFile, Seed, Setting, State } from '../core/index.ts';
import { toggleUltrasoundStep, ultrasoundAvailable, ultrasoundDone, ultrasoundProcedure, type UltrasoundStep } from '../core/ultrasound.ts';
import { SyntheticTag } from '../components/ui';
import './x-us.css';

export interface UltrasoundProps {
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
  /** Where "Back to the case" goes. Defaults to the home screen. */
  returnTo?: { route: string; arg?: string };
}

/** A plain torso from the front, no face or detail, with the probe position for this step. */
function Torso({ side }: { side?: 'left' | 'right' }) {
  // Drawn from the front, so the person's left side is on the viewer's right.
  const mark = side === 'left' ? { x: 166, y: 158 } : side === 'right' ? { x: 74, y: 158 } : undefined;
  const label = side ? `Body outline from the front. The probe goes on the ${side} side, just below the ribs.` : 'Body outline from the front.';
  return (
    <svg className="x-us-figure" viewBox="0 0 240 270" role="img" aria-label={label}>
      <path className="x-us-body" d="M104 14 h32 v18 l44 12 q14 4 16 20 l4 70 q0 10 -10 10 l-10 -2 l-4 50 q-2 30 8 64 h-128 q10 -34 8 -64 l-4 -50 l-10 2 q-10 0 -10 -10 l4 -70 q2 -16 16 -20 l44 -12 z" />
      <path className="x-us-ribs" d="M70 142 Q96 128 120 100 Q144 128 170 142" />
      <text className="x-us-side" x="26" y="250" textAnchor="middle">Right</text>
      <text className="x-us-side" x="214" y="250" textAnchor="middle">Left</text>
      {mark ? (
        <g className="x-us-mark">
          <rect x={mark.x - 9} y={mark.y - 15} width="18" height="30" rx="6" />
          <path d={`M${mark.x} ${mark.y - 15} v-12`} />
        </g>
      ) : null}
    </svg>
  );
}

export function Ultrasound({ state, commit, setting, crewId, go, hhmm, returnTo }: UltrasoundProps) {
  const proc = ultrasoundProcedure();
  const steps = proc.steps;
  const [index, setIndex] = useState(0);
  const back = () => go(returnTo?.route ?? 'home', returnTo?.arg);

  if (!ultrasoundAvailable(setting)) {
    return (
      <section className="x-us" aria-labelledby="x-us-h">
        <div className="card">
          <h1 id="x-us-h" className="title">Guided ultrasound</h1>
          <p>Ultrasound is not available at this place. Your case still goes to the people who can help, as usual.</p>
          <div className="btn-row"><button type="button" className="btn secondary" onClick={back}>Back</button></div>
        </div>
      </section>
    );
  }

  const step: UltrasoundStep = steps[index];
  const done = ultrasoundDone(state, crewId);
  const isDone = done.includes(step.id);
  const last = index === steps.length - 1;
  const saved = state.ultrasound?.[crewId]?.at;

  const toggle = () => commit(toggleUltrasoundStep(state, { crewId, stepId: step.id, at: Date.now() }));
  const doneNext = () => {
    if (!isDone) toggle();
    if (last) back();
    else setIndex(index + 1);
  };

  return (
    <section className="x-us" aria-labelledby="x-us-h">
      <div className="x-us-head">
        <h1 id="x-us-h" className="title">Guided ultrasound · step <span className="mono">{index + 1}</span> of <span className="mono">{steps.length}</span></h1>
        <SyntheticTag />
      </div>

      <ol className="x-us-rail" aria-label="Guided ultrasound steps">
        {steps.map((s, i) => {
          const d = done.includes(s.id);
          const cur = i === index;
          return (
            <li key={s.id} data-done={d} data-current={cur} aria-current={cur ? 'step' : undefined} aria-label={`Step ${i + 1}, ${s.title}${d ? ', done' : ''}${cur ? ', current step' : ''}`}>
              <span className="mono" aria-hidden="true">{i + 1}</span>
              {d ? <span className="x-us-tick" aria-hidden="true">✓</span> : null}
            </li>
          );
        })}
      </ol>

      <div className="x-us-step">
        <p className="x-us-name">{step.title}</p>
        <p className="x-us-say" aria-live="polite">{step.instruction}</p>
        {step.side ? <Torso side={step.side} /> : null}
        {step.side ? <p className="caption">Drawn from the front: the person's left side is on your right.</p> : null}
        {step.lookFor ? <p className="x-us-look">{step.lookFor}</p> : null}
        {step.note ? <p className="x-us-note">{step.note}</p> : null}
        {step.side ? <div className="x-us-image" role="note">{proc.imageNote}</div> : null}
        <p><span className="placeholder">{proc.status}</span></p>
        <p className="source">Source: {proc.source}</p>
        {isDone ? (
          <button type="button" className="chip chip-toggle x-us-undo" aria-pressed={true} onClick={toggle}>Step done. Tap to mark it not done</button>
        ) : null}
      </div>

      <div className="x-us-nav">
        <button type="button" className="btn secondary" onClick={() => (index === 0 ? back() : setIndex(index - 1))}>Back</button>
        <button type="button" className="btn x-us-next" onClick={doneNext}>{last ? 'Back to the case' : 'Done, next step'}</button>
      </div>
      <p className="caption" role="status">
        {saved !== undefined
          ? <>Saved to this person's case at <span className="mono">{hhmm(saved)}</span>: <span className="mono">{done.length}</span> of <span className="mono">{steps.length}</span> steps done. No image is kept.</>
          : 'Nothing saved yet. Only which steps were done is saved, never an image.'}
      </p>
    </section>
  );
}
