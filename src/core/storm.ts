// Solar radiation storm alarm (CR-09): a forecast at or above the rule's level raises a red pop-up on every screen until it
// is acknowledged, then a banner until the all-clear, with a countdown to each wave. The forecast in the demo is SYNTHETIC.
// AI assistance: drafted with Claude Code (see AI_USE.md).
import type { RuleFile } from './rules.ts';
import type { Seed, Setting, State } from './types.ts';

const level = (s: string) => Number(s.replace(/^S/, ''));

/** Start the drill now. Starting again restarts it. */
export function startStormDrill(state: State, at: number): State {
  return { ...state, storm: { startedAt: at } };
}

/** Acknowledge the pop-up. The banner stays until the all-clear. */
export function acknowledgeStorm(state: State, at: number): State {
  return state.storm ? { ...state, storm: { ...state.storm, ackAt: state.storm.ackAt ?? at } } : state;
}

/** End the drill early, for example at the end of a demo. */
export function endStorm(state: State): State {
  const next = { ...state };
  delete next.storm;
  return next;
}

export interface StormStatus {
  phase: 'alarm' | 'banner';
  ruleId: string;
  level: string;
  title: string;
  lines: string[];
  acknowledge: string;
  banner: string;
  waves: { label: string; arrivesAt: number; arrived: boolean }[];
  allClearAt: number;
  synthetic: boolean;
  note: string;
  source: string;
  placeholder: boolean;
}

/** What to show now, or null: no drill, below the alarm level, no habitat (Earth), or past the all-clear. */
export function stormStatus(state: State, seed: Seed, rules: RuleFile, setting: Setting, now: number): StormStatus | null {
  const rule = rules.radiation_storm;
  const f = seed.radiationForecast;
  const s = state.storm;
  if (!rule || !f || !s || setting.habitat === false) return null;
  if (level(f.level) < level(rule.alarm_at)) return null;
  const allClearAt = s.startedAt + f.allClearAfterMin * 60_000;
  if (now >= allClearAt) return null;
  return {
    phase: s.ackAt === undefined ? 'alarm' : 'banner',
    ruleId: rule.id, level: f.level, title: rule.title, lines: rule.lines, acknowledge: rule.acknowledge, banner: rule.banner,
    waves: f.waves.map((w) => ({ label: w.label, arrivesAt: s.startedAt + w.afterMin * 60_000, arrived: now >= s.startedAt + w.afterMin * 60_000 })),
    allClearAt, synthetic: f.synthetic, note: f.note, source: rule.source,
    placeholder: rule.signed_off_by.trim().toLowerCase() === 'placeholder',
  };
}

/** "0:42" for minutes and seconds, or "31 h 0 min" once it is an hour or more away. */
export function countdown(ms: number): string {
  const s = Math.max(0, Math.round(ms / 1000));
  if (s >= 3600) return `${Math.floor(s / 3600)} h ${Math.floor((s % 3600) / 60)} min`;
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}
