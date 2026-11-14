// Tests for the PVT-style reaction check maths.
// AI assistance: drafted with Claude Code (see AI_USE.md).
import { describe, expect, it } from 'vitest';
import { countLapses, LAPSE_MS, median, nextGapMs, PVT_DURATION_MS, summarise } from './pvt.ts';

describe('PVT-style reaction check', () => {
  it('takes the median, odd and even counts, without changing the input', () => {
    const t = [300, 250, 900];
    expect(median(t)).toBe(300);
    expect(t).toEqual([300, 250, 900]);
    expect(median([250, 260, 270, 290])).toBe(265);
    expect(median([251, 252])).toBe(252);
  });
  it('counts lapses only over 500 ms', () => {
    expect(LAPSE_MS).toBe(500);
    expect(countLapses([499, 500, 501, 1200])).toBe(2);
    expect(countLapses([])).toBe(0);
  });
  it('summarises one run', () => {
    expect(summarise([240, 260, 620, 250, 255])).toEqual({ median: 255, lapses: 1, trials: 5 });
  });
  it('refuses an empty or impossible run', () => {
    expect(() => summarise([])).toThrow(/No reaction times/);
    expect(() => median([250, -3])).toThrow(/not a possible/);
    expect(() => median([Number.NaN])).toThrow(/not a possible/);
  });
  it('picks gaps of 2 to 10 seconds, or 1 to 3 in the demo', () => {
    expect(nextGapMs(() => 0, 'full')).toBe(2000);
    expect(nextGapMs(() => 0.999999, 'full')).toBe(10000);
    expect(nextGapMs(() => 0.5, 'full')).toBe(6000);
    expect(nextGapMs(() => 0, 'demo')).toBe(1000);
    expect(nextGapMs(() => 0.5, 'demo')).toBe(2000);
    for (let i = 0; i < 200; i++) {
      const g = nextGapMs(Math.random, 'full');
      expect(g).toBeGreaterThanOrEqual(2000);
      expect(g).toBeLessThanOrEqual(10000);
    }
    expect(nextGapMs(() => 7, 'demo')).toBe(3000);
  });
  it('runs 3 minutes in full and 30 seconds in the demo', () => {
    expect(PVT_DURATION_MS).toEqual({ full: 180000, demo: 30000 });
  });
});
