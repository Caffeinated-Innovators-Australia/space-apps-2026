// Healing tracker: a wound or skin problem, checked once a day as better, same or worse. No photo is kept and no rule reads the count.
// AI assistance: drafted with Claude Code (see AI_USE.md).
import type { State, Wound } from './types.ts';

export const WOUND_LABELS = ['Cut', 'Graze', 'Burn', 'Blister', 'Rash', 'Cold sore', 'Hand or fingernail injury from gloves', 'Rubbing or pressure sore', 'Other skin problem'] as const;
export type WoundStatus = Wound['checks'][number]['status'];
export const WOUND_STATUSES: WoundStatus[] = ['better', 'same', 'worse'];

/** Calendar day number on this device, so two times on the same day compare equal. */
function dayNo(at: number): number {
  const d = new Date(at);
  return Math.round(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86400000);
}

export function woundsFor(state: State, crewId: string): Wound[] {
  return (state.wounds ?? []).filter((w) => w.crewId === crewId);
}

/** Start watching one wound or skin problem. The label must be one of WOUND_LABELS. */
export function startWound(state: State, args: { crewId: string; label: string; at: number }): { state: State; wound: Wound } {
  if (!(WOUND_LABELS as readonly string[]).includes(args.label)) throw new Error(`"${args.label}" is not on the list of things the healing tracker can follow.`);
  if (!Number.isFinite(args.at)) throw new Error('The start time is missing.');
  const all = state.wounds ?? [];
  const wound: Wound = { id: `w-${args.at}-${all.length + 1}`, crewId: args.crewId, label: args.label, startedAt: args.at, checks: [] };
  return { state: { ...state, wounds: [...all, wound] }, wound };
}

/** Log today's check. A second check on the same day replaces the first, so a slip of the finger can be corrected. */
export function checkWound(state: State, woundId: string, status: WoundStatus, at: number): State {
  if (!WOUND_STATUSES.includes(status)) throw new Error(`"${status}" is not one of better, same or worse.`);
  const all = state.wounds ?? [];
  const w = all.find((x) => x.id === woundId);
  if (!w) throw new Error('That tracked item was not found on this device.');
  if (at < w.startedAt) throw new Error('A check cannot come before the item was first logged.');
  const checks = [...w.checks.filter((c) => dayNo(c.at) !== dayNo(at)), { at, status }].sort((a, b) => a.at - b.at);
  return { ...state, wounds: all.map((x) => (x.id === woundId ? { ...x, checks } : x)) };
}

export interface WoundSummary {
  /** Whole calendar days since it was first logged: 0 on the first day. */
  days: number;
  /** Checks oldest first, each with its day count since the start. */
  checks: { at: number; status: WoundStatus; day: number }[];
  noCheckToday: boolean;
}

/** What has been logged. It says nothing about what a number of days means: that is for the crew medic. */
export function woundSummary(wound: Wound, now: number): WoundSummary {
  const start = dayNo(wound.startedAt);
  const checks = [...wound.checks].sort((a, b) => a.at - b.at).map((c) => ({ ...c, day: dayNo(c.at) - start }));
  return { days: Math.max(0, dayNo(now) - start), checks, noCheckToday: !wound.checks.some((c) => dayNo(c.at) === dayNo(now)) };
}
