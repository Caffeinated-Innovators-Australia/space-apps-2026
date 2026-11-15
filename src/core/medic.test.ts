// Tests for the crew medic's view: the privacy boundary first, then sorting and the sign-off list.
// AI assistance: drafted with Claude Code (see AI_USE.md).
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { initialState, parseRules, recordReading, sendCase, sendPathwayCase, toggleSymptom, type Seed, type State } from './index.ts';
import { crewOverview, rulesAwaitingSignOff } from './medic.ts';

const rules = parseRules(readFileSync('rules/rules.yaml', 'utf8'));
const seed = JSON.parse(readFileSync('src/data/seed.json', 'utf8')) as Seed;
const rec = (s: State, indicatorId: string, value: number, at: number, crewId = 'crew-1') => recordReading(s, seed, rules, { crewId, indicatorId, value, at });

describe('crewOverview privacy boundary', () => {
  it('never shows an unsent amber result, a mood log or a symptom log', () => {
    let s = initialState(seed);
    const sleep = rec(s, 'sleep', 6.2, 1000);
    expect(sleep.assessment.tier).toBe('amber');
    s = sleep.state;
    s = rec(s, 'mood', 1, 2000).state;
    s = toggleSymptom(s, 'crew-1', 'Headache', 3000);
    s = toggleSymptom(s, 'crew-1', 'Low mood', 3100);
    const out = crewOverview(s, seed, rules);
    const text = JSON.stringify(out);
    for (const banned of ['6.2', 'Sleep', 'sleep', 'Mood', 'mood', 'Headache', 'Low mood', 'amber', '"value"', 'r-1000', 'r-2000']) expect(text).not.toContain(banned);
    const jo = out.find((r) => r.crewId === 'crew-1')!;
    expect(jo.nothingShared).toBe(true);
    expect(jo.cases.count).toBe(0);
    expect(jo.checkIns).toMatchObject({ done: 2, total: 6 });
  });

  it('shows a sent case as a count and tier only, never its value', () => {
    let s = initialState(seed);
    const sleep = rec(s, 'sleep', 6.2, 1000);
    s = sendCase(sleep.state, { readingId: sleep.reading.id, settingId: 'mars-base', at: 1500 }).state;
    const out = crewOverview(s, seed, rules);
    const jo = out[0];
    expect(jo.crewId).toBe('crew-1');
    expect(jo.cases).toEqual({ count: 1, topTier: 'amber', newestAt: 1500 });
    expect(jo.nothingShared).toBe(false);
    const text = JSON.stringify(out);
    expect(text).not.toContain('6.2');
    expect(text).not.toContain('Sleep');
  });

  it('shows an Urgent result only once a repeat reading confirms it, and never the values', () => {
    let s = initialState(seed);
    const one = rec(s, 'haemoglobin', 9.1, 1000, 'crew-2');
    expect(one.assessment.tier).toBe('red');
    s = one.state;
    expect(crewOverview(s, seed, rules).find((r) => r.crewId === 'crew-2')!.confirmedUrgent).toEqual([]);
    s = rec(s, 'haemoglobin', 9.3, 2000, 'crew-2').state;
    const out = crewOverview(s, seed, rules);
    expect(out[0].crewId).toBe('crew-2');
    expect(out[0].topTier).toBe('red');
    expect(out[0].confirmedUrgent).toEqual([{ indicatorId: 'haemoglobin', indicator: 'Haemoglobin', at: 2000 }]);
    const text = JSON.stringify(out);
    expect(text).not.toContain('9.1');
    expect(text).not.toContain('9.3');
  });

  it('shows an Urgent symptom pattern only when a case was sent for it, without any symptom label', () => {
    let s = initialState(seed);
    for (const label of ['Pain in side or lower back', 'Blood in urine', 'Fever or chills']) s = toggleSymptom(s, 'crew-3', label, 1000);
    const before = crewOverview(s, seed, rules).find((r) => r.crewId === 'crew-3')!;
    expect(before.urgentPathways).toEqual([]);
    expect(before.nothingShared).toBe(true);
    s = sendPathwayCase(s, seed, rules, { crewId: 'crew-3', pathwayId: 'KS-01', settingId: 'mars-base', at: 2000 }).state;
    const out = crewOverview(s, seed, rules);
    expect(out[0].crewId).toBe('crew-3');
    expect(out[0].urgentPathways).toEqual([{ pathwayId: 'KS-01', checkFor: 'Kidneys and urine' }]);
    const text = JSON.stringify(out);
    for (const banned of ['Pain in side', 'Blood in urine', 'Fever', 'kidney stone']) expect(text).not.toContain(banned);
  });

  it('shares cabin readings with everyone', () => {
    const s = rec(initialState(seed), 'cabin-co2', 3.4, 1000, 'crew-4').state;
    const out = crewOverview(s, seed, rules);
    for (const r of out) expect(r.cabin).toEqual([expect.objectContaining({ indicatorId: 'cabin-co2', value: 3.4, tier: 'red' })]);
    expect(out.every((r) => r.confirmedUrgent.length === 0)).toBe(true);
  });
});

describe('rulesAwaitingSignOff', () => {
  it('lists every rule, combined rule, prompt rule, pathway and early warning', () => {
    const list = rulesAwaitingSignOff(rules);
    const expected = rules.rules.length + 1 + rules.prompts.length + rules.pathways.length + rules.pathways.filter((p) => p.early).length;
    expect(list).toHaveLength(expected);
    expect(list.map((x) => x.id)).toEqual(expect.arrayContaining(['LM-01', 'CM-01', 'PR-01', 'KS-01', 'KS-00']));
    for (const x of list) expect(x.source && x.confidence && x.what).toBeTruthy();
    // Signed off by the clinical lead on 15 Nov 2026 (CR-29); every other rule here still awaits sign-off.
    // Signed off by the clinical lead on 15 Nov 2026 (CR-25, CR-29, CR-41, CR-43, CR-58).
    for (const id of ['KS-00', 'KS-01']) expect(list.find((x) => x.id === id)?.placeholder).toBe(false);
    expect(list.filter((x) => !['KS-00', 'KS-01'].includes(x.id)).every((x) => x.placeholder)).toBe(true);
  });
});
