// The solar radiation storm alarm (CR-09): a red pop-up on every screen until acknowledged, then a banner until the
// all-clear, each with a countdown to every wave. The forecast in the demo is SYNTHETIC; the rule decides when it shows.
// AI assistance: drafted with Claude Code (see AI_USE.md).
import { useEffect, useRef, useState } from 'react';
import '../screens/emergency.css';
import { countdown, type StormStatus } from '../core/storm.ts';
import { More, SyntheticTag } from './ui.tsx';

function Waves({ status, now }: { status: StormStatus; now: number }) {
  return (
    <ul className="x-storm-waves" aria-label="Countdown to each wave">
      {status.waves.map((w) => (
        <li key={w.label}><span>{w.label}:</span> <strong className="mono">{w.arrived ? 'arrived' : `arriving in ${countdown(w.arrivesAt - now)}`}</strong></li>
      ))}
      <li><span>All-clear expected:</span> <strong className="mono">in {countdown(status.allClearAt - now)}</strong></li>
    </ul>
  );
}

export function StormAlarm({ status, now, onAcknowledge }: { status: StormStatus | null; now: number; onAcknowledge: () => void }) {
  const button = useRef<HTMLButtonElement>(null);
  useEffect(() => { if (status?.phase === 'alarm') button.current?.focus(); }, [status?.phase]);
  if (!status) return null;
  const why = (
    <More label="Why this alarm?">
      <p className="source">Rule {status.ruleId}, forecast level {status.level}. Source: {status.source}{status.placeholder ? ' Placeholder rule, awaiting clinician review.' : ''}</p>
      {status.synthetic ? <p className="caption">{status.note}</p> : null}
    </More>
  );
  if (status.phase === 'banner') {
    return (
      <div className="x-em-banner" role="status">
        <svg className="glyph" viewBox="0 0 16 16" width="20" height="20" aria-hidden="true"><rect x="1" y="1" width="14" height="14" /></svg>
        <div className="x-em-banner-text">
          <strong>{status.banner}</strong>
          <Waves status={status} now={now} />
          {why}
        </div>
      </div>
    );
  }
  return (
    <div className="x-storm-overlay">
      <div className="x-storm" role="alertdialog" aria-modal="true" aria-labelledby="x-storm-h" aria-describedby="x-storm-d">
        <div className="card-head">
          <svg className="glyph" viewBox="0 0 16 16" width="24" height="24" aria-hidden="true"><rect x="1" y="1" width="14" height="14" /></svg>
          <h2 className="title" id="x-storm-h">{status.title}</h2>
          {status.synthetic ? <SyntheticTag /> : null}
        </div>
        <ul id="x-storm-d" className="x-storm-lines">{status.lines.map((l) => <li key={l}>{l}</li>)}</ul>
        <Waves status={status} now={now} />
        <button ref={button} type="button" className="btn x-storm-ack" onClick={onAcknowledge}>{status.acknowledge}</button>
        {why}
      </div>
    </div>
  );
}

/** Ticks once a second while a storm is showing, so the countdowns move. */
export function useTick(active: boolean, now: () => number): number {
  const [t, setT] = useState(now());
  useEffect(() => {
    if (!active) return;
    setT(now());
    const id = window.setInterval(() => setT(now()), 1000);
    return () => window.clearInterval(id);
  }, [active, now]);
  return t;
}
