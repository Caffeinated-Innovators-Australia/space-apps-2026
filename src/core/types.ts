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
  /** The highest tier this signal may raise on its own. Set by clinicians for signals that should only ever ask the crew to watch. */
  maxTier?: 'amber';
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
  /** Location profile: which place this is, its gravity as a fraction of Earth's, and its cabin atmosphere. */
  profile?: 'iss' | 'transit' | 'moon' | 'mars' | 'earth';
  g?: number;
  cabinKPa?: number;
  o2Pct?: number;
  gravityBand?: 'zero' | 'lunar' | 'martian' | 'earth';
  /** Short facts for the status strip, such as the one-way delay to Earth. */
  strip?: string[];
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
  /** `followUps` are questions about a symptom, asked only inside a pathway once that symptom is logged. They are not on the general list. */
  symptoms: { status: string; options: string[]; followUps?: string[] };
  /** Symptoms grouped by where on the body they are felt, for the "Feeling off?" flow. */
  privacy?: { status: string; rows: { what: string; you: string; medic: string; surgeon: string; crew: string }[] };
  symptomZones?: { status: string; zones: { id: string; label: string; symptoms: string[] }[] };
  evidenceStatus?: string;
  /** Example sets of vital signs for the demo story. SYNTHETIC. */
  demoVitals?: { id: string; label: string; values: VitalSigns }[];
  /** The weekly crew check-in: its items and who may see the answers. */
  crewCheck?: { status: string; label: string; visibleTo: string; scale: string; items: string[] };
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

/** One set of vital signs. Any value may be missing. Oxygen saturation never raises an alert on its own. */
export interface VitalSigns { temp?: number; hr?: number; sbp?: number; dbp?: number; rr?: number; spo2?: number }
export interface VitalsEntry { id: string; crewId: string; at: number; values: VitalSigns }

/** One weekly crew check-in. Answers are 1 to 5, in the order of the items. Never shown to crewmates or the crew medic. */
export interface CrewCheck { crewId: string; week: number; answers: number[]; at: number }

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

/** One result logged for the record, such as an ECG taken or an eye pressure reading. Never scored: no rule reads it. */
export interface HealthRecord { id: string; crewId: string; kindId: string; at: number; option?: string; option2?: string; value?: number; score?: number; note?: string }

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
  vitals?: VitalsEntry[];
  /** Guided ultrasound steps saved, keyed by crew member. No image is kept. */
  ultrasound?: Record<string, { stepsDone: string[]; at: number }>;
  crewChecks?: CrewCheck[];
  /** Detail of each reaction check, keyed by reading id: the median, and the lapses over the lapse time. */
  reactionDetail?: Record<string, { median: number; lapses: number; trials: number; /** Taps made before the counter appeared. Recorded, not scored. */ falseStarts?: number }>;
  /** Results logged for the record only. No rule reads them. */
  records?: HealthRecord[];
  /** Alerts raised by the emergency module from vital signs, newest last. */
  moduleAlerts?: { at: number; crewId: string; construct: number; pathway: string; reasons: string[] }[];
  ui: { crewId: string; settingId: string; theme: string; doseLogged: boolean; clock: string; slipped: boolean; /** Real time at which the mission clock was last set, so logged times read as mission time. */ clockSetAt?: number; /** True while there is no link to Earth, for example at solar conjunction. Cases queue until it returns. */ linkDown?: boolean; /** Demo only: milliseconds the clock has been skipped ahead. */ skipMs?: number; /** Set when the place changes to one with different gravity: the old gravity band and when. */ gravityChange?: { from: string; at: number }; /** True when the crew set the place by hand because the automatic location was lost. */ locationManual?: boolean };
}

export interface Store {
  load(): Promise<State | null>;
  save(state: State): Promise<void>;
}
