import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { fetchNotifications, fetchPreferences, markAllRead, markRead, savePreferences } from './notificationsApi'
import { useAuthStore } from '@/stores/authStore'
import { can } from '@/lib/roles'
import { toast } from '@/lib/toast'
import { timeAgo } from '@/lib/timeAgo'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const LEVEL_DOT = { success: 'bg-green-600', danger: 'bg-red-600', warning: 'bg-amber-500', info: 'bg-sky-600' }

export default function NotificationsPage() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const user = useAuthStore((s) => s.user)
  const [onlyUnread, setOnlyUnread] = useState(false)
  const [page, setPage] = useState(1)

  const list = useQuery({
    queryKey: ['notifications', 'page', onlyUnread, page],
    queryFn: () => fetchNotifications({ per_page: 15, page, unread: onlyUnread ? 1 : 0 }),
    keepPreviousData: true,
  })
  const prefsQuery = useQuery({ queryKey: ['notification-preferences'], queryFn: fetchPreferences })
  const [draft, setDraft] = useState(null)
  const prefs = draft ?? prefsQuery.data

  const refresh = () => qc.invalidateQueries({ queryKey: ['notifications'] })
  const readOne = useMutation({ mutationFn: markRead, onSuccess: refresh })
  const readAll = useMutation({ mutationFn: markAllRead, onSuccess: refresh })
  const save = useMutation({
    mutationFn: savePreferences,
    onSuccess: (saved) => { qc.setQueryData(['notification-preferences'], saved); setDraft(null); toast.success(t('notifications.saved', 'Notification settings saved.')) },
    onError: () => toast.error(t('billing.error', 'Something went wrong. Please try again.')),
  })

  const categories = [
    ['proposals', t('notifications.cat.proposals', 'Corrective proposals'), t('notifications.catHint.proposals', 'A proposal is submitted for your departments, or yours is reviewed.')],
    ['kpi_status', t('notifications.cat.kpi_status', 'KPI turned red'), t('notifications.catHint.kpi_status', 'A KPI in your departments falls behind target.')],
    ['reminders', t('notifications.cat.reminders', 'Month-end reminders'), t('notifications.catHint.reminders', 'KPIs of yours still have no actual value near the end of the month.')],
    ...(can(user, 'settings.manage')
      ? [['plan', t('notifications.cat.plan', 'Plan and billing'), t('notifications.catHint.plan', 'Trial ending, payment problems, and answers to plan requests.')]]
      : []),
  ]

  const toggle = (cat, channel) => setDraft({ ...prefs, [cat]: { ...prefs[cat], [channel]: !prefs[cat][channel] } })
  const rows = list.data?.data ?? []
  const meta = list.data?.meta

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">{t('notifications.title', 'Notifications')}</h1>
        <div className="flex items-center gap-2">
          <Button size="sm" variant={onlyUnread ? 'primary' : 'outline'} onClick={() => { setOnlyUnread((v) => !v); setPage(1) }}>
            {t('notifications.onlyUnread', 'Unread only')}
          </Button>
          <Button size="sm" variant="outline" disabled={!list.data?.unread_count || readAll.isPending} onClick={() => readAll.mutate()}>
            {t('notifications.markAll', 'Mark all as read')}
          </Button>
        </div>
      </div>

      <section className="rounded-lg border border-line bg-white">
        <ul className="divide-y divide-line">
          {rows.length === 0 && <li className="px-5 py-10 text-center text-sm text-muted">{t('notifications.empty', 'You are all caught up.')}</li>}
          {rows.map((n) => (
            <li key={n.id}>
              <button type="button" className={cn('flex w-full items-start gap-3 px-5 py-4 text-start hover:bg-brand-soft', !n.read_at && 'bg-brand-soft/50')}
                onClick={() => { if (!n.read_at) readOne.mutate(n.id); if (n.url) navigate(n.url) }}>
                <span className={cn('mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full', LEVEL_DOT[n.level] ?? LEVEL_DOT.info)} aria-hidden="true" />
                <span className="min-w-0 flex-1">
                  <span className={cn('block text-sm', !n.read_at && 'font-semibold')}>{n.title}</span>
                  <span className="block text-sm text-muted">{n.body}</span>
                </span>
                <span className="shrink-0 text-xs text-muted">{timeAgo(n.created_at, i18n.language)}</span>
              </button>
            </li>
          ))}
        </ul>
        {meta && meta.last_page > 1 && (
          <div className="flex items-center justify-between border-t border-line px-5 py-3 text-sm">
            <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>{t('common.previous', 'Previous')}</Button>
            <span className="text-muted">{page} / {meta.last_page}</span>
            <Button size="sm" variant="outline" disabled={page >= meta.last_page} onClick={() => setPage((p) => p + 1)}>{t('common.next', 'Next')}</Button>
          </div>
        )}
      </section>

      <section className="rounded-lg border border-line bg-white p-5">
        <h2 className="font-semibold">{t('notifications.settings', 'What should we notify you about?')}</h2>
        <p className="mt-1 text-sm text-muted">{t('notifications.settingsHint', 'Choose where you want to hear about each topic.')}</p>

        {prefs && (
          <>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-line text-start text-muted">
                    <th className="py-2 text-start font-medium">{t('notifications.topic', 'Topic')}</th>
                    <th className="w-24 py-2 text-center font-medium">{t('notifications.inApp', 'In the app')}</th>
                    <th className="w-24 py-2 text-center font-medium">{t('notifications.email', 'Email')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {categories.map(([key, label, hint]) => (
                    <tr key={key}>
                      <td className="py-3 pe-4">
                        <div className="font-medium">{label}</div>
                        <div className="text-xs text-muted">{hint}</div>
                      </td>
                      {['app', 'email'].map((channel) => (
                        <td key={channel} className="text-center">
                          <input type="checkbox" className="h-4 w-4 accent-brand" checked={!!prefs[key]?.[channel]} onChange={() => toggle(key, channel)}
                            aria-label={`${label}: ${channel === 'app' ? t('notifications.inApp', 'In the app') : t('notifications.email', 'Email')}`} />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-4 flex gap-2">
              <Button disabled={!draft || save.isPending} onClick={() => save.mutate(draft)}>{t('common.save', 'Save')}</Button>
              {draft && <Button variant="ghost" onClick={() => setDraft(null)}>{t('common.cancel', 'Cancel')}</Button>}
            </div>
          </>
        )}
      </section>
    </div>
  )
}