// Tests for symptom pathways: the kidney stone pattern from first symptom to exported case.
// AI assistance: drafted with Claude Code (see AI_USE.md).
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import seedJson from '../data/seed.json';
import { acknowledge, caseContent, exportOutbox, initialState, toggleSymptom } from './actions.ts';
import { emergencySymptoms, logPain, logPathwayTest, pathwayAlerts, pathwayStatuses, sendPathwayCase, testNote, togglePathwayStep, vitalsPrompt } from './pathways.ts';
import { recordVitals } from './vitals.ts';
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
    expect(p.placeholder).toBe(false);
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
    expect(() => parseRules(text.replace(/    source: "Signed off by the clinical lead on 15 Nov 2026 \(CR-25[^\n]*\n/, ''))).toThrow(/KS-01 has no source/);
  });
  it('warns early, before any symptom, when fluid has been low for three logged days (CR-29), and names NASA as the source of the risk', () => {
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

describe('emergency symptoms (EMS-01)', () => {
  it('uses only symptoms the crew can log', () => {
    for (const l of rules.emergency_symptoms!.symptoms) expect(seed.symptoms.options).toContain(l);
  });
  it('is raised by one symptom alone, and names the rule and its source', () => {
    for (const l of ['Chest pain', 'Short of breath', 'Collapse']) {
      const hit = emergencySymptoms(log(initialState(seed), 'crew-4', l), rules, 'crew-4');
      expect(hit?.symptoms).toEqual([l]);
      expect(hit?.title).toBe('Press Emergency now');
      expect(hit?.ruleId).toBe('EMS-01');
      expect(hit?.source).toBeTruthy();
      expect(hit?.placeholder).toBe(false);
    }
  });
  it('is not raised by other symptoms, or for another person', () => {
    const s = log(initialState(seed), 'crew-4', 'Cough', 'Chest pain');
    expect(emergencySymptoms(log(initialState(seed), 'crew-4', 'Cough', 'Tired'), rules, 'crew-4')).toBeNull();
    expect(emergencySymptoms(s, rules, 'crew-1')).toBeNull();
  });
  it('clears when the symptom is tapped again', () => {
    const s = toggleSymptom(log(initialState(seed), 'crew-4', 'Chest pain'), 'crew-4', 'Chest pain', 2000);
    expect(emergencySymptoms(s, rules, 'crew-4')).toBeNull();
  });
  it('refuses the rule without a source', () => {
    expect(() => parseRules(text.replace(/(id: EMS-01[\s\S]*?)source: .*\n/, '$1'))).toThrow();
  });
});

describe('a measured fever counts in the kidney pathway (CR-58)', () => {
  const vitals = (st: State, temp: number, at: number) => recordVitals(st, { crewId: 'crew-4', values: { temp, hr: 90, sbp: 120, dbp: 80, rr: 16 }, at });
  it('counts a temperature at or above the rule value as "Fever or chills" and says where it came from', () => {
    const s = vitals(log(initialState(seed), 'crew-4', 'Pain in side or lower back', 'Nauseous'), 38.6, 5000);
    const p = one(s);
    expect(p.level).toBe('red');
    expect(p.matched.urgent).toEqual(['Fever or chills']);
    expect(p.fromVitals).toEqual([{ symptom: 'Fever or chills', reading: 'Temperature 38.6 °C' }]);
    expect(p.why).toContain('Fever or chills is counted from your latest vital signs (Temperature 38.6 °C).');
  });
  it('is cleared by a newer set without a fever, and never opens the pathway by itself', () => {
    let s = vitals(log(initialState(seed), 'crew-4', 'Pain in side or lower back', 'Nauseous'), 38.6, 5000);
    s = vitals(s, 37.0, 6000);
    expect(one(s).level).toBe('amber');
    expect(one(s).fromVitals).toEqual([]);
    expect(pathwayStatuses(vitals(initialState(seed), 39, 5000), seed, rules, 'crew-4').filter((x) => x.level !== 'early')).toEqual([]);
  });
  it('does not count the symptom twice when it was also logged', () => {
    const s = vitals(log(initialState(seed), 'crew-4', 'Pain in side or lower back', 'Fever or chills'), 38.6, 5000);
    expect(one(s).fromVitals).toEqual([]);
    expect(one(s).matched.urgent).toEqual(['Fever or chills']);
  });
  it('refuses a from_vitals symptom that is not on the pathway', () => {
    expect(() => parseRules(text.replace('"Fever or chills": { temp:', '"Headache": { temp:'))).toThrow(/from_vitals/);
  });
});

describe('urine strip notes (CR-41)', () => {
  const ks = rules.pathways.find((p) => p.id === 'KS-01')!;
  it('notes possible infection for nitrite and leucocytes, with or without blood, and keeps the blood-only line', () => {
    expect(testNote(ks, { 'urine-strip': 'Present', 'urine-nitrite': 'Positive', 'urine-leuk': 'Positive' })).toBe('Blood, nitrite and leucocytes present: possible infection.');
    for (const blood of ['Not present', 'Not done']) expect(testNote(ks, { 'urine-strip': blood, 'urine-nitrite': 'Positive', 'urine-leuk': 'Positive' })).toBe('Nitrite and leucocytes present: possible infection.');
    expect(testNote(ks, { 'urine-strip': 'Present', 'urine-nitrite': 'Negative', 'urine-leuk': 'Negative' })).toBe('Blood present, no signs of infection.');
    expect(testNote(ks, { 'urine-strip': 'Present', 'urine-nitrite': 'Positive', 'urine-leuk': 'Negative' })).toBeUndefined();
  });
});

describe('asks for vital signs after fever or chills is logged (VP-01, CR-58)', () => {
  const vitals = (st: State, at: number) => recordVitals(st, { crewId: 'crew-4', values: { temp: 37, hr: 80, sbp: 120, dbp: 80, rr: 14 }, at });
  it('asks when fever or chills is logged with no set taken since, and stops once a set is recorded', () => {
    const s = log(initialState(seed), 'crew-4', 'Fever or chills');
    const p = vitalsPrompt(s, rules, 'crew-4');
    expect(p?.title).toBe('Record your vital signs');
    expect(p?.why).toContain('You logged fever or chills.');
    expect(vitalsPrompt(vitals(s, 5000), rules, 'crew-4')).toBeNull();
    expect(vitalsPrompt(s, rules, 'crew-1')).toBeNull();
  });
  it('asks again if the symptom is logged after the last set', () => {
    const s = log(vitals(initialState(seed), 500), 'crew-4', 'Fever or chills');
    expect(vitalsPrompt(s, rules, 'crew-4')).not.toBeNull();
    expect(vitalsPrompt(log(initialState(seed), 'crew-4', 'Nauseous'), rules, 'crew-4')).toBeNull();
  });
});
