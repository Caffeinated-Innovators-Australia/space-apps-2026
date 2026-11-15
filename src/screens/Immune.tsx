// Infections and healing screen: one-tap symptoms that belong to the immune system, and a daily healing tracker.
// AI assistance: drafted with Claude Code (see AI_USE.md).
import { SyntheticTag, statusClass } from '../components/ui';
import { toggleSymptom, type RuleFile, type Seed, type Setting, type State } from '../core/index.ts';
import { checkWound, startWound, WOUND_LABELS, WOUND_STATUSES, woundsFor, woundSummary, type WoundStatus } from '../core/wounds.ts';
import './x-ri.css';

export interface ImmuneProps {
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

const IMMUNE_SYMPTOMS = ['Rash', 'Fever or chills', 'Sore throat', 'Cut slow to heal', 'Cold sore'];

const STATUS_WORD: Record<WoundStatus, string> = { better: 'Better', same: 'Same', worse: 'Worse' };
const STATUS_GLYPH: Record<WoundStatus, string> = { better: '↑', same: '=', worse: '↓' };

const SOURCE = {
  quote: 'Radiation, microgravity, poor sleep and other spaceflight stressors can alter the immune system of astronauts.',
  title: 'NASA, Risk of Altered Immune System Responses',
  url: 'https://www.nasa.gov/reference/risk-of-altered-immune-system-responses/',
};

export function Immune({ state, commit, setting, crewId, seed, go, say, hhmm }: ImmuneProps) {
  const options = seed.symptoms.options.filter((o) => IMMUNE_SYMPTOMS.includes(o));
  const mine = state.symptoms.filter((s) => s.crewId === crewId && options.includes(s.label));
  const wounds = woundsFor(state, crewId);
  const now = Date.now();
  const tracked = new Set(wounds.map((w) => w.label));
  return (
    <>
      <div className="context">
        <span className="kicker">Immune system · skin and healing</span>
      </div>
      <h1 className="display">Infections and healing</h1>

      {options.length > 0 ? (
        <div className="card">
          <div className="card-head">
            <h2 className="title">Log it in one tap</h2>
            <SyntheticTag />
          </div>
          <div className="chips" role="group" aria-label="Infection and healing symptoms">
            {options.map((o) => (
              <button key={o} className="chip chip-toggle" aria-pressed={mine.some((x) => x.label === o)} onClick={() => commit(toggleSymptom(state, crewId, o, Date.now()))}>{o}</button>
            ))}
          </div>
          {mine.length > 0 ? (
            <p aria-live="polite">Logged: {mine.map((x) => `${x.label.toLowerCase()} at ${hhmm(x.at)}`).join(', ')}. {say('This goes in your next case to Earth.', setting)}</p>
          ) : (
            <p className="muted" aria-live="polite">Nothing logged here today. One tap is enough.</p>
          )}
          <p className="caption">Only you see this unless you send it. <button className="link" onClick={() => go('about')}>Who sees what</button></p>
          <span className={statusClass(seed.symptoms.status)}>{seed.symptoms.status}</span>
        </div>
      ) : null}

      <div className="card">
        <div className="card-head">
          <h2 className="title">Healing tracker</h2>
          <SyntheticTag />
        </div>
        <p>Start tracking a skin problem, then once a day tap Better, Same or Worse.</p>
        <div className="chips" role="group" aria-label="Start tracking">
          {WOUND_LABELS.map((label) => (
            <button key={label} className="chip chip-toggle" aria-pressed={tracked.has(label)} disabled={tracked.has(label)} aria-label={tracked.has(label) ? `${label}: already tracked` : `Start tracking: ${label}`} onClick={() => commit(startWound(state, { crewId, label, at: Date.now() }).state)}>
              {tracked.has(label) ? `${label} ✓` : `+ ${label}`}
            </button>
          ))}
        </div>
        {wounds.length > 0 ? (
          <ul className="x-ri-wounds">
            {wounds.map((w) => {
              const s = woundSummary(w, now);
              const todays = s.noCheckToday ? undefined : s.checks[s.checks.length - 1].status;
              return (
                <li key={w.id} className="x-ri-wound">
                  <div className="x-ri-wound-head">
                    <h3 className="title">{w.label}</h3>
                    <span>{s.days === 0 ? `Started today at ${hhmm(w.startedAt)}` : <><span className="mono">{s.days}</span> {s.days === 1 ? 'day' : 'days'} since you started tracking</>}</span>
                  </div>
                  <div className="seg" role="group" aria-label={`How is the ${w.label.toLowerCase()} today?`}>
                    {WOUND_STATUSES.map((st) => (
                      <button key={st} aria-pressed={todays === st} onClick={() => commit(checkWound(state, w.id, st, Date.now()))}>
                        <span className="x-ri-glyph" aria-hidden="true">{STATUS_GLYPH[st]}</span> {STATUS_WORD[st]}
                      </button>
                    ))}
                  </div>
                  {s.noCheckToday ? (
                    <span className="x-ri-stale"><svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" strokeWidth="2" /></svg>Not checked yet today</span>
                  ) : null}
                  {s.checks.length > 0 ? (
                    <ol className="x-ri-checks" aria-label={`Checks so far for the ${w.label.toLowerCase()}`}>
                      {s.checks.map((c) => (
                        <li key={c.at}>
                          <span className="x-ri-glyph" aria-hidden="true">{STATUS_GLYPH[c.status]}</span>
                          <span>{c.day === 0 ? 'First day' : `Day ${c.day}`}: {STATUS_WORD[c.status]}</span>
                        </li>
                      ))}
                    </ol>
                  ) : null}
                </li>
              );
            })}
          </ul>
        ) : null}
        <p className="caption">No photo is kept. What a slow-healing wound means is for your crew medic: send it if it worries you.</p>
      </div>

      <div className="card">
        <h2 className="title">Why this matters in space</h2>
        <blockquote className="x-ri-quote">"{SOURCE.quote}"</blockquote>
        <p className="source">{SOURCE.title}. {SOURCE.url}</p>
      </div>
    </>
  );
}
