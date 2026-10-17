import { Link, Navigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import api from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import LanguageSwitcher from '@/components/LanguageSwitcher'

function Field({ id, label, error, children }) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="text-sm font-medium">{label}</label>
      {children}
      {error && <p className="text-sm text-status-behind">{error}</p>}
    </div>
  )
}

// Public sign-up for a new organization (SaaS only). After submitting, the person verifies their email,
// then the platform owner approves the organization before anyone can sign in.
export default function RegisterPage() {
  const { t } = useTranslation()
  const token = useAuthStore((s) => s.token)
  const { register, handleSubmit, getValues, setError, formState: { errors } } = useForm({
    defaultValues: { company_name: '', name: '', email: '', password: '', password_confirmation: '' },
  })

  const config = useQuery({
    queryKey: ['auth-config'],
    queryFn: async () => (await api.get('/auth/languages')).data.data,
    staleTime: Infinity,
    retry: false,
  })

  const mutation = useMutation({
    mutationFn: async (values) => (await api.post('/auth/register', values)).data,
    onError: (err) => {
      const fieldErrors = err.response?.data?.errors
      if (fieldErrors) {
        Object.entries(fieldErrors).forEach(([name, messages]) => setError(name, { type: 'server', message: messages[0] }))
      }
    },
  })

  if (token) return <Navigate to="/" replace />
  // Standalone installs have no sign-up.
  if (config.data && config.data.registration === false) return <Navigate to="/login" replace />

  const hasFieldErrors = Boolean(mutation.error?.response?.data?.errors)
  const generalError = mutation.isError && !hasFieldErrors ? t('register.error') : null

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
          {mutation.isSuccess ? (
            <div className="space-y-3">
              <h2 className="text-2xl font-semibold">{t('register.doneTitle')}</h2>
              <p className="text-sm text-muted">{t('register.doneBody', { email: mutation.data?.data?.email ?? getValues('email') })}</p>
              <Link to="/login" className="inline-block text-sm font-medium text-brand hover:underline">{t('register.backToSignIn')}</Link>
            </div>
          ) : (
            <>
              <h2 className="text-2xl font-semibold">{t('register.title')}</h2>
              <p className="mt-2 text-sm text-muted">{t('register.subtitle')}</p>
              <form
                onSubmit={handleSubmit((values) => mutation.mutate(values))}
                noValidate
                className="mt-6 space-y-4"
              >
                <Field id="company_name" label={t('register.companyName')} error={errors.company_name && (errors.company_name.message || t('register.required'))}>
                  <Input id="company_name" autoComplete="organization" aria-invalid={!!errors.company_name}
                    {...register('company_name', { required: true })} />
                </Field>
                <Field id="name" label={t('register.name')} error={errors.name && (errors.name.message || t('register.required'))}>
                  <Input id="name" autoComplete="name" aria-invalid={!!errors.name}
                    {...register('name', { required: true })} />
                </Field>
                <Field id="email" label={t('auth.email')} error={errors.email && (errors.email.message || t('auth.emailRequired'))}>
                  <Input id="email" type="email" autoComplete="email" aria-invalid={!!errors.email}
                    {...register('email', { required: true })} />
                </Field>
                <Field id="password" label={t('register.password')} error={errors.password && (errors.password.message || t('register.passwordShort'))}>
                  <Input id="password" type="password" autoComplete="new-password" aria-invalid={!!errors.password}
                    {...register('password', { required: true, minLength: 8 })} />
                </Field>
                <Field id="password_confirmation" label={t('register.confirm')} error={errors.password_confirmation && (errors.password_confirmation.message || t('register.mismatch'))}>
                  <Input id="password_confirmation" type="password" autoComplete="new-password" aria-invalid={!!errors.password_confirmation}
                    {...register('password_confirmation', {
                      required: true,
                      validate: (value) => value === getValues('password') || t('register.mismatch'),
                    })} />
                </Field>
                {generalError && <p role="alert" className="text-sm text-status-behind">{generalError}</p>}
                <Button type="submit" className="w-full" disabled={mutation.isPending}>
                  {mutation.isPending ? t('register.submitting') : t('register.submit')}
                </Button>
              </form>
              <p className="mt-6 text-sm text-muted">
                {t('register.haveAccount')}{' '}
                <Link to="/login" className="font-medium text-brand hover:underline">{t('auth.signIn')}</Link>
              </p>
            </>
          )}
        </div>
      </section>
    </div>
  )
}