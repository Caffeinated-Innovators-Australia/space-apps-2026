// The PVT-style reaction check: tap as soon as a running millisecond counter appears; reports the median reaction time.
// AI assistance: drafted with Claude Code (see AI_USE.md).
import React, { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { LAPSE_MS, nextGapMs, PVT_DURATION_MS, PVT_GAP_MS, summarise, type PvtMode } from '../core/pvt.ts';

type Phase = 'idle' | 'wait' | 'go' | 'done';
type Detail = { median: number; lapses: number; trials: number; falseStarts: number };

/** Three drawn frames: wait, the counter appears, tap. Drawn in code by the build assistant (AI-assisted code, see AI_USE.md). */
function HowTo() {
  const frame = (x: number, n: string, word: string, body: React.ReactNode) => (
    <g transform={`translate(${x} 0)`}>
      <rect className="x-rt-how-screen" x="4" y="4" width="92" height="64" rx="8" />
      {body}
      <text className="x-rt-how-word" x="50" y="90" textAnchor="middle">{n}. {word}</text>
    </g>
  );
  return (
    <svg className="x-rt-how" viewBox="0 0 320 98" role="img" aria-label="How to do the check. One: wait while the panel is blank. Two: a running counter appears. Three: tap as fast as you can.">
      {frame(0, '1', 'Wait', <text className="x-rt-how-dim" x="50" y="42" textAnchor="middle">…</text>)}
      {frame(110, '2', 'Counter', <text className="x-rt-how-num" x="50" y="44" textAnchor="middle">042</text>)}
      {frame(220, '3', 'Tap', <><text className="x-rt-how-num" x="50" y="36" textAnchor="middle">318</text><circle className="x-rt-how-tap" cx="50" cy="52" r="9" /><circle className="x-rt-how-ring" cx="50" cy="52" r="14" /></>)}
    </svg>
  );
}

const MODES: { id: PvtMode; label: string }[] = [
  { id: 'demo', label: 'Demo, 30 seconds' },
  { id: 'full', label: 'Full check, 3 minutes' },
];

const clock = (ms: number) => {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

/**
 * `onResult` receives the median reaction time in milliseconds. `onDetail`, if given, is called just before it
 * with the median, the lapses and the number of trials. `rounds` is kept so older callers still compile; the check
 * now runs for a fixed time, not a fixed number of rounds.
 */
export function ReactionTest({ onResult, onDetail }: { rounds?: number; onResult: (medianMs: number) => void; onDetail?: (d: Detail) => void }) {
  const [mode, setMode] = useState<PvtMode>('demo');
  const [phase, setPhase] = useState<Phase>('idle');
  const [counter, setCounter] = useState(0);
  const [left, setLeft] = useState(PVT_DURATION_MS.demo);
  const [trials, setTrials] = useState<number[]>([]);
  const [early, setEarly] = useState(0);
  const [note, setNote] = useState('');
  const [result, setResult] = useState<Detail | null>(null);

  const phaseRef = useRef<Phase>('idle');
  const modeRef = useRef<PvtMode>('demo');
  const trialsRef = useRef<number[]>([]);
  const earlyRef = useRef(0);
  const endAt = useRef(0);
  const shownAt = useRef(0);
  const gapTimer = useRef<number | undefined>(undefined);
  const tick = useRef<number | undefined>(undefined);
  const frame = useRef<number | undefined>(undefined);
  const panel = useRef<HTMLDivElement>(null);
  const cb = useRef({ onResult, onDetail });
  cb.current = { onResult, onDetail };

  const setP = (p: Phase) => { phaseRef.current = p; setPhase(p); };
  const stopAll = () => {
    if (gapTimer.current !== undefined) window.clearTimeout(gapTimer.current);
    if (tick.current !== undefined) window.clearInterval(tick.current);
    if (frame.current !== undefined) window.cancelAnimationFrame(frame.current);
    gapTimer.current = tick.current = frame.current = undefined;
  };
  useEffect(() => stopAll, []);

  const finish = () => {
    stopAll();
    setLeft(0);
    const t = trialsRef.current;
    if (t.length === 0) {
      setResult(null);
      setP('done');
      return;
    }
    const d = { ...summarise(t), falseStarts: earlyRef.current };
    setResult(d);
    setP('done');
    cb.current.onDetail?.(d);
    cb.current.onResult(d.median);
  };

  const run = () => {
    setCounter(Math.round(performance.now() - shownAt.current));
    frame.current = window.requestAnimationFrame(run);
  };

  const showCounter = () => {
    gapTimer.current = undefined;
    if (performance.now() >= endAt.current) { finish(); return; }
    shownAt.current = performance.now();
    setCounter(0);
    setP('go');
    frame.current = window.requestAnimationFrame(run);
  };

  const scheduleGap = () => {
    if (gapTimer.current !== undefined) window.clearTimeout(gapTimer.current);
    setP('wait');
    gapTimer.current = window.setTimeout(showCounter, nextGapMs(Math.random, modeRef.current));
  };

  const start = () => {
    stopAll();
    modeRef.current = mode;
    trialsRef.current = [];
    earlyRef.current = 0;
    setTrials([]);
    setEarly(0);
    setNote('');
    setResult(null);
    endAt.current = performance.now() + PVT_DURATION_MS[mode];
    setLeft(PVT_DURATION_MS[mode]);
    tick.current = window.setInterval(() => {
      const ms = endAt.current - performance.now();
      setLeft(Math.max(0, ms));
      // Time is up: end now unless the counter is showing, in which case the response still counts.
      if (ms <= 0 && phaseRef.current === 'wait') finish();
    }, 250);
    scheduleGap();
    window.setTimeout(() => panel.current?.focus(), 0);
  };

  const cancel = () => {
    stopAll();
    trialsRef.current = [];
    setTrials([]);
    setNote('');
    setP('idle');
  };

  const tap = () => {
    if (phaseRef.current === 'wait') {
      earlyRef.current += 1;
      setEarly((n) => n + 1);
      setNote('Too early. That tap is recorded as a too-early tap, not as a reaction time. Wait for the counter.');
      scheduleGap();
    } else if (phaseRef.current === 'go') {
      const ms = Math.round(performance.now() - shownAt.current);
      if (frame.current !== undefined) window.cancelAnimationFrame(frame.current);
      frame.current = undefined;
      const next = [...trialsRef.current, ms];
      trialsRef.current = next;
      setTrials(next);
      setNote(`Recorded ${ms} milliseconds.`);
      if (performance.now() >= endAt.current) finish();
      else scheduleGap();
    }
  };

  const onKey = (e: KeyboardEvent) => {
    if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) {
      e.preventDefault();
      tap();
    }
  };

  const running = phase === 'wait' || phase === 'go';
  const gap = PVT_GAP_MS[mode];

  return (
    <div className="x-rt">
      {phase === 'idle' || phase === 'done' ? (
        <div className="seg" role="group" aria-label="Length of the check">
          {MODES.map((m) => (
            <button key={m.id} type="button" aria-pressed={mode === m.id} onClick={() => { setMode(m.id); setLeft(PVT_DURATION_MS[m.id]); }}>{m.label}</button>
          ))}
        </div>
      ) : (
        <div className="kicker">Reaction check · <span className="x-rt-mono">{clock(left)}</span> left</div>
      )}

      <div
        ref={panel}
        className="x-rt-panel"
        {...(running ? { role: 'button', tabIndex: 0, onPointerDown: tap, onKeyDown: onKey, 'aria-label': 'Tap as soon as the counter appears' } : {})}
      >
        {phase === 'idle' ? (
          <>
            <HowTo />
            <p className="caption">Tap anywhere on this panel, or press the space bar, as soon as a running millisecond counter appears. A tap before the counter appears is recorded as too early.</p>
            <p className="caption">
              {mode === 'demo'
                ? `Demo length: 30 seconds, with ${gap.min / 1000} to ${gap.max / 1000} seconds between counters so the demo does not drag.`
                : `Full check: 3 minutes, with a random ${gap.min / 1000} to ${gap.max / 1000} seconds between counters.`}
            </p>
            <button type="button" className="btn" onClick={start}>Start the check</button>
          </>
        ) : null}
        {phase === 'wait' ? (
          <>
            <div className="x-rt-msg">Wait for the counter…</div>
            {note ? <p className="caption">{note}</p> : null}
          </>
        ) : null}
        {phase === 'go' ? <div className="x-rt-big x-rt-mono">{counter} <span className="x-rt-unit">milliseconds</span></div> : null}
        {phase === 'done' && result ? (
          <>
            <div className="caption">Your median reaction time</div>
            <div className="x-rt-big x-rt-mono">{result.median} <span className="x-rt-unit">ms</span></div>
            <p>
              Lapses (slower than <span className="mono">{LAPSE_MS}</span> ms): <span className="mono">{result.lapses}</span>
              {' · '}Trials: <span className="mono">{result.trials}</span>
              {' · '}Too-early taps: <span className="mono">{early}</span>
            </p>
            <button type="button" className="btn secondary" onClick={start}>Run it again</button>
          </>
        ) : null}
        {phase === 'done' && !result ? (
          <>
            <div className="x-rt-msg">No reaction times were recorded.</div>
            <button type="button" className="btn" onClick={start}>Run it again</button>
          </>
        ) : null}
      </div>

      {running ? (
        <div className="btn-row">
          <button type="button" className="btn secondary" onClick={cancel}>Stop and discard</button>
          <span className="caption">Counted so far: <span className="mono">{trials.length}</span></span>
        </div>
      ) : null}

      <p className="caption">PVT-style check, modelled on the psychomotor vigilance test. Not NASA's Cognition battery.</p>
      <span className="placeholder">Lapse time of {LAPSE_MS} ms, and how too-early taps should count: placeholders, awaiting clinician sign-off</span>

      <p className="x-sr" aria-live="polite" role="status">
        {phase === 'idle' ? 'Ready.' : phase === 'go' ? 'Counter showing. Tap now.' : phase === 'wait' ? note || 'Wait for the counter.' : result ? `Finished. Median ${result.median} milliseconds, ${result.lapses} lapses, ${result.trials} trials, ${result.falseStarts} too-early taps.` : 'Finished. No reaction times were recorded.'}
      </p>
    </div>
  );
}
