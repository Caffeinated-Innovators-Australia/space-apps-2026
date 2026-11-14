// The weekly crew check-in: five statements answered 1 to 5, kept for the flight psychologist only. Pure functions.
// AI assistance: drafted with Claude Code (see AI_USE.md).
import { crewById } from './actions.ts';
import type { CrewCheck, Seed, State } from './types.ts';

/** The mission week a day falls in: days 1 to 7 are week 1. */
export function weekOf(missionDay: number): number {
  if (!Number.isInteger(missionDay) || missionDay < 1) throw new Error(`Mission day ${missionDay} is not a possible day.`);
  return Math.floor((missionDay - 1) / 7) + 1;
}

function items(seed: Seed): string[] {
  if (!seed.crewCheck) throw new Error('This mission has no crew check-in set up.');
  return seed.crewCheck.items;
}

function mine(state: State, seed: Seed, crewId: string): CrewCheck | undefined {
  crewById(seed, crewId);
  const week = weekOf(seed.missionDay);
  return (state.crewChecks ?? []).find((c) => c.crewId === crewId && c.week === week);
}

/** True when this crew member has not done this week's crew check-in. */
export function crewCheckDue(state: State, seed: Seed, crewId: string): boolean {
  items(seed);
  return mine(state, seed, crewId) === undefined;
}

/** Saves this week's answers for one crew member, replacing any earlier answers this week. Each answer is a whole number from 1 to 5, one per statement. */
export function recordCrewCheck(state: State, seed: Seed, args: { crewId: string; answers: number[]; at: number }): State {
  const list = items(seed);
  crewById(seed, args.crewId);
  if (!Array.isArray(args.answers) || args.answers.length !== list.length) {
    throw new Error(`The crew check-in needs one answer for each of its ${list.length} statements.`);
  }
  for (const a of args.answers) {
    if (!Number.isInteger(a) || a < 1 || a > 5) throw new Error(`${a} is not an answer: each answer is a whole number from 1 to 5.`);
  }
  if (!Number.isFinite(args.at)) throw new Error('The time of the check-in is missing.');
  const week = weekOf(seed.missionDay);
  const entry: CrewCheck = { crewId: args.crewId, week, answers: [...args.answers], at: args.at };
  const rest = (state.crewChecks ?? []).filter((c) => !(c.crewId === args.crewId && c.week === week));
  return { ...state, crewChecks: [...rest, entry] };
}

/** This week's entry for one crew member, for that person's own device only. Never another person's. */
export function crewCheckFor(state: State, seed: Seed, crewId: string): CrewCheck | null {
  items(seed);
  const c = mine(state, seed, crewId);
  return c ? { ...c, answers: [...c.answers] } : null;
}

/**
 * What anyone other than the flight psychologist may see: how many of the crew have completed this week's check-in.
 * Never an answer and never an average: in a crew of four, an average identifies people.
 */
export function crewCheckShare(state: State, seed: Seed): { week: number; completed: number; of: number } {
  items(seed);
  const week = weekOf(seed.missionDay);
  const ids = new Set(seed.crew.map((c) => c.id));
  const done = new Set((state.crewChecks ?? []).filter((c) => c.week === week && ids.has(c.crewId)).map((c) => c.crewId));
  return { week, completed: done.size, of: seed.crew.length };
}
