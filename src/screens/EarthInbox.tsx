// The remote doctor's screen: incoming cases, the ISBAR handover, what the crew has done, and a reply composer.
// AI assistance: drafted with Claude Code (see AI_USE.md).
import { useState } from 'react';
import { doctorSay, HandoverCard, LinkBanner, ReplyCard } from '../components/Handover';
import { SyntheticTag, TierPill } from '../components/ui';
import { caseContent, settingById, type RuleFile, type Seed, type Setting, type State } from '../core/index.ts';
import { linkStatus, repliesFor, replyToCase, type CaseContent } from '../core/handover.ts';
import type { EarthReply } from '../core/types.ts';

export interface EarthInboxProps {
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
  /** Open this case at once, for example from a route argument. */
  caseId?: string;
}

const CHOICES: { id: EarthReply['decision']; label: string }[] = [
  { id: 'agree', label: 'Agree with the steps' },
  { id: 'add', label: 'Add a step' },
  { id: 'change', label: 'Change the plan' },
  { id: 'escalate', label: 'Escalate' },
];

function about(c: CaseContent): string {
  return c.kind === 'reading'
    ? `${c.reading.indicator} ${c.reading.value} ${c.reading.unit}`
    : `${c.pattern.region} symptoms, to check for: ${c.pattern.checkedFor.toLowerCase()}`;
}

export function EarthInbox(props: EarthInboxProps) {
  const { state, setting, seed, rules, say, hhmm } = props;
  const [open, setOpen] = useState<string | undefined>(props.caseId);
  const s = (t: string) => doctorSay(t, setting, say);
  const remote = Boolean(setting.words?.Earth);
  const cases = [...state.outbox].sort((a, b) => b.createdAt - a.createdAt);
  const pack = open ? state.outbox.find((p) => p.id === open) : undefined;

  return (
    <>
      <div className="context"><span className="kicker">{s('Flight surgeon · Earth')}</span><SyntheticTag /></div>
      <h1 className="display">{remote ? 'On-call doctor inbox' : 'Earth inbox'}</h1>
      <p className="placeholder" role="note">
        {remote
          ? 'Demo: this device plays both ends. In real use this screen is with the on-call doctor.'
          : 'Demo: this device plays both ends. On a mission this screen is on Earth.'}
      </p>
      {pack ? <CaseView {...props} packId={pack.id} onBack={() => setOpen(undefined)} /> : (
        <div className="card">
          <h2 className="title">Incoming cases</h2>
          {cases.length === 0 ? <p>{s('No cases yet. A case appears here when the crew sends one to Earth.')}</p> : (
            <ul className="rows">
              {cases.map((p) => {
                const c = caseContent(state, seed, rules, p.id);
                const replied = repliesFor(state, p.id).length > 0;
                return (
                  <li key={p.id}>
                    <button className="row" onClick={() => setOpen(p.id)}>
                      {c.assessment.tier ? <TierPill tier={c.assessment.tier} /> : <span className="stale">No tier now</span>}
                      <span className="row-name">{c.crew}: {about(c)}</span>
                      <span className="caption">Sent <span className="mono">{hhmm(p.createdAt)}</span> · {replied ? 'Replied' : 'No reply yet'}</span>
                      <span className="chev" aria-hidden="true">›</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </>
  );
}

function CaseView({ state, commit, setting, seed, rules, say, hhmm, packId, onBack }: EarthInboxProps & { packId: string; onBack: () => void }) {
  const [decision, setDecision] = useState<EarthReply['decision'] | null>(null);
  const [note, setNote] = useState('');
  const [steps, setSteps] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pack = state.outbox.find((p) => p.id === packId)!;
  const c = caseContent(state, seed, rules, packId);
  const replies = repliesFor(state, packId);
  const caseSetting = settingById(seed, pack.settingId);
  const link = linkStatus(state, pack, caseSetting, Date.now());
  const s = (t: string) => doctorSay(t, setting, say);

  const send = () => {
    if (!decision) { setError('Pick a decision first.'); return; }
    try {
      const r = replyToCase(state, { caseId: packId, decision, note, steps: steps.split('\n'), at: Date.now() });
      commit(r.state);
      setDecision(null); setNote(''); setSteps(''); setError(null); setSent(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  return (
    <div className="stack">
      <div className="btn-row"><button className="btn secondary" onClick={onBack}>‹ All cases</button></div>
      <LinkBanner status={link.status} secondsLeft={link.secondsLeft} setting={setting} say={say} />
      <div className="grid wide-left">
        <HandoverCard content={c} hhmm={hhmm} setting={setting} say={say} />
        <div className="stack">
          <section className="card" aria-label="What the crew has done so far">
            <h2 className="title">What the crew has done so far</h2>
            {c.stepsGiven.length === 0 ? <p className="caption">No steps were given with this case.</p> : (
              <ul className="x-ei-done">
                {c.stepsGiven.map((st) => {
                  const done = c.stepsDone.includes(st) || /send the case/i.test(st); // the case is here, so it was sent
                  return <li key={st}><span className={`x-ei-done-mark ${done ? 'yes' : 'no'}`}>{done ? '✓ Done' : 'Not yet'}</span><span>{s(st)}</span></li>;
                })}
              </ul>
            )}
          </section>
          <ReplyCard replies={replies} hhmm={hhmm} say={say} setting={setting} />
          <section className="card" aria-label="Your reply">
            <h2 className="title">Your reply</h2>
            <div className="seg" role="group" aria-label="Your decision">
              {CHOICES.map((x) => <button key={x.id} aria-pressed={decision === x.id} onClick={() => { setDecision(x.id); setSent(false); }}>{x.label}</button>)}
            </div>
            <div className="x-ei-field">
              <label htmlFor="x-ei-note">Your note</label>
              <textarea id="x-ei-note" className="x-ei-textarea" placeholder="Write your reply" value={note} onChange={(e) => { setNote(e.target.value); setSent(false); }} />
            </div>
            <div className="x-ei-field">
              <label htmlFor="x-ei-steps">Steps to add (optional, one per line)</label>
              <textarea id="x-ei-steps" className="x-ei-textarea" value={steps} onChange={(e) => { setSteps(e.target.value); setSent(false); }} />
            </div>
            {error ? <p className="x-ei-error" role="alert">{error}</p> : null}
            <div className="btn-row"><button className="btn" disabled={!decision || !note.trim()} onClick={send}>Send</button></div>
            {sent ? <p aria-live="polite">Reply sent. It reaches the crew after the one-way delay.</p> : null}
          </section>
        </div>
      </div>
    </div>
  );
}
