// Tests for symptom pathways: the kidney stone pattern from first symptom to exported case.
// AI assistance: drafted with Claude Code (see AI_USE.md).
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import seedJson from '../data/seed.json';
import { acknowledge, caseContent, exportOutbox, initialState, toggleSymptom } from './actions.ts';
import { logPain, logPathwayTest, pathwayAlerts, pathwayStatuses, sendPathwayCase, togglePathwayStep } from './pathways.ts';
import { parseRules } from './rules.ts';
import type { Seed, State } from './types.ts';

const seed = seedJson as unknown as Seed;
const text = readFileSync(new URL('../../rules/rules.yaml', import.meta.url), 'utf8');
const rules = parseRules(text);
const log = (s: State, crew: string, ...labels: string[]) => labels.reduce((acc, l, i) => toggleSymptom(acc, crew, l, 1000 + i), s);
const one = (s: State, crew = 'crew-4') => pathwayStatuses(s, seed, rules, crew)[0];

describe('kidney stone pathway (KS-01)', () => {
  it('uses only symptoms the crew can log', () => {
    for (const w of rules.pathways) for (const l of [...w.core, ...w.supporting, ...w.urgent]) expect([...seed.symptoms.options, ...(seed.symptoms.followUps ?? [])]).toContain(l);
  });
  it('keeps a follow-up question off the general symptom list', () => {
    for (const f of seed.symptoms.followUps ?? []) expect(seed.symptoms.options).not.toContain(f);
  });
  it('keeps the early warning and its steps when a core symptom alone is logged (crew-1, low fluid)', () => {
    const before = pathwayStatuses(initialState(seed), seed, rules, 'crew-1').find((x) => x.pathway.id === 'KS-01')!;
    expect(before.level).toBe('early');
    const after = pathwayStatuses(log(initialState(seed), 'crew-1', 'Pain in side or lower back'), seed, rules, 'crew-1').find((x) => x.pathway.id === 'KS-01')!;
    expect(after.level).toBe('early');
    expect(after.steps).toEqual(before.steps);
    expect(after.matched.core).toEqual(['Pain in side or lower back']);
  });
  it('adds the matched pattern to the early warning and does not replace it', () => {
    const s = pathwayStatuses(log(initialState(seed), 'crew-1', 'Pain in side or lower back', 'Blood in urine'), seed, rules, 'crew-1').find((x) => x.pathway.id === 'KS-01')!;
    expect(s.level).toBe('amber');
    expect(s.earlier?.ruleId).toBe('KS-00');
  });
  it('raises nothing without the core symptom', () => {
    expect(pathwayStatuses(log(initialState(seed), 'crew-4', 'Nauseous', 'Blood in urine'), seed, rules, 'crew-4')).toEqual([]);
  });
  it('asks the follow-up questions when only the core symptom is logged, and raises no alert', () => {
    const s = log(initialState(seed), 'crew-4', 'Pain in side or lower back');
    expect(one(s).level).toBe('check');
    expect(one(s).steps).toEqual([]);
    expect(pathwayAlerts(s, seed, rules, 'crew-4')).toEqual([]);
  });
  it('is a crew medic matter when a supporting symptom joins the core one, and never names a finding', () => {
    const s = log(initialState(seed), 'crew-4', 'Pain in side or lower back', 'Blood in urine');
    const p = one(s);
    expect(p.level).toBe('amber');
    expect(p.why).toContain('pain in side or lower back and blood in urine');
    expect(p.why).toContain('not a diagnosis');
    expect(p.steps[0]).toBe('Tell your crew medic.');
    expect(p.placeholder).toBe(true);
  });
  it('is urgent when fever or being unable to pass urine is logged on top', () => {
    const s = log(initialState(seed), 'crew-4', 'Pain in side or lower back', 'Fever or chills');
    expect(one(s).level).toBe('red');
    expect(pathwayAlerts(s, seed, rules, 'crew-4')[0].tier).toBe('red');
  });
  it('shows the fluid drift for the crew member whose intake has fallen, and not for one whose has not', () => {
    const s = log(log(initialState(seed), 'crew-1', 'Pain in side or lower back'), 'crew-3', 'Pain in side or lower back');
    expect(one(s, 'crew-1').context.find((c) => c.indicatorId === 'fluid')!.flagged).toBe(true);
    expect(one(s, 'crew-3').context.find((c) => c.indicatorId === 'fluid')!.flagged).toBe(false);
  });
  it('keeps each person separate', () => {
    const s = log(initialState(seed), 'crew-4', 'Pain in side or lower back', 'Blood in urine');
    expect(pathwayStatuses(s, seed, rules, 'crew-3')).toEqual([]);
  });
  it('logs pain scores from 0 to 10 and refuses anything else', () => {
    const s = logPain(initialState(seed), { crewId: 'crew-4', pathwayId: 'KS-01', score: 7, at: 5 });
    expect(s.painLog).toHaveLength(1);
    expect(() => logPain(s, { crewId: 'crew-4', pathwayId: 'KS-01', score: 11, at: 6 })).toThrow();
    expect(() => logPain(s, { crewId: 'crew-4', pathwayId: 'KS-01', score: 2.5, at: 6 })).toThrow();
  });
  it('will not send a case until the pattern is matched', () => {
    const s = log(initialState(seed), 'crew-4', 'Pain in side or lower back');
    expect(() => sendPathwayCase(s, seed, rules, { crewId: 'crew-4', pathwayId: 'KS-01', settingId: 'mars-base', at: 9 })).toThrow();
  });
  it('sends one case that carries symptoms, pain scores, trends and ticked steps, including those logged after it was queued', () => {
    let s = log(initialState(seed), 'crew-4', 'Pain in side or lower back', 'Nauseous');
    const sent = sendPathwayCase(s, seed, rules, { crewId: 'crew-4', pathwayId: 'KS-01', settingId: 'mars-base', at: 2000 });
    s = sent.state;
    expect(sendPathwayCase(s, seed, rules, { crewId: 'crew-4', pathwayId: 'KS-01', settingId: 'mars-base', at: 3000 }).pack.id).toBe(sent.pack.id);
    s = logPain(s, { crewId: 'crew-4', pathwayId: 'KS-01', score: 6, at: 2500 });
    s = togglePathwayStep(s, 'pathway:crew-4:KS-01', 'Tell your crew medic.');
    const c = caseContent(s, seed, rules, sent.pack.id);
    expect(c.kind).toBe('symptom-pathway');
    if (c.kind !== 'symptom-pathway') return;
    expect(c.assessment.tier).toBe('red');
    expect(c.painScores).toEqual([{ score: 6, outOf: 10, at: new Date(2500).toISOString() }]);
    expect(c.symptoms.map((x) => x.label)).toEqual(['Pain in side or lower back', 'Nauseous']);
    expect(c.stepsDone).toEqual(['Tell your crew medic.']);
    expect(c.note).toContain('Not a diagnosis');
    const out = exportOutbox(s, seed, rules, 4000);
    expect(out.file.format).toBe('crew-health-case-export/3');
    expect(out.file.cases[0].status).toBe('exported');
  });
  it('can be acknowledged like any other alert', () => {
    const s = log(initialState(seed), 'crew-4', 'Pain in side or lower back', 'Blood in urine');
    const key = pathwayAlerts(s, seed, rules, 'crew-4')[0].key;
    expect(acknowledge(s, key).acknowledged).toContain(key);
  });
  it('refuses a pathway with no source or sign-off field', () => {
    expect(() => parseRules(text.replace(/    source: "Placeholder rule, awaiting clinician review. The symptom pattern[^\n]*\n/, ''))).toThrow(/KS-01 has no source/);
  });
  it('warns early, before any symptom, when fluid has been low for three logged days, and names NASA as the source of the risk', () => {
    const p = pathwayStatuses(initialState(seed), seed, rules, 'crew-1')[0];
    expect(p.level).toBe('early');
    expect(p.ruleId).toBe('KS-00');
    expect(p.title).toBe('Kidneys and urine: low fluid for 3 days');
    expect(p.why).toContain('not a finding');
    expect(p.source).toContain('Risk of Renal Stone Formation');
    expect(pathwayAlerts(initialState(seed), seed, rules, 'crew-1')[0].tier).toBe('amber');
    expect(pathwayStatuses(initialState(seed), seed, rules, 'crew-3')).toEqual([]);
    expect(() => sendPathwayCase(initialState(seed), seed, rules, { crewId: 'crew-1', pathwayId: 'KS-01', settingId: 'mars-base', at: 1 })).toThrow();
  });
  it('logs a urine strip result with the case and never lets it change the tier', () => {
    let s = log(initialState(seed), 'crew-4', 'Pain in side or lower back', 'Nauseous');
    const before = one(s).level;
    s = logPathwayTest(s, rules, { crewId: 'crew-4', pathwayId: 'KS-01', testId: 'urine-strip', result: 'Present' });
    expect(one(s).level).toBe(before);
    const sent = sendPathwayCase(s, seed, rules, { crewId: 'crew-4', pathwayId: 'KS-01', settingId: 'mars-18', at: 5 });
    const c = caseContent(sent.state, seed, rules, sent.pack.id);
    expect(c.kind === 'symptom-pathway' && c.tests[0].result).toBe('Present');
    expect(() => logPathwayTest(s, rules, { crewId: 'crew-4', pathwayId: 'KS-01', testId: 'urine-strip', result: 'Maybe' })).toThrow();
  });
});
