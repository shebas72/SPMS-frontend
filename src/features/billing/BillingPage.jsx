import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import api from '@/lib/api'
import { Button } from '@/components/ui/button'

const Row = ({ label, children }) => (
  <div className="flex items-center justify-between gap-4 py-1.5 text-sm">
    <span className="text-muted">{label}</span>
    <span className="font-medium">{children}</span>
  </div>
)

export default function BillingPage() {
  const { t, i18n } = useTranslation()
  const qc = useQueryClient()
  const [params, setParams] = useSearchParams()
  const [cycle, setCycle] = useState('monthly')
  const [notice, setNotice] = useState(null) // { ok, text }
  const [requestFor, setRequestFor] = useState(null)
  const [note, setNote] = useState('')

  const { data, isLoading } = useQuery({ queryKey: ['billing'], queryFn: async () => (await api.get('/billing')).data.data })
  const refresh = () => { qc.invalidateQueries({ queryKey: ['billing'] }); qc.invalidateQueries({ queryKey: ['plan'] }) }
  const fail = (e) => setNotice({ ok: false, text: e?.response?.data?.message || t('billing.error', 'Something went wrong. Please try again.') })

  const confirmPaypal = useMutation({
    mutationFn: async (subscription_id) => (await api.post('/billing/paypal/confirm', { subscription_id })).data.data,
    onSuccess: (r) => {
      setNotice({ ok: true, text: r.status === 'active' ? t('billing.paypalDone', 'Your PayPal subscription is active.') : t('billing.paypalPending', 'PayPal is still confirming your subscription. This page will update shortly.') })
      refresh()
      if (r.status !== 'active') setTimeout(refresh, 5000)
    },
    onError: fail,
  })

  // Coming back from Stripe or PayPal.
  useEffect(() => {
    const checkout = params.get('checkout')
    const paypal = params.get('paypal')
    const subId = params.get('subscription_id')
    if (checkout === 'success') {
      setNotice({ ok: true, text: t('billing.processing', 'Payment received. Your plan updates in a few seconds.') })
      ;[1500, 4000, 8000].forEach((ms) => setTimeout(refresh, ms))
    }
    if (checkout === 'cancel' || paypal === 'cancel') setNotice({ ok: false, text: t('billing.cancelled', 'Payment was cancelled. Nothing was charged.') })
    if (paypal === 'return' && subId) confirmPaypal.mutate(subId)
    if (checkout || paypal) setParams({}, { replace: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const pay = useMutation({
    mutationFn: async (v) => (await api.post('/billing/checkout', v)).data.data,
    onSuccess: ({ url }) => window.location.assign(url),
    onError: fail,
  })
  const switchFree = useMutation({
    mutationFn: async (plan_id) => (await api.post('/billing/switch-free', { plan_id })).data,
    onSuccess: () => { setNotice({ ok: true, text: t('billing.switched', 'Your plan was changed.') }); refresh() },
    onError: fail,
  })
  const request = useMutation({
    mutationFn: async (v) => (await api.post('/billing/request', v)).data,
    onSuccess: () => { setRequestFor(null); setNote(''); setNotice({ ok: true, text: t('billing.requested', 'Request sent. The platform admin will change your plan and contact you.') }); refresh() },
    onError: fail,
  })
  const cancel = useMutation({
    mutationFn: async () => (await api.post('/billing/cancel')).data,
    onSuccess: (r) => { setNotice({ ok: true, text: r.message }); refresh() },
    onError: fail,
  })

  if (isLoading) return <p className="text-muted">{t('common.loading', 'Loading…')}</p>
  if (!data) return null

  const money = new Intl.NumberFormat(i18n.language || 'en', { style: 'currency', currency: data.currency })
  const date = (v) => (v ? new Date(v).toLocaleDateString(i18n.language || 'en') : '—')
  const lim = (n) => (n < 0 ? t('billing.unlimited', 'Unlimited') : n)
  const yes = (v) => (v ? '✓' : '✕')
  const sub = data.subscription
  const busy = pay.isPending || switchFree.isPending || request.isPending

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <h1 className="text-2xl font-semibold">{t('billing.title', 'Plan and billing')}</h1>

      {notice && (
        <p role="status" className={`rounded-md border px-3 py-2 text-sm ${notice.ok ? 'border-line bg-brand-soft' : 'border-line text-status-behind'}`}>{notice.text}</p>
      )}

      <section className="rounded-lg border border-line bg-white p-5">
        <h2 className="mb-2 font-semibold">{t('billing.current', 'Current plan')}</h2>
        {sub ? (
          <>
            <Row label={t('billing.plan', 'Plan')}>{sub.plan}</Row>
            <Row label={t('billing.status', 'Status')}>{sub.status}</Row>
            {sub.trial_ends_at && <Row label={t('billing.trialEnds', 'Trial ends')}>{date(sub.trial_ends_at)}</Row>}
            {sub.current_period_ends_at && (
              <Row label={sub.cancel_at_period_end ? t('billing.endsOn', 'Ends on') : t('billing.renewsOn', 'Renews on')}>{date(sub.current_period_ends_at)}</Row>
            )}
            {['stripe', 'paypal'].includes(sub.provider) && (
              <div className="mt-3">
                {sub.cancel_at_period_end ? (
                  <p className="text-sm text-muted">{t('billing.renewalCancelled', 'Automatic renewal is cancelled.')}</p>
                ) : (
                  <Button variant="outline" size="sm" disabled={cancel.isPending}
                    onClick={() => window.confirm(t('billing.cancelConfirm', 'Stop automatic renewal? Your plan stays active until the end of the paid period.')) && cancel.mutate()}>
                    {t('billing.cancelRenewal', 'Cancel automatic renewal')}
                  </Button>
                )}
              </div>
            )}
          </>
        ) : <p className="text-sm text-muted">{t('billing.noPlan', 'No plan yet.')}</p>}
        {data.pending_request && (
          <p className="mt-3 text-sm text-muted">{t('billing.pending', 'Your upgrade request is waiting for the platform admin.')}</p>
        )}
      </section>

      <div className="flex items-center gap-2" role="group" aria-label={t('billing.cycle', 'Billing cycle')}>
        {['monthly', 'yearly'].map((c) => (
          <Button key={c} size="sm" variant={cycle === c ? 'primary' : 'outline'} onClick={() => setCycle(c)}>
            {c === 'monthly' ? t('billing.monthly', 'Monthly') : t('billing.yearly', 'Yearly')}
          </Button>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {data.plans.map((p) => {
          const price = cycle === 'yearly' ? p.price_yearly : p.price_monthly
          const free = price <= 0
          return (
            <article key={p.id} className={`flex flex-col rounded-lg border bg-white p-5 ${p.is_current ? 'border-brand' : 'border-line'}`}>
              <h3 className="text-lg font-semibold">{(i18n.language || '').startsWith('ar') && p.name_ar ? p.name_ar : p.name}</h3>
              <p className="mt-1 text-2xl font-semibold">
                {free ? t('billing.free', 'Free') : money.format(price)}
                {!free && <span className="ms-1 text-sm font-normal text-muted">/ {cycle === 'yearly' ? t('billing.perYear', 'year') : t('billing.perMonth', 'month')}</span>}
              </p>
              <div className="mt-3 flex-1 divide-y divide-line border-t border-line">
                <Row label={t('billing.kpis', 'KPIs')}>{lim(p.kpi_limit)}</Row>
                <Row label={t('billing.users', 'Users')}>{lim(p.user_limit)}</Row>
                <Row label={t('billing.departments', 'Departments')}>{lim(p.department_limit)}</Row>
                <Row label={t('billing.pdf', 'PDF export')}>{yes(p.has_pdf_export)}</Row>
                <Row label={t('billing.arabic', 'Arabic')}>{yes(p.has_arabic)}</Row>
                <Row label={t('billing.projects', 'Projects')}>{yes(p.has_projects)}</Row>
                <Row label={t('billing.roles', 'Custom roles')}>{yes(p.custom_roles)}</Row>
              </div>

              <div className="mt-4 space-y-2">
                {p.is_current ? (
                  <p className="text-center text-sm font-medium text-brand">{t('billing.currentBadge', 'Current plan')}</p>
                ) : free ? (
                  <Button className="w-full" variant="outline" disabled={busy}
                    onClick={() => window.confirm(t('billing.switchConfirm', 'Switch to this plan?')) && switchFree.mutate(p.id)}>
                    {t('billing.switch', 'Switch to this plan')}
                  </Button>
                ) : (
                  <>
                    {data.providers.includes('stripe') && (
                      <Button className="w-full" disabled={busy} onClick={() => pay.mutate({ plan_id: p.id, billing_cycle: cycle, provider: 'stripe' })}>
                        {t('billing.payCard', 'Pay with card')}
                      </Button>
                    )}
                    {data.providers.includes('paypal') && (
                      <Button className="w-full" variant="outline" disabled={busy} onClick={() => pay.mutate({ plan_id: p.id, billing_cycle: cycle, provider: 'paypal' })}>
                        {t('billing.payPaypal', 'Pay with PayPal')}
                      </Button>
                    )}
                    {data.providers.includes('manual') && (
                      <div>
                        <Button className="w-full" variant="ghost" disabled={busy} onClick={() => setRequestFor(requestFor === p.id ? null : p.id)}>
                          {t('billing.askAdmin', 'Request upgrade from admin')}
                        </Button>
                        {requestFor === p.id && (
                          <div className="mt-2 space-y-2">
                            <textarea className="min-h-20 w-full rounded-md border border-line bg-white p-2 text-sm" maxLength={1000}
                              placeholder={t('billing.notePlaceholder', 'Optional note (for example: bank transfer, invoice details)')}
                              value={note} onChange={(e) => setNote(e.target.value)} />
                            <Button className="w-full" disabled={request.isPending}
                              onClick={() => request.mutate({ plan_id: p.id, billing_cycle: cycle, note })}>
                              {t('billing.sendRequest', 'Send request')}
                            </Button>
                          </div>
                        )}
                      </div>
                    )}
                {data.providers.length === 0 && (
                  <p className="text-center text-sm text-muted">{t('billing.unavailable', 'Upgrades are not available right now. Please contact support.')}</p>
                )}
                  </>
                )}

              </div>
            </article>
          )
        })}
      </div>
    </div>
  )
}