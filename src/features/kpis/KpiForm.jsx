import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import api from '@/lib/api'
import { cn } from '@/lib/utils'
import { fetchAll } from '@/lib/fetchAll'
import { Button } from '@/components/ui/button'
import { useFormat } from '@/features/dashboard/ui'

const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1)
const field = 'h-9 w-full rounded-md border border-line bg-white px-2 text-sm disabled:bg-brand-soft disabled:text-muted'
const ENUMS = {
  type: ['strategic', 'operational'],
  frequency: ['monthly', 'quarterly', 'yearly'],
  direction: ['higher_is_better', 'lower_is_better'],
  value_type: ['percentage', 'number', 'currency', 'ratio'],
}
const str = (v) => (v == null ? '' : String(v))
const num = (v) => (v === '' ? null : Number(v))

const Field = ({ label, children, className }) => (
  <label className={cn('block text-sm', className)}>
    <span className="mb-1 block text-muted">{label}</span>
    {children}
  </label>
)

// Loads the KPI's existing monthly targets first, so the grid starts from what is saved.
export default function KpiForm({ kpi, year, objectives, departments, onDone }) {
  const rows = useQuery({
    queryKey: ['kpi-targets', kpi?.id ?? null],
    queryFn: () => fetchAll('/kpi-targets', { kpi_id: kpi.id, year: kpi.year }),
    enabled: Boolean(kpi?.id),
  })
  const { t } = useTranslation()
  if (kpi?.id && rows.isLoading) return <p className="text-muted">{t('common.loading')}</p>
  return <Form kpi={kpi} year={year} existing={rows.data ?? []} objectives={objectives} departments={departments} onDone={onDone} />
}

function Form({ kpi, year, existing, objectives, departments, onDone }) {
  const { t } = useTranslation()
  const { month, pick } = useFormat()
  const qc = useQueryClient()
  const [f, setF] = useState({
    code: kpi?.code ?? '', name: kpi?.name ?? '', name_ar: str(kpi?.name_ar), unit: str(kpi?.unit),
    strategic_objective_id: str(kpi?.strategic_objective_id), department_id: str(kpi?.department_id),
    type: kpi?.type ?? 'strategic', frequency: kpi?.frequency ?? 'monthly', direction: kpi?.direction ?? 'higher_is_better',
    value_type: kpi?.value_type ?? 'number', weight: str(kpi?.weight && Number(kpi.weight)), annual_target: str(kpi?.annual_target && Number(kpi.annual_target)),
    threshold_red: str(kpi?.threshold_red && Number(kpi.threshold_red)), threshold_yellow: str(kpi?.threshold_yellow && Number(kpi.threshold_yellow)),
    is_active: kpi?.is_active ?? true,
  })
  const [tv, setTv] = useState(() => Object.fromEntries(MONTHS.map((m) => [m, str(existing.find((r) => r.month === m)?.target_value && Number(existing.find((r) => r.month === m).target_value))])))
  const [fill, setFill] = useState('')
  const [partial, setPartial] = useState(0)
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }))
  const kpiYear = kpi?.year ?? year

  const save = useMutation({
    mutationFn: async () => {
      const objective = objectives.find((o) => String(o.id) === f.strategic_objective_id)
      const payload = {
        year: kpiYear, code: f.code, name: f.name, name_ar: f.name_ar || null, unit: f.unit || null,
        strategic_objective_id: f.strategic_objective_id || null, bsc_perspective_id: objective?.bsc_perspective_id ?? null,
        department_id: f.department_id || null, type: f.type, frequency: f.frequency, direction: f.direction, value_type: f.value_type,
        annual_target: num(f.annual_target), is_active: f.is_active,
        // Columns with DB defaults are only sent when filled in, because the API rejects null for them.
        ...Object.fromEntries(['weight', 'threshold_red', 'threshold_yellow'].filter((k) => f[k] !== '').map((k) => [k, Number(f[k])])),
      }
      const res = kpi?.id ? await api.put(`/kpis/${kpi.id}`, payload) : await api.post('/kpis', payload)
      const id = res.data.data.id
      const jobs = MONTHS.filter((m) => tv[m] !== '').map((m) => {
        const row = existing.find((r) => r.month === m)
        if (row) return Number(row.target_value) === Number(tv[m]) ? null : api.put(`/kpi-targets/${row.id}`, { target_value: Number(tv[m]) })
        return api.post('/kpi-targets', { kpi_id: id, year: kpiYear, month: m, target_value: Number(tv[m]) })
      }).filter(Boolean)
      return (await Promise.allSettled(jobs)).filter((r) => r.status === 'rejected').length
    },
    onSuccess: (failed) => {
      qc.invalidateQueries()
      if (failed) setPartial(failed)
      else onDone()
    },
  })

  return (
    <form className="space-y-5 rounded-lg border border-ink bg-white p-5" onSubmit={(e) => { e.preventDefault(); save.mutate() }}>
      <h2 className="text-sm font-semibold">{kpi?.id ? t('kpiList.editKpi') : t('kpiList.newKpi')} · {kpiYear}</h2>
      <div className="grid gap-4 md:grid-cols-3">
        <Field label={t('kpiList.code')}><input required className={field} value={f.code} onChange={set('code')} /></Field>
        <Field label={t('kpiList.name')} className="md:col-span-1"><input required className={field} value={f.name} onChange={set('name')} /></Field>
        <Field label={t('kpiList.nameAr')}><input dir="rtl" className={field} value={f.name_ar} onChange={set('name_ar')} /></Field>
        <Field label={t('kpiList.objective')}>
          <select className={field} value={f.strategic_objective_id} onChange={set('strategic_objective_id')}>
            <option value="">—</option>
            {objectives.map((o) => <option key={o.id} value={o.id}>{o.code} · {pick(o)}</option>)}
          </select>
        </Field>
        <Field label={t('kpiList.department')}>
          <select className={field} value={f.department_id} onChange={set('department_id')}>
            <option value="">—</option>
            {departments.map((d) => <option key={d.id} value={d.id}>{pick(d)}</option>)}
          </select>
        </Field>
        <Field label={t('kpiList.unit')}><input className={field} value={f.unit} onChange={set('unit')} /></Field>
        {Object.entries(ENUMS).map(([k, opts]) => (
          <Field key={k} label={t(`kpiList.${k}`)}>
            <select className={field} value={f[k]} onChange={set(k)}>{opts.map((o) => <option key={o} value={o}>{t(`kpiList.${k}s.${o}`)}</option>)}</select>
          </Field>
        ))}
        <Field label={t('kpiList.weight')}><input type="number" step="any" min="0" max="100" className={field} value={f.weight} onChange={set('weight')} /></Field>
        <Field label={t('kpiList.annualTarget')}><input type="number" step="any" className={field} value={f.annual_target} onChange={set('annual_target')} /></Field>
        <Field label={t('kpiList.thresholdRed')}><input type="number" step="any" min="0" max="100" className={field} value={f.threshold_red} onChange={set('threshold_red')} /></Field>
        <Field label={t('kpiList.thresholdYellow')}><input type="number" step="any" min="0" max="100" className={field} value={f.threshold_yellow} onChange={set('threshold_yellow')} /></Field>
        <label className="flex items-center gap-2 self-end pb-2 text-sm"><input type="checkbox" checked={f.is_active} onChange={(e) => setF((s) => ({ ...s, is_active: e.target.checked }))} />{t('kpiList.active')}</label>
      </div>

      <fieldset className="space-y-3">
        <legend className="text-sm font-semibold">{t('kpiList.targets')}</legend>
        <p className="text-xs text-muted">{t('kpiList.targetsHint')}</p>
        <div className="flex flex-wrap items-end gap-2">
          <Field label={t('kpiList.fillValue')}><input type="number" step="any" className={cn(field, 'w-32')} value={fill} onChange={(e) => setFill(e.target.value)} /></Field>
          <Button type="button" variant="outline" size="sm" disabled={fill === ''} onClick={() => setTv(Object.fromEntries(MONTHS.map((m) => [m, fill])))}>{t('kpiList.fillAll')}</Button>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
          {MONTHS.map((m) => (
            <Field key={m} label={month(m)}><input type="number" step="any" className={cn(field, 'tabular-nums')} value={tv[m]} onChange={(e) => setTv((s) => ({ ...s, [m]: e.target.value }))} /></Field>
          ))}
        </div>
      </fieldset>

      <div className="flex flex-wrap items-center gap-3">
        {partial === 0 && <Button type="submit" size="sm" disabled={save.isPending}>{save.isPending ? t('kpiList.saving') : t('kpiList.save')}</Button>}
        <Button type="button" variant="outline" size="sm" onClick={onDone}>{partial ? t('kpiList.close') : t('kpiList.cancel')}</Button>
        {partial > 0 && <span role="alert" className="text-sm text-[#A32B1E]">{t('kpiList.partial', { count: partial })}</span>}
        {save.isError && <span role="alert" className="text-sm text-[#A32B1E]">{save.error?.response?.data?.message || t('kpiList.saveError')}</span>}
      </div>
    </form>
  )
}
