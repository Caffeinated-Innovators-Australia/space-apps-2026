// Deterministic rules engine. Rules decide; no language model runs in the app.
// AI assistance: drafted with Claude Code (see AI_USE.md).
import { load } from 'js-yaml';

export type Tier = 'green' | 'amber' | 'red';
export const TIERS: Tier[] = ['green', 'amber', 'red'];
export const RANK: Record<Tier, number> = { green: 0, amber: 1, red: 2 };
export type RuleKind = 'level' | 'trend' | 'sustained' | 'limit';
const KINDS: RuleKind[] = ['level', 'trend', 'sustained', 'limit'];

interface Signed { source: string; confidence: string; signed_off_by: string }
export interface RuleDef extends Signed { id: string; kind: RuleKind; tier: Tier; why: string; count?: number; window?: number; shift_sd?: number }
export interface CombinedRule extends Signed { id: string; min_flags: number; title: string; why: string }
export interface PromptRule extends Signed { id: string; when_flagged: string[]; then_prompt: string; why: string }

/**
 * A symptom pathway: a pattern of logged symptoms the rules act on. It names a pattern to check, never a finding.
 * core symptoms open the pathway; core plus enough supporting symptoms is amber; any urgent symptom on top is red.
 */
export interface PathwayRule extends Signed {
  id: string;
  name: string;
  region: string;
  core: string[];
  supporting: string[];
  min_supporting: number;
  urgent: string[];
  /** Indicators whose recent trend is shown beside the pattern, and sent with the case. */
  context: string[];
  check: { title: string; why: string };
  titles: Record<'amber' | 'red', string>;
  why: Record<'amber' | 'red', string>;
  steps: Record<'amber' | 'red', string[]>;
  background: { text: string; source: string; link: string }[];
  early?: Signed & { id: string; indicator: string; count: number; shift_sd: number; title: string; why: string; steps: string[] };
  tests: { id: string; label: string; options: string[] }[];
  /** A plain line shown when the test results match exactly. Clinician wording; a placeholder until signed off. */
  test_notes?: { when: Record<string, string>; text: string }[];
}

/** A vital-sign field a monitor alert may compare. spo2 may appear only beside another field, never alone. */
export type MonitorField = 'temp' | 'hr' | 'sbp' | 'dbp' | 'rr' | 'spo2';
const MONITOR_FIELDS: MonitorField[] = ['temp', 'hr', 'sbp', 'dbp', 'rr', 'spo2'];
export type MonitorOp = '>=' | '<=' | '>' | '<';
export interface MonitorComparison { field: MonitorField; op: MonitorOp; value: number }
/**
 * A rule that reads one set of vital signs. It fires when any group in `when` matches; a group matches when all its comparisons hold.
 * In the file each group is a map such as { temp: ">= 38", sbp: "<= 100" }; `groups` is the same, checked and parsed.
 */
export interface MonitorAlertRule extends Signed {
  id: string;
  name: string;
  title: string;
  checks_for: string;
  /** The emergency module's pathway number. */
  construct: number;
  when: Record<string, string>[];
  groups: MonitorComparison[][];
  steps: string[];
}

/** The whole rules file, checked. */
export interface RuleFile {
  version: string;
  band: { method: 'baseline-mean-sd'; k: number };
  green: { title: string; why: string };
  titles: Record<'amber' | 'red', string>;
  rules: RuleDef[];
  combined: CombinedRule;
  prompts: PromptRule[];
  pathways: PathwayRule[];
  steps: Record<Tier, string[]>;
  /** Rules that read one set of vital signs. Empty when the file has none. */
  monitor_alerts: MonitorAlertRule[];
}

export interface Band { low: number; high: number; mean: number; sd: number }
export interface Finding { ruleId: string; tier: Tier; why: string; source: string; confidence: string; placeholder: boolean; reviewedBy: string | null }

export interface Assessment {
  tier: Tier;
  title: string;
  why: string;
  findings: Finding[];
  steps: string[];
  source: string;
  confidence: string;
  placeholder: boolean;
  reviewedBy: string | null;
  band: Band;
  delta: number;
  deltaText: string;
  ruleId: string;
}

export interface AssessInput {
  region: string;
  indicator: string;
  unit: string;
  dp: number;
  /** Which side of the band matters for this indicator. */
  watch: 'low' | 'high' | 'both';
  value: number;
  /** The person's own baseline readings. */
  baseline: number[];
  /** Earlier readings on this mission, oldest first. */
  history: number[];
  /** A standard deviation from real crew data, used instead of the person's own baseline spread. */
  fixedSd?: number;
  limitLow?: number;
  limitHigh?: number;
  limitLabel?: string;
  /** For scales with fixed ends: the range is described within these ends. */
  displayMin?: number;
  displayMax?: number;
  /** A reading of the shared habitat (cabin air), averaged over one hour by the sensor. */
  environment?: boolean;
}

function signed(r: Partial<Signed> | undefined, id: string): void {
  if (!r?.source || !String(r.source).trim()) throw new Error(`Rule ${id} has no source. Every threshold must show its source.`);
  if (!r.signed_off_by || !String(r.signed_off_by).trim()) throw new Error(`Rule ${id} has no signed_off_by field. Use a clinician role, or "placeholder".`);
  if (!r.confidence) throw new Error(`Rule ${id} has no confidence label.`);
}

/** Parse and check the rules file. Throws a plain-language error if anything is unsafe to use. */
export function parseRules(text: string): RuleFile {
  const f = load(text) as RuleFile;
  if (!f || !Array.isArray(f.rules) || f.rules.length === 0) throw new Error('Rules file has no rules.');
  if (f.band?.method !== 'baseline-mean-sd' || !(f.band.k > 0)) throw new Error('Rules file has no valid band.');
  if (!f.green?.why || !f.green.title || !f.titles?.amber || !f.titles.red) throw new Error('Rules file is missing a title or the green explanation.');
  for (const r of f.rules) {
    const id = r?.id ?? 'unnamed';
    signed(r, id);
    if (!KINDS.includes(r.kind)) throw new Error(`Rule ${id}: unknown kind "${r.kind}".`);
    if (!TIERS.includes(r.tier) || r.tier === 'green') throw new Error(`Rule ${id}: tier must be amber or red.`);
    if (!r.why) throw new Error(`Rule ${id}: missing why line.`);
    if (r.kind === 'sustained' && !(Number(r.count) >= 2)) throw new Error(`Rule ${id}: a sustained rule needs a count of 2 or more.`);
    if (r.kind === 'trend' && !(Number(r.window) >= 3 && Number(r.shift_sd) > 0)) throw new Error(`Rule ${id}: a trend rule needs a window of 3 or more and a shift.`);
  }
  if (!f.combined?.id) throw new Error('Rules file has no combined rule.');
  signed(f.combined, f.combined.id);
  for (const p of f.prompts ?? []) signed(p, p.id ?? 'prompt');
  f.prompts = f.prompts ?? [];
  f.pathways = f.pathways ?? [];
  for (const w of f.pathways) {
    const id = w?.id ?? 'pathway';
    signed(w, id);
    if (!w.name || !w.region) throw new Error(`Pathway ${id}: missing name or region.`);
    if (!Array.isArray(w.core) || w.core.length === 0) throw new Error(`Pathway ${id}: needs at least one core symptom.`);
    w.supporting = w.supporting ?? [];
    w.urgent = w.urgent ?? [];
    w.context = w.context ?? [];
    w.background = w.background ?? [];
    w.tests = w.tests ?? [];
    w.test_notes = w.test_notes ?? [];
    if (w.early) {
      signed(w.early, w.early.id ?? `${id} early warning`);
      if (!w.early.indicator || !(Number(w.early.count) >= 2) || !(Number(w.early.shift_sd) > 0) || !w.early.title || !w.early.why || !Array.isArray(w.early.steps) || w.early.steps.length === 0) throw new Error(`Pathway ${id}: the early warning needs an indicator, a count of 2 or more, a shift, a title, an explanation and at least one step.`);
    }
    w.min_supporting = Number(w.min_supporting ?? 1);
    if (!w.check?.title || !w.check.why) throw new Error(`Pathway ${id}: missing the check wording.`);
    for (const t of ['amber', 'red'] as const) {
      if (!w.titles?.[t] || !w.why?.[t]) throw new Error(`Pathway ${id}: missing the ${t} title or explanation.`);
      if (!Array.isArray(w.steps?.[t]) || w.steps[t].length === 0) throw new Error(`Pathway ${id}: needs at least one next step for ${t}.`);
    }
    for (const b of w.background) if (!b.text || !b.source || !b.link) throw new Error(`Pathway ${id}: every background line needs its source and link.`);
  }
  for (const t of TIERS) if (!Array.isArray(f.steps?.[t]) || f.steps[t].length === 0) throw new Error(`Every tier needs at least one next step: none for ${t}.`);
  f.monitor_alerts = f.monitor_alerts ?? [];
  if (!Array.isArray(f.monitor_alerts)) throw new Error('monitor_alerts must be a list of rules.');
  for (const m of f.monitor_alerts) {
    const id = m?.id ?? 'monitor alert';
    signed(m, id);
    if (!m.name || !m.title || !m.checks_for) throw new Error(`Monitor alert ${id}: needs a name, a title and the checks_for wording.`);
    if (!Number.isInteger(m.construct)) throw new Error(`Monitor alert ${id}: needs the emergency module's pathway number as construct.`);
    if (!Array.isArray(m.steps) || m.steps.length === 0) throw new Error(`Monitor alert ${id}: needs at least one first step.`);
    if (!Array.isArray(m.when) || m.when.length === 0) throw new Error(`Monitor alert ${id}: needs at least one group of conditions under when.`);
    m.groups = m.when.map((g) => {
      const entries = Object.entries(g ?? {});
      if (entries.length === 0) throw new Error(`Monitor alert ${id}: a condition group is empty.`);
      const group = entries.map(([field, cond]) => {
        if (!MONITOR_FIELDS.includes(field as MonitorField)) throw new Error(`Monitor alert ${id}: unknown vital sign "${field}".`);
        const hit = /^\s*(>=|<=|>|<)\s*(-?\d+(?:\.\d+)?)\s*$/.exec(String(cond));
        if (!hit) throw new Error(`Monitor alert ${id}: "${field}: ${cond}" is not a comparison such as ">= 38".`);
        return { field: field as MonitorField, op: hit[1] as MonitorOp, value: Number(hit[2]) };
      });
      // Oxygen saturation is less reliable at low cabin pressure, so it never raises an alert by itself.
      if (group.every((c) => c.field === 'spo2')) throw new Error(`Monitor alert ${id}: oxygen saturation may never raise an alert on its own.`);
      return group;
    });
  }
  return f;
}

export function round(n: number, dp = 1): number {
  const k = 10 ** dp;
  return Math.round((n + Number.EPSILON) * k) / k;
}
const fmt = (n: number, dp: number) => round(n, dp).toFixed(dp);
const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
function sampleSd(xs: number[]): number {
  if (xs.length < 2) return 0;
  const m = mean(xs);
  return Math.sqrt(xs.reduce((a, x) => a + (x - m) ** 2, 0) / (xs.length - 1));
}

/** Personal band: the person's own baseline mean, plus or minus k standard deviations. */
export function personalBand(baseline: number[], k: number, fixedSd?: number): Band {
  if (baseline.length === 0) throw new Error('No baseline values.');
  const sd = fixedSd ?? sampleSd(baseline);
  if (!(sd > 0)) throw new Error('Not enough baseline readings to work out a personal range.');
  const m = mean(baseline);
  return { low: m - k * sd, high: m + k * sd, mean: m, sd };
}

/** Which side of the band a value is on, counting only the side that matters. */
export function side(value: number, band: Band, watch: 'low' | 'high' | 'both' = 'both'): 'low' | 'high' | null {
  if (watch !== 'high' && value < band.low) return 'low';
  if (watch !== 'low' && value > band.high) return 'high';
  return null;
}

/** Tier of a single value against a band and optional limits. Used for chart points. */
export function tierFor(value: number, band: Band, refMin?: number, refMax?: number, watch: 'low' | 'high' | 'both' = 'both'): Tier {
  const s = side(value, band, watch);
  if (!s) return 'green';
  const beyond = (s === 'low' && refMin !== undefined && value < refMin) || (s === 'high' && refMax !== undefined && value > refMax);
  return beyond ? 'red' : 'amber';
}

/** Wording for a habitat reading: it belongs to the cabin, not to the person, and the sensor reports a one-hour average. */
export function cabinWords(text: string): string {
  return text
    .replace(/Your cabin carbon dioxide is/g, 'The one-hour average cabin carbon dioxide is')
    .replace(/Your cabin/g, 'The cabin').replace(/your cabin/g, 'the cabin')
    .replace(/Your last (\d+) readings of cabin/g, 'The last $1 logged one-hour averages of cabin')
    .replace(/Your last (\d+) readings average/g, 'The last $1 logged one-hour averages come to')
    .replace(/your own expected range/g, "the cabin's usual range")
    .replace(/within your own range/g, 'within its usual range').replace(/change from your own range/g, 'change from its usual range')
    .replace(/against your baseline of/g, "against the cabin's usual level of")
    .replace(/vs your baseline/g, "vs the cabin's usual level").replace(/same as your baseline/g, "same as the cabin's usual level");
}

function fill(template: string, vars: Record<string, string>): string {
  const out = template.replace(/\{(\w+)\}/g, (_, k: string) => vars[k] ?? `{${k}}`);
  // The cabin is shared, so it is "the cabin", not "your cabin".
  const shared = out.replace(/Your cabin/g, 'The cabin').replace(/your cabin/g, 'the cabin').replace(/Your last (\d+) readings of cabin/g, 'The last $1 readings of cabin');
  return vars.environment === 'yes' ? cabinWords(out) : shared;
}

/** Assess one new reading in the light of the person's baseline and earlier readings. */
export function assess(file: RuleFile, input: AssessInput): Assessment {
  const dp = input.dp;
  const band = personalBand(input.baseline, file.band.k, input.fixedSd);
  const s = side(input.value, band, input.watch);
  const series = [...input.history, input.value];
  const vars: Record<string, string> = {
    region: input.region,
    indicator: input.indicator.toLowerCase(),
    value: fmt(input.value, dp),
    unit: input.unit,
    direction: s === 'high' ? 'higher' : 'lower',
    bandLow: fmt(Math.max(band.low, input.displayMin ?? -Infinity), dp),
    bandHigh: fmt(Math.min(band.high, input.displayMax ?? Infinity), dp),
    baselineMean: fmt(band.mean, dp),
    limitLabel: input.limitLabel ?? 'limit',
    environment: input.environment ? 'yes' : 'no',
  };
  const findings: Finding[] = [];
  const add = (r: RuleDef, extra: Record<string, string> = {}) => {
    const placeholder = r.signed_off_by.trim().toLowerCase() === 'placeholder';
    findings.push({ ruleId: r.id, tier: r.tier, why: fill(r.why, { ...vars, ...extra }), source: r.source, confidence: r.confidence, placeholder, reviewedBy: placeholder ? null : r.signed_off_by });
  };
  for (const r of file.rules) {
    if (r.kind === 'level' && s) add(r);
    if (r.kind === 'limit' && s) {
      const lim = s === 'high' ? input.limitHigh : input.limitLow;
      if (lim !== undefined && (s === 'high' ? input.value > lim : input.value < lim)) add(r, { limit: fmt(lim, dp) });
    }
    if (r.kind === 'sustained' && s && series.length >= r.count!) {
      if (series.slice(-r.count!).every((v) => side(v, band, input.watch) === s)) add(r, { count: String(r.count) });
    }
    if (r.kind === 'trend' && series.length >= r.window!) {
      const m = mean(series.slice(-r.window!));
      const shift = (m - band.mean) / band.sd;
      const down = input.watch !== 'high' && shift < -r.shift_sd!;
      const up = input.watch !== 'low' && shift > r.shift_sd!;
      if (down || up) add(r, { window: String(r.window), trendMean: fmt(m, dp), direction: up ? 'higher' : 'lower' });
    }
  }
  // A sustained or limit finding already says what a single-reading finding would say.
  const strong = findings.some((x) => x.tier === 'red');
  const shown = strong ? findings.filter((x) => x.ruleId !== 'PB-01') : findings;
  shown.sort((a, b) => RANK[b.tier] - RANK[a.tier]);
  const tier: Tier = shown.length ? shown[0].tier : 'green';
  const delta = round(input.value - band.mean, dp);
  const sign = delta > 0 ? '+' : delta < 0 ? '−' : '';
  const personal = delta === 0 ? 'same as your baseline' : `${sign}${fmt(Math.abs(delta), dp)} ${input.unit} vs your baseline`;
  const deltaText = input.environment ? cabinWords(personal) : personal;
  const top = shown[0];
  return {
    tier,
    title: fill(tier === 'green' ? file.green.title : file.titles[tier], vars),
    why: tier === 'green' ? fill(file.green.why, vars) : shown.map((x) => x.why).join(' '),
    findings: shown,
    steps: file.steps[tier],
    source: top ? top.source : input.environment ? "The cabin's usual range. No rule fired." : 'Your own baseline. No rule fired.',
    confidence: top ? top.confidence : 'Low',
    placeholder: top ? top.placeholder : file.rules.every((r) => r.signed_off_by.trim().toLowerCase() === 'placeholder'),
    reviewedBy: top ? top.reviewedBy : null,
    band,
    delta,
    deltaText,
    ruleId: top ? shown.map((x) => x.ruleId).join(' + ') : 'none',
  };
}
