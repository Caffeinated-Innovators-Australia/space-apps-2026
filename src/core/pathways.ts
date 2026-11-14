// Symptom pathways: what the rules do when logged symptoms form a pattern, such as a possible kidney stone.
// A pathway names a pattern to check and the next steps. It never names a finding: that is for the clinicians.
// Pure functions, like the rest of the action layer. Rules decide; nothing here calls a language model.
// AI assistance: drafted with Claude Code (see AI_USE.md).
import { latestVitals, vitalsLine } from './vitals.ts';
import { ultrasoundSummary } from './ultrasound.ts';
import { crewById, daySummary, indicatorById, latestReading, settingById } from './actions.ts';
import { personalBand, RANK, round, type PathwayRule, type RuleFile, type Tier } from './rules.ts';
import type { CasePack, PainEntry, Seed, State } from './types.ts';

export interface ContextLine { indicatorId: string; name: string; text: string; flagged: boolean }
export interface PathwayStatus {
  pathway: PathwayRule;
  /** Identifies this person's pathway in the outbox and the acknowledged list. */
  key: string;
  /** 'check' means a core symptom is logged and the app is asking the follow-up questions. */
  /** 'early' means no symptom is logged, but a trend the pathway watches has raised an early warning. */
  level: 'check' | 'early' | 'amber' | 'red';
  title: string;
  why: string;
  matched: { core: string[]; supporting: string[]; urgent: string[] };
  steps: string[];
  stepsDone: string[];
  context: ContextLine[];
  pain: PainEntry[];
  placeholder: boolean;
  /** The rule that produced this status: the pathway's own, or its early-warning rule. */
  ruleId: string;
  source: string;
  confidence: string;
  tests: Record<string, string>;
}

/** The clinicians' one-line note for the test results logged so far, if the results match one exactly. */
export function testNote(pathway: PathwayRule, tests: Record<string, string>): string | undefined {
  return (pathway.test_notes ?? []).find((n) => Object.entries(n.when).every(([id, v]) => tests[id] === v))?.text;
}

export const pathwayKey = (crewId: string, pathwayId: string) => `pathway:${crewId}:${pathwayId}`;

function list(items: string[]): string {
  const low = items.map((x) => x.toLowerCase());
  return low.length <= 1 ? low.join('') : `${low.slice(0, -1).join(', ')} and ${low[low.length - 1]}`;
}

/** How the indicators that bear on this pattern have moved: today's reading if there is one, and the past week against the person's own baseline. */
export function pathwayContext(state: State, seed: Seed, rules: RuleFile, crewId: string, pathway: PathwayRule): ContextLine[] {
  const crew = crewById(seed, crewId);
  const trend = rules.rules.find((r) => r.kind === 'trend');
  const window = trend?.window ?? 7;
  const shift = trend?.shift_sd ?? 1;
  return pathway.context.map((id) => {
    const ind = indicatorById(seed, id);
    const band = personalBand(crew.baseline[id] ?? [], rules.band.k, ind.fixedSd);
    const today = latestReading(state, crewId, id);
    const past = (crew.mission[id] ?? []).filter((v): v is number => v !== null);
    const recent = [...past, ...(today ? [today.value] : [])].slice(-window);
    const mean = recent.reduce((a, b) => a + b, 0) / Math.max(1, recent.length);
    const drift = (mean - band.mean) / band.sd;
    const low = ind.watch !== 'high' && drift <= -shift;
    const high = ind.watch !== 'low' && drift >= shift;
    const flagged = recent.length >= 3 && (low || high);
    const text = recent.length < 3
      ? `${ind.name}: too few check-ins logged to show a trend.`
      : `${ind.name}: your last ${recent.length} logged days average ${round(mean, ind.dp + 1)} ${ind.unit}, ${flagged ? (low ? 'below' : 'above') : 'in line with'} your baseline of ${round(band.mean, ind.dp + 1)} ${ind.unit}.`;
    return { indicatorId: id, name: ind.name, text, flagged };
  });
}

/** The pathways open for one person now, most serious first. */
export function pathwayStatuses(state: State, seed: Seed, rules: RuleFile, crewId: string): PathwayStatus[] {
  const mine = new Set(state.symptoms.filter((s) => s.crewId === crewId).map((s) => s.label));
  const out: PathwayStatus[] = [];
  for (const pathway of rules.pathways) {
    const matched = {
      core: pathway.core.filter((x) => mine.has(x)),
      supporting: pathway.supporting.filter((x) => mine.has(x)),
      urgent: pathway.urgent.filter((x) => mine.has(x)),
    };
    const key0 = pathwayKey(crewId, pathway.id);
    const tests = state.pathwayTests?.[key0] ?? {};
    if (matched.core.length === 0) {
      const e = pathway.early && earlyWarning(state, seed, rules, crewId, pathway);
      if (e) {
        out.push({
          pathway, key: key0, level: 'early', title: e.title, why: e.why, matched, steps: pathway.early!.steps,
          stepsDone: state.pathwaySteps?.[key0] ?? [], context: pathwayContext(state, seed, rules, crewId, pathway),
          pain: [], placeholder: pathway.early!.signed_off_by.trim().toLowerCase() === 'placeholder',
          ruleId: pathway.early!.id, source: pathway.early!.source, confidence: pathway.early!.confidence, tests,
        });
      }
      continue;
    }
    const pattern = matched.supporting.length >= pathway.min_supporting;
    const level: PathwayStatus['level'] = matched.urgent.length > 0 ? 'red' : pattern ? 'amber' : 'check';
    const key = pathwayKey(crewId, pathway.id);
    const all = list([...matched.core, ...matched.supporting, ...matched.urgent]);
    const fill = (t: string) => t.replace('{symptoms}', all).replace('{urgent}', list(matched.urgent)).replace('{core}', list(matched.core));
    out.push({
      pathway, key, level,
      title: level === 'check' ? fill(pathway.check.title) : pathway.titles[level],
      why: fill(level === 'check' ? pathway.check.why : pathway.why[level]),
      matched,
      steps: level === 'check' ? [] : pathway.steps[level],
      stepsDone: state.pathwaySteps?.[key] ?? [],
      context: pathwayContext(state, seed, rules, crewId, pathway),
      pain: (state.painLog ?? []).filter((p) => p.crewId === crewId && p.pathwayId === pathway.id),
      placeholder: pathway.signed_off_by.trim().toLowerCase() === 'placeholder',
      ruleId: pathway.id, source: pathway.source, confidence: pathway.confidence, tests,
    });
  }
  const rank = { check: 0, early: 1, amber: 2, red: 3 };
  return out.sort((a, b) => rank[b.level] - rank[a.level]);
}

/** Three tiers: an early warning asks the crew to watch; a matched pattern is Act now, with the crew medic told. */
export const pathwayTier = (s: PathwayStatus): Tier | undefined => (s.level === 'check' ? undefined : s.level === 'early' ? 'amber' : 'red');
/** A matched pattern with a red-flag symptom is a life threat now: it opens emergency mode. Emergency is a mode within Act now, not a tier. */
export const pathwayEmergency = (s: PathwayStatus): boolean => s.level === 'red';

/** Whether the pathway's early-warning rule fires: the watched indicator has been low for enough logged days in a row. */
export function earlyWarning(state: State, seed: Seed, rules: RuleFile, crewId: string, pathway: PathwayRule): { title: string; why: string } | null {
  const e = pathway.early;
  if (!e) return null;
  const crew = crewById(seed, crewId);
  const ind = indicatorById(seed, e.indicator);
  const baseline = crew.baseline[e.indicator] ?? [];
  if (baseline.length < 2) return null;
  const band = personalBand(baseline, rules.band.k, ind.fixedSd);
  const today = latestReading(state, crewId, e.indicator);
  const logged = [...(crew.mission[e.indicator] ?? []).filter((v): v is number => v !== null), ...(today ? [today.value] : [])];
  const last = logged.slice(-e.count);
  const floor = band.mean - e.shift_sd * band.sd;
  if (last.length < e.count || !last.every((v) => v < floor)) return null;
  const fill = (t: string) => t.replace(/\{count\}/g, String(e.count)).replace('{values}', last.map((v) => v.toFixed(ind.dp)).join(', ')).replace(/\{unit\}/g, ind.unit).replace('{baselineMean}', round(band.mean, ind.dp + 1).toString());
  return { title: fill(e.title), why: fill(e.why) };
}

/** Log the result of a simple test a pathway asks for. It is recorded and sent with the case; it never changes a tier. */
export function logPathwayTest(state: State, rules: RuleFile, args: { crewId: string; pathwayId: string; testId: string; result: string }): State {
  const test = rules.pathways.find((w) => w.id === args.pathwayId)?.tests.find((t) => t.id === args.testId);
  if (!test) throw new Error(`Unknown test "${args.testId}" for pathway "${args.pathwayId}".`);
  if (!test.options.includes(args.result)) throw new Error(`"${args.result}" is not a result for ${test.label}. Choose one of: ${test.options.join('; ')}.`);
  const key = pathwayKey(args.crewId, args.pathwayId);
  return { ...state, pathwayTests: { ...(state.pathwayTests ?? {}), [key]: { ...(state.pathwayTests?.[key] ?? {}), [args.testId]: args.result } } };
}

/** Log a pain score from 0 to 10. No threshold is applied to it. */
export function logPain(state: State, args: { crewId: string; pathwayId: string; score: number; at: number }): State {
  if (!Number.isInteger(args.score) || args.score < 0 || args.score > 10) throw new Error('A pain score is a whole number from 0 to 10.');
  return { ...state, painLog: [...(state.painLog ?? []), { crewId: args.crewId, pathwayId: args.pathwayId, score: args.score, at: args.at }] };
}

export function togglePathwayStep(state: State, key: string, step: string): State {
  const done = state.pathwaySteps?.[key] ?? [];
  return { ...state, pathwaySteps: { ...(state.pathwaySteps ?? {}), [key]: done.includes(step) ? done.filter((s) => s !== step) : [...done, step] } };
}

/** Queue a pathway case for the next link. One case per person and pathway; sending again returns the same case. */
export function sendPathwayCase(state: State, seed: Seed, rules: RuleFile, args: { crewId: string; pathwayId: string; settingId: string; at: number }): { state: State; pack: CasePack } {
  const status = pathwayStatuses(state, seed, rules, args.crewId).find((s) => s.pathway.id === args.pathwayId);
  if (!status || status.level === 'check' || status.level === 'early') throw new Error(`No "${args.pathwayId}" pattern is open for ${args.crewId}. A case is sent once the pattern needs the crew medic or is urgent.`);
  const existing = state.outbox.find((p) => p.readingId === status.key);
  if (existing) return { state, pack: existing };
  const pack: CasePack = { id: `case-${args.at}`, crewId: args.crewId, readingId: status.key, createdAt: args.at, settingId: args.settingId, status: 'queued', pathwayId: args.pathwayId };
  return { state: { ...state, outbox: [...state.outbox, pack] }, pack };
}

/** The full, self-contained content of one pathway case. It is built when read, so it carries anything logged since it was queued. */
export function pathwayCaseContent(state: State, seed: Seed, rules: RuleFile, packId: string) {
  const pack = state.outbox.find((p) => p.id === packId);
  if (!pack || !pack.pathwayId) throw new Error(`Unknown pathway case "${packId}".`);
  const pathway = rules.pathways.find((w) => w.id === pack.pathwayId);
  if (!pathway) throw new Error(`Unknown pathway "${pack.pathwayId}".`);
  const status = pathwayStatuses(state, seed, rules, pack.crewId).find((s) => s.pathway.id === pathway.id);
  const day = daySummary(state, seed, rules, pack.crewId);
  const key = pathwayKey(pack.crewId, pathway.id);
  const iso = (t: number) => new Date(t).toISOString();
  return {
    caseId: pack.id,
    kind: 'symptom-pathway' as const,
    status: pack.status,
    createdAt: iso(pack.createdAt),
    setting: settingById(seed, pack.settingId).label,
    missionDay: seed.missionDay,
    crew: crewById(seed, pack.crewId).name,
    synthetic: seed.synthetic,
    pattern: { rule: pathway.id, checkedFor: pathway.name, region: pathway.region },
    assessment: {
      tier: status ? pathwayTier(status) ?? null : null,
      why: status?.why ?? 'The symptoms that opened this case have since been cleared by the crew member.',
      source: pathway.source, confidence: pathway.confidence,
      placeholder: pathway.signed_off_by.trim().toLowerCase() === 'placeholder',
    },
    symptoms: state.symptoms.filter((s) => s.crewId === pack.crewId).map((s) => ({ label: s.label, at: iso(s.at) })),
    tests: pathway.tests.map((t) => ({ test: t.label, result: state.pathwayTests?.[key]?.[t.id] ?? 'Not recorded' })),
    vitals: latestVitals(state, pack.crewId) ? vitalsLine(latestVitals(state, pack.crewId)!.values) : undefined,
    ultrasound: ultrasoundSummary(state, pack.crewId),
    painScores: (state.painLog ?? []).filter((p) => p.crewId === pack.crewId && p.pathwayId === pathway.id).map((p) => ({ score: p.score, outOf: 10, at: iso(p.at) })),
    recentTrends: pathwayContext(state, seed, rules, pack.crewId, pathway).map((c) => ({ indicator: c.name, summary: c.text, drifted: c.flagged })),
    otherSignalsToday: day.flagged.filter((x) => !(x.indicator.environment && settingById(seed, pack.settingId).habitat === false)).map((x) => ({ indicator: x.indicator.name, value: x.reading!.value, unit: x.indicator.unit, tier: x.assessment!.tier, why: x.assessment!.why })),
    stepsGiven: status?.steps ?? [],
    stepsDone: state.pathwaySteps?.[key] ?? [],
    note: 'Assessment and next steps only. Not a diagnosis. The pattern names what to check for, not what was found.',
  };
}

/** The alerts a pathway raises, ranked with reading alerts in the status bar. */
export function pathwayAlerts(state: State, seed: Seed, rules: RuleFile, crewId: string): { key: string; tier: Tier; name: string; pathwayId: string }[] {
  return pathwayStatuses(state, seed, rules, crewId)
    .filter((s) => s.level !== 'check')
    .map((s) => ({ key: s.key, tier: pathwayTier(s) as Tier, name: s.pathway.region, pathwayId: s.pathway.id }))
    .sort((a, b) => RANK[b.tier] - RANK[a.tier]);
}
