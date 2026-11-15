import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { assess, parseRules, personalBand, side, tierFor } from './rules.ts';

const text = readFileSync('rules/rules.yaml', 'utf8');
const rules = parseRules(text);
const base = { region: 'Sleep', indicator: 'Sleep', unit: 'h', dp: 1, watch: 'low' as const, baseline: [7, 7.5, 6.5, 7, 7.5, 6.5, 7], history: [] as number[] };
// baseline mean 7.0, sample sd 0.41, band about 6.18 to 7.82

describe('rules file', () => {
  it('loads, and every tier has steps', () => {
    for (const t of ['green', 'amber', 'red'] as const) expect(rules.steps[t].length).toBeGreaterThan(0);
  });
  it('refuses a rule with no source (AT-08)', () => {
    expect(() => parseRules(text.replace(/^\s+source: "Signed off by the clinical lead on 15 Nov 2026 \(CR-02, CR-12, CR-14, CR-16\)\. The band.*$/m, ''))).toThrow(/no source/);
  });
  it('refuses a rule with no sign-off field', () => {
    expect(() => parseRules(text.replace(/^    signed_off_by: placeholder$/m, ''))).toThrow(/signed_off_by/);
  });
});

describe('personal band', () => {
  it('is the baseline mean plus or minus two standard deviations', () => {
    const b = personalBand(base.baseline, 2);
    expect(b.mean).toBeCloseTo(7, 5);
    expect(b.low).toBeCloseTo(6.18, 1);
    expect(b.high).toBeCloseTo(7.82, 1);
  });
  it('uses a standard deviation from real crew data when given one', () => {
    const b = personalBand([14.6, 14.9, 14.7], 2, 0.601);
    expect(b.low).toBeCloseTo(13.531, 2);
  });
  it('only counts the side that matters', () => {
    const b = { low: 6, high: 8, mean: 7, sd: 0.5 };
    expect(side(9, b, 'low')).toBeNull();
    expect(side(5, b, 'low')).toBe('low');
    expect(side(9, b, 'high')).toBe('high');
    expect(tierFor(9, b, undefined, 8.5, 'both')).toBe('red');
  });
});

describe('tiering (AT-03)', () => {
  it('green inside the band', () => {
    const a = assess(rules, { ...base, value: 6.9 });
    expect(a.tier).toBe('green');
    expect(a.findings).toHaveLength(0);
  });
  it('amber for one reading outside the band (PB-01)', () => {
    const a = assess(rules, { ...base, value: 5.9 });
    expect(a.tier).toBe('amber');
    expect(a.ruleId).toContain('PB-01');
    expect(a.why).toContain('lower');
  });
  it('ignores the side that does not matter: a long sleep is not flagged', () => {
    expect(assess(rules, { ...base, value: 9.5 }).tier).toBe('green');
  });
  it('amber for a slow drift while every reading stays inside the band (TR-01)', () => {
    const a = assess(rules, { ...base, history: [6.5, 6.5, 6.4, 6.5, 6.4, 6.4], value: 6.4 });
    expect(a.tier).toBe('amber');
    expect(a.ruleId).toBe('TR-01');
    expect(a.why).toContain('drifted');
  });
  it('red for three readings in a row outside the band (SU-01)', () => {
    const a = assess(rules, { ...base, history: [7, 5.9, 5.8], value: 5.9 });
    expect(a.tier).toBe('red');
    expect(a.ruleId).toContain('SU-01');
    expect(a.ruleId).not.toContain('PB-01');
  });
  it('red when outside the band and beyond a sourced limit (LM-01)', () => {
    const a = assess(rules, { region: 'Cabin', indicator: 'Cabin carbon dioxide', unit: 'mmHg', dp: 1, watch: 'high', baseline: [2.1, 2.3, 2.0, 2.2, 2.4, 2.2], history: [], value: 3.4, limitHigh: 3, limitLabel: 'NASA cabin limit' });
    expect(a.tier).toBe('red');
    expect(a.why).toContain('NASA cabin limit of 3.0 mmHg');
  });
  it('explains in plain words with no unfilled gaps, and marks sign-off', () => {
    const a = assess(rules, { ...base, history: [6.5, 6.5, 6.4, 6.5, 6.4, 6.4], value: 5.9 });
    expect(a.why + a.title + a.steps.join(' ')).not.toMatch(/[{}]/);
    expect(a.placeholder).toBe(false);
    expect(a.reviewedBy).toBe('clinical lead');
    expect(a.deltaText).toBe('−1.1 h vs your baseline');
  });
});
