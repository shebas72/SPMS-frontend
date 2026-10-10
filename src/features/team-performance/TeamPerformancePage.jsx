import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { ChevronDown } from 'lucide-react'
import api from '@/lib/api'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { PeriodPicker } from '@/features/dashboard/DashboardPage'
import { ScoreBar, StatusBadge, STATUS, keyOf, statusOf, useFormat } from '@/features/dashboard/ui'

const field = 'h-9 rounded-md border border-line bg-white px-2 text-sm'

const Card = ({ title, className, children }) => (
  <section className={cn('rounded-lg border border-line bg-white p-5', className)}>
    {title && <h2 className="mb-4 text-sm font-semibold">{title}</h2>}
    {children}
  </section>
)

// Colored counts: on track / at risk / behind (/ not entered when there are any)
function StatusCounts({ c }) {
  const { t } = useTranslation()
  const { n } = useFormat()
  const items = [['on_track', STATUS.on_track.fill], ['at_risk', STATUS.at_risk.fill], ['behind', STATUS.behind.fill], ['not_entered', STATUS.none.fill]]
  return (
    <ul className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted">
      {items.filter(([k]) => k !== 'not_entered' || c.not_entered > 0).map(([k, color]) => (
        <li key={k} className="inline-flex items-center gap-1" title={t(`teamPerf.counts.${k}`)}>
          <span className="h-2 w-2 rounded-full" style={{ background: color }} aria-hidden="true" />
          <span className="font-medium tabular-nums text-ink">{n(c[k])}</span>
          <span className="sr-only">{t(`teamPerf.counts.${k}`)}</span>
        </li>
      ))}
    </ul>
  )
}

function ScoreCell({ block }) {
  const { n } = useFormat()
  return (
    <div className="min-w-32 space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <span className="font-semibold tabular-nums" style={{ color: statusOf(keyOf(block.score, block.status)).text }}>
          {n(block.score)}{block.score != null && <span className="text-xs font-normal text-muted">%</span>}
        </span>
        <StatusBadge status={block.status} score={block.score} />
      </div>
      <ScoreBar score={block.score} status={block.status} />
    </div>
  )
}

function Stat({ label, value, sub }) {
  return (
    <div>
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-muted">{sub}</p>}
    </div>
  )
}

function WorkCell({ w }) {
  const { t } = useTranslation()
  const { n } = useFormat()
  if (!w.count) return <span className="text-muted">—</span>
  return (
    <div className="text-xs">
      <span className="font-medium tabular-nums text-ink">{n(w.count)}</span>
      <span className="text-muted"> · {n(w.avg_pct)}%</span>
      {w.late > 0 && <p style={{ color: STATUS.behind.text }}>{t('teamPerf.late', { count: w.late })}</p>}
    </div>
  )
}

function DataCell({ d }) {
  const { t } = useTranslation()
  const { n } = useFormat()
  if (!d.expected) return <span className="text-muted">—</span>
  return (
    <div className="text-xs">
      <span className="font-medium tabular-nums text-ink">{n(d.pct)}%</span>
      {d.missing > 0 && <p style={{ color: STATUS.at_risk.text }}>{t('teamPerf.missing', { count: d.missing })}</p>}
    </div>
  )
}

const th = 'px-3 py-2 text-start text-xs font-medium text-muted'
const td = 'px-3 py-3 align-top'

function WorkList({ title, rows }) {
  const { t } = useTranslation()
  const { n, pick } = useFormat()
  if (!rows.items.length) return null
  return (
    <div>
      <h4 className="mb-2 text-xs font-semibold">{title}</h4>
      <ul className="space-y-1.5 text-sm">
        {rows.items.map((i) => (
          <li key={i.id} className="flex items-center justify-between gap-3">
            <span className="min-w-0 truncate"><span className="text-muted">{i.code}</span> {pick(i)}</span>
            <span className="shrink-0 text-xs text-muted">
              {t(`teamPerf.workStatus.${i.status}`, { defaultValue: i.status })}
              {!i.is_on_timeline && i.status !== 'completed' && ` · ${t('teamPerf.offTimeline')}`}
              {' · '}<span className="font-medium tabular-nums text-ink">{i.pct == null ? '—' : `${n(i.pct)}%`}</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function Detail({ p }) {
  const { t } = useTranslation()
  const { n, pick, month } = useFormat()
  return (
    <div className="space-y-5 bg-paper px-4 py-4">
      {p.kpis.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className={th}>{t('teamPerf.kpi')}</th>
                <th className={th}>{t('teamPerf.thisMonth')}</th>
                <th className={th}>{t('teamPerf.ytd')}</th>
                <th className={th}>{t('teamPerf.noEntryMonths')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {p.kpis.map((k) => (
                <tr key={k.id}>
                  <td className="px-3 py-2"><Link className="hover:underline" to={`/kpis/${k.id}`}><span className="text-muted">{k.code}</span> {pick(k)}</Link></td>
                  <td className="px-3 py-2"><span className="tabular-nums">{n(k.score)}{k.score != null && '%'}</span> <StatusBadge status={k.status} score={k.score} /></td>
                  <td className="px-3 py-2 tabular-nums">{k.ytd_score == null ? '—' : `${n(k.ytd_score)}%`}</td>
                  <td className="px-3 py-2 text-xs text-muted">{k.missing_months.length ? k.missing_months.map((m) => month(m)).join(', ') : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div className="grid gap-5 md:grid-cols-2">
        <WorkList title={t('teamPerf.projectsTitle')} rows={p.projects} />
        <WorkList title={t('teamPerf.initiativesTitle')} rows={p.initiatives} />
      </div>
      {!p.kpis.length && !p.projects.items.length && !p.initiatives.items.length && <p className="text-sm text-muted">{t('teamPerf.nothingOwned')}</p>}
      {!p.unassigned && <p className="text-xs text-muted">{t('teamPerf.entriesLogged', { count: p.data.entries_logged })}</p>}
    </div>
  )
}

function PersonRows({ p, rank, basis, colSpan }) {
  const { t } = useTranslation()
  const { pick } = useFormat()
  const [open, setOpen] = useState(false)
  const block = basis === 'ytd' ? p.ytd : p.current
  const label = p.unassigned ? t('teamPerf.unassigned') : p.name
  return (
    <>
      <tr className={cn(p.unassigned && 'bg-paper', open && 'bg-brand-soft')}>
        <td className={cn(td, 'tabular-nums text-muted')}>{rank ?? ''}</td>
        <td className={td}>
          <button type="button" className="flex items-start gap-1.5 text-start" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
            <ChevronDown className={cn('mt-0.5 h-4 w-4 shrink-0 transition-transform', !open && '-rotate-90 rtl:rotate-90')} aria-hidden="true" />
            <span>
              <span className="font-medium">{label}</span>
              {p.is_me && <span className="ms-1.5 text-xs text-muted">{t('team.you')}</span>}
              {!p.is_active && <span className="ms-1.5 text-xs text-muted">{t('team.inactive')}</span>}
              <span className="block text-xs text-muted">
                {p.unassigned ? t('teamPerf.unassignedHint') : [p.role && t(`team.roles.${p.role}`, { defaultValue: p.role }), ...p.departments.map((d) => pick(d))].filter(Boolean).join(' · ')}
              </span>
            </span>
          </button>
        </td>
        <td className={cn(td, 'tabular-nums')}>{p.kpi_count || <span className="text-muted">0</span>}</td>
        <td className={td}>{p.kpi_count ? <ScoreCell block={block} /> : <span className="text-muted">—</span>}</td>
        <td className={td}>{p.kpi_count ? <StatusCounts c={p.current} /> : null}</td>
        <td className={td}><DataCell d={p.data} /></td>
        <td className={td}><WorkCell w={p.projects} /></td>
        <td className={td}><WorkCell w={p.initiatives} /></td>
      </tr>
      {open && <tr><td colSpan={colSpan} className="p-0"><Detail p={p} /></td></tr>}
    </>
  )
}

function Teams({ teams, basis }) {
  const { t } = useTranslation()
  const { n, pick } = useFormat()
  return (
    <Card title={t('teamPerf.teams')}>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr>
              <th className={th}>{t('teamPerf.manager')}</th>
              <th className={th}>{t('teamPerf.members')}</th>
              <th className={th}>{t('teamPerf.kpis')}</th>
              <th className={th}>{t('teamPerf.score')}</th>
              <th className={th}>{t('teamPerf.statusCol')}</th>
              <th className={th}>{t('teamPerf.dataCol')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {teams.map((tm) => (
              <tr key={tm.manager.id}>
                <td className={td}>
                  <span className="font-medium">{tm.manager.name}</span>
                  {tm.departments.length > 0 && <span className="block text-xs text-muted">{tm.departments.map((d) => pick(d)).join(' · ')}</span>}
                </td>
                <td className={cn(td, 'tabular-nums')}>{n(tm.member_count)}</td>
                <td className={cn(td, 'tabular-nums')}>{n(tm.kpi_count)}</td>
                <td className={td}>{tm.kpi_count ? <ScoreCell block={basis === 'ytd' ? tm.ytd : tm.current} /> : <span className="text-muted">—</span>}</td>
                <td className={td}>{tm.kpi_count ? <StatusCounts c={tm.current} /> : null}</td>
                <td className={td}><DataCell d={tm.data} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  )
}

export default function TeamPerformancePage() {
  const { t } = useTranslation()
  const { n, monthLong } = useFormat()
  const [period, setPeriod] = useState({})
  const [basis, setBasis] = useState('month')
  const [sort, setSort] = useState('score')
  const [search, setSearch] = useState('')
  const [showEmpty, setShowEmpty] = useState(false)

  const q = useQuery({
    queryKey: ['team-performance', period.year ?? null, period.month ?? null],
    queryFn: async () => (await api.get('/reports/team-performance', { params: { year: period.year, month: period.month } })).data.data,
    placeholderData: (prev) => prev,
  })

  const view = useMemo(() => {
    const data = q.data
    if (!data) return null
    const score = (p) => (basis === 'ytd' ? p.ytd.score : p.current.score)
    const people = data.people.filter((p) => !p.unassigned)
    const unassigned = data.people.find((p) => p.unassigned)

    // Rank on the chosen basis; people with the same score share a rank, people without a score are not ranked.
    const ranked = people.filter((p) => p.kpi_count && score(p) != null).sort((a, b) => score(b) - score(a))
    const rank = new Map()
    ranked.forEach((p, i) => rank.set(p.user_id, i > 0 && score(p) === score(ranked[i - 1]) ? rank.get(ranked[i - 1].user_id) : i + 1))

    const hidden = people.filter((p) => !p.kpi_count && !p.projects.count && !p.initiatives.count && !p.is_me).length
    const needle = search.trim().toLowerCase()
    let rows = people
      .filter((p) => showEmpty || p.kpi_count || p.projects.count || p.initiatives.count || p.is_me)
      .filter((p) => !needle || (p.name ?? '').toLowerCase().includes(needle))
    const byName = (a, b) => a.name.localeCompare(b.name)
    rows = [...rows].sort((a, b) => {
      if (sort === 'name') return byName(a, b)
      if (sort === 'missing') return b.data.missing - a.data.missing || byName(a, b)
      const sa = a.kpi_count ? score(a) : null
      const sb = b.kpi_count ? score(b) : null
      if (sa == null && sb == null) return byName(a, b)
      if (sa == null) return 1
      if (sb == null) return -1
      return sb - sa || byName(a, b)
    })
    return { rows, rank, hidden, unassigned: !needle ? unassigned : null }
  }, [q.data, basis, sort, search, showEmpty])

  if (q.isLoading) return <p className="text-muted">{t('common.loading')}</p>
  if (q.isError || !q.data) {
    return (
      <Card className="max-w-md">
        <p className="text-sm">{t('teamPerf.error')}</p>
        <Button className="mt-4" variant="outline" size="sm" onClick={() => q.refetch()}>{t('dashboard.retry')}</Button>
      </Card>
    )
  }

  const { meta, summary, teams } = q.data
  const block = basis === 'ytd' ? summary.ytd : summary.current
  const single = meta.scope === 'self'
  const COLS = 8

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">{t('nav.teamPerformance')}</h1>
        <PeriodPicker period={q.data.period} onChange={setPeriod} />
      </div>
      <p className="rounded-lg border border-line bg-white px-4 py-2.5 text-sm text-muted">
        {t(`teamPerf.scope.${meta.scope}`)} {t('teamPerf.basisNote', { month: monthLong(q.data.period.month) })}
      </p>

      <Card>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label={t('teamPerf.people')} value={n(summary.people)} sub={summary.unowned_kpis > 0 ? t('teamPerf.unownedKpis', { count: summary.unowned_kpis }) : undefined} />
          <Stat label={t('teamPerf.kpis')} value={n(summary.kpi_count)} />
          <div>
            <p className="text-xs text-muted">{t('teamPerf.score')}</p>
            <div className="mt-1"><ScoreCell block={block} /></div>
            <div className="mt-2"><StatusCounts c={summary.current} /></div>
          </div>
          <Stat label={t('teamPerf.dataCol')} value={summary.data.pct == null ? '—' : `${n(summary.data.pct)}%`} sub={summary.data.missing > 0 ? t('teamPerf.missing', { count: summary.data.missing }) : undefined} />
        </div>
      </Card>

      {teams.length > 0 && <Teams teams={teams} basis={basis} />}

      <Card title={single ? t('teamPerf.you') : t('teamPerf.people')}>
        {!single && (
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <input type="search" className={cn(field, 'w-52')} placeholder={t('teamPerf.search')} aria-label={t('teamPerf.search')} value={search} onChange={(e) => setSearch(e.target.value)} />
            <label className="flex items-center gap-2 text-sm">
              <span className="text-muted">{t('teamPerf.basis')}</span>
              <select className={field} value={basis} onChange={(e) => setBasis(e.target.value)}>
                <option value="month">{t('teamPerf.thisMonth')}</option>
                <option value="ytd">{t('teamPerf.ytd')}</option>
              </select>
            </label>
            <label className="flex items-center gap-2 text-sm">
              <span className="text-muted">{t('teamPerf.sortBy')}</span>
              <select className={field} value={sort} onChange={(e) => setSort(e.target.value)}>
                <option value="score">{t('teamPerf.sortScore')}</option>
                <option value="missing">{t('teamPerf.sortMissing')}</option>
                <option value="name">{t('teamPerf.sortName')}</option>
              </select>
            </label>
            {view.hidden > 0 && (
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={showEmpty} onChange={(e) => setShowEmpty(e.target.checked)} />
                {t('teamPerf.showEmpty', { count: view.hidden })}
              </label>
            )}
          </div>
        )}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[56rem] text-sm">
            <thead>
              <tr>
                <th className={cn(th, 'w-10')}>{t('teamPerf.rank')}</th>
                <th className={th}>{t('teamPerf.person')}</th>
                <th className={th}>{t('teamPerf.kpis')}</th>
                <th className={th}>{basis === 'ytd' ? t('teamPerf.ytd') : t('teamPerf.thisMonth')}</th>
                <th className={th}>{t('teamPerf.statusCol')}</th>
                <th className={th}>{t('teamPerf.dataCol')}</th>
                <th className={th}>{t('teamPerf.projectsCol')}</th>
                <th className={th}>{t('teamPerf.initiativesCol')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {view.rows.map((p) => <PersonRows key={p.user_id} p={p} rank={single ? null : view.rank.get(p.user_id)} basis={basis} colSpan={COLS} />)}
              {view.unassigned && <PersonRows p={view.unassigned} rank={null} basis={basis} colSpan={COLS} />}
              {!view.rows.length && !view.unassigned && (
                <tr><td colSpan={COLS} className="px-3 py-6 text-center text-muted">{t('teamPerf.empty')}</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-muted">{t('teamPerf.footnote')}</p>
      </Card>
    </div>
  )
}
