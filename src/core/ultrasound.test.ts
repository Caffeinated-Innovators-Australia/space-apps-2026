// Tests for the guided ultrasound step functions and the shape of their data.
// AI assistance: drafted with Claude Code (see AI_USE.md).
import { describe, expect, it } from 'vitest';
import type { State } from './types.ts';
import { toggleUltrasoundStep, ultrasoundAvailable, ultrasoundDone, ultrasoundProcedure, ultrasoundSteps, ultrasoundSummary } from './ultrasound.ts';

const blank = (): State => ({ version: 2, readings: [], symptoms: [], nothingToReport: [], outbox: [], ui: { crewId: 'crew-1', settingId: 'mars-18', theme: 'day', doseLogged: false, clock: '15:20', slipped: false } });
const t0 = new Date(2026, 10, 14, 15, 20).getTime();

describe('procedure data', () => {
  it('has four short steps, left then right, marked as placeholder wording from the clinical lead', () => {
    const p = ultrasoundProcedure();
    expect(p.status).toBe('Placeholder wording, awaiting clinician sign-off');
    expect(p.source).toContain('build pack v3.3');
    const steps = ultrasoundSteps();
    expect(steps).toHaveLength(4);
    expect(new Set(steps.map((s) => s.id)).size).toBe(4);
    expect(steps.map((s) => s.side)).toEqual([undefined, 'left', 'right', undefined]);
    expect(steps[1].instruction).toBe('Probe on the left side, just below the ribs. Marker towards the head.');
    for (const s of steps) {
      const words = [s.instruction, s.lookFor, s.note].filter(Boolean).join(' ').split(/\s+/).length;
      expect(words).toBeLessThanOrEqual(40);
    }
  });
  it('never words a finding as found', () => {
    const text = JSON.stringify(ultrasoundProcedure()).toLowerCase();
    for (const w of ['you have', 'found', 'diagnos', 'confirms']) expect(text).not.toContain(w);
  });
});

describe('toggleUltrasoundStep', () => {
  it('ticks and unticks a step for one person only, keeping procedure order and not changing the input', () => {
    const s0 = blank();
    let s = toggleUltrasoundStep(s0, { crewId: 'crew-1', stepId: 'us-3', at: t0 });
    s = toggleUltrasoundStep(s, { crewId: 'crew-1', stepId: 'us-1', at: t0 + 1000 });
    expect(s0.ultrasound).toBeUndefined();
    expect(ultrasoundDone(s, 'crew-1')).toEqual(['us-1', 'us-3']);
    expect(s.ultrasound!['crew-1'].at).toBe(t0 + 1000);
    expect(ultrasoundDone(s, 'crew-2')).toEqual([]);
    s = toggleUltrasoundStep(s, { crewId: 'crew-1', stepId: 'us-3', at: t0 + 2000 });
    expect(ultrasoundDone(s, 'crew-1')).toEqual(['us-1']);
  });
  it('throws on an unknown step', () => {
    expect(() => toggleUltrasoundStep(blank(), { crewId: 'crew-1', stepId: 'us-9', at: t0 })).toThrow(/no guided ultrasound step/);
  });
});

describe('ultrasoundSummary', () => {
  it('is undefined until started, then counts the steps completed', () => {
    expect(ultrasoundSummary(blank(), 'crew-1')).toBeUndefined();
    let s = blank();
    for (const id of ['us-1', 'us-2', 'us-3']) s = toggleUltrasoundStep(s, { crewId: 'crew-1', stepId: id, at: t0 });
    expect(ultrasoundSummary(s, 'crew-1')).toBe('Guided ultrasound: 3 of 4 steps completed. No image kept in this demo.');
    s = toggleUltrasoundStep(toggleUltrasoundStep(blank(), { crewId: 'crew-1', stepId: 'us-1', at: t0 }), { crewId: 'crew-1', stepId: 'us-1', at: t0 });
    expect(ultrasoundSummary(s, 'crew-1')).toBe('Guided ultrasound: 0 of 4 steps completed. No image kept in this demo.');
  });
});

describe('ultrasoundAvailable', () => {
  it('is false only on the Earth twin', () => {
    expect(ultrasoundAvailable({ profile: 'earth' })).toBe(false);
    for (const p of ['mars', 'moon', 'iss', 'transit'] as const) expect(ultrasoundAvailable({ profile: p })).toBe(true);
    expect(ultrasoundAvailable({})).toBe(true);
  });
});
