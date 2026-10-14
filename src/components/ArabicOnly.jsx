import { useArabicOn } from '@/lib/languages'

/** Wraps something that exists only for Arabic (the Arabic name inputs): hidden when the company has Arabic switched off. */
export default function ArabicOnly({ children }) {
  return useArabicOn() ? children : null
}
