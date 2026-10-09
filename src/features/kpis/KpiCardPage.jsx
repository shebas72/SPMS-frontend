import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import Chart from 'react-apexcharts'
import api from '@/lib/api'
import { canEdit } from '@/lib/roles'
import { fetchAll } from '@/lib/fetchAll'
import { useAuthStore } from '@/stores/authStore'
import { StatusBadge, STATUS, THRESHOLDS, useFormat } from '@/features/dashboard/ui'

const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1)
const SCORE_CAP = 120 // keep in sync with config('spms.score_cap')
const one = async (url) => (await api.get(url)).data.data
const linkBtn = "inline-flex h-9 items-center rounded-md border border-line bg-white px-3 text-sm hover:bg-brand-soft"
const num = (v) => (v == null ? null : Number(v))

function Tile({ label, children }) {
  return (
    <div className="rounded-lg border border-line bg-white p-4">
      <p className="text-xs text-muted">{label}</p>
      <div className="mt-2">{children}</div>
    </div>
  )
}

const NUMERIC_FIELDS = ['actual_value', 'target_value', 'annual_target', 'weight', 'threshold_red', 'threshold_yellow']
const BOOLEAN_FIELDS = ['is_active', 'has_recovery_target']
const NO_VALUE = ['kpi_created']

function History({ id }) {
  const { t } = useTranslation()
  const { lang, monthLong } = useFormat()
  const [page, setPage] = useState(1)
  const q = useQuery({
    queryKey: ['kpi-history', id, page],
    queryFn: async () => (await api.get(`/kpis/${id}/history`, { params: { page } })).data,
    placeholderData: (prev) => prev,
  })

  const loc = lang === 'ar' ? 'ar-u-nu-latn' : lang
  const numFmt = new Intl.NumberFormat(loc, { maximumFractionDigits: 4 })
  const dateFmt = new Intl.DateTimeFormat(loc, { dateStyle: 'medium', timeStyle: 'short' })

  const show = (field, v) => {
    if (v == null || v === '') return '—'
    if (NUMERIC_FIELDS.includes(field)) return numFmt.format(Number(v))
    if (BOOLEAN_FIELDS.includes(field)) return t(v === '1' ? 'kpiHistory.yes' : 'kpiHistory.no')
    if (field === 'data_status') return t(`kpiHistory.dataStatus.${v}`, { defaultValue: v })
    if (field === 'incomplete_reason') return t(`kpiEntry.reasons.${v}`, { defaultValue: v })
    if (field === 'direction') return t(`kpiList.directions.${v}`, { defaultValue: v })
    if (field === 'frequency') return t(`kpiList.frequencys.${v}`, { defaultValue: v })
    return v
  }

  const rows = q.data?.data ?? []
  const meta = q.data?.meta
  const creator = q.data?.creator

  return (
    <section className="overflow-x-auto rounded-lg border border-line bg-white">
      <div className="p-5 pb-3">
        <h2 className="text-sm font-semibold">{t('kpiHistory.title')}</h2>
        {creator && (
          <p className="mt-1 text-xs text-muted">
            {t('kpiHistory.createdBy', { name: creator.name ?? '—', date: creator.at ? dateFmt.format(new Date(creator.at)) : '—' })}
          </p>
        )}
      </div>
      {q.isLoading ? (
        <p className="p-5 pt-0 text-sm text-muted">{t('common.loading')}</p>
      ) : q.isError ? (
        <p className="p-5 pt-0 text-sm text-muted">{t('kpiHistory.error')}</p>
      ) : rows.length === 0 ? (
        <p className="p-5 pt-0 text-sm text-muted">{t('kpiHistory.empty')}</p>
      ) : (
        <>
          <table className="w-full min-w-[720px] text-sm">
            <thead className="border-y border-line text-xs text-muted">
              <tr>{['when', 'who', 'what', 'from', 'to'].map((c) => <th key={c} className="px-4 py-2.5 text-start font-medium">{t(`kpiHistory.col.${c}`)}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map((r) => {
                const period = r.month ? `${monthLong(r.month)} ${r.year}` : null
                const first = r.field && !NO_VALUE.includes(r.action) ? t(`kpiHistory.field.${r.field}`, { defaultValue: r.field }) : t(`kpiHistory.action.${r.action}`)
                return (
                  <tr key={r.id}>
                    <td className="whitespace-nowrap px-4 py-2.5 text-muted">{dateFmt.format(new Date(r.at))}</td>
                    <td className="px-4 py-2.5">{r.user ?? t('kpiHistory.unknownUser')}</td>
                    <td className="px-4 py-2.5">
                      <p className="font-medium">{first}</p>
                      <p className="text-xs text-muted">{[t(`kpiHistory.action.${r.action}`), period].filter(Boolean).join(' · ')}</p>
                    </td>
                    <td className="px-4 py-2.5 tabular-nums text-muted">{r.field ? show(r.field, r.old) : '—'}</td>
                    <td className="px-4 py-2.5 tabular-nums">{r.field ? show(r.field, r.new) : '—'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {meta?.last_page > 1 && (
            <div className="flex items-center justify-between border-t border-line px-4 py-3 text-xs text-muted">
              <button type="button" className={linkBtn} disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>{t('kpiHistory.previous')}</button>
              <span>{t('kpiHistory.page', { page, total: meta.last_page })}</span>
              <button type="button" className={linkBtn} disabled={page >= meta.last_page} onClick={() => setPage((p) => p + 1)}>{t('kpiHistory.next')}</button>
            </div>
          )}
        </>
      )}
    </section>
  )
}

export default function KpiCardPage() {
  const { id } = useParams()
  const { t } = useTranslation()
  const { n, pick, month, monthLong, rtl } = useFormat()
  const editable = canEdit(useAuthStore((s) => s.user))

  const kpi = useQuery({ queryKey: ['kpi', id], queryFn: () => one(`/kpis/${id}`), retry: false })
  const k = kpi.data
  const on = Boolean(k)
  const targets = useQuery({ queryKey: ['card-targets', id, k?.year], queryFn: () => fetchAll('/kpi-targets', { kpi_id: id, year: k.year }), enabled: on })
  const entries = useQuery({ queryKey: ['card-entries', id, k?.year], queryFn: () => fetchAll('/kpi-entries', { kpi_id: id, year: k.year }, 200), enabled: on })
  const objective = useQuery({ queryKey: ['objective', k?.strategic_objective_id], queryFn: () => one(`/objectives/${k.strategic_objective_id}`), enabled: Boolean(k?.strategic_objective_id) })
  const department = useQuery({ queryKey: ['department', k?.department_id], queryFn: () => one(`/departments/${k.department_id}`), enabled: Boolean(k?.department_id) })

  const d = useMemo(() => {
    if (!k || !targets.data || !entries.data) return null
    const tBy = Object.fromEntries(targets.data.map((r) => [r.month, num(r.target_value)]))
    const eBy = Object.fromEntries(entries.data.map((r) => [r.month, r]))
    const target = MONTHS.map((m) => tBy[m] ?? null)
    const actual = MONTHS.map((m) => num(eBy[m]?.actual_value))
    const ach = MONTHS.map((m) => num(eBy[m]?.achievement_pct))
    const done = ach.filter((a) => a != null)
    const latest = ach.reduce((acc, a, i) => (a != null ? i + 1 : acc), 0)
    const avg = done.length ? done.reduce((s, a) => s + Math.min(a, SCORE_CAP), 0) / done.length : null
    // Run-rate projection: remaining months land at the average achievement so far, using the same achievement formula as the API.
    const projected = MONTHS.map((m) => {
      if (!latest || avg == null) return null
      if (m === latest) return actual[m - 1]
      if (m < latest || target[m - 1] == null) return null
      if (k.direction === 'lower_is_better') return avg > 0 ? target[m - 1] / (avg / 100) : null
      return target[m - 1] * (avg / 100)
    })
    return { tBy, eBy, target, actual, ach, projected, latest, avg, count: done.length }
  }, [k, targets.data, entries.data])

  const scoreOf = (basis) => useQuery({
    queryKey: ['card-score', basis, k?.year, d?.latest],
    queryFn: async () => (await api.get('/dashboard/classification', { params: { year: k.year, month: d.latest, basis } })).data.data.groups,
    enabled: Boolean(d?.latest),
    select: (g) => Object.values(g).flat().find((x) => String(x.id) === String(id)),
  })
  const cur = scoreOf('month')
  const ytd = scoreOf('ytd')

  if (kpi.isLoading || (on && (targets.isLoading || entries.isLoading))) return <p className="text-muted">{t('common.loading')}</p>
  if (kpi.isError || targets.isError || entries.isError || !d) {
    return (
      <div className="max-w-md space-y-4 rounded-lg border border-line bg-white p-5">
        <p className="text-sm">{kpi.error?.response?.status === 404 ? t('kpiCard.notFound') : t('kpiCard.error')}</p>
        <Link to="/kpis" className={linkBtn}>{t('kpiCard.back')}</Link>
      </div>
    )
  }

  const red = Number(k.threshold_red) > 0 ? Number(k.threshold_red) : THRESHOLDS.atRisk
  const yellow = Number(k.threshold_yellow) > 0 ? Number(k.threshold_yellow) : THRESHOLDS.onTrack
  const names = { target: t('kpiCard.seriesTarget'), actual: t('kpiCard.seriesActual'), projected: t('kpiCard.seriesProjected'), ach: t('kpiCard.seriesAchievement') }
  const options = {
    chart: { type: 'line', toolbar: { show: false }, fontFamily: 'inherit', animations: { enabled: false } },
    colors: ['#C5CBD3', '#1F2937', '#1F2937', '#185FA5'],
    stroke: { width: [0, 0, 2, 3], dashArray: [0, 0, 5, 0] },
    markers: { size: [0, 0, 3, 4] },
    plotOptions: { bar: { columnWidth: '55%' } },
    dataLabels: { enabled: false },
    xaxis: { categories: MONTHS.map(month) },
    yaxis: [
      { seriesName: names.target, title: { text: k.unit || undefined }, labels: { formatter: (v) => n(v) } },
      { seriesName: names.target, show: false },
      { seriesName: names.target, show: false },
      { opposite: true, min: 0, title: { text: '%' }, labels: { formatter: (v) => n(Math.round(v)) } },
    ],
    annotations: { yaxis: [[red, STATUS.behind.fill], [yellow, STATUS.on_track.fill]].map(([y, borderColor]) => ({ y, yAxisIndex: 3, borderColor, strokeDashArray: 2 })) },
    legend: { position: 'top', horizontalAlign: rtl ? 'right' : 'left' },
    tooltip: { shared: true, y: { formatter: (v) => (v == null ? '' : n(v)) } },
    grid: { borderColor: '#E5E7EB' },
  }
  const series = [
    { name: names.target, type: 'column', data: d.target },
    { name: names.actual, type: 'column', data: d.actual },
    { name: names.projected, type: 'line', data: d.projected },
    { name: names.ach, type: 'line', data: d.ach },
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link to="/kpis" className="text-sm text-muted hover:underline">{t('kpiCard.back')}</Link>
          <h1 className="mt-1 text-2xl font-semibold">{pick(k)}</h1>
          <p className="mt-1 text-sm text-muted">
            {[k.code, k.year, objective.data && pick(objective.data), department.data && pick(department.data), t(`kpiList.directions.${k.direction}`), t(`kpiList.frequencys.${k.frequency}`)].filter(Boolean).join(' · ')}
          </p>
        </div>
        {editable && <Link to="/kpi-entry" className={linkBtn}>{t('kpiCard.enterData')}</Link>}
      </div>

      {d.count === 0 ? (
        <p className="rounded-lg border border-dashed border-line p-6 text-sm text-muted">{t('kpiCard.noEntries')}</p>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Tile label={t('kpiCard.latest', { month: monthLong(d.latest) })}>
              {cur.data ? <><p className="text-2xl font-semibold tabular-nums">{n(cur.data.score)}</p><StatusBadge status={cur.data.status} score={cur.data.score} /></> : '—'}
            </Tile>
            <Tile label={t('dashboard.ytd')}>
              {ytd.data ? <><p className="text-2xl font-semibold tabular-nums">{n(ytd.data.score)}</p><StatusBadge status={ytd.data.status} score={ytd.data.score} /></> : '—'}
            </Tile>
            <Tile label={t('kpiCard.annual')}><p className="text-2xl font-semibold tabular-nums">{k.annual_target == null ? '—' : n(Number(k.annual_target))}<span className="ms-1 text-sm font-normal text-muted">{k.unit}</span></p></Tile>
            <Tile label={t('kpiCard.entered')}><p className="text-2xl font-semibold tabular-nums">{t('kpiCard.enteredValue', { count: n(d.count) })}</p></Tile>
          </div>

          <section className="rounded-lg border border-line bg-white p-5">
            <h2 className="mb-4 text-sm font-semibold">{t('kpiCard.chartTitle')}</h2>
            <div dir="ltr"><Chart type="line" height={340} options={options} series={series} /></div>
            <p className="mt-3 text-xs text-muted">{t('kpiCard.projectionNote', { pct: n(d.avg) })}</p>
          </section>
        </>
      )}

      <section className="overflow-x-auto rounded-lg border border-line bg-white">
        <h2 className="p-5 pb-3 text-sm font-semibold">{t('kpiCard.detail')}</h2>
        <table className="w-full min-w-[720px] text-sm">
          <thead className="border-y border-line text-xs text-muted">
            <tr>{['month', 'target', 'actual', 'achievement', 'status', 'note'].map((c) => <th key={c} className="px-4 py-2.5 text-start font-medium">{t(`kpiCard.col.${c}`)}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-line">
            {MONTHS.map((m) => {
              const e = d.eBy[m]
              return (
                <tr key={m}>
                  <td className="px-4 py-2.5 font-medium">{monthLong(m)}</td>
                  <td className="px-4 py-2.5 tabular-nums">{n(d.target[m - 1])}</td>
                  <td className="px-4 py-2.5 tabular-nums">{n(d.actual[m - 1])}</td>
                  <td className="px-4 py-2.5 tabular-nums">{d.ach[m - 1] == null ? '—' : `${n(d.ach[m - 1])}%`}</td>
                  <td className="px-4 py-2.5">{e ? <StatusBadge status={e.status} score={d.ach[m - 1]} /> : '—'}</td>
                  <td className="px-4 py-2.5 text-muted">{e?.data_status === 'incomplete' ? t(`kpiEntry.reasons.${e.incomplete_reason}`, { defaultValue: e.incomplete_reason ?? '' }) : e?.note}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </section>

      <History id={id} />
    </div>
  )
}
