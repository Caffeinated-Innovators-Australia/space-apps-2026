// Record-only results: logged and sent, never scored.
import { describe, expect, it } from 'vitest';
import seedJson from '../data/seed.json' with { type: 'json' };
import { initialState } from './actions.ts';
import { addRecord, areaForGroup, bodyAreas, recordKinds, recordLine, recordsFor, recordsSummary } from './records.ts';
import { toggleUltrasoundStep, ultrasoundProcedure, ultrasoundSummary } from './ultrasound.ts';
import type { Seed } from './types.ts';

const seed = seedJson as unknown as Seed;
const at = Date.parse('2026-11-15T00:00:00Z');

describe('record-only results', () => {
  it('every area lists only symptoms the crew can log and record types that exist', () => {
    const kinds = recordKinds().map((k) => k.id);
    for (const a of bodyAreas()) {
      for (const s of a.symptoms) expect(seed.symptoms.options).toContain(s);
      for (const r of a.records) expect(kinds).toContain(r);
      if (a.group) expect(seed.indicators.some((i) => i.group === a.group)).toBe(true);
    }
    expect(areaForGroup('Heart')?.id).toBe('heart');
  });
  it('logs a number and keeps it to the stated decimal places', () => {
    const r = addRecord(initialState(seed), { crewId: 'crew-1', kindId: 'hrv', at, value: 55.4 });
    expect(r.record.value).toBe(55);
    expect(recordLine(r.record)).toBe('Heart rate variability: 55 ms');
  });
  it('refuses a typing slip and an unknown choice, in plain words', () => {
    const s = initialState(seed);
    expect(() => addRecord(s, { crewId: 'crew-1', kindId: 'hrv', at, value: 4000 })).toThrow(/must be between 1 and 300 ms/);
    expect(() => addRecord(s, { crewId: 'crew-1', kindId: 'ecg', at, option: '3-lead' })).toThrow(/choose one of 6-lead; 12-lead/);
    expect(() => addRecord(s, { crewId: 'crew-1', kindId: 'msk-pain', at, option: 'Pain', option2: 'Knee', score: 11 })).toThrow(/0 to 10/);
    expect(() => addRecord(s, { crewId: 'crew-1', kindId: 'nope', at })).toThrow(/no record type/);
  });
  it('never changes a reading, a symptom or an alert', () => {
    const s = initialState(seed);
    const r = addRecord(s, { crewId: 'crew-1', kindId: 'msk-pain', at, option: 'Pain', option2: 'Knee', score: 6, note: '  after exercise  ' });
    expect(r.state.readings).toEqual(s.readings);
    expect(r.state.symptoms).toEqual(s.symptoms);
    expect(r.record.note).toBe('after exercise');
    expect(recordLine(r.record)).toBe('Pain or stiffness: Knee, Pain, 6 out of 10, note: after exercise');
  });
  it('sends the latest of each type, per eye where there is one', () => {
    let s = addRecord(initialState(seed), { crewId: 'crew-1', kindId: 'eye-pressure', at, option2: 'Right eye', value: 15 }).state;
    s = addRecord(s, { crewId: 'crew-1', kindId: 'eye-pressure', at: at + 1, option2: 'Left eye', value: 16 }).state;
    s = addRecord(s, { crewId: 'crew-1', kindId: 'eye-pressure', at: at + 2, option2: 'Right eye', value: 17 }).state;
    s = addRecord(s, { crewId: 'crew-2', kindId: 'hrv', at: at + 3, value: 40 }).state;
    expect(recordsFor(s, 'crew-1')).toHaveLength(3);
    expect(recordsSummary(s, 'crew-1')).toEqual(['Eye pressure (tonometry): Right eye, 17 mmHg', 'Eye pressure (tonometry): Left eye, 16 mmHg']);
  });
});

describe('guided heart ultrasound', () => {
  it('is kept apart from the kidney view, and both go into the case', () => {
    const heart = ultrasoundProcedure('heart');
    let s = toggleUltrasoundStep(initialState(seed), { crewId: 'crew-1', stepId: heart.steps[0].id, at, view: 'heart' });
    expect(ultrasoundSummary(s, 'crew-1')).toBe(`Guided heart ultrasound: 1 of ${heart.steps.length} steps completed. No image kept in this demo.`);
    s = toggleUltrasoundStep(s, { crewId: 'crew-1', stepId: 'us-1', at });
    expect(ultrasoundSummary(s, 'crew-1')).toMatch(/^Guided ultrasound: 1 of 4 .* Guided heart ultrasound: 1 of/);
    expect(() => toggleUltrasoundStep(s, { crewId: 'crew-1', stepId: 'us-1', at, view: 'heart' })).toThrow(/no guided ultrasound step/);
  });
  it('never says what an image shows', () => {
    for (const st of ultrasoundProcedure('heart').steps) expect(`${st.instruction} ${st.lookFor ?? ''}`).not.toMatch(/diagnos|abnormal|fluid around|effusion/i);
  });
});
