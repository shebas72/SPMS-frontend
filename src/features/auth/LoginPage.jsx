import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { useMutation } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { login } from './authApi'
import { useAuthStore } from '@/stores/authStore'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import LanguageSwitcher from '@/components/LanguageSwitcher'

export default function LoginPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const { token, setSession } = useAuthStore()
  const { register, handleSubmit, formState: { errors } } = useForm({ defaultValues: { email: '', password: '' } })

  const mutation = useMutation({
    mutationFn: login,
    onSuccess: ({ token, user }) => {
      setSession({ token, user })
      navigate(location.state?.from?.pathname || '/', { replace: true })
    },
  })

  if (token) return <Navigate to="/" replace />

  const status = mutation.error?.response?.status
  const serverMessage =
    status === 401 || status === 422 ? t('auth.invalid') : mutation.error ? t('auth.networkError') : null

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
        </div>
      </section>
    </div>
  )
}
