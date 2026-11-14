// Tests for the healing tracker.
// AI assistance: drafted with Claude Code (see AI_USE.md).
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { initialState, type Seed } from './index.ts';
import { checkWound, startWound, WOUND_LABELS, woundsFor, woundSummary } from './wounds.ts';

const seed = JSON.parse(readFileSync('src/data/seed.json', 'utf8')) as Seed;
const DAY = 86400000;
const t0 = new Date(2026, 10, 10, 9, 0).getTime();

describe('healing tracker', () => {
  it('starts tracking only the fixed labels', () => {
    expect(WOUND_LABELS).toEqual(['Cut', 'Graze', 'Rash', 'Cold sore', 'Other skin problem']);
    const { state, wound } = startWound(initialState(seed), { crewId: 'crew-1', label: 'Cut', at: t0 });
    expect(woundsFor(state, 'crew-1')).toEqual([wound]);
    expect(woundsFor(state, 'crew-2')).toEqual([]);
    expect(() => startWound(state, { crewId: 'crew-1', label: 'Burn', at: t0 })).toThrow(/not on the list/);
  });
  it('logs checks in order, one per day, and replaces a same-day check', () => {
    let { state, wound } = startWound(initialState(seed), { crewId: 'crew-1', label: 'Graze', at: t0 });
    state = checkWound(state, wound.id, 'worse', t0 + 2 * DAY);
    state = checkWound(state, wound.id, 'same', t0 + DAY);
    state = checkWound(state, wound.id, 'better', t0 + DAY + 3600000);
    const w = state.wounds![0];
    expect(w.checks.map((c) => c.status)).toEqual(['better', 'worse']);
    const s = woundSummary(w, t0 + 3 * DAY);
    expect(s.days).toBe(3);
    expect(s.checks.map((c) => c.day)).toEqual([1, 2]);
    expect(s.noCheckToday).toBe(true);
    expect(woundSummary(w, t0 + 2 * DAY + 3600000).noCheckToday).toBe(false);
  });
  it('rejects an unknown item, status or a check before the start', () => {
    const { state, wound } = startWound(initialState(seed), { crewId: 'crew-1', label: 'Rash', at: t0 });
    expect(() => checkWound(state, 'nope', 'same', t0)).toThrow();
    expect(() => checkWound(state, wound.id, 'fine' as never, t0)).toThrow();
    expect(() => checkWound(state, wound.id, 'same', t0 - DAY)).toThrow();
  });
  it('does not change the state passed in', () => {
    const s0 = initialState(seed);
    startWound(s0, { crewId: 'crew-1', label: 'Cut', at: t0 });
    expect(s0.wounds).toBeUndefined();
  });
});
