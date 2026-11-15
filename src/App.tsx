// App shell and screens. Every change to the record goes through the action layer in src/core.
// AI assistance: drafted with Claude Code (see AI_USE.md).
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
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
import { AdvisoryPill, AlertCard, LimitArrow, More, ReadingTile, Ring, SyntheticTag, TierPill, TierShape, TIER_WORD, TierWords, statusClass } from './components/ui';
import {
  acknowledge, assessReading, caseContent, casePackContent, confirmation, crewById, crewGoal, dayPlan, daySummary, demoValue, exportOutbox, history, indicatorById,
  fromMin, initialState, insights, latestReading, limitsFor, parseRules, personalBand, plausible, RANK, recordReading, reportNothing, sendCase, settingById, streak, tierFor,
  logPain, logPathwayTest, pathwayAlerts, pathwayCaseContent, pathwayStatuses, pathwayTier, sendPathwayCase, testNote, togglePathwayStep, toggleStep, toggleSymptom, lifeThreats, toMin, vitalsPrompt, painDue, painSchedule, fluidVitalsCheck, awaitingRepeat, stormStatus, acknowledgeStorm,
  type Assessment, type DaySummary, type Indicator, type PathwayStatus, type Reading as SavedReading, type RuleFile, type Seed, type Setting, type State, type Tier,
} from './core/index.ts';
import osd from './data/osd569_cbc.json';
import seedJson from './data/seed.json';
import { doctorSay, HandoverCard, LinkBanner, ReplyCard } from './components/Handover';
import { acceptReply, arrivedReplies, changePlace, linkStatus, type CasePack } from './core/index.ts';
import { EmergencyBanner } from './components/EmergencyBanner.tsx';
import { AiConnections } from './screens/AiConnections.tsx';
import { loadAi } from './core/ai.ts';
import { Assistant } from './screens/Assistant.tsx';
import { StormAlarm, useTick as useStormTick } from './components/StormAlarm.tsx';
import { EmergencyButton } from './components/EmergencyButton';
import { CheckIn } from './screens/CheckIn';
import { Emergency } from './screens/Emergency';
import { EarthInbox } from './screens/EarthInbox';
import { MedicOverview } from './screens/MedicOverview';
import { Menu } from './screens/Menu';
import { FeelingOff } from './screens/FeelingOff';
import { Immune } from './screens/Immune';
import { Radiation } from './screens/Radiation';
import { CrewData, RealBand, SpaceWeather } from './screens/RealData';
import { Vitals, MonitorAlertCard } from './screens/Vitals';
import { Devices } from './screens/Devices';
import { Ultrasound } from './screens/Ultrasound';
import { CrewCheckIn } from './screens/CrewCheckIn';
import { Location } from './screens/Location';
import { Astra } from './screens/Astra';
import { Area } from './screens/Area';
import { areaForGroup, doseSummary } from './core/index.ts';
import { crewCheckDue, noteGravityChange, showDizzinessOnStanding, ultrasoundAvailable, ultrasoundSummary, vitalsAlerts, vitalsLine, latestVitals } from './core/index.ts';
import { deviceStore } from './store/indexeddb.ts';

interface Extras {
  problem: Record<'space' | 'earth', { text: string; source: string; link: string }>;
  settingStatus: string;
  earthBenefit: { figure: string; text: string; source: string; link: string };
  reach: Record<'space' | 'earth', { text: string; source: string; link: string }>;
  privacy: { status: string; rows: { what: string; you: string; medic: string; surgeon: string; crew: string }[] };
}
const seed = seedJson as unknown as Seed & Extras;
const store = deviceStore();
const K = 2; // matches band.k in rules/rules.yaml; the engine itself always reads the file
const REPO = 'https://github.com/Caffeinated-Innovators-Australia/space-apps-2026';

/** The demo's mission clock: the chosen clock time, moving forward in real time from the moment it was set. */
const BOOT = Date.now();
let anchor = { clock: '06:45', at: BOOT };
/** Demo only: how far the clock has been skipped ahead, so a wait of many minutes can be shown in seconds. */
let skipMs = 0;
const nowMs = () => Date.now() + skipMs;
const missionSeconds = (t: number) => Math.max(0, toMin(anchor.clock) * 60 + Math.floor((t - anchor.at) / 1000)) % 86400;
/** A logged time, shown as mission time so it agrees with the mission clock in the status bar. */
const hhmm = (t: number) => fromMin(Math.floor(missionSeconds(t) / 60));
const hhmmss = (t: number) => `${hhmm(t)}:${String(missionSeconds(t) % 60).padStart(2, '0')}`;
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

const ROUTES = ['reading', 'result', 'gap', 'pathway', 'crew', 'outbox', 'about', 'checkin', 'feeling', 'inbox', 'medic', 'menu', 'emergency', 'radiation', 'immune', 'schedule', 'signals', 'sources', 'vitals', 'ultrasound', 'crewcheck', 'location', 'astra', 'area', 'replies', 'devices', 'ai', 'assistant'] as const;
interface Route { name: 'home' | (typeof ROUTES)[number]; arg?: string }
function readRoute(): Route {
  const [name, arg] = window.location.hash.replace(/^#\/?/, '').split('/');
  const ok = (ROUTES as readonly string[]).includes(name);
  return ok ? { name: name as Route['name'], arg } : { name: 'home' };
}
function go(name: Route['name'] | string, arg?: string) {
  window.location.hash = name === 'home' ? '/' : `/${name}${arg ? `/${arg}` : ''}`;
}

/** At 0 g, dizziness on standing means nothing, so it is not offered there. */
function feelingSeed(setting: Setting): Seed {
  if (showDizzinessOnStanding(setting)) return seed;
  const keep = (x: string) => x !== 'Dizzy on standing';
  return { ...seed, symptoms: { ...seed.symptoms, options: seed.symptoms.options.filter(keep) }, symptomZones: seed.symptomZones ? { ...seed.symptomZones, zones: seed.symptomZones.zones.map((z) => ({ ...z, symptoms: z.symptoms.filter(keep) })) } : undefined };
}
/** Change place, and note it when the gravity changes, so the adapting period can start. */
function place(st: State, id: string, at: number): State {
  const next = noteGravityChange(changePlace(st, id, at), settingById(seed, st.ui.settingId), settingById(seed, id), at);
  // The place normally comes from mission data, not from the crew. The demo switchers stand in for that feed.
  return { ...next, ui: { ...next.ui, locationManual: false } };
}
/** Where an Act now alert that is a life threat sends the crew: the emergency module's pathway. */
const emergencyFor = (construct: number) => go('astra', String(construct));

/** The clock, re-read on a timer, for the parts of a screen that depend on the signal delay. */
function useTick(ms = 1000): number {
  const [now, setNow] = useState(nowMs());
  useEffect(() => {
    const id = window.setInterval(() => setNow(nowMs()), ms);
    return () => window.clearInterval(id);
  }, [ms]);
  return now;
}
/** Replies that have reached this person and are not yet added to their steps. */
function newReplies(state: State, crewId: string, setting: Setting, now: number) {
  return state.outbox.filter((p) => p.crewId === crewId).flatMap((p) => arrivedReplies(state, p, setting, now)).filter((r) => r.acceptedAt === undefined);
}
/** The crew's own inbox in the top bar: it counts the replies that have arrived. */
function RepliesNav({ state, crewId, setting, current }: { state: State; crewId: string; setting: Setting; current: boolean }) {
  const n = newReplies(state, crewId, setting, useTick()).length;
  return <button aria-current={current ? 'page' : undefined} onClick={() => go('replies')}>Replies{n ? ` (${n})` : ''}</button>;
}
/** On Today, the moment a reply arrives. */
function ReplyNotice({ state, crewId, setting }: { state: State; crewId: string; setting: Setting }) {
  const n = newReplies(state, crewId, setting, useTick()).length;
  if (!n) return null;
  return (
    <section className="card prompt-card" aria-live="polite">
      <div className="card-head"><AdvisoryPill>Reply in</AdvisoryPill></div>
      <h2 className="title">{doctorSay(n === 1 ? 'A reply from the flight surgeon has arrived' : `${n} replies from the flight surgeon have arrived`, setting, say)}</h2>
      <div className="btn-row"><button className="btn" onClick={() => go('replies')}>Read the reply</button></div>
    </section>
  );
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
  anchor = { clock: state.ui.clock, at: state.ui.clockSetAt ?? BOOT };
  skipMs = state.ui.skipMs ?? 0;
  const setting = settingById(seed, state.ui.settingId);
  const crew = crewById(seed, seed.crew.some((c) => c.id === state.ui.crewId) ? state.ui.crewId : seed.crew[0].id);
  const tierWords = { ...TIER_WORD, ...(setting.tierWords ?? {}) };
  const queued = state.outbox.filter((p) => p.status === 'queued').length;
  const rules = loaded.rules;
  const reading = route.arg ? state.readings.find((r) => r.id === route.arg) : undefined;
  const shared = { state, commit, ui, setting, crewId: crew.id };
  const extra = { seed: seed as Seed, go, say, hhmm };

  return (
    <TierWords.Provider value={tierWords}>
      <div className="app">
        <header className="top">
          <button className="brand" onClick={() => go('home')}>Crew health check</button>
          <nav className="nav" aria-label="Main">
            <button aria-current={['home', 'reading', 'result', 'gap', 'pathway', 'checkin', 'feeling', 'radiation', 'immune', 'schedule', 'signals', 'sources', 'area', 'vitals', 'ultrasound'].includes(route.name) ? 'page' : undefined} onClick={() => go('home')}>Today</button>
            <button aria-current={route.name === 'outbox' ? 'page' : undefined} onClick={() => go('outbox')}>Outbox{queued ? ` (${queued})` : ''}</button>
            <RepliesNav state={state} crewId={crew.id} setting={setting} current={route.name === 'replies'} />
            <button aria-current={['menu', 'medic', 'about', 'crew', 'inbox', 'location', 'crewcheck', 'astra'].includes(route.name) ? 'page' : undefined} onClick={() => go('menu')}>Menu</button>
          </nav>
          {route.name === 'emergency' ? null : <EmergencyButton go={go} />}
          <button className="ghost" onClick={() => ui({ theme: state.ui.theme === 'cabin' ? 'day' : 'cabin' })}>{state.ui.theme === 'cabin' ? 'Day theme' : 'Cabin theme'}</button>
        </header>
        {rules ? (
          <div className="sticky-top">
            <StatusBar state={state} commit={commit} rules={rules} crewId={crew.id} setting={setting} />
            <StormShell state={state} commit={commit} rules={rules} setting={setting} />
            {route.name === 'emergency' || route.name === 'astra' ? null : <EmergencyBanner threats={lifeThreats(state, seed as Seed, rules, crew.id)} go={go} />}
          </div>
        ) : null}

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
          ) : route.name === 'inbox' ? (
            <EarthInbox {...shared} {...extra} rules={rules} caseId={route.arg} />
          ) : route.name === 'emergency' ? (
            <Emergency {...shared} {...extra} rules={rules} />
          ) : route.name === 'radiation' ? (
            <Radiation {...shared} {...extra} rules={rules} />
          ) : route.name === 'immune' ? (
            <Immune {...shared} {...extra} rules={rules} />
          ) : route.name === 'medic' ? (
            <MedicOverview {...shared} {...extra} rules={rules} />
          ) : route.name === 'menu' ? (
            <Menu {...shared} {...extra} rules={rules} />
          ) : route.name === 'devices' ? (
            <Devices {...shared} {...extra} />
          ) : route.name === 'ai' ? (
            <AiConnections setting={setting} go={go} />
          ) : route.name === 'assistant' ? (
            <Assistant state={state} seed={seed} setting={setting} crewId={crew.id} go={go} />
          ) : route.name === 'vitals' ? (
            <Vitals {...shared} {...extra} rules={rules} onSend={pathwayStatuses(state, seed, rules, crew.id).some((x) => x.pathway.id === 'KS-01' && (x.level === 'amber' || x.level === 'red')) ? () => { if (!state.outbox.some((k) => k.pathwayId === 'KS-01' && k.crewId === crew.id && k.status === 'queued')) commit(sendPathwayCase(state, seed, rules, { crewId: crew.id, pathwayId: 'KS-01', settingId: setting.id, at: nowMs() }).state); go('pathway', 'KS-01'); } : undefined} />
          ) : route.name === 'ultrasound' ? (
            route.arg === 'heart'
              ? <Ultrasound {...shared} {...extra} rules={rules} view="heart" returnTo={{ route: 'area', arg: 'heart' }} />
              : <Ultrasound {...shared} {...extra} rules={rules} returnTo={{ route: 'pathway', arg: route.arg ?? 'KS-01' }} />
          ) : route.name === 'area' ? (
            <Area {...shared} {...extra} rules={rules} areaId={route.arg} />
          ) : route.name === 'replies' ? (
            <Replies {...shared} rules={rules} />
          ) : route.name === 'crewcheck' ? (
            <CrewCheckIn {...shared} {...extra} rules={rules} />
          ) : route.name === 'location' ? (
            <Location {...shared} {...extra} rules={rules} onChange={(id) => { const next = place(state, id, nowMs()); commit({ ...next, ui: { ...next.ui, locationManual: true } }); }} />
          ) : route.name === 'astra' ? (
            <Astra {...shared} {...extra} rules={rules} arg={route.arg} />
          ) : route.name === 'checkin' ? (
            <CheckIn {...shared} {...extra} rules={rules} />
          ) : route.name === 'feeling' ? (
            <FeelingOff {...shared} {...extra} seed={feelingSeed(setting)} rules={rules} />
          ) : route.name === 'pathway' && rules.pathways.some((w) => w.id === route.arg) ? (
            <PathwayScreen {...shared} rules={rules} pathwayId={route.arg!} />
          ) : route.name === 'gap' && reading ? (
            <Gap {...shared} rules={rules} reading={reading} />
          ) : (
            <Home {...shared} rules={rules} view={route.name === 'schedule' || route.name === 'signals' || route.name === 'sources' ? route.name : 'today'} />
          )}
        </main>

        <footer className="foot">
          <span>Assessment only, not a diagnosis. Rules are placeholders. Crew values are SYNTHETIC. {osd.credit} · NASA DONKI · NASA-STD-3001. NASA does not endorse this project.</span>
          <span>Caffeinated Innovators Australia · NASA Space Apps Challenge 2026 · <a href={REPO}>Source</a> · <a href="agents.md">For AI agents</a></span>
        </footer>
      </div>
    </TierWords.Provider>
  );
}

/** Asks for a set of vital signs after fever or chills is logged with none taken since (VP-01, CR-58). */
function VitalsPromptNote({ state, rules, crewId }: { state: State; rules: RuleFile; crewId: string }) {
  const p = vitalsPrompt(state, rules, crewId);
  if (!p) return null;
  return (
    <p className="confirm" role="note">
      <strong>{p.title}.</strong> {p.why}{' '}
      <button className="btn secondary" onClick={() => go('vitals')}>Open vital signs</button>
      {p.placeholder ? <> <span className="placeholder">Placeholder wording, awaiting clinician sign-off</span></> : null}
    </p>
  );
}

/** While waiting for Earth: a way to the AI clinical assistant, shown only when it has been turned on (FR-62). */
function AskAssistant() {
  const on = (() => { try { return loadAi(window.localStorage).assistant !== 'off'; } catch { return false; } })();
  return on ? <button type="button" className="btn secondary" onClick={() => go('assistant')}>Ask the AI clinical assistant meanwhile</button> : null;
}

/** The solar radiation storm alarm over every screen (CR-09). */
function StormShell({ state, commit, rules, setting }: { state: State; commit: (s: State) => void; rules: RuleFile; setting: Setting }) {
  const now = useStormTick(Boolean(state.storm), nowMs);
  const status = stormStatus(state, seed, rules, setting, now);
  return <StormAlarm status={status} now={now} onAcknowledge={() => commit(acknowledgeStorm(state, nowMs()))} />;
}

/** Always on screen: mission time and the alert that most needs attention (NASA display standard, Appendix F.4.2 and F.6.1). */
function StatusBar({ state, commit, rules, crewId, setting }: { state: State; commit: (s: State) => void; rules: RuleFile; crewId: string; setting: Setting }) {
  const day = daySummary(state, seed, rules, crewId);
  const noCabin = setting.habitat === false;
  const flagged = [
    ...vitalsAlerts(state, rules, crewId, setting.gravityBand).map((v) => ({ id: v.key, tier: v.tier as Tier, name: 'Vital signs', open: () => go('vitals') })),
    ...pathwayAlerts(state, seed, rules, crewId).map((p) => ({ id: p.key, tier: p.tier, name: p.name, open: () => go('pathway', p.pathwayId) })),
    ...day.flagged.filter((x) => !(noCabin && x.indicator.environment)).map((x) => ({ id: x.reading!.id, tier: x.assessment!.tier, name: x.indicator.name, open: () => go('result', x.reading!.id) })),
  ].sort((x, y) => RANK[y.tier] - RANK[x.tier]);
  const [now, setNow] = useState(nowMs());
  useEffect(() => {
    const id = window.setInterval(() => setNow(nowMs()), 1000);
    return () => window.clearInterval(id);
  }, []);
  const done = state.acknowledged ?? [];
  const open = flagged.filter((x) => !done.includes(x.id));
  const top = open[0];
  // Acknowledging an alert silences it; it does not finish it. Steps not yet ticked stay in view.
  const notSend = (s: string) => !/send the case/i.test(s);
  const todo = [
    ...day.flagged.filter((x) => !(noCabin && x.indicator.environment)).map((x) => ({ n: x.assessment!.steps.filter((s) => notSend(s) && !x.reading!.stepsDone.includes(s)).length, open: () => go('result', x.reading!.id) })),
    ...pathwayStatuses(state, seed, rules, crewId).filter((p) => p.level !== 'check').map((p) => ({ n: p.steps.filter((s) => notSend(s) && !p.stepsDone.includes(s)).length, open: () => go('pathway', p.pathway.id) })),
  ].filter((x) => x.n > 0);
  const todoCount = todo.reduce((a, b) => a + b.n, 0);
  return (
    <div className="statusbar" role="status" aria-label="Mission time and alerts">
      <span>{noCabin ? 'Time' : 'Mission time'} <span className="time">{noCabin ? hhmmss(now) : `${String(seed.missionDay).padStart(4, '0')}/${hhmmss(now)}`}</span></span>
      {(setting.strip ?? []).map((x) => <span key={x} className="strip-item">{x}</span>)}
      <span className="alertline">
        {top ? (
          <>
            <TierPill tier={top.tier} />
            <button className="open" onClick={top.open}>{top.name}{open.length > 1 ? `, and ${open.length - 1} more` : ''}</button>
            <button className="small" onClick={() => commit(acknowledge(state, top.id))}>Acknowledge</button>
          </>
        ) : flagged.length > 0 ? (
          <>
            <span>{flagged.length} {flagged.length === 1 ? 'alert' : 'alerts'} acknowledged</span>
            {todoCount > 0 ? <button className="open" onClick={todo[0].open}>{todoCount} {todoCount === 1 ? 'step' : 'steps'} still to do</button> : null}
          </>
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
      <p className="source">Rule {day.combined.ruleId}. Source: {day.combined.source} Rule confidence: {day.combined.confidence}</p>
      {day.combined.placeholder ? <span className="placeholder">Placeholder rule, awaiting clinician review</span> : null}
      <div className="btn-row">
        <button className="btn" onClick={() => onOpen(top.reading!)}>{say('See what to do, and send the case to Earth', setting)}</button>
      </div>
    </section>
  );
}

function Home({ state, commit, ui, setting, crewId, rules, view }: Shared & { rules: RuleFile; view: 'today' | 'schedule' | 'signals' | 'sources' }) {
  const tierWordsNow = { ...TIER_WORD, ...(setting.tierWords ?? {}) };
  const [showAll, setShowAll] = useState(false);
  const mine = state.symptoms.filter((s) => s.crewId === crewId);
  const nothing = state.nothingToReport.includes(crewId);
  const day = daySummary(state, seed, rules, crewId);
  // Quiet by default: a signal shows only if it is flagged, or due today and not yet logged.
  const needsYou = (x: (typeof day.items)[number]) => Boolean((x.assessment && x.assessment.tier !== 'green') || (x.due && !x.reading && x.indicator.cadence !== 'sensor'));
  const visible = day.items.filter((x) => showAll || needsYou(x));
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
  const co2 = indicatorById(seed, 'cabin-co2');
  const open = (id: string) => {
    if (id.startsWith('pathway:')) { go('pathway', id.slice(8)); return; }
    if (id.startsWith('area:')) { go('area', id.slice(5)); return; }
    const r = day.items.find((x) => x.indicator.id === id)?.reading; go(r ? 'result' : 'reading', r ? r.id : id);
  };
  const pathways = pathwayStatuses(state, seed, rules, crewId);
  for (const p of pathways) { const t = pathwayTier(p); if (t) tiers[p.pathway.region] = t; }
  const reset = () => commit({ ...initialState(seed), ui: { ...state.ui, doseLogged: false } });
  const back = <div className="btn-row"><button className="btn secondary" onClick={() => go('home')}>Back to today</button></div>;
  if (view === 'schedule') {
    return (
      <>
        <Context setting={setting} crewId={crewId} />
        <h1 className="display">Schedule</h1>
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
                {seed.clockOptions.map((c) => <button key={c} aria-pressed={c === state.ui.clock} onClick={() => ui({ clock: c, clockSetAt: nowMs() })}>{c}</button>)}
              </div>
              <button className="chip chip-toggle" aria-pressed={state.ui.slipped} onClick={() => ui({ slipped: !state.ui.slipped })}>EVA runs {seed.slipMinutes} min late</button>
            </div>
            {next ? <p><strong>Next:</strong> {next.label.toLowerCase()}, due now. It takes under a minute.</p> : <p className="muted">Nothing is due right now. Check-ins never interrupt a critical operation.</p>}
            <Timeline blocks={plan.blocks} items={plan.items} now={state.ui.clock} onOpen={open} />
          </div>
          </div>
          <div className="stack">
          <div className="card">
            <h2 className="title">Where you are: {setting.label}</h2>
            {setting.away ? <p><span className="num">{setting.away}</span> {setting.id === 'earth' ? 'to the nearest doctor.' : 'is how far away Earth is, one way.'}{setting.scenarioSynthetic ? <> <SyntheticTag /></> : null}</p> : null}
            <dl className="pack">
              <dt>Main risks here</dt><dd>{setting.risks}</dd>
              <dt>What changes</dt><dd>{setting.twist}</dd>
              <dt>If you need help</dt><dd>{setting.advice}</dd>
            </dl>
            <span className={statusClass(seed.settingStatus)}>{seed.settingStatus}</span>
          </div>
            {back}
          </div>
        </div>
      </>
    );
  }
  if (view === 'signals') {
    return (
      <>
        <Context setting={setting} crewId={crewId} />
        <h1 className="display">All signals</h1>
        <CombinedCard day={day} setting={setting} onOpen={(r) => go('result', r.id)} />
        {pathways.map((p) => <PathwayCard key={p.key} p={p} setting={setting} />)}
        <div className="grid">
          <div className="stack">
          <div className="card">
            <div className="card-head">
              <h2 className="title">Your signals</h2>
              <SyntheticTag />
            </div>
            <div className="btn-row">
              <span>{day.flagged.length + pathways.filter((p) => p.level !== 'check').length} need attention, {day.items.filter((x) => x.due && !x.reading && x.indicator.cadence !== 'sensor').length} due today, {day.items.length - day.items.filter(needsYou).length} quiet.</span>
              <button className="btn secondary" aria-pressed={showAll} onClick={() => setShowAll(!showAll)}>{showAll ? 'Show only what needs you' : `Show all ${day.items.length} signals`}</button>
            </div>
            {visible.length === 0 ? <p className="muted">Nothing needs you right now. Every signal is within range or not due.</p> : null}
            {groups.filter((g) => visible.some((x) => x.indicator.group === g)).map((g) => (
              <div key={g} className="group">
                <span className="group-name">{g}</span>
                <ul className="rows">
                  {visible.filter((x) => x.indicator.group === g).map(({ indicator: i, reading: r, assessment: a, prompted, due }) => {
                    const series = crew.mission[i.id] ?? [];
                    let lastDay = series.length;
                    while (lastDay > 0 && series[lastDay - 1] === null) lastDay -= 1;
                    const past = lastDay > 0 ? (series[lastDay - 1] as number) : undefined;
                    return (
                      <li key={i.id}>
                        <button className="row" onClick={() => open(i.id)}>
                          <span className="row-name">{i.name}{prompted && !r ? ' · asked for today' : ''}{i.standout && setting.gravityBand && i.standout.gravity.includes(setting.gravityBand) ? <strong>{` · ${i.standout.short}`}</strong> : null}</span>
                          <span className="row-val">{r || past !== undefined ? <><span className="mono">{shown(i, r ? r.value : past!)}</span> {i.unit}</> : null}{a ? <LimitArrow tier={a.tier} delta={a.delta} /> : null}</span>
                          {a ? <TierPill tier={a.tier} /> : (
                            <span className="stale">{past !== undefined ? `From day ${lastDay}. ` : 'No reading yet. '}{i.cadence === 'prompted' && !prompted && !due ? (i.weekDay !== undefined ? 'Weekly, and when asked' : 'Taken when asked') : due ? 'Due today' : i.cadence === 'weekly' ? 'Weekly' : 'Not logged today'}</span>
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

          </div>
          <div className="stack">
          <StreakCard streakDays={days} crewDone={goal.done} crewTotal={goal.total} unlocked={insights(days)}>
            {days >= 14 ? (
              <>
                <BaselineChart points={missionPoints(state, crewId, sleep, 28)} band={personalBand(crew.baseline.sleep, rules.band.k)} unit={sleep.unit} dp={sleep.dp} title="Your sleep over the past four weeks against your own range." readingLabel="Past four weeks" baselineLabel="Before launch" />
                <ChartLegend bandLabel="Own expected range" reference={false} />
              </>
            ) : null}
          </StreakCard>

            {back}
          </div>
        </div>
      </>
    );
  }
  if (view === 'sources') {
    return (
      <>
        <Context setting={setting} crewId={crewId} />
        <h1 className="display">Sources and data</h1>
      {setting.id === 'earth' ? null : (
        <section className="card" aria-label="Real NASA data in today's results">
          <h2 className="title">Real NASA data in today's results</h2>
          <ul className="rows">
            <li><button className="row" onClick={() => open('cabin-co2')}><span className="row-name">Cabin air limit of {co2.limit?.high?.toFixed(0)} {co2.unit}, one-hour average<br /><span className="caption">Limits: NASA-STD-3001 Volume 2. It decides when cabin air is Act now.</span></span><span className="chev" aria-hidden="true">›</span></button></li>
            <li><button className="row" onClick={() => go('radiation')}><span className="row-name">Radiation checks on mission days {seed.radiationDays.join(', ')}<br /><span className="caption">Data: NASA DONKI. Real solar particle events set the days the crew logs a dose.</span></span><span className="chev" aria-hidden="true">›</span></button></li>
            <li><button className="row" onClick={() => open('haemoglobin')}><span className="row-name">How far a blood count may move<br /><span className="caption">{osd.credit}. Real crew blood counts set the width of the haemoglobin range. Open the check to see them.</span></span><span className="chev" aria-hidden="true">›</span></button></li>
          </ul>
          <p className="caption">Every crew value in this demo is SYNTHETIC. These three inputs are real.</p>
        </section>
      )}

        <div className="grid">
          <div className="stack">
          {setting.id === 'earth' ? null : <SpaceWeather doseLogged={Boolean(latestReading(state, crewId, 'radiation'))} onDose={() => open('radiation')} />}

          </div>
          <div className="stack">
          <div className="card">
            <h2 className="title">The same problem, back on Earth</h2>
            <p><span className="num stat">{seed.earthBenefit.figure}</span> {seed.earthBenefit.text}</p>
            <p className="muted">A crew far from Earth and a family hours from a hospital need the same thing: care that starts before the expert arrives.</p>
            <p className="caption">Source: <a href={seed.earthBenefit.link}>{seed.earthBenefit.source}</a>.</p>
            <p>{seed.reach.earth.text} <span className="caption">Source: <a href={seed.reach.earth.link}>{seed.reach.earth.source}</a>.</span></p>
            <div><button className="btn secondary" onClick={() => commit(place(state, setting.id === 'earth' ? seed.settings[0].id : 'earth', nowMs()))}>{setting.id === 'earth' ? 'Back to the Mars base' : 'See it in remote Australia'}</button></div>
          </div>
          <div className="card">
            <h2 className="title">The same idea, on real crew data</h2>
            <p className="muted">See four real crew members' blood counts measured against their own pre-flight baselines.</p>
            <p className="caption">{osd.credit}</p>
            <div><button className="btn secondary" onClick={() => go('crew')}>Open real crew data</button></div>
          </div>
            {back}
          </div>
        </div>
      </>
    );
  }
  // Today: a picture of where things stand. What is fine stays quiet; what needs the crew member is one tap from its detail.
  const issues = [
    ...day.flagged.filter((x) => !(setting.habitat === false && x.indicator.environment)).map((x) => ({ key: x.reading!.id, tier: x.assessment!.tier as Tier | 'advisory', name: x.indicator.name, sub: x.indicator.environment ? 'Cabin reading' : x.assessment!.deltaText, val: `${shown(x.indicator, x.reading!.value)} ${x.indicator.unit}`, arrow: <LimitArrow tier={x.assessment!.tier} delta={x.assessment!.delta} />, go: () => go('result', x.reading!.id) })),
    ...pathways.map((p) => ({ key: p.key, tier: (pathwayTier(p) ?? 'advisory') as Tier | 'advisory', name: p.pathway.region, sub: p.level === 'check' ? '3 quick questions' : p.title.includes(': ') ? cap(p.title.split(': ')[1]) : p.title, val: '', arrow: null, go: () => go('pathway', p.pathway.id) })),
    ...vitalsAlerts(state, rules, crewId, setting.gravityBand).map((v) => ({ key: v.key, tier: 'red' as Tier | 'advisory', name: 'Vital signs', sub: v.title, val: '', arrow: null, go: () => go('vitals') })),
    ...day.items.filter((x) => x.due && !x.reading && x.indicator.standout && setting.gravityBand && x.indicator.standout.gravity.includes(setting.gravityBand)).map((x) => ({ key: `standout-${x.indicator.id}`, tier: 'advisory' as const, name: x.indicator.name, sub: `Due today, ${x.indicator.standout!.short}`, val: '', arrow: null, go: () => go('reading', x.indicator.id) })),
    ...(fluidVitalsCheck(state, seed, rules, crewId) ? [{ key: 'fluid-vitals', tier: 'advisory' as const, name: 'Vital signs', sub: fluidVitalsCheck(state, seed, rules, crewId)!.title, val: '', arrow: null, go: () => go('vitals') }] : []),
    ...(painDue(state, seed, rules, crewId, nowMs()) ? [{ key: 'pain-due', tier: 'advisory' as const, name: painDue(state, seed, rules, crewId, nowMs())!.region, sub: painDue(state, seed, rules, crewId, nowMs())!.title, val: '', arrow: null, go: () => go('pathway', painDue(state, seed, rules, crewId, nowMs())!.pathwayId) }] : []),
    ...(vitalsPrompt(state, rules, crewId) ? [{ key: 'vitals-prompt', tier: 'advisory' as const, name: 'Vital signs', sub: vitalsPrompt(state, rules, crewId)!.title, val: '', arrow: null, go: () => go('vitals') }] : []),
    ...(promptOpen ? [{ key: 'prompt', tier: 'advisory' as const, name: indicatorById(seed, day.prompt!.indicatorId).name, sub: 'Asked for today', val: '', arrow: null, go: () => go('reading', day.prompt!.indicatorId) }] : []),
  ].sort((a, b) => (b.tier === 'advisory' ? -1 : RANK[b.tier]) - (a.tier === 'advisory' ? -1 : RANK[a.tier]));
  const raised = issues.filter((x) => x.tier !== 'advisory');
  const worst: Tier = raised.some((x) => x.tier === 'red') ? 'red' : raised.length ? 'amber' : 'green';
  const dailyItems = day.items.filter((x) => x.indicator.cadence === 'daily');
  const dailyDone = dailyItems.filter((x) => x.reading).length;
  return (
    <>
      <Context setting={setting} crewId={crewId} />
      <div className="facts" role="group" aria-label="Where you are, and what it changes">
        {setting.g !== undefined ? <button className="fact" onClick={() => go('location')}><span className="fact-k">Gravity</span><span className="mono">{setting.g} g</span></button> : null}
        {setting.habitat !== false && setting.cabinKPa !== undefined ? <button className="fact" onClick={() => go('location')}><span className="fact-k">Cabin air</span><span className="mono">{setting.cabinKPa} kPa · {setting.o2Pct}% oxygen</span></button> : null}
        {setting.habitat !== false ? <button className="fact" onClick={() => go('radiation')}><span className="fact-k">Radiation so far</span><span className="mono">{(doseSummary(state, seed, crewId).latest?.total ?? demoValue(seed, crewId, 'radiation')).toFixed(1)} mSv</span></button> : null}
        {setting.away ? <button className="fact" onClick={() => go('location')}><span className="fact-k">{setting.id === 'earth' ? 'Nearest doctor' : 'Earth, one way'}</span><span className="mono">{setting.away}</span></button> : null}
      </div>
      <ReplyNotice state={state} crewId={crewId} setting={setting} />
      {vitalsAlerts(state, rules, crewId, setting.gravityBand).map((v) => <MonitorAlertCard key={v.key} alert={v} setting={setting} say={say} hhmm={hhmm} synthetic onEmergency={() => emergencyFor(v.construct)} />)}
      <div className="today">
        <div className="stack">
          <div className={`status-big ${worst}`} role="status">
            <span className="glyph"><TierShape tier={worst} size={56} /></span>
            <span>
              <span className="count">{raised.length === 0 ? 'All clear' : raised.length}</span>
              {raised.length > 0 ? <span className="label"> {raised.length === 1 ? 'needs you' : 'need you'}{day.combined ? ' · moved together' : ''}</span> : null}
            </span>
          </div>
          <ul className="issues" aria-label="What needs you">
            {issues.map((x) => (
              <li key={x.key}>
                <button className={`issue ${x.tier}`} onClick={x.go}>
                  <span className="glyph">{x.tier === 'advisory' ? <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 1l7 7-7 7-7-7z" /></svg> : <TierShape tier={x.tier} size={32} />}</span>
                  <span><span className="name">{x.name}</span><span className="sub">{x.tier === 'advisory' ? x.sub : `${tierWordsNow[x.tier]} · ${x.sub}`}</span></span>
                  <span className="val">{x.val}{x.arrow}</span>
                  <span className="chev" aria-hidden="true">›</span>
                </button>
              </li>
            ))}
          </ul>
          <div className="big-actions">
            <button className="btn" onClick={() => go('checkin')} disabled={dailyDone === dailyItems.length}><Ring done={dailyDone} total={dailyItems.length} />{dailyDone === dailyItems.length ? 'Checked in' : 'Check in'}</button>
            <button className="btn secondary" onClick={() => go('feeling')}>Feeling off?</button>
          </div>
        </div>
        <div className="stack">
          <div className="card">
            <div className="card-head"><h2 className="title">Tap an area</h2><SyntheticTag /></div>
            <BodyFigure onOpen={open} tiers={tiers} />
          </div>
          <div className="quiet-links">
            <button className="btn secondary" onClick={() => go('schedule')}>Schedule</button>
            <button className="btn secondary" onClick={() => go('signals')}>All signals</button>
            <button className="btn secondary" onClick={() => go('sources')}>Sources</button>
            <button className="btn secondary" onClick={() => go('vitals')}>Vital signs</button>
            <button className="btn secondary" onClick={() => go('devices')}>Devices and AI</button>
            {seed.crewCheck ? <button className="btn secondary" onClick={() => go('crewcheck')}>Weekly crew check-in{crewCheckDue(state, seed, crewId) ? <span className="due-mark"> Due</span> : <span className="done-mark"> ✓ Done</span>}</button> : null}
          </div>
          <More label={`Demo: ${crewById(seed, crewId).name.replace('Crew member', 'Crew')} · ${setting.label}`}>
      <div className="where-row">
        <div className="where">
          <span className="caption">Who are you?</span>
          <div className="seg" role="group" aria-label="Who are you?">
            {seed.crew.map((c) => <button key={c.id} aria-pressed={c.id === crewId} onClick={() => ui({ crewId: c.id })}>{c.name.replace('Crew member', 'Crew')}</button>)}
          </div>
        </div>
        <Where setting={setting} onPick={(id) => commit(place(state, id, nowMs()))} />
      </div>

          </More>
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

/** A daily target shown beside the reading, never an alert (CR-45). EVA hours raise it by the sourced amount per hour. */
function TargetLine({ target, unit }: { target: NonNullable<Indicator['target']>; unit: string }) {
  const [eva, setEva] = useState(0);
  const add = (target.perEvaHour ?? 0) * eva;
  const f = (v: number) => v.toFixed(1);
  return (
    <div className="confirm" role="note">
      <p><strong>{target.label}</strong>{add > 0 ? <>. With <span className="mono">{eva}</span> h of EVA today: <strong className="mono">{f(target.low + add)} to {f(target.high + add)} {unit}</strong></> : null}</p>
      {target.perEvaHour ? (
        <div className="chips" role="group" aria-label="Hours of EVA today">
          <span className="caption">EVA today?</span>
          <button type="button" className="chip" onClick={() => setEva((h) => Math.max(0, h - 1))} aria-label="One hour less">−</button>
          <span className="mono" aria-live="polite">{eva} h</span>
          <button type="button" className="chip" onClick={() => setEva((h) => Math.min(12, h + 1))} aria-label="One hour more">+</button>
          <span className="caption">adds {target.perEvaHour} {unit} per EVA hour</span>
        </div>
      ) : null}
      {target.note ? <p className="caption">{target.note}</p> : null}
      <More label="Source"><p className="caption">{target.source}</p></More>
    </div>
  );
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
  const pvtDetail = useRef<{ median: number; lapses: number; trials: number; falseStarts?: number } | null>(null);
  const submit = () => {
    if (!valid) return;
    try {
      const r = recordReading(state, seed, rules, { crewId, indicatorId, value: Number(n.toFixed(ind.dp)), at: nowMs() });
      const d = pvtDetail.current;
      commit(d && d.median === Number(n.toFixed(ind.dp)) ? { ...r.state, reactionDetail: { ...(r.state.reactionDetail ?? {}), [r.reading.id]: d } } : r.state);
      go('result', r.reading.id);
    } catch (e) {
      setProblem((e as Error).message);
    }
  };
  return (
    <>
      <Context setting={setting} crewId={crewId} />
      <h1 className="display">{ind.region === ind.name ? ind.name : `${ind.region}: ${ind.name.toLowerCase()}`}</h1>
      <div className="checks-nav" role="group" aria-label={`All checks in ${ind.group.toLowerCase()}`}>
        {seed.indicators.filter((i) => i.group === ind.group).map((i) => (
          <button key={i.id} className="chip chip-toggle" aria-pressed={i.id === ind.id} onClick={() => go('reading', i.id)}>{latestReading(state, crewId, i.id) ? '✓ ' : ''}{i.name}</button>
        ))}
        {areaForGroup(ind.group) ? <button className="link" onClick={() => go('area', areaForGroup(ind.group)!.id)}>Symptoms and other records for this area</button> : null}
      </div>
      <div className="grid">
        <div className="stack">
          <form className="card" onSubmit={(e) => { e.preventDefault(); submit(); }}>
            <label className="title" htmlFor="reading">{ind.input.prompt}</label>
            {ind.target ? <TargetLine target={ind.target} unit={ind.unit} /> : null}
            {ind.standout && setting.gravityBand && ind.standout.gravity.includes(setting.gravityBand) ? <p className="confirm" role="note"><strong>{ind.standout.note}</strong></p> : null}
            {ind.input.kind === 'scale' ? (
              <ScaleInput labels={ind.input.labels ?? []} value={valid ? n : undefined} onPick={(v) => setText(String(v))} />
            ) : ind.input.kind === 'test' ? (
              <ReactionTest onResult={(ms) => setText(String(ms))} onDetail={(d) => { pvtDetail.current = d; }} />
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
            <More label={ind.environment ? say("The cabin's usual range", setting) : 'Your own range'}>
            {band && ind.environment ? (
              <p>{say(`${ind.baselineLabel ?? 'Earlier in the mission'}, the cabin's one-hour average was ${band.mean.toFixed(ind.dp)} ${ind.unit}. The cabin's usual range is ${Math.max(ind.input.min, band.low).toFixed(ind.dp)} to ${band.high.toFixed(ind.dp)} ${ind.unit}. This is a reading of the shared cabin, not of you.`, setting)}</p>
            ) : band ? (
              <p>{say(ind.baselineLabel ?? 'Before launch', setting)}, your average was {band.mean.toFixed(ind.dp)} {ind.unit}. Your own expected range is {Math.max(ind.input.min, band.low).toFixed(ind.dp)} to {Math.min(ind.input.max, band.high).toFixed(ind.dp)} {ind.unit}. Every reading is compared with your own numbers.</p>
            ) : (
              <p>This is a running total, so it is compared with a limit, not with a personal range.</p>
            )}
            {ind.limit ? <p className="caption">{ind.limit.label}: {(lim.high ?? lim.low)!.toFixed(ind.dp)} {ind.unit}. Source: {ind.limit.source}.</p> : null}
            {ind.variationSource && band ? <RealBand mean={band.mean} k={rules.band.k} unit={ind.unit} dp={ind.dp} onOpen={() => go('crew')} /> : null}
            </More>
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
  const pvt = state.reactionDetail?.[reading.id];
  // The card leads with the strongest finding; any others are listed under it.
  const conf = confirmation(state, reading);
  // A Watch from one reading waits for a repeat before the crew medic and Earth are brought in (CR-35).
  const holdBack = awaitingRepeat(rules, ind, raw, conf.status);
  const a = localise({ ...raw, why: raw.findings[0]?.why ?? raw.why, steps: holdBack ? rules.steps.amber_unconfirmed! : raw.steps }, setting);
  const sent = state.outbox.some((p) => p.readingId === reading.id);
  // A follow-up question after a low reading, such as mood at 2 or below (CR-44).
  const askAfter = rules.pathways.find((w) => w.ask_after?.indicator === ind.id && reading.value <= w.ask_after.at_or_below);
  const day = daySummary(state, seed, rules, reading.crewId);
  const promptOpen = day.prompt && day.prompt.indicatorId !== ind.id && !day.items.find((x) => x.indicator.id === day.prompt!.indicatorId)?.reading;
  const others = day.flagged.filter((x) => x.indicator.id !== ind.id);
  const send = () => { commit(sendCase(state, { readingId: reading.id, settingId: setting.id, at: nowMs() }).state); go('gap', reading.id); };
  const limit = ind.limit ? (lim.high ?? lim.low) : undefined;
  return (
    <>
      <Context setting={setting} crewId={reading.crewId} />
      <div className="grid wide-left">
        <div className="stack">
          <ReadingTile label={`${ind.name}${ind.environment ? ', one-hour average' : ''}, ${hhmm(reading.at)}`} value={shown(ind, reading.value)} unit={ind.unit} delta={a.deltaText} arrow={cumulative ? null : <LimitArrow tier={raw.tier} delta={raw.delta} />} />
          <div className="card">
            <div className="card-head">
              <h2 className="title">{cumulative ? 'Against the limit' : ind.environment ? say("Against the cabin's usual range", setting) : 'Against your own baseline'}</h2>
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
                <ChartLegend bandLabel={ind.environment ? say("Cabin's usual range", setting) : 'Own expected range'} reference={Boolean(ref)} limitLabel={ind.limit?.label} />
                {ind.refSource || ind.limit ? <More label="Sources"><p className="caption">{ind.refSource ? `${ind.refSource}. ` : ''}{ind.limit ? `${ind.limit.label}: ${ind.limit.source}.` : ''}</p></More> : null}
                {ind.variationSource ? <More label="Real NASA crew data behind this range"><RealBand mean={raw.band.mean} k={rules.band.k} unit={ind.unit} dp={ind.dp} onOpen={() => go('crew')} /></More> : null}
              </>
            )}
          </div>
        </div>
        <div className="stack">
          <AlertCard a={a} synthetic actions={<>
            {pvt ? <p className="caption">Median {pvt.median} ms · lapses over 500 ms: {pvt.lapses} · {pvt.trials} taps counted · {pvt.falseStarts ?? 0} too early (recorded, not scored). PVT-style check, not NASA's Cognition battery.</p> : null}
            {a.tier !== 'green' ? <p className="confirm" role="status">{conf.status === 'confirmed' ? 'Confirmed by a second reading.' : 'Not yet confirmed. Repeat it.'}</p> : null}
            <div className="btn-row">
              {promptOpen ? <button className="btn" onClick={() => go('reading', day.prompt!.indicatorId)}>Next: reaction check</button> : a.tier === 'green' ? (
                <button className="btn" onClick={() => go('home')}>Log and finish</button>
              ) : holdBack ? (
                <button className="btn" onClick={() => go('reading', ind.id)}>Repeat the reading</button>
              ) : (
                <button className="btn" onClick={send}>{sent ? 'Open the case' : say('Send case to Earth', setting)}</button>
              )}
              {promptOpen && a.tier !== 'green' && !holdBack ? <button className="btn secondary" onClick={send}>{say('Send case to Earth', setting)}</button> : null}
              {!holdBack ? <button className="btn secondary" onClick={() => go('reading', ind.id)}>Repeat the reading</button> : null}
              <button className="btn secondary" onClick={() => go('home')}>Back to today</button>
            </div>
          </>}>
            {raw.findings.length > 1 ? (
              <ul className="plain also">
                {raw.findings.slice(1).map((f) => <li key={f.ruleId}>{say(f.why, setting)}</li>)}
              </ul>
            ) : null}
            {ind.environment && raw.tier !== 'green' ? <p className="confirm" role="note">{say('This is a reading of the shared cabin, not of one person. The air system is checked first. It becomes a health matter for you if you also have symptoms or a slower reaction time.', setting)}</p> : null}
            {ind.evidence ? <p className="caption">Two different labels. How the signal is measured: {ind.evidence === 'established' ? 'a standard instrument reading (established)' : ind.evidence === 'emerging' ? 'your own log (emerging)' : 'an uncalibrated check in this app (experimental)'}. How sure the rule is: {raw.confidence.toLowerCase()}{raw.placeholder ? ', until a clinician signs it' : ''}. {seed.evidenceStatus}</p> : null}
            {raw.findings.length > 0 ? <p className="caption">Rules that fired: {raw.findings.map((f) => f.ruleId).join(', ')}.</p> : null}
          </AlertCard>
          {askAfter ? (
            <div className="card" role="group" aria-label={askAfter.ask_after!.ask}>
              <p><strong>{say(askAfter.ask_after!.ask, setting)}</strong></p>
              <p className="caption">Tap any that apply. Tap again to take it off.</p>
              <div className="chips">
                {askAfter.core.map((o) => <button key={o} className="chip chip-toggle" aria-pressed={state.symptoms.some((x) => x.crewId === reading.crewId && x.label === o)} onClick={() => commit(toggleSymptom(state, reading.crewId, o, nowMs()))}>{o}</button>)}
              </div>
              {askAfter.privacy_note ? <p className="caption">{askAfter.privacy_note}</p> : null}
            </div>
          ) : null}
          {ind.target ? <TargetLine target={ind.target} unit={ind.unit} /> : null}
          {others.length > 0 ? (
            <div className="card">
              <span className="why-label">Also outside range today</span>
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
            </div>
          ) : null}
        </div>
      </div>
    </>
  );
}

function Gap({ state, commit, ui, setting, rules, reading }: Shared & { rules: RuleFile; reading: SavedReading }) {
  const pack = state.outbox.find((p) => p.readingId === reading.id);
  const [startAt, setStartAt] = useState(pack?.createdAt ?? nowMs());
  const [now, setNow] = useState(nowMs());
  useEffect(() => {
    const id = window.setInterval(() => setNow(nowMs()), 250);
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
          <span className="kicker">{left > 0 ? setting.gapLabel : setting.nowLabel}</span>
          <div className="gap-clock" role="timer">{clock(left)}</div>
          <p className="gap-advice">{left > 0 ? setting.advice : say(setting.id === 'earth' ? 'Help can reach you from now. Keep going with the steps until it does.' : 'The wait is over: a reply from Earth can arrive from now. Keep going with the steps until it does.', setting)}</p>
          <AskAssistant />
          {setting.scenarioSynthetic ? <SyntheticTag /> : null}
          <More label="How this is worked out">
            <p>{setting.detail}</p>
            <p className="caption">{setting.basis}</p>
            <p className="gap-problem">{problem.text} <span className="caption">Source: <a href={problem.link}>{problem.source}</a>.</span></p>
            <span className={statusClass(seed.settingStatus)}>{seed.settingStatus}</span>
          </More>
          <More label={`Demo: ${setting.label}`}>
            <Where setting={setting} onPick={(id) => { const t = nowMs(); commit(place(state, id, t)); setStartAt(t); }} />
          </More>
        </section>
        <div className="stack">
          <EarthLoop state={state} commit={commit} setting={setting} rules={rules} pack={pack}>
          <div className={`card steps-card steps-${raw.tier}`}>
            <div className="card-head">
              <span className="why-label">Meanwhile: do these now</span>
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
          </div>
          </EarthLoop>
          <div className="card">
            <More label="Case pack">
            <dl className="pack">
              <dt>Reading</dt><dd>{ind.name} {shown(ind, reading.value)} {ind.unit} ({raw.deltaText})</dd>
              <dt>{ind.environment ? 'Usual range' : 'Own range'}</dt><dd>{content.trend.ownRange[0]} to {content.trend.ownRange[1]} {ind.unit}; the past 14 days and today's readings are attached</dd>
              <dt>Assessment</dt><dd>{TIER_WORD[raw.tier]}{content.assessment.confirmedByRepeatReading ? ', confirmed by a second reading' : ', one reading so far'}. Rules {raw.ruleId}. {raw.source}</dd>
              <dt>Other signals</dt><dd>{content.otherSignalsToday.length > 0 ? content.otherSignalsToday.map((x) => `${x.indicator} ${x.value} ${x.unit}`).join('; ') : 'None today.'}</dd>
              <dt>Done so far</dt><dd>{reading.stepsDone.length > 0 ? reading.stepsDone.map((x) => cap(say(x, setting))).join(' ') : 'Nothing ticked yet.'}</dd>
              <dt>How you feel</dt><dd>{content.symptoms.length > 0 ? content.symptoms.map((x) => x.label).join(', ') : 'Nothing logged today.'}</dd>
            </dl>
            <p className="caption">{pack.status === 'queued' ? `Sent at ${hhmm(pack.createdAt)} and kept in the outbox on this device. Anything you tick or log from now is added to the case.` : `Exported at ${hhmm(pack.exportedAt ?? pack.createdAt)}.`}</p>
            </More>
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

/** The Earth end of a sent case, as the crew sees it: where the case is, the handover as sent, and any reply. */
function EarthLoop({ state, commit, setting, rules, pack, children }: { state: State; commit: (s: State) => void; setting: Setting; rules: RuleFile; pack: CasePack; children?: ReactNode }) {
  const doctor = setting.id === 'earth';
  const [now, setNow] = useState(nowMs());
  useEffect(() => {
    const id = window.setInterval(() => setNow(nowMs()), 1000);
    return () => window.clearInterval(id);
  }, []);
  const link = linkStatus(state, pack, setting, now);
  const replies = arrivedReplies(state, pack, setting, now);
  return (
    <>
      {doctor && link.status !== 'reply-in' && link.status !== 'no-link' ? null : <LinkBanner status={link.status} secondsLeft={link.secondsLeft} setting={setting} say={say} />}
      {replies.length > 0 && state.symptoms.some((x) => x.crewId === pack.crewId && x.at > replies[replies.length - 1].at) ? <p className="confirm" role="status">This reply was written before your latest symptom was logged.</p> : null}
      {replies.length > 0 ? <ReplyCard replies={replies} onAccept={(id) => commit(acceptReply(state, id, nowMs()))} hhmm={hhmm} say={say} setting={setting} /> : null}
      {children}
      <More label="Handover sent"><HandoverCard content={caseContent(state, seed, rules, pack.id)} hhmm={hhmm} setting={setting} say={say} /></More>
      <div className="btn-row">
        <button className="btn secondary" onClick={() => go('inbox', pack.id)}>{doctor ? 'See this case as the doctor sees it' : 'See this case as Earth sees it'}</button>
        {link.status === 'waiting' && !doctor ? <button className="btn secondary" onClick={() => commit({ ...state, ui: { ...state.ui, skipMs: (state.ui.skipMs ?? 0) + Math.ceil(link.secondsLeft) * 1000 } })}>Demo: skip ahead {Math.ceil(link.secondsLeft / 60)} min</button> : null}
      </div>
    </>
  );
}

/** The card on Today when logged symptoms form a pattern the rules act on. */
function PathwayCard({ p, setting }: { p: PathwayStatus; setting: Setting }) {
  return p.level === 'check' ? (
    <section className="card prompt-card" aria-live="polite">
      <div className="card-head"><AdvisoryPill>Advisory: three quick questions</AdvisoryPill><SyntheticTag /></div>
      <h2 className="title">{p.title}</h2>
      <p>{say(p.why, setting)}</p>
      <p className="source">Rule {p.pathway.id}. {p.placeholder ? 'Placeholder rule, awaiting clinician review.' : ''}</p>
      <div className="btn-row"><button className="btn" onClick={() => go('pathway', p.pathway.id)}>Answer the questions</button></div>
    </section>
  ) : (
    <section className={`alert alert-${pathwayTier(p)}`} aria-live="polite">
      <div className="card-head"><TierPill tier={pathwayTier(p)!} /><SyntheticTag /></div>
      <h2 className="title">{say(p.title, setting)}</h2>
      <p>{say(p.why, setting)}</p>
      <p className="source">Rule {p.ruleId}. Source: {p.source} Rule confidence: {p.confidence}</p>
      {p.placeholder ? <span className="placeholder">Placeholder rule, awaiting clinician review</span> : null}
      <div className="btn-row"><button className="btn" onClick={() => go('pathway', p.pathway.id)}>{p.level === 'early' ? 'See what to do' : say('See what to do, and send the case to Earth', setting)}</button></div>
    </section>
  );
}

/** One symptom pathway from start to finish: the follow-up questions, the steps, the pain log and the case for Earth. */
function PathwayScreen({ state, commit, ui, setting, crewId, rules, pathwayId }: Shared & { rules: RuleFile; pathwayId: string }) {
  const pathway = rules.pathways.find((w) => w.id === pathwayId)!;
  const p = pathwayStatuses(state, seed, rules, crewId).find((x) => x.pathway.id === pathwayId);
  const key = `pathway:${crewId}:${pathwayId}`;
  const pack = state.outbox.find((x) => x.readingId === key);
  const [startAt, setStartAt] = useState(pack?.createdAt ?? nowMs());
  const [now, setNow] = useState(nowMs());
  useEffect(() => {
    const id = window.setInterval(() => setNow(nowMs()), 250);
    return () => window.clearInterval(id);
  }, []);
  const mine = state.symptoms.filter((x) => x.crewId === crewId);
  const has = (label: string) => mine.some((x) => x.label === label);
  const pain = (state.painLog ?? []).filter((x) => x.crewId === crewId && x.pathwayId === pathwayId);
  const active = p && p.level !== 'check' ? p : undefined;
  const canSend = Boolean(active && active.level !== 'early');
  const tests = state.pathwayTests?.[key] ?? {};
  const send = () => { const r = sendPathwayCase(state, seed, rules, { crewId, pathwayId, settingId: setting.id, at: nowMs() }); commit(r.state); setStartAt(r.pack.createdAt); };
  const content = pack ? pathwayCaseContent(state, seed, rules, pack.id) : undefined;
  const left = setting.replySeconds - (now - startAt) / 1000;
  const meanwhile = (active?.steps ?? []).filter((st) => !/send the case/i.test(st) && (ultrasoundAvailable(setting) || !/ultrasound/i.test(st)));
  const done = state.pathwaySteps?.[key] ?? [];
  const context = p?.context ?? [];
  const chips = (labels: string[]) => (
    <div className="chips" role="group">
      {labels.map((o) => <button key={o} className="chip chip-toggle" aria-pressed={has(o)} onClick={() => commit(toggleSymptom(state, crewId, o, nowMs()))}>{o}</button>)}
    </div>
  );
  // A question about the pain itself, asked only once pain is reported. It is not a symptom on the general list.
  const followUps = pathway.supporting.filter((x) => (seed.symptoms.followUps ?? []).includes(x));
  const painLogged = pathway.core.some(has);
  const lastPain = pain.length > 0 ? pain[pain.length - 1].score : undefined;
  const logged = pathway.tests.filter((x) => tests[x.id]).map((x) => `${x.label.toLowerCase()} ${tests[x.id].toLowerCase()}`);
  const tier = active ? pathwayTier(active)! : undefined;
  const stepsCard = active ? (
    <div className={`card steps-card steps-${tier}`}>
      <div className="card-head"><span className="why-label">{pack ? 'Meanwhile: do these now' : 'What to do now'}</span><TierPill tier={tier!} /></div>
      {pack && pathway.while_waiting ? <p><strong>{say(pathway.while_waiting, setting)}</strong></p> : null}
      <ul className="checks">
        {meanwhile.map((st) => (
          <li key={st}>
            <button className="check" role="checkbox" aria-checked={done.includes(st)} onClick={() => commit(togglePathwayStep(state, key, st))}>
              <span className="box" aria-hidden="true">{done.includes(st) ? '✓' : ''}</span>
              <span>{cap(say(st, setting))}</span>
            </button>
          </li>
        ))}
      </ul>
      {canSend ? (
        <div className="btn-row">
          {active.level === 'red' ? <button className="btn" onClick={() => emergencyFor(12)}>Open emergency mode</button> : null}
          <button className="btn secondary" onClick={() => go('vitals')}>Record vital signs</button>
          {ultrasoundAvailable(setting) ? <button className="btn secondary" onClick={() => go('ultrasound', pathwayId)}>Guided ultrasound</button> : null}
        </div>
      ) : null}
      {canSend && (latestVitals(state, crewId) || ultrasoundSummary(state, crewId)) ? <p className="caption">{[latestVitals(state, crewId) ? `Vital signs: ${vitalsLine(latestVitals(state, crewId)!.values)}` : '', ultrasoundSummary(state, crewId) ?? ''].filter(Boolean).map((line) => <span key={line} style={{ display: 'block' }}>{line}</span>)}</p> : null}
      {pack || !canSend ? null : (
        <>
          <p className="gap-advice">{setting.advice}</p>
          <div className="btn-row"><button className="btn" onClick={send}>{say('Send case to Earth', setting)}</button></div>
        </>
      )}
    </div>
  ) : (
    <div className="card">
      <span className="why-label">Next</span>
      <p>A match gives you steps and a case to send. No match raises nothing.</p>
    </div>
  );
  return (
    <>
      <Context setting={setting} crewId={crewId} />
      <VitalsPromptNote state={state} rules={rules} crewId={crewId} />
      {fluidVitalsCheck(state, seed, rules, crewId) ? (
        <p className="confirm" role="note">
          <strong>{fluidVitalsCheck(state, seed, rules, crewId)!.title}.</strong> {fluidVitalsCheck(state, seed, rules, crewId)!.why}{' '}
          <button className="btn secondary" onClick={() => go('vitals')}>Open vital signs</button>
        </p>
      ) : null}
      {vitalsAlerts(state, rules, crewId, setting.gravityBand).map((v) => (
        <p key={v.key} className="confirm" role="note">
          <TierPill tier="red" /> A vital signs alert is also active: {v.title}. It is a separate alert; only a fever in it counts toward this pattern.{' '}
          <button className="btn secondary" onClick={() => go('vitals')}>Open vital signs</button>
        </p>
      ))}
      {active ? (
        <section className={`alert alert-${tier}`} aria-live="polite">
          <div className="card-head"><TierPill tier={tier!} /><SyntheticTag /></div>
          <h1 className="title">{say(active.title, setting)}</h1>
          <p>Not a diagnosis. A pattern to check.</p>
          {active.crewMedic ? <p className="confirm" role="note"><strong>{say(active.crewMedic, setting)}</strong></p> : null}
          {pathway.privacy_note ? <p className="confirm" role="note">{say(pathway.privacy_note, setting)}</p> : null}
          {active.earlier ? <p className="confirm" role="note">This adds to the earlier warning. It does not replace it: {active.earlier.title} (rule {active.earlier.ruleId}).</p> : null}
          {active.level === 'early' && active.matched.core.length > 0 ? <p className="confirm" role="note">You logged {active.matched.core.join(', ').toLowerCase()}. This warning still stands. Tap anything else that applies below.</p> : null}
          <More label="Why this alert?">
            <p>{say(active.why, setting)}</p>
            <p className="source">Rule {active.ruleId}. Source: {active.source} Rule confidence: {active.confidence}</p>
            {active.placeholder ? <span className="placeholder">Placeholder rule, awaiting clinician review</span> : null}
          </More>
        </section>
      ) : (
        <section className="card prompt-card" aria-live="polite">
          <div className="card-head"><AdvisoryPill>Advisory: three quick questions</AdvisoryPill><SyntheticTag /></div>
          <h1 className="title">{p ? p.title : `${pathway.region}: nothing logged`}</h1>
          <p>{p ? 'Tap what applies.' : 'Tap what applies. If nothing does, there is nothing to do here.'}</p>
        </section>
      )}
      <div className="grid wide-left steps-first">
        <div className="stack">
          <div className="card">
            <h2 className="title">{pathway.pain_repeat ? "Pain or symptoms to report" : "Symptoms to report"}</h2>
            {chips(pathway.core)}
            {painLogged && pathway.pain_repeat ? (
              <div className="follow">
                {followUps.length > 0 ? (
                  <>
                    <span className="caption">About the pain: tap if it fits.</span>
                    {chips(followUps)}
                  </>
                ) : null}
                <span className="caption" id="pain-h">Pain now, from 0 to 10</span>
                <div className="chips" role="group" aria-label="Pain score from 0, no pain, to 10, the worst you can imagine">
                  {Array.from({ length: 11 }, (_, n) => <button key={n} className="chip chip-toggle" aria-pressed={lastPain === n} onClick={() => commit(logPain(state, { crewId, pathwayId, score: n, at: nowMs() }))}>{n}</button>)}
                </div>
                {pain.length > 0 ? <p aria-live="polite">Logged: {pain.map((x) => `${x.score} at ${hhmm(x.at)}`).join(', ')}.</p> : <p className="muted">0 none · 10 worst</p>}
                {(() => {
                  const sch = active && active.level !== 'early' ? painSchedule(state, pathway, crewId) : null;
                  if (!sch || !pathway.pain_repeat) return null;
                  return <p className="confirm" role="status">{sch.settled ? pathway.pain_repeat.settled : pathway.pain_repeat.next.replace('{time}', hhmm(sch.dueAt))}</p>;
                })()}
              </div>
            ) : null}
            {pathway.supporting.filter((x) => !followUps.includes(x)).length > 0 ? (
              <>
                <h2 className="title">Also?</h2>
                {chips(pathway.supporting.filter((x) => !followUps.includes(x)))}
              </>
            ) : null}
            {pathway.urgent.length > 0 ? (
              <>
                <h2 className="title">Act now if</h2>
                {chips(pathway.urgent)}
              </>
            ) : null}
            {pathway.signed_off_by.trim().toLowerCase() === 'placeholder' ? <span className="placeholder">Placeholder list</span> : null}
          </div>
          {pathway.tests.length > 0 && (
            <div className="card">
              <div className="card-head"><h2 className="title">Add a test result</h2><SyntheticTag /></div>
              <p aria-live="polite">{logged.length > 0 ? `Urine test strip logged: ${logged.join(', ')}.` : 'Urine test strip: nothing logged yet.'}</p>
              {testNote(pathway, tests) && <p className="confirm" role="note">Urine strip only: {testNote(pathway, tests)}</p>}
              <More label="Urine test strip">
                {pathway.tests.map((x) => (
                  <div key={x.id}>
                    <div className="caption">{x.label}</div>
                    <div className="chips" role="group" aria-label={x.label}>
                      {x.options.map((o) => <button key={o} className="chip chip-toggle" aria-pressed={tests[x.id] === o} onClick={() => commit(logPathwayTest(state, rules, { crewId, pathwayId, testId: x.id, result: o }))}>{o}</button>)}
                    </div>
                  </div>
                ))}
                <p className="caption">Logged for the case. It does not change the result.</p>
              </More>
            </div>
          )}
          <div className="card">
            <More label="Your record, and NASA's reasons">
            <ul className="plain">
              {context.length > 0 ? context.map((c) => <li key={c.indicatorId}>{c.flagged ? <strong>{c.text}</strong> : c.text}</li>) : <li>Log a symptom above to see your recent trends here.</li>}
            </ul>
            {pathway.background.map((b) => <p key={b.link} className="caption">{b.text} Source: <a href={b.link}>{b.source}</a>.</p>)}
            </More>
          </div>
        </div>
        <div className="stack">
          {pack ? (
            <section className="gap" aria-label="Time until help can answer">
              <span className="kicker">{left > 0 ? setting.gapLabel : setting.nowLabel}</span>
              <div className="gap-clock" role="timer">{clock(left)}</div>
              <p className="gap-advice">{left > 0 ? setting.advice : say(setting.id === 'earth' ? 'Help can reach you from now. Keep going with the steps until it does.' : 'The wait is over: a reply from Earth can arrive from now. Keep going with the steps until it does.', setting)}</p>
              <AskAssistant />
              {setting.scenarioSynthetic ? <SyntheticTag /> : null}
              <More label="How this is worked out"><p>{setting.detail}</p><p className="caption">{setting.basis}</p></More>
              <More label={`Demo: ${setting.label}`}><Where setting={setting} onPick={(id) => { const t = nowMs(); commit(place(state, id, t)); setStartAt(t); }} /></More>
            </section>
          ) : null}
          {pack ? <EarthLoop state={state} commit={commit} setting={setting} rules={rules} pack={pack}>{stepsCard}</EarthLoop> : stepsCard}
          {pack && content ? (
            <div className="card">
              <More label="Case pack">
              <dl className="pack">
                <dt>Checked for</dt><dd>{content.pattern.checkedFor} (rule {content.pattern.rule}). Not a diagnosis.</dd>
                <dt>Assessment</dt><dd>{content.assessment.tier ? TIER_WORD[content.assessment.tier] : 'Symptoms since cleared'}</dd>
                <dt>Symptoms</dt><dd>{content.symptoms.length > 0 ? content.symptoms.map((x) => `${x.label} (${hhmm(Date.parse(x.at))})`).join(', ') : 'None logged now.'}</dd>
                <dt>Tests</dt><dd>{content.tests.map((x) => `${x.test}: ${x.result}`).join('; ') || 'None asked for.'}</dd>
                <dt>Pain scores</dt><dd>{content.painScores.length > 0 ? content.painScores.map((x) => `${x.score}/10 at ${hhmm(Date.parse(x.at))}`).join(', ') : 'None logged yet.'}</dd>
                <dt>Recent trends</dt><dd>{content.recentTrends.map((x) => x.summary).join(' ')}</dd>
                <dt>Other signals</dt><dd>{content.otherSignalsToday.length > 0 ? content.otherSignalsToday.map((x) => `${x.indicator} ${x.value} ${x.unit}`).join('; ') : 'None today.'}</dd>
                {content.records.length > 0 ? <><dt>For the record</dt><dd>{content.records.join('; ')}</dd></> : null}
                <dt>Done so far</dt><dd>{content.stepsDone.length > 0 ? content.stepsDone.map((x) => cap(say(x, setting))).join(' ') : 'Nothing ticked yet.'}</dd>
              </dl>
              <p className="caption">{pack.status === 'queued' ? `Sent at ${hhmm(pack.createdAt)} and kept in the outbox on this device. Anything you tick or log from now is added to the case.` : `Exported at ${hhmm(pack.exportedAt ?? pack.createdAt)}.`}</p>
              </More>
              <div className="btn-row"><button className="btn secondary" onClick={() => go('outbox')}>Open outbox</button></div>
            </div>
          ) : null}
        </div>
      </div>
      <div className="btn-row"><button className="btn secondary" onClick={() => go('home')}>Back to today</button></div>
    </>
  );
}

/** The crew's own inbox: every case this person has sent, where it stands, and any reply that has arrived. */
function Replies({ state, commit, setting, crewId, rules }: Shared & { rules: RuleFile }) {
  const packs = state.outbox.filter((x) => x.crewId === crewId).slice().sort((a, b) => b.createdAt - a.createdAt);
  return (
    <>
      <Context setting={setting} crewId={crewId} />
      <h1 className="display">Replies</h1>
      {packs.length === 0 ? (
        <div className="card">
          <p>{doctorSay('Nothing sent yet. When you send a case, the reply from the flight surgeon appears here as soon as the signal can bring it.', setting, say)}</p>
          <div className="btn-row"><button className="btn secondary" onClick={() => go('home')}>Back to today</button></div>
        </div>
      ) : packs.map((pack) => {
        const r = pack.pathwayId ? undefined : state.readings.find((x) => x.id === pack.readingId);
        const name = pack.pathwayId ? rules.pathways.find((w) => w.id === pack.pathwayId)?.region ?? 'Symptoms' : r ? indicatorById(seed, r.indicatorId).name : 'Case';
        return (
          <section className="stack" key={pack.id} aria-label={`Case: ${name}`}>
            <h2 className="title">{name} · sent at <span className="mono">{hhmm(pack.createdAt)}</span></h2>
            <EarthLoop state={state} commit={commit} setting={setting} rules={rules} pack={pack} />
            <div className="btn-row"><button className="btn secondary" onClick={() => (pack.pathwayId ? go('pathway', pack.pathwayId) : go('gap', pack.readingId))}>Open the case and its steps</button></div>
          </section>
        );
      })}
    </>
  );
}

function Outbox({ state, commit, rules }: Shared & { rules: RuleFile }) {
  const [file, setFile] = useState<string | null>(null);
  const queued = state.outbox.filter((p) => p.status === 'queued');
  const doExport = () => {
    const r = exportOutbox(state, seed, rules, nowMs());
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
              const c = caseContent(state, seed, rules, p.id);
              return (
                <li key={p.id}>
                  <button className="row" onClick={() => (c.kind === 'reading' ? go('gap', p.readingId) : go('pathway', c.pattern.rule))}>
                    {c.kind === 'reading' ? <span className="row-name">{c.crew}: {c.reading.indicator.toLowerCase()} <span className="mono">{c.reading.value}</span> {c.reading.unit}</span> : <span className="row-name">{c.crew}: {c.pattern.region.toLowerCase()} symptoms</span>}
                    {c.assessment.tier ? <TierPill tier={c.assessment.tier} /> : null}
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
    'Any rule or line of advice still marked as a placeholder. Signed-off ones show "Reviewed by our clinical lead".',
    'Clinician sign-off is a team review for this prototype, not a flight medical authority\'s approval.',
    'All crew values. They are SYNTHETIC.',
  ];
  const needed = [
    'Rules written and tested by flight clinicians against real cases, including rules that change by environment.',
    'The device links tested with flight hardware, and speech recognition that runs on the device with no internet.',
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
