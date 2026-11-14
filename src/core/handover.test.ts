// Tests for the ISBAR handover, the remote doctor's replies and the link status.
// AI assistance: drafted with Claude Code (see AI_USE.md).
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import seedJson from '../data/seed.json';
import { caseContent, demoValue, initialState, recordReading, sendCase, settingById, toggleStep, toggleSymptom } from './actions.ts';
import { acceptReply, isbar, linkStatus, NOT_A_DIAGNOSIS, REQUEST_LINE, replyToCase, repliesFor } from './handover.ts';
import { logPain, sendPathwayCase } from './pathways.ts';
import { parseRules } from './rules.ts';
import type { Seed, State } from './types.ts';

const seed = seedJson as unknown as Seed;
const rules = parseRules(readFileSync(new URL('../../rules/rules.yaml', import.meta.url), 'utf8'));

function readingCase(): { state: State; caseId: string } {
  const r = recordReading(initialState(seed), seed, rules, { crewId: 'crew-1', indicatorId: 'cabin-co2', value: demoValue(seed, 'crew-1', 'cabin-co2'), at: 2000 });
  let s = r.state;
  const step = r.assessment.steps[0];
  s = toggleStep(s, r.reading.id, step);
  const sent = sendCase(s, { readingId: r.reading.id, settingId: 'mars-base', at: 10_000 });
  return { state: sent.state, caseId: sent.pack.id };
}

function pathwayCase(): { state: State; caseId: string } {
  let s = toggleSymptom(initialState(seed), 'crew-4', 'Pain in side or lower back', 1000);
  s = toggleSymptom(s, 'crew-4', 'Nauseous', 1001);
  const sent = sendPathwayCase(s, seed, rules, { crewId: 'crew-4', pathwayId: 'KS-01', settingId: 'mars-base', at: 2000 });
  s = logPain(sent.state, { crewId: 'crew-4', pathwayId: 'KS-01', score: 6, at: 2500 });
  return { state: s, caseId: sent.pack.id };
}

describe('isbar', () => {
  it('lays out a reading case in ISBAR order from the case fields only', () => {
    const { state, caseId } = readingCase();
    const c = caseContent(state, seed, rules, caseId);
    const h = isbar(c);
    expect(h.map((x) => x.label)).toEqual(['Identify', 'Situation', 'Background', 'Assessment', 'Request']);
    if (c.kind !== 'reading') throw new Error('expected a reading case');
    const all = h.flatMap((x) => x.lines).join('\n');
    expect(all).toContain(c.crew);
    expect(all).toContain(`Mission day ${c.missionDay}`);
    expect(all).toContain(c.reading.indicator);
    expect(all).toContain(String(c.reading.value));
    expect(all).toContain(c.assessment.rules[0].id);
    expect(all).toContain('Urgent');
    expect(all).toContain(`Steps done: ${c.stepsDone[0].replace(/\.$/, "")}`);
    expect(all).not.toMatch(/undefined|NaN|\[object/);
    expect(h[3].lines.at(-1)).toBe(NOT_A_DIAGNOSIS);
    expect(h[4].lines).toEqual([REQUEST_LINE]);
  });
  it('flags a placeholder rule', () => {
    const { state, caseId } = readingCase();
    const c = caseContent(state, seed, rules, caseId);
    if (c.kind !== 'reading') throw new Error('expected a reading case');
    const placeholder = c.assessment.rules.some((r) => r.placeholder);
    expect(isbar(c)[3].lines.some((l) => l.includes('Placeholder, awaiting clinician review.'))).toBe(placeholder);
  });
  it('lays out a symptom pathway case with symptoms, pain scores and tests', () => {
    const { state, caseId } = pathwayCase();
    const c = caseContent(state, seed, rules, caseId);
    const h = isbar(c, { time: () => 'T', tierWord: (t) => `tier-${t}` });
    const all = h.flatMap((x) => x.lines).join('\n');
    expect(all).toContain('Pattern to check for: Possible kidney stone');
    expect(all).toContain('Pain in side or lower back at T');
    expect(all).toContain('6 out of 10 at T');
    expect(all).toContain('Urine test strip: blood: Not recorded');
    expect(all).toContain('Rule KS-01');
    expect(all).toContain('Placeholder, awaiting clinician review.');
    expect(all).toContain('Tier: tier-amber');
    expect(all).not.toMatch(/undefined|NaN|\[object/);
    expect(h[3].lines.at(-1)).toBe(NOT_A_DIAGNOSIS);
    expect(h[4].lines).toEqual([REQUEST_LINE]);
  });
});

describe('replies from the remote doctor', () => {
  it('saves a valid reply, keeping the words as written', () => {
    const { state, caseId } = readingCase();
    const r = replyToCase(state, { caseId, decision: 'add', note: '  Doctor note  ', steps: ['Step one', ' ', 'Step two '], at: 50 });
    expect(r.reply).toEqual({ id: 'reply-50', caseId, at: 50, decision: 'add', note: 'Doctor note', steps: ['Step one', 'Step two'] });
    expect(state.replies).toBeUndefined();
    expect(repliesFor(r.state, caseId)).toHaveLength(1);
    const again = replyToCase(r.state, { caseId, decision: 'agree', note: 'Second', at: 50 });
    expect(again.reply.id).toBe('reply-50-2');
    expect(again.reply.steps).toEqual([]);
  });
  it('refuses a bad decision, an empty note or an unknown case', () => {
    const { state, caseId } = readingCase();
    expect(() => replyToCase(state, { caseId, decision: 'maybe', note: 'x', at: 1 })).toThrow(/decision/);
    expect(() => replyToCase(state, { caseId, decision: 'agree', note: '   ', at: 1 })).toThrow(/note/);
    expect(() => replyToCase(state, { caseId: 'nope', decision: 'agree', note: 'x', at: 1 })).toThrow(/Unknown case/);
  });
  it('lists replies for one case, oldest first', () => {
    const { state, caseId } = readingCase();
    let s = replyToCase(state, { caseId, decision: 'agree', note: 'b', at: 20 }).state;
    s = replyToCase(s, { caseId, decision: 'change', note: 'a', at: 10 }).state;
    expect(repliesFor(s, caseId).map((r) => r.note)).toEqual(['a', 'b']);
    expect(repliesFor(s, 'other')).toEqual([]);
  });
  it('marks a reply accepted once, keeping the first time', () => {
    const { state, caseId } = readingCase();
    const { state: s, reply } = replyToCase(state, { caseId, decision: 'agree', note: 'n', at: 5 });
    const a = acceptReply(s, reply.id, 100);
    expect(repliesFor(a, caseId)[0].acceptedAt).toBe(100);
    expect(acceptReply(a, reply.id, 200)).toBe(a);
    expect(() => acceptReply(a, 'nope', 1)).toThrow(/Unknown reply/);
  });
});

describe('linkStatus', () => {
  const setting = settingById(seed, 'mars-base');
  it('counts down while waiting, then shows queued', () => {
    const { state, caseId } = readingCase();
    const pack = state.outbox.find((p) => p.id === caseId)!;
    const w = linkStatus(state, pack, setting, pack.createdAt + 1000);
    expect(w.status).toBe('waiting');
    expect(w.secondsLeft).toBeCloseTo(setting.replySeconds - 1, 5);
    expect(linkStatus(state, pack, setting, pack.createdAt + setting.replySeconds * 1000)).toEqual({ status: 'queued', secondsLeft: 0 });
  });
  it('shows no link while the link is down, and reply-in once a reply exists', () => {
    const { state, caseId } = readingCase();
    const pack = state.outbox.find((p) => p.id === caseId)!;
    const down: State = { ...state, ui: { ...state.ui, linkDown: true } };
    expect(linkStatus(down, pack, setting, pack.createdAt).status).toBe('no-link');
    const replied = replyToCase(down, { caseId, decision: 'agree', note: 'n', at: 1 }).state;
    // A reply written at once still cannot reach the crew before the signal has gone there and back.
    expect(linkStatus(replied, pack, setting, pack.createdAt).status).not.toBe('reply-in');
    expect(linkStatus(replied, pack, setting, pack.createdAt + setting.replySeconds * 1000)).toEqual({ status: 'reply-in', secondsLeft: 0 });
  });
});
