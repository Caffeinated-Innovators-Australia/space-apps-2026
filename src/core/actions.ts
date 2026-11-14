// The action layer: every change to the record goes through these functions.
// They are pure (state in, new state out), so the screens, the command-line tool and
// any agent get identical answers. Rules decide; nothing here calls a language model.
// AI assistance: drafted with Claude Code (see AI_USE.md).
import { assess, RANK, type Assessment, type RuleFile, type Tier } from './rules.ts';
import { applySlip, plan, type CheckIn, type PlanItem } from './schedule.ts';
import type { CasePack, CrewProfile, Indicator, Reading, Seed, Setting, State, Symptom, TimelineBlock } from './types.ts';

export function initialState(seed: Seed): State {
  return {
    version: 2,
    readings: [],
    symptoms: [],
    nothingToReport: [],
    outbox: [],
    ui: { crewId: seed.crew[0].id, settingId: seed.settings[0].id, theme: 'cabin', doseLogged: false, clock: seed.clockOptions[0], slipped: false },
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

const logged = (xs: (number | null)[] | undefined): number[] => (xs ?? []).filter((v): v is number => v !== null);

/** Readings saved on this device for one person and one indicator, oldest first. */
export function recorded(state: State, crewId: string, indicatorId: string): Reading[] {
  return state.readings.filter((r) => r.crewId === crewId && r.indicatorId === indicatorId);
}
export function latestReading(state: State, crewId: string, indicatorId: string): Reading | undefined {
  const all = recorded(state, crewId, indicatorId);
  return all[all.length - 1];
}

/** A reading outside these bounds is a typing slip, not a measurement. */
export function plausible(ind: Indicator, value: number): boolean {
  return Number.isFinite(value) && value >= ind.input.min && value <= ind.input.max;
}

/**
 * Assess one value for one crew member against their own baseline and their mission so far.
 * `earlier` holds readings already saved today, oldest first. Changes nothing.
 */
export function assessValue(seed: Seed, rules: RuleFile, crewId: string, indicatorId: string, value: number, earlier: number[] = []): Assessment {
  const crew = crewById(seed, crewId);
  const ind = indicatorById(seed, indicatorId);
  const baseline = crew.baseline[ind.id] ?? [];
  if (baseline.length === 0) throw new Error(`${crew.name} has no baseline for ${ind.name}.`);
  if (!plausible(ind, value)) throw new Error(`${ind.name} must be between ${ind.input.min} and ${ind.input.max} ${ind.unit}. Check the reading and enter it again.`);
  const ref = ind.ref?.[crew.sex];
  const a = assess(rules, {
    region: ind.region, indicator: ind.name, unit: ind.unit, dp: ind.dp, watch: ind.watch, value, baseline,
    history: [...logged(crew.mission[ind.id]), ...earlier],
    fixedSd: ind.fixedSd,
    limitLow: ind.limit?.low ?? ref?.min,
    limitHigh: ind.limit?.high ?? ref?.max,
    limitLabel: ind.limit?.label ?? (ref ? 'laboratory reference range' : undefined),
  });
  const own = ind.steps?.[a.tier];
  return own ? { ...a, steps: own } : a;
}

/** Assess a saved reading as it stood when it was taken. */
export function assessReading(state: State, seed: Seed, rules: RuleFile, reading: Reading): Assessment {
  const earlier = recorded(state, reading.crewId, reading.indicatorId).filter((r) => r.at < reading.at).map((r) => r.value);
  return assessValue(seed, rules, reading.crewId, reading.indicatorId, reading.value, earlier);
}

/** Save a reading and return it with its assessment. */
export function recordReading(state: State, seed: Seed, rules: RuleFile, args: { crewId: string; indicatorId: string; value: number; at: number }): { state: State; reading: Reading; assessment: Assessment } {
  const earlier = recorded(state, args.crewId, args.indicatorId).map((r) => r.value);
  const assessment = assessValue(seed, rules, args.crewId, args.indicatorId, args.value, earlier);
  const reading: Reading = { id: `r-${args.at}-${state.readings.length + 1}`, crewId: args.crewId, indicatorId: args.indicatorId, value: args.value, at: args.at, day: seed.missionDay, tier: assessment.tier, ruleId: assessment.ruleId, stepsDone: [] };
  return { state: { ...state, readings: [...state.readings, reading] }, reading, assessment };
}

/** Baseline, the mission so far (one entry per day, null where nothing was logged) and readings saved today. */
export function history(state: State, seed: Seed, crewId: string, indicatorId: string): { baseline: number[]; mission: (number | null)[]; recorded: Reading[] } {
  const crew = crewById(seed, crewId);
  return { baseline: crew.baseline[indicatorId] ?? [], mission: crew.mission[indicatorId] ?? [], recorded: recorded(state, crewId, indicatorId) };
}

/**
 * Has a raised result been backed by a second reading? A single out-of-range reading can be a
 * measurement slip, so the record says whether the reading before it today was also outside the band.
 */
export function confirmation(state: State, reading: Reading): { status: 'not-needed' | 'unconfirmed' | 'confirmed'; previousAt?: number } {
  if (reading.tier === 'green') return { status: 'not-needed' };
  const earlier = recorded(state, reading.crewId, reading.indicatorId).filter((r) => r.at < reading.at);
  const prev = earlier[earlier.length - 1];
  return prev && prev.tier !== 'green' ? { status: 'confirmed', previousAt: prev.at } : { status: 'unconfirmed' };
}

export interface DayItem { indicator: Indicator; due: boolean; prompted: boolean; reading?: Reading; assessment?: Assessment }
export interface DaySummary {
  items: DayItem[];
  flagged: DayItem[];
  /** Set when enough check-ins are flagged together. */
  combined?: { ruleId: string; tier: Tier; title: string; why: string; source: string; confidence: string; placeholder: boolean };
  /** Set when the rules ask for an extra check-in today. */
  prompt?: { ruleId: string; indicatorId: string; why: string };
}

/** One person's day: what is due, what has been logged, what the rules make of it together. */
export function daySummary(state: State, seed: Seed, rules: RuleFile, crewId: string): DaySummary {
  const base: DayItem[] = seed.indicators.map((indicator) => {
    const reading = latestReading(state, crewId, indicator.id);
    return {
      indicator,
      due: indicator.cadence === 'daily' || indicator.cadence === 'sensor' || (indicator.cadence === 'weekly' && seed.missionDay % 7 === 0),
      prompted: false,
      reading,
      assessment: reading ? assessReading(state, seed, rules, reading) : undefined,
    };
  });
  const isFlagged = (id: string) => base.some((x) => x.indicator.id === id && x.assessment && x.assessment.tier !== 'green');
  let prompt: DaySummary['prompt'];
  for (const p of rules.prompts) {
    if (p.when_flagged.some(isFlagged)) {
      prompt = { ruleId: p.id, indicatorId: p.then_prompt, why: p.why };
      const target = base.find((x) => x.indicator.id === p.then_prompt);
      if (target) { target.due = true; target.prompted = true; }
    }
  }
  const flagged = base.filter((x) => x.assessment && x.assessment.tier !== 'green');
  let combined: DaySummary['combined'];
  if (flagged.length >= rules.combined.min_flags) {
    const tier = flagged.reduce<Tier>((t, x) => (RANK[x.assessment!.tier] > RANK[t] ? x.assessment!.tier : t), 'amber');
    const list = flagged.map((x) => x.indicator.name.toLowerCase()).join(', ');
    combined = {
      ruleId: rules.combined.id, tier, title: rules.combined.title,
      why: rules.combined.why.replace('{count}', String(flagged.length)).replace('{list}', list),
      source: rules.combined.source, confidence: rules.combined.confidence,
      placeholder: rules.combined.signed_off_by.trim().toLowerCase() === 'placeholder',
    };
  }
  return { items: base, flagged, combined, prompt };
}

/** Today's prompts, fitted around the crew's day. Never during a critical operation. */
export function dayPlan(state: State, seed: Seed, rules: RuleFile, crewId: string): { blocks: TimelineBlock[]; items: (PlanItem & { tier?: Tier })[] } {
  const blocks = applySlip(seed.timeline, state.ui.slipped ? seed.slipMinutes : 0);
  const day = daySummary(state, seed, rules, crewId);
  const due = day.items.filter((x) => x.due && x.indicator.cadence !== 'sensor');
  const checkIns: CheckIn[] = due.map((x) => ({ id: x.indicator.id, label: x.prompted ? `${x.indicator.name} (asked for today)` : x.indicator.name, slot: x.indicator.slot }));
  const done = due.filter((x) => x.reading).map((x) => x.indicator.id);
  const items = plan(blocks, checkIns, state.ui.clock, done).map((p) => ({ ...p, tier: day.items.find((x) => x.indicator.id === p.id)?.assessment?.tier }));
  return { blocks, items };
}

const DAILY = (seed: Seed) => seed.indicators.filter((i) => i.cadence === 'daily');

/**
 * Honest-reporting streak: days in a row with every daily check-in logged. It counts check-ins,
 * never results, so a low day logged honestly counts the same as a good one.
 */
export function streak(state: State, seed: Seed, crewId: string): number {
  const crew = crewById(seed, crewId);
  const daily = DAILY(seed);
  let n = 0;
  if (daily.every((i) => latestReading(state, crewId, i.id))) n += 1;
  const days = crew.mission[daily[0].id]?.length ?? 0;
  for (let d = days - 1; d >= 0; d -= 1) {
    if (daily.every((i) => crew.mission[i.id]?.[d] !== null && crew.mission[i.id]?.[d] !== undefined)) n += 1;
    else break;
  }
  return n;
}

/** A shared target for the whole crew over the past seven days. No one is ranked. */
export function crewGoal(state: State, seed: Seed): { done: number; total: number } {
  const daily = DAILY(seed);
  let done = 0;
  let total = 0;
  for (const c of seed.crew) {
    for (const i of daily) {
      const past = (c.mission[i.id] ?? []).slice(-6);
      total += past.length + 1;
      done += past.filter((v) => v !== null).length + (latestReading(state, c.id, i.id) ? 1 : 0);
    }
  }
  return { done, total };
}

export function insights(streakDays: number): { days: number; title: string }[] {
  return [{ days: 14, title: 'your sleep pattern across the mission' }, { days: 30, title: 'how your mood and sleep move together' }].filter((x) => streakDays >= x.days);
}

export function toggleStep(state: State, readingId: string, step: string): State {
  return { ...state, readings: state.readings.map((r) => (r.id !== readingId ? r : { ...r, stepsDone: r.stepsDone.includes(step) ? r.stepsDone.filter((s) => s !== step) : [...r.stepsDone, step] })) };
}

export function toggleSymptom(state: State, crewId: string, label: string, at: number): State {
  const has = state.symptoms.some((s) => s.crewId === crewId && s.label === label);
  const symptoms: Symptom[] = has ? state.symptoms.filter((s) => !(s.crewId === crewId && s.label === label)) : [...state.symptoms, { crewId, label, at }];
  return { ...state, symptoms, nothingToReport: state.nothingToReport.filter((c) => c !== crewId) };
}

/** "Nothing to report" is a check-in in its own right. */
export function reportNothing(state: State, crewId: string): State {
  return { ...state, symptoms: state.symptoms.filter((s) => s.crewId !== crewId), nothingToReport: [...state.nothingToReport.filter((c) => c !== crewId), crewId] };
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
export function casePackContent(state: State, seed: Seed, rules: RuleFile, packId: string) {
  const pack = state.outbox.find((p) => p.id === packId);
  if (!pack) throw new Error(`Unknown case "${packId}".`);
  const reading = state.readings.find((r) => r.id === pack.readingId)!;
  const crew = crewById(seed, pack.crewId);
  const ind = indicatorById(seed, reading.indicatorId);
  const a = assessReading(state, seed, rules, reading);
  const h = history(state, seed, reading.crewId, reading.indicatorId);
  const day = daySummary(state, seed, rules, pack.crewId);
  return {
    caseId: pack.id,
    status: pack.status,
    createdAt: new Date(pack.createdAt).toISOString(),
    setting: settingById(seed, pack.settingId).label,
    missionDay: seed.missionDay,
    crew: crew.name,
    synthetic: seed.synthetic,
    reading: { indicator: ind.name, value: reading.value, unit: ind.unit, takenAt: new Date(reading.at).toISOString(), changeFromBaseline: a.deltaText },
    trend: { baselineMean: Number(a.band.mean.toFixed(ind.dp + 1)), ownRange: [Number(a.band.low.toFixed(ind.dp)), Number(a.band.high.toFixed(ind.dp))], last14Days: h.mission.slice(-14), today: h.recorded.map((r) => r.value) },
    assessment: { tier: a.tier, rules: a.findings.map((f) => ({ id: f.ruleId, why: f.why, source: f.source, confidence: f.confidence, placeholder: f.placeholder })), reviewedBy: a.reviewedBy, confirmedByRepeatReading: confirmation(state, reading).status === 'confirmed' },
    otherSignalsToday: day.flagged.filter((x) => x.indicator.id !== ind.id).map((x) => ({ indicator: x.indicator.name, value: x.reading!.value, unit: x.indicator.unit, tier: x.assessment!.tier, why: x.assessment!.why })),
    stepsGiven: a.steps,
    stepsDone: reading.stepsDone,
    symptoms: state.symptoms.filter((s) => s.crewId === pack.crewId).map((s) => ({ label: s.label, at: new Date(s.at).toISOString() })),
    note: 'Assessment and next steps only. Not a diagnosis.',
  };
}

/** Build the file that leaves the device when a link opens, and mark those cases as exported. */
export function exportOutbox(state: State, seed: Seed, rules: RuleFile, at: number): { state: State; file: { exportedAt: string; format: string; cases: ReturnType<typeof casePackContent>[] } } {
  const queued = state.outbox.filter((p) => p.status === 'queued');
  const outbox = state.outbox.map((p) => (p.status === 'queued' ? { ...p, status: 'exported' as const, exportedAt: at } : p));
  const next = { ...state, outbox };
  const cases = queued.map((p) => casePackContent(next, seed, rules, p.id));
  return { state: next, file: { exportedAt: new Date(at).toISOString(), format: 'crew-health-case-export/2', cases } };
}

/** An example value for the demo: today's story value where the seed has one, otherwise the person's own average. */
export function demoValue(seed: Seed, crewId: string, indicatorId: string): number {
  const ind = indicatorById(seed, indicatorId);
  const story = seed.today[crewId]?.[indicatorId];
  if (story !== undefined) return story;
  const b = crewById(seed, crewId).baseline[indicatorId] ?? [];
  return Number((b.reduce((x, y) => x + y, 0) / Math.max(1, b.length)).toFixed(ind.dp));
}
