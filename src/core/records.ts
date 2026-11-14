// Record-only checks: body areas, the symptoms listed under each, and results the crew can log for the record.
// Nothing here raises an alert or sets a tier. A rule for any of these is for the clinicians to write.
// AI assistance: drafted with Claude Code (see AI_USE.md).
import data from '../data/areas.json' with { type: 'json' };
import type { HealthRecord, State } from './types.ts';

export interface RecordKind {
  id: string;
  label: string;
  how: string;
  optionLabel?: string;
  options?: string[];
  option2Label?: string;
  options2?: string[];
  /** min and max are typing-slip bounds, not clinical limits. */
  number?: { unit: string; min: number; max: number; dp: number };
  /** True when a 0 to 10 score is logged with it. */
  score?: boolean;
  note?: boolean;
  /** True for the Amsler grid, which the screen draws. */
  grid?: boolean;
  /** Earlier example results for the chart. SYNTHETIC. */
  demo?: number[];
}
export interface BodyArea {
  id: string;
  label: string;
  short: string;
  /** The indicator group this area holds, if it has scored check-ins. */
  group?: string;
  /** True when the area's number check-ins are entered together on one screen. */
  together?: boolean;
  symptoms: string[];
  records: string[];
}

const file = data as { status: string; note: string; areas: BodyArea[]; kinds: RecordKind[] };
export const NOTE_MAX = 200;

export const bodyAreas = (): BodyArea[] => file.areas;
export const recordKinds = (): RecordKind[] => file.kinds;
export const recordsStatus = (): { status: string; note: string } => ({ status: file.status, note: file.note });
export function bodyArea(id: string): BodyArea | undefined {
  return file.areas.find((a) => a.id === id);
}
export function areaForGroup(group: string): BodyArea | undefined {
  return file.areas.find((a) => a.group === group);
}
export function recordKind(id: string): RecordKind {
  const k = file.kinds.find((x) => x.id === id);
  if (!k) throw new Error(`There is no record type with the id "${id}". Known types: ${file.kinds.map((x) => x.id).join(', ')}.`);
  return k;
}

export interface RecordInput { crewId: string; kindId: string; at: number; option?: string; option2?: string; value?: number; score?: number; note?: string }

/** Log one result for the record. It is checked for typing slips only: nothing is scored, and no alert is raised. */
export function addRecord(state: State, args: RecordInput): { state: State; record: HealthRecord } {
  const k = recordKind(args.kindId);
  if (k.options && (!args.option || !k.options.includes(args.option))) throw new Error(`${k.label}: choose one of ${k.options.join('; ')}.`);
  if (k.options2 && (!args.option2 || !k.options2.includes(args.option2))) throw new Error(`${k.label}: choose one of ${k.options2.join('; ')}.`);
  if (k.number) {
    const v = args.value;
    if (v === undefined || !Number.isFinite(v) || v < k.number.min || v > k.number.max) throw new Error(`That cannot be right: ${k.label.toLowerCase()} must be between ${k.number.min} and ${k.number.max} ${k.number.unit}. Check and enter it again.`);
  }
  if (k.score && (args.score === undefined || !Number.isInteger(args.score) || args.score < 0 || args.score > 10)) throw new Error('A score is a whole number from 0 to 10.');
  const note = k.note ? (args.note ?? '').trim().slice(0, NOTE_MAX) : '';
  const all = state.records ?? [];
  let id = `rec-${args.at}`;
  for (let n = 2; all.some((r) => r.id === id); n++) id = `rec-${args.at}-${n}`;
  const record: HealthRecord = {
    id, crewId: args.crewId, kindId: k.id, at: args.at,
    ...(k.options ? { option: args.option } : {}),
    ...(k.options2 ? { option2: args.option2 } : {}),
    ...(k.number ? { value: Number(args.value!.toFixed(k.number.dp)) } : {}),
    ...(k.score ? { score: args.score } : {}),
    ...(note ? { note } : {}),
  };
  return { state: { ...state, records: [...all, record] }, record };
}

/** One person's records, oldest first; all of them, or one type. */
export function recordsFor(state: State, crewId: string, kindId?: string): HealthRecord[] {
  return (state.records ?? []).filter((r) => r.crewId === crewId && (!kindId || r.kindId === kindId)).sort((a, b) => a.at - b.at);
}

/** One record in words, as it is shown and as it is sent with a case. */
export function recordLine(r: HealthRecord): string {
  const k = recordKind(r.kindId);
  const parts = [
    r.option2, r.option,
    r.value !== undefined && k.number ? `${r.value.toFixed(k.number.dp)} ${k.number.unit}` : undefined,
    r.score !== undefined ? `${r.score} out of 10` : undefined,
    r.note ? `note: ${r.note}` : undefined,
  ].filter(Boolean);
  return `${k.label}: ${parts.join(', ')}`;
}

/** The lines that go with a case: the latest record of each type for this person. Logged, never scored. */
export function recordsSummary(state: State, crewId: string): string[] {
  const latest = new Map<string, HealthRecord>();
  for (const r of recordsFor(state, crewId)) latest.set(`${r.kindId}:${r.option2 ?? ''}`, r);
  return [...latest.values()].map(recordLine);
}
