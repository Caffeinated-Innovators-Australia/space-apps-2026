// "Feeling off?": log a symptom the moment it happens, in three steps (where, what it is like, what the rules make of it).
// AI assistance: drafted with Claude Code (see AI_USE.md).
import { useEffect, useRef, useState } from 'react';
import { AdvisoryPill, SyntheticTag, TierPill } from '../components/ui';
import { crewById, pathwayStatuses, pathwayTier, toggleSymptom, type PathwayStatus, type RuleFile, type Seed, type Setting, type State } from '../core/index.ts';
import './crew-checkin.css';

export interface FeelingOffProps {
  state: State; commit: (s: State) => void; ui: (p: Partial<State['ui']>) => void; setting: Setting; crewId: string;
  seed: Seed; rules: RuleFile; go: (route: string, arg?: string) => void; say: (text: string, s: Setting) => string; hhmm: (t: number) => string;
}

const LEVEL_RANK: Record<PathwayStatus['level'], number> = { check: 0, early: 1, amber: 2, red: 3 };

export function FeelingOff({ state, commit, setting, crewId, seed, rules, go, say, hhmm }: FeelingOffProps) {
  const crew = crewById(seed, crewId);
  const zones = seed.symptomZones?.zones?.length ? seed.symptomZones.zones : [{ id: 'all', label: 'Anywhere', symptoms: seed.symptoms.options }];
  const status = seed.symptomZones?.status ?? seed.symptoms.status;
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [zoneId, setZoneId] = useState<string>('');
  const heading = useRef<HTMLHeadingElement>(null);
  const first = useRef(true);
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    heading.current?.focus();
  }, [step]);

  const zone = zones.find((z) => z.id === zoneId);
  const mine = state.symptoms.filter((s) => s.crewId === crewId);
  const has = (label: string) => mine.some((s) => s.label === label);
  const pickedHere = zone ? zone.symptoms.filter(has) : [];
  const open = pathwayStatuses(state, seed, rules, crewId).slice().sort((a, b) => LEVEL_RANK[b.level] - LEVEL_RANK[a.level])[0];

  const title = step === 1 ? 'Where?' : step === 2 ? 'What is it like?' : 'Result';
  return (
    <>
      <div className="context">
        <span className="kicker">{setting.id === 'earth' ? setting.kicker : `${crew.name} · ${setting.kicker}`}</span>
        <SyntheticTag />
      </div>
      <p className="x-ci-steps" aria-live="polite">Step {step} of 3</p>
      <h1 className="display" ref={heading} tabIndex={-1}>{title}</h1>

      {step === 1 ? (
        <section className="card">
          <p>Tap where you feel it.</p>
          <div className="x-ci-zones" role="group" aria-label="Where you feel it">
            {zones.map((z) => (
              <button key={z.id} type="button" className="x-ci-zone" aria-pressed={z.id === zoneId} onClick={() => { setZoneId(z.id); setStep(2); }}>{z.label}</button>
            ))}
          </div>
          <span className="placeholder">{status}</span>
        </section>
      ) : null}

      {step === 2 && zone ? (
        <section className="card">
          <div className="card-head"><h2 className="title">{zone.label}</h2><SyntheticTag /></div>
          <p>Tap everything that fits. Tap again to take it off.</p>
          <div className="chips" role="group" aria-label={`Symptoms: ${zone.label}`}>
            {zone.symptoms.map((o) => (
              <button key={o} type="button" className="chip chip-toggle" aria-pressed={has(o)} onClick={() => commit(toggleSymptom(state, crewId, o, Date.now()))}>{o}</button>
            ))}
          </div>
          {pickedHere.length === 0 ? <p className="caption">Tap at least one to see the result.</p> : null}
          <div className="btn-row">
            <button type="button" className="btn" disabled={pickedHere.length === 0} onClick={() => setStep(3)}>See the result</button>
            <button type="button" className="btn secondary" onClick={() => setStep(1)}>Back</button>
          </div>
        </section>
      ) : null}

      {step === 3 ? (
        open ? (
          <section className={pathwayTier(open) ? `alert alert-${pathwayTier(open)}` : 'card prompt-card'} aria-live="polite">
            <div className="card-head">{pathwayTier(open) ? <TierPill tier={pathwayTier(open)!} /> : <AdvisoryPill>Advisory: a few quick questions</AdvisoryPill>}<SyntheticTag /></div>
            <h2 className="title">{open.title}</h2>
            <div className="why">
              <span className="why-label">Why?</span>
              <p>{say(open.why, setting)}</p>
              <p className="source">Rule {open.ruleId}. Source: {open.source}</p>
            </div>
            {open.placeholder ? <span className="placeholder">Placeholder rule, awaiting clinician review</span> : null}
            <div className="btn-row">
              <button type="button" className="btn" onClick={() => go('pathway', open.pathway.id)}>{open.level === 'check' ? 'Answer the questions' : 'See what to do'}</button>
              <button type="button" className="btn secondary" onClick={() => setStep(2)}>Back</button>
            </div>
          </section>
        ) : (
          <section className="card" aria-live="polite">
            <div className="card-head"><h2 className="title">Logged</h2><SyntheticTag /></div>
            <p>Logged. Nothing is raised by what you have told us. Only you see this unless you send it.</p>
            {mine.length > 0 ? <p className="caption">{mine.map((x) => `${x.label} at ${hhmm(x.at)}`).join(', ')}.</p> : null}
            <div className="btn-row">
              <button type="button" className="btn" onClick={() => go('home')}>Back to Today</button>
              <button type="button" className="btn secondary" onClick={() => setStep(2)}>Back</button>
            </div>
          </section>
        )
      ) : null}
    </>
  );
}
