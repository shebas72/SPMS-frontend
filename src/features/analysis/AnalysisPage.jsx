import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import Chart from 'react-apexcharts'
import { Check, Pencil, Plus, Trash2, X } from 'lucide-react'
import api from '@/lib/api'
import { cn } from '@/lib/utils'
import { canEdit } from '@/lib/roles'
import { fetchAll } from '@/lib/fetchAll'
import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/stores/authStore'
import { PeriodPicker } from '@/features/dashboard/DashboardPage'
import { StatusBadge, STATUS, useFormat } from '@/features/dashboard/ui'

const CAUSES = ['resources_shortage', 'technical_challenges', 'administrative', 'lack_of_followup', 'other']
const CAUSE_COLORS = { resources_shortage: '#00979D', technical_challenges: '#00436B', administrative: '#00AEEF', lack_of_followup: '#B3B3B3', other: '#0B2536' }
const GROUPS = ['high', 'medium', 'low', 'not_entered']
const GROUP_COLOR = { high: STATUS.on_track.fill, medium: STATUS.at_risk.fill, low: STATUS.behind.fill, not_entered: STATUS.none.fill }
const PILL = { pending: ['#8A5A00', '#D99A1B26'], in_progress: ['#185FA5', '#185FA524'], completed: ['#1F6B40', '#2E7D4F24'], rejected: ['#A32B1E', '#C9443424'] }
const field = 'h-9 w-full rounded-md border border-line bg-white px-2 text-sm'

const L = ({ label, children, className }) => (
  <label className={cn('block text-sm', className)}>
    <span className="mb-1 block text-muted">{label}</span>
    {children}
  </label>
)

function Pill({ status }) {
  const { t } = useTranslation()
  const [color, background] = PILL[status] ?? PILL.pending
  return <span className="inline-block rounded-full px-2 py-0.5 text-xs font-medium" style={{ color, background }}>{t(`analysis.status.${status}`)}</span>
}

function ProposalForm({ kpi, proposal, period, onDone }) {
  const { t } = useTranslation()
  const { pick } = useFormat()
  const qc = useQueryClient()
  const [f, setF] = useState({
    title: proposal?.title ?? '', title_ar: proposal?.title_ar ?? '', description: proposal?.description ?? '', description_ar: proposal?.description_ar ?? '',
    root_cause: proposal?.root_cause ?? 'resources_shortage', root_cause_detail: proposal?.root_cause_detail ?? '', due_date: proposal?.due_date ?? '',
  })
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }))
  const target = proposal?.kpi ?? kpi
  const save = useMutation({
    mutationFn: () => {
      const body = { ...f, title_ar: f.title_ar || null, description_ar: f.description_ar || null, root_cause_detail: f.root_cause_detail || null, due_date: f.due_date || null }
      return proposal ? api.put(`/corrective-proposals/${proposal.id}`, body) : api.post('/corrective-proposals', { ...body, kpi_id: kpi.id, year: period.year, month: period.month })
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['proposals'] }); onDone() },
  })
  return (
    <form className="space-y-4 rounded-lg border border-ink bg-white p-5" onSubmit={(e) => { e.preventDefault(); save.mutate() }}>
      <div>
        <h2 className="text-sm font-semibold">{proposal ? t('analysis.editProposal') : t('analysis.newProposal')}</h2>
        <p className="mt-1 text-xs text-muted">{target?.code} · {pick(target)}</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <L label={t('analysis.titleEn')}><input required className={field} value={f.title} onChange={set('title')} /></L>
        <L label={t('analysis.titleAr')}><input dir="rtl" className={field} value={f.title_ar} onChange={set('title_ar')} /></L>
        <L label={t('analysis.descEn')}><textarea required rows={3} className={cn(field, 'h-auto py-2')} value={f.description} onChange={set('description')} /></L>
        <L label={t('analysis.descAr')}><textarea dir="rtl" rows={3} className={cn(field, 'h-auto py-2')} value={f.description_ar} onChange={set('description_ar')} /></L>
        <L label={t('analysis.rootCause')}>
          <select className={field} value={f.root_cause} onChange={set('root_cause')}>{CAUSES.map((c) => <option key={c} value={c}>{t(`analysis.causes.${c}`)}</option>)}</select>
        </L>
        <L label={t('analysis.dueDate')}><input type="date" className={field} value={f.due_date} onChange={set('due_date')} /></L>
        <L label={t('analysis.causeDetail')} className="md:col-span-2"><input className={field} value={f.root_cause_detail} onChange={set('root_cause_detail')} /></L>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" size="sm" disabled={save.isPending}>{save.isPending ? t('analysis.saving') : t('analysis.save')}</Button>
        <Button type="button" variant="outline" size="sm" onClick={onDone}>{t('analysis.cancel')}</Button>
        {save.isError && <span role="alert" className="text-sm text-[#A32B1E]">{save.error?.response?.data?.message || t('analysis.saveError')}</span>}
      </div>
    </form>
  )
}

export default function AnalysisPage() {
  const { t } = useTranslation()
  const { n, pick, lang } = useFormat()
  const qc = useQueryClient()
  const user = useAuthStore((s) => s.user)
  const manager = canEdit(user)
  const [period, setPeriod] = useState({})
  const [group, setGroup] = useState('low')
  const [dept, setDept] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [form, setForm] = useState(null) // null | { kpi } to propose | { proposal } to edit
  const [actionError, setActionError] = useState('')

  const cls = useQuery({
    queryKey: ['analysis-classification', period.year ?? null, period.month ?? null, dept],
    queryFn: async () => (await api.get('/dashboard/classification', { params: { ...period, department_id: dept || undefined } })).data.data,
    placeholderData: (prev) => prev,
  })
  const p = cls.data?.period
  const proposals = useQuery({
    queryKey: ['proposals', p?.year, p?.month],
    queryFn: async () => (await api.get('/corrective-proposals', { params: { year: p.year, month: p.month } })).data.data,
    enabled: Boolean(p),
  })
  const departments = useQuery({ queryKey: ['lookup-departments'], queryFn: () => fetchAll('/departments') })

  const refresh = () => qc.invalidateQueries({ queryKey: ['proposals'] })
  const onError = (e) => setActionError(e.response?.data?.message || t('analysis.actionError'))
  const review = useMutation({ mutationFn: ({ id, action }) => api.post(`/corrective-proposals/${id}/review`, { action }), onSuccess: () => { setActionError(''); refresh() }, onError })
  const del = useMutation({ mutationFn: (id) => api.delete(`/corrective-proposals/${id}`), onSuccess: () => { setActionError(''); refresh() }, onError })

  const byKpi = useMemo(() => (proposals.data ?? []).reduce((acc, x) => ((acc[x.kpi_id] ??= []).push(x), acc), {}), [proposals.data])
  const causeCounts = useMemo(() => {
    const c = Object.fromEntries(CAUSES.map((k) => [k, 0]))
    ;(proposals.data ?? []).filter((x) => x.status !== 'rejected').forEach((x) => { c[x.root_cause] += 1 })
    return c
  }, [proposals.data])

  if (cls.isLoading || proposals.isLoading || departments.isLoading) return <p className="text-muted">{t('common.loading')}</p>
  if (cls.isError || proposals.isError || !cls.data) {
    return (
      <div className="max-w-md rounded-lg border border-line bg-white p-5">
        <p className="text-sm">{t('analysis.error')}</p>
        <Button className="mt-4" variant="outline" size="sm" onClick={() => qc.invalidateQueries()}>{t('dashboard.retry')}</Button>
      </div>
    )
  }

  const { counts, groups } = cls.data
  const total = GROUPS.reduce((s, g) => s + counts[g], 0)
  const lowPct = total ? Math.round((counts.low / total) * 1000) / 10 : 0
  const causeTotal = Object.values(causeCounts).reduce((a, b) => a + b, 0)
  const canModify = (x) => manager || (x.submitted_by === user?.id && x.status === 'pending')
  const list = (proposals.data ?? []).filter((x) => !statusFilter || x.status === statusFilter)
  const donut = { chart: { type: 'donut', fontFamily: 'inherit', animations: { enabled: false } }, legend: { position: 'bottom' }, dataLabels: { enabled: false }, stroke: { width: 1 } }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h1 className="text-2xl font-semibold">{t('nav.analysis')}</h1>
        <div className="flex flex-wrap items-center gap-3">
          <PeriodPicker period={p} onChange={(next) => { setPeriod(next); setForm(null) }} />
          <select className={cn(field, 'w-auto')} aria-label={t('kpiList.department')} value={dept} onChange={(e) => setDept(e.target.value)}>
            <option value="">{t('kpiList.allDepartments')}</option>
            {departments.data.map((d) => <option key={d.id} value={d.id}>{pick(d)}</option>)}
          </select>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" role="group" aria-label={t('analysis.groups')}>
        {GROUPS.map((g) => (
          <button key={g} type="button" aria-pressed={group === g} onClick={() => setGroup(g)}
            className={cn('rounded-lg border bg-white p-4 text-start hover:bg-brand-soft', group === g ? 'border-ink' : 'border-line')}>
            <span className="flex items-center gap-2 text-xs text-muted"><span className="h-2 w-2 rounded-full" style={{ background: GROUP_COLOR[g] }} aria-hidden="true" />{t(g === 'not_entered' ? 'dashboard.notEntered' : `dashboard.${g}`)}</span>
            <span className="mt-2 block text-3xl font-semibold tabular-nums">{n(counts[g])}</span>
          </button>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <section className="overflow-x-auto rounded-lg border border-line bg-white">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="border-b border-line text-xs text-muted">
              <tr>{['kpi', 'code', 'achievement', 'gap', 'proposals'].map((c) => <th key={c} className="px-4 py-3 text-start font-medium">{t(`analysis.col.${c}`)}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-line">
              {groups[group].length === 0 && <tr><td colSpan={5} className="px-4 py-6 text-muted">{t('analysis.noKpis')}</td></tr>}
              {groups[group].map((k) => (
                <tr key={k.id} className="align-top">
                  <td className="px-4 py-3 font-medium">{pick(k)}</td>
                  <td className="px-4 py-3"><Link to={`/kpis/${k.id}`} className="text-xs text-muted hover:underline">{k.code}</Link></td>
                  <td className="px-4 py-3">{k.score == null ? '—' : <><span className="tabular-nums">{n(k.score)}%</span> <StatusBadge status={k.status} score={k.score} /></>}</td>
                  <td className="px-4 py-3 tabular-nums">{k.score == null ? '—' : `${n(Math.max(0, 100 - k.score))}%`}</td>
                  <td className="px-4 py-3">
                    <ul className="space-y-1">
                      {(byKpi[k.id] ?? []).map((x) => <li key={x.id} className="flex items-center gap-2"><span className="truncate">{pick(x, 'title')}</span><Pill status={x.status} /></li>)}
                    </ul>
                    {(group === 'low' || group === 'medium') && form === null && (
                      <Button variant="outline" size="sm" className="mt-2" onClick={() => setForm({ kpi: k })}><Plus className="h-4 w-4" aria-hidden="true" />{t('analysis.propose')}</Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <div className="space-y-6" dir="ltr" key={lang}>
          <section className="rounded-lg border border-line bg-white p-5">
            <h2 className="text-sm font-semibold">{t('analysis.lowPerformers')}</h2>
            <Chart type="donut" height={220} series={[counts.low, total - counts.low]}
              options={{ ...donut, labels: [t('dashboard.low'), t('analysis.otherKpis')], colors: [STATUS.behind.fill, '#E5E7EB'],
                plotOptions: { pie: { donut: { labels: { show: true, name: { show: false }, value: { show: false }, total: { show: true, showAlways: true, label: '', formatter: () => `${n(lowPct)}%` } } } } } }} />
          </section>
          <section className="rounded-lg border border-line bg-white p-5">
            <h2 className="text-sm font-semibold">{t('analysis.gapAnalysis')}</h2>
            {causeTotal === 0 ? <p className="mt-3 text-sm text-muted">{t('analysis.noGapData')}</p> : (
              <Chart type="donut" height={260} series={CAUSES.map((c) => causeCounts[c])}
                options={{ ...donut, labels: CAUSES.map((c) => t(`analysis.causes.${c}`)), colors: CAUSES.map((c) => CAUSE_COLORS[c]),
                  dataLabels: { enabled: true, formatter: (v) => `${n(Math.round(v))}%` } }} />
            )}
          </section>
        </div>
      </div>

      {form && <ProposalForm key={form.proposal?.id ?? form.kpi.id} kpi={form.kpi} proposal={form.proposal} period={p} onDone={() => setForm(null)} />}

      <section className="overflow-x-auto rounded-lg border border-line bg-white">
        <div className="flex flex-wrap items-center justify-between gap-3 p-5 pb-3">
          <h2 className="text-sm font-semibold">{t('analysis.proposals')}</h2>
          <select className={cn(field, 'w-auto')} aria-label={t('analysis.col.status')} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">{t('analysis.allStatuses')}</option>
            {Object.keys(PILL).map((s) => <option key={s} value={s}>{t(`analysis.status.${s}`)}</option>)}
          </select>
        </div>
        {actionError && <p role="alert" className="px-5 pb-2 text-sm text-[#A32B1E]">{actionError}</p>}
        {list.length === 0 ? <p className="px-5 pb-5 text-sm text-muted">{t('analysis.noProposals')}</p> : (
          <table className="w-full min-w-[820px] text-sm">
            <thead className="border-y border-line text-xs text-muted">
              <tr>{['title', 'kpi', 'cause', 'due', 'by', 'status'].map((c) => <th key={c} className="px-4 py-2.5 text-start font-medium">{t(`analysis.pcol.${c}`)}</th>)}<th /></tr>
            </thead>
            <tbody className="divide-y divide-line">
              {list.map((x) => (
                <tr key={x.id} className="align-top">
                  <td className="px-4 py-3"><p className="font-medium">{pick(x, 'title')}</p><p className="text-xs text-muted">{pick(x, 'description')}</p></td>
                  <td className="px-4 py-3 text-xs">{x.kpi?.code}<br />{x.kpi && pick(x.kpi)}</td>
                  <td className="px-4 py-3">{t(`analysis.causes.${x.root_cause}`)}</td>
                  <td className="px-4 py-3 tabular-nums">{x.due_date ?? '—'}</td>
                  <td className="px-4 py-3">{x.submitter?.name}</td>
                  <td className="px-4 py-3"><Pill status={x.status} /></td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap justify-end gap-1">
                      {manager && x.status === 'pending' && <>
                        <Button size="sm" variant="outline" disabled={review.isPending} onClick={() => review.mutate({ id: x.id, action: 'approve' })}><Check className="h-4 w-4" aria-hidden="true" />{t('analysis.approve')}</Button>
                        <Button size="sm" variant="outline" disabled={review.isPending} onClick={() => review.mutate({ id: x.id, action: 'reject' })}><X className="h-4 w-4" aria-hidden="true" />{t('analysis.reject')}</Button>
                      </>}
                      {manager && x.status === 'in_progress' && <Button size="sm" variant="outline" disabled={review.isPending} onClick={() => review.mutate({ id: x.id, action: 'complete' })}>{t('analysis.complete')}</Button>}
                      {canModify(x) && <>
                        <Button variant="ghost" size="icon" className="h-8 w-8" aria-label={t('analysis.edit')} onClick={() => setForm({ proposal: x })}><Pencil className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" aria-label={t('analysis.delete')} disabled={del.isPending} onClick={() => window.confirm(t('analysis.confirmDelete')) && del.mutate(x.id)}><Trash2 className="h-4 w-4" /></Button>
                      </>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  )
}
