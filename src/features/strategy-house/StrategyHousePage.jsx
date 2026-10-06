import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import api from '@/lib/api'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/stores/authStore'
import { useFormat } from '@/features/dashboard/ui'

const KEY = ['strategy-house']
const field = 'w-full rounded-md border border-line bg-white px-3 py-2 text-sm'

// The API enforces admin/manager on writes. If the user object carries no role info, show the controls and let a 403 surface.
function canEdit(user) {
  const names = [user?.role, ...(user?.roles ?? [])].filter(Boolean).map((r) => (typeof r === 'string' ? r : r.name))
  return names.length === 0 || names.some((r) => ['admin', 'manager'].includes(r))
}

function useSave(fn, onDone) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: fn,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY })
      onDone?.()
    },
  })
}

const Field = ({ label, children }) => (
  <label className="block text-sm">
    <span className="mb-1 block text-muted">{label}</span>
    {children}
  </label>
)

function Actions({ mutation, onCancel, disabled }) {
  const { t } = useTranslation()
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button type="submit" size="sm" disabled={mutation.isPending || disabled}>
        {mutation.isPending ? t('strategyHouse.saving') : t('strategyHouse.save')}
      </Button>
      <Button type="button" variant="outline" size="sm" onClick={onCancel}>{t('strategyHouse.cancel')}</Button>
      {mutation.isError && (
        <span role="alert" className="text-sm text-[#A32B1E]">{mutation.error?.response?.data?.message || t('strategyHouse.saveError')}</span>
      )}
    </div>
  )
}

function HouseForm({ house, onDone }) {
  const { t } = useTranslation()
  const [f, setF] = useState({
    year: house?.year ?? '', mission: house?.mission ?? '', mission_ar: house?.mission_ar ?? '',
    vision: house?.vision ?? '', vision_ar: house?.vision_ar ?? '',
  })
  const save = useSave(() => api.put('/strategy-house', { ...f, year: f.year || undefined }), onDone)
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }))
  return (
    <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); save.mutate() }}>
      <div className="grid gap-4 md:grid-cols-2">
        <Field label={t('strategyHouse.missionEn')}><textarea className={field} rows={4} value={f.mission} onChange={set('mission')} /></Field>
        <Field label={t('strategyHouse.missionAr')}><textarea className={field} rows={4} dir="rtl" value={f.mission_ar} onChange={set('mission_ar')} /></Field>
        <Field label={t('strategyHouse.visionEn')}><textarea className={field} rows={4} value={f.vision} onChange={set('vision')} /></Field>
        <Field label={t('strategyHouse.visionAr')}><textarea className={field} rows={4} dir="rtl" value={f.vision_ar} onChange={set('vision_ar')} /></Field>
        <Field label={t('dashboard.year')}><input type="number" min="2000" max="2100" className={cn(field, 'md:w-32')} value={f.year} onChange={set('year')} /></Field>
      </div>
      <Actions mutation={save} onCancel={onDone} />
    </form>
  )
}

function WeightsEditor({ perspectives, onDone }) {
  const { t } = useTranslation()
  const { n, pick } = useFormat()
  const qc = useQueryClient()
  const [w, setW] = useState(() => Object.fromEntries(perspectives.map((p) => [p.id, String(Number(p.weight))])))
  const total = perspectives.reduce((sum, p) => sum + (Number(w[p.id]) || 0), 0)
  const valid = perspectives.every((p) => w[p.id] !== '' && Number(w[p.id]) >= 0 && Number(w[p.id]) <= 100)
  const ok = valid && Math.abs(total - 100) < 0.005
  // Weights change every score, so refresh all cached dashboard data after saving.
  const save = useMutation({
    mutationFn: () => api.put('/perspectives/weights', { weights: perspectives.map((p) => ({ id: p.id, weight: Number(w[p.id]) })) }),
    onSuccess: () => { qc.invalidateQueries(); onDone() },
  })
  return (
    <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); if (ok) save.mutate() }}>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {perspectives.map((p) => (
          <div key={p.id} className="rounded-lg border border-line p-4" style={{ borderTop: `3px solid ${p.color}` }}>
            <label htmlFor={`w-${p.id}`} className="text-sm font-semibold">{pick(p)}</label>
            <div className="mt-2 flex items-center gap-2">
              <input
                id={`w-${p.id}`} type="number" min="0" max="100" step="0.5" inputMode="decimal"
                className={cn(field, 'w-24 tabular-nums')} value={w[p.id]}
                onChange={(e) => setW((s) => ({ ...s, [p.id]: e.target.value }))}
              />
              <span className="text-sm text-muted">%</span>
            </div>
          </div>
        ))}
      </div>
      <p role="status" className="text-sm font-medium tabular-nums" style={{ color: ok ? '#1F6B40' : '#A32B1E' }}>
        {t('strategyHouse.weightTotal', { value: n(total) })}
        {!ok && <span className="ms-2 font-normal">{t('strategyHouse.weightHint')}</span>}
      </p>
      <Actions mutation={save} onCancel={onDone} disabled={!ok} />
    </form>
  )
}

function ValueForm({ initial, onDone }) {
  const { t } = useTranslation()
  const [f, setF] = useState({
    name: initial.name ?? '', name_ar: initial.name_ar ?? '', description: initial.description ?? '',
    description_ar: initial.description_ar ?? '', color: initial.color || '#185FA5',
  })
  const save = useSave(() => (initial.id ? api.put(`/core-values/${initial.id}`, f) : api.post('/core-values', f)), onDone)
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }))
  return (
    <form className="space-y-4 rounded-lg border border-ink p-4" onSubmit={(e) => { e.preventDefault(); save.mutate() }}>
      <h3 className="text-sm font-semibold">{initial.id ? t('strategyHouse.editValue') : t('strategyHouse.addValue')}</h3>
      <div className="grid gap-4 md:grid-cols-2">
        <Field label={t('strategyHouse.name')}><input required className={field} value={f.name} onChange={set('name')} /></Field>
        <Field label={t('strategyHouse.nameAr')}><input dir="rtl" className={field} value={f.name_ar} onChange={set('name_ar')} /></Field>
        <Field label={t('strategyHouse.description')}><textarea rows={3} className={field} value={f.description} onChange={set('description')} /></Field>
        <Field label={t('strategyHouse.descriptionAr')}><textarea rows={3} dir="rtl" className={field} value={f.description_ar} onChange={set('description_ar')} /></Field>
        <Field label={t('strategyHouse.color')}><input type="color" className="h-9 w-16 rounded-md border border-line bg-white p-1" value={f.color} onChange={set('color')} /></Field>
      </div>
      <Actions mutation={save} onCancel={onDone} />
    </form>
  )
}

function ValueCard({ v, editable, onEdit }) {
  const { t } = useTranslation()
  const { pick } = useFormat()
  const del = useSave(() => api.delete(`/core-values/${v.id}`))
  return (
    <article className="rounded-lg border border-line p-4" style={{ borderInlineStart: `4px solid ${v.color || '#8A8F98'}` }}>
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-sm font-semibold">{pick(v)}</h3>
        {editable && (
          <div className="flex shrink-0 gap-1">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onEdit} aria-label={t('strategyHouse.edit')}><Pencil className="h-4 w-4" /></Button>
            <Button
              variant="ghost" size="icon" className="h-8 w-8" aria-label={t('strategyHouse.delete')} disabled={del.isPending}
              onClick={() => window.confirm(t('strategyHouse.confirmDelete')) && del.mutate()}
            ><Trash2 className="h-4 w-4" /></Button>
          </div>
        )}
      </div>
      {pick(v, 'description') && <p className="mt-2 text-sm text-muted">{pick(v, 'description')}</p>}
      {del.isError && <p role="alert" className="mt-2 text-xs text-[#A32B1E]">{del.error?.response?.data?.message || t('strategyHouse.saveError')}</p>}
    </article>
  )
}

export default function StrategyHousePage() {
  const { t } = useTranslation()
  const { n, pick } = useFormat()
  const editable = canEdit(useAuthStore((s) => s.user))
  const { data, isLoading, isError, refetch } = useQuery({ queryKey: KEY, queryFn: async () => (await api.get('/strategy-house')).data.data })
  const [editHouse, setEditHouse] = useState(false)
  const [editWeights, setEditWeights] = useState(false)
  const [valueForm, setValueForm] = useState(null) // null = closed, {} = new, value = editing

  if (isLoading) return <p className="text-muted">{t('common.loading')}</p>
  if (isError || !data) {
    return (
      <div className="max-w-md rounded-lg border border-line bg-white p-5">
        <p className="text-sm">{t('strategyHouse.loadError')}</p>
        <Button className="mt-4" variant="outline" size="sm" onClick={() => refetch()}>{t('dashboard.retry')}</Button>
      </div>
    )
  }

  const { house, perspectives } = data
  const values = [...data.core_values].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0) || a.id - b.id)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">{t('nav.strategyHouse')}</h1>
        {house?.year && <p className="mt-1 text-sm text-muted">{t('dashboard.year')}: <span className="tabular-nums">{house.year}</span></p>}
      </div>

      <div className="divide-y divide-line rounded-lg border border-line bg-white">
        <section className="p-6">
          {editHouse ? (
            <HouseForm house={house} onDone={() => setEditHouse(false)} />
          ) : (
            <>
              <div className="flex justify-end">
                {editable && <Button variant="outline" size="sm" onClick={() => setEditHouse(true)}><Pencil className="h-4 w-4" aria-hidden="true" />{t('strategyHouse.edit')}</Button>}
              </div>
              {house ? (
                <div className="grid gap-8 md:grid-cols-2">
                  {[['mission', 'missionTitle'], ['vision', 'visionTitle']].map(([k, label]) => (
                    <div key={k}>
                      <h2 className="text-sm font-semibold">{t(`strategyHouse.${label}`)}</h2>
                      <p className="mt-2 whitespace-pre-line leading-relaxed">{pick(house, k) || <span className="text-muted">{t('strategyHouse.notSet')}</span>}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted">{t('strategyHouse.noHouse')}</p>
              )}
            </>
          )}
        </section>

        <section className="p-6">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold">{t('strategyHouse.perspectives')}</h2>
            {editable && !editWeights && perspectives.length > 0 && (
              <Button variant="outline" size="sm" onClick={() => setEditWeights(true)}>
                <Pencil className="h-4 w-4" aria-hidden="true" />{t('strategyHouse.editWeights')}
              </Button>
            )}
          </div>
          {editWeights ? (
            <WeightsEditor perspectives={perspectives} onDone={() => setEditWeights(false)} />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {perspectives.map((p) => (
                <article key={p.id} className="rounded-lg border border-line p-4" style={{ borderTop: `3px solid ${p.color}` }}>
                  <h3 className="text-sm font-semibold">{pick(p)}</h3>
                  <p className="mt-1 text-xs text-muted">{t('dashboard.weight', { value: n(Number(p.weight)) })}</p>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="space-y-4 p-6">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold">{t('strategyHouse.values')}</h2>
            {editable && valueForm === null && (
              <Button variant="outline" size="sm" disabled={!house} onClick={() => setValueForm({})}>
                <Plus className="h-4 w-4" aria-hidden="true" />{t('strategyHouse.addValue')}
              </Button>
            )}
          </div>
          {editable && !house && <p className="text-xs text-muted">{t('strategyHouse.needHouse')}</p>}
          {valueForm !== null && <ValueForm key={valueForm.id ?? 'new'} initial={valueForm} onDone={() => setValueForm(null)} />}
          {values.length === 0 ? (
            <p className="text-sm text-muted">{t('strategyHouse.noValues')}</p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {values.map((v) => <ValueCard key={v.id} v={v} editable={editable} onEdit={() => setValueForm(v)} />)}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}