// The ISBAR handover card, the remote doctor's reply card and the one-line link banner.
// AI assistance: drafted with Claude Code (see AI_USE.md).
import { useContext } from 'react';
import { isbar, type CaseContent, type LinkState } from '../core/handover.ts';
import type { EarthReply, Setting } from '../core/types.ts';
import { SyntheticTag, TierWords } from './ui';
import './handover.css';

type Say = (text: string, s: Setting) => string;

/** Setting words, plus "flight surgeon" read as the on-call doctor wherever "Earth" is swapped and the setting has no word of its own for it. */
export function doctorSay(text: string, setting: Setting, say: Say): string {
  const out = say(text, setting);
  const w = setting.words ?? {};
  return w.Earth && !w['flight surgeon'] ? out.split('flight surgeon').join('on-call doctor') : out;
}

export const DECISION_WORDS: Record<EarthReply['decision'], string> = {
  agree: 'Agrees with the steps',
  add: 'Adds a step',
  change: 'Changes the plan',
  escalate: 'Escalates the case',
};

export function HandoverCard({ content, hhmm, setting, say }: { content: CaseContent; hhmm?: (t: number) => string; setting?: Setting; say?: Say }) {
  const words = useContext(TierWords);
  const sections = isbar(content, { time: hhmm ? (iso) => hhmm(Date.parse(iso)) : undefined, tierWord: (t) => words[t] });
  const s = (t: string) => (setting && say ? doctorSay(t, setting, say) : t);
  // In the Earth twin the same case is told for the person at the remote station: no crew, mission day or planet.
  const twin = setting?.id === 'earth';
  if (twin) {
    const id = sections.find((x) => x.key === 'I');
    if (id) id.lines = id.lines.filter((l) => !l.startsWith('Mission day')).map((l) => (l.startsWith('Crew member:') ? `Person: Sam, station hand${content.synthetic ? ' (SYNTHETIC)' : ''}` : l.startsWith('Place:') ? 'Place: Remote desert station, Australia, 640 km from the nearest doctor (SYNTHETIC scenario)' : l));
  }
  return (
    <section className="card" aria-label="Handover">
      <div className="card-head"><h2 className="title">Handover</h2>{content.synthetic ? <SyntheticTag /> : null}</div>
      <dl className="x-ei-isbar">
        {sections.map((x) => (
          <div key={x.key}>
            <dt><span className="mono" aria-hidden="true">{x.key}</span>{x.label}</dt>
            <dd><ul>{x.lines.map((l, i) => <li key={i}>{s(l)}</li>)}</ul></dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

/** The doctor's replies, shown as written. With onAccept the crew can add the reply to their steps; without it the card only reports whether they have. */
export function ReplyCard({ replies, onAccept, hhmm, say, setting }: { replies: EarthReply[]; onAccept?: (replyId: string) => void; hhmm: (t: number) => string; say: Say; setting: Setting }) {
  if (!replies.length) return null;
  return (
    <section className="card" aria-label={doctorSay('Replies from the flight surgeon', setting, say)}>
      <h2 className="title">{doctorSay(replies.length > 1 ? 'Replies from the flight surgeon' : 'Reply from the flight surgeon', setting, say)}</h2>
      {replies.map((r) => (
        <article key={r.id} className="x-ei-reply">
          <div className="card-head">
            <span className="title">{DECISION_WORDS[r.decision]}</span>
            <span className="caption">Sent at <span className="mono">{hhmm(r.at)}</span></span>
          </div>
          <p className="x-ei-note">{r.note}</p>
          {r.steps.length ? (
            <>
              <span className="why-label">Steps added</span>
              <ol className="steps">{r.steps.map((st, i) => <li key={i}>{st}</li>)}</ol>
            </>
          ) : null}
          {r.acceptedAt !== undefined ? (
            <p aria-live="polite">{onAccept ? 'Added' : 'Added by the crew'} at <span className="mono">{hhmm(r.acceptedAt)}</span></p>
          ) : onAccept ? (
            <div className="btn-row"><button className="btn" onClick={() => onAccept(r.id)}>Add to my steps</button></div>
          ) : (
            <p className="caption">Not yet added by the crew.</p>
          )}
        </article>
      ))}
    </section>
  );
}

function clock(totalSeconds: number): string {
  const s = Math.max(0, Math.ceil(totalSeconds));
  const h = Math.floor(s / 3600);
  const mm = String(Math.floor((s % 3600) / 60)).padStart(2, '0');
  const ss = String(s % 60).padStart(2, '0');
  return h ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

/** One line on where a case stands. No link is missing data, so it is cyan with a broken-link shape and the words "No link". */
export function LinkBanner({ status, secondsLeft, setting, say }: { status: LinkState; secondsLeft: number; setting: Setting; say: Say }) {
  const s = (t: string) => doctorSay(t, setting, say);
  if (status === 'no-link') {
    return (
      <div className="x-ei-banner x-ei-banner-stale" role="status">
        <svg viewBox="0 0 20 20" width="20" height="20" aria-hidden="true" fill="none" strokeWidth="2" strokeLinecap="round"><path d="M8 6H6a4 4 0 0 0 0 8h2M12 6h2a4 4 0 0 1 0 8h-2M3 17L17 3" /></svg>
        <span><span className="x-ei-banner-word">No link.</span> {s('No link to Earth. The case is queued and leaves when the link returns.')}</span>
      </div>
    );
  }
  const text = status === 'waiting'
    ? <>{s('Case sent to Earth. The earliest a reply can arrive is in')} <span className="mono">{clock(secondsLeft)}</span>.</>
    : status === 'reply-in'
      ? <>{s('A reply from Earth is in. Read it below.')}</>
      : <>{s('Case sent to Earth. No reply has come back yet.')}</>;
  const word = status === 'waiting' ? 'On its way.' : status === 'reply-in' ? 'Reply in.' : 'Waiting.';
  return (
    <div className="x-ei-banner x-ei-banner-info" role="status">
      <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true"><path d="M8 1l7 7-7 7-7-7z" /></svg>
      <span><span className="x-ei-banner-word">{word}</span> {text}</span>
    </div>
  );
}
