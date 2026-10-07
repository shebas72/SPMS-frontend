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
import { Ring, Sparkline, colorOf } from '@/features/projects/charts'

const STATUSES = ['not_started', 'in_progress', 'completed', 'delayed', 'cancelled']
const TASK_COLOR = { completed: STATUS.on_track.text, in_progress: '#185FA5', overdue: STATUS.behind.text, pending: STATUS.none.text }
const field = 'h-9 w-full rounded-md border border-line bg-white px-2 text-sm'

const L = ({ label, children, className }) => (
  <label className={cn('block text-sm', className)}>
    <span className="mb-1 block text-muted">{label}</span>
    {children}
  </label>
)

function Checklist({ label, items, value, onChange, className }) {
  return (
    <fieldset className={className}>
      <legend className="mb-1 text-sm text-muted">{label}</legend>
      <div className="max-h-36 space-y-1 overflow-y-auto rounded-md border border-line bg-white p-2">
        {items.map((it) => (
          <label key={it.id} className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={value.includes(it.id)} onChange={() => onChange(value.includes(it.id) ? value.filter((i) => i !== it.id) : [...value, it.id])} />
            {it.label}
          </label>
        ))}
      </div>
    </fieldset>
  )
}

function InitiativeForm({ initiative, year, month, objectives, departments, projects, kpis, onDone }) {
  const { t } = useTranslation()
  const { pick } = useFormat()
  const qc = useQueryClient()
  const s = (v) => (v == null ? '' : String(v))
  const [initial, setInitial] = useState('')
  const [f, setF] = useState({
    code: s(initiative?.code), name: s(initiative?.name), name_ar: s(initiative?.name_ar), description: s(initiative?.description), description_ar: s(initiative?.description_ar),
    status: initiative?.status ?? 'not_started', department_id: s(initiative?.department_id), strategic_objective_id: s(initiative?.strategic_objective_id),
    planned_start_date: s(initiative?.planned_start_date), planned_end_date: s(initiative?.planned_end_date), is_on_timeline: initiative?.is_on_timeline ?? true,
    year: initiative?.year ?? year, project_ids: (initiative?.projects ?? []).map((x) => x.id), kpi_ids: (initiative?.kpis ?? []).map((x) => x.id),
  })
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }))
  const save = useMutation({
    mutationFn: async () => {
      const body = Object.fromEntries(Object.entries(f).map(([k, v]) => [k, v === '' ? null : v]))
      if (initiative) return api.put(`/initiatives/${initiative.id}`, body)
      const res = await api.post('/initiatives', body)
      if (initial !== '') await api.put(`/initiatives/${res.data.data.id}/progress`, { year: Number(f.year), month, completion_pct: Number(initial) })
      return res
    },
    onSuccess: () => { qc.invalidateQueries(); onDone() },
  })
  return (
    <form className="space-y-4 rounded-lg border border-ink bg-white p-5" onSubmit={(e) => { e.preventDefault(); save.mutate() }}>
      <h2 className="text-sm font-semibold">{initiative ? t('initiatives.editInitiative') : t('initiatives.newInitiative')}</h2>
      <div className="grid gap-4 md:grid-cols-3">
        <L label={t('projects.code')}><input className={field} value={f.code} onChange={set('code')} /></L>
        <L label={t('projects.name')}><input required className={field} value={f.name} onChange={set('name')} /></L>
        <L label={t('projects.nameAr')}><input dir="rtl" className={field} value={f.name_ar} onChange={set('name_ar')} /></L>
        <L label={t('projects.description')}><textarea rows={2} className={cn(field, 'h-auto py-2')} value={f.description} onChange={set('description')} /></L>
        <L label={t('projects.descriptionAr')}><textarea dir="rtl" rows={2} className={cn(field, 'h-auto py-2')} value={f.description_ar} onChange={set('description_ar')} /></L>
        <L label={t('dashboard.year')}><input type="number" min="2000" max="2100" className={field} value={f.year} onChange={set('year')} /></L>
        <L label={t('projects.status')}><select className={field} value={f.status} onChange={set('status')}>{STATUSES.map((x) => <option key={x} value={x}>{t(`projects.statuses.${x}`)}</option>)}</select></L>
        <L label={t('projects.department')}><select className={field} value={f.department_id} onChange={set('department_id')}><option value="">—</option>{departments.map((d) => <option key={d.id} value={d.id}>{pick(d)}</option>)}</select></L>
        <L label={t('initiatives.objective')}><select className={field} value={f.strategic_objective_id} onChange={set('strategic_objective_id')}><option value="">—</option>{objectives.map((o) => <option key={o.id} value={o.id}>{o.code} · {pick(o)}</option>)}</select></L>
        <L label={t('projects.plannedStart')}><input type="date" className={field} value={f.planned_start_date} onChange={set('planned_start_date')} /></L>
        <L label={t('projects.plannedEnd')}><input type="date" className={field} value={f.planned_end_date} onChange={set('planned_end_date')} /></L>
        <label className="flex items-center gap-2 self-end pb-2 text-sm"><input type="checkbox" checked={f.is_on_timeline} onChange={(e) => setF((x) => ({ ...x, is_on_timeline: e.target.checked }))} />{t('projects.onTimeline')}</label>
        <Checklist label={t('initiatives.linkedProjects')} className="md:col-span-1" value={f.project_ids} onChange={(v) => setF((x) => ({ ...x, project_ids: v }))} items={projects.map((x) => ({ id: x.id, label: `${x.code ?? ''} ${pick(x)}`.trim() }))} />
        <Checklist label={t('initiatives.linkedKpis')} className="md:col-span-2" value={f.kpi_ids} onChange={(v) => setF((x) => ({ ...x, kpi_ids: v }))} items={kpis.map((x) => ({ id: x.id, label: `${x.code} · ${pick(x)}` }))} />
        {!initiative && <L label={t('projects.initialPct')}><input type="number" min="0" max="100" step="any" className={field} value={initial} onChange={(e) => setInitial(e.target.value)} /></L>}
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" size="sm" disabled={save.isPending}>{save.isPending ? t('projects.saving') : t('projects.save')}</Button>
        <Button type="button" variant="outline" size="sm" onClick={onDone}>{t('projects.cancel')}</Button>
        {save.isError && <span role="alert" className="text-sm text-[#A32B1E]">{save.error?.response?.data?.message || t('projects.saveError')}</span>}
      </div>
    </form>
  )
}

function TaskForm({ initiative, task, onDone }) {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const [f, setF] = useState({ task_name: task?.task_name ?? '', task_name_ar: task?.task_name_ar ?? '', due_date: task?.due_date ?? '', completion_pct: task?.completion_pct ?? 0 })
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }))
  const save = useMutation({
    mutationFn: () => {
      const body = { ...f, task_name_ar: f.task_name_ar || null, due_date: f.due_date || null, completion_pct: Number(f.completion_pct) }
      return task ? api.put(`/execution-plan-tasks/${task.id}`, body) : api.post(`/initiatives/${initiative.id}/tasks`, body)
    },
    onSuccess: () => { qc.invalidateQueries(); onDone() },
  })
  return (
    <form className="flex flex-wrap items-end gap-3 rounded-md border border-line p-3" onSubmit={(e) => { e.preventDefault(); save.mutate() }}>
      <L label={t('initiatives.taskName')} className="min-w-48 flex-1"><input required className={field} value={f.task_name} onChange={set('task_name')} /></L>
      <L label={t('initiatives.taskNameAr')} className="min-w-48 flex-1"><input dir="rtl" className={field} value={f.task_name_ar} onChange={set('task_name_ar')} /></L>
      <L label={t('initiatives.dueDate')}><input type="date" className={field} value={f.due_date} onChange={set('due_date')} /></L>
      <L label={t('projects.completion')}><input required type="number" min="0" max="100" step="any" className={cn(field, 'w-24 tabular-nums')} value={f.completion_pct} onChange={set('completion_pct')} /></L>
      <Button type="submit" size="sm" disabled={save.isPending}>{save.isPending ? t('projects.saving') : t('projects.save')}</Button>
      <Button type="button" variant="outline" size="sm" onClick={onDone}>{t('projects.cancel')}</Button>
      {save.isError && <span role="alert" className="w-full text-sm text-[#A32B1E]">{save.error?.response?.data?.message || t('projects.saveError')}</span>}
    </form>
  )
}

function ProgressForm({ initiative, row, period }) {
  const { t } = useTranslation()
  const { monthLong } = useFormat()
  const qc = useQueryClient()
  const [month, setMonth] = useState(period.month)
  const [pct, setPct] = useState(row.series[period.month - 1] ?? '')
  const [note, setNote] = useState('')
  const save = useMutation({
    mutationFn: () => api.put(`/initiatives/${initiative.id}/progress`, { year: period.year, month, completion_pct: Number(pct), note: note || null }),
    onSuccess: () => { qc.invalidateQueries(); setNote('') },
  })
  return (
    <form className="flex flex-wrap items-end gap-3" onSubmit={(e) => { e.preventDefault(); save.mutate() }}>
      <L label={t('projects.month')}>
        <select className={cn(field, 'w-36')} value={month} onChange={(e) => { const m = Number(e.target.value); setMonth(m); setPct(row.series[m - 1] ?? '') }}>
          {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => <option key={m} value={m}>{monthLong(m)}</option>)}
        </select>
      </L>
      <L label={t('projects.completion')}><input required type="number" min="0" max="100" step="any" className={cn(field, 'w-28 tabular-nums')} value={pct} onChange={(e) => setPct(e.target.value)} /></L>
      <L label={t('projects.note')} className="min-w-48 flex-1"><input className={field} value={note} onChange={(e) => setNote(e.target.value)} /></L>
      <Button type="submit" size="sm" disabled={save.isPending || pct === ''}>{save.isPending ? t('projects.saving') : t('projects.saveProgress')}</Button>
      {save.isError && <span role="alert" className="w-full text-sm text-[#A32B1E]">{save.error?.response?.data?.message || t('projects.saveError')}</span>}
    </form>
  )
}

export default function InitiativesPage() {
  const { t } = useTranslation()
  const { n, pick } = useFormat()
  const qc = useQueryClient()
  const user = useAuthStore((s) => s.user)
  const manager = canEdit(user)
  const [period, setPeriod] = useState({})
  const [view, setView] = useState('month')
  const [selected, setSelected] = useState(null)
  const [form, setForm] = useState(null) // null | {} | initiative
  const [taskForm, setTaskForm] = useState(null) // null | {} | task
  const [err, setErr] = useState('')

  const perf = useQuery({
    queryKey: ['initiatives-perf', period.year ?? null, period.month ?? null],
    queryFn: async () => (await api.get('/dashboard/initiatives', { params: period })).data.data,
    placeholderData: (prev) => prev,
  })
  const p = perf.data?.period
  const list = useQuery({ queryKey: ['initiatives-list', p?.year], queryFn: () => fetchAll('/initiatives', { year: p.year }), enabled: Boolean(p) })
  const objectives = useQuery({ queryKey: ['lookup-objectives'], queryFn: () => fetchAll('/objectives') })
  const departments = useQuery({ queryKey: ['lookup-departments'], queryFn: () => fetchAll('/departments') })
  const projects = useQuery({ queryKey: ['lookup-projects', p?.year], queryFn: () => fetchAll('/projects', { year: p.year }), enabled: Boolean(p) && form !== null })
  const kpis = useQuery({ queryKey: ['entry-kpis', p?.year], queryFn: () => fetchAll('/kpis', { year: p.year }), enabled: Boolean(p) && form !== null })
  const onError = (e) => setErr(e.response?.data?.message || t('initiatives.deleteError'))
  const delInit = useMutation({ mutationFn: (id) => api.delete(`/initiatives/${id}`), onSuccess: () => { setSelected(null); setErr(''); qc.invalidateQueries() }, onError })
  const delTask = useMutation({ mutationFn: (id) => api.delete(`/execution-plan-tasks/${id}`), onSuccess: () => { setErr(''); qc.invalidateQueries() }, onError })

  if ([perf, list, objectives, departments].some((q) => q.isLoading)) return <p className="text-muted">{t('common.loading')}</p>
  if ([perf, list, objectives, departments].some((q) => q.isError) || !p) {
    return (
      <div className="max-w-md rounded-lg border border-line bg-white p-5">
        <p className="text-sm">{t('initiatives.error')}</p>
        <Button className="mt-4" variant="outline" size="sm" onClick={() => qc.invalidateQueries()}>{t('dashboard.retry')}</Button>
      </div>
    )
  }

  const { overall, trend, initiatives } = perf.data
  const row = initiatives.find((r) => r.id === selected)
  const full = list.data.find((r) => r.id === selected)
  const canPlan = full && (manager || full.owner_id === user?.id)
  const toggle = (v) => 'rounded-md border px-3 py-1.5 text-sm ' + (view === v ? 'border-ink bg-ink text-white' : 'border-line bg-white hover:bg-brand-soft')

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">{t('nav.initiatives')}</h1>
        <div className="flex flex-wrap items-center gap-3">
          <PeriodPicker period={p} onChange={setPeriod} />
          <div className="flex gap-1" role="group" aria-label={t('projects.view')}>
            <button type="button" className={toggle('month')} aria-pressed={view === 'month'} onClick={() => setView('month')}>{t('projects.viewMonth')}</button>
            <button type="button" className={toggle('ytd')} aria-pressed={view === 'ytd'} onClick={() => setView('ytd')}>{t('projects.viewYtd')}</button>
          </div>
          {manager && form === null && <Button size="sm" onClick={() => setForm({})}><Plus className="h-4 w-4" aria-hidden="true" />{t('initiatives.add')}</Button>}
        </div>
      </div>

      {form !== null && (
        <InitiativeForm key={form.id ?? 'new'} initiative={form.id ? form : null} year={p.year} month={p.month} objectives={objectives.data} departments={departments.data}
          projects={projects.data ?? []} kpis={kpis.data ?? []} onDone={() => setForm(null)} />
      )}

      <section className="flex flex-wrap items-center gap-8 rounded-lg border border-line bg-white p-5">
        <div>
          <h2 className="text-sm font-semibold">{t('initiatives.overall')}</h2>
          <p className="mt-1 text-xs text-muted">{t('projects.overallHint', { month: n(overall.month), ytd: n(overall.ytd) })}</p>
        </div>
        {view === 'month' ? <Ring pct={overall.month} size={120} /> : <Sparkline values={trend.map((v, i) => (i < p.month ? v : null))} width={360} height={110} labels />}
        <ul className="ms-auto flex flex-wrap gap-4 text-xs" aria-label={t('projects.legend')}>
          {[['behind', '0–60%'], ['at_risk', '60–80%'], ['on_track', '80–100%']].map(([k, label]) => (
            <li key={k} className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-sm" style={{ background: STATUS[k].fill }} aria-hidden="true" /><span style={{ color: STATUS[k].text }} className="font-medium">{label}</span></li>
          ))}
        </ul>
      </section>

      {initiatives.length === 0 ? (
        <p className="rounded-lg border border-dashed border-line p-6 text-sm text-muted">{t('initiatives.empty')}</p>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
          {initiatives.map((r) => (
            <button key={r.id} type="button" aria-pressed={selected === r.id} onClick={() => { setSelected(selected === r.id ? null : r.id); setTaskForm(null) }}
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
        <section className="space-y-5 rounded-lg border border-ink bg-white p-5" aria-label={t('initiatives.card')}>
          <div className="flex items-start justify-between gap-3">
            <h2 className="text-lg font-semibold">{t('initiatives.card')}</h2>
            {manager && (
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" className="h-8 w-8" aria-label={t('projects.edit')} onClick={() => setForm(full)}><Pencil className="h-4 w-4" /></Button>
                <Button variant="ghost" size="icon" className="h-8 w-8" aria-label={t('projects.delete')} disabled={delInit.isPending}
                  onClick={() => window.confirm(t('initiatives.confirmDelete')) && (setErr(''), delInit.mutate(full.id))}><Trash2 className="h-4 w-4" /></Button>
              </div>
            )}
          </div>
          <dl className="grid divide-y divide-line rounded-md border border-line text-sm sm:grid-cols-3 sm:divide-x sm:divide-y-0">
            {[['initiative', pick(full)], ['objective', full.objective ? pick(full.objective) : '—'], ['owner', full.owner?.name ?? '—']].map(([k, v]) => (
              <div key={k} className="p-3"><dt className="text-xs text-muted">{t(`initiatives.${k}`)}</dt><dd className="mt-1 font-medium">{v}</dd></div>
            ))}
          </dl>
          {err && <p role="alert" className="text-sm text-[#A32B1E]">{err}</p>}

          <div className="flex flex-wrap items-center gap-8">
            <Sparkline values={row.series.map((v, i) => (i < p.month ? v : null))} width={420} height={120} labels />
            {row.series.some((v) => v != null) ? <Ring pct={full.completion_pct} size={110} /> : <p className="max-w-xs text-sm text-muted">{t('projects.noProgress')}</p>}
          </div>

          <div>
            <h3 className="mb-2 text-sm font-semibold">{t('initiatives.projects')}</h3>
            {full.projects.length === 0 ? <p className="text-sm text-muted">{t('initiatives.noProjects')}</p> : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                {full.projects.map((x) => (
                  <div key={x.id} className="overflow-hidden rounded-md border border-line text-center text-xs">
                    <div className="flex">
                      <span className="w-14 shrink-0 py-1.5 font-semibold text-white" style={{ background: colorOf(x.completion_pct).fill }}>{n(Math.round(x.completion_pct))}%</span>
                      <span className="flex-1 truncate px-2 py-1.5 font-semibold">{pick(x)}</span>
                    </div>
                    <p className="truncate border-t border-line px-2 py-1.5 text-muted">{pick({ name: x.department_name, name_ar: x.department_name_ar }) ?? '—'}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {full.kpis.length > 0 && (
            <div>
              <h3 className="mb-2 text-sm font-semibold">{t('initiatives.linkedKpis')}</h3>
              <ul className="flex flex-wrap gap-2 text-xs">{full.kpis.map((k) => <li key={k.id} className="rounded-full border border-line px-2.5 py-1">{k.code} · {pick(k)}</li>)}</ul>
            </div>
          )}

          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-semibold">{t('initiatives.tasks')}</h3>
              {canPlan && taskForm === null && <Button variant="outline" size="sm" onClick={() => setTaskForm({})}><Plus className="h-4 w-4" aria-hidden="true" />{t('initiatives.addTask')}</Button>}
            </div>
            <p className="text-xs text-muted">{t('initiatives.rollupHint')}</p>
            {taskForm !== null && <TaskForm key={taskForm.id ?? 'new'} initiative={full} task={taskForm.id ? taskForm : null} onDone={() => setTaskForm(null)} />}
            {full.tasks.length === 0 ? <p className="text-sm text-muted">{t('initiatives.noTasks')}</p> : (
              <ul className="divide-y divide-line rounded-md border border-line">
                {full.tasks.map((x) => (
                  <li key={x.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-3 py-2.5 text-sm">
                    <span className="min-w-48 flex-1 font-medium">{pick(x, 'task_name')}</span>
                    <span className="text-xs text-muted tabular-nums">{x.due_date ?? '—'}</span>
                    <span className="w-14 text-end tabular-nums">{n(x.completion_pct)}%</span>
                    <span className="w-24 text-xs font-medium" style={{ color: TASK_COLOR[x.status] }}>{t(`initiatives.taskStatus.${x.status}`)}</span>
                    {canPlan && (
                      <span className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" aria-label={t('projects.edit')} onClick={() => setTaskForm(x)}><Pencil className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" aria-label={t('projects.delete')} disabled={delTask.isPending}
                          onClick={() => window.confirm(t('initiatives.confirmDeleteTask')) && (setErr(''), delTask.mutate(x.id))}><Trash2 className="h-4 w-4" /></Button>
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {canPlan && (
            <div className="border-t border-line pt-4">
              <h3 className="mb-1 text-sm font-semibold">{t('projects.reportProgress')}</h3>
              <p className="mb-3 text-xs text-muted">{t('initiatives.overrideHint')}</p>
              <ProgressForm key={`${full.id}-${p.year}-${p.month}-${full.completion_pct}`} initiative={full} row={row} period={p} />
            </div>
          )}
        </section>
      )}
    </div>
  )
}
