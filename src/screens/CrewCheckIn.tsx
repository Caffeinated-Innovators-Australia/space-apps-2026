// The weekly crew check-in: five statements answered 1 to 5, kept for the flight psychologist only. No tier is ever shown for it.
// AI assistance: drafted with Claude Code (see AI_USE.md).
import { useState } from 'react';
import { SyntheticTag, statusClass } from '../components/ui';
import { crewById } from '../core/actions.ts';
import { crewCheckDue, crewCheckShare, recordCrewCheck, weekOf } from '../core/crewcheck.ts';
import type { RuleFile } from '../core/rules.ts';
import type { Seed, Setting, State } from '../core/types.ts';
import './x-cc.css';

export interface CrewCheckInProps {
  state: State; commit: (s: State) => void; ui: (p: Partial<State['ui']>) => void; setting: Setting; crewId: string;
  seed: Seed; rules: RuleFile; go: (route: string, arg?: string) => void; say: (text: string, s: Setting) => string; hhmm: (t: number) => string;
}

const SCALE = [1, 2, 3, 4, 5];

export function CrewCheckIn({ state, commit, setting, crewId, seed, go, say, hhmm }: CrewCheckInProps) {
  const crew = crewById(seed, crewId);
  const cc = seed.crewCheck;
  const [answers, setAnswers] = useState<(number | undefined)[]>(() => (cc ? cc.items.map(() => undefined) : []));
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [again, setAgain] = useState(false);
  const [problem, setProblem] = useState('');

  const context = (
    <div className="context">
      <span className="kicker">{setting.id === 'earth' ? setting.kicker : `${crew.name} · ${setting.kicker}`}</span>
      <SyntheticTag />
    </div>
  );

  if (!cc) {
    return (
      <>
        {context}
        <h1 className="display">Weekly crew check-in</h1>
        <p>This mission has no crew check-in set up.</p>
        <div className="btn-row"><button type="button" className="btn" onClick={() => go('home')}>Back to Today</button></div>
      </>
    );
  }

  const week = weekOf(seed.missionDay);
  const share = crewCheckShare(state, seed);
  const done = !crewCheckDue(state, seed, crewId);
  const answered = answers.filter((a) => a !== undefined).length;
  const complete = answered === cc.items.length;
  const [low, high] = cc.scale.split(/\s+to\s+/);

  const pick = (i: number, n: number) => {
    setProblem('');
    setAnswers((a) => a.map((v, j) => (j === i ? n : v)));
  };

  const finish = () => {
    if (!complete) return;
    try {
      const at = Date.now();
      commit(recordCrewCheck(state, seed, { crewId, answers: answers as number[], at }));
      setSavedAt(at);
      setAgain(false);
      setAnswers(cc.items.map(() => undefined));
    } catch (e) {
      setProblem((e as Error).message);
    }
  };

  const privacy = (
    <>
      <p className="caption">{say('Your answers go to the flight psychologist only. Never to crewmates or the crew medic.', setting)}</p>
      <p className="caption">{say(cc.label, setting)}</p>
      <span className={statusClass(cc.status)}>{cc.status}</span>
    </>
  );

  if (done && !again) {
    return (
      <>
        {context}
        <h1 className="display">Weekly crew check-in</h1>
        <section className="card stack" aria-labelledby="x-cc-saved" aria-live="polite">
          <div className="card-head"><h2 className="title" id="x-cc-saved">Saved</h2><SyntheticTag /></div>
          <p>{savedAt ? `Your answers for week ${week} were saved at ${hhmm(savedAt)}.` : `Your answers for week ${week} are saved.`}</p>
          <p><span className="mono">{share.completed}</span> of <span className="mono">{share.of}</span> crew have completed it this week.</p>
          {privacy}
          <div className="btn-row">
            <button type="button" className="btn" onClick={() => go('home')}>Back to Today</button>
            <button type="button" className="btn secondary" onClick={() => { setSavedAt(null); setAgain(true); }}>Change my answers</button>
          </div>
        </section>
      </>
    );
  }

  return (
    <>
      {context}
      <h1 className="display">Weekly crew check-in</h1>
      <form className="card stack" aria-labelledby="x-cc-head" onSubmit={(e) => { e.preventDefault(); finish(); }} noValidate>
        <div className="card-head"><h2 className="title" id="x-cc-head">Week <span className="mono">{week}</span> · {cc.items.length} statements</h2><SyntheticTag /></div>
        <p className="caption" id="x-cc-scale">Answer each one from {cc.scale}.</p>
        <ol className="x-cc-list">
          {cc.items.map((item, i) => {
            const qid = `x-cc-q${i}`;
            return (
              <li className="x-cc-item" key={item}>
                <p className="x-cc-q" id={qid}><span className="x-cc-num">{i + 1}.</span>{say(item, setting)}</p>
                <div className="x-cc-scale" role="group" aria-labelledby={qid} aria-describedby="x-cc-scale">
                  {SCALE.map((n) => (
                    <button
                      key={n}
                      type="button"
                      className="x-cc-btn"
                      aria-pressed={answers[i] === n}
                      aria-label={n === 1 ? `1, ${low ?? ''}`.trim() : n === 5 ? `5, ${high ?? ''}`.trim() : String(n)}
                      onClick={() => pick(i, n)}
                    >{n}</button>
                  ))}
                </div>
              </li>
            );
          })}
        </ol>
        {problem ? <p className="caption" role="alert">{problem}</p> : null}
        {privacy}
        <div className="btn-row">
          <button type="submit" className="btn" disabled={!complete}>Finish</button>
          {again ? <button type="button" className="btn secondary" onClick={() => setAgain(false)}>Keep my saved answers</button> : null}
          <span className="caption" aria-live="polite"><span className="mono">{answered}</span> of <span className="mono">{cc.items.length}</span> answered</span>
        </div>
      </form>
    </>
  );
}
