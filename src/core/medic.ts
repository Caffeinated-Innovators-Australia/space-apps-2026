// The crew medic's view: one row per crew member, holding only what the "Who sees what" policy lets the medic see.
// AI assistance: drafted with Claude Code (see AI_USE.md).
import { assessReading, confirmation, streak } from './actions.ts';
import { pathwayStatuses } from './pathways.ts';
import { RANK, type RuleFile, type Tier } from './rules.ts';
import type { Seed, State } from './types.ts';

/**
 * Logs the policy keeps private ("Mood and symptom logs": only what the person sends). A confirmed
 * Urgent result on one of these is not shown by name; if the person sends it, it shows as a case.
 */
const PRIVATE_LOGS = new Set(['mood', 'sleep']);

export interface MedicRow {
  crewId: string;
  name: string;
  /** Cases this person has sent (queued or exported). Counts, tiers and times only. */
  cases: { count: number; topTier: Tier | null; newestAt: number | null };
  /** Urgent results backed by a repeat reading. Names the check and the time, never the value. */
  confirmedUrgent: { indicatorId: string; indicator: string; at: number }[];
  /** Symptom patterns at Urgent that the person has sent as a case. Names the body area to check, never a symptom. */
  urgentPathways: { pathwayId: string; checkFor: string }[];
  /** Totals only: today's daily check-ins logged, and the streak of full days. */
  checkIns: { done: number; total: number; streakDays: number };
  /** Cabin readings are the shared habitat's, so everyone sees them. */
  cabin: CabinLine[];
  /** The most serious tier the medic may see for this person, used to sort. */
  topTier: Tier | null;
  /** True when nothing beyond totals and the shared cabin may be shown. */
  nothingShared: boolean;
}

export interface CabinLine { indicatorId: string; indicator: string; value: number; unit: string; tier: Tier; at: number }

const higher = (a: Tier | null, b: Tier | null): Tier | null => (a === null ? b : b === null ? a : RANK[b] > RANK[a] ? b : a);

/** The latest reading of each shared-habitat indicator, from anyone on the crew. */
export function cabinReadings(state: State, seed: Seed, rules: RuleFile): CabinLine[] {
  return seed.indicators.filter((i) => i.environment).flatMap((ind) => {
    const all = state.readings.filter((r) => r.indicatorId === ind.id);
    const last = all[all.length - 1];
    return last ? [{ indicatorId: ind.id, indicator: ind.name, value: last.value, unit: ind.unit, tier: assessReading(state, seed, rules, last).tier, at: last.at }] : [];
  });
}

/** One row per crew member, most serious first, holding only what the privacy policy lets the crew medic see. */
export function crewOverview(state: State, seed: Seed, rules: RuleFile): MedicRow[] {
  const cabin = cabinReadings(state, seed, rules);
  const daily = seed.indicators.filter((i) => i.cadence === 'daily');
  const personal = new Set(seed.indicators.filter((i) => !i.environment).map((i) => i.id));
  const rows = seed.crew.map((c, order) => {
    const packs = state.outbox.filter((p) => p.crewId === c.id);
    const statuses = pathwayStatuses(state, seed, rules, c.id);
    let caseTier: Tier | null = null;
    for (const p of packs) {
      let t: Tier | null = null;
      if (p.pathwayId) {
        const s = statuses.find((x) => x.pathway.id === p.pathwayId);
        t = s && (s.level === 'amber' || s.level === 'red') ? 'red' : null;
      } else {
        const r = state.readings.find((x) => x.id === p.readingId);
        t = r ? assessReading(state, seed, rules, r).tier : null;
      }
      caseTier = higher(caseTier, t);
    }
    const confirmedUrgent = state.readings
      .filter((r) => r.crewId === c.id && personal.has(r.indicatorId) && !PRIVATE_LOGS.has(r.indicatorId))
      .filter((r) => assessReading(state, seed, rules, r).tier === 'red' && confirmation(state, r).status === 'confirmed')
      .map((r) => ({ indicatorId: r.indicatorId, indicator: seed.indicators.find((i) => i.id === r.indicatorId)!.name, at: r.at }));
    const sentPathways = new Set(packs.filter((p) => p.pathwayId).map((p) => p.pathwayId));
    const urgentPathways = statuses.filter((s) => s.level === 'red' && sentPathways.has(s.pathway.id)).map((s) => ({ pathwayId: s.pathway.id, checkFor: s.pathway.region }));
    const done = daily.filter((i) => state.readings.some((r) => r.crewId === c.id && r.indicatorId === i.id && r.day === seed.missionDay)).length;
    let topTier = caseTier;
    if (confirmedUrgent.length || urgentPathways.length) topTier = 'red';
    const row: MedicRow = {
      crewId: c.id,
      name: c.name,
      cases: { count: packs.length, topTier: caseTier, newestAt: packs.length ? Math.max(...packs.map((p) => p.createdAt)) : null },
      confirmedUrgent,
      urgentPathways,
      checkIns: { done, total: daily.length, streakDays: streak(state, seed, c.id) },
      cabin,
      topTier,
      nothingShared: packs.length === 0 && confirmedUrgent.length === 0 && urgentPathways.length === 0,
    };
    return { row, order };
  });
  const score = (r: MedicRow) => (r.topTier === null ? (r.nothingShared ? -2 : -1) : RANK[r.topTier]);
  return rows
    .sort((a, b) => score(b.row) - score(a.row) || (b.row.confirmedUrgent.length + b.row.urgentPathways.length) - (a.row.confirmedUrgent.length + a.row.urgentPathways.length) || (b.row.cases.newestAt ?? 0) - (a.row.cases.newestAt ?? 0) || a.order - b.order)
    .map((x) => x.row);
}

export interface SignOffItem {
  id: string;
  kind: 'rule' | 'combined rule' | 'prompt rule' | 'pathway' | 'pathway early warning';
  /** What the rule is, in a few words. */
  what: string;
  source: string;
  confidence: string;
  /** True while `signed_off_by` is still "placeholder". */
  placeholder: boolean;
}

const isPlaceholder = (s: string) => s.trim().toLowerCase() === 'placeholder';
const RULE_WHAT: Record<string, string> = {
  limit: 'A reading beyond a sourced limit',
  sustained: 'Outside your own range several times in a row',
  level: 'A reading outside your own range',
  trend: 'A drift away from your baseline',
};

/** Every rule in the rules file, with whether a clinician has signed it off yet. */
export function rulesAwaitingSignOff(rules: RuleFile): SignOffItem[] {
  const out: SignOffItem[] = rules.rules.map((r) => ({ id: r.id, kind: 'rule', what: RULE_WHAT[r.kind] ?? r.kind, source: r.source, confidence: r.confidence, placeholder: isPlaceholder(r.signed_off_by) }));
  const cm = rules.combined;
  out.push({ id: cm.id, kind: 'combined rule', what: `${cm.min_flags} or more signals moving together`, source: cm.source, confidence: cm.confidence, placeholder: isPlaceholder(cm.signed_off_by) });
  for (const p of rules.prompts) out.push({ id: p.id, kind: 'prompt rule', what: `Asks for an extra check: ${p.then_prompt.replace(/-/g, ' ')}`, source: p.source, confidence: p.confidence, placeholder: isPlaceholder(p.signed_off_by) });
  for (const w of rules.pathways) {
    out.push({ id: w.id, kind: 'pathway', what: `Symptom pattern to check for: ${w.region.toLowerCase()}`, source: w.source, confidence: w.confidence, placeholder: isPlaceholder(w.signed_off_by) });
    if (w.early) out.push({ id: w.early.id, kind: 'pathway early warning', what: `Early warning from a low ${w.early.indicator.replace(/-/g, ' ')} trend`, source: w.early.source, confidence: w.early.confidence, placeholder: isPlaceholder(w.early.signed_off_by) });
  }
  return out;
}
