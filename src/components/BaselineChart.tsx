// Trend chart: shaded personal-baseline band, dashed laboratory reference lines, points with tier shapes.
// AI assistance: drafted with Claude Code (see AI_USE.md).
import type { Band, Tier } from '../engine/rules';

export interface ChartPoint {
  label: string;
  value: number;
  kind: 'baseline' | 'reading';
  tier?: Tier;
  highlight?: boolean;
}

function Shape({ x, y, tier, r = 6 }: { x: number; y: number; tier: Tier; r?: number }) {
  if (tier === 'green') return <circle cx={x} cy={y} r={r} className="t-green" />;
  if (tier === 'amber') return <path d={`M${x} ${y - r - 1}L${x + r + 1} ${y + r}H${x - r - 1}z`} className="t-amber" />;
  const k = r + 1;
  const c = k * 0.42;
  return <path d={`M${x - c} ${y - k}h${2 * c}l${k - c} ${k - c}v${2 * c}l${c - k} ${k - c}h${-2 * c}l${c - k} ${c - k}v${-2 * c}z`} className="t-red" />;
}

export function BaselineChart({ points, band, refMin, refMax, unit, dp = 1, title, baselineLabel = 'Before launch (your baseline)' }: { points: ChartPoint[]; band: Band; refMin: number; refMax: number; unit: string; dp?: number; title: string; baselineLabel?: string }) {
  const W = 500, H = 260, L = 44, R = 14, T = 20, B = 42;
  const vals = [...points.map((p) => p.value), band.low, band.high, refMin, refMax];
  const span = Math.max(...vals) - Math.min(...vals) || 1;
  const lo = Math.min(...vals) - span * 0.08;
  const hi = Math.max(...vals) + span * 0.08;
  const y = (v: number) => T + ((hi - v) / (hi - lo)) * (H - T - B);
  const x = (i: number) => L + ((i + 0.5) / points.length) * (W - L - R);
  const firstReading = points.findIndex((p) => p.kind === 'reading');
  const f = (v: number) => v.toFixed(dp);
  const d = points.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(p.value).toFixed(1)}`).join('');
  return (
    <svg className="chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={title}>
      <rect className="band" x={L} y={y(band.high)} width={W - L - R} height={y(band.low) - y(band.high)} />
      <line className="bandline" x1={L} x2={W - R} y1={y(band.high)} y2={y(band.high)} />
      <line className="bandline" x1={L} x2={W - R} y1={y(band.low)} y2={y(band.low)} />
      <line className="ref" x1={L} x2={W - R} y1={y(refMin)} y2={y(refMin)} />
      <line className="ref" x1={L} x2={W - R} y1={y(refMax)} y2={y(refMax)} />
      <text x={L - 6} y={y(refMin) + 4} textAnchor="end">{f(refMin)}</text>
      <text x={L - 6} y={y(refMax) + 4} textAnchor="end">{f(refMax)}</text>
      <text x={L} y={12}>{unit}</text>
      {firstReading > 0 ? <line className="divider" x1={(x(firstReading - 1) + x(firstReading)) / 2} x2={(x(firstReading - 1) + x(firstReading)) / 2} y1={T} y2={H - B + 6} /> : null}
      <path className="trace" d={d} />
      {points.map((p, i) => (
        <g key={p.label + i}>
          {p.highlight ? <circle className="halo" cx={x(i)} cy={y(p.value)} r={13} /> : null}
          {p.kind === 'baseline' || !p.tier ? <rect className="base" x={x(i) - 4.5} y={y(p.value) - 4.5} width={9} height={9} transform={`rotate(45 ${x(i)} ${y(p.value)})`} /> : <Shape x={x(i)} y={y(p.value)} tier={p.tier} />}
          <text className="val" x={x(i)} y={y(p.value) - (p.highlight ? 18 : 12)} textAnchor="middle">{f(p.value)}</text>
          <text x={x(i)} y={H - B + 20} textAnchor="middle">{p.label}</text>
        </g>
      ))}
      {firstReading > 0 ? (
        <>
          <text x={(x(0) + x(firstReading - 1)) / 2} y={H - 4} textAnchor="middle">{baselineLabel}</text>
          <text x={(x(firstReading) + x(points.length - 1)) / 2} y={H - 4} textAnchor="middle">{points[firstReading].label.startsWith('R+') ? 'After return' : 'This mission'}</text>
        </>
      ) : null}
    </svg>
  );
}

export function ChartLegend() {
  return (
    <div className="legend">
      <span><i className="sw-band" /> Own pre-flight range</span>
      <span><i className="sw-ref" /> Laboratory reference range</span>
    </div>
  );
}
