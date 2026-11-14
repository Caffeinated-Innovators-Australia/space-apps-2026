// Shared data shapes for the action layer. Used by the screens, the command-line tool and any agent.
// AI assistance: drafted with Claude Code (see AI_USE.md).
import type { Tier } from './rules.ts';

export interface Indicator {
  id: string;
  name: string;
  region: string;
  unit: string;
  dp: number;
  /** Which side of the personal band matters. */
  watch: 'low' | 'high' | 'both';
  cadence: 'daily' | 'weekly' | 'prompted' | 'sensor';
  slot: 'morning' | 'evening' | 'any';
  baselineLabel?: string;
  /** min and max are plausibility bounds: a value outside them is a typing slip, not a reading. */
  input: { kind: 'number' | 'scale' | 'test' | 'sensor'; min: number; max: number; prompt: string; labels?: string[] };
  /** A sourced limit, such as NASA's cabin carbon dioxide limit. */
  limit?: { low?: number; high?: number; label: string; source: string; grade: string };
  /** Laboratory reference range by sex, as reported in the source file. */
  ref?: Record<'F' | 'M', { min: number; max: number }>;
  refSource?: string;
  /** Within-person standard deviation from real crew data, where we have it. */
  fixedSd?: number;
  variationSource?: string;
  hazards: string[];
  card: { how: string; why: string; what: string; status: string; sources: { label: string; url: string }[] };
}

export interface CrewProfile {
  id: string;
  name: string;
  /** Used only to pick the laboratory reference range. */
  sex: 'F' | 'M';
  baseline: Record<string, number[]>;
  /** One entry per mission day before today; null where no check-in was logged. */
  mission: Record<string, (number | null)[]>;
}

export interface Setting {
  id: string;
  label: string;
  kicker: string;
  replySeconds: number;
  gapLabel: string;
  nowLabel: string;
  detail: string;
  basis: string;
  advice: string;
  scenarioSynthetic: boolean;
  risks: string;
  twist: string;
  words?: Record<string, string>;
  tierWords?: Partial<Record<Tier, string>>;
}

export interface TimelineBlock { start: string; end: string; label: string; critical: boolean }

/** Everything that is fixed for a mission: who the crew are and what can be measured. */
export interface Seed {
  synthetic: boolean;
  note: string;
  missionDay: number;
  hazards: Record<string, string>;
  indicators: Indicator[];
  crew: CrewProfile[];
  /** Example values for today, for the demo. */
  today: Record<string, Record<string, number>>;
  settings: Setting[];
  timeline: TimelineBlock[];
  clockOptions: string[];
  slipMinutes: number;
  radiationDays: number[];
  symptoms: { status: string; options: string[] };
}

export interface Reading {
  id: string;
  crewId: string;
  indicatorId: string;
  value: number;
  at: number;
  day: number;
  tier: Tier;
  ruleId: string;
  stepsDone: string[];
}

export interface Symptom { crewId: string; label: string; at: number }

export interface CasePack {
  id: string;
  crewId: string;
  readingId: string;
  createdAt: number;
  settingId: string;
  status: 'queued' | 'exported';
  exportedAt?: number;
}

/** Everything the device remembers. One small document, saved after every action. */
export interface State {
  version: 2;
  readings: Reading[];
  symptoms: Symptom[];
  /** Crew members who logged "nothing to report" today: an honest check-in in its own right. */
  nothingToReport: string[];
  outbox: CasePack[];
  ui: { crewId: string; settingId: string; theme: string; doseLogged: boolean; clock: string; slipped: boolean };
}

export interface Store {
  load(): Promise<State | null>;
  save(state: State): Promise<void>;
}
