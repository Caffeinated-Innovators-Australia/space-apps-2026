// AI assistance: drafted with Claude Code (see AI_USE.md).
export function ScaleInput({ labels, value, onPick }: { labels: string[]; value?: number; onPick: (n: number) => void }) {
  return (
    <div className="x-scale" role="group">
      {labels.map((label, i) => {
        const n = i + 1;
        return (
          <button key={n} type="button" className="x-scale-btn" aria-pressed={value === n} onClick={() => onPick(n)}>
            <span className="x-scale-num">{n}</span>
            <span className="x-scale-label">{label}</span>
          </button>
        );
      })}
    </div>
  );
}
