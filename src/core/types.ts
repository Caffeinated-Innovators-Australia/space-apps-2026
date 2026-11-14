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
  /** How well-established this signal is, as measured in this app. An experimental signal can raise amber but never red alone. */
  evidence?: 'established' | 'emerging' | 'experimental';
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
  /** False where there is no shared cabin to read, such as on Earth. Cabin and other habitat readings are left out there. */
  habitat?: boolean;
  /** Seconds for advice to go there and back, where that differs from when hands-on help can arrive. On Earth a doctor is on the phone at once. */
  adviceSeconds?: number;
  /** How far away help is, in words: the one-way delay to Earth, or the distance to the nearest doctor. */
  away?: string;
}

export interface TimelineBlock { start: string; end: string; label: string; critical: boolean }

/** Everything that is fixed for a mission: who the crew are and what can be measured. */
export interface Seed {
  synthetic: boolean;
  note: string;
  missionDay: number;
  /** The calendar date of mission day 1, used to place real solar events on mission days. */
  missionStart?: string;
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
  /** Symptoms grouped by where on the body they are felt, for the "Feeling off?" flow. */
  privacy?: { status: string; rows: { what: string; you: string; medic: string; surgeon: string; crew: string }[] };
  symptomZones?: { status: string; zones: { id: string; label: string; symptoms: string[] }[] };
  evidenceStatus?: string;
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

/** A reply from the remote doctor to one case. The words are the doctor's own; the app adds nothing to them. */
export interface EarthReply { id: string; caseId: string; at: number; decision: 'agree' | 'add' | 'change' | 'escalate'; note: string; steps: string[]; acceptedAt?: number }

/** One run of the emergency screen: which steps were reached, and when. */
export interface EmergencyRun { id: string; crewId: string; startedAt: number; endedAt?: number; steps: { id: string; at: number }[] }

/** A wound or skin problem being watched as it heals. No photo is kept. */
export interface Wound { id: string; crewId: string; label: string; startedAt: number; checks: { at: number; status: 'better' | 'same' | 'worse' }[] }

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
  /** Results of simple tests asked for by a pathway, such as a urine strip, keyed by crew member and pathway, then by test. Logged and sent; never scored. */
  pathwayTests?: Record<string, Record<string, string>>;
  replies?: EarthReply[];
  emergencies?: EmergencyRun[];
  wounds?: Wound[];
  ui: { crewId: string; settingId: string; theme: string; doseLogged: boolean; clock: string; slipped: boolean; /** Real time at which the mission clock was last set, so logged times read as mission time. */ clockSetAt?: number; /** True while there is no link to Earth, for example at solar conjunction. Cases queue until it returns. */ linkDown?: boolean; /** Demo only: milliseconds the clock has been skipped ahead. */ skipMs?: number };
}

export interface Store {
  load(): Promise<State | null>;
  save(state: State): Promise<void>;
}
