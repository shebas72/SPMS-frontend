import { Link, Navigate, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { login } from './authApi'
import api from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import LanguageSwitcher from '@/components/LanguageSwitcher'

export default function LoginPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const verified = useSearchParams()[0].get('verified') // ok | expired | invalid, from the verification email link
  const { token, setSession } = useAuthStore()
  const { register, handleSubmit, getValues, formState: { errors } } = useForm({ defaultValues: { email: '', password: '' } })

  const config = useQuery({
    queryKey: ['auth-config'],
    queryFn: async () => (await api.get('/auth/languages')).data.data,
    staleTime: Infinity,
    retry: false,
  })

  const mutation = useMutation({
    mutationFn: login,
    onSuccess: ({ token, user }) => {
      setSession({ token, user })
      navigate(location.state?.from?.pathname || '/', { replace: true })
    },
  })

  const resend = useMutation({
    mutationFn: async () => (await api.post('/auth/resend-verification', { email: getValues('email') })).data,
  })

  if (token) return <Navigate to="/" replace />

  const status = mutation.error?.response?.status
  const blocked = status === 403 && mutation.error?.response?.data?.code === 'login_blocked'
  const serverMessage = blocked
    ? mutation.error.response.data.message
    : status === 401 || status === 422 ? t('auth.invalid') : mutation.error ? t('auth.networkError') : null

  const showResend = blocked || verified === 'expired'

  return (
    <div className="grid min-h-screen lg:grid-cols-[1fr_28rem]">
      <section className="hidden bg-brand p-12 text-white lg:flex lg:flex-col lg:justify-end">
        <h1 className="max-w-md text-4xl font-semibold leading-tight">{t('app.name')}</h1>
        <p className="mt-4 max-w-md text-lg text-white/80">{t('auth.loginSubtitle')}</p>
      </section>

      <section className="flex flex-col justify-center px-6 py-10 sm:px-12">
        <div className="mb-8 flex justify-end">
          <LanguageSwitcher />
        </div>
        <div className="mx-auto w-full max-w-sm">
          <h2 className="text-2xl font-semibold">{t('auth.loginTitle')}</h2>

          {verified && (
            <p
              role="status"
              className={`mt-4 rounded-md border px-3 py-2 text-sm ${verified === 'ok' ? 'border-line bg-brand-soft' : 'border-line text-status-behind'}`}
            >
              {t(`auth.verified.${['ok', 'expired'].includes(verified) ? verified : 'invalid'}`)}
            </p>
          )}

          <form onSubmit={handleSubmit((values) => mutation.mutate(values))} noValidate className="mt-8 space-y-5">
            <div className="space-y-1.5">
              <label htmlFor="email" className="text-sm font-medium">{t('auth.email')}</label>
              <Input
                id="email"
                type="email"
                autoComplete="username"
                aria-invalid={!!errors.email}
                {...register('email', { required: true })}
              />
              {errors.email && <p className="text-sm text-status-behind">{t('auth.emailRequired')}</p>}
            </div>
            <div className="space-y-1.5">
              <label htmlFor="password" className="text-sm font-medium">{t('auth.password')}</label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                aria-invalid={!!errors.password}
                {...register('password', { required: true })}
              />
              {errors.password && <p className="text-sm text-status-behind">{t('auth.passwordRequired')}</p>}
            </div>
            {serverMessage && (
              <p role="alert" className="text-sm text-status-behind">{serverMessage}</p>
            )}
            <Button type="submit" className="w-full" disabled={mutation.isPending}>
              {mutation.isPending ? t('auth.signingIn') : t('auth.signIn')}
            </Button>
          </form>

          {showResend && (
            <div className="mt-4 text-sm">
              <button
                type="button"
                className="font-medium text-brand hover:underline disabled:opacity-60"
                disabled={resend.isPending || !getValues('email')}
                onClick={() => resend.mutate()}
              >
                {t('auth.resend')}
              </button>
              {!getValues('email') && <span className="ms-2 text-muted">{t('auth.resendNeedsEmail')}</span>}
              {resend.isSuccess && <p role="status" className="mt-2 text-muted">{t('auth.resendSent')}</p>}
            </div>
          )}

          {config.data?.registration === true && (
            <p className="mt-8 text-sm text-muted">
              {t('auth.noAccount')}{' '}
              <Link to="/register" className="font-medium text-brand hover:underline">{t('auth.createAccount')}</Link>
            </p>
          )}
        </div>
      </section>
    </div>
  )
}