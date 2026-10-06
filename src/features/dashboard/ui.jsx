import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import { getDirection } from '@/config/languages'

// Keep in sync with PerformanceService. Status labels always come from the API; these only draw the bands.
export const THRESHOLDS = { atRisk: 60, onTrack: 80 }

export const STATUS = {
  on_track: { fill: '#2E7D4F', text: '#1F6B40' },
  at_risk: { fill: '#D99A1B', text: '#8A5A00' },
  behind: { fill: '#C94434', text: '#A32B1E' },
  none: { fill: '#8A8F98', text: '#5B616B' },
}
export const statusOf = (s) => STATUS[s] ?? STATUS.none
export const keyOf = (score, status) => (score == null ? 'none' : status)

export function useFormat() {
  const { i18n } = useTranslation()
  const lang = (i18n.language || 'en').split('-')[0]
  const loc = lang === 'ar' ? 'ar-u-nu-latn' : lang
  const num = new Intl.NumberFormat(loc, { maximumFractionDigits: 1 })
  return {
    lang,
    rtl: getDirection(lang) === 'rtl',
    n: (v) => (v == null ? '—' : num.format(v)),
    month: (m) => new Intl.DateTimeFormat(loc, { month: 'short' }).format(new Date(2000, m - 1, 1)),
    monthLong: (m) => new Intl.DateTimeFormat(loc, { month: 'long' }).format(new Date(2000, m - 1, 1)),
    pick: (o, key = 'name') => (lang === 'ar' && o?.[`${key}_ar`]) || o?.[key],
  }
}

export function StatusBadge({ status, score }) {
  const { t } = useTranslation()
  const key = keyOf(score, status)
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium" style={{ color: statusOf(key).text }}>
      <span className="h-2 w-2 rounded-full" style={{ background: statusOf(key).fill }} aria-hidden="true" />
      {t(`dashboard.status.${key}`)}
    </span>
  )
}

const BANDS = [
  [THRESHOLDS.atRisk, '#C9443422'],
  [THRESHOLDS.onTrack - THRESHOLDS.atRisk, '#D99A1B2B'],
  [100 - THRESHOLDS.onTrack, '#2E7D4F22'],
]

// The track shows where the red / amber / green bands sit, so the fill reads against the targets.
export function ScoreBar({ score, status, className }) {
  const w = Math.max(0, Math.min(100, score ?? 0))
  return (
    <div className={cn('relative flex h-2.5 overflow-hidden rounded-full', className)} role="img" aria-label={`${Math.round(w)}%`}>
      {BANDS.map(([width, bg], i) => (
        <span key={i} style={{ width: `${width}%`, background: bg }} />
      ))}
      <span className="absolute inset-y-0 start-0 rounded-full" style={{ width: `${w}%`, background: statusOf(keyOf(score, status)).fill }} />
    </div>
  )
}

export function Counts({ data }) {
  const { t } = useTranslation()
  const { n } = useFormat()
  const items = [['high', STATUS.on_track.fill], ['medium', STATUS.at_risk.fill], ['low', STATUS.behind.fill], ['not_entered', STATUS.none.fill]]
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
      {items
        .filter(([k]) => k !== 'not_entered' || data.not_entered > 0)
        .map(([k, color]) => (
          <li key={k} className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full" style={{ background: color }} aria-hidden="true" />
            <span className="font-medium tabular-nums text-ink">{n(data[k])}</span>
            {t(`dashboard.${k === 'not_entered' ? 'notEntered' : k}`)}
          </li>
        ))}
    </ul>
  )
}
