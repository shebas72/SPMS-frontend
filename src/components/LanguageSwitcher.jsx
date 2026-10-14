import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '@/stores/authStore'
import { Languages } from 'lucide-react'
import api from '@/lib/api'
import { ENABLED_LANGUAGES, IS_MULTILINGUAL } from '@/config/languages'

export default function LanguageSwitcher() {
  const { i18n, t } = useTranslation()
  const user = useAuthStore((s) => s.user)
  // Signed in: the company's languages. Signed out: ask the server (standalone = the company's setting, SaaS = both).
  const own = user?.company?.languages
  const pub = useQuery({
    queryKey: ['public-languages'],
    queryFn: async () => (await api.get('/auth/languages')).data.data.languages,
    enabled: !user, staleTime: 10 * 60 * 1000, retry: false,
  })
  const allowed = Array.isArray(own) ? own : user ? null : pub.data ?? null
  const current = (i18n.language || '').split('-')[0]
  const key = allowed ? allowed.join(',') : ''

  // A saved Arabic choice falls back to English once Arabic is off.
  useEffect(() => {
    if (allowed && !allowed.includes(current)) i18n.changeLanguage('en')
  }, [key, current, i18n]) // eslint-disable-line react-hooks/exhaustive-deps

  // English-only deployments never see a switcher; neither does a company with Arabic off. Signed out, wait until the server has answered.
  const languages = ENABLED_LANGUAGES.filter((l) => allowed?.includes(l.code) ?? user != null)
  if (!IS_MULTILINGUAL || languages.length < 2) return null

  return (
    <label className="inline-flex items-center gap-2 text-sm text-muted">
      <Languages className="h-4 w-4" aria-hidden="true" />
      <span className="sr-only">{t('common.language')}</span>
      <select
        value={current}
        onChange={(e) => i18n.changeLanguage(e.target.value)}
        className="h-9 rounded-md border border-line bg-white px-2 text-sm text-ink"
      >
        {languages.map((l) => (
          <option key={l.code} value={l.code}>
            {l.label}
          </option>
        ))}
      </select>
    </label>
  )
}
