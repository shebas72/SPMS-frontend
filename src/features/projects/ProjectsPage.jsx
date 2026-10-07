import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import api from '@/lib/api'
import { cn } from '@/lib/utils'
import { canEdit } from '@/lib/roles'
import { fetchAll } from '@/lib/fetchAll'
import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/stores/authStore'
import { PeriodPicker } from '@/features/dashboard/DashboardPage'
import { STATUS, useFormat } from '@/features/dashboard/ui'
import { Ring, Sparkline, colorOf } from './charts'

const TYPES = ['strategic', 'digital_transformation', 'operational']
const STATUSES = ['not_started', 'in_progress', 'completed', 'delayed', 'cancelled']
const field = 'h-9 w-full rounded-md border border-line bg-white px-2 text-sm'

const L = ({ label, children, className }) => (
  <label className={cn('block text-sm', className)}>
    <span className="mb-1 block text-muted">{label}</span>
    {children}
  </label>
)

function ProjectForm({ project, year, month, objectives, departments, onDone }) {
  const { t } = useTranslation()
  const { pick } = useFormat()
  const qc = useQueryClient()
  const s = (v) => (v == null ? '' : String(v))
  const [f, setF] = useState({
    code: s(project?.code), name: s(project?.name), name_ar: s(project?.name_ar), description: s(project?.description), description_ar: s(project?.description_ar),
    type: project?.type ?? 'strategic', status: project?.status ?? 'not_started', department_id: s(project?.department_id), strategic_objective_ids: (project?.objectives ?? []).map((o) => o.id),
    planned_start_date: s(project?.planned_start_date), planned_end_date: s(project?.planned_end_date), actual_start_date: s(project?.actual_start_date), actual_end_date: s(project?.actual_end_date),
    is_on_timeline: project?.is_on_timeline ?? true, year: project?.year ?? year,
  })
  const [initial, setInitial] = useState('')
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }))
  const save = useMutation({
    mutationFn: async () => {
      const body = Object.fromEntries(Object.entries(f).map(([k, v]) => [k, v === '' ? null : v]))
      if (project) return api.put(`/projects/${project.id}`, body)
      const res = await api.post('/projects', body)
      if (initial !== '') await api.put(`/projects/${res.data.data.id}/progress`, { year: Number(f.year), month, completion_pct: Number(initial) })
      return res
    },
    onSuccess: () => { qc.invalidateQueries(); onDone() },
  })
  const dates = [['planned_start_date', 'plannedStart'], ['planned_end_date', 'plannedEnd'], ['actual_start_date', 'actualStart'], ['actual_end_date', 'actualEnd']]
  return (
    <form className="space-y-4 rounded-lg border border-ink bg-white p-5" onSubmit={(e) => { e.preventDefault(); save.mutate() }}>
      <h2 className="text-sm font-semibold">{project ? t('projects.editProject') : t('projects.newProject')}</h2>
      <div className="grid gap-4 md:grid-cols-3">
        <L label={t('projects.code')}><input className={field} value={f.code} onChange={set('code')} /></L>
        <L label={t('projects.name')}><input required className={field} value={f.name} onChange={set('name')} /></L>
        <L label={t('projects.nameAr')}><input dir="rtl" className={field} value={f.name_ar} onChange={set('name_ar')} /></L>
        <L label={t('projects.description')}><textarea rows={2} className={cn(field, 'h-auto py-2')} value={f.description} onChange={set('description')} /></L>
        <L label={t('projects.descriptionAr')}><textarea dir="rtl" rows={2} className={cn(field, 'h-auto py-2')} value={f.description_ar} onChange={set('description_ar')} /></L>
        <L label={t('dashboard.year')}><input type="number" min="2000" max="2100" className={field} value={f.year} onChange={set('year')} /></L>
        {!project && <L label={t('projects.initialPct')}><input type="number" min="0" max="100" step="any" className={field} value={initial} onChange={(e) => setInitial(e.target.value)} /></L>}
        <L label={t('projects.type')}><select className={field} value={f.type} onChange={set('type')}>{TYPES.map((x) => <option key={x} value={x}>{t(`projects.types.${x}`)}</option>)}</select></L>
        <L label={t('projects.status')}><select className={field} value={f.status} onChange={set('status')}>{STATUSES.map((x) => <option key={x} value={x}>{t(`projects.statuses.${x}`)}</option>)}</select></L>
        <label className="flex items-center gap-2 self-end pb-2 text-sm"><input type="checkbox" checked={f.is_on_timeline} onChange={(e) => setF((x) => ({ ...x, is_on_timeline: e.target.checked }))} />{t('projects.onTimeline')}</label>
        <L label={t('projects.department')}><select className={field} value={f.department_id} onChange={set('department_id')}><option value="">—</option>{departments.map((d) => <option key={d.id} value={d.id}>{pick(d)}</option>)}</select></L>
        <fieldset className="md:col-span-2">
          <legend className="mb-1 text-sm text-muted">{t('projects.objectives')}</legend>
          <div className="max-h-36 space-y-1 overflow-y-auto rounded-md border border-line bg-white p-2">
            {objectives.map((o) => (
              <label key={o.id} className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={f.strategic_objective_ids.includes(o.id)}
                  onChange={() => setF((x) => ({ ...x, strategic_objective_ids: x.strategic_objective_ids.includes(o.id) ? x.strategic_objective_ids.filter((i) => i !== o.id) : [...x.strategic_objective_ids, o.id] }))} />
                {o.code} · {pick(o)}
              </label>
            ))}
          </div>
        </fieldset>
        {dates.map(([k, label]) => <L key={k} label={t(`projects.${label}`)}><input type="date" className={field} value={f[k]} onChange={set(k)} /></L>)}
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" size="sm" disabled={save.isPending}>{save.isPending ? t('projects.saving') : t('projects.save')}</Button>
        <Button type="button" variant="outline" size="sm" onClick={onDone}>{t('projects.cancel')}</Button>
        {save.isError && <span role="alert" className="text-sm text-[#A32B1E]">{save.error?.response?.data?.message || t('projects.saveError')}</span>}
      </div>
    </form>
  )
}

function ProgressForm({ project, row, period, suggested }) {
  const { t } = useTranslation()
  const { monthLong, n } = useFormat()
  const qc = useQueryClient()
  const [month, setMonth] = useState(period.month)
  const [pct, setPct] = useState(row.series[period.month - 1] ?? suggested?.pct ?? '')
  const [note, setNote] = useState('')
  const save = useMutation({
    mutationFn: () => api.put(`/projects/${project.id}/progress`, { year: period.year, month, completion_pct: Number(pct), note: note || null }),
    onSuccess: () => { qc.invalidateQueries(); setNote('') },
  })
  return (
    <form className="flex flex-wrap items-end gap-3" onSubmit={(e) => { e.preventDefault(); save.mutate() }}>
      <L label={t('projects.month')}>
        <select className={cn(field, 'w-36')} value={month} onChange={(e) => { const m = Number(e.target.value); setMonth(m); setPct(row.series[m - 1] ?? suggested?.pct ?? '') }}>
          {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => <option key={m} value={m}>{monthLong(m)}</option>)}
        </select>
      </L>
      <L label={t('projects.completion')}><input required type="number" min="0" max="100" step="any" className={cn(field, 'w-28 tabular-nums')} value={pct} onChange={(e) => setPct(e.target.value)} /></L>
      <L label={t('projects.note')} className="min-w-48 flex-1"><input className={field} value={note} onChange={(e) => setNote(e.target.value)} /></L>
      <Button type="submit" size="sm" disabled={save.isPending || pct === ''}>{save.isPending ? t('projects.saving') : t('projects.saveProgress')}</Button>
      {suggested && <p className="w-full text-xs text-muted">{t('projects.suggested', { count: suggested.count, value: n(suggested.pct) })}</p>}
      {save.isError && <span role="alert" className="w-full text-sm text-[#A32B1E]">{save.error?.response?.data?.message || t('projects.saveError')}</span>}
    </form>
  )
}

export default function ProjectsPage() {
  const { t } = useTranslation()
  const { n, pick, month: monthShort } = useFormat()
  const qc = useQueryClient()
  const user = useAuthStore((s) => s.user)
  const manager = canEdit(user)
  const [period, setPeriod] = useState({})
  const [view, setView] = useState('month')
  const [selected, setSelected] = useState(null)
  const [form, setForm] = useState(null) // null | {} | project
  const [delError, setDelError] = useState('')

  const perf = useQuery({
    queryKey: ['projects-perf', period.year ?? null, period.month ?? null],
    queryFn: async () => (await api.get('/dashboard/projects', { params: period })).data.data,
    placeholderData: (prev) => prev,
  })
  const p = perf.data?.period
  const list = useQuery({ queryKey: ['projects-list', p?.year], queryFn: () => fetchAll('/projects', { year: p.year }), enabled: Boolean(p) })
  const initiatives = useQuery({ queryKey: ['initiatives-by-year', p?.year], queryFn: () => fetchAll('/initiatives', { year: p.year }), enabled: Boolean(p) })
  const objectives = useQuery({ queryKey: ['lookup-objectives'], queryFn: () => fetchAll('/objectives') })
  const departments = useQuery({ queryKey: ['lookup-departments'], queryFn: () => fetchAll('/departments') })
  const del = useMutation({
    mutationFn: (id) => api.delete(`/projects/${id}`),
    onSuccess: () => { setSelected(null); setDelError(''); qc.invalidateQueries() },
    onError: (e) => setDelError(e.response?.data?.message || t('projects.deleteError')),
  })

  if ([perf, list, objectives, departments].some((q) => q.isLoading)) return <p className="text-muted">{t('common.loading')}</p>
  if ([perf, list, objectives, departments].some((q) => q.isError) || !p) {
    return (
      <div className="max-w-md rounded-lg border border-line bg-white p-5">
        <p className="text-sm">{t('projects.error')}</p>
        <Button className="mt-4" variant="outline" size="sm" onClick={() => qc.invalidateQueries()}>{t('dashboard.retry')}</Button>
      </div>
    )
  }

  const { overall, trend, projects } = perf.data
  const row = projects.find((r) => r.id === selected)
  const full = list.data.find((r) => r.id === selected)
  const canReport = full && (manager || full.owner_id === user?.id)
  const linked = (initiatives.data ?? []).filter((i) => i.projects.some((x) => x.id === selected))
  const suggested = linked.length ? { count: linked.length, pct: Math.round((linked.reduce((sum, i) => sum + i.completion_pct, 0) / linked.length) * 100) / 100 } : null
  const toggle = (v) => 'rounded-md border px-3 py-1.5 text-sm ' + (view === v ? 'border-ink bg-ink text-white' : 'border-line bg-white hover:bg-brand-soft')

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">{t('nav.projects')}</h1>
        <div className="flex flex-wrap items-center gap-3">
          <PeriodPicker period={p} onChange={setPeriod} />
          <div className="flex gap-1" role="group" aria-label={t('projects.view')}>
            <button type="button" className={toggle('month')} aria-pressed={view === 'month'} onClick={() => setView('month')}>{t('projects.viewMonth')}</button>
            <button type="button" className={toggle('ytd')} aria-pressed={view === 'ytd'} onClick={() => setView('ytd')}>{t('projects.viewYtd')}</button>
          </div>
          {manager && form === null && <Button size="sm" onClick={() => setForm({})}><Plus className="h-4 w-4" aria-hidden="true" />{t('projects.add')}</Button>}
        </div>
      </div>

      {form !== null && <ProjectForm key={form.id ?? 'new'} project={form.id ? form : null} year={p.year} month={p.month} objectives={objectives.data} departments={departments.data} onDone={() => setForm(null)} />}

      <section className="flex flex-wrap items-center gap-8 rounded-lg border border-line bg-white p-5">
        <div>
          <h2 className="text-sm font-semibold">{t('projects.overall')}</h2>
          <p className="mt-1 text-xs text-muted">{t('projects.overallHint', { month: n(overall.month), ytd: n(overall.ytd) })}</p>
        </div>
        {view === 'month' ? <Ring pct={overall.month} size={120} /> : <Sparkline values={trend.map((v, i) => (i < p.month ? v : null))} width={360} height={110} labels />}
        <ul className="ms-auto flex flex-wrap gap-4 text-xs" aria-label={t('projects.legend')}>
          {[['behind', '0–60%'], ['at_risk', '60–80%'], ['on_track', '80–100%']].map(([k, label]) => (
            <li key={k} className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-sm" style={{ background: STATUS[k].fill }} aria-hidden="true" /><span style={{ color: STATUS[k].text }} className="font-medium">{label}</span></li>
          ))}
        </ul>
      </section>

      {projects.length === 0 ? (
        <p className="rounded-lg border border-dashed border-line p-6 text-sm text-muted">{t('projects.empty')}</p>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {projects.map((r) => (
            <button key={r.id} type="button" aria-pressed={selected === r.id} onClick={() => setSelected(selected === r.id ? null : r.id)}
              className={cn('flex flex-col items-center gap-2 rounded-lg border bg-white p-4 text-center hover:bg-brand-soft', selected === r.id ? 'border-ink' : 'border-line')}>
              {view === 'month' ? <Ring pct={r.month_pct} /> : <Sparkline values={r.series.map((v, i) => (i < p.month ? v : null))} />}
              <span className="text-sm font-medium">{pick(r)}</span>
              <span className="text-xs text-muted">{r.department ? pick(r.department) : '—'}</span>
              {!r.is_on_timeline && <span className="text-xs font-medium" style={{ color: STATUS.behind.text }}>{t('projects.offTimeline')}</span>}
            </button>
          ))}
        </div>
      )}

      {row && full && (
        <section className="space-y-4 rounded-lg border border-ink bg-white p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">{pick(full)}</h2>
              <p className="mt-1 text-sm text-muted">
                {[full.code, t(`projects.types.${full.type}`), t(`projects.statuses.${full.status}`), full.department && pick(full.department), (full.objectives ?? []).map((o) => pick(o)).join(', '), full.owner?.name].filter(Boolean).join(' · ')}
              </p>
              {pick(full, 'description') && <p className="mt-2 text-sm">{pick(full, 'description')}</p>}
              <p className="mt-2 text-xs text-muted">
                {t('projects.planned')}: {full.planned_start_date ?? '—'} → {full.planned_end_date ?? '—'} · {t('projects.actual')}: {full.actual_start_date ?? '—'} → {full.actual_end_date ?? '—'}
              </p>
            </div>
            {manager && (
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" className="h-8 w-8" aria-label={t('projects.edit')} onClick={() => setForm(full)}><Pencil className="h-4 w-4" /></Button>
                <Button variant="ghost" size="icon" className="h-8 w-8" aria-label={t('projects.delete')} disabled={del.isPending}
                  onClick={() => window.confirm(t('projects.confirmDelete')) && (setDelError(''), del.mutate(full.id))}><Trash2 className="h-4 w-4" /></Button>
              </div>
            )}
          </div>
          {delError && <p role="alert" className="text-sm text-[#A32B1E]">{delError}</p>}
          <div className="flex flex-wrap items-center gap-6">
            {row.series.some((v) => v != null) ? <Ring pct={full.completion_pct} size={80} /> : <p className="max-w-xs text-sm text-muted">{t('projects.noProgress')}</p>}
            <ul className="grid grid-cols-6 gap-x-3 gap-y-1 text-xs sm:grid-cols-12" aria-label={t('projects.history')}>
              {row.series.map((v, i) => <li key={i} className="text-center"><span className="block text-muted">{monthShort(i + 1)}</span><span className="font-medium tabular-nums" style={{ color: colorOf(v).text }}>{v == null ? '—' : n(v)}</span></li>)}
            </ul>
          </div>
          {linked.length > 0 && (
            <div>
              <h3 className="mb-2 text-sm font-semibold">{t('projects.initiatives')}</h3>
              <ul className="space-y-1 text-sm">{linked.map((i) => <li key={i.id} className="flex justify-between gap-3"><span>{pick(i)}</span><span className="tabular-nums" style={{ color: colorOf(i.completion_pct).text }}>{n(i.completion_pct)}%</span></li>)}</ul>
            </div>
          )}
          {canReport && <div className="border-t border-line pt-4"><h3 className="mb-3 text-sm font-semibold">{t('projects.reportProgress')}</h3><ProgressForm key={`${full.id}-${p.year}-${p.month}-${full.completion_pct}`} project={full} row={row} period={p} suggested={suggested} /></div>}
        </section>
      )}
    </div>
  )
}
