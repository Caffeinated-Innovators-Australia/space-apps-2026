// The message bridge to the team's emergency module (ASTRA, schema astra/1): builds what this app sends, and safely reads what it sends back.
// AI assistance: drafted with Claude Code (see AI_USE.md).
// Pure functions, no DOM. This app stays the master: it tells the module the place and the person's readings; the module tells us when it raises an alert.
import { latestReading } from './actions.ts';
import { pathwayKey } from './pathways.ts';
import type { RuleFile } from './rules.ts';
import type { Seed, Setting, State } from './types.ts';

export const ASTRA_SCHEMA = 'astra/1';

/** The location profiles the module knows. Ours use the same ids. */
export type AstraProfile = 'iss' | 'transit' | 'moon' | 'mars' | 'earth';
const PROFILES: readonly AstraProfile[] = ['iss', 'transit', 'moon', 'mars', 'earth'];
/** The module's own default place, used when a setting carries no profile. */
export const ASTRA_DEFAULT_PROFILE: AstraProfile = 'mars';

export interface AstraObservation { code: string; value: number | boolean; unit?: string }
export interface AstraOutbound { schema: typeof ASTRA_SCHEMA; type: string; ts: string; [k: string]: unknown }

const stamp = (at: number) => new Date(at).toISOString();
const base = (type: string, at: number): AstraOutbound => ({ schema: ASTRA_SCHEMA, type, ts: stamp(at) });

/** The handshake. The module only posts back to a window that has said hello. */
export function helloMsg(at = Date.now()): AstraOutbound {
  return base('astra.hello', at);
}

/** Where the crew is, so the module shows the steps for that gravity and cabin. */
export function profileMsg(setting: Setting, at = Date.now()): AstraOutbound {
  const p = setting.profile && PROFILES.includes(setting.profile) ? setting.profile : ASTRA_DEFAULT_PROFILE;
  return { ...base('astra.profile', at), profile: p };
}

/** Units as the module's own monitor list names them. */
const VITAL_UNITS: Record<'temp' | 'hr' | 'sbp' | 'dbp' | 'rr' | 'spo2', string> = { temp: '°C', hr: '/min', sbp: 'mmHg', dbp: 'mmHg', rr: '/min', spo2: '%' };

/** The person's average daily fluid over their last three logged days, in mL a day, or undefined with fewer than three. */
export function fluidThreeDay(state: State, seed: Seed, crewId: string): number | undefined {
  const crew = seed.crew.find((c) => c.id === crewId);
  const ind = seed.indicators.find((i) => i.id === 'fluid');
  if (!crew || !ind) return undefined;
  const past = (crew.mission.fluid ?? []).filter((v): v is number => typeof v === 'number' && Number.isFinite(v));
  const today = latestReading(state, crewId, 'fluid');
  const last = [...past, ...(today ? [today.value] : [])].slice(-3);
  if (last.length < 3) return undefined;
  const toMl = ind.unit.trim().toLowerCase() === 'l' ? 1000 : 1;
  return Math.round((last.reduce((a, b) => a + b, 0) / last.length) * toMl);
}

/** The urine test results logged with the kidney-stone pathway (KS-01), as the module's health-log codes. "Not done" and anything unrecorded are left out. */
export function urineObservations(state: State, crewId: string): AstraObservation[] {
  const tests = state.pathwayTests?.[pathwayKey(crewId, 'KS-01')] ?? {};
  const out: AstraObservation[] = [];
  const strip = tests['urine-strip'];
  if (strip === 'Present' || strip === 'Not present') out.push({ code: 'urine_blood', value: strip === 'Present' });
  for (const [id, code] of [['urine-nitrite', 'urine_nitrite'], ['urine-leuk', 'urine_leuk']] as const) {
    const v = tests[id];
    if (v === 'Positive' || v === 'Negative') out.push({ code, value: v === 'Positive' });
  }
  const sg = tests['urine-sg'];
  if (sg !== undefined && sg !== 'Not done' && sg.trim() !== '' && Number.isFinite(Number(sg))) out.push({ code: 'urine_sg', value: Number(sg) });
  return out;
}

/** The person's latest vital signs and health-log context, as one astra.vitals message. Only recorded values are sent. */
export function vitalsMsg(state: State, seed: Seed, rules: RuleFile, crewId: string, at = Date.now()): AstraOutbound & { observations: AstraObservation[] } {
  void rules; // kept so the bridge can later take its health-log choices from the rules file
  const entries = (state.vitals ?? []).filter((v) => v.crewId === crewId);
  const latest = entries.reduce<(typeof entries)[number] | undefined>((a, b) => (!a || b.at >= a.at ? b : a), undefined);
  const observations: AstraObservation[] = [];
  if (latest) {
    for (const code of Object.keys(VITAL_UNITS) as (keyof typeof VITAL_UNITS)[]) {
      const v = latest.values[code];
      if (typeof v === 'number' && Number.isFinite(v)) observations.push({ code, value: v, unit: VITAL_UNITS[code] });
    }
  }
  const fluid = fluidThreeDay(state, seed, crewId);
  if (fluid !== undefined) observations.push({ code: 'fluid3d', value: fluid, unit: 'mL/day' });
  observations.push(...urineObservations(state, crewId));
  return { ...base('astra.vitals', at), crewId, source: 'health-app', observations };
}

/** Make this person the module's patient, so its vitals strip shows what we sent. */
export function setPatientMsg(crewId: string, at = Date.now()): AstraOutbound {
  return { ...base('astra.command', at), action: 'setPatient', crewId };
}

/** Open one of the module's numbered emergency pathways, for example 12. */
export function openPathwayMsg(construct: number, crewId?: string, at = Date.now()): AstraOutbound {
  return { ...base('astra.command', at), action: 'openPathway', construct, ...(crewId ? { crewId } : {}) };
}

export type AstraInbound =
  | { type: 'astra.ready'; version?: string }
  | { type: 'astra.monitorAlert'; crewId: string; construct: number; pathway: string; tier: string; reasons: string[] }
  | { type: 'astra.profile.changed'; profile: string; label?: string; g?: number; cabinKPa?: number; o2Pct?: number }
  | { type: 'astra.report'; crewId?: string; report: { id?: string; priority?: string; text?: string } }
  /** A step ticked, skipped or reopened in one of the module's checklists. */
  | { type: 'astra.step'; construct: number; step: number; text: string; status: string }
  /** What the crew member typed or said to describe the emergency, in the module. */
  | { type: 'astra.description'; text: string }
  /** A yes/no answer to one of the module's questions. */
  | { type: 'astra.answer'; question: string; answer: string; input: string };

const isObj = (x: unknown): x is Record<string, unknown> => typeof x === 'object' && x !== null && !Array.isArray(x);
const str = (x: unknown): string | undefined => (typeof x === 'string' ? x : undefined);
const num = (x: unknown): number | undefined => (typeof x === 'number' && Number.isFinite(x) ? x : undefined);

/** Reads anything the module posts. Returns null for anything unknown, malformed or not schema astra/1. Never throws. */
export function readInbound(data: unknown): AstraInbound | null {
  try {
    if (!isObj(data) || data.schema !== ASTRA_SCHEMA || typeof data.type !== 'string') return null;
    switch (data.type) {
      case 'astra.ready':
        return { type: 'astra.ready', ...(str(data.version) ? { version: str(data.version) } : {}) };
      case 'astra.monitorAlert': {
        const crewId = str(data.crewId);
        const construct = num(data.construct);
        if (!crewId || construct === undefined) return null;
        const reasons = Array.isArray(data.reasons) ? data.reasons.filter((r): r is string => typeof r === 'string') : [];
        return { type: 'astra.monitorAlert', crewId, construct, pathway: str(data.pathway) ?? '', tier: str(data.tier) ?? 'red', reasons };
      }
      case 'astra.profile.changed': {
        const profile = str(data.profile);
        if (!profile) return null;
        const out: AstraInbound = { type: 'astra.profile.changed', profile };
        if (str(data.label)) out.label = str(data.label);
        if (num(data.g) !== undefined) out.g = num(data.g);
        if (num(data.cabinKPa) !== undefined) out.cabinKPa = num(data.cabinKPa);
        if (num(data.o2Pct) !== undefined) out.o2Pct = num(data.o2Pct);
        return out;
      }
      case 'astra.report': {
        if (!isObj(data.report)) return null;
        const r = data.report;
        return { type: 'astra.report', ...(str(data.crewId) ? { crewId: str(data.crewId) } : {}), report: { id: str(r.id), priority: str(r.priority), text: str(r.text) } };
      }
      case 'astra.step': {
        const construct = num(data.construct);
        const step = num(data.step);
        if (construct === undefined || step === undefined) return null;
        return { type: 'astra.step', construct, step, text: str(data.text) ?? '', status: str(data.status) ?? '' };
      }
      case 'astra.description': {
        const text = str(data.text);
        return text && text.trim() ? { type: 'astra.description', text: text.trim().slice(0, 500) } : null;
      }
      case 'astra.answer': {
        const question = str(data.question);
        const answer = str(data.answer);
        if (!question || !answer) return null;
        return { type: 'astra.answer', question, answer: answer.toLowerCase(), input: str(data.input) ?? '' };
      }
      default:
        return null;
    }
  } catch {
    return null;
  }
}

/** The module's cardiac arrest checklist. Its own resuscitation steps are replaced, at a tap, by this app's guided CPR steps. */
export const ARREST_CONSTRUCT = 1;

/**
 * Whether what the module reported means a cardiac arrest, so the app offers its guided CPR steps (read aloud, pace marker,
 * strap-down at 0 g, voice control, timed handover). It follows the module's own rule: not responding and not breathing.
 * `answers` holds the module's yes/no answers seen so far in this session.
 */
export function arrestSignal(m: AstraInbound, answers: Record<string, string>): boolean {
  if (m.type === 'astra.step' || m.type === 'astra.monitorAlert') return m.construct === ARREST_CONSTRUCT;
  if (m.type === 'astra.answer') {
    const a = { ...answers, [m.question]: m.answer };
    return a.q_resp === 'no' && a.q_breath === 'no';
  }
  return false;
}

/** Saves an alert the module raised. The same pathway for the same person within a minute is not saved twice. */
export function recordModuleAlert(state: State, alert: { crewId: string; construct: number; pathway: string; reasons: string[] }, at: number): State {
  const list = state.moduleAlerts ?? [];
  const dup = list.some((a) => a.crewId === alert.crewId && a.construct === alert.construct && Math.abs(at - a.at) < 60_000);
  if (dup) return state;
  return { ...state, moduleAlerts: [...list, { at, crewId: alert.crewId, construct: alert.construct, pathway: alert.pathway, reasons: [...alert.reasons] }] };
}
