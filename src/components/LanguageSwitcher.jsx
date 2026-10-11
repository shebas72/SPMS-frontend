import { useTranslation } from 'react-i18next'
import { useAuthStore } from '@/stores/authStore'
import { Languages } from 'lucide-react'
import { ENABLED_LANGUAGES, IS_MULTILINGUAL } from '@/config/languages'

export default function LanguageSwitcher() {
  const { i18n, t } = useTranslation()
  const arabicAllowed = useAuthStore((s) => s.user?.company?.features?.arabic) !== false
  // English-only deployments never see a switcher; a plan without Arabic loses that option.
  const languages = ENABLED_LANGUAGES.filter((l) => l.code !== 'ar' || arabicAllowed)
  if (!IS_MULTILINGUAL || languages.length < 2) return null

  const current = (i18n.language || '').split('-')[0]
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
