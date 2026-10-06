import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import Chart from 'react-apexcharts'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { useDashboard } from './useDashboard'
import { Counts, ScoreBar, StatusBadge, THRESHOLDS, STATUS, keyOf, statusOf, useFormat } from './ui'

const Card = ({ title, className, children }) => (
  <section className={cn('rounded-lg border border-line bg-white p-5', className)}>
    {title && <h2 className="mb-4 text-sm font-semibold">{title}</h2>}
    {children}
  </section>
)

export function PeriodPicker({ period, onChange }) {
  const { t } = useTranslation()
  const { monthLong } = useFormat()
  const thisYear = new Date().getFullYear()
  const years = [...new Set([...Array.from({ length: 5 }, (_, i) => thisYear - i), period.year])].sort((a, b) => b - a)
  const cls = 'h-9 rounded-md border border-line bg-white px-2 text-sm'
  return (
    <div className="flex gap-2">
      <label>
        <span className="sr-only">{t('dashboard.year')}</span>
        <select className={cls} value={period.year} onChange={(e) => onChange({ year: Number(e.target.value) })}>
          {years.map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
      </label>
      <label>
        <span className="sr-only">{t('dashboard.month')}</span>
        <select className={cls} value={period.month} onChange={(e) => onChange({ year: period.year, month: Number(e.target.value) })}>
          {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => <option key={m} value={m}>{monthLong(m)}</option>)}
        </select>
      </label>
    </div>
  )
}

function OverallRow({ label, block }) {
  const { n } = useFormat()
  const key = keyOf(block.score, block.status)
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm text-muted">{label}</span>
        <StatusBadge status={block.status} score={block.score} />
      </div>
      <div className="text-4xl font-semibold tabular-nums" style={{ color: statusOf(key).text }}>
        {n(block.score)}<span className="ms-1 text-lg font-normal text-muted">%</span>
      </div>
      <ScoreBar score={block.score} status={block.status} />
      <Counts data={block} />
    </div>
  )
}

function TrendChart({ trend }) {
  const { t } = useTranslation()
  const { lang, rtl, n, month } = useFormat()
  const options = {
    chart: { type: 'line', toolbar: { show: false }, fontFamily: 'inherit', animations: { enabled: false } },
    colors: ['#9AA3AF', '#1F2937'],
    stroke: { width: [2, 3], dashArray: [4, 0] },
    markers: { size: 3 },
    xaxis: { categories: trend.map((r) => month(r.month)) },
    yaxis: { min: 0, max: 100, tickAmount: 5, opposite: rtl, labels: { formatter: (v) => n(v) } },
    annotations: {
      yaxis: [THRESHOLDS.atRisk, THRESHOLDS.onTrack].map((y, i) => ({
        y, borderColor: i ? STATUS.on_track.fill : STATUS.behind.fill, strokeDashArray: 2,
      })),
    },
    legend: { position: 'top', horizontalAlign: rtl ? 'right' : 'left' },
    tooltip: { y: { formatter: (v) => n(v) } },
    grid: { borderColor: '#E5E7EB' },
  }
  const series = [
    { name: t('dashboard.trendMonth'), data: trend.map((r) => r.score) },
    { name: t('dashboard.trendYtd'), data: trend.map((r) => r.ytd_score) },
  ]
  return (
    <div dir="ltr">
      <Chart key={lang} type="line" height={280} options={options} series={series} />
    </div>
  )
}

function PerspectiveCard({ p }) {
  const { t } = useTranslation()
  const { n, pick } = useFormat()
  const key = keyOf(p.current.score, p.current.status)
  return (
    <article className="rounded-lg border border-line bg-white p-5" style={{ borderTop: `3px solid ${p.color}` }}>
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-sm font-semibold">{pick(p)}</h3>
        <span className="shrink-0 text-xs text-muted">{t('dashboard.weight', { value: n(Number(p.weight)) })}</span>
      </div>
      <div className="mt-3 flex items-baseline justify-between gap-2">
        <span className="text-3xl font-semibold tabular-nums" style={{ color: statusOf(key).text }}>{n(p.current.score)}</span>
        <StatusBadge status={p.current.status} score={p.current.score} />
      </div>
      <ScoreBar className="mt-3" score={p.current.score} status={p.current.status} />
      <p className="mt-3 flex items-center justify-between gap-2 text-xs text-muted">
        {t('dashboard.ytd')}
        <span className="font-medium tabular-nums" style={{ color: statusOf(keyOf(p.ytd.score, p.ytd.status)).text }}>{n(p.ytd.score)}</span>
      </p>
      <div className="mt-3"><Counts data={p.current} /></div>
    </article>
  )
}

export default function DashboardPage() {
  const { t } = useTranslation()
  const { n, pick, monthLong } = useFormat()
  const [period, setPeriod] = useState({})
  const { data, isLoading, isError, refetch } = useDashboard(period)

  if (isLoading) return <p className="text-muted">{t('common.loading')}</p>
  if (isError || !data) {
    return (
      <Card className="max-w-md">
        <p className="text-sm">{t('dashboard.error')}</p>
        <Button className="mt-4" variant="outline" size="sm" onClick={() => refetch()}>{t('dashboard.retry')}</Button>
      </Card>
    )
  }

  const { overall, trend, perspectives, worst_kpis: worst, data_completeness: dc } = data
  const reasons = Object.entries(dc.incomplete_reasons ?? {})

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">{t('nav.dashboard')}</h1>
        <PeriodPicker period={data.period} onChange={setPeriod} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <Card title={t('dashboard.overall')} className="space-y-6">
          <OverallRow label={t('dashboard.thisMonth', { month: monthLong(data.period.month) })} block={overall.current} />
          <hr className="border-line" />
          <OverallRow label={t('dashboard.ytd')} block={overall.ytd} />
        </Card>
        <Card title={t('dashboard.trend')}><TrendChart trend={trend} /></Card>
      </div>

      <section aria-labelledby="bsc-title">
        <h2 id="bsc-title" className="mb-3 text-sm font-semibold">{t('dashboard.perspectives')}</h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {perspectives.map((p) => <PerspectiveCard key={p.id} p={p} />)}
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title={t('dashboard.completeness')}>
          <p className="text-3xl font-semibold tabular-nums">{n(dc.pct)}<span className="ms-1 text-lg font-normal text-muted">%</span></p>
          <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-line" role="img" aria-label={`${n(dc.pct)}%`}>
            <div className="h-full rounded-full bg-brand" style={{ width: `${dc.pct ?? 0}%` }} />
          </div>
          <p className="mt-2 text-sm text-muted">{t('dashboard.entered', { entered: n(dc.entered), expected: n(dc.expected) })}</p>
          {reasons.length > 0 && (
            <div className="mt-4">
              <h3 className="text-xs font-semibold">{t('dashboard.reasons')}</h3>
              <ul className="mt-2 space-y-1 text-sm">
                {reasons.map(([reason, count]) => (
                  <li key={reason} className="flex justify-between gap-3">
                    <span>{t(`dashboard.reasonLabels.${reason}`, { defaultValue: reason })}</span>
                    <span className="tabular-nums text-muted">{n(count)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Card>

        <Card title={t('dashboard.worst')}>
          {worst.length === 0 ? (
            <p className="text-sm text-muted">{t('dashboard.worstEmpty')}</p>
          ) : (
            <ul className="divide-y divide-line">
              {worst.map((k) => (
                <li key={k.id} className="flex items-center justify-between gap-4 py-2.5 first:pt-0 last:pb-0">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{pick(k)}</p>
                    <p className="text-xs text-muted">{k.code}</p>
                  </div>
                  <span className="text-lg font-semibold tabular-nums" style={{ color: STATUS.behind.text }}>{n(k.score)}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  )
}
