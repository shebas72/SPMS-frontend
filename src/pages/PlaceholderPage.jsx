import { useTranslation } from 'react-i18next'

export default function PlaceholderPage({ titleKey }) {
  const { t } = useTranslation()
  return (
    <div>
      <h1 className="text-2xl font-semibold">{t(titleKey)}</h1>
      <p className="mt-2 text-muted">{t('common.pageInProgress')}</p>
    </div>
  )
}
