import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { FileDown } from 'lucide-react'
import api from '@/lib/api'
import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/stores/authStore'

// With responseType 'blob' an error body arrives as a Blob too, so read it to show the server's message (e.g. plan_feature).
async function errorText(error, fallback) {
  const data = error?.response?.data
  try {
    const json = data instanceof Blob ? JSON.parse(await data.text()) : data
    return json?.message || fallback
  } catch {
    return fallback
  }
}

/** Downloads a PDF report from /reports/pdf/... in the current language. Hidden when the plan explicitly lacks PDF export. */
export default function PdfButton({ path, params, disabled }) {
  const { t, i18n } = useTranslation()
  const allowed = useAuthStore((s) => s.user?.company?.features?.pdf_export) !== false
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  if (!allowed) return null

  const download = async () => {
    setBusy(true)
    setError('')
    try {
      const res = await api.get(path, { params: { ...params, lang: (i18n.language || 'en').split('-')[0] }, responseType: 'blob' })
      const name = /filename="?([^";]+)"?/.exec(res.headers['content-disposition'] || '')?.[1] || 'report.pdf'
      const url = URL.createObjectURL(res.data)
      const a = document.createElement('a')
      a.href = url
      a.download = name
      document.body.appendChild(a)
      a.click()
      a.remove()
      setTimeout(() => URL.revokeObjectURL(url), 10000)
    } catch (e) {
      setError(await errorText(e, t('pdf.error')))
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <Button size="sm" variant="outline" disabled={busy || disabled} onClick={download}>
        <FileDown className="h-4 w-4" aria-hidden="true" />
        {busy ? t('pdf.preparing') : t('pdf.export')}
      </Button>
      {error && <span role="alert" className="text-xs text-[#A32B1E]">{error}</span>}
    </>
  )
}
