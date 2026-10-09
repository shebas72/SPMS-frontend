import { useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import Chart from 'react-apexcharts'
import { fetchAll } from '@/lib/fetchAll'
import { Button } from '@/components/ui/button'
import { STATUS, useFormat } from '@/features/dashboard/ui'
import { colorOf } from '@/features/projects/charts'

const UNASSIGNED = 0

export default function ExecutionPlanPage() {
  const { t } = useTranslation()
  const { n, pick, lang } = useFormat()
  const qc = useQueryClient()
  const [year, setYear] = useState(null)
  const q = useQuery({ queryKey: ['exec-plan-projects'], queryFn: () => fetchAll('/projects') })

  const years = useMemo(() => [...new Set((q.data ?? []).map((p) => p.year))].sort((a, b) => b - a), [q.data])
  const current = year ?? years[0]

  // Cancelled and inactive projects are left out. Each department's score is the average completion of its own projects.
  const { rows, overall, aligned, total } = useMemo(() => {
    const included = (q.data ?? []).filter((p) => p.year === current && p.is_active !== false && p.status !== 'cancelled')
    const groups = {}
    included.forEach((p) => {
      const id = p.department_id ?? UNASSIGNED
      ;(groups[id] ??= { id, dept: p.department, items: [] }).items.push(p)
    })
    const rows = Object.values(groups).map((g) => ({
      ...g,
      aligned: g.items.filter((p) => p.is_on_timeline).length,
      off: g.items.filter((p) => !p.is_on_timeline).length,
      pct: g.items.reduce((s, p) => s + p.completion_pct, 0) / g.items.length,
    })).sort((a, b) => a.pct - b.pct)
    return {
      rows, total: included.length, aligned: included.filter((p) => p.is_on_timeline).length,
      overall: included.length ? included.reduce((s, p) => s + p.completion_pct, 0) / included.length : null,
    }
  }, [q.data, current])

  if (q.isLoading) return <p className="text-muted">{t('common.loading')}</p>
  if (q.isError) {
    return (
      <div className="max-w-md rounded-lg border border-line bg-white p-5">
        <p className="text-sm">{t('executionPlan.error')}</p>
        <Button className="mt-4" variant="outline" size="sm" onClick={() => qc.invalidateQueries()}>{t('dashboard.retry')}</Button>
      </div>
    )
  }

  const label = (r) => (r.dept ? pick(r.dept) : t('executionPlan.unassigned'))
  const maxCount = Math.max(1, ...rows.map((r) => r.aligned + r.off))
  const achieved = overall == null ? 0 : Math.round(overall * 10) / 10

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">{t('nav.executionPlan')}</h1>
          <p className="mt-1 text-sm text-muted">{t('executionPlan.hint')}</p>
        </div>
        {years.length > 0 && (
          <label>
            <span className="sr-only">{t('dashboard.year')}</span>
            <select className="h-9 rounded-md border border-line bg-white px-2 text-sm" value={current} onChange={(e) => setYear(Number(e.target.value))}>
              {years.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
          </label>
        )}
      </div>

      {total === 0 ? (
        <p className="rounded-lg border border-dashed border-line p-6 text-sm text-muted">{t('executionPlan.empty')}</p>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_20rem]">
          <section className="rounded-lg border border-line bg-white p-5">
            <h2 className="text-sm font-semibold">{t('executionPlan.aligned')}</h2>
            <p className="mt-1 text-xs text-muted">{t('executionPlan.alignedSummary', { aligned: n(aligned), total: n(total) })}</p>
            <ul className="mt-4 space-y-3">
              {rows.map((r) => (
                <li key={r.id} className="grid grid-cols-[7rem_minmax(0,1fr)] items-center gap-3 text-xs">
                  <span className="truncate" title={label(r)}>{label(r)}</span>
                  <div className="flex h-6 overflow-hidden rounded-sm" style={{ width: `${((r.aligned + r.off) / maxCount) * 100}%` }}
                    role="img" aria-label={t('executionPlan.alignedRow', { aligned: r.aligned, off: r.off })}>
                    {r.aligned > 0 && <span className="grid place-items-center font-semibold text-white" style={{ flex: r.aligned, background: STATUS.on_track.fill }}>{n(r.aligned)}</span>}
                    {r.off > 0 && <span className="grid place-items-center font-semibold text-white" style={{ flex: r.off, background: STATUS.behind.fill }}>{n(r.off)}</span>}
                  </div>
                </li>
              ))}
            </ul>
            <ul className="mt-5 flex flex-wrap gap-4 text-xs">
              <li className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-sm" style={{ background: STATUS.on_track.fill }} aria-hidden="true" />{t('executionPlan.onTimeline')}</li>
              <li className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-sm" style={{ background: STATUS.behind.fill }} aria-hidden="true" />{t('executionPlan.offTimeline')}</li>
            </ul>
          </section>

          <section className="rounded-lg border border-line bg-white p-5">
            <h2 className="text-sm font-semibold">{t('executionPlan.achievement')}</h2>
            <ul className="mt-4 space-y-3">
              {rows.map((r) => (
                <li key={r.id} className="grid grid-cols-[7rem_minmax(0,1fr)_3rem] items-center gap-3 text-xs">
                  <span className="truncate" title={label(r)}>{label(r)}</span>
                  <div className="h-6 rounded-sm bg-line/60" role="img" aria-label={`${n(Math.round(r.pct))}%`}>
                    <div className="h-full rounded-sm" style={{ width: `${Math.min(100, r.pct)}%`, background: colorOf(r.pct).fill }} />
                  </div>
                  <span className="text-end font-semibold tabular-nums" style={{ color: colorOf(r.pct).text }}>{n(Math.round(r.pct))}%</span>
                </li>
              ))}
            </ul>
            <ul className="mt-5 flex flex-wrap gap-4 text-xs" aria-label={t('projects.legend')}>
              {[['behind', '0–60%'], ['at_risk', '60–80%'], ['on_track', '80–100%']].map(([k, text]) => (
                <li key={k} className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-sm" style={{ background: STATUS[k].fill }} aria-hidden="true" /><span style={{ color: STATUS[k].text }} className="font-medium">{text}</span></li>
              ))}
            </ul>
          </section>

          <section className="rounded-lg border border-line bg-white p-5" dir="ltr" key={lang}>
            <h2 className="text-sm font-semibold">{t('executionPlan.overall')}</h2>
            <Chart type="donut" height={280} series={[achieved, Math.max(0, Math.round((100 - achieved) * 10) / 10)]}
              options={{
                chart: { fontFamily: 'inherit', animations: { enabled: false } },
                labels: [t('executionPlan.achieved'), t('executionPlan.unachieved')], colors: [STATUS.on_track.fill, STATUS.behind.fill],
                legend: { position: 'bottom' }, stroke: { width: 1 },
                dataLabels: { enabled: true, formatter: (v) => `${n(Math.round(v))}%` },
                tooltip: { y: { formatter: (v) => `${n(v)}%` } },
              }} />
          </section>
        </div>
      )}
    </div>
  )
}
