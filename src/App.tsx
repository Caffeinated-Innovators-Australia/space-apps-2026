// App shell and screens. Every change to the record goes through the action layer in src/core.
// AI assistance: drafted with Claude Code (see AI_USE.md).
import { useEffect, useMemo, useState } from 'react';
import rulesText from '../rules/rules.yaml?raw';
import { BaselineChart, ChartLegend, type ChartPoint } from './components/BaselineChart';
import { BodyFigure } from './components/BodyFigure';
import { AlertCard, ReadingTile, SyntheticTag, TierPill, TIER_WORD, TierWords } from './components/ui';
import {
  assessValue, casePackContent, crewById, demoValues, exportOutbox, history, indicatorById, initialState, latestReading, parseRules,
  recordReading, sendCase, settingById, tierFor, toggleStep, toggleSymptom,
  type Assessment, type Indicator, type Reading as SavedReading, type Rule, type Seed, type Setting, type State, type Tier,
} from './core/index.ts';
import osd from './data/osd569_cbc.json';
import resources from './data/resources.json';
import seedJson from './data/seed.json';
import { CrewData, SpaceWeather } from './screens/RealData';
import { deviceStore } from './store/indexeddb.ts';

interface Extras { problem: Record<'space' | 'earth', { text: string; source: string; link: string }>; settingStatus: string; earthBenefit: { figure: string; text: string; source: string; link: string } }
const seed = seedJson as unknown as Seed & Extras;
const store = deviceStore();
const REPO = 'https://github.com/Caffeinated-Innovators-Australia/space-apps-2026';
const RANK: Record<Tier, number> = { green: 0, amber: 1, red: 2 };

const hhmm = (t: number) => new Date(t).toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit', hour12: false });
/** Swap setting-specific words (for example "Earth" becomes "the on-call doctor" in remote Australia). */
function say(text: string, s: Setting): string {
  let out = text;
  for (const [from, to] of Object.entries(s.words ?? {})) out = out.split(from).join(to);
  return out;
}
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
function clock(totalSeconds: number): string {
  const s = Math.max(0, Math.ceil(totalSeconds));
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

interface Route { name: 'home' | 'reading' | 'result' | 'gap' | 'crew' | 'outbox' | 'about'; arg?: string }
function readRoute(): Route {
  const [name, arg] = window.location.hash.replace(/^#\/?/, '').split('/');
  const ok = ['reading', 'result', 'gap', 'crew', 'outbox', 'about'].includes(name);
  return ok ? { name: name as Route['name'], arg } : { name: 'home' };
}
function go(name: Route['name'], arg?: string) {
  window.location.hash = name === 'home' ? '/' : `/${name}${arg ? `/${arg}` : ''}`;
}

export function App() {
  const [route, setRoute] = useState<Route>(readRoute);
  const [state, setState] = useState<State | null>(null);
  useEffect(() => {
    const on = () => { setRoute(readRoute()); window.scrollTo(0, 0); };
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  useEffect(() => { void store.load().then((s) => setState(s && s.version === 1 ? s : initialState(seed))); }, []);
  useEffect(() => { if (state) document.documentElement.dataset.theme = state.ui.theme; }, [state]);

  const loaded = useMemo<{ rule?: Rule; error?: string }>(() => {
    try { return { rule: parseRules(rulesText)[0] }; } catch (e) { return { error: (e as Error).message }; }
  }, []);

  if (!state) return <div className="app"><p className="muted">Opening the record on this device…</p></div>;
  const commit = (next: State) => { setState(next); void store.save(next); };
  const ui = (patch: Partial<State['ui']>) => commit({ ...state, ui: { ...state.ui, ...patch } });
  const setting = settingById(seed, state.ui.settingId);
  const crew = crewById(seed, seed.crew.some((c) => c.id === state.ui.crewId) ? state.ui.crewId : seed.crew[0].id);
  const tierWords = { ...TIER_WORD, ...(setting.tierWords ?? {}) };
  const queued = state.outbox.filter((p) => p.status === 'queued').length;
  const rule = loaded.rule;
  const reading = route.arg ? state.readings.find((r) => r.id === route.arg) : undefined;
  const shared = { state, commit, ui, setting, crewId: crew.id };

  return (
    <TierWords.Provider value={tierWords}>
      <div className="app">
        <header className="top">
          <button className="brand" onClick={() => go('home')}>Crew health check</button>
          <nav className="nav" aria-label="Main">
            <button aria-current={['home', 'reading', 'result', 'gap'].includes(route.name) ? 'page' : undefined} onClick={() => go('home')}>My health</button>
            <button aria-current={route.name === 'crew' ? 'page' : undefined} onClick={() => go('crew')}>Real crew data</button>
            <button aria-current={route.name === 'outbox' ? 'page' : undefined} onClick={() => go('outbox')}>Outbox{queued ? ` (${queued})` : ''}</button>
            <button aria-current={route.name === 'about' ? 'page' : undefined} onClick={() => go('about')}>Road to flight</button>
          </nav>
          <button className="ghost" onClick={() => ui({ theme: state.ui.theme === 'cabin' ? 'day' : 'cabin' })}>{state.ui.theme === 'cabin' ? 'Day theme' : 'Cabin theme'}</button>
        </header>

        <main className="stack">
          {!rule ? (
            <div className="error" role="alert">
              <h2 className="title">Rules file refused</h2>
              <p>{loaded.error}</p>
              <p className="caption">The app will not assess readings until the rules file is fixed.</p>
            </div>
          ) : route.name === 'crew' ? (
            <CrewData rule={rule} />
          ) : route.name === 'outbox' ? (
            <Outbox {...shared} rule={rule} />
          ) : route.name === 'about' ? (
            <About />
          ) : route.name === 'reading' ? (
            <ReadingScreen {...shared} rule={rule} indicatorId={seed.indicators.some((i) => i.id === route.arg) ? route.arg! : seed.indicators[0].id} />
          ) : route.name === 'result' && reading ? (
            <Result {...shared} rule={rule} reading={reading} />
          ) : route.name === 'gap' && reading ? (
            <Gap {...shared} rule={rule} reading={reading} />
          ) : (
            <Home {...shared} rule={rule} />
          )}
        </main>

        <footer className="foot">
          <span>Assessment and next steps only. Not a diagnosis. Hackathon prototype; rules are placeholders until our clinicians sign them off.</span>
          <span>{osd.credit} (real crew data, pre-flight and post-flight). Demo crew values are SYNTHETIC. NASA does not endorse this project.</span>
          <span>Readings stay on this device. Caffeinated Innovators Australia · NASA Space Apps Challenge 2026 · <a href={REPO}>Source and references</a> · <a href="agents.md">For AI agents</a></span>
        </footer>
      </div>
    </TierWords.Provider>
  );
}

interface Shared { state: State; commit: (s: State) => void; ui: (p: Partial<State['ui']>) => void; setting: Setting; crewId: string }

function Context({ setting, crewId }: { setting: Setting; crewId: string }) {
  return (
    <div className="context">
      <span className="kicker">{crewById(seed, crewId).name} · {setting.kicker}</span>
      <SyntheticTag />
    </div>
  );
}

function Where({ setting, onPick }: { setting: Setting; onPick: (id: string) => void }) {
  return (
    <div className="where">
      <span className="caption">Where are you?</span>
      <div className="seg" role="group" aria-label="Where are you?">
        {seed.settings.map((c) => <button key={c.id} aria-pressed={c.id === setting.id} onClick={() => onPick(c.id)}>{c.label}</button>)}
      </div>
    </div>
  );
}

function Home({ state, commit, ui, setting, crewId, rule }: Shared & { rule: Rule }) {
  const mine = state.symptoms.filter((s) => s.crewId === crewId);
  const latest = seed.indicators.map((i) => ({ i, r: latestReading(state, crewId, i.id) }));
  const worst = latest.reduce<Tier | undefined>((w, x) => (x.r && (!w || RANK[x.r.tier] > RANK[w]) ? x.r.tier : w), undefined);
  const queued = state.outbox.filter((p) => p.status === 'queued').length;
  const used = state.readings.length > 0 || state.symptoms.length > 0 || state.ui.doseLogged;
  void rule;
  return (
    <>
      <Context setting={setting} crewId={crewId} />
      <h1 className="display">Which part of you are we checking today?</h1>
      <div className="where-row">
        <div className="where">
          <span className="caption">Who are you?</span>
          <div className="seg" role="group" aria-label="Who are you?">
            {seed.crew.map((c) => <button key={c.id} aria-pressed={c.id === crewId} onClick={() => ui({ crewId: c.id })}>{c.name.replace('Crew member', 'Crew')}</button>)}
          </div>
        </div>
        <Where setting={setting} onPick={(id) => ui({ settingId: id })} />
      </div>
      <div className="grid">
        <div className="card">
          <BodyFigure onOpen={() => go('reading', seed.indicators[0].id)} tier={worst} />
        </div>
        <div className="stack">
          <div className="card">
            <div className="card-head">
              <h2 className="title">Blood</h2>
              <SyntheticTag />
            </div>
            <ul className="rows">
              {latest.map(({ i, r }) => {
                const last = crewById(seed, crewId).mission[i.id]?.slice(-1)[0];
                return (
                  <li key={i.id}>
                    <button className="row" onClick={() => go(r ? 'result' : 'reading', r ? r.id : i.id)}>
                      <span className="row-name">{i.name}</span>
                      <span className="row-val"><span className="mono">{(r ? r.value : last?.value ?? 0).toFixed(i.dp)}</span> {i.unit}</span>
                      {r ? <TierPill tier={r.tier} /> : <span className="caption">{last ? last.t : ''}</span>}
                      <span className="chev" aria-hidden="true">›</span>
                    </button>
                  </li>
                );
              })}
            </ul>
            <div className="btn-row">
              <button className="btn" onClick={() => go('reading', seed.indicators[0].id)}>Take a reading</button>
              {queued ? <button className="btn secondary" onClick={() => go('outbox')}>Outbox ({queued})</button> : null}
            </div>
            {used ? <button className="link" onClick={() => { commit({ ...initialState(seed), ui: { ...state.ui, doseLogged: false } }); }}>Reset the demo</button> : null}
          </div>
          <div className="card">
            <div className="card-head">
              <h2 className="title">Feeling off? Tell us in one tap</h2>
              <SyntheticTag />
            </div>
            <div className="chips" role="group" aria-label="How you feel">
              {seed.symptoms.options.map((o) => (
                <button key={o} className="chip chip-toggle" aria-pressed={mine.some((x) => x.label === o)} onClick={() => commit(toggleSymptom(state, crewId, o, Date.now()))}>{o}</button>
              ))}
            </div>
            {mine.length > 0 ? (
              <p aria-live="polite">Logged: {mine.map((x) => `${x.label.toLowerCase()} at ${hhmm(x.at)}`).join(', ')}. {say('This goes in your next case to Earth.', setting)}</p>
            ) : (
              <p className="muted">Nothing logged today. One tap is enough.</p>
            )}
            <span className="placeholder">{seed.symptoms.status}</span>
          </div>
          {setting.id === 'earth' ? null : <SpaceWeather doseLogged={state.ui.doseLogged} onDose={() => ui({ doseLogged: !state.ui.doseLogged })} />}
          <div className="card">
            <h2 className="title">The same problem, back on Earth</h2>
            <p><span className="num stat">{seed.earthBenefit.figure}</span> {seed.earthBenefit.text}</p>
            <p className="muted">A crew far from Earth and a family hours from a hospital need the same thing: care that starts before the expert arrives.</p>
            <p className="caption">Source: <a href={seed.earthBenefit.link}>{seed.earthBenefit.source}</a>.</p>
            <div><button className="btn secondary" onClick={() => ui({ settingId: setting.id === 'earth' ? 'mars-far' : 'earth' })}>{setting.id === 'earth' ? 'Back to Mars' : 'See it in remote Australia'}</button></div>
          </div>
          <div className="card">
            <h2 className="title">The same rule, on real crew data</h2>
            <p className="muted">See four real crew members' blood counts measured against their own pre-flight baselines.</p>
            <p className="caption">{osd.credit}</p>
            <div><button className="btn secondary" onClick={() => go('crew')}>Open real crew data</button></div>
          </div>
        </div>
      </div>
    </>
  );
}

function ReadingScreen({ state, commit, setting, crewId, rule, indicatorId }: Shared & { rule: Rule; indicatorId: string }) {
  const ind = indicatorById(seed, indicatorId);
  const crew = crewById(seed, crewId);
  const [text, setText] = useState('');
  useEffect(() => setText(''), [indicatorId, crewId]);
  const n = Number(text);
  const max = ind.ref[crew.sex].max * 3;
  const valid = text.trim() !== '' && Number.isFinite(n) && n > 0 && n < max;
  const submit = () => {
    if (!valid) return;
    const r = recordReading(state, seed, rule, { crewId, indicatorId, value: Number(n.toFixed(ind.dp)), at: Date.now() });
    commit(r.state);
    go('result', r.reading.id);
  };
  return (
    <>
      <Context setting={setting} crewId={crewId} />
      <h1 className="display">{ind.region}: {ind.name.toLowerCase()}</h1>
      <div className="seg" role="group" aria-label="Which blood measure">
        {seed.indicators.map((i) => <button key={i.id} aria-pressed={i.id === ind.id} onClick={() => go('reading', i.id)}>{i.name}</button>)}
      </div>
      <div className="grid">
        <form className="card" onSubmit={(e) => { e.preventDefault(); submit(); }}>
          <label className="title" htmlFor="reading">Enter your reading</label>
          <div className="field">
            <input id="reading" inputMode="decimal" autoComplete="off" autoFocus value={text} onChange={(e) => setText(e.target.value)} placeholder={(0).toFixed(ind.dp)} aria-describedby="reading-unit" />
            <span className="unit" id="reading-unit">{ind.unit}</span>
          </div>
          {text.trim() !== '' && !valid ? <p className="caption" role="alert">Enter a number between 0 and {max.toFixed(0)} {ind.unit}.</p> : null}
          <div className="chips">
            <SyntheticTag />
            <span className="caption">Demo values:</span>
            {demoValues(seed, rule, crewId, ind.id).map((v) => (
              <button type="button" className="chip" key={v} onClick={() => setText(v.toFixed(ind.dp))}>{v.toFixed(ind.dp)}</button>
            ))}
          </div>
          <div className="btn-row">
            <button className="btn" type="submit" disabled={!valid}>Check against my baseline</button>
            <button className="btn secondary" type="button" onClick={() => go('home')}>Back</button>
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
            <p>{say('Before launch', setting)} you measured {(crew.baseline[ind.id] ?? []).map((b) => b.value.toFixed(ind.dp)).join(', ')} {ind.unit}. Every reading is compared with your own numbers, not only with a population range.</p>
          </div>
        </div>
      </div>
    </>
  );
}

function localise(a: Assessment, s: Setting): Assessment {
  return { ...a, why: say(a.why, s), title: say(a.title, s), steps: a.steps.map((x) => cap(say(x, s))) };
}

function trendPoints(state: State, r: SavedReading, ind: Indicator, a: Assessment, ref: { min: number; max: number }): ChartPoint[] {
  const h = history(state, seed, r.crewId, r.indicatorId);
  const earlier = h.recorded.filter((x) => x.at < r.at).slice(-2);
  return [
    ...h.baseline.map((b) => ({ label: b.t, value: b.value, kind: 'baseline' as const })),
    ...h.mission.slice(earlier.length ? -(4 - earlier.length) : -4).map((m) => ({ label: m.t, value: m.value, kind: 'reading' as const, tier: tierFor(m.value, a.band, ref.min, ref.max) })),
    ...earlier.map((x) => ({ label: hhmm(x.at), value: x.value, kind: 'reading' as const, tier: x.tier })),
    { label: 'Today', value: r.value, kind: 'reading' as const, tier: a.tier, highlight: true },
  ].map((p) => ({ ...p, value: Number(p.value.toFixed(ind.dp)) }));
}

function Result({ state, commit, setting, rule, reading }: Shared & { rule: Rule; reading: SavedReading }) {
  const ind = indicatorById(seed, reading.indicatorId);
  const ref = ind.ref[crewById(seed, reading.crewId).sex];
  const raw = assessValue(seed, rule, reading.crewId, reading.indicatorId, reading.value);
  const a = localise(raw, setting);
  const sent = state.outbox.some((p) => p.readingId === reading.id);
  const send = () => { commit(sendCase(state, { readingId: reading.id, settingId: setting.id, at: Date.now() }).state); go('gap', reading.id); };
  return (
    <>
      <Context setting={setting} crewId={reading.crewId} />
      <div className="grid wide-left">
        <div className="stack">
          <ReadingTile label={`${ind.name}, ${hhmm(reading.at)}`} value={reading.value.toFixed(ind.dp)} unit={ind.unit} delta={a.deltaText} />
          <div className="card">
            <div className="card-head">
              <h2 className="title">Against your own baseline</h2>
              <SyntheticTag />
            </div>
            <BaselineChart points={trendPoints(state, reading, ind, raw, ref)} band={raw.band} refMin={ref.min} refMax={ref.max} unit={ind.unit} dp={ind.dp} baselineLabel={`${say('Before launch', setting)} (your baseline)`} readingLabel={say('This mission', setting)} title={`${ind.name} over time against your own baseline. Today: ${reading.value.toFixed(ind.dp)} ${ind.unit}.`} />
            <ChartLegend bandLabel={say('Own pre-flight range', setting)} />
            <p className="caption">{ind.refSource}.</p>
          </div>
        </div>
        <AlertCard a={a} synthetic>
          <div className="btn-row">
            {a.tier === 'green' ? (
              <button className="btn" onClick={() => go('home')}>Log and finish</button>
            ) : (
              <button className="btn" onClick={send}>{sent ? 'Open the case' : say('Send case to Earth', setting)}</button>
            )}
            <button className="btn secondary" onClick={() => go('reading', ind.id)}>Repeat the reading</button>
          </div>
        </AlertCard>
      </div>
    </>
  );
}

function Gap({ state, commit, ui, setting, rule, reading }: Shared & { rule: Rule; reading: SavedReading }) {
  const pack = state.outbox.find((p) => p.readingId === reading.id);
  const [startAt, setStartAt] = useState(pack?.createdAt ?? Date.now());
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(id);
  }, []);
  if (!pack) return <Result state={state} commit={commit} ui={ui} setting={setting} crewId={reading.crewId} rule={rule} reading={reading} />;
  const ind = indicatorById(seed, reading.indicatorId);
  const raw = assessValue(seed, rule, reading.crewId, reading.indicatorId, reading.value);
  const content = casePackContent(state, seed, rule, pack.id);
  const left = setting.replySeconds - (now - startAt) / 1000;
  const meanwhile = raw.steps.filter((st) => !/send the case/i.test(st));
  const problem = seed.problem[setting.id === 'earth' ? 'earth' : 'space'];
  return (
    <>
      <Context setting={setting} crewId={reading.crewId} />
      <div className="grid">
        <section className="gap" aria-label="Time until help can answer">
          <Where setting={setting} onPick={(id) => { ui({ settingId: id }); setStartAt(Date.now()); }} />
          <span className="kicker">{left > 0 ? setting.gapLabel : setting.nowLabel}</span>
          <div className="gap-clock" role="timer">{clock(left)}</div>
          <p>{setting.detail}</p>
          <p className="gap-advice">{setting.advice}</p>
          <p className="caption">{setting.basis}</p>
          {setting.scenarioSynthetic ? <SyntheticTag /> : null}
          <p className="gap-problem">{problem.text} <span className="caption">Source: <a href={problem.link}>{problem.source}</a>.</span></p>
          <span className="placeholder">{seed.settingStatus}</span>
        </section>
        <div className="stack">
          <div className="card">
            <div className="card-head">
              <span className="why-label">Meanwhile</span>
              <TierPill tier={raw.tier} />
            </div>
            <ul className="checks">
              {meanwhile.map((st) => (
                <li key={st}>
                  <button className="check" role="checkbox" aria-checked={reading.stepsDone.includes(st)} onClick={() => commit(toggleStep(state, reading.id, st))}>
                    <span className="box" aria-hidden="true">{reading.stepsDone.includes(st) ? '✓' : ''}</span>
                    <span>{cap(say(st, setting))}</span>
                  </button>
                </li>
              ))}
            </ul>
            <p className="caption">{say('Tick each step as you do it. Earth sees what you have done.', setting).replace('. the', '. The')}</p>
            <span className="placeholder">Placeholder steps, awaiting clinician review</span>
          </div>
          <div className="card">
            <div className="card-head">
              <h2 className="title">Case pack</h2>
              <SyntheticTag />
            </div>
            <dl className="pack">
              <dt>Reading</dt><dd>{ind.name} {reading.value.toFixed(ind.dp)} {ind.unit} ({raw.deltaText})</dd>
              <dt>Trend</dt><dd>Baseline {content.trend.baseline.map((b) => b.value.toFixed(ind.dp)).join(', ')}; this mission {content.trend.mission.map((m) => m.value.toFixed(ind.dp)).join(', ')} {ind.unit}</dd>
              <dt>Assessment</dt><dd>{TIER_WORD[raw.tier]}. Rule {raw.ruleId}. {raw.source}</dd>
              <dt>Done so far</dt><dd>{reading.stepsDone.length > 0 ? reading.stepsDone.map((x) => cap(say(x, setting))).join(' ') : 'Nothing ticked yet.'}</dd>
              <dt>How you feel</dt><dd>{content.symptoms.length > 0 ? content.symptoms.map((x) => x.label).join(', ') : 'Nothing logged today.'}</dd>
            </dl>
            <p className="caption">{pack.status === 'queued' ? `Queued on this device at ${hhmm(pack.createdAt)}. It leaves when a link opens, with anything you tick or log before then.` : `Exported at ${hhmm(pack.exportedAt ?? pack.createdAt)}.`}</p>
            <div className="btn-row">
              <button className="btn secondary" onClick={() => go('outbox')}>Open outbox</button>
              <button className="btn secondary" onClick={() => go('home')}>Home</button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function Outbox({ state, commit, rule }: Shared & { rule: Rule }) {
  const [file, setFile] = useState<string | null>(null);
  const queued = state.outbox.filter((p) => p.status === 'queued');
  const doExport = () => {
    const r = exportOutbox(state, seed, rule, Date.now());
    const text = JSON.stringify(r.file, null, 2);
    commit(r.state);
    setFile(text);
    try {
      const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `crew-health-cases-${new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-')}.json`;
      a.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch { /* the file text is shown on screen instead */ }
  };
  return (
    <>
      <div className="context"><span className="kicker">Store and forward · saved on this device</span><SyntheticTag /></div>
      <h1 className="display">Outbox</h1>
      <p className="muted">Cases wait here until a link opens, then leave as one file. Nothing needs a network until then.</p>
      <div className="card">
        {state.outbox.length === 0 ? <p>No cases yet. A case is queued when a result needs your crew medic or is urgent.</p> : (
          <ul className="rows">
            {[...state.outbox].reverse().map((p) => {
              const c = casePackContent(state, seed, rule, p.id);
              return (
                <li key={p.id}>
                  <button className="row" onClick={() => go('gap', p.readingId)}>
                    <span className="row-name">{c.crew}: {c.reading.indicator.toLowerCase()} <span className="mono">{c.reading.value}</span> {c.reading.unit}</span>
                    <TierPill tier={c.assessment.tier} />
                    <span className="caption">{p.status === 'queued' ? `Queued ${hhmm(p.createdAt)}` : `Exported ${hhmm(p.exportedAt ?? p.createdAt)}`}</span>
                    <span className="chev" aria-hidden="true">›</span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
        <div className="btn-row">
          <button className="btn" disabled={queued.length === 0} onClick={doExport}>Link open: export {queued.length} queued {queued.length === 1 ? 'case' : 'cases'}</button>
        </div>
        {file ? (
          <>
            <p aria-live="polite">Exported. The file was saved to this device's downloads. Its contents:</p>
            <pre className="file">{file}</pre>
          </>
        ) : null}
      </div>
      <div className="card">
        <h2 className="title">On this device</h2>
        <p>{state.readings.length} {state.readings.length === 1 ? 'reading' : 'readings'}, {state.symptoms.length} symptom {state.symptoms.length === 1 ? 'log' : 'logs'}, {state.outbox.length} {state.outbox.length === 1 ? 'case' : 'cases'}. Stored in this browser's own database. Nothing is sent anywhere unless you export it.</p>
      </div>
    </>
  );
}

function About() {
  const built = [
    'Runs with no network once loaded, on tablet, laptop and phone browsers.',
    'Readings, symptom logs and cases are saved on the device.',
    'Four crew profiles and four blood measures, each compared with that person\'s own baseline.',
    'Cases queue on the device and leave as one file when a link opens.',
    'One action layer serves the screens, a command-line tool and AI agents, so all give the same answer.',
    'Real NASA data on screen: crew blood counts (OSDR, OSD-569) and space weather (DONKI).',
  ];
  const placeholder = [
    'Every tiering rule, every threshold and every line of advice. Clinicians on our team must write and sign each one.',
    'Which indicators a crew would really measure in flight, and how.',
    'All crew values. They are SYNTHETIC.',
  ];
  const needed = [
    'Rules written and tested by flight clinicians against real cases.',
    'Links to the measuring devices a crew carries, instead of typed values.',
    'One shared record across crew devices on the spacecraft\'s own network, with crew privacy controls.',
    'A ground system that receives case files and returns replies.',
    'A space agency\'s own safety, security and hardware approval. We claim none of this.',
  ];
  const list = (items: string[]) => <ul className="plain">{items.map((x) => <li key={x}>{x}</li>)}</ul>;
  return (
    <>
      <div className="context"><span className="kicker">What is built, what is placeholder, what real use needs</span></div>
      <h1 className="display">Road to flight</h1>
      <p className="muted">This is a hackathon prototype. It is built the way a real crew tool would have to be built: everything on the device, nothing that depends on a link to Earth. Here is exactly where it stands.</p>
      <div className="grid three">
        <div className="card"><h2 className="title">Built and working</h2>{list(built)}</div>
        <div className="card"><h2 className="title">Placeholder today</h2>{list(placeholder)}</div>
        <div className="card"><h2 className="title">Needed before real use</h2>{list(needed)}</div>
      </div>
      <div className="card">
        <h2 className="title">For developers and AI agents</h2>
        <p>The same rules run from the command line and print JSON. See <a href="agents.md">the agent page</a> and the <a href={REPO}>source code</a>.</p>
        <pre className="file">npm run crew-health -- assess --crew crew-2 --indicator haemoglobin --value 13.4</pre>
      </div>
    </>
  );
}
