import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import api from '@/lib/api'
import { Button } from '@/components/ui/button'
import { useFormat } from '@/features/dashboard/ui'

/** Who deleted which KPI and when (a KPI's own history goes with it). Admins and managers. */
export default function DeletedKpis() {
  const { t } = useTranslation()
  const { pick } = useFormat()
  const [page, setPage] = useState(1)
  const q = useQuery({ queryKey: ['kpi-deletions', page], queryFn: async () => (await api.get('/kpi-deletions', { params: { page } })).data, keepPreviousData: true })

  const rows = q.data?.data ?? []
  const meta = q.data?.meta

  return (
    <section className="space-y-3 rounded-lg border border-line bg-white p-5">
      <h2 className="text-sm font-semibold">{t('kpiDeletions.title')}</h2>
      {q.isError ? (
        <p role="alert" className="text-sm text-[#A32B1E]">{t('kpiDeletions.error')}</p>
      ) : q.isLoading ? (
        <p className="text-sm text-muted">…</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-muted">{t('kpiDeletions.empty')}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-muted">
                {['code', 'name', 'year', 'department', 'data', 'by', 'when'].map((c) => <th key={c} className="px-2 py-2 text-start font-medium">{t(`kpiDeletions.col.${c}`)}</th>)}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t border-line">
                  <td className="px-2 py-2">{r.code}</td>
                  <td className="px-2 py-2">{pick(r)}</td>
                  <td className="px-2 py-2">{r.year ?? '—'}</td>
                  <td className="px-2 py-2">{r.department ?? '—'}</td>
                  <td className="px-2 py-2 text-muted">{t('kpiDeletions.removed', { entries: r.entries, targets: r.targets })}</td>
                  <td className="px-2 py-2">{r.user ?? '—'}</td>
                  <td className="px-2 py-2 tabular-nums">{r.at ? new Date(r.at).toLocaleDateString() : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {meta && meta.last_page > 1 && (
        <div className="flex items-center gap-2 text-sm">
          <Button size="sm" variant="outline" disabled={page === 1} onClick={() => setPage(page - 1)}>‹</Button>
          <span className="tabular-nums text-muted">{page} / {meta.last_page}</span>
          <Button size="sm" variant="outline" disabled={page === meta.last_page} onClick={() => setPage(page + 1)}>›</Button>
        </div>
      )}
    </section>
  )
}
