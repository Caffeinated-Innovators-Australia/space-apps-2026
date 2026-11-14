// Tests for location profiles: facts, body mass from a scale, dizziness checks, the adapting period, display bands and what changes.
// AI assistance: drafted with Claude Code (see AI_USE.md).
import { describe, expect, it } from 'vitest';
import seedJson from '../data/seed.json';
import { initialState } from './actions.ts';
import { ADAPT_DAYS, adapting, displayBands, massFromScale, noteGravityChange, profileFacts, showDizzinessOnStanding, whatChanges } from './profiles.ts';
import type { Seed, Setting } from './types.ts';

const seed = seedJson as unknown as Seed;
const by = (id: string) => seed.settings.find((s) => s.id === id) as Setting;
const mars = by('mars-18');
const moon = by('moon');
const station = by('station');
const transit = by('transit');
const earth = by('earth');
const DAY = 86_400_000;

describe('profileFacts', () => {
  it('shows gravity, cabin atmosphere and how far help is', () => {
    expect(profileFacts(mars)).toEqual([
      { label: 'Gravity', value: '0.38 g' },
      { label: 'Cabin atmosphere', value: '56.5 kPa, 34% oxygen' },
      { label: 'How far help is', value: '18 min' },
    ]);
    expect(profileFacts(station)[0].value).toBe('0 g');
    expect(profileFacts(earth)[0].value).toBe('1 g');
  });
});

describe('massFromScale', () => {
  it('gives the pack example: 26.6 kg at 0.38 g is 70 kg', () => {
    expect(massFromScale(26.6, 0.38)).toBe(70);
  });
  it('reads true at 1 g and is undefined at 0 g', () => {
    expect(massFromScale(70, 1)).toBe(70);
    expect(massFromScale(10, 0)).toBeUndefined();
  });
});

describe('showDizzinessOnStanding', () => {
  it('is hidden only in zero gravity', () => {
    expect(showDizzinessOnStanding(station)).toBe(false);
    expect(showDizzinessOnStanding(transit)).toBe(false);
    expect(showDizzinessOnStanding(mars)).toBe(true);
    expect(showDizzinessOnStanding(moon)).toBe(true);
    expect(showDizzinessOnStanding(earth)).toBe(true);
  });
});

describe('noteGravityChange and adapting', () => {
  const s0 = initialState(seed);
  it('records a change of gravity band and nothing else', () => {
    const s1 = noteGravityChange(s0, transit, mars, 1000);
    expect(s1.ui.gravityChange).toEqual({ from: 'zero', at: 1000 });
    expect(noteGravityChange(s0, transit, station, 1000)).toBe(s0);
    expect(noteGravityChange(s0, mars, by('mars-base'), 1000)).toBe(s0);
  });
  it('is active for the placeholder number of days, counted in real time', () => {
    expect(ADAPT_DAYS).toBe(14);
    const s1 = noteGravityChange(s0, transit, mars, 0);
    expect(adapting(s1, mars, 0)).toEqual({ active: true, daysLeft: 14, from: 'zero' });
    expect(adapting(s1, mars, 3.5 * DAY)).toEqual({ active: true, daysLeft: 11, from: 'zero' });
    expect(adapting(s1, mars, 14 * DAY).active).toBe(false);
  });
  it('is off with no change, or when back in the old gravity', () => {
    expect(adapting(s0, mars, 0).active).toBe(false);
    const s1 = noteGravityChange(s0, transit, mars, 0);
    expect(adapting(s1, station, DAY).active).toBe(false);
  });
});

describe('displayBands', () => {
  it('uses sea-level bands in sea-level cabins', () => {
    const b = displayBands(station);
    expect(b.oxygenSaturation).toMatchObject({ lo: 94, critLo: 90 });
    expect(b.cabinPressure).toMatchObject({ lo: 97, critLo: 90 });
    expect(b.placeholder).toBe(true);
    expect(b.note).toMatch(/never raises an alert by itself/);
  });
  it('uses the lower bands in 56.5 kPa habitats', () => {
    for (const s of [mars, moon]) {
      const b = displayBands(s);
      expect(b.oxygenSaturation).toMatchObject({ lo: 92, critLo: 88 });
      expect(b.cabinPressure).toMatchObject({ lo: 54, critLo: 50 });
    }
  });
  it('has no cabin pressure band on Earth', () => {
    const b = displayBands(earth);
    expect(b.oxygenSaturation).toMatchObject({ lo: 94, critLo: 90 });
    expect(b.cabinPressure).toBeUndefined();
  });
});

describe('whatChanges', () => {
  const areas = ['Resuscitation', 'Drip (IV) line', 'Oxygen display', 'Dizziness on standing', 'Body mass', 'Fluid shift'];
  it('lists the same six areas in every place, each a placeholder', () => {
    for (const s of seed.settings) {
      const list = whatChanges(s);
      expect(list.map((x) => x.area)).toEqual(areas);
      expect(list.every((x) => x.placeholder === true)).toBe(true);
    }
  });
  it('gives the emergency module the resuscitation and drip lines', () => {
    const list = whatChanges(mars);
    expect(list.filter((x) => x.builtBy === 'emergency module').map((x) => x.area)).toEqual(['Resuscitation', 'Drip (IV) line']);
  });
  it('follows the gravity band', () => {
    expect(whatChanges(station)[0].text).toMatch(/Restrain/);
    expect(whatChanges(mars)[0].text).toMatch(/every 2 minutes or sooner/);
    expect(whatChanges(moon)[0].text).toMatch(/about every minute/);
    expect(whatChanges(earth)[0].text).toMatch(/Standard/);
    expect(whatChanges(station)[4].text).toMatch(/body-mass measuring device/);
    expect(whatChanges(mars)[4].text).toMatch(/0\.38/);
  });
});
