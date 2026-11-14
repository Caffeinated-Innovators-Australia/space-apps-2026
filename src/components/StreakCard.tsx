// AI assistance: drafted with Claude Code (see AI_USE.md).
import type { ReactNode } from 'react';

export function StreakCard({ streakDays, crewDone, crewTotal, unlocked, children }: { streakDays: number; crewDone: number; crewTotal: number; unlocked: { days: number; title: string }[]; children?: ReactNode }) {
  const pct = crewTotal > 0 ? Math.min(100, Math.round((crewDone / crewTotal) * 100)) : 0;
  return (
    <div className="card x-streak">
      <h2 className="title">Honest check-ins</h2>
      <div className="x-streak-row">
        <span className="x-streak-num">{streakDays}</span>
        <span className="muted">days in a row checked in</span>
      </div>
      <p className="caption">The streak counts check-ins, never the results. A low day logged honestly counts the same as a good one.</p>
      <div className="x-goal">
        <div className="x-goal-text">Crew this week: {crewDone} of {crewTotal} check-ins</div>
        <div className="x-bar" role="progressbar" aria-valuemin={0} aria-valuemax={crewTotal} aria-valuenow={crewDone} aria-label="Crew check-ins this week">
          <div className="x-bar-fill" style={{ width: `${pct}%` }} />
        </div>
        <div className="caption">A shared crew target. No one is ranked.</div>
      </div>
      {unlocked.length ? (
        <ul className="x-insights">
          {unlocked.map((u) => (
            <li key={u.days + u.title}>Unlocked at {u.days} days: {u.title}</li>
          ))}
        </ul>
      ) : null}
      {children}
    </div>
  );
}
