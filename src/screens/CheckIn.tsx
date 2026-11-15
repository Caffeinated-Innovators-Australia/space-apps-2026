// The daily check-in on one screen: every daily check-in still due today, symptoms in one tap, and one finish button.
// AI assistance: drafted with Claude Code (see AI_USE.md).
import { useState } from 'react';
import { ScaleInput } from '../components/ScaleInput';
import { VoiceTalk, type VoiceValues } from '../components/VoiceTalk.tsx';
import { aiUnderstand, ChecklistSuggestion } from '../components/aiVoice.tsx';
import type { Interpretation } from '../core/ai.ts';
import { spokenNumber, spokenSymptoms } from '../core/speech.ts';
import { AdvisoryPill, SyntheticTag, TierPill, statusClass } from '../components/ui';
import {
  crewById, daySummary, demoValue, pathwayStatuses, pathwayTier, plausible, recordReading, reportNothing, toggleSymptom,
  type Indicator, type RuleFile, type Seed, type Setting, type State,
} from '../core/index.ts';
import './crew-checkin.css';

export interface CheckInProps {
  state: State; commit: (s: State) => void; ui: (p: Partial<State['ui']>) => void; setting: Setting; crewId: string;
  seed: Seed; rules: RuleFile; go: (route: string, arg?: string) => void; say: (text: string, s: Setting) => string; hhmm: (t: number) => string;
}

const fmt = (ind: Indicator, v: number) => v.toFixed(ind.dp);
/** Units as words, so the voice says "litres" and not "L". */
const UNIT_WORDS: Record<string, string> = { h: 'hours', L: 'litres', bpm: 'beats a minute', kcal: 'kilocalories', '%': 'percent', kg: 'kilograms', mmHg: 'millimetres of mercury', ms: 'milliseconds' };

export function CheckIn({ state, commit, setting, crewId, seed, rules, go, say, hhmm }: CheckInProps) {
  const crew = crewById(seed, crewId);
  const due = daySummary(state, seed, rules, crewId).items.filter((x) => x.indicator.cadence === 'daily' && x.due && !x.reading);
  const rows = due.filter((x) => x.indicator.input.kind === 'number' || x.indicator.input.kind === 'scale').map((x) => x.indicator);
  const elsewhere = due.filter((x) => !rows.includes(x.indicator)).map((x) => x.indicator);
  const [values, setValues] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const text = (ind: Indicator) => values[ind.id] ?? fmt(ind, demoValue(seed, crewId, ind.id));
  const set = (ind: Indicator, t: string) => {
    setValues((v) => ({ ...v, [ind.id]: t }));
    setErrors((e) => { const { [ind.id]: _gone, ...rest } = e; return rest; });
  };
  const ok = (ind: Indicator) => { const t = text(ind).trim(); return t !== '' && Number.isFinite(Number(t)) && plausible(ind, Number(t)); };
  const ready = rows.filter(ok).length;
  const nudge = (ind: Indicator, dir: 1 | -1) => {
    const step = 10 ** -ind.dp;
    const now = Number(text(ind));
    const base = Number.isFinite(now) ? now : demoValue(seed, crewId, ind.id);
    set(ind, fmt(ind, Math.min(ind.input.max, Math.max(ind.input.min, base + dir * step))));
  };

  const mine = state.symptoms.filter((s) => s.crewId === crewId);
  // Symptoms are grouped by body area, so the list reads as a few short rows and not one long one.
  const zones = (seed.symptomZones?.zones?.length ? seed.symptomZones.zones : [{ id: 'all', label: 'Symptoms', symptoms: seed.symptoms.options }]).map((z) => ({ ...z, symptoms: z.symptoms.filter((o) => seed.symptoms.options.includes(o)) })).filter((z) => z.symptoms.length > 0);
  const nothing = state.nothingToReport.includes(crewId);
  const question = pathwayStatuses(state, seed, rules, crewId).find((p) => p.level === 'early' || p.level === 'check');

  const finish = (): string => {
    const bad: Record<string, string> = {};
    for (const ind of rows) {
      if (!ok(ind)) bad[ind.id] = `That cannot be right: ${ind.name.toLowerCase()} must be between ${ind.input.min} and ${ind.input.max} ${ind.unit}. Check it and try again.`;
    }
    if (Object.keys(bad).length) { setErrors(bad); return 'Not saved. Check the values marked on the screen.'; }
    let next = state;
    const at = Date.now();
    for (const ind of rows) {
      try {
        next = recordReading(next, seed, rules, { crewId, indicatorId: ind.id, value: Number(Number(text(ind)).toFixed(ind.dp)), at }).state;
      } catch (e) {
        setErrors({ [ind.id]: (e as Error).message });
        return `Not saved. ${(e as Error).message}`;
      }
    }
    commit(next);
    go('home');
    return 'Check-in saved.';
  };

  // Talk: the same form, filled by voice. The spoken answers go through the same checks as typed ones.
  const SYMPTOMS = '__symptoms';
  const [suggested, setSuggested] = useState<Interpretation['checklist']>(null);
  const questions = [...rows.map((ind) => ({ id: ind.id, ask: (ind.input.prompt && ind.input.prompt.toLowerCase() !== ind.name.toLowerCase() ? `${ind.name}. ${ind.input.prompt}?` : `${ind.name}, in ${ind.unit}?`).replace(/\?\?$/, '?') })), { id: SYMPTOMS, ask: 'Anything else today? Say a symptom from the list, or say nothing to report.' }];
  const understand = (said: string, id: string): VoiceValues | string | undefined => {
    if (id === SYMPTOMS) {
      const found = spokenSymptoms(said, seed.symptoms.options);
      if (found.length) return { [SYMPTOMS]: found.join(', ') };
      return /\b(nothing|none|no symptoms|all good|i am fine|i'm fine)\b/i.test(said) ? { [SYMPTOMS]: 'nothing' } : undefined;
    }
    const ind = rows.find((r) => r.id === id);
    const n = spokenNumber(said);
    if (!ind || n === undefined) return undefined;
    if (!plausible(ind, n)) return `${ind.name} of ${n} cannot be right. It must be between ${ind.input.min} and ${ind.input.max}.`;
    return { [id]: n };
  };
  const readBack = (id: string, v: number | string) => {
    if (id === SYMPTOMS) return v === 'nothing' ? 'Nothing to report.' : `Logged: ${v}.`;
    const ind = rows.find((r) => r.id === id);
    return ind ? `${ind.name} ${Number(v).toFixed(ind.dp)} ${UNIT_WORDS[ind.unit] ?? ind.unit}.` : '';
  };
  const voiceFill = (got: VoiceValues) => {
    for (const ind of rows) if (got[ind.id] !== undefined) set(ind, fmt(ind, Number(got[ind.id])));
    const sym = got[SYMPTOMS];
    if (sym === 'nothing') { if (!nothing) commit(reportNothing(state, crewId)); }
    else if (typeof sym === 'string') {
      let next = state;
      for (const label of sym.split(', ')) if (!next.symptoms.some((x) => x.crewId === crewId && x.label === label)) next = toggleSymptom(next, crewId, label, Date.now());
      commit(next);
    }
  };

  const context = (
    <div className="context">
      <span className="kicker">{setting.id === 'earth' ? setting.kicker : `${crew.name} · ${setting.kicker}`}</span>
      <SyntheticTag />
    </div>
  );

  if (due.length === 0) {
    return (
      <>
        {context}
        <h1 className="display">Today's check-in is done.</h1>
        <div className="btn-row"><button className="btn" onClick={() => go('home')}>Back to Today</button></div>
      </>
    );
  }

  return (
    <>
      {context}
      <h1 className="display">Daily check-in</h1>
      <ChecklistSuggestion checklist={suggested} onOpen={(c) => go('astra', String(c))} />
      <VoiceTalk what="daily check-in" questions={questions} understand={aiUnderstand(understand, { fields: rows.map((r) => ({ id: r.id, name: r.name, unit: r.unit, min: r.input.min, max: r.input.max, labels: r.input.labels })), symptoms: seed.symptoms.options, suggestChecklist: false }, (i) => ({ ...i.values, ...(i.symptoms.length ? { [SYMPTOMS]: i.symptoms.join(', ') } : {}) }), setSuggested)} readBack={readBack} onFill={voiceFill} onFinish={finish} />
      <form className="stack" onSubmit={(e) => { e.preventDefault(); finish(); }} noValidate>
        <section className="card" aria-labelledby="x-ci-rows">
          <div className="card-head"><h2 className="title" id="x-ci-rows">Today's numbers</h2><SyntheticTag /></div>
          <p className="caption">Example value for the demo (SYNTHETIC). Change it to your own.</p>
          {rows.map((ind) => {
            const id = `x-ci-${ind.id}`;
            const err = errors[ind.id];
            return (
              <div className="x-ci-row" key={ind.id}>
                <div className="x-ci-head">
                  <label className="x-ci-name" htmlFor={ind.input.kind === 'number' ? id : undefined} id={`${id}-label`}>{ind.name}</label>
                  <span className="x-ci-unit">{ind.input.prompt} ({ind.unit})</span>
                </div>
                {ind.input.kind === 'scale' ? (
                  <div role="group" aria-labelledby={`${id}-label`}>
                    <ScaleInput labels={ind.input.labels ?? []} value={ok(ind) ? Number(text(ind)) : undefined} onPick={(n) => set(ind, String(n))} />
                    {ind.id === 'mood' && <p className="caption">Private. You choose whether to share.</p>}
                  </div>
                ) : (
                  <div className="x-ci-stepper">
                    <button type="button" className="x-ci-step" aria-label={`Less ${ind.name.toLowerCase()}`} onClick={() => nudge(ind, -1)}>−</button>
                    <div className="x-ci-field">
                      <input id={id} inputMode="decimal" autoComplete="off" value={text(ind)} onChange={(e) => set(ind, e.target.value)} aria-invalid={Boolean(err)} aria-describedby={err ? `${id}-err` : undefined} />
                      <span className="x-ci-unit">{ind.unit}</span>
                    </div>
                    <button type="button" className="x-ci-step" aria-label={`More ${ind.name.toLowerCase()}`} onClick={() => nudge(ind, 1)}>+</button>
                    <input type="range" className="x-ci-range" aria-label={`${ind.name}, slide to set`} min={ind.input.min} max={ind.input.max} step={10 ** -ind.dp} value={Number.isFinite(Number(text(ind))) && text(ind).trim() !== '' ? Math.min(ind.input.max, Math.max(ind.input.min, Number(text(ind)))) : demoValue(seed, crewId, ind.id)} onChange={(e) => set(ind, fmt(ind, Number(e.target.value)))} />
                  </div>
                )}
                {err ? <p className="x-ci-error" id={`${id}-err`} role="alert">{err}</p> : null}
              </div>
            );
          })}
          {elsewhere.length > 0 ? (
            <p className="caption">Also due today, on its own screen: {elsewhere.map((ind, i) => (
              <span key={ind.id}>{i ? ', ' : ''}<button type="button" className="link" onClick={() => go('reading', ind.id)}>{ind.name}</button></span>
            ))}.</p>
          ) : null}
        </section>

        <section className="card" aria-labelledby="x-ci-feel">
          <div className="card-head"><h2 className="title" id="x-ci-feel">Anything else today?</h2><SyntheticTag /></div>
          <div className="chips" role="group" aria-label="Nothing to report">
            <button type="button" className="chip chip-toggle" aria-pressed={nothing} onClick={() => commit(reportNothing(state, crewId))}>Nothing to report</button>
          </div>
          {zones.map((z) => (
            <div className="x-ci-zonegroup" key={z.id}>
              <span className="group-name" id={`x-ci-z-${z.id}`}>{z.label}</span>
              <div className="chips" role="group" aria-labelledby={`x-ci-z-${z.id}`}>
                {z.symptoms.map((o) => (
                  <button key={o} type="button" className="chip chip-toggle" aria-pressed={mine.some((x) => x.label === o)} onClick={() => commit(toggleSymptom(state, crewId, o, Date.now()))}>{o}</button>
                ))}
              </div>
            </div>
          ))}
          {mine.length > 0 ? (
            <p aria-live="polite">Logged: {mine.map((x) => `${x.label.toLowerCase()} at ${hhmm(x.at)}`).join(', ')}.</p>
          ) : nothing ? <p aria-live="polite">Logged: nothing to report.</p> : null}
          <p className="caption">Only you see this unless you send it.</p>
          <span className={statusClass(seed.symptoms.status)}>{seed.symptoms.status}</span>
        </section>

        {question ? (
          <section className="card prompt-card" aria-live="polite">
            <div className="card-head">{pathwayTier(question) ? <TierPill tier={pathwayTier(question)!} /> : <AdvisoryPill>Advisory: a few quick questions</AdvisoryPill>}<SyntheticTag /></div>
            <h2 className="title">{question.title}</h2>
            <p>{say(question.why, setting)}</p>
            <p className="source">Rule {question.ruleId}. {question.placeholder ? 'Placeholder rule, awaiting clinician review.' : ''}</p>
            <div className="btn-row"><button type="button" className="btn secondary" onClick={() => go('pathway', question.pathway.id)}>Answer the questions</button></div>
          </section>
        ) : null}

        <div className="btn-row">
          <button type="submit" className="btn">Finish check-in</button>
          <span className="caption" aria-live="polite"><span className="mono">{ready}</span> of <span className="mono">{rows.length}</span> ready</span>
        </div>
      </form>
    </>
  );
}
