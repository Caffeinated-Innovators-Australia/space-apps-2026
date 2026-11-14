// The handover to the remote doctor in ISBAR order, the doctor's replies, and the state of the link to Earth.
// AI assistance: drafted with Claude Code (see AI_USE.md).
import type { caseContent } from './actions.ts';
import type { Tier } from './rules.ts';
import type { CasePack, EarthReply, Setting, State } from './types.ts';

export type CaseContent = ReturnType<typeof caseContent>;

export interface IsbarSection { key: 'I' | 'S' | 'B' | 'A' | 'R'; label: 'Identify' | 'Situation' | 'Background' | 'Assessment' | 'Request'; lines: string[] }

export interface IsbarOptions {
  /** How a logged time is written. Defaults to HH:MM from the ISO time. */
  time?: (iso: string) => string;
  /** The word for a tier. Defaults to the app's tier words. */
  tierWord?: (t: Tier) => string;
}

const TIER_WORDS: Record<Tier, string> = { green: 'Self-manage', amber: 'Crew medic', red: 'Urgent' };
export const NOT_A_DIAGNOSIS = 'Assessment and next steps only. Not a diagnosis.';
export const REQUEST_LINE = 'Please review and advise on next steps.';

const list = (items: string[], none: string) => (items.length ? items.map((x) => x.replace(/\.$/, '')).join('; ') : none);

/** Turn either kind of case into a handover in ISBAR order. Every line comes from a field already in the case; nothing clinical is added. */
export function isbar(content: CaseContent, opts: IsbarOptions = {}): IsbarSection[] {
  const time = opts.time ?? ((iso: string) => iso.slice(11, 16));
  const tw = opts.tierWord ?? ((t: Tier) => TIER_WORDS[t]);
  const synthetic = content.synthetic ? ' (SYNTHETIC)' : '';
  const identify = [
    `Crew member: ${content.crew}${synthetic}`,
    `Mission day ${content.missionDay}`,
    `Place: ${content.setting}`,
    `Case ${content.caseId}, sent at ${time(content.createdAt)}`,
  ];
  const symptoms = content.symptoms.map((s) => `${s.label} at ${time(s.at)}`);
  const others = content.otherSignalsToday.map((o) => `${o.indicator} ${o.value} ${o.unit} (${tw(o.tier)})`);
  const stepsGiven = `Steps given: ${list(content.stepsGiven, 'none')}`;
  const stepsDone = `Steps done: ${list(content.stepsDone, 'none yet')}`;

  if (content.kind === 'reading') {
    const r = content.reading;
    const t = content.trend;
    const last = t.last14Days.map((v) => (v === null ? 'no entry' : String(v)));
    const situation = [
      `Reading: ${r.indicator} ${r.value} ${r.unit}, taken at ${time(r.takenAt)}`,
      `Change from own baseline: ${r.changeFromBaseline}`,
      `Confirmed by a repeat reading today: ${content.assessment.confirmedByRepeatReading ? 'yes' : 'no'}`,
    ];
    const background = [
      `Own range: ${t.ownRange[0]} to ${t.ownRange[1]} ${r.unit} (baseline average ${t.baselineMean})`,
      `Last ${last.length} days: ${list(last, 'nothing logged')}`,
      `Today: ${list(t.today.map(String), 'no readings')}`,
      `Symptoms logged: ${list(symptoms, 'none')}`,
      `Other signals today: ${list(others, 'none')}`,
    ];
    const assessment = [
      `Tier: ${tw(content.assessment.tier)}`,
      ...content.assessment.rules.map((f) => `Rule ${f.id}: ${f.why}${f.placeholder ? ' Placeholder, awaiting clinician review.' : ''}`),
      stepsGiven,
      stepsDone,
      NOT_A_DIAGNOSIS,
    ];
    return sections(identify, situation, background, assessment);
  }

  const a = content.assessment;
  const situation = [
    `Pattern to check for: ${content.pattern.checkedFor} (${content.pattern.region})`,
    `Symptoms logged: ${list(symptoms, 'none')}`,
  ];
  const background = [
    `Recent trends: ${list(content.recentTrends.map((x) => `${x.summary}${x.drifted ? ' (drifted)' : ''}`), 'none')}`,
    `Pain scores: ${list(content.painScores.map((p) => `${p.score} out of ${p.outOf} at ${time(p.at)}`), 'none logged')}`,
    `Tests: ${list(content.tests.map((x) => `${x.test}: ${x.result}`), 'none')}`,
    `Other signals today: ${list(others, 'none')}`,
  ];
  const assessment = [
    `Tier: ${a.tier ? tw(a.tier) : 'none now'}`,
    `Rule ${content.pattern.rule}: ${a.why}${a.placeholder ? ' Placeholder, awaiting clinician review.' : ''}`,
    stepsGiven,
    stepsDone,
    NOT_A_DIAGNOSIS,
  ];
  return sections(identify, situation, background, assessment);
}

function sections(identify: string[], situation: string[], background: string[], assessment: string[]): IsbarSection[] {
  return [
    { key: 'I', label: 'Identify', lines: identify },
    { key: 'S', label: 'Situation', lines: situation },
    { key: 'B', label: 'Background', lines: background },
    { key: 'A', label: 'Assessment', lines: assessment },
    { key: 'R', label: 'Request', lines: [REQUEST_LINE] },
  ];
}

export const DECISIONS: EarthReply['decision'][] = ['agree', 'add', 'change', 'escalate'];

/** Save the remote doctor's reply to one case. The note and steps are kept exactly as written, apart from trimming spaces. */
export function replyToCase(state: State, args: { caseId: string; decision: string; note: string; steps?: string[]; at: number }): { state: State; reply: EarthReply } {
  if (!DECISIONS.includes(args.decision as EarthReply['decision'])) throw new Error(`Pick a decision: agree, add, change or escalate (got "${args.decision}").`);
  const note = args.note.trim();
  if (!note) throw new Error('Write a note before sending the reply.');
  if (!state.outbox.some((p) => p.id === args.caseId)) throw new Error(`Unknown case "${args.caseId}".`);
  const replies = state.replies ?? [];
  let id = `reply-${args.at}`;
  for (let n = 2; replies.some((r) => r.id === id); n++) id = `reply-${args.at}-${n}`;
  const reply: EarthReply = { id, caseId: args.caseId, at: args.at, decision: args.decision as EarthReply['decision'], note, steps: (args.steps ?? []).map((s) => s.trim()).filter(Boolean) };
  return { state: { ...state, replies: [...replies, reply] }, reply };
}

/** The crew accepts a reply. Accepting again keeps the first time. */
export function acceptReply(state: State, replyId: string, at: number): State {
  const replies = state.replies ?? [];
  const r = replies.find((x) => x.id === replyId);
  if (!r) throw new Error(`Unknown reply "${replyId}".`);
  if (r.acceptedAt !== undefined) return state;
  return { ...state, replies: replies.map((x) => (x.id === replyId ? { ...x, acceptedAt: at } : x)) };
}

/** The replies to one case, oldest first. */
export function repliesFor(state: State, caseId: string): EarthReply[] {
  return (state.replies ?? []).filter((r) => r.caseId === caseId).sort((a, b) => a.at - b.at);
}

export type LinkState = 'no-link' | 'queued' | 'waiting' | 'reply-in';

/** Where a case stands: a reply is in, there is no link, the round trip is still running, or the case waits with no reply. */
/**
 * When a reply reaches the crew. The case takes one leg to arrive, so a reply cannot leave before then,
 * and the reply takes one more leg to come back. Nothing beats the signal delay.
 */
export function replyArrival(reply: EarthReply, pack: CasePack, setting: Setting): number {
  const leg = ((setting.adviceSeconds ?? setting.replySeconds) / 2) * 1000;
  return Math.max(reply.at, pack.createdAt + leg) + leg;
}

/** The replies the crew can see now: those whose signal has had time to arrive. */
export function arrivedReplies(state: State, pack: CasePack, setting: Setting, now: number): EarthReply[] {
  return repliesFor(state, pack.id).filter((r) => replyArrival(r, pack, setting) <= now);
}

export function linkStatus(state: State, pack: CasePack, setting: Setting, now: number): { status: LinkState; secondsLeft: number } {
  if (arrivedReplies(state, pack, setting, now).length) return { status: 'reply-in', secondsLeft: 0 };
  if (state.ui.linkDown) return { status: 'no-link', secondsLeft: 0 };
  const left = (setting.adviceSeconds ?? setting.replySeconds) - (now - pack.createdAt) / 1000;
  if (left > 0) return { status: 'waiting', secondsLeft: left };
  return { status: 'queued', secondsLeft: 0 };
}

/**
 * Change the place. Any case still waiting is run again from that place: it is stamped as sent now, from there,
 * and replies written for the old place are dropped. One place, one clock: nothing from the old place carries over.
 */
export function changePlace(state: State, settingId: string, at: number): State {
  const waiting = state.outbox.filter((p) => p.status === 'queued').map((p) => p.id);
  return {
    ...state,
    ui: { ...state.ui, settingId },
    outbox: state.outbox.map((p) => (p.status === 'queued' ? { ...p, createdAt: at, settingId } : p)),
    replies: (state.replies ?? []).filter((r) => !waiting.includes(r.caseId)),
  };
}
