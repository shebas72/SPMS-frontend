import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { AlertTriangle, Bell, CheckCircle2, Info, XCircle } from 'lucide-react'
import { fetchNotifications, markAllRead, markRead } from '@/features/notifications/notificationsApi'
import { toast } from '@/lib/toast'
import { timeAgo } from '@/lib/timeAgo'
import { cn } from '@/lib/utils'

const ICONS = {
  success: { Icon: CheckCircle2, cls: 'text-green-600' },
  danger: { Icon: XCircle, cls: 'text-red-600' },
  warning: { Icon: AlertTriangle, cls: 'text-amber-600' },
  info: { Icon: Info, cls: 'text-sky-600' },
}

export default function NotificationBell() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [open, setOpen] = useState(false)
  const box = useRef(null)
  const seen = useRef(null) // unread count at the previous poll

  const { data } = useQuery({
    queryKey: ['notifications', 'bell'],
    queryFn: () => fetchNotifications({ per_page: 8 }),
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
    retry: false,
  })

  const unread = data?.unread_count ?? 0
  const items = data?.data ?? []

  // A toast when something new arrives while the app is open.
  useEffect(() => {
    if (!data) return
    if (seen.current !== null && unread > seen.current) {
      const latest = items.find((n) => !n.read_at)
      if (latest) toast.info(latest.body, { title: latest.title })
    }
    seen.current = unread
  }, [data]) // eslint-disable-line react-hooks/exhaustive-deps

  // Close on outside click or Escape.
  useEffect(() => {
    if (!open) return
    const onClick = (e) => box.current && !box.current.contains(e.target) && setOpen(false)
    const onKey = (e) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', onClick)
    document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('mousedown', onClick); document.removeEventListener('keydown', onKey) }
  }, [open])

  const refresh = () => qc.invalidateQueries({ queryKey: ['notifications'] })
  const readOne = useMutation({ mutationFn: markRead, onSuccess: refresh })
  const readAll = useMutation({ mutationFn: markAllRead, onSuccess: refresh })

  const openItem = (n) => {
    if (!n.read_at) readOne.mutate(n.id)
    setOpen(false)
    if (n.url) navigate(n.url)
  }

  return (
    <div className="relative" ref={box}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label={t('notifications.title', 'Notifications')}
        className="relative rounded-md p-2 text-ink hover:bg-brand-soft"
      >
        <Bell className="h-5 w-5" aria-hidden="true" />
        {unread > 0 && (
          <span className="absolute -end-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-semibold text-white">
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute end-0 z-50 mt-2 w-[22rem] max-w-[calc(100vw-2rem)] rounded-lg border border-line bg-white shadow-lg">
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <h2 className="text-sm font-semibold">{t('notifications.title', 'Notifications')}</h2>
            <button type="button" className="text-xs font-medium text-brand hover:underline disabled:opacity-50"
              disabled={unread === 0 || readAll.isPending} onClick={() => readAll.mutate()}>
              {t('notifications.markAll', 'Mark all as read')}
            </button>
          </div>

          <ul className="max-h-96 divide-y divide-line overflow-y-auto">
            {items.length === 0 && <li className="px-4 py-8 text-center text-sm text-muted">{t('notifications.empty', 'You are all caught up.')}</li>}
            {items.map((n) => {
              const { Icon, cls } = ICONS[n.level] ?? ICONS.info
              return (
                <li key={n.id}>
                  <button type="button" onClick={() => openItem(n)}
                    className={cn('flex w-full items-start gap-3 px-4 py-3 text-start hover:bg-brand-soft', !n.read_at && 'bg-brand-soft/50')}>
                    <Icon className={cn('mt-0.5 h-4 w-4 shrink-0', cls)} aria-hidden="true" />
                    <span className="min-w-0 flex-1">
                      <span className={cn('block truncate text-sm', !n.read_at && 'font-semibold')}>{n.title}</span>
                      <span className="line-clamp-2 block text-xs text-muted">{n.body}</span>
                      <span className="mt-1 block text-[11px] text-muted">{timeAgo(n.created_at, i18n.language)}</span>
                    </span>
                    {!n.read_at && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand" aria-label={t('notifications.unread', 'Unread')} />}
                  </button>
                </li>
              )
            })}
          </ul>

          <div className="border-t border-line px-4 py-2 text-center">
            <Link to="/notifications" onClick={() => setOpen(false)} className="text-xs font-medium text-brand hover:underline">
              {t('notifications.viewAll', 'View all and settings')}
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}