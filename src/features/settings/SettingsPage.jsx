import { useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import api from '@/lib/api'
import { cn } from '@/lib/utils'
import { isAdmin } from '@/lib/admin'
import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/stores/authStore'
import { useFormat } from '@/features/dashboard/ui'

const field = 'h-9 w-full rounded-md border border-line bg-white px-2 text-sm'
const L = ({ label, children, className }) => (
  <label className={cn('block text-sm', className)}><span className="mb-1 block text-muted">{label}</span>{children}</label>
)
const zones = typeof Intl.supportedValuesOf === 'function' ? Intl.supportedValuesOf('timeZone') : []

function Meter({ label, used, limit }) {
  const { t } = useTranslation()
  const unlimited = limit == null
  const pct = unlimited ? 0 : limit === 0 ? 100 : Math.min(100, Math.round((used / limit) * 100))
  const tone = pct >= 100 ? 'bg-[#A32B1E]' : pct >= 80 ? 'bg-[#B7791F]' : 'bg-brand'
  return (
    <div className="grid items-center gap-x-4 gap-y-1.5 py-3 md:grid-cols-[minmax(0,13rem)_minmax(0,1fr)_7rem]">
      <span className="text-sm">{label}</span>
      <div
        className={cn('h-2 w-full overflow-hidden rounded-full', unlimited ? 'border border-dashed border-line bg-transparent' : 'bg-brand-soft')}
        role={unlimited ? undefined : 'progressbar'} aria-valuenow={unlimited ? undefined : used} aria-valuemin={unlimited ? undefined : 0} aria-valuemax={unlimited ? undefined : limit} aria-label={label}
      >
        {!unlimited && <div className={cn('h-full rounded-full', tone)} style={{ width: `${pct}%` }} />}
      </div>
      <span className="text-sm tabular-nums text-muted md:text-end">{unlimited ? t('settings.usedUnlimited', { used }) : t('settings.usedOf', { used, limit })}</span>
    </div>
  )
}

function PlanCard() {
  const { t, i18n } = useTranslation()
  const q = useQuery({ queryKey: ['company-plan'], queryFn: async () => (await api.get('/company/plan')).data.data })
  if (q.isLoading || q.isError || !q.data) return null
  const { plan, limits, features } = q.data
  const name = plan ? ((i18n.language || '').startsWith('ar') && plan.name_ar ? plan.name_ar : plan.name) : t('settings.noPlan')
  const feats = [['projects', 'featProjects'], ['arabic', 'featArabic'], ['pdf_export', 'featPdf']]
  return (
    <section className="rounded-lg border border-line bg-white p-5">
      <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold">{t('settings.plan')}</h2>
        <span className="rounded-full bg-brand-soft px-3 py-1 text-xs font-medium text-brand">{name}</span>
      </div>
      <div className="divide-y divide-line">
        <Meter label={t('settings.limitKpis')} used={limits.kpis.used} limit={limits.kpis.limit} />
        <Meter label={t('settings.limitUsers')} used={limits.users.used} limit={limits.users.limit} />
        <Meter label={t('settings.limitDepartments')} used={limits.departments.used} limit={limits.departments.limit} />
        <div className="grid items-start gap-x-4 gap-y-2 py-3 md:grid-cols-[minmax(0,13rem)_minmax(0,1fr)]">
          <span className="text-sm">{t('settings.features')}</span>
          <ul className="flex flex-wrap gap-2 text-xs">
            {feats.map(([k, label]) => (
              <li key={k} className={cn('inline-flex items-center gap-1 rounded-full border px-2.5 py-1', features[k] ? 'border-[#1F6B40] text-[#1F6B40]' : 'border-line text-muted')}>
                <span aria-hidden="true">{features[k] ? '✓' : '✕'}</span>{t(`settings.${label}`)}
              </li>
            ))}
          </ul>
        </div>
      </div>
      <p className="mt-2 text-xs text-muted">{t('settings.planHint')}</p>
    </section>
  )
}

function Form({ company }) {
  const { t } = useTranslation()
  const arabicAllowed = useAuthStore((st) => st.user?.company?.features?.arabic) !== false
  const { monthLong } = useFormat()
  const qc = useQueryClient()
  const fileRef = useRef(null)
  const [f, setF] = useState({ name: company.name ?? '', name_ar: company.name_ar ?? '', timezone: company.timezone ?? '', default_language: company.default_language ?? '', team_report_visibility: company.team_report_visibility ?? 'colleagues', fiscal_year_start: company.fiscal_year_start ?? '01-01' })
  const [saved, setSaved] = useState(false)
  const set = (k) => (e) => { setSaved(false); setF((x) => ({ ...x, [k]: e.target.value })) }
  const done = () => { qc.invalidateQueries({ queryKey: ['company'] }); qc.invalidateQueries({ queryKey: ['me'] }) } // 'me' refreshes the sidebar logo and name
  const save = useMutation({
    mutationFn: () => api.put('/company', Object.fromEntries(Object.entries(f).map(([k, v]) => [k, v === '' ? null : v]))),
    onSuccess: () => { setSaved(true); done() },
  })
  const upload = useMutation({
    mutationFn: (file) => { const body = new FormData(); body.append('logo', file); return api.post('/company/logo', body) },
    onSuccess: done,
  })
  const remove = useMutation({ mutationFn: () => api.delete('/company/logo'), onSuccess: done })
  const logoError = upload.error?.response?.data?.errors?.logo?.[0] || upload.error?.response?.data?.message || remove.error?.response?.data?.message

  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-line bg-white p-5">
        <h2 className="mb-4 text-sm font-semibold">{t('settings.logo')}</h2>
        <div className="flex flex-wrap items-center gap-5">
          <div className="grid h-20 w-40 place-items-center overflow-hidden rounded-md border border-line bg-white">
            {company.logo_url ? <img src={company.logo_url} alt={company.name} className="max-h-full max-w-full object-contain" /> : <span className="text-xs text-muted">{t('settings.noLogo')}</span>}
          </div>
          <div className="space-y-2">
            <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" aria-label={t('settings.upload')}
              onChange={(e) => { const file = e.target.files?.[0]; if (file) upload.mutate(file); e.target.value = '' }} />
            <div className="flex gap-2">
              <Button size="sm" variant="outline" disabled={upload.isPending} onClick={() => fileRef.current?.click()}>{upload.isPending ? t('settings.uploading') : company.logo_url ? t('settings.replace') : t('settings.upload')}</Button>
              {company.logo_url && <Button size="sm" variant="outline" disabled={remove.isPending} onClick={() => remove.mutate()}>{t('settings.removeLogo')}</Button>}
            </div>
            <p className="text-xs text-muted">{t('settings.logoHint')}</p>
            {logoError && <p role="alert" className="text-xs text-[#A32B1E]">{logoError}</p>}
          </div>
        </div>
      </section>

      <form className="space-y-4 rounded-lg border border-line bg-white p-5" onSubmit={(e) => { e.preventDefault(); save.mutate() }}>
        <h2 className="text-sm font-semibold">{t('settings.profile')}</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <L label={t('settings.name')}><input required className={field} value={f.name} onChange={set('name')} /></L>
          <L label={t('settings.nameAr')}><input dir="rtl" className={field} value={f.name_ar} onChange={set('name_ar')} /></L>
          <L label={t('settings.timezone')}>
            {zones.length ? (
              <select className={field} value={f.timezone} onChange={set('timezone')}><option value="">—</option>{zones.map((z) => <option key={z} value={z}>{z}</option>)}</select>
            ) : <input className={field} value={f.timezone} onChange={set('timezone')} placeholder="Asia/Riyadh" />}
          </L>
          <L label={t('settings.language')}>
            <select className={field} value={f.default_language} onChange={set('default_language')}><option value="">—</option><option value="en">English</option>{arabicAllowed && <option value="ar">العربية</option>}</select>
          </L>
          <L label={t('settings.fiscalYearStart')}>
            <select className={field} value={f.fiscal_year_start} onChange={set('fiscal_year_start')}>
              {Array.from({ length: 12 }, (_, i) => <option key={i} value={`${String(i + 1).padStart(2, '0')}-01`}>{monthLong(i + 1)}</option>)}
            </select>
            <span className="mt-1 block text-xs text-muted">{t('settings.fiscalYearHint')}</span>
          </L>
          <L label={t('settings.teamReportVisibility')} className="md:col-span-2">
            <select className={field} value={f.team_report_visibility} onChange={set('team_report_visibility')}>
              <option value="colleagues">{t('settings.visibilityColleagues')}</option>
              <option value="own">{t('settings.visibilityOwn')}</option>
            </select>
            <span className="mt-1 block text-xs text-muted">{t('settings.visibilityHint')}</span>
          </L>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" size="sm" disabled={save.isPending}>{save.isPending ? t('settings.saving') : t('settings.save')}</Button>
          {saved && <span role="status" className="text-sm text-[#1F6B40]">{t('settings.saved')}</span>}
          {save.isError && <span role="alert" className="text-sm text-[#A32B1E]">{save.error?.response?.data?.message || t('settings.saveError')}</span>}
        </div>
      </form>
    </div>
  )
}

export default function SettingsPage() {
  const { t } = useTranslation()
  const me = useAuthStore((s) => s.user)
  const q = useQuery({ queryKey: ['company'], queryFn: async () => (await api.get('/company')).data.data })
  if (!isAdmin(me)) return <p className="text-muted">{t('settings.adminOnly')}</p>
  if (q.isLoading) return <p className="text-muted">{t('common.loading')}</p>
  if (q.isError) return <p className="text-sm">{t('settings.error')}</p>
  return (
    <div className="max-w-3xl space-y-6">
      <h1 className="text-2xl font-semibold">{t('nav.settings')}</h1>
      <PlanCard />
      <Form key={q.dataUpdatedAt} company={q.data} />
    </div>
  )
}
