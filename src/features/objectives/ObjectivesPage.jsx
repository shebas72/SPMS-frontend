import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import api from '@/lib/api'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { useDashboard } from '@/features/dashboard/useDashboard'
import { PeriodPicker } from '@/features/dashboard/DashboardPage'
import { Counts, ScoreBar, StatusBadge, keyOf, statusOf, useFormat } from '@/features/dashboard/ui'

// GET /dashboard/objectives supports ?perspective_id=, so filtering happens on the server.
function useObjectives({ year, month }, perspectiveId) {
  return useQuery({
    queryKey: ['objectives-page', year ?? null, month ?? null, perspectiveId],
    queryFn: async () => {
      const params = { year, month, perspective_id: perspectiveId || undefined }
      return (await api.get('/dashboard/objectives', { params })).data.data
    },
    placeholderData: (prev) => prev,
  })
}

function Block({ label, block }) {
  const { n } = useFormat()
  return (
    <div>
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="mt-1">
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-2xl font-semibold tabular-nums" style={{ color: statusOf(keyOf(block.score, block.status)).text }}>{n(block.score)}</span>
          <StatusBadge status={block.status} score={block.score} />
        </div>
        <ScoreBar className="mt-2" score={block.score} status={block.status} />
      </dd>
    </div>
  )
}

function ObjectiveCard({ o, monthLabel }) {
  const { t } = useTranslation()
  const { n, pick } = useFormat()
  const cur = o.current ?? {}
  const ytd = o.ytd ?? {}
  const p = o.perspective
  return (
    <article className="rounded-lg border border-line bg-white p-5" style={{ borderTop: `3px solid ${p?.color ?? '#8A8F98'}` }}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs text-muted">{o.code}</p>
          <h2 className="mt-1 text-sm font-semibold">{pick(o)}</h2>
        </div>
        <span className="shrink-0 text-xs text-muted">{t('dashboard.weight', { value: n(Number(o.weight)) })}</span>
      </div>
      {p && (
        <p className="mt-2 inline-flex items-center gap-1.5 text-xs text-muted">
          <span className="h-2 w-2 rounded-full" style={{ background: p.color }} aria-hidden="true" />
          {pick(p)}
        </p>
      )}
      <dl className="mt-4 grid grid-cols-2 gap-4">
        <Block label={monthLabel} block={cur} />
        <Block label={t('dashboard.ytd')} block={ytd} />
      </dl>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3">
        <Counts data={cur} />
        <span className="text-xs text-muted">{t('strategyMap.kpiCount', { count: cur.kpi_count ?? 0 })}</span>
      </div>
    </article>
  )
}

export default function ObjectivesPage() {
  const { t } = useTranslation()
  const { pick, monthLong } = useFormat()
  const [period, setPeriod] = useState({})
  const [perspectiveId, setPerspectiveId] = useState('')
  const [sort, setSort] = useState('order')
  const dash = useDashboard(period)
  const objectives = useObjectives(period, perspectiveId)

  if (dash.isLoading || objectives.isLoading) return <p className="text-muted">{t('common.loading')}</p>
  if (dash.isError || objectives.isError || !dash.data) {
    return (
      <div className="max-w-md rounded-lg border border-line bg-white p-5">
        <p className="text-sm">{t('objectives.error')}</p>
        <Button className="mt-4" variant="outline" size="sm" onClick={() => { dash.refetch(); objectives.refetch() }}>{t('dashboard.retry')}</Button>
      </div>
    )
  }

  const rows = [...(objectives.data ?? [])]
  if (sort === 'worst') rows.sort((a, b) => (a.current?.score ?? Infinity) - (b.current?.score ?? Infinity))
  const monthLabel = monthLong(dash.data.period.month)
  const chips = [{ id: '', label: t('objectives.all') }, ...dash.data.perspectives.map((p) => ({ id: String(p.id), label: pick(p), color: p.color }))]

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">{t('nav.objectives')}</h1>
        <PeriodPicker period={dash.data.period} onChange={setPeriod} />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2" role="group" aria-label={t('objectives.filter')}>
          {chips.map((c) => (
            <button
              key={c.id}
              type="button"
              aria-pressed={perspectiveId === c.id}
              onClick={() => setPerspectiveId(c.id)}
              className={cn(
                'inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-sm',
                perspectiveId === c.id ? 'border-ink bg-ink text-white' : 'border-line bg-white text-ink hover:bg-brand-soft',
              )}
            >
              {c.color && <span className="h-2 w-2 rounded-full" style={{ background: c.color }} aria-hidden="true" />}
              {c.label}
            </button>
          ))}
        </div>
        <label className="inline-flex items-center gap-2 text-sm text-muted">
          {t('objectives.sort')}
          <select value={sort} onChange={(e) => setSort(e.target.value)} className="h-9 rounded-md border border-line bg-white px-2 text-sm text-ink">
            <option value="order">{t('objectives.sortOrder')}</option>
            <option value="worst">{t('objectives.sortWorst')}</option>
          </select>
        </label>
      </div>

      {rows.length === 0 ? (
        <p className="rounded-lg border border-dashed border-line p-6 text-sm text-muted">{t('objectives.empty')}</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
          {rows.map((o) => <ObjectiveCard key={o.id} o={o} monthLabel={monthLabel} />)}
        </div>
      )}
    </div>
  )
}
