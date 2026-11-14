// Prompt scheduler. Check-ins are fitted around the crew's day and never land on a critical operation.
// AI assistance: drafted with Claude Code (see AI_USE.md).
import type { TimelineBlock } from './types.ts';

export interface CheckIn { id: string; label: string; slot: 'morning' | 'evening' | 'any' }
export interface PlanItem { id: string; label: string; at: string; status: 'done' | 'due' | 'later' | 'held'; note?: string }

export const toMin = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));
export const fromMin = (m: number) => `${String(Math.floor(m / 60) % 24).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;

/** When a critical operation runs late, it ends later and everything after it moves with it. */
export function applySlip(timeline: TimelineBlock[], slipMinutes: number): TimelineBlock[] {
  if (!slipMinutes) return timeline;
  const first = timeline.findIndex((b) => b.critical);
  if (first < 0) return timeline;
  return timeline.map((b, i) => {
    if (i < first) return b;
    if (i === first) return { ...b, end: fromMin(toMin(b.end) + slipMinutes) };
    return { ...b, start: fromMin(toMin(b.start) + slipMinutes), end: fromMin(toMin(b.end) + slipMinutes) };
  });
}

/** Fit each check-in to the day. A check-in that falls due during a critical operation is held until it ends. */
export function plan(timeline: TimelineBlock[], checkIns: CheckIn[], clock: string, done: string[]): PlanItem[] {
  const now = toMin(clock);
  const first = timeline[0];
  const last = timeline[timeline.length - 1];
  const preferred = { morning: toMin(first.start) + 15, evening: toMin(last.start) + 10, any: now };
  const critical = (m: number) => timeline.find((b) => b.critical && m >= toMin(b.start) && m < toMin(b.end));
  return checkIns.map((c) => {
    if (done.includes(c.id)) return { id: c.id, label: c.label, at: fromMin(Math.min(now, Math.max(preferred[c.slot], toMin(first.start)))), status: 'done' as const };
    const want = Math.max(preferred[c.slot], c.slot === 'any' ? now : preferred[c.slot]);
    const target = Math.max(want, now >= want ? now : want);
    const block = critical(target);
    if (block) {
      const at = fromMin(toMin(block.end) + 5);
      return { id: c.id, label: c.label, at, status: 'held' as const, note: `Held during ${block.label}. Moved to ${at}.` };
    }
    return { id: c.id, label: c.label, at: fromMin(target), status: target <= now ? ('due' as const) : ('later' as const) };
  });
}
