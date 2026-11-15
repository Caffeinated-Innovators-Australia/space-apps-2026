// Radiation screen: the crew member's running dose against the career limit, recent daily increases and real space weather.
// AI assistance: drafted with Claude Code (see AI_USE.md).
import { useEffect, useRef, useState } from 'react';
import { SyntheticTag } from '../components/ui';
import type { RuleFile, Seed, Setting, State } from '../core/index.ts';
import { doseSummary, eventDays, missionEvents } from '../core/radiation.ts';
import { endStorm, startStormDrill } from '../core/storm.ts';
import donki from '../data/donki_sep.json';
import './x-ri.css';

export interface RadiationProps {
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
}

/** The chart is drawn at its real width, one unit to one pixel, so its text is the same size as the text around it on every device. */
function useWidth(): [React.RefObject<HTMLDivElement | null>, number] {
  const ref = useRef<HTMLDivElement | null>(null);
  const [w, setW] = useState(500);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => setW(Math.max(260, Math.min(640, Math.round(el.clientWidth))));
    measure();
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, w];
}

function Diamond({ x, y, r = 6, className }: { x: number; y: number; r?: number; className?: string }) {
  return <path className={className} d={`M${x} ${y - r}L${x + r} ${y}L${x} ${y + r}L${x - r} ${y}z`} />;
}

function listDays(days: number[]): string {
  if (days.length <= 1) return days.join('');
  return `${days.slice(0, -1).join(', ')} and ${days[days.length - 1]}`;
}

function DailyChart({ daily, events, unit, dp }: { daily: { day: number; increase: number }[]; events: number[]; unit: string; dp: number }) {
  const [wrap, W] = useWidth();
  const H = 240, L = 44, R = 8, T = 72, B = 52;
  const n = daily.length;
  const max = Math.max(0.1, ...daily.map((d) => d.increase));
  const top = max * 1.1;
  const bw = (W - L - R) / Math.max(1, n);
  const y = (v: number) => T + ((top - Math.max(0, v)) / top) * (H - T - B);
  const x = (i: number) => L + (i + 0.5) * bw;
  const step = Math.max(1, Math.ceil(36 / bw));
  const f = (v: number) => v.toFixed(dp);
  const marked = daily.map((d, i) => ({ ...d, i })).filter((d) => events.includes(d.day));
  const label = marked.length ? `Daily increase in dose for the past ${n} days, from ${f(Math.min(...daily.map((d) => d.increase)))} to ${f(max)} ${unit} a day. Solar event days in this range: ${marked.map((d) => d.day).join(', ')}.` : `Daily increase in dose for the past ${n} days, from ${f(Math.min(...daily.map((d) => d.increase)))} to ${f(max)} ${unit} a day. No solar event days in this range.`;
  return (
    <div ref={wrap} className="chart-wrap">
      <svg className="chart x-ri-chart" width={W} height={H} viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label}>
        <text x={4} y={18}>{unit} added each day</text>
        <text x={L - 6} y={y(max) + 5} textAnchor="end">{f(max)}</text>
        <text x={L - 6} y={y(0) + 5} textAnchor="end">0</text>
        <line className="x-ri-axis" x1={L} x2={W - R} y1={y(0)} y2={y(0)} />
        <line className="x-ri-axis" x1={L} x2={W - R} y1={y(max)} y2={y(max)} strokeDasharray="3 4" />
        {daily.map((d, i) => (
          <g key={d.day}>
            <rect className="x-ri-bar" x={x(i) - bw * 0.3} y={y(d.increase)} width={bw * 0.6} height={Math.max(1, y(0) - y(d.increase))} />
            {i % step === 0 || i === n - 1 ? <text x={x(i)} y={H - B + 22} textAnchor="middle">{d.day}</text> : null}
          </g>
        ))}
        {marked.map((d, k) => {
          const tx = Math.min(W - R - 90, Math.max(4, x(d.i) - 40));
          return (
            <g key={`e${d.day}`}>
              <Diamond className="x-ri-event" x={x(d.i)} y={T - 8} />
              <text className="x-ri-event-text" x={tx} y={k % 2 ? 56 : 40}>solar event</text>
            </g>
          );
        })}
        <text x={W - R} y={H - 6} textAnchor="end">Mission day</text>
      </svg>
    </div>
  );
}

export function Radiation({ state, commit, setting, crewId, seed, go, hhmm }: RadiationProps) {
  const dose = doseSummary(state, seed, crewId);
  const evDays = eventDays(seed);
  const start = (seed as Seed & { missionStart?: string }).missionStart;
  const records = start ? missionEvents(start, seed.missionDay, donki.events) : [];
  const latestEvent = records[0];
  const when = latestEvent ? new Date(latestEvent.time).toLocaleString('en-AU', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'UTC' }) : '';
  const f = (v: number) => v.toFixed(dose.dp);
  const pct = dose.share !== null ? (dose.share * 100).toFixed(1) : null;
  const n = dose.daily.length;
  return (
    <>
      <div className="context">
        <span className="kicker">Radiation · personal dosimeter</span>
        <SyntheticTag />
      </div>
      <h1 className="display">Radiation</h1>
      <p className="muted">Know your dose and where it is heading.</p>
      {seed.radiationForecast && setting.habitat !== false ? (
        <div className="card">
          <div className="card-head"><h2 className="title">Solar radiation storm drill</h2><SyntheticTag /></div>
          <p>Runs a SYNTHETIC forecast of a level {seed.radiationForecast.level} solar radiation storm, so the crew can practise the shelter alarm.</p>
          <div className="btn-row">
            <button type="button" className="btn" onClick={() => commit(startStormDrill(state, Date.now() + (state.ui.skipMs ?? 0)))}>{state.storm ? 'Restart the drill' : 'Start the drill'}</button>
            {state.storm ? <button type="button" className="btn secondary" onClick={() => commit(endStorm(state))}>End the drill</button> : null}
          </div>
        </div>
      ) : null}

      <div className="card">
        <div className="card-head">
          <h2 className="title">Your mission total</h2>
          <SyntheticTag />
        </div>
        {dose.latest ? (
          <>
            <p className="x-ri-total">
              <span className="num">{f(dose.latest.total)}</span>
              <span className="x-ri-unit">{dose.unit}</span>
              <SyntheticTag />
            </p>
            <p className="caption">
              {dose.latest.loggedToday && dose.latest.at !== undefined ? `Today's dosimeter reading, logged at ${hhmm(dose.latest.at)}.` : `At the end of mission day ${dose.latest.day}. Today's reading is not logged yet.`}
            </p>
          </>
        ) : (
          <p className="muted">No dose on record yet.</p>
        )}
        {dose.latest && dose.limit && pct !== null ? (
          <>
            <div className="x-ri-meter" role="progressbar" aria-valuemin={0} aria-valuemax={dose.limit.value} aria-valuenow={dose.latest.total} aria-label={`${pct}% of the ${dose.limit.label}`}>
              <div className="x-ri-meter-fill" style={{ width: `${Math.min(100, dose.share! * 100)}%` }} />
            </div>
            <div className="x-ri-meter-scale" aria-hidden="true"><span>0</span><span>{dose.limit.value} {dose.unit}</span></div>
            <p>
              <span className="mono">{pct}%</span> of the {dose.limit.label} of <span className="mono">{dose.limit.value}</span> {dose.unit}.
            </p>
            <p className="source">Limit from {dose.limit.source}.</p>
          </>
        ) : null}
        <p className="caption">Dose from earlier flights is not counted here.</p>
      </div>

      {n > 0 ? (
        <div className="card">
          <div className="card-head">
            <h2 className="title">Added each day, past {n} days</h2>
            <SyntheticTag />
          </div>
          <DailyChart daily={dose.daily} events={evDays} unit={dose.unit} dp={dose.dp} />
          <div className="legend">
            <span><i className="x-ri-swatch" /> Dose added that day</span>
            <span className="x-ri-key"><svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><path d="M8 1l7 7-7 7-7-7z" /></svg> solar event</span>
          </div>
          <details className="x-ri-list">
            <summary>Show as a list</summary>
            <ul>
              {dose.daily.map((d) => (
                <li key={d.day}>Day {d.day}: <span className="mono">{d.increase.toFixed(dose.dp)}</span> {dose.unit}{evDays.includes(d.day) ? ', solar event' : ''}</li>
              ))}
            </ul>
          </details>
          {dose.daysToLimit !== null ? (
            <p>
              At the past {n} days' rate, the limit is <span className="mono">{dose.daysToLimit.toLocaleString('en-AU')}</span> days away. <span className="caption">Our arithmetic, from SYNTHETIC values.</span>
            </p>
          ) : (
            <p>
              At the past {n} days' rate the total is not rising, so there is nothing to project. <span className="caption">Our arithmetic, from SYNTHETIC values.</span>
            </p>
          )}
        </div>
      ) : null}

      <div className="card">
        <h2 className="title">Space weather</h2>
        {records.length > 0 ? (
          <p>
            <span className="mono">{records.length}</span> real solar particle event {records.length === 1 ? 'record falls' : 'records fall'} in the mission so far, on mission {evDays.length === 1 ? 'day' : 'days'} {listDays(evDays)}.
          </p>
        ) : evDays.length > 0 ? (
          <p>Real solar particle events fall on mission {evDays.length === 1 ? 'day' : 'days'} {listDays(evDays)}.</p>
        ) : (
          <p>No real solar particle events on record in the mission so far.</p>
        )}
        {latestEvent ? <p>Latest: <strong>{when} UTC</strong>, mission day {latestEvent.day}.</p> : null}
        <p className="caption">These are real records for near-Earth space, bundled with the app on {donki.fetched}. They are not measured at your location.</p>
        <p className="caption">{donki.credit}. {donki.source}.</p>
      </div>

      <div className="card">
        <h2 className="title">If a solar storm is announced</h2>
        <span className="placeholder">Shelter steps are written by the mission, not by this app. Placeholder, awaiting the team's review.</span>
        <div className="btn-row">
          <button className="btn" onClick={() => go('reading', 'radiation')}>Log today's dosimeter reading</button>
        </div>
      </div>
    </>
  );
}
