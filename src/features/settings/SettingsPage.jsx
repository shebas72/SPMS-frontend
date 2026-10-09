import { useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import api from '@/lib/api'
import { cn } from '@/lib/utils'
import { isAdmin } from '@/lib/admin'
import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/stores/authStore'

const field = 'h-9 w-full rounded-md border border-line bg-white px-2 text-sm'
const L = ({ label, children, className }) => (
  <label className={cn('block text-sm', className)}><span className="mb-1 block text-muted">{label}</span>{children}</label>
)
const zones = typeof Intl.supportedValuesOf === 'function' ? Intl.supportedValuesOf('timeZone') : []

function Form({ company }) {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const fileRef = useRef(null)
  const [f, setF] = useState({ name: company.name ?? '', name_ar: company.name_ar ?? '', timezone: company.timezone ?? '', default_language: company.default_language ?? '' })
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
            <select className={field} value={f.default_language} onChange={set('default_language')}><option value="">—</option><option value="en">English</option><option value="ar">العربية</option></select>
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
      <Form key={q.dataUpdatedAt} company={q.data} />
    </div>
  )
}
