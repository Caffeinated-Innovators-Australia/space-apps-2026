// Tests for the solar radiation storm alarm (RS-01, CR-09).
// AI assistance: drafted with Claude Code (see AI_USE.md).
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { acknowledgeStorm, countdown, endStorm, initialState, parseRules, settingById, startStormDrill, stormStatus, type Seed } from './index.ts';

const seed = JSON.parse(readFileSync('src/data/seed.json', 'utf8')) as Seed;
const text = readFileSync('rules/rules.yaml', 'utf8');
const rules = parseRules(text);
const mars = settingById(seed, 'mars-base');
const earth = settingById(seed, 'earth');
const MIN = 60_000;

describe('solar radiation storm alarm (RS-01, CR-09)', () => {
  it('pops up with the shelter wording and a countdown to each wave, then becomes a banner once acknowledged', () => {
    const s = startStormDrill(initialState(seed), 0);
    const a = stormStatus(s, seed, rules, mars, 10 * MIN)!;
    expect(a.phase).toBe('alarm');
    expect(a.title).toBe('Solar radiation storm: go to shelter');
    expect(a.lines).toContain('Go to the storm shelter now and stay there until the all-clear.');
    expect(a.waves.map((w) => [w.label, w.arrived])).toEqual([['First particles', false], ['Second wave (shock front)', false]]);
    expect(countdown(a.waves[0].arrivesAt - 10 * MIN)).toBe('32:00');
    expect(countdown(a.waves[1].arrivesAt - 10 * MIN)).toBe('30 h 50 min');
    const b = stormStatus(acknowledgeStorm(s, 11 * MIN), seed, rules, mars, 50 * MIN)!;
    expect(b.phase).toBe('banner');
    expect(b.waves[0].arrived).toBe(true);
    expect(a.synthetic).toBe(true);
  });
  it('clears at the all-clear, is not shown on the Earth twin, and can be ended', () => {
    const s = startStormDrill(initialState(seed), 0);
    expect(stormStatus(s, seed, rules, mars, 4320 * MIN)).toBeNull();
    expect(stormStatus(s, seed, rules, earth, 10 * MIN)).toBeNull();
    expect(stormStatus(endStorm(s), seed, rules, mars, 10 * MIN)).toBeNull();
    expect(stormStatus(initialState(seed), seed, rules, mars, 10 * MIN)).toBeNull();
  });
  it('stays quiet for a forecast below the alarm level, and refuses a level outside S1 to S5', () => {
    const s = startStormDrill(initialState(seed), 0);
    const weak = { ...seed, radiationForecast: { ...seed.radiationForecast!, level: 'S2' } } as Seed;
    expect(stormStatus(s, weak, rules, mars, 10 * MIN)).toBeNull();
    expect(() => parseRules(text.replace('alarm_at: S3', 'alarm_at: S9'))).toThrow(/alarm_at/);
  });
});
