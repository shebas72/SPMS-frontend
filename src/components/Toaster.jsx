import { AlertTriangle, CheckCircle2, Info, X, XCircle } from 'lucide-react'
import { useToastStore } from '@/stores/toastStore'

const STYLES = {
  success: { icon: CheckCircle2, cls: 'border-green-200 bg-green-50 text-green-900' },
  danger: { icon: XCircle, cls: 'border-red-200 bg-red-50 text-red-900' },
  warning: { icon: AlertTriangle, cls: 'border-amber-200 bg-amber-50 text-amber-900' },
  info: { icon: Info, cls: 'border-sky-200 bg-sky-50 text-sky-900' },
}

export default function Toaster() {
  const { toasts, dismiss } = useToastStore()

  return (
    <div className="pointer-events-none fixed bottom-4 end-4 z-[60] flex w-[22rem] max-w-[calc(100vw-2rem)] flex-col gap-2" aria-live="polite">
      {toasts.map((t) => {
        const { icon: Icon, cls } = STYLES[t.level] ?? STYLES.info
        return (
          <div key={t.id} role="status" className={`pointer-events-auto flex items-start gap-3 rounded-lg border p-3 shadow-md ${cls}`}>
            <Icon className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
            <div className="min-w-0 flex-1 text-sm">
              {t.title && <p className="font-semibold">{t.title}</p>}
              <p className="break-words">{t.message}</p>
            </div>
            <button type="button" onClick={() => dismiss(t.id)} className="rounded p-0.5 opacity-70 hover:opacity-100" aria-label="Dismiss">
              <X className="h-4 w-4" />
            </button>
          </div>
        )
      })}
    </div>
  )
}