// One body area on one screen: every check-in in it, the symptoms to report for it, and results logged for the record only.
// Asked for by the team's clinicians. Record-only results raise no alert and set no result until a clinician writes a rule.
// AI assistance: drafted with Claude Code (see AI_USE.md).
import { useState } from 'react';
import { SyntheticTag, TierPill } from '../components/ui';
import {
  addRecord, bodyArea, crewById, daySummary, demoValue, plausible, recordKind, recordLine, recordReading, recordsFor, recordsStatus, toggleSymptom, ultrasoundAvailable,
  type Indicator, type RecordKind, type RuleFile, type Seed, type Setting, type State,
} from '../core/index.ts';
import './x-ar.css';

export interface AreaProps {
  state: State; commit: (s: State) => void; ui: (p: Partial<State['ui']>) => void; setting: Setting; crewId: string;
  seed: Seed; rules: RuleFile; go: (route: string, arg?: string) => void; say: (text: string, s: Setting) => string; hhmm: (t: number) => string;
  areaId?: string;
}

const fmt = (ind: Indicator, v: number) => (ind.input.kind === 'scale' ? v.toFixed(0) : v.toFixed(ind.dp));

/** The Amsler grid: a square grid with a centre dot. Drawn in code by the build assistant (AI-assisted code, see AI_USE.md). */
function AmslerGrid() {
  const lines = Array.from({ length: 21 }, (_, i) => i * 10);
  return (
    <svg className="x-ar-amsler" viewBox="0 0 200 200" role="img" aria-label="Amsler grid: a square grid of straight lines with a dot in the centre.">
      <rect x="0" y="0" width="200" height="200" className="x-ar-amsler-bg" />
      {lines.map((v) => <path key={v} className="x-ar-amsler-line" d={`M${v} 0V200M0 ${v}H200`} />)}
      <circle className="x-ar-amsler-dot" cx="100" cy="100" r="4" />
    </svg>
  );
}

/** A small trend line: earlier example results, then the person's own entries. */
function Spark({ values, own, unit, dp }: { values: number[]; own: number; unit: string; dp: number }) {
  if (values.length < 2) return null;
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  const span = hi - lo || 1;
  const x = (i: number) => 8 + (i * 264) / (values.length - 1);
  const y = (v: number) => 52 - ((v - lo) / span) * 40;
  return (
    <svg className="x-ar-spark" viewBox="0 0 280 64" role="img" aria-label={`Trend of ${values.length} results, from ${values[0].toFixed(dp)} to ${values[values.length - 1].toFixed(dp)} ${unit}. The last ${own} ${own === 1 ? 'is' : 'are'} your own.`}>
      <path className="x-ar-spark-line" d={values.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join('')} />
      {values.map((v, i) => <circle key={i} className={i >= values.length - own ? 'x-ar-spark-own' : 'x-ar-spark-demo'} cx={x(i)} cy={y(v)} r={i >= values.length - own ? 5 : 3.5} />)}
    </svg>
  );
}

function RecordCard({ kind, state, commit, crewId, hhmm }: { kind: RecordKind; state: State; commit: (s: State) => void; crewId: string; hhmm: (t: number) => string }) {
  const [option, setOption] = useState<string | undefined>(kind.options?.length === 1 ? kind.options[0] : undefined);
  const [option2, setOption2] = useState<string | undefined>();
  const [text, setText] = useState('');
  const [score, setScore] = useState<number | undefined>();
  const [note, setNote] = useState('');
  const [problem, setProblem] = useState('');
  const mine = recordsFor(state, crewId, kind.id);
  const save = () => {
    try {
      const r = addRecord(state, { crewId, kindId: kind.id, at: Date.now(), option, option2, value: kind.number ? (text.trim() === '' ? undefined : Number(text)) : undefined, score, note });
      commit(r.state);
      setText(''); setNote(''); setScore(undefined); setProblem('');
      if ((kind.options?.length ?? 0) > 1) setOption(undefined);
      setOption2(undefined);
    } catch (e) {
      setProblem((e as Error).message);
    }
  };
  const ownValues = mine.filter((r) => r.value !== undefined).map((r) => r.value!);
  const id = `x-ar-${kind.id}`;
  return (
    <section className="card" aria-labelledby={`${id}-h`}>
      <div className="card-head"><h2 className="title" id={`${id}-h`}>{kind.label}</h2><span className="x-ar-tag">Record only</span></div>
      <p className="caption">{kind.how}</p>
      {kind.grid ? <AmslerGrid /> : null}
      {kind.options2 ? (
        <div>
          <div className="caption" id={`${id}-o2`}>{kind.option2Label}</div>
          <div className="chips" role="group" aria-labelledby={`${id}-o2`}>
            {kind.options2.map((o) => <button key={o} type="button" className="chip chip-toggle" aria-pressed={option2 === o} onClick={() => setOption2(o)}>{o}</button>)}
          </div>
        </div>
      ) : null}
      {kind.options && kind.options.length > 1 ? (
        <div>
          <div className="caption" id={`${id}-o`}>{kind.optionLabel}</div>
          <div className="chips" role="group" aria-labelledby={`${id}-o`}>
            {kind.options.map((o) => <button key={o} type="button" className="chip chip-toggle" aria-pressed={option === o} onClick={() => setOption(o)}>{o}</button>)}
          </div>
        </div>
      ) : null}
      {kind.number ? (
        <div className="field">
          <input id={`${id}-n`} inputMode="decimal" autoComplete="off" value={text} onChange={(e) => { setText(e.target.value); setProblem(''); }} placeholder={(0).toFixed(kind.number.dp)} aria-label={`${kind.label}, in ${kind.number.unit}`} />
          <span className="unit">{kind.number.unit}</span>
        </div>
      ) : null}
      {kind.score ? (
        <div>
          <div className="caption" id={`${id}-s`}>How bad now, from 0 to 10</div>
          <div className="chips" role="group" aria-labelledby={`${id}-s`}>
            {Array.from({ length: 11 }, (_, n) => <button key={n} type="button" className="chip chip-toggle" aria-pressed={score === n} onClick={() => setScore(n)}>{n}</button>)}
          </div>
          <p className="muted">0 none · 10 worst</p>
        </div>
      ) : null}
      {kind.note ? (
        <label className="x-ar-note">
          <span className="caption">Note (optional). Do not write anyone's name.</span>
          <input value={note} maxLength={200} onChange={(e) => setNote(e.target.value)} autoComplete="off" />
        </label>
      ) : null}
      {problem ? <p className="caption" role="alert">{problem}</p> : null}
      <div className="btn-row"><button type="button" className="btn secondary" onClick={save}>{kind.options?.length === 1 && !kind.number ? 'Log as done' : 'Log it'}</button></div>
      {kind.number && (kind.demo || ownValues.length > 1) ? (
        <>
          <Spark values={[...(kind.demo ?? []), ...ownValues]} own={ownValues.length} unit={kind.number.unit} dp={kind.number.dp} />
          {kind.demo ? <p className="caption"><SyntheticTag /> Small dots are example results from earlier in the mission. Large dots are yours.</p> : null}
        </>
      ) : null}
      {mine.length > 0 ? (
        <ul className="plain" aria-live="polite">
          {mine.slice(-3).reverse().map((r) => <li key={r.id}><span className="mono">{hhmm(r.at)}</span> · {recordLine(r).replace(`${kind.label}: `, '')}</li>)}
        </ul>
      ) : <p className="muted">Nothing logged yet.</p>}
    </section>
  );
}

export function Area({ state, commit, setting, crewId, seed, rules, go, say, hhmm, areaId }: AreaProps) {
  const area = bodyArea(areaId ?? '');
  const crew = crewById(seed, crewId);
  const [values, setValues] = useState<Record<string, string>>({});
  const [problem, setProblem] = useState('');
  if (!area) {
    return (
      <>
        <h1 className="display">Area not found</h1>
        <div className="btn-row"><button className="btn" onClick={() => go('home')}>Back to today</button></div>
      </>
    );
  }
  const day = daySummary(state, seed, rules, crewId);
  const items = area.group ? day.items.filter((x) => x.indicator.group === area.group) : [];
  const mine = state.symptoms.filter((s) => s.crewId === crewId);
  const symptoms = area.symptoms.filter((o) => seed.symptoms.options.includes(o));
  // Checks that are plain numbers can be entered together, so one sitting captures the whole picture.
  const together = area.together ? items.filter((x) => x.indicator.input.kind === 'number' && !x.reading).map((x) => x.indicator) : [];
  const filled = together.filter((i) => (values[i.id] ?? '').trim() !== '');
  const saveTogether = () => {
    for (const ind of filled) {
      if (!plausible(ind, Number(values[ind.id]))) { setProblem(`That cannot be right: ${ind.name.toLowerCase()} must be between ${ind.input.min} and ${ind.input.max} ${ind.unit}. Check and enter it again.`); return; }
    }
    let next = state;
    const at = Date.now();
    try {
      for (const ind of filled) next = recordReading(next, seed, rules, { crewId, indicatorId: ind.id, value: Number(Number(values[ind.id]).toFixed(ind.dp)), at }).state;
    } catch (e) { setProblem((e as Error).message); return; }
    commit(next);
    setValues({});
    setProblem('');
  };
  const status = recordsStatus();
  return (
    <>
      <div className="context">
        <span className="kicker">{setting.id === 'earth' ? setting.kicker : `${crew.name} · ${setting.kicker}`}</span>
        <SyntheticTag />
      </div>
      <h1 className="display">{area.label}</h1>
      <div className="grid">
        <div className="stack">
          {together.length > 0 ? (
            <form className="card" onSubmit={(e) => { e.preventDefault(); saveTogether(); }} noValidate>
              <div className="card-head"><h2 className="title">Enter them together</h2><SyntheticTag /></div>
              <p className="caption">Sit and rest for five minutes first. Leave a box empty to skip it.</p>
              {together.map((ind) => (
                <div className="x-ar-row" key={ind.id}>
                  <label className="x-ar-name" htmlFor={`x-ar-in-${ind.id}`}>{ind.name}</label>
                  <div className="field">
                    <input id={`x-ar-in-${ind.id}`} inputMode="decimal" autoComplete="off" value={values[ind.id] ?? ''} onChange={(e) => { setValues({ ...values, [ind.id]: e.target.value }); setProblem(''); }} placeholder={(0).toFixed(ind.dp)} />
                    <span className="unit">{ind.unit}</span>
                  </div>
                </div>
              ))}
              {problem ? <p className="caption" role="alert">{problem}</p> : null}
              <div className="btn-row">
                <button className="btn" type="submit" disabled={filled.length === 0}>Check against my baseline</button>
                <button className="btn secondary" type="button" onClick={() => setValues(Object.fromEntries(together.map((i) => [i.id, fmt(i, demoValue(seed, crewId, i.id))])))}>Fill demo values</button>
              </div>
            </form>
          ) : null}
          {items.length > 0 ? (
            <section className="card" aria-labelledby="x-ar-checks">
              <div className="card-head"><h2 className="title" id="x-ar-checks">Checks in this area</h2><SyntheticTag /></div>
              <ul className="rows">
                {items.map(({ indicator: i, reading: r, assessment: a, due }) => (
                  <li key={i.id}>
                    <button className="row" onClick={() => go(r ? 'result' : 'reading', r ? r.id : i.id)}>
                      <span className="row-name">{r ? <span className="x-ar-done" aria-hidden="true">✓ </span> : null}{i.name}<br /><span className="caption">{r ? 'Logged today' : due ? 'Due today' : i.cadence === 'weekly' ? 'Weekly, not due today' : i.cadence === 'prompted' ? 'Taken when asked' : 'Not logged today'}</span></span>
                      <span className="row-val">{r ? <><span className="mono">{fmt(i, r.value)}</span> {i.unit}</> : null}</span>
                      {a ? <TierPill tier={a.tier} /> : null}
                      <span className="chev" aria-hidden="true">›</span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
          {symptoms.length > 0 ? (
            <section className="card" aria-labelledby="x-ar-sym">
              <div className="card-head"><h2 className="title" id="x-ar-sym">Symptoms to report</h2><SyntheticTag /></div>
              <div className="chips" role="group" aria-labelledby="x-ar-sym">
                {symptoms.map((o) => <button key={o} type="button" className="chip chip-toggle" aria-pressed={mine.some((x) => x.label === o)} onClick={() => commit(toggleSymptom(state, crewId, o, Date.now()))}>{o}</button>)}
              </div>
              {mine.some((x) => symptoms.includes(x.label)) ? <p aria-live="polite">Logged: {mine.filter((x) => symptoms.includes(x.label)).map((x) => `${x.label.toLowerCase()} at ${hhmm(x.at)}`).join(', ')}.</p> : null}
              <p className="caption">{say('Logged for you, and sent with any case you send. Most of these raise no alert yet: no rule is written for them. If you feel seriously unwell, tell your crew medic or press Emergency.', setting)}</p>
              <span className="placeholder">{seed.symptoms.status}</span>
            </section>
          ) : null}
        </div>
        <div className="stack">
          {area.records.map((id) => <RecordCard key={id} kind={recordKind(id)} state={state} commit={commit} crewId={crewId} hhmm={hhmm} />)}
          {area.records.length > 0 ? (
            <div className="card">
              <p>{status.note}</p>
              <span className="placeholder">{status.status}</span>
            </div>
          ) : null}
          <div className="quiet-links">
            {area.id === 'heart' && ultrasoundAvailable(setting) ? <button className="btn secondary" onClick={() => go('ultrasound', 'heart')}>Guided heart ultrasound</button> : null}
            {area.id === 'heart' || area.id === 'lungs' ? <button className="btn secondary" onClick={() => go('vitals')}>Vital signs</button> : null}
            {area.id === 'skin' || area.id === 'blood' ? <button className="btn secondary" onClick={() => go('immune')}>Infections and healing</button> : null}
            {area.id === 'blood' ? <button className="btn secondary" onClick={() => go('crew')}>Real crew blood data</button> : null}
            {area.id === 'mind' && seed.crewCheck ? <button className="btn secondary" onClick={() => go('crewcheck')}>Weekly crew check-in</button> : null}
            {area.id === 'gut' ? <button className="btn secondary" onClick={() => go('pathway', 'KS-01')}>Kidneys and urine</button> : null}
            <button className="btn secondary" onClick={() => go('home')}>Back to today</button>
          </div>
        </div>
      </div>
    </>
  );
}
