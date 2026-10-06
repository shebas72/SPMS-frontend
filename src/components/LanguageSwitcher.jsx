import { useTranslation } from 'react-i18next'
import { Languages } from 'lucide-react'
import { ENABLED_LANGUAGES, IS_MULTILINGUAL } from '@/config/languages'

export default function LanguageSwitcher() {
  const { i18n, t } = useTranslation()
  // English-only deployments never see a switcher.
  if (!IS_MULTILINGUAL) return null

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
        {ENABLED_LANGUAGES.map((l) => (
          <option key={l.code} value={l.code}>
            {l.label}
          </option>
        ))}
      </select>
    </label>
  )
}
