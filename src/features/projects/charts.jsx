import { STATUS, THRESHOLDS, useFormat } from '@/features/dashboard/ui'

// Same bands as the slides: 0–60 red, 60–80 amber, 80–100 green.
export const bandOf = (pct) => (pct == null ? 'none' : pct >= THRESHOLDS.onTrack ? 'on_track' : pct >= THRESHOLDS.atRisk ? 'at_risk' : 'behind')
export const colorOf = (pct) => STATUS[bandOf(pct)]

export function Ring({ pct, size = 72 }) {
  const { n } = useFormat()
  const stroke = Math.max(8, size / 7)
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const w = Math.max(0, Math.min(100, pct ?? 0))
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={pct == null ? '—' : `${n(pct)}%`}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#E5E7EB" strokeWidth={stroke} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={colorOf(pct).fill} strokeWidth={stroke} strokeDasharray={`${(c * w) / 100} ${c}`} transform={`rotate(-90 ${size / 2} ${size / 2})`} />
      <text x="50%" y="50%" textAnchor="middle" dominantBaseline="central" fontSize={size / 4.2} fontWeight="600" fill={colorOf(pct).text}>{pct == null ? '—' : `${n(Math.round(pct))}%`}</text>
    </svg>
  )
}

// Line over months; months without a value are skipped and the line joins the points either side.
export function Sparkline({ values, width = 150, height = 64, labels = false }) {
  const { n } = useFormat()
  const pts = values.map((v, i) => (v == null ? null : [i, v])).filter(Boolean)
  if (!pts.length) return <div style={{ width, height }} className="grid place-items-center text-xs text-muted">—</div>
  const pad = labels ? 16 : 6
  const lo = Math.max(0, Math.min(...pts.map((p) => p[1])) - 10)
  const hi = Math.min(100, Math.max(...pts.map((p) => p[1])) + 10)
  const x = (i) => pad + (i * (width - pad * 2)) / Math.max(1, values.length - 1)
  const y = (v) => height - pad - ((v - lo) * (height - pad * 2)) / Math.max(1, hi - lo)
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} role="img" aria-label={pts.map((p) => n(p[1])).join(', ')}>
      <polyline fill="none" stroke="#C98A12" strokeWidth="2" points={pts.map(([i, v]) => `${x(i)},${y(v)}`).join(' ')} />
      {pts.map(([i, v]) => (
        <g key={i}>
          <circle cx={x(i)} cy={y(v)} r="2.5" fill="#C98A12" />
          {labels && <text x={x(i)} y={y(v) - 7} textAnchor="middle" fontSize="10" fill="#5B616B">{n(Math.round(v))}</text>}
        </g>
      ))}
    </svg>
  )
}
