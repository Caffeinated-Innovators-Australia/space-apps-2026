// Shared data shapes for the action layer. Used by the screens, the command-line tool and any agent.
// AI assistance: drafted with Claude Code (see AI_USE.md).
import type { Tier } from './rules.ts';

export interface Point { t: string; value: number }

export interface Indicator {
  id: string;
  name: string;
  region: string;
  unit: string;
  dp: number;
  /** Laboratory reference range by sex, as reported in the source file. */
  ref: Record<'F' | 'M', { min: number; max: number }>;
  refSource: string;
  /** Pooled within-person standard deviation of pre-flight draws in the real crew data. */
  withinPersonSd: number;
  variationSource: string;
  whyCheck: string;
  howMeasured: string;
}

export interface CrewProfile {
  id: string;
  name: string;
  /** Used only to pick the laboratory reference range. */
  sex: 'F' | 'M';
  baseline: Record<string, Point[]>;
  mission: Record<string, Point[]>;
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
  words?: Record<string, string>;
  tierWords?: Partial<Record<Tier, string>>;
}

/** Everything that is fixed for a mission: who the crew are and what can be measured. */
export interface Seed {
  synthetic: boolean;
  note: string;
  missionDay: number;
  crew: CrewProfile[];
  indicators: Indicator[];
  settings: Setting[];
  symptoms: { status: string; options: string[] };
}

export interface Reading {
  id: string;
  crewId: string;
  indicatorId: string;
  value: number;
  at: number;
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
  version: 1;
  readings: Reading[];
  symptoms: Symptom[];
  outbox: CasePack[];
  ui: { crewId: string; settingId: string; theme: string; doseLogged: boolean };
}

export interface Store {
  load(): Promise<State | null>;
  save(state: State): Promise<void>;
}
