// The action layer: every change to the record goes through these functions.
// They are pure (state in, new state out), so the screens, the command-line tool and
// any agent get identical answers. Rules decide; nothing here calls a language model.
// AI assistance: drafted with Claude Code (see AI_USE.md).
import { assess, type Assessment, type Rule } from './rules.ts';
import type { CasePack, CrewProfile, Indicator, Point, Reading, Seed, Setting, State, Symptom } from './types.ts';

export function initialState(seed: Seed): State {
  return {
    version: 1,
    readings: [],
    symptoms: [],
    outbox: [],
    ui: { crewId: seed.crew[0].id, settingId: seed.settings[0].id, theme: 'cabin', doseLogged: false },
  };
}

export function crewById(seed: Seed, id: string): CrewProfile {
  const c = seed.crew.find((x) => x.id === id);
  if (!c) throw new Error(`Unknown crew member "${id}". Known: ${seed.crew.map((x) => x.id).join(', ')}.`);
  return c;
}
export function indicatorById(seed: Seed, id: string): Indicator {
  const i = seed.indicators.find((x) => x.id === id);
  if (!i) throw new Error(`Unknown indicator "${id}". Known: ${seed.indicators.map((x) => x.id).join(', ')}.`);
  return i;
}
export function settingById(seed: Seed, id: string): Setting {
  return seed.settings.find((x) => x.id === id) ?? seed.settings[0];
}

/** Assess one value for one crew member against their own baseline. Changes nothing. */
export function assessValue(seed: Seed, rule: Rule, crewId: string, indicatorId: string, value: number): Assessment {
  const crew = crewById(seed, crewId);
  const ind = indicatorById(seed, indicatorId);
  const baseline = (crew.baseline[ind.id] ?? []).map((p) => p.value);
  if (baseline.length === 0) throw new Error(`${crew.name} has no baseline for ${ind.name}.`);
  if (!Number.isFinite(value) || value <= 0) throw new Error('The reading must be a number above zero.');
  const ref = ind.ref[crew.sex];
  return assess(rule, { region: ind.region, indicator: ind.name, unit: ind.unit, value, baseline, withinPersonSd: ind.withinPersonSd, refMin: ref.min, refMax: ref.max }, ind.dp);
}

/** Save a reading and return it with its assessment. */
export function recordReading(state: State, seed: Seed, rule: Rule, args: { crewId: string; indicatorId: string; value: number; at: number }): { state: State; reading: Reading; assessment: Assessment } {
  const assessment = assessValue(seed, rule, args.crewId, args.indicatorId, args.value);
  const reading: Reading = { id: `r-${args.at}-${state.readings.length + 1}`, crewId: args.crewId, indicatorId: args.indicatorId, value: args.value, at: args.at, tier: assessment.tier, ruleId: assessment.ruleId, stepsDone: [] };
  return { state: { ...state, readings: [...state.readings, reading] }, reading, assessment };
}

export function latestReading(state: State, crewId: string, indicatorId: string): Reading | undefined {
  return [...state.readings].reverse().find((r) => r.crewId === crewId && r.indicatorId === indicatorId);
}

/** Baseline, earlier mission values and readings saved on this device, oldest first. */
export function history(state: State, seed: Seed, crewId: string, indicatorId: string): { baseline: Point[]; mission: Point[]; recorded: Reading[] } {
  const crew = crewById(seed, crewId);
  return {
    baseline: crew.baseline[indicatorId] ?? [],
    mission: crew.mission[indicatorId] ?? [],
    recorded: state.readings.filter((r) => r.crewId === crewId && r.indicatorId === indicatorId),
  };
}

/**
 * Has a raised result been backed by a second reading? A single out-of-range reading can be a
 * measurement slip, so the record says whether the reading before it was also outside the band.
 */
export function confirmation(state: State, reading: Reading): { status: 'not-needed' | 'unconfirmed' | 'confirmed'; previousAt?: number } {
  if (reading.tier === 'green') return { status: 'not-needed' };
  const earlier = state.readings.filter((r) => r.crewId === reading.crewId && r.indicatorId === reading.indicatorId && r.at < reading.at);
  const prev = earlier[earlier.length - 1];
  return prev && prev.tier !== 'green' ? { status: 'confirmed', previousAt: prev.at } : { status: 'unconfirmed' };
}

export function toggleStep(state: State, readingId: string, step: string): State {
  return { ...state, readings: state.readings.map((r) => (r.id !== readingId ? r : { ...r, stepsDone: r.stepsDone.includes(step) ? r.stepsDone.filter((s) => s !== step) : [...r.stepsDone, step] })) };
}

export function toggleSymptom(state: State, crewId: string, label: string, at: number): State {
  const has = state.symptoms.some((s) => s.crewId === crewId && s.label === label);
  const symptoms: Symptom[] = has ? state.symptoms.filter((s) => !(s.crewId === crewId && s.label === label)) : [...state.symptoms, { crewId, label, at }];
  return { ...state, symptoms };
}

/** Queue a case for the next link. One case per reading; sending again returns the same case. */
export function sendCase(state: State, args: { readingId: string; settingId: string; at: number }): { state: State; pack: CasePack } {
  const reading = state.readings.find((r) => r.id === args.readingId);
  if (!reading) throw new Error(`Unknown reading "${args.readingId}".`);
  const existing = state.outbox.find((p) => p.readingId === args.readingId);
  if (existing) return { state, pack: existing };
  const pack: CasePack = { id: `case-${args.at}`, crewId: reading.crewId, readingId: reading.id, createdAt: args.at, settingId: args.settingId, status: 'queued' };
  return { state: { ...state, outbox: [...state.outbox, pack] }, pack };
}

/** The full, self-contained content of one case, ready to read or to send. */
export function casePackContent(state: State, seed: Seed, rule: Rule, packId: string) {
  const pack = state.outbox.find((p) => p.id === packId);
  if (!pack) throw new Error(`Unknown case "${packId}".`);
  const reading = state.readings.find((r) => r.id === pack.readingId)!;
  const crew = crewById(seed, pack.crewId);
  const ind = indicatorById(seed, reading.indicatorId);
  const a = assessValue(seed, rule, reading.crewId, reading.indicatorId, reading.value);
  const h = history(state, seed, reading.crewId, reading.indicatorId);
  return {
    caseId: pack.id,
    status: pack.status,
    createdAt: new Date(pack.createdAt).toISOString(),
    setting: settingById(seed, pack.settingId).label,
    crew: crew.name,
    synthetic: seed.synthetic,
    reading: { indicator: ind.name, value: reading.value, unit: ind.unit, takenAt: new Date(reading.at).toISOString(), changeFromBaseline: a.deltaText },
    trend: { baseline: h.baseline, mission: h.mission, recorded: h.recorded.map((r) => ({ t: new Date(r.at).toISOString(), value: r.value })) },
    assessment: { tier: a.tier, ruleId: a.ruleId, why: a.why, source: a.source, confidence: a.confidence, placeholderRule: a.placeholder, reviewedBy: a.reviewedBy, confirmedByRepeatReading: confirmation(state, reading).status === 'confirmed' },
    stepsGiven: a.steps,
    stepsDone: reading.stepsDone,
    symptoms: state.symptoms.filter((s) => s.crewId === pack.crewId).map((s) => ({ label: s.label, at: new Date(s.at).toISOString() })),
    note: 'Assessment and next steps only. Not a diagnosis.',
  };
}

/** Build the file that leaves the device when a link opens, and mark those cases as exported. */
export function exportOutbox(state: State, seed: Seed, rule: Rule, at: number): { state: State; file: { exportedAt: string; format: string; cases: ReturnType<typeof casePackContent>[] } } {
  const queued = state.outbox.filter((p) => p.status === 'queued');
  const outbox = state.outbox.map((p) => (p.status === 'queued' ? { ...p, status: 'exported' as const, exportedAt: at } : p));
  const next = { ...state, outbox };
  const cases = queued.map((p) => casePackContent(next, seed, rule, p.id));
  return { state: next, file: { exportedAt: new Date(at).toISOString(), format: 'crew-health-case-export/1', cases } };
}

/** Three example values for the demo: one per tier, worked out from the person's own band. */
export function demoValues(seed: Seed, rule: Rule, crewId: string, indicatorId: string): number[] {
  const crew = crewById(seed, crewId);
  const ind = indicatorById(seed, indicatorId);
  const ref = ind.ref[crew.sex];
  const a = assessValue(seed, rule, crewId, indicatorId, (crew.baseline[ind.id] ?? [{ value: 1 }])[0].value);
  const f = (n: number) => Number(n.toFixed(ind.dp));
  const out = [f(a.band.mean)];
  if (a.band.low > ref.min) out.push(f((a.band.low + ref.min) / 2));
  out.push(f(Math.min(ref.min, a.band.low) - (ref.max - ref.min) * 0.08));
  return [...new Set(out)];
}
