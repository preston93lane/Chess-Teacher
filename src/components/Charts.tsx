/**
 * Small SVG/HTML chart primitives for the Insights dashboard. One accent hue
 * for magnitude; move-quality tones only where the data *is* move quality.
 */
import { useEffect, useRef, useState, type ReactNode } from 'react';

export function StatTile({ label, value, delta, deltaGood, sub }: { label: string; value: ReactNode; delta?: string; deltaGood?: boolean; sub?: ReactNode }) {
  return (
    <div className="stat-tile">
      <span className="stat-tile-label">{label}</span>
      <span className="stat-tile-value">{value}</span>
      {delta && <span className={`stat-tile-delta${deltaGood === undefined ? '' : deltaGood ? ' is-good' : ' is-bad'}`}>{delta}</span>}
      {sub && <span className="stat-tile-sub">{sub}</span>}
    </div>
  );
}

export interface TrendDatum {
  value: number;
  label: string;
  detail?: string;
}

/** Single-series line with area wash, end label, crosshair and tooltip. */
export function TrendChart({ data, min = 0, max = 100, unit = '%', ticks = [50, 75, 100], height = 180, onSelect }: { data: TrendDatum[]; min?: number; max?: number; unit?: string; ticks?: number[]; height?: number; onSelect?: (i: number) => void }) {
  const wrap = useRef<HTMLDivElement>(null);
  const [W, setW] = useState(640);
  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setW(Math.max(240, Math.round(el.clientWidth))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const H = height;
  const padL = 34;
  const padR = 44;
  const padT = 12;
  const padB = 22;
  const [hover, setHover] = useState<number | null>(null);
  const ref = useRef<SVGSVGElement>(null);
  if (!data.length) return null;
  const x = (i: number) => padL + (data.length === 1 ? (W - padL - padR) / 2 : (i / (data.length - 1)) * (W - padL - padR));
  const y = (v: number) => padT + (1 - (Math.max(min, Math.min(max, v)) - min) / (max - min)) * (H - padT - padB);
  const path = data.map((d, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(d.value).toFixed(1)}`).join(' ');
  const area = `${path} L${x(data.length - 1).toFixed(1)},${y(min)} L${x(0).toFixed(1)},${y(min)} Z`;
  const lastI = data.length - 1;
  const pick = (clientX: number) => {
    const r = ref.current?.getBoundingClientRect();
    if (!r) return;
    const px = ((clientX - r.left) / r.width) * W;
    let best = 0;
    for (let i = 1; i < data.length; i++) if (Math.abs(x(i) - px) < Math.abs(x(best) - px)) best = i;
    setHover(best);
  };
  const h = hover !== null ? data[hover] : null;
  return (
    <div className="chart" ref={wrap}>
      <svg
        ref={ref}
        viewBox={`0 0 ${W} ${H}`}
        className="chart-svg"
        role="img"
        aria-label={`Trend of ${data.length} values, latest ${Math.round(data[lastI].value)}${unit}`}
        onPointerMove={(e) => pick(e.clientX)}
        onPointerDown={(e) => pick(e.clientX)}
        onPointerLeave={() => setHover(null)}
        onClick={() => hover !== null && onSelect?.(hover)}
      >
        {ticks.map((t) => (
          <g key={t}>
            <line x1={padL} x2={W - padR} y1={y(t)} y2={y(t)} className="chart-grid" />
            <text x={padL - 6} y={y(t)} className="chart-tick" textAnchor="end" dominantBaseline="middle">{t}</text>
          </g>
        ))}
        <path d={area} className="chart-area" />
        <path d={path} className="chart-line" />
        {hover !== null && <line x1={x(hover)} x2={x(hover)} y1={padT} y2={H - padB} className="chart-crosshair" />}
        <circle cx={x(lastI)} cy={y(data[lastI].value)} r={5} className="chart-dot" />
        <text x={x(lastI) + 9} y={y(data[lastI].value)} className="chart-end-label" dominantBaseline="middle">{Math.round(data[lastI].value)}{unit}</text>
        {hover !== null && <circle cx={x(hover)} cy={y(data[hover].value)} r={5} className="chart-dot" />}
        <text x={padL} y={H - 4} className="chart-tick">{data[0].label}</text>
        {data.length > 1 && <text x={W - padR} y={H - 4} className="chart-tick" textAnchor="end">{data[lastI].label}</text>}
      </svg>
      {h && (
        <div className="chart-tip" style={{ left: `${(x(hover!) / W) * 100}%` }}>
          <strong className="num">{Math.round(h.value)}{unit}</strong>
          <span>{h.label}</span>
          {h.detail && <span className="muted">{h.detail}</span>}
        </div>
      )}
    </div>
  );
}

/** A list of named ratios: name, bar against a limit, figure. */
export function MeterList({ rows, max = 100, format = (v: number) => `${Math.round(v)}%` }: { rows: { label: ReactNode; value?: number; note?: string; tone?: string }[]; max?: number; format?: (v: number) => string }) {
  return (
    <div className="meter-list">
      {rows.map((r, i) => (
        <div key={i} className="meter-row" title={r.note}>
          <span className="meter-row-label">{r.label}</span>
          <span className="meter-row-track">
            {r.value !== undefined && <span className="meter-row-fill" style={{ width: `${r.value > 0 ? Math.max(1.5, (r.value / max) * 100) : 0}%`, ...(r.tone ? { background: `var(--t-${r.tone})` } : {}) }} />}
          </span>
          <span className="meter-row-value num">{r.value !== undefined ? format(r.value) : '—'}</span>
        </div>
      ))}
    </div>
  );
}

/** GitHub-style calendar of daily activity (one hue, light → dark). */
export function Heatmap({ days }: { days: { date: string; count: number }[] }) {
  const [tip, setTip] = useState<{ date: string; count: number; i: number } | null>(null);
  const max = Math.max(1, ...days.map((d) => d.count));
  const level = (c: number) => (c === 0 ? 0 : Math.min(4, 1 + Math.floor((c / max) * 3.999)));
  const weeks: { date: string; count: number }[][] = [];
  days.forEach((d, i) => {
    if (i % 7 === 0) weeks.push([]);
    weeks[weeks.length - 1].push(d);
  });
  const fmt = (s: string) => new Date(s + 'T12:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  return (
    <div className="heatmap-wrap">
      <div className="heatmap" role="img" aria-label={`Activity over the last ${weeks.length} weeks: ${days.filter((d) => d.count).length} active days`}>
        {weeks.map((w, wi) => (
          <div key={wi} className="heat-week">
            {w.map((d, di) => (
              <span
                key={d.date}
                className={`heat-cell heat-${level(d.count)}`}
                onPointerEnter={() => setTip({ ...d, i: wi * 7 + di })}
                onPointerDown={() => setTip({ ...d, i: wi * 7 + di })}
                onPointerLeave={() => setTip(null)}
              />
            ))}
          </div>
        ))}
      </div>
      <div className="heatmap-foot">
        <span className="muted small">{tip ? `${fmt(tip.date)}: ${tip.count ? `${tip.count} training item${tip.count === 1 ? '' : 's'}` : 'no training'}` : `${fmt(days[0].date)} – today`}</span>
        <span className="heat-legend small muted">
          Less {[0, 1, 2, 3, 4].map((l) => <span key={l} className={`heat-cell heat-${l}`} />)} More
        </span>
      </div>
    </div>
  );
}
