// Guided ultrasound: pure functions that record which guided steps were done, for the case. No image is ever kept.
// AI assistance: drafted with Claude Code (see AI_USE.md).
import data from '../data/ultrasound.json' with { type: 'json' };
import type { Setting, State } from './types.ts';

export interface UltrasoundStep {
  id: string;
  title: string;
  instruction: string;
  lookFor?: string;
  note?: string;
  side?: 'left' | 'right';
}
export interface UltrasoundProcedure {
  id: string;
  title: string;
  status: string;
  source: string;
  imageNote: string;
  steps: UltrasoundStep[];
}

const procedure = data as UltrasoundProcedure;

/** The whole procedure: title, status, source and the steps in order. */
export function ultrasoundProcedure(): UltrasoundProcedure {
  return procedure;
}

/** The steps, in order. */
export function ultrasoundSteps(): UltrasoundStep[] {
  return procedure.steps;
}

/** Ticks a step as done, or unticks it if it was done. Throws on a step that is not in the procedure. */
export function toggleUltrasoundStep(state: State, args: { crewId: string; stepId: string; at: number }): State {
  if (!procedure.steps.some((s) => s.id === args.stepId)) throw new Error(`There is no guided ultrasound step with the id "${args.stepId}".`);
  const all = state.ultrasound ?? {};
  const done = all[args.crewId]?.stepsDone ?? [];
  const next = done.includes(args.stepId) ? done.filter((d) => d !== args.stepId) : [...done, args.stepId];
  // Keep the steps in procedure order, so the case reads in the order they are done.
  const ordered = procedure.steps.map((s) => s.id).filter((id) => next.includes(id));
  return { ...state, ultrasound: { ...all, [args.crewId]: { stepsDone: ordered, at: args.at } } };
}

/** The ids of the steps this person has done, in procedure order. */
export function ultrasoundDone(state: State, crewId: string): string[] {
  return state.ultrasound?.[crewId]?.stepsDone ?? [];
}

/** One line for the handover, or undefined if the guided ultrasound was never started for this person. */
export function ultrasoundSummary(state: State, crewId: string): string | undefined {
  if (!state.ultrasound?.[crewId]) return undefined;
  const n = ultrasoundDone(state, crewId).length;
  return `Guided ultrasound: ${n} of ${procedure.steps.length} steps completed. No image kept in this demo.`;
}

/** False on the Earth twin, where there is no ultrasound. */
export function ultrasoundAvailable(setting: Pick<Setting, 'profile'>): boolean {
  return setting.profile !== 'earth';
}
