// App shell and the five demo screens.
// AI assistance: drafted with Claude Code (see AI_USE.md).
import { useEffect, useMemo, useState } from 'react';
import rulesText from '../rules/rules.yaml?raw';
import { BaselineChart, ChartLegend, type ChartPoint } from './components/BaselineChart';
import { BodyFigure } from './components/BodyFigure';
import { AlertCard, ReadingTile, SyntheticTag, TierPill, TIER_WORD } from './components/ui';
import demo from './data/demo.json';
import donki from './data/donki_sep.json';
import osd from './data/osd569_cbc.json';
import resources from './data/resources.json';
import { assess, parseRules, personalBand, tierFor, type Rule, type Tier } from './engine/rules';

interface Symptom { label: string; at: number }
const hhmm = (t: number) => new Date(t).toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit', hour12: false });

type Route = 'home' | 'reading' | 'result' | 'gap' | 'crew';
const ROUTES: Route[] = ['home', 'reading', 'result', 'gap', 'crew'];
const ind = demo.indicator;

function useRoute(): [Route, (r: Route) => void] {
  const read = (): Route => {
    const h = window.location.hash.replace(/^#\/?/, '') as Route;
    return ROUTES.includes(h) ? h : 'home';
  };
  const [route, setRoute] = useState<Route>(read);
  useEffect(() => {
    const on = () => { setRoute(read()); window.scrollTo(0, 0); };
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  return [route, (r) => { window.location.hash = `/${r === 'home' ? '' : r}`; }];
}

function store<T>(key: string, fallback: T): T {
  try {
    const v = window.localStorage.getItem(key);
    return v === null ? fallback : (JSON.parse(v) as T);
  } catch { return fallback; }
}
function save(key: string, v: unknown) {
  try { window.localStorage.setItem(key, JSON.stringify(v)); } catch { /* storage is optional */ }
}

function clock(totalSeconds: number): string {
  const s = Math.max(0, Math.ceil(totalSeconds));
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}
function minSec(s: number): string {
  return `${Math.floor(s / 60)} min ${s % 60} s`;
}
function decimals(values: number[]): number {
  return Math.min(2, Math.max(...values.map((v) => (String(v).split('.')[1] ?? '').length)));
}

export function App() {
  const [route, go] = useRoute();
  const [theme, setTheme] = useState<string>(() => store('theme', 'cabin'));
  const [value, setValue] = useState<number | null>(() => store<number | null>('reading', null));
  const [sentAt, setSentAt] = useState<number | null>(() => store<number | null>('sentAt', null));
  const [symptoms, setSymptoms] = useState<Symptom[]>(() => store<Symptom[]>('symptoms', []));
  const [doneSteps, setDoneSteps] = useState<string[]>(() => store<string[]>('doneSteps', []));
  const [doseLogged, setDoseLogged] = useState<boolean>(() => store('doseLogged', false));

  useEffect(() => { document.documentElement.dataset.theme = theme; save('theme', theme); }, [theme]);
  useEffect(() => { save('reading', value); }, [value]);
  useEffect(() => { save('sentAt', sentAt); }, [sentAt]);
  useEffect(() => { save('symptoms', symptoms); }, [symptoms]);
  useEffect(() => { save('doneSteps', doneSteps); }, [doneSteps]);
  useEffect(() => { save('doseLogged', doseLogged); }, [doseLogged]);
  const toggleSymptom = (label: string) => setSymptoms((cur) => (cur.some((x) => x.label === label) ? cur.filter((x) => x.label !== label) : [...cur, { label, at: Date.now() }]));
  const toggleStep = (step: string) => setDoneSteps((cur) => (cur.includes(step) ? cur.filter((x) => x !== step) : [...cur, step]));

  const loaded = useMemo<{ rule?: Rule; error?: string }>(() => {
    try { return { rule: parseRules(rulesText)[0] }; } catch (e) { return { error: (e as Error).message }; }
  }, []);

  const baseline = ind.baseline.map((b) => b.value);
  const result = loaded.rule && value !== null
    ? assess(loaded.rule, { region: ind.region, indicator: ind.name, unit: ind.unit, value, baseline, refMin: ind.refMin, refMax: ind.refMax })
    : null;

  const reset = () => { setValue(null); setSentAt(null); setSymptoms([]); setDoneSteps([]); setDoseLogged(false); go('home'); };

  return (
    <div className="app">
      <header className="top">
        <button className="brand" onClick={() => go('home')}>Crew health check</button>
        <nav className="nav" aria-label="Main">
          <button aria-current={route !== 'crew' ? 'page' : undefined} onClick={() => go('home')}>My health</button>
          <button aria-current={route === 'crew' ? 'page' : undefined} onClick={() => go('crew')}>Real crew data</button>
        </nav>
        <button className="ghost" onClick={() => setTheme(theme === 'cabin' ? 'day' : 'cabin')}>{theme === 'cabin' ? 'Day theme' : 'Cabin theme'}</button>
      </header>

      <main className="stack">
        {loaded.error ? (
          <div className="error" role="alert">
            <h2 className="title">Rules file refused</h2>
            <p>{loaded.error}</p>
            <p className="caption">The app will not assess readings until the rules file is fixed.</p>
          </div>
        ) : route === 'crew' ? (
          <CrewData rule={loaded.rule!} />
        ) : route === 'reading' ? (
          <Reading initial={value} onSave={(v) => { setValue(v); setSentAt(null); setDoneSteps([]); go('result'); }} onBack={() => go('home')} />
        ) : route === 'result' && result ? (
          <Result value={value!} result={result} onSend={() => { setSentAt(Date.now()); go('gap'); }} onDone={() => go('home')} onAgain={() => go('reading')} />
        ) : route === 'gap' && result && sentAt ? (
          <Gap value={value!} result={result} sentAt={sentAt} symptoms={symptoms} doneSteps={doneSteps} onToggleStep={toggleStep} onBack={() => go('result')} onDone={() => go('home')} />
        ) : (
          <Home value={value} tier={result?.tier} deltaText={result?.deltaText} onOpen={() => go('reading')} onResult={() => go('result')} onCrew={() => go('crew')} onReset={reset} symptoms={symptoms} onSymptom={toggleSymptom} doseLogged={doseLogged} onDose={() => setDoseLogged(!doseLogged)} />
        )}
      </main>

      <footer className="foot">
        <span>Assessment and next steps only. Not a diagnosis. Hackathon prototype; rules are placeholders until our clinicians sign them off.</span>
        <span>{osd.credit} (real crew data, pre-flight and post-flight). Demo astronaut values are SYNTHETIC. NASA does not endorse this project.</span>
        <span>Caffeinated Innovators Australia · NASA Space Apps Challenge 2026 · <a href="https://github.com/Caffeinated-Innovators-Australia/space-apps-2026">Source and references</a></span>
      </footer>
    </div>
  );
}

function Context() {
  return (
    <div className="context">
      <span className="kicker">{demo.astronaut} · {demo.location} · Mission day {demo.missionDay}</span>
      <SyntheticTag />
    </div>
  );
}

function Home({ value, tier, deltaText, onOpen, onResult, onCrew, onReset, symptoms, onSymptom, doseLogged, onDose }: { value: number | null; tier?: Tier; deltaText?: string; onOpen: () => void; onResult: () => void; onCrew: () => void; onReset: () => void; symptoms: Symptom[]; onSymptom: (label: string) => void; doseLogged: boolean; onDose: () => void }) {
  const last = ind.mission[ind.mission.length - 1];
  return (
    <>
      <Context />
      <h1 className="display">Which part of you are we checking today?</h1>
      <div className="grid">
        <div className="card">
          <BodyFigure onOpen={onOpen} tier={tier} />
        </div>
        <div className="stack">
          <div className="card">
            <div className="card-head">
              <h2 className="title">{ind.region}: {ind.name.toLowerCase()}</h2>
              <SyntheticTag />
            </div>
            {value !== null && tier ? (
              <ReadingTile label="Today's reading" value={value.toFixed(1)} unit={ind.unit} delta={deltaText} tier={tier} />
            ) : (
              <ReadingTile label={`Last reading, ${last.t.toLowerCase()}`} value={last.value.toFixed(1)} unit={ind.unit} />
            )}
            <div className="btn-row">
              <button className="btn" onClick={onOpen}>{value !== null ? 'Take another reading' : 'Take a reading'}</button>
              {value !== null ? <button className="btn secondary" onClick={onResult}>See result</button> : null}
            </div>
            {value !== null || symptoms.length > 0 || doseLogged ? <button className="link" onClick={onReset}>Reset the demo</button> : null}
          </div>
          <div className="card">
            <div className="card-head">
              <h2 className="title">Feeling off? Tell us in one tap</h2>
              <SyntheticTag />
            </div>
            <div className="chips" role="group" aria-label="How you feel">
              {demo.symptoms.options.map((o) => (
                <button key={o} className="chip chip-toggle" aria-pressed={symptoms.some((x) => x.label === o)} onClick={() => onSymptom(o)}>{o}</button>
              ))}
            </div>
            {symptoms.length > 0 ? (
              <p aria-live="polite">Logged: {symptoms.map((x) => `${x.label.toLowerCase()} at ${hhmm(x.at)}`).join(', ')}. This goes in your next case to Earth.</p>
            ) : (
              <p className="muted">Nothing logged today. One tap is enough.</p>
            )}
            <span className="placeholder">{demo.symptoms.status}</span>
          </div>
          <SpaceWeather doseLogged={doseLogged} onDose={onDose} />
          <div className="card">
            <h2 className="title">The same rule, on real crew data</h2>
            <p className="muted">See four real crew members' blood counts measured against their own pre-flight baselines.</p>
            <p className="caption">{osd.credit}</p>
            <div><button className="btn secondary" onClick={onCrew}>Open real crew data</button></div>
          </div>
        </div>
      </div>
    </>
  );
}

function Reading({ initial, onSave, onBack }: { initial: number | null; onSave: (v: number) => void; onBack: () => void }) {
  const [text, setText] = useState(initial !== null ? String(initial) : '');
  const n = Number(text);
  const valid = text.trim() !== '' && Number.isFinite(n) && n > 0 && n < 30;
  return (
    <>
      <Context />
      <h1 className="display">{ind.region}: {ind.name.toLowerCase()}</h1>
      <div className="grid">
        <form className="card" onSubmit={(e) => { e.preventDefault(); if (valid) onSave(Math.round(n * 10) / 10); }}>
          <label className="title" htmlFor="reading">Enter your reading</label>
          <div className="field">
            <input id="reading" inputMode="decimal" autoComplete="off" autoFocus value={text} onChange={(e) => setText(e.target.value)} placeholder="0.0" aria-describedby="reading-unit" />
            <span className="unit" id="reading-unit">{ind.unit}</span>
          </div>
          {text.trim() !== '' && !valid ? <p className="caption" role="alert">Enter a number between 0 and 30 {ind.unit}.</p> : null}
          <div className="chips">
            <SyntheticTag />
            <span className="caption">Demo values:</span>
            {ind.demoValues.map((v) => (
              <button type="button" className="chip" key={v} onClick={() => setText(v.toFixed(1))}>{v.toFixed(1)}</button>
            ))}
          </div>
          <div className="btn-row">
            <button className="btn" type="submit" disabled={!valid}>Check against my baseline</button>
            <button className="btn secondary" type="button" onClick={onBack}>Back</button>
          </div>
        </form>
        <div className="stack">
          <div className="card">
            <span className="why-label">Why this check?</span>
            <p>{ind.whyCheck}</p>
            <span className="why-label">How is it measured in flight?</span>
            <p>{ind.howMeasured}</p>
            <span className="why-label">Background from NASA and partner agencies</span>
            <ul className="links">
              {resources.map((r) => <li key={r.url}><a href={r.url} target="_blank" rel="noreferrer">{r.agency}: {r.title}</a></li>)}
            </ul>
          </div>
          <div className="card">
            <span className="why-label">Your baseline</span>
            <p>Before launch you measured {ind.baseline.map((b) => b.value.toFixed(1)).join(', ')} {ind.unit}. Every reading is compared with your own numbers, not only with a population range.</p>
          </div>
        </div>
      </div>
    </>
  );
}

function Result({ value, result, onSend, onDone, onAgain }: { value: number; result: ReturnType<typeof assess>; onSend: () => void; onDone: () => void; onAgain: () => void }) {
  const band = result.band;
  const points: ChartPoint[] = [
    ...ind.baseline.map((b) => ({ label: b.t, value: b.value, kind: 'baseline' as const })),
    ...ind.mission.map((m) => ({ label: m.t, value: m.value, kind: 'reading' as const, tier: tierFor(m.value, band, ind.refMin, ind.refMax) })),
    { label: 'Today', value, kind: 'reading' as const, tier: result.tier, highlight: true },
  ];
  return (
    <>
      <Context />
      <div className="grid wide-left">
        <div className="stack">
          <ReadingTile label={`${ind.name}, today`} value={value.toFixed(1)} unit={ind.unit} delta={result.deltaText} />
          <div className="card">
            <div className="card-head">
              <h2 className="title">Against your own baseline</h2>
              <SyntheticTag />
            </div>
            <BaselineChart points={points} band={band} refMin={ind.refMin} refMax={ind.refMax} unit={ind.unit} title={`${ind.name} over time against your pre-flight baseline. Today: ${value.toFixed(1)} ${ind.unit}, ${TIER_WORD[result.tier]}.`} />
            <ChartLegend />
            <p className="caption">{ind.refSource}.</p>
          </div>
        </div>
        <AlertCard a={result} synthetic>
          <div className="btn-row">
            {result.tier === 'green' ? (
              <button className="btn" onClick={onDone}>Log and finish</button>
            ) : (
              <button className="btn" onClick={onSend}>Send case to Earth</button>
            )}
            <button className="btn secondary" onClick={onAgain}>Repeat the reading</button>
          </div>
        </AlertCard>
      </div>
    </>
  );
}

function Gap({ value, result, sentAt, symptoms, doneSteps, onToggleStep, onBack, onDone }: { value: number; result: ReturnType<typeof assess>; sentAt: number; symptoms: Symptom[]; doneSteps: string[]; onToggleStep: (s: string) => void; onBack: () => void; onDone: () => void }) {
  const total = demo.delay.oneWaySeconds * 2;
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(id);
  }, []);
  const left = total - (now - sentAt) / 1000;
  const meanwhile = result.steps.filter((st) => !/send the case/i.test(st));
  return (
    <>
      <Context />
      <div className="grid">
        <section className="gap" aria-label="Time until a reply from Earth can arrive">
          <span className="kicker">{left > 0 ? 'Earth reply possible in' : 'Earth reply possible now'}</span>
          <div className="gap-clock" role="timer">{clock(left)}</div>
          <p>{demo.location} · one-way delay {minSec(demo.delay.oneWaySeconds)}</p>
          <p className="caption">Your case takes {minSec(demo.delay.oneWaySeconds)} to reach Earth, and the reply takes the same to come back. {demo.delay.basis}</p>
          <SyntheticTag />
        </section>
        <div className="stack">
          <div className="card">
            <div className="card-head">
              <span className="why-label">Meanwhile</span>
              <TierPill tier={result.tier} />
            </div>
            <ul className="checks">
              {meanwhile.map((st) => (
                <li key={st}>
                  <button className="check" role="checkbox" aria-checked={doneSteps.includes(st)} onClick={() => onToggleStep(st)}>
                    <span className="box" aria-hidden="true">{doneSteps.includes(st) ? '\u2713' : ''}</span>
                    <span>{st}</span>
                  </button>
                </li>
              ))}
            </ul>
            <p className="caption">Tick each step as you do it. Earth sees what you have done.</p>
            <span className="placeholder">Placeholder steps, awaiting clinician review</span>
          </div>
          <div className="card">
            <div className="card-head">
              <h2 className="title">Case pack sent to Earth</h2>
              <SyntheticTag />
            </div>
            <dl className="pack">
              <dt>Reading</dt><dd>{ind.name} {value.toFixed(1)} {ind.unit} ({result.deltaText})</dd>
              <dt>Trend</dt><dd>Baseline {ind.baseline.map((b) => b.value.toFixed(1)).join(', ')}; this mission {ind.mission.map((m) => m.value.toFixed(1)).join(', ')}, {value.toFixed(1)} {ind.unit}</dd>
              <dt>Assessment</dt><dd>{TIER_WORD[result.tier]}. Rule {result.ruleId}. {result.source}</dd>
              <dt>Done so far</dt><dd>{doneSteps.length > 0 ? doneSteps.join(' ') : 'Nothing ticked yet.'}</dd>
              <dt>How you feel</dt><dd>{symptoms.length > 0 ? symptoms.map((x) => `${x.label} (${hhmm(x.at)})`).join(', ') : 'Nothing logged today.'}</dd>
            </dl>
            <p className="caption">Sent at {hhmm(sentAt)}. Anything you tick or log later goes with the next link to Earth.</p>
            <div className="btn-row">
              <button className="btn secondary" onClick={onBack}>Back to result</button>
              <button className="btn secondary" onClick={onDone}>Home</button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function CrewData({ rule }: { rule: Rule }) {
  const subjects = [...new Set(osd.series.map((s) => s.subject))];
  const analytes = [...new Set(osd.series.map((s) => s.analyte))];
  const [subject, setSubject] = useState(subjects[1] ?? subjects[0]);
  const [analyte, setAnalyte] = useState('Haemoglobin');
  const s = osd.series.find((x) => x.subject === subject && x.analyte === analyte)!;
  const pre = s.points.filter((p) => p.phase === 'pre-flight');
  const post = s.points.filter((p) => p.phase === 'post-flight');
  const dp = decimals(s.points.map((p) => p.value));
  const band = personalBand(pre.map((p) => p.value), rule.band.margin_percent);
  const tiers = post.map((p) => tierFor(p.value, band, s.refMin, s.refMax));
  const points: ChartPoint[] = [
    ...pre.map((p) => ({ label: p.t, value: p.value, kind: 'baseline' as const })),
    ...post.map((p, i) => ({ label: p.t, value: p.value, kind: 'reading' as const, tier: tiers[i] })),
  ];
  const count = (t: Tier) => tiers.filter((x) => x === t).length;
  const preOutside = pre.filter((p) => p.value < s.refMin || p.value > s.refMax).length;
  const unit = s.unit.replace('uL', 'µL');
  return (
    <>
      <div className="context">
        <span className="kicker">Real crew data · Inspiration4 · pre-flight and post-flight</span>
      </div>
      <h1 className="display">The same rule, on real crew data</h1>
      <p className="muted">Four crew members had blood taken three times before launch and four times after return. We build each person's own range from their pre-flight draws, then check every later draw against it. There are no in-flight draws in this dataset.</p>
      <div className="card">
        <div className="btn-row">
          <div className="seg" role="group" aria-label="Crew member">
            {subjects.map((x) => <button key={x} aria-pressed={x === subject} onClick={() => setSubject(x)}>Crew {x.replace('C00', '')}</button>)}
          </div>
          <div className="seg" role="group" aria-label="Blood measure">
            {analytes.map((x) => <button key={x} aria-pressed={x === analyte} onClick={() => setAnalyte(x)}>{x}</button>)}
          </div>
        </div>
        <BaselineChart points={points} band={band} refMin={s.refMin} refMax={s.refMax} unit={unit} dp={dp} title={`${analyte} for crew ${subject}: pre-flight baseline and post-flight draws.`} baselineLabel="Before launch (their baseline)" />
        <ChartLegend />
        <p>
          Own pre-flight range: {band.low.toFixed(dp)} to {band.high.toFixed(dp)} {unit}. Laboratory reference range: {s.refMin} to {s.refMax} {unit}.
          {preOutside > 0 ? ` ${preOutside} of this person's ${pre.length} pre-flight draws sat outside the laboratory range. A population range alone would flag a value that is usual for this person.` : ''}
        </p>
        <div className="legend">
          <span>After return, {post.length} draws:</span>
          {(['green', 'amber', 'red'] as Tier[]).filter((t) => count(t) > 0).map((t) => (
            <span key={t}><TierPill tier={t} /> {count(t)}</span>
          ))}
        </div>
        <span className="placeholder">Placeholder rule, awaiting clinician review. Not a clinical assessment of these crew members.</span>
        <p className="caption">
          {osd.credit}. {osd.source}. <a style={{ color: 'var(--advisory)' }} href={osd.link}>{osd.link}</a>
        </p>
      </div>
    </>
  );
}

function SpaceWeather({ doseLogged, onDose }: { doseLogged: boolean; onDose: () => void }) {
  const latest = donki.events[0];
  const same = donki.events.filter((e) => e.time === latest.time);
  const when = new Date(latest.time).toLocaleString('en-AU', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'UTC' });
  return (
    <div className="card">
      <h2 className="title">Space weather: radiation check</h2>
      <p>
        Latest solar particle event on record: <strong>{when} UTC</strong>. {donki.eventDaysInPeriod} days with events in the past {donki.periodDays} days.
      </p>
      <p className="caption">Recorded near Earth by: {same.map((e) => e.instruments.join(', ')).join('; ')}. Real events, bundled on {donki.fetched}.</p>
      <button className="check" role="checkbox" aria-checked={doseLogged} onClick={onDose}>
        <span className="box" aria-hidden="true">{doseLogged ? '\u2713' : ''}</span>
        <span>{demo.radiationPrompt.step}</span>
      </button>
      <span className="placeholder">{demo.radiationPrompt.status}</span>
      <p className="caption">
        {donki.credit}. {donki.source}. <a href={donki.link}>{donki.link}</a>
      </p>
    </div>
  );
}
