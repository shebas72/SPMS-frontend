import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ChevronLeft, ChevronRight, Pencil, Plus, Trash2 } from 'lucide-react'
import api from '@/lib/api'
import { cn } from '@/lib/utils'
import { canEdit } from '@/lib/roles'
import { fetchAll } from '@/lib/fetchAll'
import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/stores/authStore'
import { useDashboard } from '@/features/dashboard/useDashboard'
import { PeriodPicker } from '@/features/dashboard/DashboardPage'
import { StatusBadge, useFormat } from '@/features/dashboard/ui'
import KpiForm from './KpiForm'

const sel = 'h-9 rounded-md border border-line bg-white px-2 text-sm'
const PAGE_SIZE = 10

export default function KpisPage() {
  const { t } = useTranslation()
  const { n, pick } = useFormat()
  const qc = useQueryClient()
  const editable = canEdit(useAuthStore((s) => s.user))
  const [period, setPeriod] = useState({})
  const [form, setForm] = useState(null) // null = closed, {} = new, kpi = editing
  const [filters, setFilters] = useState({ search: '', department: '', objective: '' })
  const [page, setPage] = useState(1)
  const [rowError, setRowError] = useState({})
  const dash = useDashboard(period)
  const p = dash.data?.period
  const on = Boolean(p)

  const kpis = useQuery({ queryKey: ['kpi-list', p?.year], queryFn: () => fetchAll('/kpis', { year: p.year }), enabled: on })
  const objectives = useQuery({ queryKey: ['lookup-objectives'], queryFn: () => fetchAll('/objectives') })
  const departments = useQuery({ queryKey: ['lookup-departments'], queryFn: () => fetchAll('/departments') })
  const scores = useQuery({
    queryKey: ['kpi-list-scores', p?.year, p?.month],
    queryFn: async () => Object.values((await api.get('/dashboard/classification', { params: { year: p.year, month: p.month } })).data.data.groups).flat(),
    enabled: on,
  })

  const del = useMutation({
    mutationFn: (id) => api.delete(`/kpis/${id}`),
    onSuccess: () => qc.invalidateQueries(),
    onError: (e, id) => setRowError((s) => ({ ...s, [id]: e.response?.data?.message || t('kpiList.deleteError') })),
  })

  const objBy = useMemo(() => Object.fromEntries((objectives.data ?? []).map((o) => [o.id, o])), [objectives.data])
  const depBy = useMemo(() => Object.fromEntries((departments.data ?? []).map((d) => [d.id, d])), [departments.data])
  const scoreBy = useMemo(() => Object.fromEntries((scores.data ?? []).map((s) => [s.id, s])), [scores.data])

  if ([dash, kpis, objectives, departments, scores].some((q) => q.isLoading)) return <p className="text-muted">{t('common.loading')}</p>
  if ([dash, kpis, objectives, departments, scores].some((q) => q.isError) || !p) {
    return (
      <div className="max-w-md rounded-lg border border-line bg-white p-5">
        <p className="text-sm">{t('kpiList.error')}</p>
        <Button className="mt-4" variant="outline" size="sm" onClick={() => qc.invalidateQueries()}>{t('dashboard.retry')}</Button>
      </div>
    )
  }

  const rows = kpis.data
    .filter((k) => `${k.code} ${k.name} ${k.name_ar ?? ''}`.toLowerCase().includes(filters.search.toLowerCase()))
    .filter((k) => !filters.department || String(k.department_id) === filters.department)
    .filter((k) => !filters.objective || String(k.strategic_objective_id) === filters.objective)
  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const pageRows = rows.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)
  const setF = (k) => (e) => {
    setPage(1)
    setFilters((s) => ({ ...s, [k]: e.target.value }))
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">{t('nav.kpis')}</h1>
        <div className="flex flex-wrap items-center gap-3">
          <PeriodPicker period={p} onChange={(value) => { setPage(1); setPeriod(value) }} />
          {editable && form === null && <Button size="sm" onClick={() => setForm({})}><Plus className="h-4 w-4" aria-hidden="true" />{t('kpiList.add')}</Button>}
        </div>
      </div>

      {form !== null && (
        <KpiForm key={form.id ?? 'new'} kpi={form.id ? form : null} year={p.year} objectives={objectives.data} departments={departments.data} onDone={() => setForm(null)} />
      )}

      <div className="flex flex-wrap items-center gap-3">
        <input type="search" className={cn(sel, 'w-56')} placeholder={t('kpiList.search')} aria-label={t('kpiList.search')} value={filters.search} onChange={setF('search')} />
        <select className={sel} aria-label={t('kpiList.department')} value={filters.department} onChange={setF('department')}>
          <option value="">{t('kpiList.allDepartments')}</option>
          {departments.data.map((d) => <option key={d.id} value={d.id}>{pick(d)}</option>)}
        </select>
        <select className={cn(sel, 'max-w-64')} aria-label={t('kpiList.objective')} value={filters.objective} onChange={setF('objective')}>
          <option value="">{t('kpiList.allObjectives')}</option>
          {objectives.data.map((o) => <option key={o.id} value={o.id}>{o.code} · {pick(o)}</option>)}
        </select>
      </div>

      {rows.length === 0 ? (
        <p className="rounded-lg border border-dashed border-line p-6 text-sm text-muted">{t('kpiList.empty')}</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-line bg-white">
          <table className="w-full min-w-[820px] text-sm">
            <thead className="border-b border-line text-xs text-muted">
              <tr>{['kpi', 'objective', 'department', 'annual', 'score'].map((c) => <th key={c} className="px-4 py-3 text-start font-medium">{t(`kpiList.col.${c}`)}</th>)}<th className="w-24" /></tr>
            </thead>
            <tbody className="divide-y divide-line">
              {pageRows.map((k) => {
                const s = scoreBy[k.id]
                return (
                  <tr key={k.id} className={cn('align-top', k.is_active === false && 'text-muted')}>
                    <td className="px-4 py-3"><Link to={`/kpis/${k.id}`} className="font-medium hover:underline">{pick(k)}</Link><p className="text-xs text-muted">{k.code}</p>{rowError[k.id] && <p role="alert" className="mt-1 text-xs text-[#A32B1E]">{rowError[k.id]}</p>}</td>
                    <td className="px-4 py-3">{objBy[k.strategic_objective_id] ? pick(objBy[k.strategic_objective_id]) : '—'}</td>
                    <td className="px-4 py-3">{depBy[k.department_id] ? pick(depBy[k.department_id]) : '—'}</td>
                    <td className="px-4 py-3 tabular-nums">{k.annual_target == null ? '—' : `${n(Number(k.annual_target))} ${k.unit ?? ''}`}</td>
                    <td className="px-4 py-3">{s ? <><StatusBadge status={s.status} score={s.score} /><p className="mt-1 text-xs tabular-nums text-muted">{n(s.score)}</p></> : '—'}</td>
                    <td className="px-4 py-3">
                      {editable && (
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8" aria-label={t('kpiList.edit')} onClick={() => setForm(k)}><Pencil className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8" aria-label={t('kpiList.delete')} disabled={del.isPending}
                            onClick={() => window.confirm(t('kpiList.deleteConfirm')) && (setRowError({}), del.mutate(k.id))}><Trash2 className="h-4 w-4" /></Button>
                        </div>
                      )}
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
            {t('kpiList.pagination.showing', {
              from: (currentPage - 1) * PAGE_SIZE + 1,
              to: Math.min(currentPage * PAGE_SIZE, rows.length),
              total: rows.length,
            })}
          </p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}>
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
              {t('kpiList.pagination.previous')}
            </Button>
            <span className="tabular-nums text-muted" aria-live="polite">
              {t('kpiList.pagination.page', { page: currentPage, total: totalPages })}
            </span>
            <Button variant="outline" size="sm" disabled={currentPage === totalPages} onClick={() => setPage(currentPage + 1)}>
              {t('kpiList.pagination.next')}
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
