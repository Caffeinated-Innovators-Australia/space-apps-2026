// App shell and screens. Every change to the record goes through the action layer in src/core.
// AI assistance: drafted with Claude Code (see AI_USE.md).
import { useEffect, useMemo, useState } from 'react';
import rulesText from '../rules/rules.yaml?raw';
import { BaselineChart, ChartLegend, type ChartPoint } from './components/BaselineChart';
import { BodyFigure } from './components/BodyFigure';
import { ExplainCard } from './components/ExplainCard';
import { PrivacyTable } from './components/PrivacyTable';
import { ReactionTest } from './components/ReactionTest';
import { ScaleInput } from './components/ScaleInput';
import { StreakCard } from './components/StreakCard';
import { Timeline } from './components/Timeline';
import { VisionTest } from './components/VisionTest';
import { AdvisoryPill, AlertCard, LimitArrow, ReadingTile, SyntheticTag, TierPill, TIER_WORD, TierWords } from './components/ui';
import {
  acknowledge, assessReading, casePackContent, confirmation, crewById, crewGoal, dayPlan, daySummary, demoValue, exportOutbox, history, indicatorById,
  initialState, insights, latestReading, limitsFor, parseRules, personalBand, plausible, RANK, recordReading, reportNothing, sendCase, settingById, streak, tierFor,
  toggleStep, toggleSymptom,
  type Assessment, type DaySummary, type Indicator, type Reading as SavedReading, type RuleFile, type Seed, type Setting, type State, type Tier,
} from './core/index.ts';
import osd from './data/osd569_cbc.json';
import seedJson from './data/seed.json';
import { CrewData, SpaceWeather } from './screens/RealData';
import { deviceStore } from './store/indexeddb.ts';

interface Extras {
  problem: Record<'space' | 'earth', { text: string; source: string; link: string }>;
  settingStatus: string;
  earthBenefit: { figure: string; text: string; source: string; link: string };
  privacy: { status: string; rows: { what: string; you: string; medic: string; surgeon: string; crew: string }[] };
}
const seed = seedJson as unknown as Seed & Extras;
const store = deviceStore();
const K = 2; // matches band.k in rules/rules.yaml; the engine itself always reads the file
const REPO = 'https://github.com/Caffeinated-Innovators-Australia/space-apps-2026';

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
const shown = (i: Indicator, v: number) => (i.input.kind === 'scale' ? `${v.toFixed(0)}` : v.toFixed(i.dp));

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
  useEffect(() => { void store.load().then((s) => setState(s && s.version === 2 ? s : initialState(seed))); }, []);
  useEffect(() => { if (state) document.documentElement.dataset.theme = state.ui.theme; }, [state]);

  const loaded = useMemo<{ rules?: RuleFile; error?: string }>(() => {
    try { return { rules: parseRules(rulesText) }; } catch (e) { return { error: (e as Error).message }; }
  }, []);

  if (!state) return <div className="app"><p className="muted">Opening the record on this device…</p></div>;
  const commit = (next: State) => { setState(next); void store.save(next); };
  const ui = (patch: Partial<State['ui']>) => commit({ ...state, ui: { ...state.ui, ...patch } });
  const setting = settingById(seed, state.ui.settingId);
  const crew = crewById(seed, seed.crew.some((c) => c.id === state.ui.crewId) ? state.ui.crewId : seed.crew[0].id);
  const tierWords = { ...TIER_WORD, ...(setting.tierWords ?? {}) };
  const queued = state.outbox.filter((p) => p.status === 'queued').length;
  const rules = loaded.rules;
  const reading = route.arg ? state.readings.find((r) => r.id === route.arg) : undefined;
  const shared = { state, commit, ui, setting, crewId: crew.id };

  return (
    <TierWords.Provider value={tierWords}>
      <div className="app">
        <header className="top">
          <button className="brand" onClick={() => go('home')}>Crew health check</button>
          <nav className="nav" aria-label="Main">
            <button aria-current={['home', 'reading', 'result', 'gap'].includes(route.name) ? 'page' : undefined} onClick={() => go('home')}>Today</button>
            <button aria-current={route.name === 'crew' ? 'page' : undefined} onClick={() => go('crew')}>Real crew data</button>
            <button aria-current={route.name === 'outbox' ? 'page' : undefined} onClick={() => go('outbox')}>Outbox{queued ? ` (${queued})` : ''}</button>
            <button aria-current={route.name === 'about' ? 'page' : undefined} onClick={() => go('about')}>Privacy and limits</button>
          </nav>
          <button className="ghost" onClick={() => ui({ theme: state.ui.theme === 'cabin' ? 'day' : 'cabin' })}>{state.ui.theme === 'cabin' ? 'Day theme' : 'Cabin theme'}</button>
        </header>
        {rules ? <StatusBar state={state} commit={commit} rules={rules} crewId={crew.id} /> : null}

        <main className="stack">
          {!rules ? (
            <div className="error" role="alert">
              <h2 className="title">Rules file refused</h2>
              <p>{loaded.error}</p>
              <p className="caption">The app will not assess readings until the rules file is fixed.</p>
            </div>
          ) : route.name === 'crew' ? (
            <CrewData k={rules.band.k} />
          ) : route.name === 'outbox' ? (
            <Outbox {...shared} rules={rules} />
          ) : route.name === 'about' ? (
            <About />
          ) : route.name === 'reading' ? (
            <ReadingScreen {...shared} rules={rules} indicatorId={seed.indicators.some((i) => i.id === route.arg) ? route.arg! : seed.indicators[0].id} />
          ) : route.name === 'result' && reading ? (
            <Result {...shared} rules={rules} reading={reading} />
          ) : route.name === 'gap' && reading ? (
            <Gap {...shared} rules={rules} reading={reading} />
          ) : (
            <Home {...shared} rules={rules} />
          )}
        </main>

        <footer className="foot">
          <span>Assessment and next steps only. Not a diagnosis. Hackathon prototype; rules are placeholders until our clinicians sign them off.</span>
          <span>{osd.credit} · Data: NASA DONKI · Limits: NASA-STD-3001 Volumes 1 and 2. Crew values are SYNTHETIC. NASA does not endorse this project.</span>
          <span>Readings stay on this device. Caffeinated Innovators Australia · NASA Space Apps Challenge 2026 · <a href={REPO}>Source and references</a> · <a href="agents.md">For AI agents</a></span>
        </footer>
      </div>
    </TierWords.Provider>
  );
}

/** Always on screen: mission time and the alert that most needs attention (NASA display standard, Appendix F.4.2 and F.6.1). */
function StatusBar({ state, commit, rules, crewId }: { state: State; commit: (s: State) => void; rules: RuleFile; crewId: string }) {
  const day = daySummary(state, seed, rules, crewId);
  const flagged = [...day.flagged].sort((a, b) => RANK[b.assessment!.tier] - RANK[a.assessment!.tier]);
  const done = state.acknowledged ?? [];
  const open = flagged.filter((x) => !done.includes(x.reading!.id));
  const top = open[0];
  return (
    <div className="statusbar" role="status" aria-label="Mission time and alerts">
      <span>Mission time <span className="time">{String(seed.missionDay).padStart(4, '0')}/{state.ui.clock}:00</span></span>
      <span className="alertline">
        {top ? (
          <>
            <TierPill tier={top.assessment!.tier} />
            <button className="open" onClick={() => go('result', top.reading!.id)}>{top.indicator.name}{open.length > 1 ? `, and ${open.length - 1} more` : ''}</button>
            <button className="small" onClick={() => commit(acknowledge(state, top.reading!.id))}>Acknowledge</button>
          </>
        ) : flagged.length > 0 ? (
          <span>{flagged.length} {flagged.length === 1 ? 'alert' : 'alerts'} acknowledged</span>
        ) : (
          <span className="muted">No alerts</span>
        )}
      </span>
    </div>
  );
}

interface Shared { state: State; commit: (s: State) => void; ui: (p: Partial<State['ui']>) => void; setting: Setting; crewId: string }

function Context({ setting, crewId }: { setting: Setting; crewId: string }) {
  return (
    <div className="context">
      <span className="kicker">{setting.id === 'earth' ? setting.kicker : `${crewById(seed, crewId).name} · ${setting.kicker}`}</span>
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

function CombinedCard({ day, setting, onOpen }: { day: DaySummary; setting: Setting; onOpen: (r: SavedReading) => void }) {
  if (!day.combined) return null;
  const top = [...day.flagged].sort((a, b) => RANK[b.assessment!.tier] - RANK[a.assessment!.tier])[0];
  return (
    <section className={`alert alert-${day.combined.tier}`} aria-live="polite">
      <div className="card-head"><TierPill tier={day.combined.tier} /><SyntheticTag /></div>
      <h2 className="title">{day.combined.title}</h2>
      <p>{day.combined.why}</p>
      <ul className="rows">
        {day.flagged.map((x) => (
          <li key={x.indicator.id}>
            <button className="row" onClick={() => onOpen(x.reading!)}>
              <span className="row-name">{x.indicator.name}</span>
              <span className="row-val"><span className="mono">{shown(x.indicator, x.reading!.value)}</span> {x.indicator.unit}<LimitArrow tier={x.assessment!.tier} delta={x.assessment!.delta} /></span>
              <TierPill tier={x.assessment!.tier} />
              <span className="chev" aria-hidden="true">›</span>
            </button>
          </li>
        ))}
      </ul>
      <p className="source">Rule {day.combined.ruleId}. Source: {day.combined.source} Confidence: {day.combined.confidence}</p>
      {day.combined.placeholder ? <span className="placeholder">Placeholder rule, awaiting clinician review</span> : null}
      <div className="btn-row">
        <button className="btn" onClick={() => onOpen(top.reading!)}>{say('See what to do, and send the case to Earth', setting)}</button>
      </div>
    </section>
  );
}

function Home({ state, commit, ui, setting, crewId, rules }: Shared & { rules: RuleFile }) {
  const mine = state.symptoms.filter((s) => s.crewId === crewId);
  const nothing = state.nothingToReport.includes(crewId);
  const day = daySummary(state, seed, rules, crewId);
  const plan = dayPlan(state, seed, rules, crewId);
  const days = streak(state, seed, crewId);
  const goal = crewGoal(state, seed);
  const queued = state.outbox.filter((p) => p.status === 'queued').length;
  const used = state.readings.length > 0 || state.symptoms.length > 0 || state.ui.doseLogged || nothing;
  const groups = [...new Set(seed.indicators.map((i) => i.group))];
  const tiers: Record<string, Tier | undefined> = {};
  for (const x of day.items) {
    const t = x.assessment?.tier;
    if (t && (!tiers[x.indicator.group] || RANK[t] > RANK[tiers[x.indicator.group]!])) tiers[x.indicator.group] = t;
  }
  const next = plan.items.find((p) => p.status === 'due');
  const promptOpen = day.prompt && !day.items.find((x) => x.indicator.id === day.prompt!.indicatorId)?.reading;
  const crew = crewById(seed, crewId);
  const sleep = indicatorById(seed, 'sleep');
  const open = (id: string) => { const r = day.items.find((x) => x.indicator.id === id)?.reading; go(r ? 'result' : 'reading', r ? r.id : id); };
  const reset = () => commit({ ...initialState(seed), ui: { ...state.ui, doseLogged: false } });
  return (
    <>
      <Context setting={setting} crewId={crewId} />
      <h1 className="display">Day {seed.missionDay}. Here is your day.</h1>
      <div className="where-row">
        <div className="where">
          <span className="caption">Who are you?</span>
          <div className="seg" role="group" aria-label="Who are you?">
            {seed.crew.map((c) => <button key={c.id} aria-pressed={c.id === crewId} onClick={() => ui({ crewId: c.id })}>{c.name.replace('Crew member', 'Crew')}</button>)}
          </div>
        </div>
        <Where setting={setting} onPick={(id) => ui({ settingId: id })} />
      </div>

      <CombinedCard day={day} setting={setting} onOpen={(r) => go('result', r.id)} />

      {promptOpen ? (
        <section className="card prompt-card" aria-live="polite">
          <div className="card-head"><AdvisoryPill>Advisory: asked for today</AdvisoryPill><SyntheticTag /></div>
          <h2 className="title">A thirty-second reaction-time check</h2>
          <p>{day.prompt!.why}</p>
          <p className="source">Rule {day.prompt!.ruleId}. Placeholder rule, awaiting clinician review.</p>
          <div className="btn-row"><button className="btn" onClick={() => go('reading', day.prompt!.indicatorId)}>Start the reaction test</button></div>
        </section>
      ) : null}

      <div className="grid">
        <div className="stack">
          <div className="card">
            <div className="card-head">
              <h2 className="title">Your check-ins, fitted around your day</h2>
              <SyntheticTag />
            </div>
            <div className="where">
              <span className="caption">Mission clock</span>
              <div className="seg" role="group" aria-label="Mission clock">
                {seed.clockOptions.map((c) => <button key={c} aria-pressed={c === state.ui.clock} onClick={() => ui({ clock: c })}>{c}</button>)}
              </div>
              <button className="chip chip-toggle" aria-pressed={state.ui.slipped} onClick={() => ui({ slipped: !state.ui.slipped })}>EVA runs {seed.slipMinutes} min late</button>
            </div>
            {next ? <p><strong>Next:</strong> {next.label.toLowerCase()}, due now. It takes under a minute.</p> : <p className="muted">Nothing is due right now. Check-ins never interrupt a critical operation.</p>}
            <Timeline blocks={plan.blocks} items={plan.items} now={state.ui.clock} onOpen={open} />
          </div>
          <div className="card">
            <h2 className="title">Where you are: {setting.label}</h2>
            <dl className="pack">
              <dt>Main risks here</dt><dd>{setting.risks}</dd>
              <dt>What changes</dt><dd>{setting.twist}</dd>
              <dt>If you need help</dt><dd>{setting.advice}</dd>
            </dl>
            <span className="placeholder">{seed.settingStatus}</span>
          </div>
        </div>

        <div className="stack">
          <div className="card">
            <div className="card-head">
              <h2 className="title">Your signals</h2>
              <SyntheticTag />
            </div>
            <BodyFigure onOpen={open} tiers={tiers} />
            {groups.map((g) => (
              <div key={g} className="group">
                <span className="group-name">{g}</span>
                <ul className="rows">
                  {day.items.filter((x) => x.indicator.group === g).map(({ indicator: i, reading: r, assessment: a, prompted, due }) => {
                    const series = crew.mission[i.id] ?? [];
                    let lastDay = series.length;
                    while (lastDay > 0 && series[lastDay - 1] === null) lastDay -= 1;
                    const past = lastDay > 0 ? (series[lastDay - 1] as number) : undefined;
                    return (
                      <li key={i.id}>
                        <button className="row" onClick={() => open(i.id)}>
                          <span className="row-name">{i.name}{prompted && !r ? ' · asked for today' : ''}</span>
                          <span className="row-val">{r || past !== undefined ? <><span className="mono">{shown(i, r ? r.value : past!)}</span> {i.unit}</> : null}{a ? <LimitArrow tier={a.tier} delta={a.delta} /> : null}</span>
                          {a ? <TierPill tier={a.tier} /> : (
                            <span className="stale">{past !== undefined ? `From day ${lastDay}. ` : 'No reading yet. '}{i.cadence === 'prompted' && !prompted ? 'Taken when asked' : due ? 'Due today' : i.cadence === 'weekly' ? 'Weekly' : 'Not logged today'}</span>
                          )}
                          <span className="chev" aria-hidden="true">›</span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
            <div className="btn-row">
              {queued ? <button className="btn secondary" onClick={() => go('outbox')}>Outbox ({queued})</button> : null}
              {used ? <button className="link" onClick={reset}>Reset the demo</button> : null}
            </div>
          </div>

          <StreakCard streakDays={days} crewDone={goal.done} crewTotal={goal.total} unlocked={insights(days)}>
            {days >= 14 ? (
              <>
                <BaselineChart points={missionPoints(state, crewId, sleep, 28)} band={personalBand(crew.baseline.sleep, rules.band.k)} unit={sleep.unit} dp={sleep.dp} title="Your sleep over the past four weeks against your own range." readingLabel="Past four weeks" baselineLabel="Before launch" />
                <ChartLegend bandLabel="Own expected range" reference={false} />
              </>
            ) : null}
          </StreakCard>

          <div className="card">
            <div className="card-head">
              <h2 className="title">Feeling off? Tell us in one tap</h2>
              <SyntheticTag />
            </div>
            <div className="chips" role="group" aria-label="How you feel">
              {seed.symptoms.options.map((o) => (
                <button key={o} className="chip chip-toggle" aria-pressed={mine.some((x) => x.label === o)} onClick={() => commit(toggleSymptom(state, crewId, o, Date.now()))}>{o}</button>
              ))}
              <button className="chip chip-toggle" aria-pressed={nothing} onClick={() => commit(reportNothing(state, crewId))}>Nothing to report</button>
            </div>
            {mine.length > 0 ? (
              <p aria-live="polite">Logged: {mine.map((x) => `${x.label.toLowerCase()} at ${hhmm(x.at)}`).join(', ')}. {say('This goes in your next case to Earth.', setting)}</p>
            ) : nothing ? (
              <p aria-live="polite">Logged: nothing to report. That is a check-in too.</p>
            ) : (
              <p className="muted">Nothing logged today. One tap is enough.</p>
            )}
            <p className="caption">Only you see this unless you send it. <button className="link" onClick={() => go('about')}>Who sees what</button></p>
            <span className="placeholder">{seed.symptoms.status}</span>
          </div>

          {setting.id === 'earth' ? null : <SpaceWeather doseLogged={Boolean(latestReading(state, crewId, 'radiation'))} onDose={() => open('radiation')} />}

          <div className="card">
            <h2 className="title">The same problem, back on Earth</h2>
            <p><span className="num stat">{seed.earthBenefit.figure}</span> {seed.earthBenefit.text}</p>
            <p className="muted">A crew far from Earth and a family hours from a hospital need the same thing: care that starts before the expert arrives.</p>
            <p className="caption">Source: <a href={seed.earthBenefit.link}>{seed.earthBenefit.source}</a>.</p>
            <div><button className="btn secondary" onClick={() => ui({ settingId: setting.id === 'earth' ? seed.settings[0].id : 'earth' })}>{setting.id === 'earth' ? 'Back to the Mars base' : 'See it in remote Australia'}</button></div>
          </div>
          <div className="card">
            <h2 className="title">The same idea, on real crew data</h2>
            <p className="muted">See four real crew members' blood counts measured against their own pre-flight baselines.</p>
            <p className="caption">{osd.credit}</p>
            <div><button className="btn secondary" onClick={() => go('crew')}>Open real crew data</button></div>
          </div>
        </div>
      </div>
    </>
  );
}

/** Chart points: the baseline, the most recent mission days, then anything saved today. */
function missionPoints(state: State, crewId: string, ind: Indicator, lastDays: number, today?: { reading: SavedReading; a: Assessment }): ChartPoint[] {
  const crew = crewById(seed, crewId);
  const band = personalBand(crew.baseline[ind.id], K, ind.fixedSd);
  const lim = limitsFor(seed, crewId, ind.id);
  const lo = lim.low;
  const hi = lim.high;
  const h = history(state, seed, crewId, ind.id);
  const start = Math.max(0, h.mission.length - lastDays);
  const pts: ChartPoint[] = h.baseline.slice(-7).map((v, i) => ({ label: i === 0 ? 'Base' : '', value: v, kind: 'baseline' as const }));
  h.mission.slice(start).forEach((v, i) => {
    if (v !== null) pts.push({ label: `Day ${start + i + 1}`, value: v, kind: 'reading', tier: tierFor(v, band, lo, hi, ind.watch) });
  });
  if (today) {
    for (const r of h.recorded.filter((x) => x.at < today.reading.at).slice(-2)) pts.push({ label: hhmm(r.at), value: r.value, kind: 'reading', tier: r.tier });
    pts.push({ label: 'Today', value: today.reading.value, kind: 'reading', tier: today.a.tier, highlight: true });
  }
  return pts;
}

function ReadingScreen({ state, commit, setting, crewId, rules, indicatorId }: Shared & { rules: RuleFile; indicatorId: string }) {
  const ind = indicatorById(seed, indicatorId);
  const crew = crewById(seed, crewId);
  const [text, setText] = useState('');
  useEffect(() => setText(''), [indicatorId, crewId]);
  const n = Number(text);
  const valid = text.trim() !== '' && plausible(ind, n);
  const cumulative = ind.mode === 'cumulative';
  const band = cumulative ? null : personalBand(crew.baseline[ind.id], rules.band.k, ind.fixedSd);
  const lim = limitsFor(seed, crewId, ind.id);
  const demo = demoValue(seed, crewId, ind.id);
  const [problem, setProblem] = useState('');
  useEffect(() => setProblem(''), [text, indicatorId, crewId]);
  const submit = () => {
    if (!valid) return;
    try {
      const r = recordReading(state, seed, rules, { crewId, indicatorId, value: Number(n.toFixed(ind.dp)), at: Date.now() });
      commit(r.state);
      go('result', r.reading.id);
    } catch (e) {
      setProblem((e as Error).message);
    }
  };
  return (
    <>
      <Context setting={setting} crewId={crewId} />
      <h1 className="display">{ind.region === ind.name ? ind.name : `${ind.region}: ${ind.name.toLowerCase()}`}</h1>
      <label className="picker">
        <span className="caption">Check-in</span>
        <select value={ind.id} onChange={(e) => go('reading', e.target.value)} aria-label="Which check-in">
          {[...new Set(seed.indicators.map((i) => i.group))].map((g) => (
            <optgroup key={g} label={g}>
              {seed.indicators.filter((i) => i.group === g).map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
            </optgroup>
          ))}
        </select>
      </label>
      <div className="grid">
        <div className="stack">
          <form className="card" onSubmit={(e) => { e.preventDefault(); submit(); }}>
            <label className="title" htmlFor="reading">{ind.input.prompt}</label>
            {ind.input.kind === 'scale' ? (
              <ScaleInput labels={ind.input.labels ?? []} value={valid ? n : undefined} onPick={(v) => setText(String(v))} />
            ) : ind.input.kind === 'test' ? (
              <ReactionTest onResult={(ms) => setText(String(ms))} />
            ) : ind.input.kind === 'vision' ? (
              <VisionTest onResult={(lines) => setText(String(lines))} />
            ) : null}
            {ind.input.kind === 'sensor' ? <p className="muted">{cumulative ? 'Your personal dosimeter reports' : 'The cabin sensor reports'} <span className="mono">{demo.toFixed(ind.dp)}</span> {ind.unit} {cumulative ? 'as your mission total so far. Log it, or type the reading from the device.' : 'as the latest one-hour average. Log it, or type a reading from a handheld monitor.'}</p> : null}
            {ind.input.kind !== 'scale' ? (
              <div className="field">
                <input id="reading" inputMode="decimal" autoComplete="off" autoFocus={ind.input.kind === 'number'} value={text} onChange={(e) => setText(e.target.value)} placeholder={(0).toFixed(ind.dp)} aria-describedby="reading-unit" />
                <span className="unit" id="reading-unit">{ind.unit}</span>
              </div>
            ) : null}
            {text.trim() !== '' && !valid ? <p className="caption" role="alert">That cannot be right: {ind.name.toLowerCase()} must be between {ind.input.min} and {ind.input.max} {ind.unit}. Check and enter it again.</p> : null}
            {problem ? <p className="caption" role="alert">{problem}</p> : null}
            <div className="chips">
              <SyntheticTag />
              <span className="caption">{ind.input.kind === 'sensor' ? 'Sensor value:' : 'Demo value for today:'}</span>
              <button type="button" className="chip" onClick={() => setText(shown(ind, demo))}>{shown(ind, demo)}</button>
            </div>
            <div className="btn-row">
              <button className="btn" type="submit" disabled={!valid}>Check against my baseline</button>
              <button className="btn secondary" type="button" onClick={() => go('home')}>Back</button>
            </div>
          </form>
          <div className="card">
            <span className="why-label">Your baseline</span>
            {band ? (
              <p>{say(ind.baselineLabel ?? 'Before launch', setting)}, your average was {band.mean.toFixed(ind.dp)} {ind.unit}. Your own expected range is {Math.max(ind.input.min, band.low).toFixed(ind.dp)} to {Math.min(ind.input.max, band.high).toFixed(ind.dp)} {ind.unit}. Every reading is compared with your own numbers.</p>
            ) : (
              <p>This is a running total, so it is compared with a limit, not with a personal range.</p>
            )}
            {ind.limit ? <p className="caption">{ind.limit.label}: {(lim.high ?? lim.low)!.toFixed(ind.dp)} {ind.unit}. Source: {ind.limit.source}.</p> : null}
            {ind.variationSource ? <p className="caption">Range width from: {ind.variationSource}.</p> : null}
          </div>
        </div>
        <ExplainCard how={ind.card.how} why={ind.card.why} what={say(ind.card.what, setting)} status={`${ind.cardNote ? `${ind.cardNote} ` : ''}${ind.card.status}`} hazards={ind.hazards.map((code) => ({ code, name: seed.hazards[code] }))} sources={ind.card.sources} />
      </div>
    </>
  );
}

function localise(a: Assessment, s: Setting): Assessment {
  return { ...a, why: say(a.why, s), title: say(a.title, s), steps: a.steps.map((x) => cap(say(x, s))) };
}

function Result({ state, commit, setting, rules, reading }: Shared & { rules: RuleFile; reading: SavedReading }) {
  const ind = indicatorById(seed, reading.indicatorId);
  const crew = crewById(seed, reading.crewId);
  const ref = ind.ref?.[crew.sex];
  const lim = limitsFor(seed, reading.crewId, ind.id);
  const cumulative = ind.mode === 'cumulative';
  const raw = assessReading(state, seed, rules, reading);
  // The card leads with the strongest finding; any others are listed under it.
  const a = localise({ ...raw, why: raw.findings[0]?.why ?? raw.why }, setting);
  const sent = state.outbox.some((p) => p.readingId === reading.id);
  const conf = confirmation(state, reading);
  const day = daySummary(state, seed, rules, reading.crewId);
  const promptOpen = day.prompt && day.prompt.indicatorId !== ind.id && !day.items.find((x) => x.indicator.id === day.prompt!.indicatorId)?.reading;
  const others = day.flagged.filter((x) => x.indicator.id !== ind.id);
  const send = () => { commit(sendCase(state, { readingId: reading.id, settingId: setting.id, at: Date.now() }).state); go('gap', reading.id); };
  const limit = ind.limit ? (lim.high ?? lim.low) : undefined;
  return (
    <>
      <Context setting={setting} crewId={reading.crewId} />
      <div className="grid wide-left">
        <div className="stack">
          <ReadingTile label={`${ind.name}, ${hhmm(reading.at)}`} value={shown(ind, reading.value)} unit={ind.unit} delta={a.deltaText} arrow={cumulative ? null : <LimitArrow tier={raw.tier} delta={raw.delta} />} />
          <div className="card">
            <div className="card-head">
              <h2 className="title">{cumulative ? 'Against the limit' : 'Against your own baseline'}</h2>
              <SyntheticTag />
            </div>
            {cumulative && limit !== undefined ? (
              <>
                <div className="x-bar" role="img" aria-label={`${shown(ind, reading.value)} of ${limit} ${ind.unit}`}><div className="x-bar-fill" style={{ width: `${Math.min(100, (reading.value / limit) * 100)}%` }} /></div>
                <p><span className="mono">{shown(ind, reading.value)}</span> of {limit} {ind.unit}: {((reading.value / limit) * 100).toFixed(1)}% of the {ind.limit!.label}.</p>
                <p className="caption">{ind.limit!.source}. Dose from earlier flights is not counted here.</p>
              </>
            ) : (
              <>
                <BaselineChart points={missionPoints(state, reading.crewId, ind, 28, { reading, a: raw })} band={raw.band} refMin={ref?.min} refMax={ref?.max} limit={limit !== undefined && ind.limit ? { value: limit, label: ind.limit.label.replace(/ \(.*\)/, '') } : undefined} unit={ind.unit} dp={ind.dp} baselineLabel={say(ind.baselineLabel ?? 'Before launch', setting)} readingLabel={ind.cadence === 'weekly' ? 'This mission' : 'Past four weeks'} title={`${ind.name} against your own range. Today: ${shown(ind, reading.value)} ${ind.unit}.`} />
                <ChartLegend bandLabel="Own expected range" reference={Boolean(ref)} limitLabel={ind.limit?.label} />
                <p className="caption">{ind.refSource ? `${ind.refSource}. ` : ''}{ind.limit ? `${ind.limit.label}: ${ind.limit.source}.` : ''}</p>
              </>
            )}
          </div>
        </div>
        <div className="stack">
          <AlertCard a={a} synthetic>
            {raw.findings.length > 1 ? (
              <ul className="plain also">
                {raw.findings.slice(1).map((f) => <li key={f.ruleId}>{say(f.why, setting)}</li>)}
              </ul>
            ) : null}
            {raw.findings.length > 0 ? <p className="caption">Rules that fired: {raw.findings.map((f) => f.ruleId).join(', ')}.</p> : null}
            {conf.status === 'unconfirmed' ? <p className="confirm" role="status">One reading so far. A second reading that agrees will mark this as confirmed.</p> : null}
            {conf.status === 'confirmed' ? <p className="confirm ok" role="status">Confirmed by a second reading (the one at {hhmm(conf.previousAt!)} was also outside your range).</p> : null}
            <div className="btn-row">
              {promptOpen ? <button className="btn" onClick={() => go('reading', day.prompt!.indicatorId)}>Next: thirty-second reaction test</button> : a.tier === 'green' ? (
                <button className="btn" onClick={() => go('home')}>Log and finish</button>
              ) : (
                <button className="btn" onClick={send}>{sent ? 'Open the case' : say('Send case to Earth', setting)}</button>
              )}
              {promptOpen && a.tier !== 'green' ? <button className="btn secondary" onClick={send}>{say('Send case to Earth', setting)}</button> : null}
              <button className="btn secondary" onClick={() => go('reading', ind.id)}>Repeat the reading</button>
              <button className="btn secondary" onClick={() => go('home')}>Back to today</button>
            </div>
          </AlertCard>
          {others.length > 0 ? (
            <div className="card">
              <span className="why-label">Also outside your range today</span>
              <ul className="rows">
                {others.map((x) => (
                  <li key={x.indicator.id}>
                    <button className="row" onClick={() => go('result', x.reading!.id)}>
                      <span className="row-name">{x.indicator.name}</span>
                      <span className="row-val"><span className="mono">{shown(x.indicator, x.reading!.value)}</span> {x.indicator.unit}</span>
                      <TierPill tier={x.assessment!.tier} />
                      <span className="chev" aria-hidden="true">›</span>
                    </button>
                  </li>
                ))}
              </ul>
              <p className="caption">These go in the same case pack, so Earth sees the whole picture.</p>
            </div>
          ) : null}
        </div>
      </div>
    </>
  );
}

function Gap({ state, commit, ui, setting, rules, reading }: Shared & { rules: RuleFile; reading: SavedReading }) {
  const pack = state.outbox.find((p) => p.readingId === reading.id);
  const [startAt, setStartAt] = useState(pack?.createdAt ?? Date.now());
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(id);
  }, []);
  if (!pack) return <Result state={state} commit={commit} ui={ui} setting={setting} crewId={reading.crewId} rules={rules} reading={reading} />;
  const ind = indicatorById(seed, reading.indicatorId);
  const raw = assessReading(state, seed, rules, reading);
  const content = casePackContent(state, seed, rules, pack.id);
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
              <dt>Reading</dt><dd>{ind.name} {shown(ind, reading.value)} {ind.unit} ({raw.deltaText})</dd>
              <dt>Own range</dt><dd>{content.trend.ownRange[0]} to {content.trend.ownRange[1]} {ind.unit}; the past 14 days and today's readings are attached</dd>
              <dt>Assessment</dt><dd>{TIER_WORD[raw.tier]}{content.assessment.confirmedByRepeatReading ? ', confirmed by a second reading' : ', one reading so far'}. Rules {raw.ruleId}. {raw.source}</dd>
              <dt>Other signals</dt><dd>{content.otherSignalsToday.length > 0 ? content.otherSignalsToday.map((x) => `${x.indicator} ${x.value} ${x.unit}`).join('; ') : 'None today.'}</dd>
              <dt>Done so far</dt><dd>{reading.stepsDone.length > 0 ? reading.stepsDone.map((x) => cap(say(x, setting))).join(' ') : 'Nothing ticked yet.'}</dd>
              <dt>How you feel</dt><dd>{content.symptoms.length > 0 ? content.symptoms.map((x) => x.label).join(', ') : 'Nothing logged today.'}</dd>
            </dl>
            <p className="caption">{pack.status === 'queued' ? `Queued on this device at ${hhmm(pack.createdAt)}. It leaves when a link opens, with anything you tick or log before then.` : `Exported at ${hhmm(pack.exportedAt ?? pack.createdAt)}.`}</p>
            <div className="btn-row">
              <button className="btn secondary" onClick={() => go('outbox')}>Open outbox</button>
              <button className="btn secondary" onClick={() => go('home')}>Back to today</button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function Outbox({ state, commit, rules }: Shared & { rules: RuleFile }) {
  const [file, setFile] = useState<string | null>(null);
  const queued = state.outbox.filter((p) => p.status === 'queued');
  const doExport = () => {
    const r = exportOutbox(state, seed, rules, Date.now());
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
        {state.outbox.length === 0 ? <p>No cases yet. A case is queued when you send a result that needs your crew medic or is urgent.</p> : (
          <ul className="rows">
            {[...state.outbox].reverse().map((p) => {
              const c = casePackContent(state, seed, rules, p.id);
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
    'Fifteen check-ins across seven body systems, each compared with that person\'s own baseline and mission so far.',
    'A near-vision self-check and a reaction-time test built into the app.',
    'Screens laid out to NASA\'s published display standard: colour for meaning only, 7:1 text contrast, an always-visible time and alert bar.',
    'Trend, repeat and combined rules, so a slow slide is caught as well as one odd reading.',
    'Prompts fitted around the crew timeline, never during a critical operation.',
    'A streak and crew goal that reward checking in, never good numbers.',
    'Cases queue on the device and leave as one file when a link opens.',
    'One action layer serves the screens, a command-line tool and AI agents.',
    'Real NASA data: crew blood counts (OSDR, OSD-569), space weather (DONKI), and limits from NASA-STD-3001 for cabin carbon dioxide, strength and radiation dose.',
  ];
  const placeholder = [
    'Every rule, every number in it and every line of advice. Clinicians on our team must write and sign each one.',
    'The explanation cards: draft wording from our own challenge brief.',
    'Who sees what: a draft policy for the team to confirm.',
    'All crew values. They are SYNTHETIC.',
  ];
  const needed = [
    'Rules written and tested by flight clinicians against real cases, including rules that change by environment.',
    'Links to the sensors a crew carries, and voice input, instead of typed values.',
    'One shared record across crew devices on the spacecraft\'s own network, enforcing the privacy rules.',
    'A ground system that receives case files and returns replies.',
    'A space agency\'s own safety, security and hardware approval. We claim none of this.',
  ];
  const list = (items: string[]) => <ul className="plain">{items.map((x) => <li key={x}>{x}</li>)}</ul>;
  return (
    <>
      <div className="context"><span className="kicker">Privacy, and what is built, placeholder and still needed</span></div>
      <h1 className="display">Privacy and limits</h1>
      <p className="muted">Crews report honestly only when they trust where the data goes. This is who sees what, and exactly where this prototype stands.</p>
      <div className="card"><PrivacyTable rows={seed.privacy.rows} status={seed.privacy.status} /></div>
      <div className="grid three">
        <div className="card"><h2 className="title">Built and working</h2>{list(built)}</div>
        <div className="card"><h2 className="title">Placeholder today</h2>{list(placeholder)}</div>
        <div className="card"><h2 className="title">Needed before real use</h2>{list(needed)}</div>
      </div>
      <div className="card">
        <h2 className="title">For developers and AI agents</h2>
        <p>The same rules run from the command line and print JSON. See <a href="agents.md">the agent page</a> and the <a href={REPO}>source code</a>.</p>
        <pre className="file">npm run crew-health -- day --crew crew-1</pre>
      </div>
    </>
  );
}
