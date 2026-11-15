// "Feeling off?": log a symptom the moment it happens, in three steps (where, what it is like, what the rules make of it).
// AI assistance: drafted with Claude Code (see AI_USE.md).
import { useEffect, useRef, useState } from 'react';
import { AdvisoryPill, SyntheticTag, TierPill } from '../components/ui';
import { crewById, pathwayStatuses, pathwayTier, toggleSymptom, type PathwayStatus, type RuleFile, type Seed, type Setting, type State } from '../core/index.ts';
import { VoiceTalk, type VoiceValues } from '../components/VoiceTalk.tsx';
import { spokenSymptoms } from '../core/speech.ts';
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
  // Yes/no questions that open an area, from the rules file (CR-54). "Yes" logs the symptom; "No" takes it off.
  const qPathway = zone ? rules.pathways.find((w) => w.questions?.zone === zone.id) : undefined;
  const questions = qPathway?.questions;
  const [answers, setAnswers] = useState<Record<number, 'yes' | 'no'>>({});
  useEffect(() => { setAnswers({}); }, [zoneId]);
  const asked = new Set([...(questions ? qPathway!.core : []), ...(questions?.items.map((x) => x.symptom).filter((x): x is string => Boolean(x)) ?? [])]);
  const answer = (i: number, yes: boolean) => {
    const sym = questions!.items[i].symptom;
    setAnswers((a) => ({ ...a, [i]: yes ? 'yes' : 'no' }));
    if (sym && has(sym) !== yes) commit(toggleSymptom(state, crewId, sym, Date.now()));
  };
  const painYes = questions ? questions.items.some((x, i) => !x.symptom && answers[i] === 'yes') || qPathway!.core.some(has) : false;

  // Talk (CR-10): say symptoms instead of tapping them. The voice mode only matches words to the app's own list and
  // logs them; the rules then decide, exactly as for a tap. It never adds a symptom that is not on the list.
  const SYM = 'symptoms';
  const voiceQuestions = [{ id: SYM, ask: 'How are you feeling? Say any symptoms you have. You can say several, or say nothing to report.' }];
  const voiceUnderstand = (said: string): VoiceValues | string | undefined => {
    const found = spokenSymptoms(said, seed.symptoms.options);
    if (found.length) return { [SYM]: found.join(', ') };
    return /\b(nothing|none|no symptoms|all good|i am fine|i'm fine)\b/i.test(said) ? { [SYM]: 'nothing' } : undefined;
  };
  const voiceFill = (got: VoiceValues) => {
    const sym = got[SYM];
    if (typeof sym !== 'string' || sym === 'nothing') return;
    let next = state;
    for (const label of sym.split(', ')) if (!next.symptoms.some((x) => x.crewId === crewId && x.label === label)) next = toggleSymptom(next, crewId, label, Date.now());
    commit(next);
  };
  const voiceFinish = () => { setStep(3); return 'Logged. Here is what the rules make of it.'; };

  const title = step === 1 ? 'Where?' : step === 2 ? 'What is it like?' : 'Result';
  return (
    <>
      <div className="context">
        <span className="kicker">{setting.id === 'earth' ? setting.kicker : `${crew.name} · ${setting.kicker}`}</span>
        <SyntheticTag />
      </div>
      <p className="x-ci-steps" aria-live="polite">Step {step} of 3</p>
      <h1 className="display" ref={heading} tabIndex={-1}>{title}</h1>
      {step === 1 ? <VoiceTalk what="symptoms" questions={voiceQuestions} understand={voiceUnderstand} readBack={(_, v) => (v === 'nothing' ? 'Nothing to report.' : `${v}.`)} onFill={voiceFill} onFinish={voiceFinish} example="For example: headache and nauseous." /> : null}

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
          {questions ? (
            <div className="stack">
              {questions.items.map((x, i) => {
                const yes = x.symptom ? has(x.symptom) || answers[i] === 'yes' : painYes;
                const no = !yes && answers[i] === 'no';
                return (
                  <div key={x.ask} role="group" aria-label={x.ask}>
                    <p><strong>{say(x.ask, setting)}</strong></p>
                    <div className="chips">
                      <button type="button" className="chip chip-toggle" aria-pressed={yes} onClick={() => answer(i, true)}>Yes</button>
                      <button type="button" className="chip chip-toggle" aria-pressed={no} onClick={() => answer(i, false)}>No</button>
                    </div>
                    {!x.symptom && painYes ? (
                      <>
                        <p className="caption">{questions.pain_where}</p>
                        <div className="chips">
                          {qPathway!.core.map((o) => <button key={o} type="button" className="chip chip-toggle" aria-pressed={has(o)} onClick={() => commit(toggleSymptom(state, crewId, o, Date.now()))}>{o}</button>)}
                        </div>
                        <p className="caption">Pain somewhere else? Go back and choose that area.</p>
                      </>
                    ) : null}
                  </div>
                );
              })}
              <p><strong>Anything else?</strong></p>
            </div>
          ) : <p>Tap everything that fits. Tap again to take it off.</p>}
          <div className="chips" role="group" aria-label={`Symptoms: ${zone.label}`}>
            {zone.symptoms.filter((o) => !asked.has(o)).map((o) => (
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
