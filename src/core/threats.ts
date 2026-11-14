// Life threats: the conditions that open emergency mode. Emergency is a mode within Act now, not a tier.
// AI assistance: drafted with Claude Code (see AI_USE.md).
// A red result alone is not a life threat. Only three things are: an emergency symptom, a vital signs alert,
// and a symptom pattern with a red-flag symptom. Each names the rule that raised it and where it sends the crew.
import { emergencySymptoms, pathwayEmergency, pathwayStatuses } from './pathways.ts';
import type { RuleFile } from './rules.ts';
import type { Seed, State } from './types.ts';
import { vitalsAlerts } from './vitals.ts';

export interface LifeThreat {
  key: string;
  kind: 'symptom' | 'vitals' | 'pathway';
  title: string;
  /** One plain line saying what raised it. */
  detail: string;
  /** The emergency module's pathway number. Absent means the built-in Emergency steps. */
  construct?: number;
  /** The wording on the button that opens it. */
  action: string;
  ruleId: string;
  source: string;
  confidence: string;
  placeholder: boolean;
}

/** The module pathway a symptom pattern with a red flag opens: Infection and Sepsis. */
const PATHWAY_CONSTRUCT = 12;

/** Every life threat active for one person now, most direct first: symptoms they tapped, then vital signs, then patterns. */
export function lifeThreats(state: State, seed: Seed, rules: RuleFile, crewId: string): LifeThreat[] {
  const out: LifeThreat[] = [];
  const e = emergencySymptoms(state, rules, crewId);
  if (e) {
    for (const s of e.symptoms) {
      const c = rules.emergency_symptoms?.checklists?.[s];
      out.push({ key: `symptom:${crewId}:${s}`, kind: 'symptom', title: e.title, detail: `You logged ${s.toLowerCase()}.`, construct: c?.construct, action: c?.label ?? 'Emergency', ruleId: e.ruleId, source: e.source, confidence: e.confidence, placeholder: e.placeholder });
    }
  }
  for (const v of vitalsAlerts(state, rules, crewId)) {
    out.push({ key: v.key, kind: 'vitals', title: v.title, detail: 'From your latest vital signs.', construct: v.construct, action: 'Open emergency checklist', ruleId: v.id, source: v.source, confidence: v.confidence, placeholder: v.placeholder });
  }
  for (const p of pathwayStatuses(state, seed, rules, crewId)) {
    if (!pathwayEmergency(p) || p.matched.urgent.length === 0) continue;
    out.push({ key: `pathway:${p.key}`, kind: 'pathway', title: p.title, detail: `You logged ${p.matched.urgent.map((u) => u.toLowerCase()).join(', ')} with this pattern.`, construct: PATHWAY_CONSTRUCT, action: 'Open emergency checklist', ruleId: p.ruleId, source: p.source, confidence: p.confidence, placeholder: p.placeholder });
  }
  return out;
}
