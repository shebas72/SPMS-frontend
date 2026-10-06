import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import api from '@/lib/api'
import { cn } from '@/lib/utils'
import { canEdit } from '@/lib/roles'
import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/stores/authStore'
import { useDashboard } from '@/features/dashboard/useDashboard'
import { PeriodPicker } from '@/features/dashboard/DashboardPage'
import { StatusBadge, useFormat } from '@/features/dashboard/ui'

const REASONS = ['unavailable', 'not_recorded', 'cooperation_issue', 'other']
const input = 'h-9 rounded-md border border-line bg-white px-2 text-sm disabled:bg-brand-soft disabled:text-muted'
const PAGE_SIZE = 10

// Handles both response shapes: resource collections (meta.last_page) and raw paginators (last_page).
async function fetchAll(url, params, perPage) {
  const rows = []
  for (let page = 1; ; page++) {
    const { data } = await api.get(url, { params: { ...params, per_page: perPage, page } })
    rows.push(...data.data)
    if (page >= (data.meta?.last_page ?? data.last_page ?? 1)) return rows
  }
}

function useEntryData(year, month) {
  const enabled = Boolean(year && month)
  return {
    kpis: useQuery({ queryKey: ['entry-kpis', year], queryFn: () => fetchAll('/kpis', { year }, 100), enabled }),
    targets: useQuery({ queryKey: ['entry-targets', year, month], queryFn: () => fetchAll('/kpi-targets', { year, month }, 100), enabled }),
    entries: useQuery({ queryKey: ['entry-entries', year, month], queryFn: () => fetchAll('/kpi-entries', { year, month }, 200), enabled }),
  }
}

export default function KpiEntryPage() {
  const { t } = useTranslation()
  const { n, pick } = useFormat()
  const qc = useQueryClient()
  const editable = canEdit(useAuthStore((s) => s.user))
  const [period, setPeriod] = useState({})
  const [drafts, setDrafts] = useState({})
  const [errors, setErrors] = useState({})
  const [search, setSearch] = useState('')
  const [missingOnly, setMissingOnly] = useState(false)
  const [page, setPage] = useState(1)
  const dash = useDashboard(period)
  const p = dash.data?.period
  const { kpis, targets, entries } = useEntryData(p?.year, p?.month)

  const targetBy = useMemo(() => Object.fromEntries((targets.data ?? []).map((x) => [x.kpi_id, Number(x.target_value)])), [targets.data])
  const entryBy = useMemo(() => Object.fromEntries((entries.data ?? []).map((x) => [x.kpi_id, x])), [entries.data])
  const valueOf = (k) => drafts[k.id] ?? {
    actual: entryBy[k.id]?.actual_value != null ? String(Number(entryBy[k.id].actual_value)) : '',
    reason: entryBy[k.id]?.incomplete_reason ?? 'not_recorded',
    note: entryBy[k.id]?.note ?? '',
  }
  const edit = (k, patch) => setDrafts((d) => ({ ...d, [k.id]: { ...valueOf(k), ...patch } }))

  const all = (kpis.data ?? []).filter((k) => k.is_active !== false)
  const rows = all
    .filter((k) => `${k.code} ${k.name} ${k.name_ar ?? ''}`.toLowerCase().includes(search.toLowerCase()))
    .filter((k) => !missingOnly || entryBy[k.id]?.actual_value == null)
  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const pageRows = rows.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)
  const entered = all.filter((k) => entryBy[k.id]?.actual_value != null).length
  const dirtyIds = Object.keys(drafts).map(Number)

  const save = useMutation({
    mutationFn: () => api.post('/kpi-entries/bulk', {
      year: p.year, month: p.month,
      entries: dirtyIds.map((id) => {
        const d = drafts[id]
        const blank = d.actual === ''
        return { kpi_id: id, actual_value: blank ? null : Number(d.actual), note: d.note || null, data_status: blank ? 'incomplete' : 'complete', incomplete_reason: blank ? d.reason : null }
      }),
    }),
    onSuccess: () => { setDrafts({}); setErrors({}); qc.invalidateQueries() },
    onError: (e) => {
      // Bulk is all-or-nothing; errors come back keyed "entries.<index>.<field>", so map them to the row.
      const byKpi = {}
      Object.entries(e.response?.data?.errors ?? {}).forEach(([key, msgs]) => {
        const m = key.match(/^entries\.(\d+)\./)
        if (m) byKpi[dirtyIds[Number(m[1])]] = msgs[0]
      })
      setErrors(byKpi)
    },
  })

  const changePeriod = (next) => {
    if (dirtyIds.length && !window.confirm(t('kpiEntry.discardConfirm'))) return
    setDrafts({}); setErrors({}); setPage(1); setPeriod(next)
  }

  if (dash.isLoading || kpis.isLoading || targets.isLoading || entries.isLoading) return <p className="text-muted">{t('common.loading')}</p>
  if (dash.isError || kpis.isError || targets.isError || entries.isError || !p) {
    return (
      <div className="max-w-md rounded-lg border border-line bg-white p-5">
        <p className="text-sm">{t('kpiEntry.error')}</p>
        <Button className="mt-4" variant="outline" size="sm" onClick={() => { dash.refetch(); kpis.refetch(); targets.refetch(); entries.refetch() }}>{t('dashboard.retry')}</Button>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">{t('nav.kpiEntry')}</h1>
          <p className="mt-1 text-sm text-muted">{t('kpiEntry.progress', { entered: n(entered), total: n(all.length) })}{!editable && ` · ${t('kpiEntry.readOnly')}`}</p>
        </div>
        <PeriodPicker period={p} onChange={changePeriod} />
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <input type="search" className={cn(input, 'w-64')} placeholder={t('kpiEntry.search')} aria-label={t('kpiEntry.search')} value={search} onChange={(e) => { setPage(1); setSearch(e.target.value) }} />
        <label className="inline-flex items-center gap-2 text-sm">
          <input type="checkbox" checked={missingOnly} onChange={(e) => { setPage(1); setMissingOnly(e.target.checked) }} />
          {t('kpiEntry.missingOnly')}
        </label>
      </div>

      {rows.length === 0 ? (
        <p className="rounded-lg border border-dashed border-line p-6 text-sm text-muted">{t('kpiEntry.empty')}</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-line bg-white">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="border-b border-line text-xs text-muted">
              <tr>{['kpi', 'target', 'actual', 'status', 'note'].map((c) => <th key={c} className="px-4 py-3 text-start font-medium">{t(`kpiEntry.${c}`)}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-line">
              {pageRows.map((k) => {
                const v = valueOf(k)
                const target = targetBy[k.id]
                const e = entryBy[k.id]
                const dirty = k.id in drafts
                return (
                  <tr key={k.id} className={cn('align-top', dirty && 'bg-brand-soft')}>
                    <td className="px-4 py-3">
                      <p className="font-medium">{pick(k)}</p>
                      <p className="text-xs text-muted">{k.code}</p>
                      {errors[k.id] && <p role="alert" className="mt-1 text-xs text-[#A32B1E]">{errors[k.id]}</p>}
                    </td>
                    <td className="px-4 py-3 tabular-nums">{target == null ? <span className="text-xs text-muted">{t('kpiEntry.noTarget')}</span> : `${n(target)} ${k.unit ?? ''}`}</td>
                    <td className="px-4 py-3">
                      <input
                        type="number" step="any" inputMode="decimal" className={cn(input, 'w-28 tabular-nums')} aria-label={`${t('kpiEntry.actual')} ${k.code}`}
                        disabled={!editable || target == null} value={v.actual} onChange={(ev) => edit(k, { actual: ev.target.value })}
                      />
                      {dirty && v.actual === '' && (
                        <select className={cn(input, 'mt-2 block')} aria-label={t('kpiEntry.reason')} value={v.reason} onChange={(ev) => edit(k, { reason: ev.target.value })}>
                          {REASONS.map((r) => <option key={r} value={r}>{t(`kpiEntry.reasons.${r}`)}</option>)}
                        </select>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={e?.status} score={e?.achievement_pct == null ? null : Number(e.achievement_pct)} />
                      {e?.achievement_pct != null && <p className="mt-1 text-xs tabular-nums text-muted">{n(Number(e.achievement_pct))}%</p>}
                    </td>
                    <td className="px-4 py-3">
                      <input className={cn(input, 'w-full min-w-40')} aria-label={`${t('kpiEntry.note')} ${k.code}`} disabled={!editable} value={v.note} onChange={(ev) => edit(k, { note: ev.target.value })} />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {rows.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
          <p className="text-muted">
            {t('kpiEntry.pagination.showing', {
              from: (currentPage - 1) * PAGE_SIZE + 1,
              to: Math.min(currentPage * PAGE_SIZE, rows.length),
              total: rows.length,
            })}
          </p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}>
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
              {t('kpiEntry.pagination.previous')}
            </Button>
            <span className="tabular-nums text-muted" aria-live="polite">
              {t('kpiEntry.pagination.page', { page: currentPage, total: totalPages })}
            </span>
            <Button variant="outline" size="sm" disabled={currentPage === totalPages} onClick={() => setPage(currentPage + 1)}>
              {t('kpiEntry.pagination.next')}
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </Button>
          </div>
        </div>
      )}

      {editable && dirtyIds.length > 0 && (
        <div className="sticky bottom-4 flex flex-wrap items-center gap-3 rounded-lg border border-ink bg-white p-3 shadow-sm">
          <span className="text-sm font-medium">{t('kpiEntry.changed', { count: dirtyIds.length })}</span>
          <Button size="sm" disabled={save.isPending} onClick={() => save.mutate()}>{save.isPending ? t('kpiEntry.saving') : t('kpiEntry.save')}</Button>
          <Button size="sm" variant="outline" onClick={() => { setDrafts({}); setErrors({}) }}>{t('kpiEntry.discard')}</Button>
          {save.isError && <span role="alert" className="text-sm text-[#A32B1E]">{Object.keys(errors).length ? t('kpiEntry.fixRows') : save.error?.response?.data?.message || t('kpiEntry.saveError')}</span>}
        </div>
      )}
    </div>
  )
}
