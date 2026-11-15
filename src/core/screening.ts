// The crew medic's systems screen results (FR-65): each check on a monitor alert's checklist marked found or not found,
// kept with the time and sent with the case and the handover. Guidance only: a result never changes a tier.
// AI assistance: drafted with Claude Code (see AI_USE.md).
import type { State } from './types.ts';

export type ScreenResult = 'found' | 'not found';

/** Mark one check, or clear it by marking it again with the same result. Keyed "heading: check". */
export function markScreen(state: State, args: { crewId: string; heading: string; check: string; result: ScreenResult; at: number }): State {
  const all = state.systemsScreen ?? {};
  const mine = all[args.crewId] ?? { at: args.at, results: {} };
  const key = `${args.heading}: ${args.check}`;
  const results = { ...mine.results };
  if (results[key] === args.result) delete results[key];
  else results[key] = args.result;
  return { ...state, systemsScreen: { ...all, [args.crewId]: { at: args.at, results } } };
}

/** One plain line for a case or handover, found items first, or undefined when nothing has been marked. */
export function screenSummary(state: State, crewId: string): string | undefined {
  const r = state.systemsScreen?.[crewId]?.results ?? {};
  const found = Object.keys(r).filter((k) => r[k] === 'found');
  const not = Object.keys(r).filter((k) => r[k] === 'not found');
  if (!found.length && !not.length) return undefined;
  return [found.length ? `Found: ${found.join('; ')}.` : '', not.length ? `Not found: ${not.join('; ')}.` : ''].filter(Boolean).join(' ');
}
