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

/** The whole rules file, checked. */
export interface RuleFile {
  version: string;
  band: { method: 'baseline-mean-sd'; k: number };
  green: { title: string; why: string };
  titles: Record<'amber' | 'red', string>;
  rules: RuleDef[];
  combined: CombinedRule;
  prompts: PromptRule[];
  steps: Record<Tier, string[]>;
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
  for (const t of TIERS) if (!Array.isArray(f.steps?.[t]) || f.steps[t].length === 0) throw new Error(`Every tier needs at least one next step: none for ${t}.`);
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

function fill(template: string, vars: Record<string, string>): string {
  const out = template.replace(/\{(\w+)\}/g, (_, k: string) => vars[k] ?? `{${k}}`);
  // The cabin is shared, so it is "the cabin", not "your cabin".
  return out.replace(/Your cabin/g, 'The cabin').replace(/your cabin/g, 'the cabin').replace(/Your last (\d+) readings of cabin/g, 'The last $1 readings of cabin');
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
    bandLow: fmt(band.low, dp),
    bandHigh: fmt(band.high, dp),
    baselineMean: fmt(band.mean, dp),
    limitLabel: input.limitLabel ?? 'limit',
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
  const deltaText = delta === 0 ? 'same as your baseline' : `${sign}${fmt(Math.abs(delta), dp)} ${input.unit} vs your baseline`;
  const top = shown[0];
  return {
    tier,
    title: fill(tier === 'green' ? file.green.title : file.titles[tier], vars),
    why: tier === 'green' ? fill(file.green.why, vars) : shown.map((x) => x.why).join(' '),
    findings: shown,
    steps: file.steps[tier],
    source: top ? top.source : 'Your own baseline. No rule fired.',
    confidence: top ? top.confidence : 'Low',
    placeholder: top ? top.placeholder : file.rules.every((r) => r.signed_off_by.trim().toLowerCase() === 'placeholder'),
    reviewedBy: top ? top.reviewedBy : null,
    band,
    delta,
    deltaText,
    ruleId: top ? shown.map((x) => x.ruleId).join(' + ') : 'none',
  };
}
