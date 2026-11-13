import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { assessValue, casePackContent, confirmation, demoValues, exportOutbox, history, initialState, parseRules, recordReading, sendCase, toggleStep, toggleSymptom, type Seed } from './index.ts';

const rule = parseRules(readFileSync('rules/rules.yaml', 'utf8'))[0];
const seed = JSON.parse(readFileSync('src/data/seed.json', 'utf8')) as Seed;

describe('action layer', () => {
  it('uses the variation figures computed from the real NASA crew data', () => {
    const osd = JSON.parse(readFileSync('src/data/osd569_cbc.json', 'utf8')) as { variation: Record<string, { pooledSd: number }> };
    for (const i of seed.indicators) expect(i.withinPersonSd).toBe(osd.variation[i.name].pooledSd);
  });
  it('assesses the same value differently for different people', () => {
    expect(assessValue(seed, rule, 'crew-2', 'haemoglobin', 13.4).tier).toBe('amber');
    expect(assessValue(seed, rule, 'crew-1', 'haemoglobin', 13.4).tier).toBe('green');
  });
  it('works for every crew member and indicator, one demo value per tier', () => {
    for (const c of seed.crew) for (const i of seed.indicators) {
      const tiers = demoValues(seed, rule, c.id, i.id).map((v) => assessValue(seed, rule, c.id, i.id, v).tier);
      expect(tiers[0]).toBe('green');
      expect(tiers[tiers.length - 1]).toBe('red');
    }
  });
  it('refuses unknown people, unknown indicators and bad values in plain words', () => {
    expect(() => assessValue(seed, rule, 'nobody', 'haemoglobin', 13)).toThrow(/Unknown crew member/);
    expect(() => assessValue(seed, rule, 'crew-1', 'pulse', 60)).toThrow(/Unknown indicator/);
    expect(() => assessValue(seed, rule, 'crew-1', 'haemoglobin', -1)).toThrow(/above zero/);
  });
  it('marks a raised result as unconfirmed until a second reading agrees', () => {
    let s = initialState(seed);
    const a = recordReading(s, seed, rule, { crewId: 'crew-2', indicatorId: 'haemoglobin', value: 13.4, at: 1000 });
    expect(confirmation(a.state, a.reading).status).toBe('unconfirmed');
    const b = recordReading(a.state, seed, rule, { crewId: 'crew-2', indicatorId: 'haemoglobin', value: 13.3, at: 2000 });
    expect(confirmation(b.state, b.reading).status).toBe('confirmed');
    const c = recordReading(b.state, seed, rule, { crewId: 'crew-2', indicatorId: 'haemoglobin', value: 14.7, at: 3000 });
    expect(confirmation(c.state, c.reading).status).toBe('not-needed');
    s = c.state;
    expect(s.readings).toHaveLength(3);
  });
  it('records a reading, queues one case per reading and exports it once', () => {
    let s = initialState(seed);
    const r = recordReading(s, seed, rule, { crewId: 'crew-2', indicatorId: 'haemoglobin', value: 13.4, at: 1000 });
    s = toggleStep(r.state, r.reading.id, 'Repeat the reading to confirm.');
    s = toggleSymptom(s, 'crew-2', 'Headache', 1500);
    const sent = sendCase(s, { readingId: r.reading.id, settingId: 'mars-far', at: 2000 });
    expect(sendCase(sent.state, { readingId: r.reading.id, settingId: 'mars-far', at: 3000 }).state.outbox).toHaveLength(1);
    const content = casePackContent(sent.state, seed, rule, sent.pack.id);
    expect(content.assessment.tier).toBe('amber');
    expect(content.assessment.placeholderRule).toBe(true);
    expect(content.stepsDone).toEqual(['Repeat the reading to confirm.']);
    expect(content.symptoms[0].label).toBe('Headache');
    expect(content.synthetic).toBe(true);
    const out = exportOutbox(sent.state, seed, rule, 4000);
    expect(out.file.cases).toHaveLength(1);
    expect(out.file.cases[0].status).toBe('exported');
    expect(out.state.outbox[0].status).toBe('exported');
    expect(exportOutbox(out.state, seed, rule, 5000).file.cases).toHaveLength(0);
    expect(history(out.state, seed, 'crew-2', 'haemoglobin').recorded).toHaveLength(1);
  });
});
