// AI assistance: drafted with Claude Code (see AI_USE.md).
import { More } from './ui';

export function ExplainCard({ how, why, what, status, hazards, sources }: { how: string; why: string; what: string; status: string; hazards: { code: string; name: string }[]; sources: { label: string; url: string }[] }) {
  return (
    <div className="card x-explain">
      <div className="x-part"><span className="why-label">How to measure</span><p>{how}</p></div>
      <More label="Why it matters, and what to do">
      <div className="x-part"><span className="why-label">Why it matters</span><p>{why}</p></div>
      <div className="x-part"><span className="why-label">If it is out of range</span><p>{what}</p></div>
      {hazards.length ? (
        <div className="x-part">
          <div className="caption">NASA's five hazards this relates to</div>
          <ul className="x-hazards">
            {hazards.map((h) => (
              <li key={h.code} className="x-hazard"><span className="x-hazard-code">{h.code}</span><span>{h.name}</span></li>
            ))}
          </ul>
        </div>
      ) : null}
      {sources.length ? (
        <ul className="links">
          {sources.map((s) => (
            <li key={s.url}><a href={s.url} target="_blank" rel="noreferrer">{s.label}</a></li>
          ))}
        </ul>
      ) : null}
      <span className={/^(Reviewed|Approved)/.test(status) ? 'source' : 'placeholder'}>{status}</span>
      </More>
    </div>
  );
}
