// Deterministic rules engine. Rules decide; no language model runs in the app.
// AI assistance: drafted with Claude Code (see AI_USE.md).
import { load } from 'js-yaml';

export type Tier = 'green' | 'amber' | 'red';
export const TIERS: Tier[] = ['green', 'amber', 'red'];

export interface TierRule {
  when: string;
  title: string;
  why: string;
  steps: string[];
}

export interface Rule {
  id: string;
  name: string;
  band: { method: 'baseline-range'; margin_percent: number };
  source: string;
  confidence: string;
  signed_off_by: string;
  tiers: Record<Tier, TierRule>;
}

export interface Band {
  low: number;
  high: number;
  mean: number;
}

export interface Assessment {
  tier: Tier;
  title: string;
  why: string;
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
  value: number;
  baseline: number[];
  refMin: number;
  refMax: number;
}

const WHEN: Record<Tier, string> = {
  green: 'inside_band',
  amber: 'outside_band_inside_reference',
  red: 'outside_band_outside_reference',
};

/** Parse and check the rules file. Throws a plain-language error if a rule is unsafe to use. */
export function parseRules(text: string): Rule[] {
  const doc = load(text) as { rules?: unknown };
  if (!doc || !Array.isArray(doc.rules) || doc.rules.length === 0) {
    throw new Error('Rules file has no rules.');
  }
  return (doc.rules as Rule[]).map((r, i) => {
    const id = r?.id ?? `rule ${i + 1}`;
    if (!r.source || !String(r.source).trim()) throw new Error(`Rule ${id} has no source. Every threshold must show its source.`);
    if (!r.signed_off_by || !String(r.signed_off_by).trim()) throw new Error(`Rule ${id} has no signed_off_by field. Use a clinician role, or "placeholder".`);
    if (!r.confidence) throw new Error(`Rule ${id} has no confidence label.`);
    if (r.band?.method !== 'baseline-range' || !(r.band.margin_percent >= 0)) throw new Error(`Rule ${id} has no valid band.`);
    for (const t of TIERS) {
      const tr = r.tiers?.[t];
      if (!tr) throw new Error(`Rule ${id} has no ${t} tier.`);
      if (tr.when !== WHEN[t]) throw new Error(`Rule ${id}, ${t} tier: unknown condition "${tr.when}".`);
      if (!tr.why || !tr.title) throw new Error(`Rule ${id}, ${t} tier: missing title or why line.`);
      if (!Array.isArray(tr.steps) || tr.steps.length === 0) throw new Error(`Rule ${id}, ${t} tier: every tier needs at least one next step.`);
    }
    return r;
  });
}

export function round(n: number, dp = 1): number {
  const f = 10 ** dp;
  return Math.round((n + Number.EPSILON) * f) / f;
}

/** Personal band: lowest to highest baseline value, widened by margin_percent of the baseline mean. */
export function personalBand(baseline: number[], marginPercent: number): Band {
  if (baseline.length === 0) throw new Error('No baseline values.');
  const mean = baseline.reduce((a, b) => a + b, 0) / baseline.length;
  const margin = (mean * marginPercent) / 100;
  return { low: Math.min(...baseline) - margin, high: Math.max(...baseline) + margin, mean };
}

export function tierFor(value: number, band: Band, refMin: number, refMax: number): Tier {
  if (value >= band.low && value <= band.high) return 'green';
  if (value >= refMin && value <= refMax) return 'amber';
  return 'red';
}

function fmt(n: number, dp: number): string {
  return round(n, dp).toFixed(dp).replace(/\.0+$/, (m) => (dp > 0 && m.length - 1 === dp ? '' : m));
}

function fill(template: string, vars: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_, k: string) => vars[k] ?? `{${k}}`);
}

export function assess(rule: Rule, input: AssessInput, dp = 1): Assessment {
  const band = personalBand(input.baseline, rule.band.margin_percent);
  const tier = tierFor(input.value, band, input.refMin, input.refMax);
  const delta = round(input.value - band.mean, dp);
  const sign = delta > 0 ? '+' : delta < 0 ? '−' : '';
  const deltaText = delta === 0 ? 'same as your baseline' : `${sign}${fmt(Math.abs(delta), dp)} ${input.unit} vs your baseline`;
  const vars: Record<string, string> = {
    region: input.region,
    indicator: input.indicator.toLowerCase(),
    value: fmt(input.value, dp),
    unit: input.unit,
    direction: input.value < band.low ? 'lower' : 'higher',
    bandLow: fmt(band.low, dp),
    bandHigh: fmt(band.high, dp),
    refMin: fmt(input.refMin, dp),
    refMax: fmt(input.refMax, dp),
  };
  const t = rule.tiers[tier];
  const placeholder = rule.signed_off_by.trim().toLowerCase() === 'placeholder';
  return {
    tier,
    title: fill(t.title, vars),
    why: fill(t.why, vars),
    steps: t.steps.map((s) => fill(s, vars)),
    source: rule.source,
    confidence: rule.confidence,
    placeholder,
    reviewedBy: placeholder ? null : rule.signed_off_by,
    band,
    delta,
    deltaText,
    ruleId: rule.id,
  };
}
