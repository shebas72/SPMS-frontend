import { cn } from '@/lib/utils'
import { THRESHOLDS, STATUS, useFormat } from '@/features/dashboard/ui'
import { colorOf } from '@/features/projects/charts'

const LINE = '#C98A12'
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v))

// Same two-option switch on the Objectives and Departments pages.
export function ViewSwitch({ value, onChange, options, label }) {
  return (
    <div role="group" aria-label={label} className="inline-flex rounded-md border border-line bg-white p-0.5">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          aria-pressed={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn('h-8 rounded px-3 text-sm', value === o.value ? 'bg-ink text-white' : 'text-ink hover:bg-brand-soft')}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

const DIMS = {
  lg: { w: 440, h: 180, l: 36, r: 16, t: 26, b: 26, font: 12, dot: 5, axis: true },
  md: { w: 230, h: 120, l: 28, r: 10, t: 22, b: 20, font: 9, dot: 3.5, axis: true },
  sm: { w: 240, h: 50, l: 8, r: 8, t: 16, b: 5, font: 9, dot: 2.5, axis: false },
}

// Line over months with a value label on every point. Trailing empty months are dropped, so the line
// stops at the last reported month; months in between with no value are skipped and the line joins across.
export function TrendLine({ values, size = 'md', className }) {
  const { n } = useFormat()
  const d = DIMS[size]
  let end = values.length
  while (end > 0 && values[end - 1] == null) end--
  const pts = values.slice(0, end).map((v, i) => (v == null ? null : [i, Number(v)])).filter(Boolean)
  if (!pts.length) {
    return <div className={cn('grid place-items-center text-xs text-muted', className)} style={{ aspectRatio: `${d.w} / ${d.h}` }}>—</div>
  }
  const min = Math.min(...pts.map((p) => p[1]))
  const max = Math.max(...pts.map((p) => p[1]))
  const step = d.axis ? (max - min > 30 ? 20 : 10) : 10
  const lo = Math.max(0, Math.floor((min - 4) / step) * step)
  const hi = Math.max(lo + step, Math.ceil((max + 4) / step) * step)
  const iw = d.w - d.l - d.r
  const ih = d.h - d.t - d.b
  const x = (i) => d.l + (end <= 1 ? iw / 2 : (i * iw) / (end - 1))
  const y = (v) => d.t + ih - ((v - lo) * ih) / (hi - lo)
  const ticks = []
  if (d.axis) for (let v = lo; v <= hi; v += step) ticks.push(v)
  return (
    <svg viewBox={`0 0 ${d.w} ${d.h}`} className={cn('block w-full', className)} style={{ direction: 'ltr' }} role="img" aria-label={pts.map((p) => n(p[1])).join(', ')}>
      {ticks.map((v) => (
        <g key={v}>
          <line x1={d.l} x2={d.w - d.r} y1={y(v)} y2={y(v)} stroke="#E5E7EB" strokeWidth="1" />
          <text x={d.l - 5} y={y(v)} textAnchor="end" dominantBaseline="central" fontSize={d.font} fill="#8A8F98">{n(v)}</text>
        </g>
      ))}
      {d.axis && Array.from({ length: end }, (_, i) => (
        <text key={i} x={x(i)} y={d.h - 6} textAnchor="middle" fontSize={d.font} fill="#8A8F98">{n(i + 1)}</text>
      ))}
      <polyline fill="none" stroke={LINE} strokeWidth={size === 'lg' ? 3 : 2} strokeLinejoin="round" strokeLinecap="round" points={pts.map(([i, v]) => `${x(i)},${y(v)}`).join(' ')} />
      {pts.map(([i, v]) => (
        <g key={i}>
          <circle cx={x(i)} cy={y(v)} r={d.dot} fill={LINE} />
          <text x={x(i)} y={y(v) - d.dot - 3} textAnchor="middle" fontSize={d.font} fill="#3B4048">{n(Math.round(v))}</text>
        </g>
      ))}
    </svg>
  )
}

// Month performance as a pie: the coloured slice runs clockwise from 12 o'clock, the rest stays grey.
export function PiePct({ pct, className }) {
  const { n } = useFormat()
  const size = 100
  const c = size / 2
  const r = c - 2
  const w = clamp(pct ?? 0, 0, 100)
  const a = (w / 100) * 2 * Math.PI
  const fill = colorOf(pct).fill
  return (
    <svg viewBox={`0 0 ${size} ${size}`} className={cn('block w-full', className)} role="img" aria-label={pct == null ? '—' : `${n(pct)}%`}>
      <circle cx={c} cy={c} r={r} fill="#E5E7EB" />
      {pct != null && w >= 100 && <circle cx={c} cy={c} r={r} fill={fill} />}
      {pct != null && w > 0 && w < 100 && (
        <path d={`M ${c} ${c} L ${c} ${c - r} A ${r} ${r} 0 ${w > 50 ? 1 : 0} 1 ${c + r * Math.sin(a)} ${c - r * Math.cos(a)} Z`} fill={fill} />
      )}
    </svg>
  )
}

export function BandLegend() {
  const { n } = useFormat()
  const items = [
    [STATUS.behind, `0 – ${n(THRESHOLDS.atRisk)}%`],
    [STATUS.at_risk, `${n(THRESHOLDS.atRisk)} – ${n(THRESHOLDS.onTrack)}%`],
    [STATUS.on_track, `${n(THRESHOLDS.onTrack)} – 100%`],
  ]
  return (
    <ul className="flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-muted">
      {items.map(([s, label]) => (
        <li key={label} className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm" style={{ background: s.fill }} aria-hidden="true" />
          <span className="tabular-nums">{label}</span>
        </li>
      ))}
    </ul>
  )
}
