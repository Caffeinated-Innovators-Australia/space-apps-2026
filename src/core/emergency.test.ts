// Tests for the emergency run functions and the shape of the basic life support protocol data.
// AI assistance: drafted with Claude Code (see AI_USE.md).
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { activeEmergency, answerStep, emergencySummary, endEmergency, gravityLine, linesFor, reachStep, startEmergency, type EmergencyProtocol } from './emergency.ts';
import type { State } from './types.ts';

const protocol = JSON.parse(readFileSync('src/data/emergency.json', 'utf8')) as EmergencyProtocol;
const blank = (): State => ({ version: 2, readings: [], symptoms: [], nothingToReport: [], outbox: [], ui: { crewId: 'crew-1', settingId: 'mars', theme: 'day', doseLogged: false, clock: '08:00', slipped: false } });

describe('protocol data', () => {
  it('has the seven DRSABCD steps in order, each with short wording, reviewed by the clinical lead (CR-32)', () => {
    expect(protocol.steps.map((s) => s.letter).join('')).toBe('DRSABCD');
    expect(new Set(protocol.steps.map((s) => s.id)).size).toBe(7);
    expect(protocol.status).toBe('Reviewed by our clinical lead, 15 Nov 2026');
    for (const s of protocol.steps) expect(s.say.split(/\s+/).length).toBeLessThan(14);
  });
  it('every number carries its source', () => {
    for (const s of protocol.steps) {
      if (s.pace) expect(s.pace.source).toContain('Guideline 8');
      if (s.ratio) expect(s.ratio.source).toContain('Guideline 8');
    }
    expect(protocol.steps.find((s) => s.id === 'C')?.pace?.perMinute).toBeGreaterThan(0);
  });
});

describe('emergency runs', () => {
  it('starts a run, and a second start returns the same open run', () => {
    const a = startEmergency(blank(), { crewId: 'crew-1', at: 1000 });
    expect(activeEmergency(a.state)?.id).toBe(a.run.id);
    const b = startEmergency(a.state, { crewId: 'crew-1', at: 2000 });
    expect(b.run.id).toBe(a.run.id);
    expect(b.state.emergencies).toHaveLength(1);
  });
  it('keeps the first time a step was reached when steps are revisited', () => {
    let { state, run } = startEmergency(blank(), { crewId: 'crew-1', at: 0 });
    state = reachStep(state, run.id, 'D', 0);
    state = reachStep(state, run.id, 'R', 5000);
    state = reachStep(state, run.id, 'D', 9000);
    state = reachStep(state, run.id, 'R', 12000);
    expect(activeEmergency(state)!.steps).toEqual([{ id: 'D', at: 0 }, { id: 'R', at: 5000 }]);
  });
  it('ends a run once, refuses steps after the end, and leaves no active run', () => {
    let { state, run } = startEmergency(blank(), { crewId: 'crew-1', at: 0 });
    state = endEmergency(state, run.id, 60000);
    state = endEmergency(state, run.id, 90000);
    expect(state.emergencies![0].endedAt).toBe(60000);
    expect(activeEmergency(state)).toBeUndefined();
    expect(() => reachStep(state, run.id, 'C', 70000)).toThrow(/already ended/);
    expect(() => endEmergency(state, 'nope', 1)).toThrow(/no emergency run/);
    const again = startEmergency(state, { crewId: 'crew-1', at: 100000 });
    expect(again.run.id).not.toBe(run.id);
  });
  it('summarises steps reached in protocol order with times and the total time', () => {
    let { state, run } = startEmergency(blank(), { crewId: 'crew-2', at: 1000 });
    for (const [id, at] of [['D', 1000], ['R', 4000], ['S', 8000], ['B', 15000], ['C', 20000]] as const) state = reachStep(state, run.id, id, at);
    state = endEmergency(state, run.id, 181000);
    const sum = emergencySummary(state.emergencies![0], protocol);
    expect(sum.reached.map((r) => r.id)).toEqual(['D', 'R', 'S', 'B', 'C']);
    expect(sum.reached[4].at).toBe(20000);
    expect(sum.durationMs).toBe(180000);
    expect(sum.notReached).toEqual(['Airway', 'Defibrillation']);
  });
  it('an open run is timed to its last step', () => {
    let { state, run } = startEmergency(blank(), { crewId: 'crew-1', at: 0 });
    state = reachStep(state, run.id, 'D', 3000);
    expect(emergencySummary(activeEmergency(state)!, protocol).durationMs).toBe(3000);
  });
});

describe('the CPR step at 0 g (CR-32)', () => {
  it('asks for the person to be strapped down at 0 g only', () => {
    const c = protocol.steps.find((x) => x.id === 'C')!;
    expect(gravityLine(c, 'zero')).toBe('Strap the person down before you start CPR.');
    for (const band of ['lunar', 'martian', 'earth', undefined] as const) expect(gravityLine(c, band)).toBeUndefined();
    expect(protocol.steps.filter((x) => x.gravity).map((x) => x.id)).toEqual(['C']);
  });
});

describe('yes/no questions on Danger and Response (CR-32)', () => {
  const d = protocol.steps.find((x) => x.id === 'D')!;
  const r = protocol.steps.find((x) => x.id === 'R')!;
  it('asks whether it is safe, and shows the make-it-safe lines that apply at the place', () => {
    expect(d.question?.ask).toBe('Is it safe for you to go closer?');
    const lines = d.question!.onNo!.lines;
    const station = linesFor(lines, 'zero', true);
    expect(station).toContain('Cabin pressure or air alarm: put on your suit or mask first.');
    expect(station).toContain('At 0 g: secure yourself, and stop loose objects or floating liquid, before you move in.');
    const mars = linesFor(lines, 'martian', true);
    expect(mars.join(' ')).not.toContain('At 0 g');
    const earth = linesFor(lines, 'earth', false);
    expect(earth).toContain('Snake nearby: keep clear, and keep the person still.');
    expect(earth).toContain('Fallen power lines: stay well back. Do not touch the person until the power is off.');
    expect(earth).not.toContain('Cabin pressure or air alarm: put on your suit or mask first.');
    expect(earth.join(' ')).not.toMatch(/airlock|0 g|Moon or Mars/);
    expect(mars).toContain("Moon or Mars dust brought inside: keep it away from the person's eyes, nose and mouth.");
    expect(mars.join(' ')).not.toMatch(/Snake|Fallen power lines/);
  });
  it('offers the checklists, a priority call and carrying on when the person responds', () => {
    const y = r.question!.onYes!;
    expect(r.question?.ask).toBe('Does the person respond to you?');
    expect(y.checklists).toBe('Open emergency checklists');
    expect(y.priority.say).toBe('Send for help: priority call to Earth');
    expect(y.priority.earth).toBe('Send for help: priority call to the RFDS base');
    expect(y.priority.note).toContain('Pan-Pan');
    expect(y.priority.sent).toContain('SYNTHETIC');
  });
  it('records answers with their times for the handover, and refuses them once the run has ended', () => {
    const started = startEmergency(blank(), { crewId: 'crew-1', at: 1000 });
    let s = answerStep(started.state, started.run.id, 'D', 'Area safe: no', 1500);
    s = answerStep(s, started.run.id, 'D', 'Area made safe', 1200);
    s = answerStep(s, started.run.id, 'priority-call', 'Priority call sent (Pan-Pan)', 2000);
    const sum = emergencySummary(activeEmergency(s)!, protocol);
    expect(sum.answers.map((a) => a.text)).toEqual(['Area made safe', 'Area safe: no', 'Priority call sent (Pan-Pan)']);
    const ended = endEmergency(s, started.run.id, 3000);
    expect(() => answerStep(ended, started.run.id, 'R', 'Responds: yes', 3500)).toThrow(/ended/);
  });
});
