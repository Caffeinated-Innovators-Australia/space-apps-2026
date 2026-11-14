// Trend chart: shaded personal-baseline band, dashed laboratory reference lines, points with tier shapes.
// AI assistance: drafted with Claude Code (see AI_USE.md).
import type { Band, Tier } from '../core/rules.ts';

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

export function BaselineChart({ points, band, refMin, refMax, limit, unit, dp = 1, title, baselineLabel = 'Before launch (your baseline)', readingLabel = 'This mission' }: { points: ChartPoint[]; band: Band; refMin?: number; refMax?: number; limit?: { value: number; label: string }; unit: string; dp?: number; title: string; baselineLabel?: string; readingLabel?: string }) {
  const W = 500, H = 260, L = 44, R = 14, T = 20, B = 42;
  const compact = points.length > 12;
  const hasRef = typeof refMin === 'number' && typeof refMax === 'number';
  const vals = [...points.map((p) => p.value), band.low, band.high, ...(hasRef ? [refMin, refMax] : []), ...(limit ? [limit.value] : [])];
  const n = points.length;
  const step = Math.max(1, Math.round((n - 1) / 5));
  const showLabel = (i: number) => !compact || i === n - 1 || (i % step === 0 && n - 1 - i >= step / 2);
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
      {hasRef ? (
        <>
          <line className="ref" x1={L} x2={W - R} y1={y(refMin)} y2={y(refMin)} />
          <line className="ref" x1={L} x2={W - R} y1={y(refMax)} y2={y(refMax)} />
          <text x={L - 6} y={y(refMin) + 4} textAnchor="end">{f(refMin)}</text>
          <text x={L - 6} y={y(refMax) + 4} textAnchor="end">{f(refMax)}</text>
        </>
      ) : null}
      {limit ? (
        <>
          <line x1={L} x2={W - R} y1={y(limit.value)} y2={y(limit.value)} stroke="var(--ink)" strokeOpacity={0.6} strokeWidth={1.5} />
          <text className="limit" x={W - R} y={y(limit.value) - 5} textAnchor="end">{limit.label}</text>
        </>
      ) : null}
      <text x={L} y={12}>{unit}</text>
      {firstReading > 0 ? <line className="divider" x1={(x(firstReading - 1) + x(firstReading)) / 2} x2={(x(firstReading - 1) + x(firstReading)) / 2} y1={T} y2={H - B + 6} /> : null}
      <path className="trace" d={d} />
      {points.map((p, i) => (
        <g key={p.label + i}>
          {p.highlight ? <circle className="halo" cx={x(i)} cy={y(p.value)} r={13} /> : null}
          {p.kind === 'baseline' || !p.tier ? (
            <rect className="base" x={x(i) - (compact ? 2.5 : 4.5)} y={y(p.value) - (compact ? 2.5 : 4.5)} width={compact ? 5 : 9} height={compact ? 5 : 9} transform={`rotate(45 ${x(i)} ${y(p.value)})`} />
          ) : (
            <Shape x={x(i)} y={y(p.value)} tier={p.tier} r={compact && p.tier === 'green' ? 2.5 : 6} />
          )}
          {!compact || p.highlight ? <text className="val" x={x(i)} y={y(p.value) - (p.highlight ? 18 : 12)} textAnchor="middle">{f(p.value)}</text> : null}
          {showLabel(i) ? <text x={x(i)} y={H - B + 20} textAnchor="middle">{p.label}</text> : null}
        </g>
      ))}
      {firstReading > 0 ? (
        <>
          <text x={(x(0) + x(firstReading - 1)) / 2} y={H - 4} textAnchor="middle">{baselineLabel}</text>
          <text x={(x(firstReading) + x(points.length - 1)) / 2} y={H - 4} textAnchor="middle">{readingLabel}</text>
        </>
      ) : null}
    </svg>
  );
}

export function ChartLegend({ bandLabel = 'Own expected range', reference = true, limitLabel }: { bandLabel?: string; reference?: boolean; limitLabel?: string }) {
  return (
    <div className="legend">
      <span><i className="sw-band" /> {bandLabel}</span>
      {reference ? <span><i className="sw-ref" /> Laboratory reference range</span> : null}
      {limitLabel ? <span><i className="sw-limit" /> {limitLabel}</span> : null}
    </div>
  );
}
