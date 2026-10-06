// Every language the app knows how to render. To add one:
//  1. add an entry here (set dir to 'rtl' for right-to-left scripts)
//  2. add src/i18n/locales/<code>/translation.json
//  3. add the code to VITE_ENABLED_LANGUAGES in .env
export const LANGUAGE_REGISTRY = {
  en: { code: 'en', label: 'English', dir: 'ltr' },
  ar: { code: 'ar', label: 'العربية', dir: 'rtl' },
}

const requested = (import.meta.env.VITE_ENABLED_LANGUAGES || 'en,ar')
  .split(',')
  .map((c) => c.trim())
  .filter((c) => LANGUAGE_REGISTRY[c])

export const ENABLED_LANGUAGES = (requested.length ? requested : ['en']).map((c) => LANGUAGE_REGISTRY[c])
export const ENABLED_CODES = ENABLED_LANGUAGES.map((l) => l.code)

const wanted = import.meta.env.VITE_DEFAULT_LANGUAGE
export const DEFAULT_LANGUAGE = ENABLED_CODES.includes(wanted) ? wanted : ENABLED_CODES[0]

// The switcher only appears when there is something to switch between.
export const IS_MULTILINGUAL = ENABLED_LANGUAGES.length > 1

export const getDirection = (code) => LANGUAGE_REGISTRY[code?.split('-')[0]]?.dir ?? 'ltr'
