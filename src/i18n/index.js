import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import { ENABLED_CODES, DEFAULT_LANGUAGE, getDirection } from '@/config/languages'

// Pick up every src/i18n/locales/<code>/translation.json, keep only enabled languages.
const files = import.meta.glob('./locales/*/translation.json', { eager: true })
const resources = {}
for (const [path, mod] of Object.entries(files)) {
  const code = path.split('/')[2]
  if (ENABLED_CODES.includes(code)) resources[code] = { translation: mod.default }
}

function applyDocumentLanguage(lng) {
  const code = (lng || DEFAULT_LANGUAGE).split('-')[0]
  document.documentElement.lang = code
  document.documentElement.dir = getDirection(code)
}

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: DEFAULT_LANGUAGE,
    supportedLngs: ENABLED_CODES,
    nonExplicitSupportedLngs: true,
    load: 'languageOnly',
    interpolation: { escapeValue: false },
    detection: {
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: 'spms_lang',
      caches: ['localStorage'],
    },
  })

applyDocumentLanguage(i18n.language)
i18n.on('languageChanged', applyDocumentLanguage)

export default i18n
