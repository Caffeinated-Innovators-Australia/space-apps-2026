// Screens that show real NASA data: crew blood counts (OSDR OSD-569) and space weather (DONKI).
// AI assistance: drafted with Claude Code (see AI_USE.md).
import { useState } from 'react';
import { BaselineChart, ChartLegend, type ChartPoint } from '../components/BaselineChart';
import { TierPill } from '../components/ui';
import { personalBand, tierFor, type Rule, type Tier } from '../core/index.ts';
import donki from '../data/donki_sep.json';
import osd from '../data/osd569_cbc.json';
import seedJson from '../data/seed.json';

const demo = seedJson as unknown as { radiationPrompt: { status: string; step: string } };
function decimals(values: number[]): number {
  return Math.min(2, Math.max(...values.map((v) => (String(v).split('.')[1] ?? '').length)));
}

export function CrewData({ rule }: { rule: Rule }) {
  const subjects = [...new Set(osd.series.map((s) => s.subject))];
  const analytes = [...new Set(osd.series.map((s) => s.analyte))];
  const [subject, setSubject] = useState(subjects[1] ?? subjects[0]);
  const [analyte, setAnalyte] = useState('Haemoglobin');
  const s = osd.series.find((x) => x.subject === subject && x.analyte === analyte)!;
  const pre = s.points.filter((p) => p.phase === 'pre-flight');
  const post = s.points.filter((p) => p.phase === 'post-flight');
  const dp = decimals(s.points.map((p) => p.value));
  const sd = (osd.variation as Record<string, { pooledSd: number }>)[analyte].pooledSd;
  const band = personalBand(pre.map((p) => p.value), rule.band.k, sd);
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
      <p className="muted">Four crew members had blood taken three times before launch and four times after return. We build each person's own range from their pre-flight draws: their own average, plus or minus two standard deviations of the variation seen within these crew members before launch. Then we check every later draw against it. There are no in-flight draws in this dataset.</p>
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
          Own expected range: {band.low.toFixed(dp)} to {band.high.toFixed(dp)} {unit}. Laboratory reference range: {s.refMin} to {s.refMax} {unit}.
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

export function SpaceWeather({ doseLogged, onDose }: { doseLogged: boolean; onDose: () => void }) {
  const latest = donki.events[0];
  const same = donki.events.filter((e) => e.time === latest.time);
  const when = new Date(latest.time).toLocaleString('en-AU', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'UTC' });
  return (
    <div className="card">
      <h2 className="title">Space weather: radiation check</h2>
      <p>
        Latest solar particle event on record: <strong>{when} UTC</strong>. {donki.eventDaysInPeriod} days with events in the past {donki.periodDays} days.
      </p>
      <p className="caption">Instruments or models, as listed by DONKI: {same.map((e) => e.instruments.join(', ').replace(/^MODEL: /, '')).join('; ')}. Real DONKI records for near-Earth space, bundled on {donki.fetched}.</p>
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
