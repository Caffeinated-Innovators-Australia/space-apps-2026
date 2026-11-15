// Emergency runs: pure functions that record which basic life support steps were reached, and when, for the handover.
// AI assistance: drafted with Claude Code (see AI_USE.md).
import type { EmergencyRun, State } from './types.ts';

/** The shape of the protocol data in src/data/emergency.json, as far as these functions need it. */
export interface EmergencyStep {
  id: string;
  letter: string;
  name: string;
  say: string;
  detail?: string;
  ratio?: { compressions: number; breaths: number; source: string };
  pace?: { perMinute: number; range?: number[]; source: string };
  /** A yes/no question on the step (CR-32): "No" on Danger shows how to make it safe; "Yes" on Response offers more help. */
  question?: EmergencyQuestion;
  /** A line shown and read before the step in one gravity band, for example strapping the person down at 0 g (CR-32). */
  gravity?: Partial<Record<'zero' | 'lunar' | 'martian' | 'earth', string>>;
}

type Band = 'zero' | 'lunar' | 'martian' | 'earth';
/** A line that can be limited to some gravity bands, or to places with or without a habitat. */
export interface EmergencyLine { text: string; gravity?: Band[]; habitat?: boolean }
export interface EmergencyQuestion {
  ask: string;
  yes: string;
  no: string;
  /** What each answer records for the handover. */
  record: { yes: string; no: string };
  /** Shown after "No": lines and a button to carry on. */
  onNo?: { title: string; lines: EmergencyLine[]; done: string; record: string };
  /** Shown after "Yes": the choices offered. */
  onYes?: {
    title: string;
    checklists: string;
    /** A priority call, like an aviation Pan-Pan: urgent help, not yet a life threat. The Earth place has its own wording. */
    priority: { say: string; earth?: string; note: string; sent: string; record: string };
    carryOn: string;
  };
}

/** The lines that apply at this place. */
export function linesFor(lines: EmergencyLine[], band?: Band, habitat?: boolean): string[] {
  return lines.filter((l) => (!l.gravity || (band !== undefined && l.gravity.includes(band))) && (l.habitat === undefined || l.habitat === (habitat !== false))).map((l) => l.text);
}

/** Records an answer or action on the way, such as "Area safe: yes". Each one is kept with its time. */
export function answerStep(state: State, runId: string, id: string, text: string, at: number): State {
  const run = findRun(state, runId);
  if (run.endedAt !== undefined) throw new Error('This emergency run has already ended.');
  return replace(state, { ...run, answers: [...(run.answers ?? []), { id, text, at }] });
}

/** The gravity line for a step in this band, if the protocol has one. */
export function gravityLine(step: EmergencyStep, band?: 'zero' | 'lunar' | 'martian' | 'earth'): string | undefined {
  return band ? step.gravity?.[band] : undefined;
}
export interface EmergencyProtocol {
  id: string;
  title: string;
  source: { name: string; url: string; read: string };
  status: string;
  continueUntil?: { say: string; source: string };
  steps: EmergencyStep[];
}

export interface EmergencySummary {
  runId: string;
  crewId: string;
  startedAt: number;
  endedAt?: number;
  /** Milliseconds from start to end, or to the last step reached while the run is still open. */
  durationMs: number;
  /** Each step reached, in protocol order, with the first time it was reached. */
  reached: { id: string; letter: string; name: string; at: number }[];
  /** Steps of the protocol that were never reached. */
  notReached: string[];
  /** Answers and actions on the way, in time order. */
  answers: { id: string; text: string; at: number }[];
}

function runs(state: State): EmergencyRun[] {
  return state.emergencies ?? [];
}

function findRun(state: State, runId: string): EmergencyRun {
  const run = runs(state).find((r) => r.id === runId);
  if (!run) throw new Error(`There is no emergency run with the id "${runId}".`);
  return run;
}

function replace(state: State, run: EmergencyRun): State {
  return { ...state, emergencies: runs(state).map((r) => (r.id === run.id ? run : r)) };
}

/** The run still open, if any (the most recent one without an end time). */
export function activeEmergency(state: State): EmergencyRun | undefined {
  return [...runs(state)].reverse().find((r) => r.endedAt === undefined);
}

/** Starts a run. If one is already open, it is returned unchanged, so a second tap never opens two. */
export function startEmergency(state: State, args: { crewId: string; at: number }): { state: State; run: EmergencyRun } {
  const open = activeEmergency(state);
  if (open) return { state, run: open };
  const existing = runs(state);
  const run: EmergencyRun = { id: `em-${args.at}-${existing.length + 1}`, crewId: args.crewId, startedAt: args.at, steps: [] };
  return { state: { ...state, emergencies: [...existing, run] }, run };
}

/** Records the first time a step is reached. Going back and returning to a step keeps its first time. */
export function reachStep(state: State, runId: string, stepId: string, at: number): State {
  const run = findRun(state, runId);
  if (run.endedAt !== undefined) throw new Error('This emergency run has already ended.');
  if (run.steps.some((s) => s.id === stepId)) return state;
  return replace(state, { ...run, steps: [...run.steps, { id: stepId, at }] });
}

/** Ends a run. Ending it again keeps the first end time. */
export function endEmergency(state: State, runId: string, at: number): State {
  const run = findRun(state, runId);
  if (run.endedAt !== undefined) return state;
  if (at < run.startedAt) throw new Error('An emergency cannot end before it started.');
  return replace(state, { ...run, endedAt: at });
}

/** What happened, for the handover: each step reached with its time, and the total time. */
export function emergencySummary(run: EmergencyRun, protocol: EmergencyProtocol): EmergencySummary {
  const firstAt = new Map<string, number>();
  for (const s of run.steps) if (!firstAt.has(s.id)) firstAt.set(s.id, s.at);
  const reached = protocol.steps
    .filter((p) => firstAt.has(p.id))
    .map((p) => ({ id: p.id, letter: p.letter, name: p.name, at: firstAt.get(p.id)! }));
  const last = run.endedAt ?? Math.max(run.startedAt, ...run.steps.map((s) => s.at));
  return {
    runId: run.id,
    crewId: run.crewId,
    startedAt: run.startedAt,
    endedAt: run.endedAt,
    durationMs: last - run.startedAt,
    reached,
    notReached: protocol.steps.filter((p) => !firstAt.has(p.id)).map((p) => p.name),
    answers: [...(run.answers ?? [])].sort((a, b) => a.at - b.at),
  };
}
