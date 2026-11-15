// Devices and AI: what the AI in this app does and never does, the voice, and the crew's connected devices.
// AI assistance: drafted with Claude Code (see AI_USE.md).
import { useState } from 'react';
import type { Seed, Setting, State } from '../core/index.ts';
import { DEVICE_KIT, simulatedReading, type DeviceInfo } from '../core/devices.ts';
import { vitalsLine } from '../core/vitals.ts';
import { SyntheticTag } from '../components/ui.tsx';
import { canListen, canSpeak, speak } from '../components/voice.ts';
import { bluetoothAvailable, readBluetooth } from '../components/bluetooth.ts';
import '../components/voice.css';

export interface DevicesProps {
  state: State; commit: (s: State) => void; ui: (p: Partial<State['ui']>) => void; setting: Setting; crewId: string;
  seed: Seed; go: (route: string, arg?: string) => void; say: (text: string, s: Setting) => string; hhmm: (t: number) => string;
}

const MEASURES: Record<string, string> = { temp: 'temperature', hr: 'pulse', sbp: 'blood pressure', dbp: '', rr: 'breathing rate', spo2: 'oxygen saturation' };
const measuresLine = (d: DeviceInfo) => d.measures.map((m) => MEASURES[m]).filter(Boolean).join(', ');

export function Devices({ seed, go, crewId }: DevicesProps) {
  const demos = seed.demoVitals ?? [];
  const [setId, setSetId] = useState(demos[0]?.id ?? '');
  const [reads, setReads] = useState<Record<string, string>>({});
  const person = seed.crew.find((c) => c.id === crewId);
  const set = demos.find((d) => d.id === setId);

  const readSim = (d: DeviceInfo) => { if (set) setReads((r) => ({ ...r, [d.id]: `${vitalsLine(simulatedReading(d, set.values))} (simulated, ${set.label})` })); };
  const readReal = async (d: DeviceInfo) => {
    setReads((r) => ({ ...r, [d.id]: 'Choose the device in the browser\'s list, then take a reading on it.' }));
    try { const got = await readBluetooth(d); setReads((r) => ({ ...r, [d.id]: `${vitalsLine(got.values)} (from ${got.name})` })); }
    catch (e) { setReads((r) => ({ ...r, [d.id]: `Nothing was read. ${(e as Error).message}` })); }
  };

  return (
    <section className="stack x-dv" aria-labelledby="x-dv-h">
      <div className="card">
        <div className="card-head"><h1 id="x-dv-h" className="title">Devices and AI</h1><span className="x-dv-tag">AI voice</span></div>
        <p>AI listens, speaks and fills in the forms. Connected devices supply the numbers. The clinicians' rules decide.</p>
        <div className="x-dv-two">
          <div>
            <p className="why-label">The AI does</p>
            <ul>
              <li>Hear what you say and take down the numbers.</li>
              <li>Ask each question aloud and read every value back.</li>
              <li>Read an alert and its first steps aloud.</li>
            </ul>
          </div>
          <div>
            <p className="why-label">The AI never does</p>
            <ul>
              <li>Set a tier or raise an alert. Rules do that.</li>
              <li>Name a condition or suggest a treatment.</li>
              <li>Change a rule, or send anything without you.</li>
            </ul>
          </div>
        </div>
        <p className="caption">A value from voice or a device goes through the same possible-range check and the same signed rules as a typed value. Where it came from is kept with it and sent with the case.</p>
        <div className="btn-row">
          <button type="button" className="btn" onClick={() => go('vitals')}>Vital signs by voice or device</button>
          <button type="button" className="btn secondary" onClick={() => go('checkin')}>Daily check-in by voice</button>
        </div>
      </div>

      <div className="card">
        <h2 className="title">Voice in this browser</h2>
        <ul className="rows">
          <li><div className="row"><span className="row-name">The app speaks</span><span>{canSpeak() ? 'Ready' : 'Not in this browser'}</span></div></li>
          <li><div className="row"><span className="row-name">The app listens</span><span>{canListen() ? 'Ready, off until you tap' : 'Not in this browser. Answers are typed.'}</span></div></li>
        </ul>
        {canSpeak() ? <div className="btn-row"><button type="button" className="btn secondary" onClick={() => { void speak(`Hello${person ? ` ${person.name}` : ''}. I will ask for each value, take down what you say, and read it back.`); }}>Hear the voice</button></div> : null}
        <p className="caption">The voice works with no internet on most devices. In some browsers speech recognition sends the audio to the browser maker and needs the internet. A flight version would run it on the device.</p>
      </div>

      <div className="card">
        <div className="card-head"><h2 className="title">Crew devices</h2><SyntheticTag /></div>
        <p className="caption">The kit the app assumes a crew carries: what a smartwatch-class wearable gives, plus the instruments in a crew medical kit. In this demo the kit is simulated and every reading is SYNTHETIC.</p>
        {demos.length > 1 ? (
          <div className="chips" role="group" aria-label="Which moment the simulated kit reads">
            {demos.map((d) => <button key={d.id} type="button" className="chip chip-toggle" aria-pressed={d.id === setId} onClick={() => { setSetId(d.id); setReads({}); }}>{d.label}</button>)}
          </div>
        ) : null}
        <ul className="x-dv-list">
          {DEVICE_KIT.map((d) => (
            <li key={d.id} className="x-dv-item">
              <span className="x-dv-name">{d.name}</span>
              <span className="caption">{d.kind}. Measures {measuresLine(d)}.{d.bluetooth ? ` Bluetooth format: ${d.bluetooth.name}.` : ''}</span>
              <div className="btn-row">
                <button type="button" className="btn secondary" onClick={() => readSim(d)}>Read now</button>
                {d.bluetooth && bluetoothAvailable() ? <button type="button" className="btn secondary" onClick={() => { void readReal(d); }}>Read a real one over Bluetooth</button> : null}
              </div>
              {reads[d.id] ? <p className="x-dv-read" role="status">{reads[d.id]}</p> : null}
            </li>
          ))}
        </ul>
        <p className="caption">{bluetoothAvailable() ? 'This browser can read real Bluetooth devices.' : 'This browser cannot read Bluetooth devices. Chrome or Edge on a computer or Android phone can.'} The readers follow the published Bluetooth formats for heart rate, temperature, blood pressure and pulse oximetry, and are checked by automated tests against example data.</p>
        <p className="source">Formats: Bluetooth SIG Heart Rate, Health Thermometer, Blood Pressure and Pulse Oximeter services. See Sources.</p>
      </div>
    </section>
  );
}
