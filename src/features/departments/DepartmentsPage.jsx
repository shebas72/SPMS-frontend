import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { ChevronDown, ChevronRight, Pencil, Plus, Trash2 } from 'lucide-react'
import api from '@/lib/api'
import { cn } from '@/lib/utils'
import { canEdit } from '@/lib/roles'
import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/stores/authStore'
import { PeriodPicker } from '@/features/dashboard/DashboardPage'
import { Counts, ScoreBar, StatusBadge, keyOf, statusOf, useFormat } from '@/features/dashboard/ui'

const GRID = 'md:grid-cols-[minmax(0,2.2fr)_minmax(0,2fr)_minmax(0,1fr)_minmax(0,2fr)_auto]'
const field = 'h-9 w-full rounded-md border border-line bg-white px-2 text-sm'

const L = ({ label, children }) => (
  <label className="block text-sm">
    <span className="mb-1 block text-muted">{label}</span>
    {children}
  </label>
)

function DeptForm({ dept, parentId, rows, byParent, onDone }) {
  const { t } = useTranslation()
  const { pick } = useFormat()
  const qc = useQueryClient()
  const [f, setF] = useState({
    name: dept?.name ?? '', name_ar: dept?.name_ar ?? '', code: dept?.code ?? '', color: dept?.color || '#185FA5',
    parent_id: String(dept ? dept.parent_id ?? '' : parentId ?? ''),
  })
  // A department can't sit under itself or one of its own sub-departments.
  const blocked = useMemo(() => {
    const out = new Set()
    const walk = (id) => { out.add(id); (byParent[id] ?? []).forEach((c) => walk(c.id)) }
    if (dept) walk(dept.id)
    return out
  }, [dept, byParent])
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }))
  const save = useMutation({
    mutationFn: () => {
      const payload = { name: f.name, name_ar: f.name_ar || null, code: f.code || null, color: f.color, parent_id: f.parent_id || null }
      return dept ? api.put(`/departments/${dept.id}`, payload) : api.post('/departments', payload)
    },
    onSuccess: () => { qc.invalidateQueries(); onDone() },
  })
  return (
    <form className="space-y-4 rounded-lg border border-ink bg-white p-5" onSubmit={(e) => { e.preventDefault(); save.mutate() }}>
      <h2 className="text-sm font-semibold">{dept ? t('departmentsPage.editDepartment') : t('departmentsPage.newDepartment')}</h2>
      <div className="grid gap-4 md:grid-cols-3">
        <L label={t('departmentsPage.name')}><input required className={field} value={f.name} onChange={set('name')} /></L>
        <L label={t('departmentsPage.nameAr')}><input dir="rtl" className={field} value={f.name_ar} onChange={set('name_ar')} /></L>
        <L label={t('departmentsPage.code')}><input className={field} value={f.code} onChange={set('code')} /></L>
        <L label={t('departmentsPage.parent')}>
          <select className={field} value={f.parent_id} onChange={set('parent_id')}>
            <option value="">{t('departmentsPage.noParent')}</option>
            {rows.filter((r) => !blocked.has(r.id)).map((r) => <option key={r.id} value={r.id}>{pick(r)}</option>)}
          </select>
        </L>
        <L label={t('departmentsPage.color')}><input type="color" className="h-9 w-16 rounded-md border border-line bg-white p-1" value={f.color} onChange={set('color')} /></L>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" size="sm" disabled={save.isPending}>{save.isPending ? t('departmentsPage.saving') : t('departmentsPage.save')}</Button>
        <Button type="button" variant="outline" size="sm" onClick={onDone}>{t('departmentsPage.cancel')}</Button>
        {save.isError && <span role="alert" className="text-sm text-[#A32B1E]">{save.error?.response?.data?.message || t('departmentsPage.saveError')}</span>}
      </div>
    </form>
  )
}

function Row({ d, depth, hasKids, open, onToggle, error, actions }) {
  const { t } = useTranslation()
  const { n, pick } = useFormat()
  const cur = d.current ?? {}
  const ytd = d.ytd ?? {}
  return (
    <li className={cn('grid gap-x-4 gap-y-2 px-4 py-3', GRID, depth === 0 && 'bg-white')}>
      <div className="flex min-w-0 items-start gap-2" style={{ paddingInlineStart: `${depth * 1.5}rem` }}>
        {hasKids ? (
          <button type="button" onClick={onToggle} aria-expanded={open} aria-label={t(open ? 'departmentsPage.collapse' : 'departmentsPage.expand')} className="mt-0.5 rounded p-0.5 hover:bg-brand-soft">
            {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4 rtl:rotate-180" />}
          </button>
        ) : <span className="w-5 shrink-0" />}
        <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: d.color || '#8A8F98' }} aria-hidden="true" />
        <div className="min-w-0">
          <p className={cn('truncate text-sm', depth === 0 ? 'font-semibold' : 'font-medium')}>{pick(d)}</p>
          <p className="text-xs text-muted">{d.code}</p>
          {error && <p role="alert" className="mt-1 text-xs text-[#A32B1E]">{error}</p>}
        </div>
      </div>
      <div>
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-lg font-semibold tabular-nums" style={{ color: statusOf(keyOf(cur.score, cur.status)).text }}>{n(cur.score)}</span>
          <StatusBadge status={cur.status} score={cur.score} />
        </div>
        <ScoreBar className="mt-1.5" score={cur.score} status={cur.status} />
      </div>
      <div className="text-sm tabular-nums">
        <span className="text-xs text-muted md:hidden">{t('dashboard.ytd')} </span>
        <span style={{ color: statusOf(keyOf(ytd.score, ytd.status)).text }} className="font-medium">{n(ytd.score)}</span>
      </div>
      <div className="space-y-1">
        <Counts data={cur} />
        <p className="text-xs text-muted">{t('strategyMap.kpiCount', { count: cur.kpi_count ?? 0 })}</p>
      </div>
      {actions}
    </li>
  )
}

export default function DepartmentsPage() {
  const { t } = useTranslation()
  const { pick } = useFormat()
  const qc = useQueryClient()
  const editable = canEdit(useAuthStore((s) => s.user))
  const [period, setPeriod] = useState({})
  const [collapsed, setCollapsed] = useState(() => new Set())
  const [form, setForm] = useState(null) // null = closed, { dept } to edit, { parentId } to add
  const [rowError, setRowError] = useState({})
  const q = useQuery({
    queryKey: ['dept-performance', period.year ?? null, period.month ?? null],
    queryFn: async () => (await api.get('/dashboard/departments', { params: period })).data,
    placeholderData: (prev) => prev,
  })
  const del = useMutation({
    mutationFn: (id) => api.delete(`/departments/${id}`),
    onSuccess: () => qc.invalidateQueries(),
    onError: (e, id) => setRowError({ [id]: e.response?.data?.message || t('departmentsPage.deleteError') }),
  })

  const { rows, byParent } = useMemo(() => {
    const list = q.data?.data ?? []
    const ids = new Set(list.map((d) => d.id))
    const byParent = {}
    list.forEach((d) => { (byParent[d.parent_id && ids.has(d.parent_id) ? d.parent_id : 0] ??= []).push(d) })
    return { rows: list, byParent }
  }, [q.data])

  if (q.isLoading) return <p className="text-muted">{t('common.loading')}</p>
  if (q.isError || !q.data) {
    return (
      <div className="max-w-md rounded-lg border border-line bg-white p-5">
        <p className="text-sm">{t('departmentsPage.error')}</p>
        <Button className="mt-4" variant="outline" size="sm" onClick={() => qc.invalidateQueries()}>{t('dashboard.retry')}</Button>
      </div>
    )
  }

  const toggle = (id) => setCollapsed((s) => { const next = new Set(s); next.has(id) ? next.delete(id) : next.add(id); return next })
  const remove = (d) => {
    const used = (byParent[d.id]?.length ?? 0) > 0 || (d.current?.kpi_count ?? 0) > 0
    if (window.confirm(t(used ? 'departmentsPage.confirmDeleteUsed' : 'departmentsPage.confirmDelete', { name: pick(d) }))) { setRowError({}); del.mutate(d.id) }
  }
  const render = (d, depth) => {
    const kids = byParent[d.id] ?? []
    const open = !collapsed.has(d.id)
    const btn = 'h-8 w-8'
    return (
      <div key={d.id}>
        <Row
          d={d} depth={depth} hasKids={kids.length > 0} open={open} onToggle={() => toggle(d.id)} error={rowError[d.id]}
          actions={editable && (
            <div className="flex items-start gap-0.5">
              <Button variant="ghost" size="icon" className={btn} aria-label={t('departmentsPage.addChild')} onClick={() => setForm({ parentId: d.id })}><Plus className="h-4 w-4" /></Button>
              <Button variant="ghost" size="icon" className={btn} aria-label={t('departmentsPage.edit')} onClick={() => setForm({ dept: d })}><Pencil className="h-4 w-4" /></Button>
              <Button variant="ghost" size="icon" className={btn} aria-label={t('departmentsPage.delete')} disabled={del.isPending} onClick={() => remove(d)}><Trash2 className="h-4 w-4" /></Button>
            </div>
          )}
        />
        {kids.length > 0 && open && <ul className="divide-y divide-line border-t border-line">{kids.map((c) => render(c, depth + 1))}</ul>}
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">{t('nav.departments')}</h1>
          <p className="mt-1 text-sm text-muted">{t('departmentsPage.hint')}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <PeriodPicker period={q.data.meta} onChange={setPeriod} />
          {editable && form === null && <Button size="sm" onClick={() => setForm({})}><Plus className="h-4 w-4" aria-hidden="true" />{t('departmentsPage.add')}</Button>}
        </div>
      </div>

      {form !== null && <DeptForm key={form.dept?.id ?? `new-${form.parentId ?? 0}`} dept={form.dept} parentId={form.parentId} rows={rows} byParent={byParent} onDone={() => setForm(null)} />}

      {rows.length === 0 ? (
        <p className="rounded-lg border border-dashed border-line p-6 text-sm text-muted">{t('departmentsPage.empty')}</p>
      ) : (
        <div className="overflow-hidden rounded-lg border border-line bg-white">
          <div className={cn('hidden gap-x-4 border-b border-line px-4 py-2.5 text-xs text-muted md:grid', GRID)}>
            {['department', 'current', 'ytd', 'kpis'].map((c) => <span key={c}>{t(`departmentsPage.col.${c}`)}</span>)}
            <span className={editable ? 'w-[6.25rem]' : ''} />
          </div>
          <ul className="divide-y divide-line">{(byParent[0] ?? []).map((d) => render(d, 0))}</ul>
        </div>
      )}
    </div>
  )
}