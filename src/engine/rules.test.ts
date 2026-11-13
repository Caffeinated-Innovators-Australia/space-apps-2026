import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { assess, parseRules, personalBand, tierFor } from './rules';

const text = readFileSync('rules/rules.yaml', 'utf8');
const rule = parseRules(text)[0];
const base = { region: 'Blood', indicator: 'Haemoglobin', unit: 'g/dL', baseline: [14.6, 14.9, 14.7], refMin: 13.2, refMax: 17.1 };

describe('rules file', () => {
  it('loads and every tier has steps', () => {
    for (const t of ['green', 'amber', 'red'] as const) expect(rule.tiers[t].steps.length).toBeGreaterThan(0);
  });
  it('refuses a rule with no source (AT-08)', () => {
    expect(() => parseRules(text.replace(/^\s+source:.*$/m, ''))).toThrow(/no source/);
  });
  it('refuses a rule with no sign-off field', () => {
    expect(() => parseRules(text.replace(/^\s+signed_off_by:.*$/m, ''))).toThrow(/signed_off_by/);
  });
});

describe('tiering (AT-03)', () => {
  it('builds the personal band from the baseline', () => {
    const b = personalBand([14.6, 14.9, 14.7], 5);
    expect(b.low).toBeCloseTo(13.863, 2);
    expect(b.high).toBeCloseTo(15.637, 2);
  });
  it('sorts one reading into each tier', () => {
    expect(assess(rule, { ...base, value: 14.4 }).tier).toBe('green');
    expect(assess(rule, { ...base, value: 13.4 }).tier).toBe('amber');
    expect(assess(rule, { ...base, value: 12.6 }).tier).toBe('red');
  });
  it('treats band edges as inside', () => {
    const b = { low: 10, high: 12, mean: 11 };
    expect(tierFor(10, b, 9, 13)).toBe('green');
    expect(tierFor(12, b, 9, 13)).toBe('green');
    expect(tierFor(9, b, 9, 13)).toBe('amber');
    expect(tierFor(8.9, b, 9, 13)).toBe('red');
  });
  it('explains in plain words with no unfilled gaps', () => {
    const a = assess(rule, { ...base, value: 13.4 });
    expect(a.why).toContain('13.4 g/dL');
    expect(a.why).toContain('lower');
    expect(a.why + a.title + a.steps.join(' ')).not.toMatch(/[{}]/);
    expect(a.deltaText).toBe('−1.3 g/dL vs your baseline');
  });
  it('marks placeholder rules and shows no review badge', () => {
    const a = assess(rule, { ...base, value: 14.4 });
    expect(a.placeholder).toBe(true);
    expect(a.reviewedBy).toBeNull();
  });
});
