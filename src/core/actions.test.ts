import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { acknowledge, applySlip, assessValue, limitsFor, casePackContent, confirmation, crewGoal, dayPlan, daySummary, demoValue, exportOutbox, initialState, parseRules, plan, recordReading, reportNothing, sendCase, streak, toggleStep, toggleSymptom, type Seed, type State } from './index.ts';

const rules = parseRules(readFileSync('rules/rules.yaml', 'utf8'));
const seed = JSON.parse(readFileSync('src/data/seed.json', 'utf8')) as Seed;
const rec = (s: State, indicatorId: string, value: number, at: number, crewId = 'crew-1') => recordReading(s, seed, rules, { crewId, indicatorId, value, at });

describe('seed data', () => {
  it('takes haemoglobin variation from the real NASA crew data', () => {
    const osd = JSON.parse(readFileSync('src/data/osd569_cbc.json', 'utf8')) as { variation: Record<string, { pooledSd: number }> };
    expect(seed.indicators.find((i) => i.id === 'haemoglobin')!.fixedSd).toBe(osd.variation.Haemoglobin.pooledSd);
  });
  it('has fifteen indicators, each with a full explanation card and at least one hazard', () => {
    expect(seed.indicators).toHaveLength(15);
    for (const i of seed.indicators) {
      expect(i.card.how && i.card.why && i.card.what).toBeTruthy();
      expect(i.hazards.length).toBeGreaterThan(0);
    }
  });
});

describe('the day 214 story', () => {
  it('spots the sleep slide, the raised carbon dioxide, prompts a reaction test and reads them together', () => {
    let s = initialState(seed);
    expect(daySummary(s, seed, rules, 'crew-1').prompt).toBeUndefined();
    const sleep = rec(s, 'sleep', demoValue(seed, 'crew-1', 'sleep'), 1000);
    expect(sleep.assessment.tier).toBe('amber');
    expect(sleep.assessment.ruleId).toContain('TR-01');
    s = sleep.state;
    expect(daySummary(s, seed, rules, 'crew-1').prompt?.indicatorId).toBe('reaction');
    const co2 = rec(s, 'cabin-co2', demoValue(seed, 'crew-1', 'cabin-co2'), 2000);
    expect(co2.assessment.tier).toBe('red');
    expect(co2.assessment.ruleId).toContain('LM-01');
    expect(co2.assessment.steps[0]).toContain('air system');
    s = co2.state;
    const rt = rec(s, 'reaction', demoValue(seed, 'crew-1', 'reaction'), 3000);
    expect(rt.assessment.tier).toBe('amber');
    s = rt.state;
    const day = daySummary(s, seed, rules, 'crew-1');
    expect(day.flagged).toHaveLength(3);
    expect(day.combined?.tier).toBe('red');
    expect(day.combined?.why).toContain('sleep');
  });
  it('a steady crew member on a steady day stays green', () => {
    let s = initialState(seed);
    for (const id of ['sleep', 'resting-hr', 'mood']) s = rec(s, id, demoValue(seed, 'crew-3', id), 1000, 'crew-3').state;
    const day = daySummary(s, seed, rules, 'crew-3');
    expect(day.flagged).toHaveLength(0);
    expect(day.combined).toBeUndefined();
  });
});

describe('the wider health areas', () => {
  it('every crew member gets a result for every indicator at their own demo value', () => {
    for (const c of seed.crew) for (const i of seed.indicators) {
      const a = assessValue(seed, rules, c.id, i.id, demoValue(seed, c.id, i.id));
      expect(['green', 'amber', 'red']).toContain(a.tier);
      expect(a.why + a.title).not.toMatch(/[{}]|undefined|NaN/);
    }
  });
  it('near vision: fewer lines than the person usually reads is flagged, more is not', () => {
    expect(assessValue(seed, rules, 'crew-1', 'vision', 7).tier).toBe('green');
    expect(assessValue(seed, rules, 'crew-1', 'vision', 5).tier).toBe('amber');
    expect(assessValue(seed, rules, 'crew-1', 'vision', 8).tier).toBe('green');
  });
  it('grip strength: below 80% of the person\'s own baseline is red, by NASA\'s strength standard', () => {
    const lim = limitsFor(seed, 'crew-1', 'grip');
    const base = seed.crew[0].baseline.grip;
    expect(lim.low).toBeCloseTo(0.8 * (base.reduce((a, b) => a + b, 0) / base.length), 5);
    const a = assessValue(seed, rules, 'crew-1', 'grip', Number((lim.low! - 0.5).toFixed(1)));
    expect(a.tier).toBe('red');
    expect(a.why).toContain('NASA strength standard');
  });
  it('radiation dose is a running total judged against the career limit', () => {
    const now = demoValue(seed, 'crew-1', 'radiation');
    const a = assessValue(seed, rules, 'crew-1', 'radiation', now);
    expect(a.tier).toBe('green');
    expect(a.why).toContain('% of the NASA career limit of 600 mSv');
    expect(assessValue(seed, rules, 'crew-1', 'radiation', 601).tier).toBe('red');
    expect(() => assessValue(seed, rules, 'crew-1', 'radiation', 10)).toThrow(/running total/);
  });
  it('weekly check-ins fall due on their own day of the mission week', () => {
    const due = daySummary(initialState(seed), seed, rules, 'crew-1').items.filter((x) => x.due).map((x) => x.indicator.id);
    expect(due).toContain('vision');
    expect(due).not.toContain('grip');
    expect(due).not.toContain('haemoglobin');
  });
});

describe('action layer', () => {
  it('refuses unknown people, unknown indicators and impossible readings in plain words', () => {
    expect(() => assessValue(seed, rules, 'nobody', 'sleep', 7)).toThrow(/Unknown crew member/);
    expect(() => assessValue(seed, rules, 'crew-1', 'pulse', 60)).toThrow(/Unknown indicator/);
    expect(() => assessValue(seed, rules, 'crew-1', 'sleep', 30)).toThrow(/between 0 and 24/);
    expect(() => assessValue(seed, rules, 'crew-1', 'resting-hr', 5)).toThrow(/between 20 and 250/);
  });
  it('acknowledging an alert is recorded once and changes nothing else', () => {
    const a = rec(initialState(seed), 'cabin-co2', 3.4, 1000);
    const s = acknowledge(acknowledge(a.state, a.reading.id), a.reading.id);
    expect(s.acknowledged).toEqual([a.reading.id]);
    expect(s.readings).toEqual(a.state.readings);
  });
  it('describes a fixed scale within its own ends', () => {
    expect(assessValue(seed, rules, 'crew-1', 'vision', 4).why).not.toMatch(/to 9 lines/);
  });
  it('marks a raised result as unconfirmed until a second reading agrees', () => {
    const a = rec(initialState(seed), 'resting-hr', 80, 1000);
    expect(a.assessment.tier).toBe('amber');
    expect(confirmation(a.state, a.reading).status).toBe('unconfirmed');
    const b = rec(a.state, 'resting-hr', 81, 2000);
    expect(confirmation(b.state, b.reading).status).toBe('confirmed');
  });
  it('queues one case per reading, includes the other signals, and exports once', () => {
    let s = rec(initialState(seed), 'sleep', 6.2, 1000).state;
    const co2 = rec(s, 'cabin-co2', 3.4, 2000);
    s = toggleStep(co2.state, co2.reading.id, 'Confirm with a second sensor.');
    s = toggleSymptom(s, 'crew-1', 'Headache', 2500);
    const sent = sendCase(s, { readingId: co2.reading.id, settingId: 'mars-base', at: 3000 });
    expect(sendCase(sent.state, { readingId: co2.reading.id, settingId: 'mars-base', at: 4000 }).state.outbox).toHaveLength(1);
    const c = casePackContent(sent.state, seed, rules, sent.pack.id);
    expect(c.assessment.tier).toBe('red');
    // The tier rules are signed off by the clinical lead (15 Nov 2026, CR-02).
    expect(c.assessment.rules[0].placeholder).toBe(false);
    expect(c.otherSignalsToday.map((x) => x.indicator)).toContain('Sleep');
    expect(c.stepsDone).toEqual(['Confirm with a second sensor.']);
    expect(c.symptoms[0].label).toBe('Headache');
    expect(c.synthetic).toBe(true);
    const out = exportOutbox(sent.state, seed, rules, 5000);
    expect(out.file.cases[0].status).toBe('exported');
    expect(exportOutbox(out.state, seed, rules, 6000).file.cases).toHaveLength(0);
  });
});

describe('prompt scheduler', () => {
  const checks = [{ id: 'sleep', label: 'Sleep', slot: 'morning' as const }, { id: 'mood', label: 'Mood', slot: 'evening' as const }];
  it('offers morning check-ins after waking and keeps evening ones for later', () => {
    const p = plan(seed.timeline, checks, '06:45', []);
    expect(p[0]).toMatchObject({ id: 'sleep', status: 'due', at: '06:45' });
    expect(p[1]).toMatchObject({ id: 'mood', status: 'later', at: '21:10' });
  });
  it('never prompts during a critical operation: it holds the check-in until the operation ends', () => {
    const p = plan(seed.timeline, checks, '09:30', []);
    expect(p[0]).toMatchObject({ status: 'held', at: '12:05' });
    expect(p[0].note).toContain('EVA');
  });
  it('re-plans when the operation runs late', () => {
    const late = applySlip(seed.timeline, 45);
    expect(late[2].end).toBe('12:45');
    expect(late[3].start).toBe('12:45');
    expect(plan(late, checks, '12:10', [])[0]).toMatchObject({ status: 'held', at: '12:50' });
    expect(plan(seed.timeline, checks, '12:10', [])[0]).toMatchObject({ status: 'due', at: '12:10' });
  });
  it('builds the whole day for a person, with the asked-for reaction test', () => {
    let s = initialState(seed);
    s = rec(s, 'sleep', 6.2, 1000).state;
    const day = dayPlan(s, seed, rules, 'crew-1');
    expect(day.items.find((x) => x.id === 'sleep')?.status).toBe('done');
    expect(day.items.find((x) => x.id === 'reaction')?.label).toContain('asked for today');
    expect(day.items.some((x) => x.id === 'cabin-co2')).toBe(false);
  });
});

describe('honest reporting', () => {
  it('counts check-ins, never results', () => {
    const s0 = initialState(seed);
    const before = streak(s0, seed, 'crew-1');
    expect(before).toBe(146);
    let s = s0;
    const daily = seed.indicators.filter((i) => i.cadence === 'daily').map((i) => i.id);
    for (const id of daily) s = rec(s, id, id === 'mood' ? 1 : demoValue(seed, 'crew-1', id), 1000).state;
    expect(streak(s, seed, 'crew-1')).toBe(before + 1);
    const g0 = crewGoal(s0, seed);
    const g1 = crewGoal(s, seed);
    expect(g1.done).toBe(g0.done + daily.length);
    expect(g1.total).toBe(g0.total);
  });
  it('treats nothing to report as a check-in, and a symptom replaces it', () => {
    let s = reportNothing(initialState(seed), 'crew-1');
    expect(s.nothingToReport).toEqual(['crew-1']);
    s = toggleSymptom(s, 'crew-1', 'Headache', 1);
    expect(s.nothingToReport).toEqual([]);
  });
});

describe('cabin readings are worded as the cabin\'s, not the person\'s', () => {
  it('describes cabin carbon dioxide as a one-hour average against the cabin\'s usual range', () => {
    const a = assessValue(seed, rules, 'crew-1', 'cabin-co2', 3.4);
    expect(a.tier).toBe('red');
    expect(a.why).toContain('The one-hour average cabin carbon dioxide is 3.4 mmHg');
    expect(a.why).toContain("the cabin's usual range");
    expect(a.why).not.toMatch(/your own|your baseline/i);
    expect(a.deltaText).toBe("+1.3 mmHg vs the cabin's usual level");
  });
  it('keeps personal wording for a personal reading', () => {
    const a = assessValue(seed, rules, 'crew-1', 'sleep', 6.2);
    expect(a.why).toMatch(/your baseline|your own/);
  });
});
