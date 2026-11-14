// AI assistance: drafted with Claude Code (see AI_USE.md).
import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from 'react';

type Phase = 'idle' | 'wait' | 'go' | 'early' | 'got' | 'done';

export function ReactionTest({ rounds = 5, onResult }: { rounds?: number; onResult: (meanMs: number) => void }) {
  const [phase, setPhase] = useState<Phase>('idle');
  const [times, setTimes] = useState<number[]>([]);
  const [mean, setMean] = useState<number | null>(null);
  const timer = useRef<number | undefined>(undefined);
  const startedAt = useRef(0);
  const timesRef = useRef<number[]>([]);
  const resultRef = useRef(onResult);
  resultRef.current = onResult;

  const clear = () => {
    if (timer.current !== undefined) window.clearTimeout(timer.current);
    timer.current = undefined;
  };
  useEffect(() => clear, []);

  const beginRound = useCallback(() => {
    clear();
    setPhase('wait');
    timer.current = window.setTimeout(() => {
      startedAt.current = performance.now();
      setPhase('go');
    }, 1200 + Math.random() * 1800);
  }, []);

  const start = () => {
    timesRef.current = [];
    setTimes([]);
    setMean(null);
    beginRound();
  };

  const tap = () => {
    if (phase === 'wait') {
      clear();
      setPhase('early');
      timer.current = window.setTimeout(beginRound, 1600);
    } else if (phase === 'go') {
      const ms = Math.round(performance.now() - startedAt.current);
      const next = [...timesRef.current, ms];
      timesRef.current = next;
      setTimes(next);
      clear();
      if (next.length >= rounds) {
        const m = next.reduce((a, b) => a + b, 0) / next.length;
        setMean(Math.round(m));
        setPhase('done');
        resultRef.current(Math.round(m));
      } else {
        setPhase('got');
        timer.current = window.setTimeout(beginRound, 1000);
      }
    }
  };

  const onKey = (e: KeyboardEvent) => {
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      tap();
    }
  };

  const live = phase === 'wait' || phase === 'go';
  const current = Math.min(times.length + 1, rounds);
  const status =
    phase === 'idle' ? 'Ready.' :
    phase === 'wait' ? 'Wait for the panel to change.' :
    phase === 'go' ? 'Tap now.' :
    phase === 'early' ? 'Too early. That round starts again.' :
    phase === 'got' ? `Recorded ${times[times.length - 1]} milliseconds.` :
    `Finished. Mean ${mean} milliseconds.`;

  return (
    <div className="x-rt">
      {phase !== 'idle' && phase !== 'done' ? <div className="kicker">Round {current} of {rounds}</div> : null}
      <div
        className={`x-rt-panel x-rt-${phase}`}
        {...(live ? { role: 'button', tabIndex: 0, onPointerDown: tap, onKeyDown: onKey, 'aria-label': phase === 'go' ? 'Tap now' : 'Wait, do not tap yet' } : {})}
      >
        {phase === 'idle' ? (
          <>
            <p className="caption">Tap as soon as the panel turns bright. {rounds} rounds.</p>
            <button type="button" className="btn" onClick={start}>Start the test</button>
          </>
        ) : null}
        {phase === 'wait' ? <div className="x-rt-big">Wait…</div> : null}
        {phase === 'go' ? <div className="x-rt-big">TAP</div> : null}
        {phase === 'early' ? <div className="x-rt-msg">Too early. That round starts again.</div> : null}
        {phase === 'got' ? <div className="x-rt-big x-rt-mono">{times[times.length - 1]} <span className="x-rt-unit">ms</span></div> : null}
        {phase === 'done' ? (
          <>
            <div className="caption">Your mean reaction time</div>
            <div className="x-rt-big x-rt-mono">{mean} <span className="x-rt-unit">ms</span></div>
            <button type="button" className="btn secondary" onClick={start}>Run it again</button>
          </>
        ) : null}
      </div>
      {times.length > 0 ? (
        <ul className="x-rt-times" aria-label="Recorded times">
          {times.map((t, i) => (
            <li key={i}><span className="caption">Round {i + 1}</span> <span className="x-rt-mono">{t} ms</span></li>
          ))}
        </ul>
      ) : null}
      <p className="caption" aria-live="polite" role="status">{status}</p>
    </div>
  );
}
