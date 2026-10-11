import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useFormat } from '@/features/dashboard/ui'
import { colorOf } from '@/features/projects/charts'
import { BandLegend, TrendLine } from '@/features/performance/trendCharts'

// name | bar track | value | mini trend. The same columns are reused for the axis row so everything lines up.
const GRID = 'grid grid-cols-[minmax(7rem,11rem)_minmax(0,1fr)_3.5rem] items-center gap-x-3 md:grid-cols-[minmax(8rem,12rem)_minmax(0,1fr)_3.5rem_minmax(0,15rem)]'

export default function DepartmentOverview({ rows, period }) {
  const { t } = useTranslation()
  const { n, pick } = useFormat()
  const [basis, setBasis] = useState('current')
  const [subs, setSubs] = useState(false)
  const [sort, setSort] = useState('high')
  const month = period.month

  const list = useMemo(() => {
    const ids = new Set(rows.map((d) => d.id))
    const byId = Object.fromEntries(rows.map((d) => [d.id, d]))
    const depth = (d) => { let k = 0; let p = d; while (p.parent_id && ids.has(p.parent_id) && k < 10) { p = byId[p.parent_id]; k++ } return k }
    const out = rows.map((d) => ({ d, depth: depth(d), score: d[basis === 'ytd' ? 'ytd' : 'current']?.score ?? null }))
      .filter((r) => subs || r.depth === 0)
    if (sort === 'high') out.sort((a, b) => (b.score ?? -1) - (a.score ?? -1))
    if (sort === 'low') out.sort((a, b) => (a.score ?? Infinity) - (b.score ?? Infinity))
    return out
  }, [rows, basis, subs, sort])

  // Bars start at 70% like the slide, or lower when a department scores below that.
  const scores = list.map((r) => r.score).filter((v) => v != null)
  const lo = Math.min(70, scores.length ? Math.floor(Math.min(...scores) / 10) * 10 : 70)
  const hi = Math.max(100, scores.length ? Math.ceil(Math.max(...scores) / 10) * 10 : 100)
  const step = hi - lo > 40 ? 10 : 5
  const ticks = []
  for (let v = lo; v <= hi; v += step) ticks.push(v)
  const pos = (v) => `${((v - lo) / (hi - lo)) * 100}%`
  const sel = 'h-9 rounded-md border border-line bg-white px-2 text-sm text-ink'

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted">
        <label className="inline-flex items-center gap-2">
          {t('departmentsPage.overview.basis')}
          <select className={sel} value={basis} onChange={(e) => setBasis(e.target.value)}>
            <option value="current">{t('departmentsPage.col.current')}</option>
            <option value="ytd">{t('departmentsPage.col.ytd')}</option>
          </select>
        </label>
        <label className="inline-flex items-center gap-2">
          {t('departmentsPage.overview.sort')}
          <select className={sel} value={sort} onChange={(e) => setSort(e.target.value)}>
            <option value="high">{t('departmentsPage.overview.sortHigh')}</option>
            <option value="low">{t('departmentsPage.overview.sortLow')}</option>
            <option value="order">{t('departmentsPage.overview.sortOrder')}</option>
          </select>
        </label>
        <label className="inline-flex items-center gap-2">
          <input type="checkbox" checked={subs} onChange={(e) => setSubs(e.target.checked)} />
          {t('departmentsPage.overview.subs')}
        </label>
      </div>

      {list.length === 0 ? (
        <p className="rounded-lg border border-dashed border-line p-6 text-sm text-muted">{t('departmentsPage.empty')}</p>
      ) : (
        <div className="rounded-lg border border-line bg-white p-4">
          <div className={`${GRID} hidden pb-2 text-xs text-muted md:grid`}>
            <span>{t('departmentsPage.col.department')}</span>
            <span />
            <span />
            <span>{t('departmentsPage.overview.trend')}</span>
          </div>
          <ul className="divide-y divide-line">
            {list.map(({ d, depth, score }) => (
              <li key={d.id} className={`${GRID} py-2`}>
                <div className="flex min-w-0 items-center gap-2" style={{ paddingInlineStart: `${depth * 1.25}rem` }}>
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: d.color || '#8A8F98' }} aria-hidden="true" />
                  <span className="truncate text-sm" title={pick(d)}>{pick(d)}</span>
                </div>
                <div className="relative h-5 border-s border-line" role="img" aria-label={score == null ? '—' : `${n(score)}%`}>
                  {ticks.slice(1, -1).map((v) => <span key={v} className="absolute inset-y-0 border-s border-line opacity-60" style={{ insetInlineStart: pos(v) }} aria-hidden="true" />)}
                  {score != null && <span className="absolute inset-y-1 start-0 rounded-e-sm" style={{ width: pos(Math.max(lo, Math.min(hi, score))), background: colorOf(score).fill }} />}
                </div>
                <span className="text-end text-sm font-semibold tabular-nums" style={{ color: colorOf(score).text }}>{score == null ? '—' : `${n(Math.round(score * 10) / 10)}%`}</span>
                <div className="col-span-3 mt-1 md:col-span-1 md:mt-0">
                  <TrendLine values={(d.series ?? []).slice(0, month).map((p) => (basis === 'ytd' ? p.ytd_score : p.score))} size="sm" />
                </div>
              </li>
            ))}
          </ul>
          <div className={`${GRID} mt-1 border-t border-line pt-1`}>
            <span />
            <div className="relative h-5" aria-hidden="true">
              {ticks.map((v) => (
                <span key={v} className="absolute -translate-x-1/2 text-xs tabular-nums text-muted rtl:translate-x-1/2" style={{ insetInlineStart: pos(v) }}>{n(v)}%</span>
              ))}
            </div>
          </div>
        </div>
      )}
      <div className="flex justify-center"><BandLegend /></div>
    </section>
  )
}
