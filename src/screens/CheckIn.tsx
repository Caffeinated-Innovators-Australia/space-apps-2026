// The daily check-in on one screen: every daily check-in still due today, symptoms in one tap, and one finish button.
// AI assistance: drafted with Claude Code (see AI_USE.md).
import { useState } from 'react';
import { ScaleInput } from '../components/ScaleInput';
import { AdvisoryPill, SyntheticTag, TierPill } from '../components/ui';
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
  const nothing = state.nothingToReport.includes(crewId);
  const question = pathwayStatuses(state, seed, rules, crewId).find((p) => p.level === 'early' || p.level === 'check');

  const finish = () => {
    const bad: Record<string, string> = {};
    for (const ind of rows) {
      if (!ok(ind)) bad[ind.id] = `That cannot be right: ${ind.name.toLowerCase()} must be between ${ind.input.min} and ${ind.input.max} ${ind.unit}. Check it and try again.`;
    }
    if (Object.keys(bad).length) { setErrors(bad); return; }
    let next = state;
    const at = Date.now();
    for (const ind of rows) {
      try {
        next = recordReading(next, seed, rules, { crewId, indicatorId: ind.id, value: Number(Number(text(ind)).toFixed(ind.dp)), at }).state;
      } catch (e) {
        setErrors({ [ind.id]: (e as Error).message });
        return;
      }
    }
    commit(next);
    go('home');
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
                  </div>
                ) : (
                  <div className="x-ci-stepper">
                    <button type="button" className="x-ci-step" aria-label={`Less ${ind.name.toLowerCase()}`} onClick={() => nudge(ind, -1)}>−</button>
                    <div className="x-ci-field">
                      <input id={id} inputMode="decimal" autoComplete="off" value={text(ind)} onChange={(e) => set(ind, e.target.value)} aria-invalid={Boolean(err)} aria-describedby={err ? `${id}-err` : undefined} />
                      <span className="x-ci-unit">{ind.unit}</span>
                    </div>
                    <button type="button" className="x-ci-step" aria-label={`More ${ind.name.toLowerCase()}`} onClick={() => nudge(ind, 1)}>+</button>
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
          <div className="chips" role="group" aria-labelledby="x-ci-feel">
            {seed.symptoms.options.map((o) => (
              <button key={o} type="button" className="chip chip-toggle" aria-pressed={mine.some((x) => x.label === o)} onClick={() => commit(toggleSymptom(state, crewId, o, Date.now()))}>{o}</button>
            ))}
            <button type="button" className="chip chip-toggle" aria-pressed={nothing} onClick={() => commit(reportNothing(state, crewId))}>Nothing to report</button>
          </div>
          {mine.length > 0 ? (
            <p aria-live="polite">Logged: {mine.map((x) => `${x.label.toLowerCase()} at ${hhmm(x.at)}`).join(', ')}.</p>
          ) : nothing ? <p aria-live="polite">Logged: nothing to report.</p> : null}
          <p className="caption">Only you see this unless you send it.</p>
          <span className="placeholder">{seed.symptoms.status}</span>
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
