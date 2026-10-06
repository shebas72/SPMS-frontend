import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { useDashboard } from '@/features/dashboard/useDashboard'
import { PeriodPicker } from '@/features/dashboard/DashboardPage'
import { ScoreBar, StatusBadge, keyOf, statusOf, useFormat } from '@/features/dashboard/ui'
import { useStrategyMap } from './useStrategyMap'

function ObjectiveCard({ o, kpiCount, selected, onSelect }) {
  const { t } = useTranslation()
  const { n, pick } = useFormat()
  const cur = o.current ?? {}
  return (
    <div className={cn('relative rounded-lg border bg-white p-4 hover:bg-brand-soft', selected ? 'border-ink' : 'border-line')}>
      <p className="text-xs text-muted">{o.code}</p>
      <button type="button" onClick={onSelect} aria-expanded={selected} className="mt-1 text-start text-sm font-medium after:absolute after:inset-0">
        {pick(o)}
      </button>
      <div className="mt-3 flex items-baseline justify-between gap-2">
        <span className="text-xl font-semibold tabular-nums" style={{ color: statusOf(keyOf(cur.score, cur.status)).text }}>{n(cur.score)}</span>
        <StatusBadge status={cur.status} score={cur.score} />
      </div>
      <ScoreBar className="mt-2" score={cur.score} status={cur.status} />
      <p className="mt-2 text-xs text-muted">{t('strategyMap.kpiCount', { count: kpiCount })}</p>
    </div>
  )
}

function KpiPanel({ objective, kpis }) {
  const { t } = useTranslation()
  const { n, pick } = useFormat()
  return (
    <div className="rounded-lg border border-ink bg-white p-4">
      <h3 className="mb-3 text-sm font-semibold">{t('strategyMap.kpisFor', { objective: pick(objective) })}</h3>
      {kpis.length === 0 ? (
        <p className="text-sm text-muted">{t('strategyMap.noKpis')}</p>
      ) : (
        <ul className="divide-y divide-line">
          {kpis.map((k) => (
            <li key={k.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1 py-2.5 first:pt-0 last:pb-0">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{pick(k)}</p>
                <p className="text-xs text-muted">{k.code}</p>
              </div>
              <div className="flex items-center gap-3">
                <StatusBadge status={k.status} score={k.score} />
                <span className="w-12 text-end text-sm font-semibold tabular-nums">{n(k.score)}</span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function Lane({ p, objectives, kpisByObjective, selectedId, onSelect }) {
  const { t } = useTranslation()
  const { n, pick } = useFormat()
  const selected = objectives.find((o) => o.id === selectedId)
  return (
    <section className="grid gap-4 md:grid-cols-[13rem_minmax(0,1fr)]" aria-label={pick(p)}>
      <div className="rounded-lg border border-line bg-white p-4 md:self-start" style={{ borderInlineStart: `4px solid ${p.color}` }}>
        <h2 className="text-sm font-semibold">{pick(p)}</h2>
        <p className="mt-0.5 text-xs text-muted">{t('dashboard.weight', { value: n(Number(p.weight)) })}</p>
        <p className="mt-3 text-2xl font-semibold tabular-nums" style={{ color: statusOf(keyOf(p.current.score, p.current.status)).text }}>{n(p.current.score)}</p>
        <StatusBadge status={p.current.status} score={p.current.score} />
      </div>
      <div className="space-y-3">
        {objectives.length === 0 ? (
          <p className="rounded-lg border border-dashed border-line p-4 text-sm text-muted">{t('strategyMap.noObjectives')}</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {objectives.map((o) => (
              <ObjectiveCard key={o.id} o={o} kpiCount={(kpisByObjective[o.id] ?? []).length} selected={o.id === selectedId} onSelect={() => onSelect(o.id)} />
            ))}
          </div>
        )}
        {selected && <KpiPanel objective={selected} kpis={kpisByObjective[selected.id] ?? []} />}
      </div>
    </section>
  )
}

const groupBy = (rows, fn) => rows.reduce((acc, r) => ((acc[fn(r)] ??= []).push(r), acc), {})

export default function StrategyMapPage() {
  const { t } = useTranslation()
  const [period, setPeriod] = useState({})
  const [selectedId, setSelectedId] = useState(null)
  const dash = useDashboard(period)
  const { objectives, kpis } = useStrategyMap(period)

  if (dash.isLoading || objectives.isLoading || kpis.isLoading) return <p className="text-muted">{t('common.loading')}</p>
  if (dash.isError || objectives.isError || kpis.isError || !dash.data) {
    return (
      <div className="max-w-md rounded-lg border border-line bg-white p-5">
        <p className="text-sm">{t('strategyMap.error')}</p>
        <Button className="mt-4" variant="outline" size="sm" onClick={() => { dash.refetch(); objectives.refetch(); kpis.refetch() }}>{t('dashboard.retry')}</Button>
      </div>
    )
  }

  const byPerspective = groupBy(objectives.data ?? [], (o) => o.perspective?.id)
  const kpisByObjective = groupBy(kpis.data ?? [], (k) => k.strategic_objective_id)
  const toggle = (id) => setSelectedId((cur) => (cur === id ? null : id))

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">{t('nav.strategyMap')}</h1>
          <p className="mt-1 text-sm text-muted">{t('strategyMap.hint')}</p>
        </div>
        <PeriodPicker period={dash.data.period} onChange={setPeriod} />
      </div>
      {dash.data.perspectives.map((p) => (
        <Lane key={p.id} p={p} objectives={byPerspective[p.id] ?? []} kpisByObjective={kpisByObjective} selectedId={selectedId} onSelect={toggle} />
      ))}
    </div>
  )
}
