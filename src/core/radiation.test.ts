// Tests for the radiation dose summary and the solar event days.
// AI assistance: drafted with Claude Code (see AI_USE.md).
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { initialState, parseRules, recordReading, type Seed } from './index.ts';
import { doseSummary, eventDays, missionDayOf, missionEvents } from './radiation.ts';

const rules = parseRules(readFileSync('rules/rules.yaml', 'utf8'));
const seed = JSON.parse(readFileSync('src/data/seed.json', 'utf8')) as Seed & { missionStart: string };
const donki = JSON.parse(readFileSync('src/data/donki_sep.json', 'utf8')) as { events: { time: string }[] };
const mission = seed.crew.find((c) => c.id === 'crew-1')!.mission.radiation as number[];

describe('doseSummary', () => {
  it('uses the last mission total when nothing is logged today', () => {
    const d = doseSummary(initialState(seed), seed, 'crew-1');
    expect(d.latest).toEqual({ day: mission.length, total: mission[mission.length - 1], loggedToday: false, at: undefined });
    expect(d.limit?.value).toBe(600);
    expect(d.limit?.source).toContain('NASA-STD-3001');
    expect(d.share).toBeCloseTo(mission[mission.length - 1] / 600, 6);
  });
  it('gives the last 14 daily increases and the plain arithmetic to the limit', () => {
    const d = doseSummary(initialState(seed), seed, 'crew-1');
    expect(d.daily).toHaveLength(14);
    expect(d.daily[13].day).toBe(mission.length);
    expect(d.daily[13].increase).toBeCloseTo(mission[mission.length - 1] - mission[mission.length - 2], 6);
    const avg = (mission[mission.length - 1] - mission[mission.length - 15]) / 14;
    expect(d.average).toBeCloseTo(avg, 6);
    expect(d.daysToLimit).toBe(Math.ceil((600 - mission[mission.length - 1]) / avg));
  });
  it("uses today's logged reading as the latest total", () => {
    const value = mission[mission.length - 1] + 0.7;
    const s = recordReading(initialState(seed), seed, rules, { crewId: 'crew-1', indicatorId: 'radiation', value, at: 5000 }).state;
    const d = doseSummary(s, seed, 'crew-1');
    expect(d.latest).toMatchObject({ day: seed.missionDay, total: value, loggedToday: true, at: 5000 });
    expect(d.daily[13]).toEqual({ day: seed.missionDay, increase: 0.7 });
  });
  it('gives no projection when the total is not rising', () => {
    const flat = { ...seed, crew: seed.crew.map((c) => (c.id === 'crew-1' ? { ...c, mission: { ...c.mission, radiation: [5, 5, 5] } } : c)) };
    const d = doseSummary(initialState(seed), flat, 'crew-1');
    expect(d.average).toBe(0);
    expect(d.daysToLimit).toBeNull();
  });
  it('throws for an unknown crew member', () => {
    expect(() => doseSummary(initialState(seed), seed, 'nobody')).toThrow();
  });
});

describe('solar events', () => {
  it('returns the seed event days', () => {
    expect(eventDays(seed)).toEqual(seed.radiationDays);
  });
  it('counts the start date as mission day 1, in UTC', () => {
    expect(missionDayOf('2026-08-20', '2026-08-20T20:23Z')).toBe(1);
    expect(missionDayOf('2026-08-20', '2026-09-05T16:30Z')).toBe(17);
  });
  it('finds the same event days in the DONKI file as the seed, newest first', () => {
    const ev = missionEvents(seed.missionStart, seed.missionDay, donki.events);
    expect([...new Set(ev.map((e) => e.day))].sort((a, b) => a - b)).toEqual(seed.radiationDays);
    expect(ev[0].time >= ev[ev.length - 1].time).toBe(true);
  });
});
