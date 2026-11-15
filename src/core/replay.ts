// Replay: run the rules over every past mission day, one day at a time, seeing only what was known by then.
// It counts how often the rules raise something on a series nobody changed, and how soon they catch the changes the demo data was built with.
// AI assistance: drafted with Claude Code (see AI_USE.md).
import { crewById, limitsFor } from './actions.ts';
import { assess, personalBand, type RuleFile, type Tier } from './rules.ts';
import type { Seed } from './types.ts';

/** A change that was written into the demo data on purpose. Anything raised outside these is a false alarm by construction. */
export interface Planted { crewId: string; indicatorId: string; fromDay: number; what: string }

export interface ReplayResult {
  days: number;
  readings: number;
  /** Readings on series with no planted change. */
  quiet: { readings: number; amber: number; red: number; /** Raised results that the next-before reading of the same signal also raised: what the app marks as confirmed. */ confirmed: number; per100: number; perPersonPerWeek: number; confirmedPerPersonPerWeek: number; byRule: Record<string, number> };
  /** Each planted change: the mission day it began, and the first day the rules raised it. */
  planted: { crewId: string; indicatorId: string; what: string; fromDay: number; firstRaisedDay: number | null; daysToRaise: number | null; tier: Tier | null; rules: string }[];
  /** The early-warning rule of each pathway, replayed the same way. */
  early: { ruleId: string; quietFirings: number; quietPersonDays: number; plantedFirstDay: number | null }[];
}

/** The changes the demo data was built with (see scripts/make_mission_data.py). */
export function plantedChanges(seed: Seed): Planted[] {
  const days = seed.missionDay - 1;
  return [
    { crewId: 'crew-1', indicatorId: 'sleep', fromDay: days - 20, what: 'Sleep slides over three weeks' },
    { crewId: 'crew-1', indicatorId: 'fluid', fromDay: days - 2, what: 'Fluid intake low for three days' },
    { crewId: 'cabin', indicatorId: 'cabin-co2', fromDay: days - 6, what: 'Cabin carbon dioxide creeps up over a week' },
  ];
}

export function replay(seed: Seed, rules: RuleFile): ReplayResult {
  const days = seed.missionDay - 1;
  const planted = plantedChanges(seed);
  const isPlanted = (crewId: string, ind: string, day: number) => planted.some((p) => (p.crewId === crewId || p.crewId === 'cabin') && p.indicatorId === ind && day >= p.fromDay);
  const quiet = { readings: 0, amber: 0, red: 0, confirmed: 0, per100: 0, perPersonPerWeek: 0, confirmedPerPersonPerWeek: 0, byRule: {} as Record<string, number> };
  const found = planted.map((p) => ({ ...p, firstRaisedDay: null as number | null, daysToRaise: null as number | null, tier: null as Tier | null, rules: '' }));
  let readings = 0;
  seed.crew.forEach((crew, ci) => {
    for (const ind of seed.indicators) {
      if (ind.mode === 'cumulative') continue;
      const cabin = Boolean(ind.environment);
      if (cabin && ci > 0) continue; // the cabin is shared: count it once
      const baseline = crew.baseline[ind.id] ?? [];
      if (baseline.length < 2) continue;
      const series = crew.mission[ind.id] ?? [];
      const lim = limitsFor(seed, crew.id, ind.id);
      const history: number[] = [];
      let previousRaised = false;
      series.forEach((value, i) => {
        if (value === null) return;
        const day = i + 1;
        const a = assess(rules, {
          region: ind.region, indicator: ind.name, unit: ind.unit, dp: ind.dp, watch: ind.watch, value, baseline, history: [...history],
          fixedSd: ind.fixedSd, limitLow: lim.low, limitHigh: lim.high, limitLabel: lim.label, environment: ind.environment,
        });
        history.push(value);
        readings += 1;
        const tier: Tier = ind.maxTier === 'amber' && a.tier === 'red' ? 'amber' : a.tier;
        const who = cabin ? 'cabin' : crew.id;
        if (isPlanted(who, ind.id, day)) {
          const f = found.find((p) => p.crewId === who && p.indicatorId === ind.id);
          if (f && tier !== 'green' && f.firstRaisedDay === null) { f.firstRaisedDay = day; f.daysToRaise = day - f.fromDay; f.tier = tier; f.rules = a.ruleId; }
          return;
        }
        quiet.readings += 1;
        if (tier !== 'green' && previousRaised) quiet.confirmed += 1;
        previousRaised = tier !== 'green';
        if (tier === 'amber') quiet.amber += 1;
        if (tier === 'red') quiet.red += 1;
        if (tier !== 'green') for (const x of a.findings) quiet.byRule[x.ruleId] = (quiet.byRule[x.ruleId] ?? 0) + 1;
      });
    }
  });
  quiet.per100 = Number((((quiet.amber + quiet.red) / Math.max(1, quiet.readings)) * 100).toFixed(1));
  quiet.confirmedPerPersonPerWeek = Number((quiet.confirmed / seed.crew.length / (days / 7)).toFixed(1));
  quiet.perPersonPerWeek = Number(((quiet.amber + quiet.red) / seed.crew.length / (days / 7)).toFixed(1));

  const early = rules.pathways.filter((w) => w.early).map((w) => {
    const e = w.early!;
    const ind = seed.indicators.find((i) => i.id === e.indicator)!;
    let quietFirings = 0;
    let quietPersonDays = 0;
    let plantedFirstDay: number | null = null;
    for (const crew of seed.crew) {
      const baseline = crew.baseline[e.indicator] ?? [];
      if (baseline.length < 2) continue;
      const band = personalBand(baseline, rules.band.k, ind.fixedSd);
      const floor = band.mean - e.shift_sd * band.sd;
      const logged: number[] = [];
      let was = false;
      (crew.mission[e.indicator] ?? []).forEach((v, i) => {
        if (v === null) return;
        logged.push(v);
        const day = i + 1;
        const fires = logged.length >= e.count && logged.slice(-e.count).every((x) => x < floor);
        if (isPlanted(crew.id, e.indicator, day)) { if (fires && plantedFirstDay === null) plantedFirstDay = day; return; }
        quietPersonDays += 1;
        if (fires && !was) quietFirings += 1; // count each run once
        was = fires;
      });
    }
    return { ruleId: e.id, quietFirings, quietPersonDays, plantedFirstDay };
  });
  return { days, readings, quiet, planted: found, early };
}

/** Kept for the command-line tool: the crew ids, so a caller can check the replay covered everyone. */
export const replayCrew = (seed: Seed) => seed.crew.map((c) => crewById(seed, c.id).id);
