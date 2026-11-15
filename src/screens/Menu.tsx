// Menu: settings people rarely change, as cards of standard list rows. Privacy, thresholds, inputs, accessibility, sources and demo controls.
// AI assistance: drafted with Claude Code (see AI_USE.md).
import { statusClass } from '../components/ui.tsx';
import { useState } from 'react';
import { PrivacyTable } from '../components/PrivacyTable';
import { initialState, type Indicator, type RuleFile, type Seed, type Setting, type State } from '../core/index.ts';
import './x-mo.css';

type PrivacyRow = { what: string; you: string; medic: string; surgeon: string; crew: string };
type WithPrivacy = Seed & { privacy?: { status: string; rows: PrivacyRow[] } };

export interface MenuProps {
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

const INPUT_WORDS: Record<Indicator['input']['kind'], string> = {
  number: 'Typed in',
  scale: 'Tapped on a scale',
  test: 'A test in the app',
  vision: 'A test in the app',
  sensor: 'Simulated sensor in this demo: no device is connected',
};
const EVIDENCE_WORDS: Record<NonNullable<Indicator['evidence']>, string> = { established: 'Established', emerging: 'Emerging', experimental: 'Experimental' };

import { changePlace } from '../core/handover.ts';
import { noteGravityChange } from '../core/profiles.ts';

export function Menu({ state, commit, ui, setting, seed, go, say }: MenuProps) {
  const [confirmReset, setConfirmReset] = useState(false);
  const privacy = (seed as WithPrivacy).privacy;
  const theme = state.ui.theme === 'day' ? 'day' : 'cabin';
  return (
    <>
      <div className="context"><span className="kicker">Settings people rarely change</span></div>
      <h1 className="display">Menu</h1>

      <h2 className="title x-mo-section">Privacy and sharing</h2>
      {privacy ? <PrivacyTable rows={privacy.rows} status={privacy.status} /> : <div className="card"><p className="caption">The sharing policy is not in this build's data.</p></div>}

      <div className="card">
        <h2 className="title">More checks and settings</h2>
        <ul className="rows">
          {[['astra', 'Emergency checklists', 'Sixteen emergency checklists, by touch or voice. A separate team prototype'], ['devices', 'Devices and AI', 'Voice, connected devices, and what the AI does and never does'], ['ai', 'AI connections', 'A small language model for voice, and the AI clinical assistant. Off unless turned on'], ['assistant', 'AI clinical assistant', 'For when Earth or the flight surgeon cannot be reached'], ['vitals', 'Vital signs', 'By voice, from a device, or typed'], ['crewcheck', 'Weekly crew check-in', 'Five questions, seen by the flight psychologist only'], ['location', 'Location', 'Gravity, cabin atmosphere and what changes']].map(([route, name, sub]) => (
            <li key={route}>
              <button className="row" onClick={() => go(route)}>
                <span className="row-name">{say(name, setting)}<br /><span className="caption">{say(sub, setting)}</span></span>
                <span className="chev" aria-hidden="true">›</span>
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div className="card">
        <h2 className="title">Thresholds</h2>
        <ul className="rows">
          <li>
            <button className="row" onClick={() => go('medic')}>
              <span className="row-name">{say('Set by the crew medic, not by you', setting)}<br /><span className="caption">See the rules and which ones still wait for a clinician's sign-off.</span></span>
              <span className="chev" aria-hidden="true">›</span>
            </button>
          </li>
        </ul>
      </div>

      <div className="card">
        <h2 className="title">Devices and inputs</h2>
        <p className="caption">How each check-in gets into the app, honestly.</p>
        <ul className="rows">
          {seed.indicators.map((i) => (
            <li key={i.id}>
              <div className="row x-mo-static">
                <span className="row-name">{say(i.name, setting)}</span>
                <span className="row-val">{INPUT_WORDS[i.input.kind]}</span>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <div className="card">
        <h2 className="title">Accessibility</h2>
        <div className="seg" role="group" aria-label="Theme">
          <button aria-pressed={theme === 'cabin'} onClick={() => ui({ theme: 'cabin' })}>Cabin (dark)</button>
          <button aria-pressed={theme === 'day'} onClick={() => ui({ theme: 'day' })}>Day (light)</button>
        </div>
        <p className="caption">Text is at least 16 px, and every tier has a shape and a word as well as a colour.</p>
      </div>

      <div className="card">
        <h2 className="title">Sources and evidence</h2>
        <p>Any signal can raise Act now. An experimental check still says so on its card.</p>
        <ul className="rows">
          {seed.indicators.map((i) => (
            <li key={i.id}>
              <div className="row x-mo-static">
                <span className="row-name">{say(i.name, setting)}</span>
                <span className="row-val">{i.evidence ? EVIDENCE_WORDS[i.evidence] : 'Not labelled yet'}</span>
              </div>
            </li>
          ))}
        </ul>
        {seed.evidenceStatus ? <span className={statusClass(seed.evidenceStatus)}>{seed.evidenceStatus}</span> : null}
        <div className="btn-row">
          <button className="btn secondary" onClick={() => go('crew')}>Real crew data</button>
          <button className="btn secondary" onClick={() => go('about')}>Limits of this app</button>
        </div>
      </div>

      <div className="card">
        <h2 className="title">For the demo</h2>
        <p className="caption">These controls exist only to show the app. A real mission would not have them.</p>
        <div className="seg" role="group" aria-label="Where are you?">
          {seed.settings.map((c) => <button key={c.id} aria-pressed={c.id === setting.id} onClick={() => commit(noteGravityChange(changePlace(state, c.id, Date.now()), setting, c, Date.now()))}>{c.label}</button>)}
        </div>
        <ul className="rows">
          <li>
            <button className="row" onClick={() => go('inbox')}>
              <span className="row-name">{setting.id === 'earth' ? 'Doctor inbox' : 'Earth inbox'}<br /><span className="caption">{say('The flight surgeon\'s end of a case. On a mission this screen is on Earth, not on the crew\'s device.', setting)}</span></span>
              <span className="chev" aria-hidden="true">›</span>
            </button>
          </li>
        </ul>
        <div className="btn-row x-mo-section">
          <button className="chip chip-toggle" aria-pressed={!!state.ui.linkDown} onClick={() => ui({ linkDown: !state.ui.linkDown })}>{say('No link to Earth', setting)}</button>
        </div>
        {confirmReset ? (
          <div className="x-mo-confirm" role="group" aria-label="Confirm reset">
            <p>Reset the demo? This clears every reading, log and case on this device. Your theme and place stay as they are.</p>
            <div className="btn-row">
              <button className="btn" onClick={() => { commit({ ...initialState(seed), ui: state.ui }); setConfirmReset(false); }}>Reset the demo</button>
              <button className="btn secondary" onClick={() => setConfirmReset(false)}>Cancel</button>
            </div>
          </div>
        ) : (
          <div className="btn-row"><button className="btn secondary" onClick={() => setConfirmReset(true)}>Reset the demo</button></div>
        )}
      </div>
    </>
  );
}
