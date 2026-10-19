import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { AlertTriangle, Info, X, XCircle } from 'lucide-react'
import api from '@/lib/api'
import { cn } from '@/lib/utils'

const STYLES = {
  danger: { Icon: XCircle, cls: 'border-red-200 bg-red-50 text-red-900' },
  warning: { Icon: AlertTriangle, cls: 'border-amber-200 bg-amber-50 text-amber-900' },
  info: { Icon: Info, cls: 'border-sky-200 bg-sky-50 text-sky-900' },
}

// A banner can be hidden for this browser session; it comes back on the next visit while the problem remains.
const hidden = () => { try { return JSON.parse(sessionStorage.getItem('hidden-banners') || '[]') } catch { return [] } }

export default function Banners() {
  const { t, i18n } = useTranslation()
  const [gone, setGone] = useState(hidden)

  // Only the SaaS build has this endpoint; any error simply means "no banners".
  const { data } = useQuery({
    queryKey: ['banners'],
    queryFn: async () => (await api.get('/banners', { silent: true })).data.data,
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: true,
    retry: false,
  })

  const text = (b) => {
    const p = b.params ?? {}
    switch (b.code) {
      case 'trial': return p.days <= 0 ? t('banners.trialToday', 'Your trial ends today.') : t('banners.trial', 'Your trial ends in {{days}} day(s).', { days: p.days })
      case 'past_due': return t('banners.pastDue', 'Your last payment failed. Update your payment method to keep your plan.')
      case 'ending': return t('banners.ending', 'Your plan ends on {{date}} because automatic renewal is cancelled.', { date: new Date(p.date).toLocaleDateString(i18n.language || 'en') })
      case 'limit': {
        const label = { kpis: t('billing.kpis', 'KPIs'), users: t('billing.users', 'Users'), departments: t('billing.departments', 'Departments') }[p.resource] ?? p.resource
        return t('banners.limit', 'You have used {{used}} of {{limit}} {{resource}} in your plan.', { used: p.used, limit: p.limit, resource: label.toLowerCase() })
      }
      default: return ''
    }
  }

  const list = (Array.isArray(data) ? data : []).filter((b) => !gone.includes(b.id))
  if (list.length === 0) return null

  const hide = (id) => {
    const next = [...gone, id]
    setGone(next)
    try { sessionStorage.setItem('hidden-banners', JSON.stringify(next)) } catch { /* ignore */ }
  }

  return (
    <div className="space-y-px">
      {list.map((b) => {
        const { Icon, cls } = STYLES[b.level] ?? STYLES.info
        return (
          <div key={b.id} role="status" className={cn('flex items-center gap-3 border-b px-4 py-2 text-sm lg:px-8', cls)}>
            <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span className="min-w-0 flex-1">{text(b)}</span>
            {b.cta_url && (
              <Link to={b.cta_url} className="shrink-0 font-semibold underline">
                {b.code === 'past_due' ? t('banners.fix', 'Fix now') : t('banners.upgrade', 'View plans')}
              </Link>
            )}
            <button type="button" onClick={() => hide(b.id)} className="shrink-0 rounded p-0.5 opacity-70 hover:opacity-100" aria-label={t('banners.dismiss', 'Dismiss')}>
              <X className="h-4 w-4" />
            </button>
          </div>
        )
      })}
    </div>
  )
}