// Tests for the message bridge to the emergency module (ASTRA).
// AI assistance: drafted with Claude Code (see AI_USE.md).
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { initialState, parseRules, type Seed, type Setting, type State } from './index.ts';
import { fluidThreeDay, helloMsg, openPathwayMsg, profileMsg, readInbound, recordModuleAlert, setPatientMsg, vitalsMsg, arrestSignal, ARREST_CONSTRUCT} from './astra.ts';

const rules = parseRules(readFileSync('rules/rules.yaml', 'utf8'));
const seed = JSON.parse(readFileSync('src/data/seed.json', 'utf8')) as Seed;
const T = Date.UTC(2026, 10, 14, 11, 30);
const iso = new Date(T).toISOString();
// The pack's example: the infected-stone vitals.
const pack = { temp: 38.6, hr: 118, sbp: 94, dbp: 56, rr: 24 };

function withVitals(s: State, crewId = 'crew-1'): State {
  return { ...s, vitals: [{ id: 'v-old', crewId, at: T - 3_600_000, values: { temp: 37.1, hr: 96 } }, { id: 'v1', crewId, at: T, values: pack }] };
}

describe('outbound messages', () => {
  it('hello carries the schema, type and time', () => {
    expect(helloMsg(T)).toEqual({ schema: 'astra/1', type: 'astra.hello', ts: iso });
  });
  it('profile maps the setting profile and falls back to Mars', () => {
    const mars = seed.settings.find((s) => s.profile === 'mars')!;
    const moon = seed.settings.find((s) => s.profile === 'moon')!;
    expect(profileMsg(mars, T)).toEqual({ schema: 'astra/1', type: 'astra.profile', ts: iso, profile: 'mars' });
    expect(profileMsg(moon, T).profile).toBe('moon');
    expect(profileMsg({ ...mars, profile: undefined } as Setting, T).profile).toBe('mars');
  });
  it('open pathway and set patient are module commands', () => {
    expect(openPathwayMsg(12, undefined, T)).toEqual({ schema: 'astra/1', type: 'astra.command', ts: iso, action: 'openPathway', construct: 12 });
    expect(openPathwayMsg(12, 'crew-1', T).crewId).toBe('crew-1');
    expect(setPatientMsg('crew-1', T)).toEqual({ schema: 'astra/1', type: 'astra.command', ts: iso, action: 'setPatient', crewId: 'crew-1' });
  });
});

describe('vitalsMsg', () => {
  it('sends the latest vital signs with units, the person and the source', () => {
    const m = vitalsMsg(withVitals(initialState(seed)), seed, rules, 'crew-1', T);
    expect(m).toMatchObject({ schema: 'astra/1', type: 'astra.vitals', ts: iso, crewId: 'crew-1', source: 'health-app' });
    const v = Object.fromEntries(m.observations.map((o) => [o.code, o]));
    expect(v.temp).toEqual({ code: 'temp', value: 38.6, unit: '°C' });
    expect(v.hr).toEqual({ code: 'hr', value: 118, unit: '/min' });
    expect(v.sbp).toEqual({ code: 'sbp', value: 94, unit: 'mmHg' });
    expect(v.dbp).toEqual({ code: 'dbp', value: 56, unit: 'mmHg' });
    expect(v.rr).toEqual({ code: 'rr', value: 24, unit: '/min' });
    expect(v.spo2).toBeUndefined();
  });
  it("leaves out another person's vitals and anything not recorded", () => {
    const m = vitalsMsg(withVitals(initialState(seed), 'crew-2'), seed, rules, 'crew-1', T);
    expect(m.observations.some((o) => ['temp', 'hr', 'sbp', 'dbp', 'rr', 'spo2'].includes(o.code))).toBe(false);
    expect(m.observations.some((o) => o.code.startsWith('urine'))).toBe(false);
  });
  it('averages the last three logged fluid days in mL a day, today included', () => {
    const past = (seed.crew.find((c) => c.id === 'crew-1')!.mission.fluid ?? []).filter((v): v is number => v !== null);
    const expected = Math.round(((past.slice(-3).reduce((a, b) => a + b, 0)) / 3) * 1000);
    expect(fluidThreeDay(initialState(seed), seed, 'crew-1')).toBe(expected);
    const s0 = initialState(seed);
    const s: State = { ...s0, readings: [{ id: 'r1', crewId: 'crew-1', indicatorId: 'fluid', value: 1.2, at: T, day: seed.missionDay, tier: 'green', ruleId: 'x', stepsDone: [] }] };
    const withToday = Math.round(((past.slice(-2).reduce((a, b) => a + b, 0) + 1.2) / 3) * 1000);
    expect(fluidThreeDay(s, seed, 'crew-1')).toBe(withToday);
    expect(vitalsMsg(s, seed, rules, 'crew-1', T).observations).toContainEqual({ code: 'fluid3d', value: withToday, unit: 'mL/day' });
  });
  it('sends the urine strip results from the kidney-stone pathway as booleans and a number', () => {
    const s: State = { ...initialState(seed), pathwayTests: { 'pathway:crew-1:KS-01': { 'urine-strip': 'Present', 'urine-nitrite': 'Positive', 'urine-leuk': 'Negative', 'urine-sg': '1.030' } } };
    const obs = vitalsMsg(s, seed, rules, 'crew-1', T).observations;
    expect(obs).toContainEqual({ code: 'urine_blood', value: true });
    expect(obs).toContainEqual({ code: 'urine_nitrite', value: true });
    expect(obs).toContainEqual({ code: 'urine_leuk', value: false });
    expect(obs).toContainEqual({ code: 'urine_sg', value: 1.03 });
  });
  it('leaves out urine tests marked "Not done"', () => {
    const s: State = { ...initialState(seed), pathwayTests: { 'pathway:crew-1:KS-01': { 'urine-strip': 'Not done', 'urine-nitrite': 'Not done', 'urine-leuk': 'Not done', 'urine-sg': 'Not done' } } };
    expect(vitalsMsg(s, seed, rules, 'crew-1', T).observations.some((o) => o.code.startsWith('urine'))).toBe(false);
  });
});

describe('readInbound', () => {
  const alert = { schema: 'astra/1', type: 'astra.monitorAlert', crewId: 'crew-1', construct: 12, pathway: 'Infection & Sepsis', tier: 'red', reasons: ['Monitor: Temp 38.6 °C', 'Monitor: BP 94 mmHg', 'Monitor: RR 24 /min'] };
  it('reads a monitor alert', () => {
    expect(readInbound(alert)).toEqual({ type: 'astra.monitorAlert', crewId: 'crew-1', construct: 12, pathway: 'Infection & Sepsis', tier: 'red', reasons: alert.reasons });
  });
  it('reads ready, profile changed and report', () => {
    expect(readInbound({ schema: 'astra/1', type: 'astra.ready', version: '0.4.0' })).toEqual({ type: 'astra.ready', version: '0.4.0' });
    expect(readInbound({ schema: 'astra/1', type: 'astra.profile.changed', profile: 'moon', label: 'Lunar surface habitat', g: 0.16, cabinKPa: 56.5, o2Pct: 34 })).toEqual({ type: 'astra.profile.changed', profile: 'moon', label: 'Lunar surface habitat', g: 0.16, cabinKPa: 56.5, o2Pct: 34 });
    expect(readInbound({ schema: 'astra/1', type: 'astra.report', crewId: 'crew-1', report: { id: 'r1', priority: 'EMERGENCY', text: 'SITREP' } })).toEqual({ type: 'astra.report', crewId: 'crew-1', report: { id: 'r1', priority: 'EMERGENCY', text: 'SITREP' } });
  });
  it('rejects junk without throwing', () => {
    const hostile = { get schema(): string { throw new Error('boom'); } };
    for (const junk of [null, undefined, 0, 'astra.monitorAlert', [], {}, hostile, { type: 'astra.ready' }, { ...alert, schema: 'astra/2' }, { ...alert, crewId: 7 }, { ...alert, construct: 'twelve' }, { ...alert, construct: NaN }, { schema: 'astra/1', type: 'astra.step' }, { schema: 'astra/1', type: 'astra.report', report: 'x' }, { schema: 'astra/1', type: 'astra.profile.changed' }]) {
      expect(readInbound(junk)).toBeNull();
    }
  });
  it('drops reasons that are not text', () => {
    expect((readInbound({ ...alert, reasons: ['ok', 3, null] }) as { reasons: string[] }).reasons).toEqual(['ok']);
  });
});

describe('recordModuleAlert', () => {
  const a = { crewId: 'crew-1', construct: 12, pathway: 'Infection & Sepsis', reasons: ['Monitor: Temp 38.6 °C'] };
  it('appends an alert', () => {
    const s = recordModuleAlert(initialState(seed), a, T);
    expect(s.moduleAlerts).toEqual([{ at: T, ...a }]);
  });
  it('does not save the same pathway for the same person twice within a minute', () => {
    const s1 = recordModuleAlert(initialState(seed), a, T);
    expect(recordModuleAlert(s1, a, T + 59_000)).toBe(s1);
    expect(recordModuleAlert(s1, a, T + 60_000).moduleAlerts).toHaveLength(2);
    expect(recordModuleAlert(s1, { ...a, construct: 4 }, T + 1000).moduleAlerts).toHaveLength(2);
    expect(recordModuleAlert(s1, { ...a, crewId: 'crew-2' }, T + 1000).moduleAlerts).toHaveLength(2);
  });
});

describe('bridge-only alignment with the main app', () => {
  const msg = (type: string, extra: Record<string, unknown>) => ({ schema: 'astra/1', type, ts: '2026-11-15T00:00:00Z', ...extra });
  it('reads the module\'s steps, descriptions and answers, and refuses malformed ones', () => {
    expect(readInbound(msg('astra.step', { construct: 1, step: 2, text: 'Start compressions', status: 'done' }))).toEqual({ type: 'astra.step', construct: 1, step: 2, text: 'Start compressions', status: 'done' });
    expect(readInbound(msg('astra.description', { text: '  he collapsed  ' }))).toEqual({ type: 'astra.description', text: 'he collapsed' });
    expect(readInbound(msg('astra.answer', { question: 'q_resp', answer: 'NO', input: 'voice' }))).toEqual({ type: 'astra.answer', question: 'q_resp', answer: 'no', input: 'voice' });
    expect(readInbound(msg('astra.step', { step: 2 }))).toBeNull();
    expect(readInbound(msg('astra.description', { text: '   ' }))).toBeNull();
  });
  it('offers the guided CPR steps for the arrest checklist, or not responding and not breathing, and not otherwise', () => {
    expect(ARREST_CONSTRUCT).toBe(1);
    expect(arrestSignal(readInbound(msg('astra.step', { construct: 1, step: 1, status: 'done' }))!, {})).toBe(true);
    expect(arrestSignal(readInbound(msg('astra.step', { construct: 12, step: 1, status: 'done' }))!, {})).toBe(false);
    const breath = readInbound(msg('astra.answer', { question: 'q_breath', answer: 'no' }))!;
    expect(arrestSignal(breath, { q_resp: 'no' })).toBe(true);
    expect(arrestSignal(breath, { q_resp: 'yes' })).toBe(false);
    expect(arrestSignal(readInbound(msg('astra.description', { text: 'smoke' }))!, {})).toBe(false);
  });
});
