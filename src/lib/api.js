import axios from 'axios'
import i18n from '@/i18n'
import { useAuthStore } from '@/stores/authStore'
import { toast } from '@/lib/toast'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1',
  headers: { Accept: 'application/json' },
})

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token
  if (token) config.headers.Authorization = `Bearer ${token}`
  config.headers['Accept-Language'] = (i18n.language || 'en').split('-')[0]
  return config
})

// One error toast every 8 seconds at most, so a server that is down does not flood the screen.
let lastErrorToast = 0

function toastServerError(error) {
  if (axios.isCancel(error) || error.config?.silent) return
  if (Date.now() - lastErrorToast < 8000) return

  if (!error.response) {
    lastErrorToast = Date.now()
    toast.error(i18n.t('auth.networkError', "Can't reach the server. Check your connection and try again."))
  } else if (error.response.status >= 500) {
    lastErrorToast = Date.now()
    toast.error(i18n.t('errors.server', 'Something went wrong on our side. Please try again in a moment.'))
  }
}

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const isLogin = error.config?.url?.includes('/auth/login')
    if (error.response?.status === 401 && !isLogin) {
      useAuthStore.getState().clear()
      if (window.location.pathname !== '/login') window.location.assign('/login')
    }
    toastServerError(error)
    return Promise.reject(error)
  },
)

export default api