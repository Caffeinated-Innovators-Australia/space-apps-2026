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

/** The grades shown as drawn examples (CR-42): normal, then grades 1 to 4. Labels in plain words, the term in brackets. */
const KIDNEY_GRADES = [
  { id: 'normal', name: 'Normal', band: '', say: 'Bright centre' },
  { id: 'g1', name: 'Grade 1', band: 'Mild', say: 'Centre (pelvis) widened' },
  { id: 'g2', name: 'Grade 2', band: 'Moderate', say: 'Large branches (major calyces) widened' },
  { id: 'g3', name: 'Grade 3', band: 'Moderate', say: 'Small branches (minor calyces) widened too' },
  { id: 'g4', name: 'Grade 4', band: 'Severe', say: 'Outer layer (cortex) thinned' },
] as const;
type KidneyGrade = (typeof KIDNEY_GRADES)[number]['id'];

const BEAN = 'M22 58 C22 34 44 28 60 30 C76 28 98 34 98 58 C98 76 86 84 74 80 C68 78 64 72 60 72 C56 72 52 78 46 80 C34 84 22 76 22 58 Z';

/**
 * One drawn kidney in the long view, inside an ultrasound fan, for a grade. Simple shapes drawn in code, not a real scan.
 * Fixed greys so it reads the same in both themes: bright tissue is white, fluid is black.
 */
function KidneyPanel({ grade }: { grade: KidneyGrade }) {
  const major = [[38, 52], [48, 44], [60, 41], [72, 44], [82, 52]];
  const minor = [[34, 56], [40, 47], [49, 41], [60, 38], [71, 41], [80, 47], [86, 56], [44, 56], [76, 56]];
  const severe = [[38, 57, 13], [52, 47, 12], [68, 47, 12], [82, 57, 13], [60, 60, 12]];
  const stem = <path d="M60 58 L60 72" stroke="#000" strokeWidth="6" />;
  return (
    <svg viewBox="0 0 120 100" className="x-us-kidney" aria-hidden="true">
      <path d="M44 4 L76 4 L116 32 Q120 70 114 96 L6 96 Q0 70 4 32 Z" fill="#d6d6d6" />
      <path d={BEAN} fill="#6e6e6e" stroke="#2a2a2a" strokeWidth="2" />
      {grade === 'normal' ? <ellipse cx="60" cy="56" rx="22" ry="9" fill="#f2f2f2" /> : null}
      {grade === 'g1' ? <g fill="#000"><ellipse cx="60" cy="56" rx="22" ry="9" fill="#f2f2f2" /><ellipse cx="60" cy="59" rx="13" ry="5" />{stem}</g> : null}
      {grade === 'g2' ? (
        <g fill="#000" stroke="#000">
          <ellipse cx="60" cy="58" rx="20" ry="7" />
          {major.map(([x, y]) => <g key={`${x}${y}`}><path d={`M60 58 L${x} ${y}`} strokeWidth="5" /><circle cx={x} cy={y} r="5.5" /></g>)}
          {stem}
        </g>
      ) : null}
      {grade === 'g3' ? (
        <g fill="#000" stroke="#000">
          <ellipse cx="60" cy="56" rx="24" ry="10" />
          {minor.map(([x, y]) => <circle key={`${x}${y}`} cx={x} cy={y} r="6" />)}
          {stem}
        </g>
      ) : null}
      {grade === 'g4' ? (
        <g fill="#000">
          {severe.map(([x, y, r]) => <circle key={`${x}${y}`} cx={x} cy={y} r={r} />)}
          <path d={BEAN} fill="none" stroke="#6e6e6e" strokeWidth="3" />
        </g>
      ) : null}
    </svg>
  );
}

/** Drawn examples of a normal and a swollen kidney, to show what "look for" means. The app never reads the real image. */
function KidneyExamples() {
  return (
    <figure className="x-us-examples">
      <figcaption className="x-us-name">What a swollen kidney looks like: long view (drawings, not real scans)</figcaption>
      <ul role="list" aria-label="Drawn kidney examples in the long view: normal, then grades 1 to 4">
        {KIDNEY_GRADES.map((g) => (
          <li key={g.id}>
            <KidneyPanel grade={g.id} />
            <span className="x-us-grade">{g.name}{g.band ? ` · ${g.band}` : ''}</span>
            <span className="x-us-grade-say">{g.say}</span>
          </li>
        ))}
      </ul>
      <p className="caption">White is bright, black is fluid. Which grade it is, is for your crew medic and Earth to judge.</p>
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
        <p><span className={proc.status.startsWith('Placeholder') ? 'placeholder' : 'source'}>{proc.status}</span></p>
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
