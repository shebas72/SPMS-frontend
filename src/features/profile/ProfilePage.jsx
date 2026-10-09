import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import api from '@/lib/api'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/stores/authStore'

const field = 'h-10 w-full rounded-md border border-line bg-white px-3 text-sm'
const L = ({ label, children }) => <label className="block text-sm"><span className="mb-1 block text-muted">{label}</span>{children}</label>
const firstError = (e, keys) => keys.map((k) => e?.response?.data?.errors?.[k]?.[0]).find(Boolean) || e?.response?.data?.message

function Details({ user }) {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const [f, setF] = useState({ name: user.name ?? '', email: user.email ?? '', current_password: '' })
  const [saved, setSaved] = useState(false)
  const set = (k) => (e) => { setSaved(false); setF((x) => ({ ...x, [k]: e.target.value })) }
  const emailChanged = f.email.trim().toLowerCase() !== (user.email ?? '').toLowerCase()
  const save = useMutation({
    mutationFn: () => api.put('/auth/profile', { ...f, current_password: f.current_password || null }),
    onSuccess: () => { setSaved(true); setF((x) => ({ ...x, current_password: '' })); qc.invalidateQueries({ queryKey: ['me'] }) },
  })
  return (
    <form className="space-y-4 rounded-lg border border-line bg-white p-5" onSubmit={(e) => { e.preventDefault(); save.mutate() }}>
      <h2 className="text-sm font-semibold">{t('profile.details')}</h2>
      <div className="grid gap-4 md:grid-cols-2">
        <L label={t('profile.name')}><input required className={field} value={f.name} onChange={set('name')} /></L>
        <L label={t('profile.email')}><input required type="email" className={field} value={f.email} onChange={set('email')} /></L>
        {emailChanged && <L label={t('profile.currentForEmail')}><input required type="password" autoComplete="current-password" className={field} value={f.current_password} onChange={set('current_password')} /></L>}
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" size="sm" disabled={save.isPending}>{save.isPending ? t('profile.saving') : t('profile.save')}</Button>
        {saved && <span role="status" className="text-sm text-[#1F6B40]">{t('profile.saved')}</span>}
        {save.isError && <span role="alert" className="text-sm text-[#A32B1E]">{firstError(save.error, ['current_password', 'email']) || t('profile.error')}</span>}
      </div>
    </form>
  )
}

function Password() {
  const { t } = useTranslation()
  const empty = { current_password: '', password: '', password_confirmation: '' }
  const [f, setF] = useState(empty)
  const [saved, setSaved] = useState(false)
  const set = (k) => (e) => { setSaved(false); setF((x) => ({ ...x, [k]: e.target.value })) }
  const save = useMutation({ mutationFn: () => api.post('/auth/change-password', f), onSuccess: () => { setSaved(true); setF(empty) } })
  return (
    <form className="space-y-4 rounded-lg border border-line bg-white p-5" onSubmit={(e) => { e.preventDefault(); save.mutate() }}>
      <h2 className="text-sm font-semibold">{t('profile.passwordTitle')}</h2>
      <div className="grid gap-4 md:grid-cols-3">
        <L label={t('profile.current')}><input required type="password" autoComplete="current-password" className={field} value={f.current_password} onChange={set('current_password')} /></L>
        <L label={t('profile.new')}><input required type="password" minLength={8} autoComplete="new-password" className={field} value={f.password} onChange={set('password')} /></L>
        <L label={t('profile.confirm')}><input required type="password" minLength={8} autoComplete="new-password" className={field} value={f.password_confirmation} onChange={set('password_confirmation')} /></L>
      </div>
      <p className="text-xs text-muted">{t('profile.passwordHint')}</p>
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" size="sm" disabled={save.isPending}>{save.isPending ? t('profile.saving') : t('profile.change')}</Button>
        {saved && <span role="status" className="text-sm text-[#1F6B40]">{t('profile.passwordChanged')}</span>}
        {save.isError && <span role="alert" className="text-sm text-[#A32B1E]">{firstError(save.error, ['current_password', 'password']) || t('profile.error')}</span>}
      </div>
    </form>
  )
}

export default function ProfilePage() {
  const { t } = useTranslation()
  const user = useAuthStore((s) => s.user)
  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">{t('profile.title')}</h1>
        <p className="mt-1 text-sm text-muted">{(user?.roles ?? []).map((r) => t(`team.roles.${typeof r === 'string' ? r : r.name}`, { defaultValue: typeof r === 'string' ? r : r.name })).join(', ')}</p>
      </div>
      <Details key={`${user?.email}-${user?.name}`} user={user ?? {}} />
      <Password />
    </div>
  )
}
