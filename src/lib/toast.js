import { useToastStore } from '@/stores/toastStore'

const push = (level) => (message, options = {}) => useToastStore.getState().push({ level, message, ...options })

// Usage anywhere (components, mutations, API client): toast.success('Saved'), toast.error('Could not save')
export const toast = {
  success: push('success'),
  error: push('danger'),
  warning: push('warning'),
  info: push('info'),
}