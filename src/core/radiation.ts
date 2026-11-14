// Radiation dose: the running total against NASA's career limit, the recent daily increases and plain arithmetic on them.
// AI assistance: drafted with Claude Code (see AI_USE.md).
import { crewById, indicatorById, latestReading } from './actions.ts';
import { round } from './rules.ts';
import type { Seed, State } from './types.ts';

export interface DoseSummary {
  unit: string;
  dp: number;
  /** The latest running total: today's logged reading if there is one, else the total at the end of the last mission day. */
  latest: { day: number; total: number; loggedToday: boolean; at?: number } | null;
  /** The sourced limit, if the indicator has one. */
  limit: { value: number; label: string; source: string } | null;
  /** latest total divided by the limit (0 to 1 and beyond). Null without a total or a limit. */
  share: number | null;
  /** Up to the last 14 increases: each day's total minus the total before it. */
  daily: { day: number; increase: number }[];
  /** Average increase per day over those days. Null with fewer than two totals. */
  average: number | null;
  /** Days until the limit at that average. Plain arithmetic; null if the average is zero or less, or there is no limit. */
  daysToLimit: number | null;
}

const WINDOW = 14;

/** One person's dose so far and where the recent rate would take it. No mission length or return date is assumed. */
export function doseSummary(state: State, seed: Seed, crewId: string, indicatorId = 'radiation'): DoseSummary {
  const crew = crewById(seed, crewId);
  const ind = indicatorById(seed, indicatorId);
  const totals: { day: number; total: number }[] = [];
  (crew.mission[indicatorId] ?? []).forEach((v, i) => {
    if (typeof v === 'number' && Number.isFinite(v)) totals.push({ day: i + 1, total: v });
  });
  const today = latestReading(state, crewId, indicatorId);
  if (today) {
    const last = totals[totals.length - 1];
    if (last && last.day === today.day) totals.pop();
    totals.push({ day: today.day, total: today.value });
  }
  const end = totals[totals.length - 1];
  const latest = end ? { day: end.day, total: end.total, loggedToday: Boolean(today), at: today?.at } : null;
  const limit = typeof ind.limit?.high === 'number' ? { value: ind.limit.high, label: ind.limit.label, source: ind.limit.source } : null;
  const share = latest && limit ? latest.total / limit.value : null;
  const recent = totals.slice(-(WINDOW + 1));
  const daily = recent.slice(1).map((t, i) => ({ day: t.day, increase: round(t.total - recent[i].total, ind.dp + 1) }));
  let average: number | null = null;
  if (recent.length >= 2) {
    const first = recent[0];
    const last = recent[recent.length - 1];
    average = (last.total - first.total) / (last.day - first.day);
  }
  let daysToLimit: number | null = null;
  if (latest && limit && average !== null && average > 0) daysToLimit = Math.max(0, Math.ceil((limit.value - latest.total) / average));
  return { unit: ind.unit, dp: ind.dp, latest, limit, share, daily, average, daysToLimit };
}

/** Mission days with a real solar particle event on record (NASA DONKI), as set in the seed. */
export function eventDays(seed: Seed): number[] {
  return seed.radiationDays ?? [];
}

/** The mission day (1 is the start date) of an ISO time, counted in UTC. */
export function missionDayOf(missionStart: string, time: string): number {
  const start = Date.UTC(+missionStart.slice(0, 4), +missionStart.slice(5, 7) - 1, +missionStart.slice(8, 10));
  const t = new Date(time);
  return Math.round((Date.UTC(t.getUTCFullYear(), t.getUTCMonth(), t.getUTCDate()) - start) / 86400000) + 1;
}

/** Event records that fall in the mission so far, newest first. */
export function missionEvents<E extends { time: string }>(missionStart: string, missionDay: number, events: E[]): (E & { day: number })[] {
  return events
    .map((e) => ({ ...e, day: missionDayOf(missionStart, e.time) }))
    .filter((e) => e.day >= 1 && e.day <= missionDay)
    .sort((a, b) => (a.time < b.time ? 1 : a.time > b.time ? -1 : 0));
}
