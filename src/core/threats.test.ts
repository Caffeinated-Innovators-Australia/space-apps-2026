// Tests for life threats: the conditions that open emergency mode, and where each sends the crew.
// AI assistance: drafted with Claude Code (see AI_USE.md).
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import seedJson from '../data/seed.json';
import { initialState, toggleSymptom } from './actions.ts';
import { parseRules } from './rules.ts';
import { lifeThreats } from './threats.ts';
import type { Seed, State } from './types.ts';
import { recordVitals } from './vitals.ts';

const seed = seedJson as unknown as Seed;
const text = readFileSync(new URL('../../rules/rules.yaml', import.meta.url), 'utf8');
const rules = parseRules(text);
const crew = 'crew-4';
const log = (s: State, ...labels: string[]) => labels.reduce((acc, l, i) => toggleSymptom(acc, crew, l, 1000 + i), s);
const threats = (s: State) => lifeThreats(s, seed, rules, crew);

describe('life threats', () => {
  it('has none at the start of the day, and none for an ordinary symptom', () => {
    expect(threats(initialState(seed))).toEqual([]);
    expect(threats(log(initialState(seed), 'Cough', 'Tired'))).toEqual([]);
  });
  it('sends chest pain and short of breath to their own checklists, and collapse to the built-in Emergency steps', () => {
    const t = threats(log(initialState(seed), 'Chest pain', 'Short of breath', 'Collapse'));
    expect(t.map((x) => x.construct)).toEqual([5, 2, undefined]);
    expect(t[2].action).toBe('Emergency');
    for (const x of t) { expect(x.ruleId).toBe('EMS-01'); expect(x.source).toBeTruthy(); }
  });
  it('raises a vital signs alert with its checklist', () => {
    const t = threats(recordVitals(initialState(seed), { crewId: crew, values: { temp: 38.6, sbp: 95, hr: 104, rr: 24 }, at: 1000 }));
    expect(t.map((x) => [x.kind, x.ruleId, x.construct])).toEqual([['vitals', 'SEP-01', 12]]);
  });
  it('raises a symptom pattern only when a red-flag symptom is logged with it', () => {
    const core = rules.pathways[0].core[0];
    const matched = log(initialState(seed), core, ...rules.pathways[0].supporting);
    expect(threats(matched).filter((x) => x.kind === 'pathway')).toEqual([]);
    const flagged = threats(log(matched, rules.pathways[0].urgent[0]));
    expect(flagged.filter((x) => x.kind === 'pathway').map((x) => x.construct)).toEqual([12]);
  });
  it('refuses a checklist for a symptom that is not on the list', () => {
    expect(() => parseRules(text.replace('"Short of breath": { construct: 2', '"Hiccups": { construct: 2'))).toThrow();
  });
});
