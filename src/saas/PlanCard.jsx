import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import api from '@/lib/api'
import { cn } from '@/lib/utils'

// SaaS only. Loaded by features/settings/SettingsPage.jsx through import.meta.glob, so a standalone build
// just deletes the src/saas folder and the settings page renders without this card.

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

export default function PlanCard() {
  const { t, i18n } = useTranslation()
  // Only SaaS has this endpoint. If it is missing or refuses, show nothing.
  const q = useQuery({ queryKey: ['company-plan'], queryFn: async () => (await api.get('/company/plan')).data.data, retry: false })
  if (q.isLoading || q.isError || !q.data || q.data.mode === 'standalone') return null
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
