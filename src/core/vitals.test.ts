// Tests for vital signs and the monitor alerts they raise (SEP-01 possible sepsis, SHK-01 possible shock).
// AI assistance: drafted with Claude Code (see AI_USE.md).
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import seedJson from '../data/seed.json';
import { initialState } from './actions.ts';
import { parseRules } from './rules.ts';
import type { Seed, State, VitalSigns } from './types.ts';
import { latestVitals, recordVitals, VITAL_FIELDS, vitalsAlerts, vitalsLine } from './vitals.ts';

const seed = seedJson as unknown as Seed;
const text = readFileSync(new URL('../../rules/rules.yaml', import.meta.url), 'utf8');
const rules = parseRules(text);
const crew = 'crew-4';
const demo = (id: string) => seed.demoVitals!.find((d) => d.id === id)!.values;
const after = (values: VitalSigns, s: State = initialState(seed), at = 1000) => recordVitals(s, { crewId: crew, values, at });
const ids = (s: State) => vitalsAlerts(s, rules, crew).map((a) => a.id);

describe('the pack demo sets', () => {
  it('the 15:00 set raises nothing', () => {
    expect(ids(after(demo('stone')))).toEqual([]);
  });
  it('the 22:30 set raises possible sepsis, Act now, with plain reasons and the signed-off steps', () => {
    const [a, ...rest] = vitalsAlerts(after(demo('infected')), rules, crew, 'martian');
    expect(rest).toEqual([]);
    expect(a.id).toBe('SEP-01');
    expect(a.tier).toBe('red');
    expect(a.emergency).toBe(true);
    expect(a.construct).toBe(12);
    expect(a.reasons).toEqual(['Temperature 38.6 °C', 'Blood pressure 94/56 mmHg', 'Breathing 24 a minute']);
    expect(a.steps).toEqual(['Lie the person flat and keep them warm.', 'Record vitals from the monitor.', 'Crew medic: follow your sepsis protocol.']);
    expect(a.placeholder).toBe(false);
    expect(a.confidence).toBe('Medium');
    expect(a.source).toMatch(/clinical lead/);
    expect(a.at).toBe(1000);
  });
});

describe('the sepsis rule branches', () => {
  it('fever with low blood pressure alone', () => {
    expect(ids(after({ temp: 38, sbp: 100, rr: 16 }))).toEqual(['SEP-01']);
  });
  it('fever with fast breathing alone', () => {
    expect(ids(after({ temp: 38.2, sbp: 120, rr: 22 }))).toEqual(['SEP-01']);
  });
  it('a low temperature needs both low blood pressure and fast breathing', () => {
    expect(ids(after({ temp: 35.8, sbp: 98, rr: 23 }))).toEqual(['SEP-01']);
    expect(ids(after({ temp: 35.8, sbp: 98, rr: 18 }))).toEqual([]);
    expect(ids(after({ temp: 35.8, sbp: 120, rr: 23 }))).toEqual([]);
  });
  it('a missing value never matches', () => {
    expect(ids(after({ temp: 38.6 }))).toEqual([]);
  });
});

describe('the shock rule', () => {
  it('fires on low upper blood pressure with a fast pulse, and names both', () => {
    const s = after({ temp: 37, hr: 120, sbp: 85, dbp: 50, rr: 18 });
    const a = vitalsAlerts(s, rules, crew);
    expect(a.map((x) => x.id)).toEqual(['SHK-01']);
    expect(a[0].construct).toBe(4);
    expect(a[0].reasons).toEqual(['Pulse 120 a minute', 'Blood pressure 85/50 mmHg']);
  });
  it('needs both: 90 exactly or a pulse of 110 does not fire', () => {
    expect(ids(after({ hr: 120, sbp: 90 }))).toEqual([]);
    expect(ids(after({ hr: 110, sbp: 80 }))).toEqual([]);
  });
});

describe('oxygen saturation', () => {
  it('a low reading alone raises nothing', () => {
    expect(ids(after({ temp: 37, hr: 80, sbp: 120, dbp: 80, rr: 16, spo2: 82 }))).toEqual([]);
  });
  it('the rules file may not compare it alone', () => {
    const bad = text.replace('      - { sbp: "< 90", hr: "> 110" }', '      - { spo2: "< 90" }');
    expect(bad).not.toBe(text);
    expect(() => parseRules(bad)).toThrow(/oxygen saturation/);
  });
});

describe('the latest set decides', () => {
  it('a newer normal set clears the alert', () => {
    const raised = after(demo('infected'), initialState(seed), 1000);
    expect(ids(raised)).toEqual(['SEP-01']);
    const cleared = after(demo('stone'), raised, 2000);
    expect(ids(cleared)).toEqual([]);
    expect(cleared.vitals).toHaveLength(2);
    expect(latestVitals(cleared, crew)?.at).toBe(2000);
  });
  it('another crew member is not affected', () => {
    expect(vitalsAlerts(after(demo('infected')), rules, 'crew-1')).toEqual([]);
  });
});

describe('recording', () => {
  it('refuses a typing slip, an empty set and a lower blood pressure above the upper', () => {
    expect(() => after({ temp: 386 })).toThrow(/typing slip/);
    expect(() => after({})).toThrow(/at least one/);
    expect(() => after({ sbp: 80, dbp: 90 })).toThrow(/below the upper/);
  });
  it('describes every field with a unit and plausibility bounds', () => {
    for (const f of VITAL_FIELDS) expect(f.min).toBeLessThan(f.max);
    expect(VITAL_FIELDS.map((f) => f.id)).toEqual(['temp', 'hr', 'sbp', 'dbp', 'rr', 'spo2']);
  });
  it('gives a one-line summary with units', () => {
    expect(vitalsLine(demo('infected'))).toBe('Temperature 38.6 °C · pulse 118 a minute · blood pressure 94/56 mmHg · breathing 24 a minute · oxygen saturation 96%');
  });
});

describe('rules file checks', () => {
  it('loads both monitor alerts', () => {
    expect(rules.monitor_alerts.map((m) => m.id)).toEqual(['SEP-01', 'SHK-01']);
  });
  it('defaults to an empty list when the section is absent', () => {
    expect(parseRules(text.slice(0, text.indexOf('\nmonitor_alerts:'))).monitor_alerts).toEqual([]);
  });
  const sepsis = text.slice(text.indexOf('  - id: SEP-01'), text.indexOf('  - id: SHK-01'));
  for (const field of ['source', 'confidence', 'signed_off_by']) {
    it(`refuses a monitor alert with no ${field}`, () => {
      const cut = sepsis.replace(new RegExp(`^    ${field}: .*\\n`, 'm'), '');
      expect(cut).not.toBe(sepsis);
      expect(() => parseRules(text.replace(sepsis, cut))).toThrow(/SEP-01/);
    });
  }
});

describe('first steps that depend on gravity (CR-38)', () => {
  const strap = 'Strap the person down so you can start CPR if needed.';
  it('at 0 g shows the strap-down step and hides lying flat; elsewhere the reverse', () => {
    const s = after(demo('infected'));
    expect(vitalsAlerts(s, rules, crew, 'zero')[0].steps).toEqual(['Keep the person warm.', strap, 'Record vitals from the monitor.', 'Crew medic: follow your sepsis protocol.']);
    for (const band of ['lunar', 'martian', 'earth'] as const) {
      const steps = vitalsAlerts(s, rules, crew, band)[0].steps;
      expect(steps).not.toContain(strap);
      expect(steps[0]).toBe('Lie the person flat and keep them warm.');
    }
  });
  it('shock lists the systems screen and RUSH scan steps, and is signed off (CR-37)', () => {
    const shk = rules.monitor_alerts.find((m) => m.id === 'SHK-01')!;
    expect(shk.signed_off_by).toBe('clinical lead');
    expect(shk.steps.map((x) => x.text)).toContain('Crew medic: work through a systems screen to look for the cause.');
    const screen = shk.steps.find((x) => x.checklist)!;
    expect(screen.checklist!.map((h) => h.heading)).toEqual(['Blood or fluid loss', 'Heart', 'Widened blood vessels', 'Blockage']);
    const shock = vitalsAlerts(after({ sbp: 82, dbp: 50, hr: 124, temp: 37 }), rules, crew, 'martian').find((a) => a.id === 'SHK-01')!;
    expect(shock.steps).toContain('Give oxygen if it is available and you are trained to. Oxygen is a fire risk: keep sparks and flames away.');
    expect(shock.checklists[screen.text]).toHaveLength(4);
    expect(shock.steps.join(' ')).not.toMatch(/\d+ ?(mg|mL|L\/min)/);
  });
  it('refuses a step with an unknown gravity band, and a rule whose steps all depend on gravity', () => {
    expect(() => parseRules(text.replace('gravity: [zero] }', 'gravity: [orbit] }'))).toThrow(/gravity must list/);
    const only = text.replace(/(  - id: SHK-01[\s\S]*?steps:\n)[\s\S]*?(    source:)/, '$1      - { text: "One step.", gravity: [zero] }\n$2');
    expect(only).not.toBe(text);
    expect(() => parseRules(only)).toThrow(/every gravity/);
  });
});

describe('drift from the person\'s own usual vital signs (FR-64, CR-36, CR-37)', () => {
  const sets = (vals: VitalSigns[]) => vals.reduce((st, v, i) => recordVitals(st, { crewId: crew, values: v, at: 1000 + i * 3600_000 }), initialState(seed) as State);
  const usual = { temp: 36.8, hr: 70, sbp: 120, dbp: 78, rr: 14 };
  it('raises nothing until there are three earlier sets, then catches each drift as Act now', () => {
    expect(ids(sets([usual, usual, { ...usual, rr: 22 }]))).toEqual([]);
    const s = sets([usual, usual, usual, { ...usual, rr: 21, sbp: 104, hr: 91 }]);
    const drift = vitalsAlerts(s, rules, crew, 'martian').filter((a) => a.id.startsWith('VD-'));
    expect(drift.map((a) => a.id)).toEqual(['VD-01', 'VD-02', 'VD-03']);
    expect(drift[0].reasons[0]).toBe('Breathing rate 21 a minute, against your usual 14 a minute from 3 earlier sets');
    expect(drift.every((a) => a.tier === 'red' && !a.placeholder)).toBe(true);
    expect(drift.map((a) => a.construct)).toEqual([2, 4, 5]);
  });
  it('catches slow breathing too, and stays quiet within the limits', () => {
    expect(ids(sets([usual, usual, usual, { ...usual, rr: 7 }]))).toContain('VD-01');
    expect(ids(sets([usual, usual, usual, { ...usual, rr: 19, sbp: 106, hr: 89 }])).filter((i) => i.startsWith('VD-'))).toEqual([]);
  });
  it('counts only sets since the last change of gravity', () => {
    let s = sets([usual, usual, usual]);
    s = { ...s, ui: { ...s.ui, gravityChange: { from: 'zero', at: 999_999_999 } } };
    s = recordVitals(s, { crewId: crew, values: { ...usual, hr: 100 }, at: 1_000_000_000 });
    expect(ids(s)).not.toContain('VD-03');
  });
});
