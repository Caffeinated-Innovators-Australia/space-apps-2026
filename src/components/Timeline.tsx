// AI assistance: drafted with Claude Code (see AI_USE.md).
import { TierPill } from './ui.tsx';

export interface TimelineBlock { start: string; end: string; label: string; critical: boolean }
export interface PlanItem { id: string; label: string; at: string; status: 'done' | 'due' | 'later' | 'held'; note?: string; tier?: 'green' | 'amber' | 'red' }

const mins = (t: string) => {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + (m || 0);
};

const STATUS_WORD = { done: 'Done', due: 'Due now', later: 'Later', held: 'Held' } as const;

function ItemButton({ item, onOpen }: { item: PlanItem; onOpen: (id: string) => void }) {
  return (
    <li>
      <button type="button" className={`x-tl-item x-tl-${item.status}`} onClick={() => onOpen(item.id)}>
        <span className="x-tl-time">{item.at}</span>
        <span className="x-tl-main">
          <span className="x-tl-label">{item.label}</span>
          {item.note ? <span className="caption">{item.note}</span> : null}
          {item.tier ? <span><TierPill tier={item.tier} /></span> : null}
        </span>
        <span className="x-tl-status">
          {item.status === 'done' ? (
            <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
              <path d="M3 8.5l3 3 7-7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          ) : null}
          {STATUS_WORD[item.status]}
        </span>
      </button>
    </li>
  );
}

export function Timeline({ blocks, items, now, onOpen }: { blocks: TimelineBlock[]; items: PlanItem[]; now: string; onOpen: (id: string) => void }) {
  const sorted = [...items].sort((a, b) => mins(a.at) - mins(b.at));
  const nowM = mins(now);
  const inBlock = (b: TimelineBlock, at: string) => mins(at) >= mins(b.start) && mins(at) < mins(b.end);
  const first = blocks.length ? Math.min(...blocks.map((b) => mins(b.start))) : 0;
  const placed = new Set<string>();
  const perBlock = blocks.map((b) => {
    const list = sorted.filter((it) => !placed.has(it.id) && inBlock(b, it.at));
    list.forEach((it) => placed.add(it.id));
    return list;
  });
  const rest = sorted.filter((it) => !placed.has(it.id));
  const before = rest.filter((it) => mins(it.at) < first);
  const after = rest.filter((it) => mins(it.at) >= first);

  return (
    <div className="x-tl">
      {before.length ? <ul className="x-tl-items">{before.map((it) => <ItemButton key={it.id} item={it} onOpen={onOpen} />)}</ul> : null}
      {blocks.map((b, i) => {
        const isNow = nowM >= mins(b.start) && nowM < mins(b.end);
        return (
          <section key={b.start + b.label} className={`x-tl-block${isNow ? ' x-tl-now' : ''}`} aria-current={isNow ? 'time' : undefined}>
            <div className="x-tl-head">
              <span className="x-tl-range">{b.start}–{b.end}</span>
              <span className="x-tl-blabel">{b.label}</span>
              {isNow ? <span className="x-tl-nowtag">Now</span> : null}
              {b.critical ? <span className="placeholder x-tl-tag">No prompts</span> : null}
            </div>
            {perBlock[i].length ? <ul className="x-tl-items">{perBlock[i].map((it) => <ItemButton key={it.id} item={it} onOpen={onOpen} />)}</ul> : null}
          </section>
        );
      })}
      {after.length ? <ul className="x-tl-items">{after.map((it) => <ItemButton key={it.id} item={it} onOpen={onOpen} />)}</ul> : null}
    </div>
  );
}
