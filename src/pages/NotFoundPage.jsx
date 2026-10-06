import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

export default function NotFoundPage() {
  const { t } = useTranslation()
  return (
    <div>
      <h1 className="text-2xl font-semibold">{t('common.notFoundTitle')}</h1>
      <Link to="/" className="mt-3 inline-block text-brand underline">{t('common.backHome')}</Link>
    </div>
  )
}
