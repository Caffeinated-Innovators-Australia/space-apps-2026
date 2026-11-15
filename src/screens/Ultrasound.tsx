// Guided ultrasound screen: four step cards, one at a time, that guide a crew member who is not an expert to place the probe.
// AI assistance: drafted with Claude Code (see AI_USE.md).
import { useState } from 'react';
import type { RuleFile, Seed, Setting, State } from '../core/index.ts';
import { toggleUltrasoundStep, ultrasoundAvailable, ultrasoundDone, ultrasoundProcedure, type UltrasoundStep, type UltrasoundView } from '../core/ultrasound.ts';
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
  /** Which guided view. Defaults to the kidneys. */
  view?: UltrasoundView;
}

/** A plain torso from the front, no face or detail, with the probe position for this step. */
function Torso({ side }: { side?: 'left' | 'right' | 'chest' }) {
  // Drawn from the front, so the person's left side is on the viewer's right.
  const mark = side === 'left' ? { x: 166, y: 158 } : side === 'right' ? { x: 74, y: 158 } : side === 'chest' ? { x: 134, y: 96 } : undefined;
  const label = side === 'chest' ? 'Body outline from the front. The probe goes just to the left of the breastbone, about the middle of the chest.' : side ? `Body outline from the front. The probe goes on the ${side} side, just below the ribs.` : 'Body outline from the front.';
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

/** Greys stand for an ultrasound image: bright is white, fluid is black. Fixed greys, so they read the same in both themes. */
const KIDNEY_GRADES = [
  { id: 'normal', name: 'Normal', say: 'Bright centre' },
  { id: 'mild', name: 'Mild', say: 'Small dark pool in the centre' },
  { id: 'moderate', name: 'Moderate', say: 'Dark spaces branch out' },
  { id: 'severe', name: 'Severe', say: 'Large dark space, thin outer rim' },
] as const;

/** One drawn kidney, long view, for a grade. Simple shapes drawn in code, not a real scan. */
function KidneyPanel({ grade }: { grade: (typeof KIDNEY_GRADES)[number]['id'] }) {
  const calyces = [[-26, -12], [-10, -17], [10, -17], [26, -12], [-26, 12], [-10, 17], [10, 17], [26, 12]];
  return (
    <svg viewBox="0 0 120 100" className="x-us-kidney" aria-hidden="true">
      <path d="M60 4 L114 30 A64 64 0 0 1 114 96 L6 96 A64 64 0 0 1 6 30 Z" fill="#1c1c1c" />
      <ellipse cx="60" cy="58" rx="44" ry="26" fill={grade === 'severe' ? '#1c1c1c' : '#6e6e6e'} stroke="#b8b8b8" strokeWidth={grade === 'severe' ? 2 : 3} />
      {grade === 'normal' || grade === 'mild' ? <ellipse cx="60" cy="58" rx="22" ry="10" fill="#e6e6e6" /> : null}
      {grade === 'mild' ? <ellipse cx="60" cy="58" rx="9" ry="5" fill="#000" /> : null}
      {grade === 'moderate' ? (
        <g>
          <ellipse cx="60" cy="58" rx="33" ry="18" fill="#e6e6e6" />
          <g fill="#000" stroke="#000">
            <ellipse cx="60" cy="58" rx="9" ry="5" />
            {calyces.map(([dx, dy]) => <g key={`${dx}${dy}`}><path d={`M60 58 L${60 + dx * 0.9} ${58 + dy * 0.75}`} strokeWidth="3" strokeLinecap="round" /><circle cx={60 + dx * 0.9} cy={58 + dy * 0.75} r="4.5" /></g>)}
          </g>
        </g>
      ) : null}
      {grade === 'severe' ? (
        <g fill="#000">
          <ellipse cx="60" cy="58" rx="22" ry="13" />
          {calyces.map(([dx, dy]) => <circle key={`${dx}${dy}`} cx={60 + dx * 1.15} cy={58 + dy * 0.9} r="9" />)}
        </g>
      ) : null}
    </svg>
  );
}

/** Drawn examples of a normal and a swollen kidney, to show what "look for" means. The app never reads the real image. */
function KidneyExamples() {
  return (
    <figure className="x-us-examples">
      <figcaption className="x-us-name">What a swollen kidney looks like (drawings, not real scans)</figcaption>
      <ul role="list" aria-label="Drawn kidney examples: normal, then mild, moderate and severe swelling">
        {KIDNEY_GRADES.map((g) => (
          <li key={g.id}>
            <KidneyPanel grade={g.id} />
            <span className="x-us-grade">{g.name}</span>
            <span className="x-us-grade-say">{g.say}</span>
          </li>
        ))}
      </ul>
      <p className="caption">White is bright, black is fluid. How swollen it is, is for your crew medic and Earth to judge.</p>
    </figure>
  );
}

export function Ultrasound({ state, commit, setting, crewId, go, hhmm, returnTo, view }: UltrasoundProps) {
  const proc = ultrasoundProcedure(view);
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
  const done = ultrasoundDone(state, crewId, view);
  const isDone = done.includes(step.id);
  const last = index === steps.length - 1;
  const saved = state.ultrasound?.[view === 'heart' ? `${crewId}:heart` : crewId]?.at;

  const toggle = () => commit(toggleUltrasoundStep(state, { crewId, stepId: step.id, at: Date.now(), view }));
  const doneNext = () => {
    if (!isDone) toggle();
    if (last) back();
    else setIndex(index + 1);
  };

  return (
    <section className="x-us" aria-labelledby="x-us-h">
      <div className="x-us-head">
        <h1 id="x-us-h" className="title">{proc.title} · step <span className="mono">{index + 1}</span> of <span className="mono">{steps.length}</span></h1>
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
        {step.example === 'kidney' ? <KidneyExamples /> : null}
        {step.side ? <div className="x-us-image" role="note">{proc.imageNote}</div> : null}
        <p><span className="placeholder">{proc.status}</span></p>
        <p className="source">Source: {proc.source}</p>
        {isDone ? (
          <button type="button" className="chip chip-toggle x-us-undo" aria-pressed={true} onClick={toggle}>Step done. Tap to mark it not done</button>
        ) : null}
      </div>

      <div className="x-us-nav">
        <button type="button" className="btn secondary" onClick={() => (index === 0 ? back() : setIndex(index - 1))}>Back</button>
        <button type="button" className="btn x-us-next" onClick={doneNext}>{last ? (view === 'heart' ? 'Save and go back' : 'Back to the case') : 'Done, next step'}</button>
      </div>
      <p className="caption" role="status">
        {saved !== undefined
          ? <>Saved to this person's case at <span className="mono">{hhmm(saved)}</span>: <span className="mono">{done.length}</span> of <span className="mono">{steps.length}</span> steps done. No image is kept.</>
          : 'Nothing saved yet. Only which steps were done is saved, never an image.'}
      </p>
    </section>
  );
}
