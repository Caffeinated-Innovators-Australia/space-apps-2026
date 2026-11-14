// Tests for the weekly crew check-in.
// AI assistance: drafted with Claude Code (see AI_USE.md).
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { initialState } from './actions.ts';
import type { Seed, State } from './types.ts';
import { crewCheckDue, crewCheckFor, crewCheckShare, recordCrewCheck, weekOf } from './crewcheck.ts';

const seed = JSON.parse(readFileSync('src/data/seed.json', 'utf8')) as Seed;
const t0 = new Date(2026, 10, 14, 9, 0).getTime();
const five = [4, 5, 3, 2, 4];

describe('weekly crew check-in', () => {
  it('numbers 7-day mission weeks from 1', () => {
    expect(weekOf(1)).toBe(1);
    expect(weekOf(7)).toBe(1);
    expect(weekOf(8)).toBe(2);
    expect(weekOf(214)).toBe(31);
    expect(() => weekOf(0)).toThrow(/not a possible day/);
  });
  it('the seed has five statements', () => {
    expect(seed.crewCheck?.items).toHaveLength(5);
  });
  it('is due until saved, for that person only', () => {
    const s0 = initialState(seed);
    expect(crewCheckDue(s0, seed, 'crew-1')).toBe(true);
    const s1 = recordCrewCheck(s0, seed, { crewId: 'crew-1', answers: five, at: t0 });
    expect(crewCheckDue(s1, seed, 'crew-1')).toBe(false);
    expect(crewCheckDue(s1, seed, 'crew-2')).toBe(true);
    expect(s0.crewChecks ?? []).toEqual([]);
    expect(() => crewCheckDue(s0, seed, 'nobody')).toThrow();
  });
  it('replaces this week\'s entry and keeps earlier weeks', () => {
    const old = { crewId: 'crew-1', week: weekOf(seed.missionDay) - 1, answers: [1, 1, 1, 1, 1], at: t0 - 7 * 86400000 };
    let s: State = { ...initialState(seed), crewChecks: [old] };
    s = recordCrewCheck(s, seed, { crewId: 'crew-1', answers: five, at: t0 });
    s = recordCrewCheck(s, seed, { crewId: 'crew-1', answers: [2, 2, 2, 2, 2], at: t0 + 1000 });
    expect(s.crewChecks).toHaveLength(2);
    expect(crewCheckFor(s, seed, 'crew-1')?.answers).toEqual([2, 2, 2, 2, 2]);
    expect(s.crewChecks).toContainEqual(old);
  });
  it('refuses answers out of range or the wrong count', () => {
    const s = initialState(seed);
    expect(() => recordCrewCheck(s, seed, { crewId: 'crew-1', answers: [1, 2, 3, 4], at: t0 })).toThrow(/one answer for each/);
    expect(() => recordCrewCheck(s, seed, { crewId: 'crew-1', answers: [1, 2, 3, 4, 5, 1], at: t0 })).toThrow(/one answer for each/);
    expect(() => recordCrewCheck(s, seed, { crewId: 'crew-1', answers: [0, 2, 3, 4, 5], at: t0 })).toThrow(/1 to 5/);
    expect(() => recordCrewCheck(s, seed, { crewId: 'crew-1', answers: [6, 2, 3, 4, 5], at: t0 })).toThrow(/1 to 5/);
    expect(() => recordCrewCheck(s, seed, { crewId: 'crew-1', answers: [2.5, 2, 3, 4, 5], at: t0 })).toThrow(/1 to 5/);
    expect(() => recordCrewCheck(s, seed, { crewId: 'nobody', answers: five, at: t0 })).toThrow();
  });
  it('shares only a count of who has completed it', () => {
    let s = initialState(seed);
    expect(crewCheckShare(s, seed)).toEqual({ week: 31, completed: 0, of: seed.crew.length });
    s = recordCrewCheck(s, seed, { crewId: 'crew-1', answers: five, at: t0 });
    s = recordCrewCheck(s, seed, { crewId: 'crew-1', answers: five, at: t0 + 1 });
    s = recordCrewCheck(s, seed, { crewId: 'crew-2', answers: [1, 1, 1, 1, 1], at: t0 });
    const share = crewCheckShare(s, seed);
    expect(share).toEqual({ week: 31, completed: 2, of: seed.crew.length });
    expect(Object.keys(share).sort()).toEqual(['completed', 'of', 'week']);
  });
  it('never exposes another crew member\'s answers', () => {
    let s = initialState(seed);
    s = recordCrewCheck(s, seed, { crewId: 'crew-2', answers: [1, 1, 1, 1, 1], at: t0 });
    expect(crewCheckFor(s, seed, 'crew-1')).toBeNull();
    s = recordCrewCheck(s, seed, { crewId: 'crew-1', answers: five, at: t0 });
    const own = crewCheckFor(s, seed, 'crew-1')!;
    expect(own.crewId).toBe('crew-1');
    expect(own.answers).toEqual(five);
    // A copy: changing it does not reach the saved record.
    own.answers[0] = 5;
    expect(crewCheckFor(s, seed, 'crew-1')!.answers).toEqual(five);
    // The shared view carries no answers and nothing derived from them.
    expect(JSON.stringify(crewCheckShare(s, seed))).not.toMatch(/answers|average|mean|score/);
  });
});
