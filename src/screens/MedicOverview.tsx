// Crew medic overview: the crew sorted by what needs the medic, showing only what the privacy policy allows, and the rules awaiting sign-off.
// AI assistance: drafted with Claude Code (see AI_USE.md).
import { SyntheticTag, TierPill } from '../components/ui';
import type { RuleFile, Seed, Setting, State } from '../core/index.ts';
import { crewOverview, rulesAwaitingSignOff, type MedicRow } from '../core/medic.ts';
import './x-mo.css';

export interface MedicOverviewProps {
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

function RowBody({ r, hhmm }: { r: MedicRow; hhmm: (t: number) => string }) {
  const extra = [
    ...r.confirmedUrgent.map((u) => `${u.indicator}: Urgent, confirmed by a repeat reading at ${hhmm(u.at)}`),
    ...r.urgentPathways.map((p) => `${p.checkFor}: symptom pattern to check for, Urgent, case sent`),
  ];
  return (
    <>
      <span className="row-name">
        {r.name}
        <br />
        <span className="caption">
          {r.cases.count === 0 ? 'No cases sent' : `${r.cases.count} ${r.cases.count === 1 ? 'case' : 'cases'} sent${r.cases.newestAt !== null ? `, newest ${hhmm(r.cases.newestAt)}` : ''}`}
          {' · '}Check-ins <span className="mono">{r.checkIns.done}</span> of <span className="mono">{r.checkIns.total}</span> today
          {' · '}Streak <span className="mono">{r.checkIns.streakDays}</span> {r.checkIns.streakDays === 1 ? 'day' : 'days'}
        </span>
        {extra.map((x) => <span key={x} className="caption"><br />{x}</span>)}
      </span>
      {r.topTier ? <TierPill tier={r.topTier} /> : <span className="row-val">{r.nothingShared ? 'Nothing shared' : 'Case sent'}</span>}
    </>
  );
}

export function MedicOverview({ state, setting, seed, rules, go, say, hhmm }: MedicOverviewProps) {
  const rows = crewOverview(state, seed, rules);
  const cabin = rows[0]?.cabin ?? [];
  const signOff = rulesAwaitingSignOff(rules);
  const waiting = signOff.filter((x) => x.placeholder).length;
  return (
    <>
      <div className="context"><span className="kicker">{say('For the crew medic', setting)}</span><SyntheticTag /></div>
      <h1 className="display">{say('Crew medic overview', setting)}</h1>
      <p className="muted">You see tiers and cases people have sent, never their raw readings or logs.</p>

      <div className="card">
        <div className="card-head">
          <h2 className="title">Crew, most serious first</h2>
          <SyntheticTag />
        </div>
        <ul className="rows" aria-label="Crew members">
          {rows.map((r) => (
            <li key={r.crewId}>
              {r.cases.count > 0 ? (
                <button className="row" onClick={() => go('outbox')} aria-label={`${r.name}: open the outbox to read the cases sent`}>
                  <RowBody r={r} hhmm={hhmm} />
                  <span className="chev" aria-hidden="true">›</span>
                </button>
              ) : (
                <div className="row x-mo-static"><RowBody r={r} hhmm={hhmm} /></div>
              )}
            </li>
          ))}
        </ul>
        {cabin.length ? (
          <>
            <h3 className="x-mo-section">{say('Shared cabin readings', setting)}</h3>
            <ul className="rows">
              {cabin.map((c) => (
                <li key={c.indicatorId}>
                  <div className="row x-mo-static">
                    <span className="row-name">{say(c.indicator, setting)}<br /><span className="caption">Latest at {hhmm(c.at)}. Everyone sees this: it is the shared {say('cabin', setting)}.</span></span>
                    <span className="row-val"><span className="mono">{c.value}</span> {c.unit}</span>
                    <TierPill tier={c.tier} />
                  </div>
                </li>
              ))}
            </ul>
          </>
        ) : <p className="caption">No shared {say('cabin', setting)} readings logged today.</p>}
      </div>

      <div className="card">
        <div className="card-head">
          <h2 className="title">Rules awaiting your sign-off</h2>
          <span className="row-val"><span className="mono">{waiting}</span> of <span className="mono">{signOff.length}</span> are placeholders</span>
        </div>
        <p>To sign a rule off, a clinician replaces <code className="mono">signed_off_by: placeholder</code> with their role in the rules file.</p>
        <ul className="x-mo-lines">
          {signOff.map((x) => (
            <li key={x.id} className="x-mo-line">
              <span className="x-mo-id">{x.id}</span>
              <span className="x-mo-what">{x.what}</span>
              <span className="caption">{x.kind} · confidence {x.confidence}</span>
              {x.placeholder ? <span className="placeholder">Placeholder, awaiting clinician review</span> : <span className="caption">Signed off</span>}
              <span className="source x-mo-full">Source: {x.source}</span>
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}
