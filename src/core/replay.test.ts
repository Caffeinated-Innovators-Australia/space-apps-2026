// Tests for the rules replay.
// AI assistance: drafted with Claude Code (see AI_USE.md).
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parseRules } from './rules.ts';
import { plantedChanges, replay } from './replay.ts';
import type { Seed } from './types.ts';

const rules = parseRules(readFileSync('rules/rules.yaml', 'utf8'));
const seed = JSON.parse(readFileSync('src/data/seed.json', 'utf8')) as Seed;

describe('rules replay', () => {
  const r = replay(seed, rules);
  it('covers every past mission day and thousands of readings', () => {
    expect(r.days).toBe(seed.missionDay - 1);
    expect(r.readings).toBeGreaterThan(1500);
  });
  it('catches every change the demo data was built with', () => {
    expect(r.planted).toHaveLength(plantedChanges(seed).length);
    for (const p of r.planted) expect(p.firstRaisedDay, p.what).not.toBeNull();
  });
  it('reports the false alarms honestly: more than none, and the numbers add up', () => {
    expect(r.quiet.amber + r.quiet.red).toBeGreaterThan(0);
    expect(r.quiet.per100).toBeCloseTo(((r.quiet.amber + r.quiet.red) / r.quiet.readings) * 100, 1);
  });
  it('sees only what was known on the day: a reading is never judged using later days', () => {
    const first = replay({ ...seed, crew: seed.crew.map((c) => ({ ...c, mission: Object.fromEntries(Object.entries(c.mission).map(([k, v]) => [k, v.slice(0, 30)])) })), missionDay: 31 }, rules);
    expect(first.readings).toBeLessThan(r.readings);
  });
});
