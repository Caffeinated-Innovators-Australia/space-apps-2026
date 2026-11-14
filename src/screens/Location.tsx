// Location screen: one setting says where the crew is; gravity and cabin atmosphere change how things are shown.
// AI assistance: drafted with Claude Code (see AI_USE.md).
import { useState } from 'react';
import { AdvisoryPill, SyntheticTag } from '../components/ui';
import type { RuleFile, Seed, Setting, State } from '../core/index.ts';
import { adapting, displayBands, massFromScale, profileFacts, whatChanges } from '../core/profiles.ts';
import './x-lp.css';

export interface LocationProps {
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
  /** The shell changes the place (with changePlace); this screen never does it itself. */
  onChange: (settingId: string) => void;
}

const BAND_WORDS: Record<string, string> = { zero: 'zero gravity', lunar: 'Moon gravity', martian: 'Mars gravity', earth: 'Earth gravity' };
const PLACEHOLDER = 'Placeholder, awaiting clinician review';

function ScaleCard({ setting }: { setting: Setting }) {
  const g = setting.g;
  const [reading, setReading] = useState(() => (g && g > 0 ? Math.round(70 * g * 10) / 10 : 0));
  if (g === undefined) return null;
  if (g === 0 || setting.gravityBand === 'zero') {
    return (
      <section className="card" aria-labelledby="x-lp-scale">
        <h2 className="title" id="x-lp-scale">Body mass</h2>
        <p>Scales do not work without gravity. The body-mass measuring device is used instead.</p>
      </section>
    );
  }
  if (g === 1 || setting.gravityBand === 'earth') {
    return (
      <section className="card" aria-labelledby="x-lp-scale">
        <h2 className="title" id="x-lp-scale">Body mass</h2>
        <p>A scale reads true here. No conversion is needed.</p>
      </section>
    );
  }
  const step = (d: number) => setReading((r) => Math.max(0.5, Math.round((r + d) * 10) / 10));
  const mass = massFromScale(reading, g);
  return (
    <section className="card" aria-labelledby="x-lp-scale">
      <div className="card-head">
        <h2 className="title" id="x-lp-scale">Body mass from a scale</h2>
        <SyntheticTag />
      </div>
      <p className="caption">A scale set up on Earth reads weight. Divide the reading by the gravity here to get mass.</p>
      <div className="x-lp-scale">
        <button className="btn secondary x-lp-step" onClick={() => step(-0.5)} aria-label="Lower the example reading by 0.5 kg">−</button>
        <p className="x-lp-sum" aria-live="polite">
          <span className="mono">{reading.toFixed(1)} kg</span> ÷ <span className="mono">{g}</span> = <span className="mono x-lp-mass">{mass?.toFixed(1)} kg</span>
        </p>
        <button className="btn secondary x-lp-step" onClick={() => step(0.5)} aria-label="Raise the example reading by 0.5 kg">+</button>
      </div>
      <p className="caption">Example reading on the scale, then body mass.</p>
    </section>
  );
}

export function Location({ state, setting, seed, onChange }: LocationProps) {
  const adapt = adapting(state, setting, Date.now());
  const changes = whatChanges(setting);
  const bands = displayBands(setting);
  return (
    <>
      <div className="context"><span className="kicker">Settings · Location</span></div>
      <h1 className="display">Location</h1>

      {adapt.active ? (
        <section className="card x-lp-adapt" aria-label="Adapting to new gravity">
          <div className="card-head">
            <AdvisoryPill />
          </div>
          <p>
            Adapting to new gravity: <span className="mono">{adapt.daysLeft}</span> {adapt.daysLeft === 1 ? 'day' : 'days'} left. Drift from your old baseline can raise Watch only.
          </p>
          <p className="caption">Moved from {BAND_WORDS[adapt.from] ?? adapt.from}.</p>
          <span className="placeholder">{PLACEHOLDER}: the length of this period</span>
        </section>
      ) : null}

      <fieldset className="card x-lp-places">
        <legend className="title x-lp-legend">Where the crew is</legend>
        <p className="caption">Set by mission control. You can change it here for the demo.</p>
        <ul className="x-lp-list">
          {seed.settings.map((s) => {
            const facts = profileFacts(s).map((f) => f.value).join(' · ');
            const checked = s.id === setting.id;
            return (
              <li key={s.id}>
                <label className={`x-lp-place${checked ? ' x-lp-on' : ''}`}>
                  <input type="radio" name="x-lp-place" value={s.id} checked={checked} onChange={() => onChange(s.id)} />
                  <span className="x-lp-text">
                    <span className="x-lp-name">{s.label}</span>
                    <span className="x-lp-facts">{facts}</span>
                  </span>
                </label>
              </li>
            );
          })}
        </ul>
      </fieldset>

      <section className="card" aria-labelledby="x-lp-changes">
        <div className="card-head">
          <h2 className="title" id="x-lp-changes">What changes here</h2>
        </div>
        <ul className="x-lp-changes">
          {changes.map((ch) => (
            <li key={ch.area}>
              <span className="x-lp-area">{ch.area}</span>
              <span>{ch.text}</span>
              {ch.builtBy === 'emergency module' ? <span className="caption">Shown in the emergency steps.</span> : null}
            </li>
          ))}
        </ul>
        <span className="placeholder">{PLACEHOLDER}. Source: clinical lead, build pack.</span>
      </section>

      <ScaleCard key={setting.id} setting={setting} />

      <section className="card" aria-labelledby="x-lp-bands">
        <h2 className="title" id="x-lp-bands">Display bands</h2>
        <p className="caption">How readings are shown here. Below the first number a reading shows as low; below the second, as very low.</p>
        <ul className="rows">
          <li>
            <div className="row x-lp-static">
              <span className="row-name">Oxygen saturation</span>
              <span className="mono">{bands.oxygenSaturation.lo} / {bands.oxygenSaturation.critLo} %</span>
            </div>
          </li>
          {bands.cabinPressure ? (
            <li>
              <div className="row x-lp-static">
                <span className="row-name">Cabin pressure</span>
                <span className="mono">{bands.cabinPressure.lo} / {bands.cabinPressure.critLo} kPa</span>
              </div>
            </li>
          ) : null}
        </ul>
        <p>{bands.note}</p>
        <span className="placeholder">{PLACEHOLDER}: every band on this card</span>
      </section>
    </>
  );
}
