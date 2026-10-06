import api from '@/lib/api'

// If your Laravel routes differ, change them here and nowhere else.
export const AUTH_ENDPOINTS = {
  login: '/auth/login',
  me: '/auth/me',
  logout: '/auth/logout',
}


// The API may wrap payloads in { data: ... }; accept both shapes.
const unwrap = (body) => body?.data ?? body

export async function login({ email, password }) {
  const { data } = await api.post(AUTH_ENDPOINTS.login, { email, password })
  const payload = unwrap(data)
  const token = payload.token ?? payload.access_token ?? data.token ?? data.access_token
  const user = payload.user ? { ...payload.user, company: payload.company } : (data.user ?? null)
  return { token, user }
}

export async function fetchMe() {
  const { data } = await api.get(AUTH_ENDPOINTS.me)
  const payload = unwrap(data)
  return payload.user ? { ...payload.user, company: payload.company } : payload
}

export async function logout() {
  try {
    await api.post(AUTH_ENDPOINTS.logout)
  } catch {
    // Signing out locally must work even if the token is already invalid.
  }
}
