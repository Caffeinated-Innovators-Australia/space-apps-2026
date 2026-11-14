// Vital signs: record a set, read the latest, and run the monitor alert rules (SEP-01, SHK-01) on it.
// AI assistance: drafted with Claude Code (see AI_USE.md).
// Pure functions, like the rest of the action layer. Rules decide; the thresholds live in rules/rules.yaml, never here.
import type { MonitorAlertRule, MonitorComparison, MonitorField, RuleFile } from './rules.ts';
import type { State, VitalSigns, VitalsEntry } from './types.ts';

export type VitalField = keyof VitalSigns;

export interface VitalFieldInfo {
  id: VitalField;
  label: string;
  unit: string;
  dp: number;
  /** One press of a stepper. */
  step: number;
  /**
   * PLAUSIBILITY BOUNDS, NOT CLINICAL LIMITS. A value outside them is treated as a typing slip and refused.
   * They say nothing about what is normal or safe, and no alert ever reads them.
   */
  min: number;
  max: number;
}

export const VITAL_FIELDS: VitalFieldInfo[] = [
  { id: 'temp', label: 'Temperature', unit: '°C', dp: 1, step: 0.1, min: 30, max: 45 },
  { id: 'hr', label: 'Pulse', unit: 'a minute', dp: 0, step: 1, min: 20, max: 250 },
  { id: 'sbp', label: 'Blood pressure, upper number', unit: 'mmHg', dp: 0, step: 1, min: 40, max: 260 },
  { id: 'dbp', label: 'Blood pressure, lower number', unit: 'mmHg', dp: 0, step: 1, min: 20, max: 160 },
  { id: 'rr', label: 'Breathing rate', unit: 'a minute', dp: 0, step: 1, min: 4, max: 70 },
  { id: 'spo2', label: 'Oxygen saturation', unit: '%', dp: 0, step: 1, min: 50, max: 100 },
];

export const vitalField = (id: VitalField): VitalFieldInfo => VITAL_FIELDS.find((f) => f.id === id)!;

/** One alert raised by the latest set of vital signs. Always Act now; it can open emergency mode. */
export interface VitalsAlert {
  id: string;
  /** Identifies this person, rule and set of vital signs, for acknowledging or sending. */
  key: string;
  tier: 'red';
  emergency: true;
  title: string;
  checksFor: string;
  /** The emergency module's pathway number. */
  construct: number;
  reasons: string[];
  steps: string[];
  source: string;
  confidence: string;
  placeholder: boolean;
  /** When the set of vital signs that raised it was taken. */
  at: number;
}

const fmt = (id: VitalField, v: number) => v.toFixed(vitalField(id).dp);

/** Check one set: at least one value, every value a finite number inside its plausibility bounds, the lower blood pressure below the upper. */
export function checkVitals(values: VitalSigns): VitalSigns {
  const out: VitalSigns = {};
  for (const f of VITAL_FIELDS) {
    const v = values[f.id];
    if (v === undefined || v === null) continue;
    if (typeof v !== 'number' || !Number.isFinite(v)) throw new Error(`${f.label} must be a number.`);
    if (v < f.min || v > f.max) throw new Error(`${f.label} of ${v} ${f.unit} looks like a typing slip. Check the monitor and type it again.`);
    out[f.id] = v;
  }
  if (Object.keys(out).length === 0) throw new Error('Enter at least one vital sign.');
  if (out.sbp !== undefined && out.dbp !== undefined && out.dbp >= out.sbp) throw new Error('The lower blood pressure number must be below the upper one. Check the monitor and type them again.');
  return out;
}

/** Save one set of vital signs for one person. */
export function recordVitals(state: State, args: { crewId: string; values: VitalSigns; at: number }): State {
  const values = checkVitals(args.values);
  const list = state.vitals ?? [];
  const entry: VitalsEntry = { id: `vitals-${args.crewId}-${args.at}-${list.length + 1}`, crewId: args.crewId, at: args.at, values };
  return { ...state, vitals: [...list, entry] };
}

/** The most recent set for one person (by time taken; a later entry wins a tie), or undefined. */
export function latestVitals(state: State, crewId: string): VitalsEntry | undefined {
  let best: VitalsEntry | undefined;
  for (const e of state.vitals ?? []) if (e.crewId === crewId && (!best || e.at >= best.at)) best = e;
  return best;
}

function holds(c: MonitorComparison, values: VitalSigns): boolean {
  const v = values[c.field as MonitorField];
  if (v === undefined) return false;
  return c.op === '>=' ? v >= c.value : c.op === '<=' ? v <= c.value : c.op === '>' ? v > c.value : v < c.value;
}

/** The plain reasons for an alert: each vital sign named in a matching group, in a fixed order. Blood pressure is shown as upper/lower. */
function reasonsFor(fields: Set<VitalField>, values: VitalSigns): string[] {
  const out: string[] = [];
  if (fields.has('temp')) out.push(`Temperature ${fmt('temp', values.temp!)} °C`);
  if (fields.has('hr')) out.push(`Pulse ${fmt('hr', values.hr!)} a minute`);
  if (fields.has('sbp') || fields.has('dbp')) {
    const bp = values.sbp !== undefined && values.dbp !== undefined ? `${fmt('sbp', values.sbp)}/${fmt('dbp', values.dbp)}` : values.sbp !== undefined ? `${fmt('sbp', values.sbp)} upper` : `${fmt('dbp', values.dbp!)} lower`;
    out.push(`Blood pressure ${bp} mmHg`);
  }
  if (fields.has('rr')) out.push(`Breathing ${fmt('rr', values.rr!)} a minute`);
  if (fields.has('spo2')) out.push(`Oxygen saturation ${fmt('spo2', values.spo2!)}%`);
  return out;
}

/** Run one monitor rule on one set. Returns the fields of every matching group, or null when no group matches. */
export function matchMonitorRule(rule: MonitorAlertRule, values: VitalSigns): Set<VitalField> | null {
  const hit = rule.groups.filter((g) => g.every((c) => holds(c, values)));
  if (hit.length === 0) return null;
  return new Set(hit.flat().map((c) => c.field));
}

/** The alerts the LATEST set of vital signs raises for one person. A newer set that no longer matches clears them. */
export function vitalsAlerts(state: State, rules: RuleFile, crewId: string): VitalsAlert[] {
  const entry = latestVitals(state, crewId);
  if (!entry) return [];
  const out: VitalsAlert[] = [];
  for (const rule of rules.monitor_alerts ?? []) {
    const fields = matchMonitorRule(rule, entry.values);
    if (!fields) continue;
    out.push({
      id: rule.id,
      key: `monitor:${crewId}:${rule.id}:${entry.id}`,
      tier: 'red',
      emergency: true,
      title: rule.title,
      checksFor: rule.checks_for,
      construct: rule.construct,
      reasons: reasonsFor(fields, entry.values),
      steps: rule.steps,
      source: rule.source,
      confidence: rule.confidence,
      placeholder: rule.signed_off_by.trim().toLowerCase() === 'placeholder',
      at: entry.at,
    });
  }
  return out;
}

/** The same alert in the shape of `State.moduleAlerts`, so the shell can keep one list of monitor alerts. */
export function vitalsAlertRecord(alert: VitalsAlert, crewId: string, pathway: string): NonNullable<State['moduleAlerts']>[number] {
  return { at: alert.at, crewId, construct: alert.construct, pathway, reasons: alert.reasons };
}

/** One plain line for a handover, such as "Temperature 38.6 °C · pulse 118 a minute · blood pressure 94/56 mmHg · breathing 24 a minute · oxygen saturation 96%". */
export function vitalsLine(values: VitalSigns): string {
  const parts: string[] = [];
  if (values.temp !== undefined) parts.push(`temperature ${fmt('temp', values.temp)} °C`);
  if (values.hr !== undefined) parts.push(`pulse ${fmt('hr', values.hr)} a minute`);
  if (values.sbp !== undefined && values.dbp !== undefined) parts.push(`blood pressure ${fmt('sbp', values.sbp)}/${fmt('dbp', values.dbp)} mmHg`);
  else if (values.sbp !== undefined) parts.push(`blood pressure upper ${fmt('sbp', values.sbp)} mmHg`);
  else if (values.dbp !== undefined) parts.push(`blood pressure lower ${fmt('dbp', values.dbp)} mmHg`);
  if (values.rr !== undefined) parts.push(`breathing ${fmt('rr', values.rr)} a minute`);
  if (values.spo2 !== undefined) parts.push(`oxygen saturation ${fmt('spo2', values.spo2)}%`);
  if (parts.length === 0) return 'No vital signs recorded.';
  const line = parts.join(' · ');
  return line.charAt(0).toUpperCase() + line.slice(1);
}
