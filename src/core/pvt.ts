// Maths for the PVT-style reaction check: median, lapses, a summary of one run, and the random gap before each counter.
// AI assistance: drafted with Claude Code (see AI_USE.md).

/**
 * A lapse is a response slower than this many milliseconds.
 * 500 ms is the placeholder definition in the clinical lead's build pack, awaiting clinician sign-off.
 */
export const LAPSE_MS = 500;

export type PvtMode = 'full' | 'demo';

/** How long one run lasts. The full check is 3 minutes; the demo length exists only because a demo cannot wait 3 minutes. */
export const PVT_DURATION_MS: Record<PvtMode, number> = { full: 180_000, demo: 30_000 };

/** The random gap before each counter appears, in milliseconds: 2 to 10 seconds for the full check, 1 to 3 seconds in the demo. */
export const PVT_GAP_MS: Record<PvtMode, { min: number; max: number }> = {
  full: { min: 2_000, max: 10_000 },
  demo: { min: 1_000, max: 3_000 },
};

function check(trialsMs: number[]): void {
  if (trialsMs.length === 0) throw new Error('No reaction times were recorded, so there is nothing to summarise. Run the check again.');
  for (const t of trialsMs) {
    if (!Number.isFinite(t) || t < 0) throw new Error(`${t} is not a possible reaction time.`);
  }
}

/** The middle reaction time, in whole milliseconds. With an even count, the average of the two middle times. */
export function median(trialsMs: number[]): number {
  check(trialsMs);
  const s = [...trialsMs].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return Math.round(s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2);
}

/** How many responses were slower than the lapse time (strictly more than LAPSE_MS). */
export function countLapses(trialsMs: number[], lapseMs: number = LAPSE_MS): number {
  return trialsMs.filter((t) => t > lapseMs).length;
}

/** One run in three numbers. False starts are never passed in: they are not trials. */
export function summarise(trialsMs: number[]): { median: number; lapses: number; trials: number } {
  check(trialsMs);
  return { median: median(trialsMs), lapses: countLapses(trialsMs), trials: trialsMs.length };
}

/** The gap before the next counter, from a random number in [0, 1) such as Math.random(). */
export function nextGapMs(rand: () => number, mode: PvtMode): number {
  const r = Math.min(Math.max(rand(), 0), 1);
  const { min, max } = PVT_GAP_MS[mode];
  return Math.round(min + r * (max - min));
}
