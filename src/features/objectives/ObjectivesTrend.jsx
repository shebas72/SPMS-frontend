import { useTranslation } from 'react-i18next'
import { useFormat } from '@/features/dashboard/ui'
import { colorOf } from '@/features/projects/charts'
import { BandLegend, PiePct, TrendLine } from '@/features/performance/trendCharts'

// Year-to-date line up to the selected month, from the monthly series the API returns with ?series=1.
const ytdValues = (series, month) => (series ?? []).slice(0, month).map((p) => p.ytd_score)

function Figure({ caption, children }) {
  return (
    <figure className="min-w-0">
      {children}
      <figcaption className="mt-1 text-center text-xs text-muted">{caption}</figcaption>
    </figure>
  )
}

// Pie with its percentage beside it, so the number lines up the same way on every tile.
function MonthPie({ score, big = false }) {
  const { n } = useFormat()
  return (
    <div className="flex items-start justify-center gap-2">
      <div className={big ? 'w-28' : 'w-16 sm:w-20'}><PiePct pct={score} /></div>
      <span className={big ? 'text-xl font-semibold tabular-nums' : 'text-sm font-semibold tabular-nums'} style={{ color: colorOf(score).text }}>
        {score == null ? '—' : <>{n(Math.round(score))}<span className="text-xs font-normal">%</span></>}
      </span>
    </div>
  )
}

function ObjectiveTile({ o, month, year }) {
  const { t } = useTranslation()
  const { pick } = useFormat()
  const p = o.perspective
  return (
    <article className="flex flex-col rounded-lg border border-line bg-white p-4" style={{ borderTop: `3px solid ${p?.color ?? '#8A8F98'}` }}>
      <header className="min-h-[2.75rem]">
        <p className="text-xs text-muted">{o.code}</p>
        <h3 className="line-clamp-2 text-sm font-semibold">{pick(o)}</h3>
      </header>
      <div className="mt-3 grid grid-cols-[minmax(0,3fr)_minmax(0,2fr)] items-end gap-3">
        <Figure caption={t('perfView.ytdLine', { year })}><TrendLine values={ytdValues(o.series, month)} size="md" /></Figure>
        <Figure caption={t('perfView.monthPie')}><MonthPie score={o.current?.score ?? null} /></Figure>
      </div>
    </article>
  )
}

export default function ObjectivesTrend({ rows, overall, period }) {
  const { t } = useTranslation()
  const { year, month } = period
  return (
    <div className="space-y-4">
      {overall && (
        <section className="rounded-lg border border-line bg-white p-5" style={{ borderTop: `3px solid ${colorOf(overall.current?.score ?? null).fill}` }}>
          <div className="grid items-center gap-5 md:grid-cols-[8rem_minmax(0,2fr)_minmax(0,1fr)]">
            <div>
              <h2 className="text-sm font-semibold">{t('perfView.overall')}</h2>
              <p className="mt-1 text-sm tabular-nums text-muted">{String(month).padStart(2, '0')}/{year}</p>
            </div>
            <Figure caption={t('perfView.ytdLine', { year })}><TrendLine values={ytdValues(overall.series, month)} size="lg" className="max-h-52" /></Figure>
            <Figure caption={t('perfView.monthPie')}><MonthPie score={overall.current?.score ?? null} big /></Figure>
          </div>
        </section>
      )}
      <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
        {rows.map((o) => <ObjectiveTile key={o.id} o={o} month={month} year={year} />)}
      </div>
      <div className="flex justify-center"><BandLegend /></div>
    </div>
  )
}
