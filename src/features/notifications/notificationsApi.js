import api from '@/lib/api'

export const fetchNotifications = async (params = {}) => (await api.get('/notifications', { params })).data
export const markRead = async (id) => (await api.post(`/notifications/${id}/read`)).data
export const markAllRead = async () => (await api.post('/notifications/read-all')).data
export const fetchPreferences = async () => (await api.get('/notification-preferences')).data.data
export const savePreferences = async (prefs) => (await api.put('/notification-preferences', prefs)).data.data