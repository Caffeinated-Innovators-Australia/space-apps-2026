// Vital signs screen, and the Act now card a set of vital signs can raise (possible sepsis, possible shock).
// AI assistance: drafted with Claude Code (see AI_USE.md).
import { useState } from 'react';
import type { RuleFile, Seed, Setting, State, VitalSigns } from '../core/index.ts';
import { checkVitals, latestVitals, recordVitals, VITAL_FIELDS, vitalsAlerts, vitalsLine, type VitalField, type VitalFieldInfo, type VitalsAlert } from '../core/vitals.ts';
import { More, SyntheticTag, TierPill } from '../components/ui.tsx';
import './x-vt.css';

export interface VitalsProps {
  state: State;
  commit: (s: State) => void;
  ui: (p: Partial<State['ui']>) => void;
  setting: Setting;
  crewId: string;
  seed: Seed;
  rules: RuleFile;
  go: (route: string, arg?: string) => void;
  say: (text: string, s: Setting) => string;
  hhmm: (t: number) => string;
  /** Optional: queue the case for Earth. The card hides its send button when this is not given. */
  onSend?: (alert: VitalsAlert) => void;
}

export interface MonitorAlertCardProps {
  alert: VitalsAlert;
  onEmergency: () => void;
  onSend?: () => void;
  setting: Setting;
  say: (text: string, s: Setting) => string;
  /** Shows the word SYNTHETIC when the vital signs were made up for the demo. */
  synthetic?: boolean;
  /** Mission time of the set, if the shell passes its clock formatter. */
  hhmm?: (t: number) => string;
  /** Ticked first steps. When not given, ticks are kept on this card only. */
  stepsDone?: string[];
  onToggleStep?: (step: string) => void;
}

type Texts = Record<VitalField, string>;
const EMPTY: Texts = { temp: '', hr: '', sbp: '', dbp: '', rr: '', spo2: '' };
const toText = (v: VitalSigns): Texts => Object.fromEntries(VITAL_FIELDS.map((f) => [f.id, v[f.id] === undefined ? '' : v[f.id]!.toFixed(f.dp)])) as Texts;
const parse = (t: string): number | undefined | 'bad' => {
  const s = t.trim().replace(',', '.');
  if (!s) return undefined;
  const n = Number(s);
  return Number.isFinite(n) ? n : 'bad';
};
function fieldError(f: VitalFieldInfo, text: string): string | undefined {
  const v = parse(text);
  if (v === undefined) return undefined;
  if (v === 'bad') return `${f.label}: type a number.`;
  try { checkVitals({ [f.id]: v }); return undefined; } catch (e) { return (e as Error).message; }
}
const sameSet = (a: VitalSigns, b: VitalSigns) => VITAL_FIELDS.every((f) => a[f.id] === b[f.id]);

/** An Act now alert from one set of vital signs. Calm on purpose: no flashing and no sound. */
export function MonitorAlertCard({ alert, onEmergency, onSend, setting, say, synthetic, hhmm, stepsDone, onToggleStep }: MonitorAlertCardProps) {
  const [localDone, setLocalDone] = useState<string[]>([]);
  const done = stepsDone ?? localDone;
  const toggle = (st: string) => {
    if (onToggleStep) onToggleStep(st);
    else setLocalDone((d) => (d.includes(st) ? d.filter((x) => x !== st) : [...d, st]));
  };
  const h = `x-vt-alert-${alert.key.replace(/[^a-zA-Z0-9-]/g, '-')}`;
  return (
    <section className="alert alert-red x-vt-alert" aria-labelledby={h}>
      <div className="card-head">
        <TierPill tier="red" />
        {synthetic ? <SyntheticTag /> : null}
      </div>
      <h2 className="title" id={h}>{say(alert.title, setting)}</h2>
      <p className="x-vt-notdx"><strong>Not a diagnosis. A pattern to act on now.</strong></p>
      <div>
        <p className="why-label">{hhmm ? <>From the vital signs taken at <span className="mono">{hhmm(alert.at)}</span>:</> : 'From the latest vital signs:'}</p>
        <ul className="x-vt-reasons">
          {alert.reasons.map((r) => <li key={r} className="mono">{r}</li>)}
        </ul>
      </div>
      <div className="x-vt-actions">
        <button type="button" className="btn x-vt-big" onClick={onEmergency}>Open emergency mode</button>
        {onSend ? <button type="button" className="btn secondary x-vt-big" onClick={onSend}>{say('Send case to Earth', setting)}</button> : null}
      </div>
      <div>
        <p className="why-label">First steps</p>
        <ul className="checks">
          {alert.steps.map((st) => (
            <li key={st}>
              <button type="button" className="check" role="checkbox" aria-checked={done.includes(st)} onClick={() => toggle(st)}>
                <span className="box" aria-hidden="true">{done.includes(st) ? '✓' : ''}</span>
                <span>{say(st, setting)}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
      {alert.placeholder ? <span className="placeholder">Placeholder steps and thresholds, awaiting clinician sign-off</span> : null}
      <More label="Why this alert?">
        <p>{say(alert.checksFor, setting)}</p>
        <p className="source">Rule <span className="mono">{alert.id}</span> · Source: {alert.source.replace(/\.$/, '')} · Rule confidence: {alert.confidence}</p>
      </More>
    </section>
  );
}

export function Vitals({ state, commit, setting, crewId, seed, rules, go, say, hhmm, onSend }: VitalsProps) {
  const [texts, setTexts] = useState<Texts>(EMPTY);
  const [formError, setFormError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const person = seed.crew.find((c) => c.id === crewId);
  const latest = latestVitals(state, crewId);
  const alerts = vitalsAlerts(state, rules, crewId, setting.gravityBand);
  const demos = seed.demoVitals ?? [];
  const latestIsDemo = latest ? demos.some((d) => sameSet(d.values, latest.values)) : false;
  const errors = Object.fromEntries(VITAL_FIELDS.map((f) => [f.id, fieldError(f, texts[f.id])])) as Record<VitalField, string | undefined>;

  const set = (id: VitalField, t: string) => { setTexts((x) => ({ ...x, [id]: t })); setFormError(null); setSaved(false); };
  const nudge = (f: VitalFieldInfo, dir: 1 | -1) => {
    const v = parse(texts[f.id]);
    const start = typeof v === 'number' ? v : latest?.values[f.id];
    if (start === undefined) return;
    const next = Math.min(f.max, Math.max(f.min, start + dir * f.step));
    set(f.id, next.toFixed(f.dp));
  };
  const save = () => {
    if (VITAL_FIELDS.some((f) => errors[f.id])) { setFormError('Check the values marked below, then save again.'); return; }
    const values: VitalSigns = {};
    for (const f of VITAL_FIELDS) { const v = parse(texts[f.id]); if (typeof v === 'number') values[f.id] = v; }
    try {
      commit(recordVitals(state, { crewId, values, at: Date.now() }));
      setSaved(true);
      setFormError(null);
    } catch (e) { setFormError((e as Error).message); }
  };

  return (
    <section className="stack x-vt" aria-labelledby="x-vt-h">
      <div className="card">
        <div className="card-head">
          <h1 id="x-vt-h" className="title">Vital signs{person ? <> for {person.name}</> : null}</h1>
        </div>
        <p className="caption">Read them from the monitor and type them in, or use − and + to adjust. Leave out anything not measured.</p>

        {demos.length ? (
          <div className="x-vt-demo" role="group" aria-label="Demo sets of vital signs">
            {demos.map((d) => (
              <button key={d.id} type="button" className="btn secondary" onClick={() => { setTexts(toText(d.values)); setFormError(null); setSaved(false); }}>
                Demo: fill {d.label} <SyntheticTag />
              </button>
            ))}
          </div>
        ) : null}

        <div className="x-vt-fields">
          {VITAL_FIELDS.map((f) => {
            const id = `x-vt-${f.id}`;
            const err = errors[f.id];
            const canStep = parse(texts[f.id]) !== 'bad' && (typeof parse(texts[f.id]) === 'number' || latest?.values[f.id] !== undefined);
            const describedBy = [err ? `${id}-err` : '', f.id === 'spo2' ? 'x-vt-spo2-note' : ''].filter(Boolean).join(' ') || undefined;
            return (
              <div className="x-vt-row" key={f.id}>
                <label className="x-vt-name" htmlFor={id}>{f.label}</label>
                <div className="x-vt-stepper">
                  <button type="button" className="x-vt-step" aria-label={`Lower ${f.label.toLowerCase()}`} disabled={!canStep} onClick={() => nudge(f, -1)}>−</button>
                  <div className="x-vt-field">
                    <input id={id} inputMode="decimal" autoComplete="off" value={texts[f.id]} onChange={(e) => set(f.id, e.target.value)} aria-invalid={Boolean(err)} aria-describedby={describedBy} />
                    <span className="x-vt-unit">{f.unit}</span>
                  </div>
                  <button type="button" className="x-vt-step" aria-label={`Raise ${f.label.toLowerCase()}`} disabled={!canStep} onClick={() => nudge(f, 1)}>+</button>
                </div>
                {err ? <p className="x-vt-error" id={`${id}-err`} role="alert">{err}</p> : null}
                {f.id === 'spo2' ? (
                  <div className="x-vt-note" id="x-vt-spo2-note">
                    <p>Readings run lower and are less reliable at low cabin pressure, so oxygen saturation never raises an alert by itself.{setting.cabinKPa ? <> Cabin pressure here: <span className="mono">{setting.cabinKPa}</span> kPa.</> : null}</p>
                    <p className="source">Source: the team's clinical lead, build pack v3.3. <span className="placeholder">Placeholder wording, awaiting sign-off</span></p>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>

        {formError ? <p className="x-vt-error" role="alert">{formError}</p> : null}
        <div className="btn-row">
          <button type="button" className="btn x-vt-big" onClick={save}>Save</button>
        </div>
        <p className="caption">Values outside the possible range are refused as typing slips. Those checks are not clinical limits.</p>
      </div>

      {latest ? (
        <div aria-live="polite" className="stack">
          <p className="caption">
            {saved ? 'Saved. ' : ''}Latest set, <span className="mono">{hhmm(latest.at)}</span>: <span className="mono">{vitalsLine(latest.values)}</span>{latestIsDemo ? <> <SyntheticTag /></> : null}
          </p>
          {alerts.length === 0 ? (
            <p className="x-vt-quiet">No alert from these vital signs.</p>
          ) : alerts.map((a) => (
            <MonitorAlertCard key={a.key} alert={a} setting={setting} say={say} hhmm={hhmm} synthetic={latestIsDemo} onEmergency={() => go('astra', String(a.construct))} onSend={onSend ? () => onSend(a) : undefined} />
          ))}
        </div>
      ) : null}
    </section>
  );
}
