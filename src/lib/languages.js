import { useAuthStore } from '@/stores/authStore'
import { ENABLED_CODES } from '@/config/languages'

// Language codes the signed-in user's company may use: English, plus Arabic when the company switched it on (and the plan allows it).
// The build's VITE_ENABLED_LANGUAGES stays the outer limit. A session without this info (signed in before the switch existed) gets the build's list.
export function useAvailableLanguages() {
  const languages = useAuthStore((s) => s.user?.company?.languages)
  return Array.isArray(languages) ? ENABLED_CODES.filter((c) => languages.includes(c)) : ENABLED_CODES
}

export const useArabicOn = () => useAvailableLanguages().includes('ar')
