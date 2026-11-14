// Shared data shapes for the action layer. Used by the screens, the command-line tool and any agent.
// AI assistance: drafted with Claude Code (see AI_USE.md).
import type { Tier } from './rules.ts';

export interface Indicator {
  id: string;
  /** Body system or area, used to group the list and the body figure. */
  group: string;
  name: string;
  region: string;
  unit: string;
  dp: number;
  /** Which side of the personal band matters. */
  watch: 'low' | 'high' | 'both';
  cadence: 'daily' | 'weekly' | 'prompted' | 'sensor';
  /** For weekly check-ins: the day of the mission week it falls due (mission day modulo 7). */
  weekDay?: number;
  /** True for a reading of the shared habitat, such as cabin air. It is worded as the cabin's, never as the person's own. */
  environment?: boolean;
  /** 'cumulative' marks a running total, such as radiation dose, which is judged against a limit and not a personal band. */
  mode?: 'cumulative';
  slot: 'morning' | 'evening' | 'any';
  baselineLabel?: string;
  /** min and max are plausibility bounds: a value outside them is a typing slip, not a reading. */
  input: { kind: 'number' | 'scale' | 'test' | 'sensor' | 'vision'; min: number; max: number; prompt: string; labels?: string[] };
  /** A sourced limit, such as NASA's cabin carbon dioxide limit. */
  limit?: { low?: number; high?: number; /** A floor set as a fraction of the person's own baseline, such as NASA's 80% strength standard. */ lowFraction?: number; label: string; source: string; grade: string };
  /** Laboratory reference range by sex, as reported in the source file. */
  ref?: Record<'F' | 'M', { min: number; max: number }>;
  refSource?: string;
  /** Within-person standard deviation from real crew data, where we have it. */
  fixedSd?: number;
  variationSource?: string;
  /** Next steps for this indicator, where they differ from the general steps in the rules file. */
  steps?: Partial<Record<'green' | 'amber' | 'red', string[]>>;
  hazards: string[];
  card: { how: string; why: string; what: string; status: string; sources: { label: string; url: string }[] };
  /** A plain statement of what this check is not. */
  cardNote?: string;
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
  /** Set when the case came from a symptom pathway and not from a reading. */
  pathwayId?: string;
}

/** One pain score, logged while a symptom pathway is open. No threshold is applied: the trend is for the medic and the flight surgeon. */
export interface PainEntry { crewId: string; pathwayId: string; score: number; at: number }

/** Everything the device remembers. One small document, saved after every action. */
export interface State {
  version: 2;
  readings: Reading[];
  symptoms: Symptom[];
  /** Crew members who logged "nothing to report" today: an honest check-in in its own right. */
  nothingToReport: string[];
  outbox: CasePack[];
  /** Readings whose alert the crew member has acknowledged. */
  acknowledged?: string[];
  painLog?: PainEntry[];
  /** Pathway steps ticked as done, keyed by crew member and pathway. */
  pathwaySteps?: Record<string, string[]>;
  ui: { crewId: string; settingId: string; theme: string; doseLogged: boolean; clock: string; slipped: boolean; /** Real time at which the mission clock was last set, so logged times read as mission time. */ clockSetAt?: number };
}

export interface Store {
  load(): Promise<State | null>;
  save(state: State): Promise<void>;
}
