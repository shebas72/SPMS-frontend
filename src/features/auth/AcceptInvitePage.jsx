import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import api from '@/lib/api'
import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/stores/authStore'

const field = 'h-10 w-full rounded-md border border-line bg-white px-3 text-sm'

// Public page opened from the invitation link: /accept-invite?token=...
export default function AcceptInvitePage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const token = useSearchParams()[0].get('token') ?? ''
  const setSession = useAuthStore((s) => s.setSession)
  const [f, setF] = useState({ name: '', password: '', password_confirmation: '' })
  const invite = useQuery({ queryKey: ['invite', token], queryFn: async () => (await api.get(`/auth/invitations/${encodeURIComponent(token)}`)).data.data, enabled: Boolean(token), retry: false })
  const accept = useMutation({
    mutationFn: async () => (await api.post('/auth/accept-invite', { token, ...f })).data,
    onSuccess: (data) => { setSession({ token: data.token, user: { ...data.user, company: data.company } }); navigate('/', { replace: true }) },
  })
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }))
  const problem = !token || invite.isError
  const serverError = accept.error?.response?.data?.errors?.password?.[0] || accept.error?.response?.data?.message

  return (
    <main className="grid min-h-screen place-items-center bg-white p-4">
      <div className="w-full max-w-sm space-y-5">
        {problem ? (
          <p role="alert" className="text-sm">{invite.error?.response?.data?.message || t('invite.invalid')}</p>
        ) : invite.isLoading ? <p className="text-muted">{t('common.loading')}</p> : (
          <>
            <div>
              <h1 className="text-2xl font-semibold">{t('invite.title', { company: invite.data.company })}</h1>
              <p className="mt-2 text-sm text-muted">{t('invite.intro', { email: invite.data.email, role: t(`team.roles.${invite.data.role}`) })}</p>
            </div>
            <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); accept.mutate() }}>
              <label className="block text-sm"><span className="mb-1 block text-muted">{t('invite.name')}</span><input required autoComplete="name" className={field} value={f.name} onChange={set('name')} /></label>
              <label className="block text-sm"><span className="mb-1 block text-muted">{t('invite.password')}</span><input required type="password" minLength={8} autoComplete="new-password" className={field} value={f.password} onChange={set('password')} /></label>
              <label className="block text-sm"><span className="mb-1 block text-muted">{t('invite.confirm')}</span><input required type="password" minLength={8} autoComplete="new-password" className={field} value={f.password_confirmation} onChange={set('password_confirmation')} /></label>
              <Button type="submit" className="w-full" disabled={accept.isPending}>{accept.isPending ? t('invite.creating') : t('invite.submit')}</Button>
              {accept.isError && <p role="alert" className="text-sm text-[#A32B1E]">{serverError || t('invite.error')}</p>}
            </form>
          </>
        )}
      </div>
    </main>
  )
}
