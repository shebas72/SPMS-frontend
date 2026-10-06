import api from '@/lib/api'

// Pages through a list endpoint. Handles resource collections (meta.last_page) and raw paginators (last_page).
export async function fetchAll(url, params = {}, perPage = 100) {
  const rows = []
  for (let page = 1; ; page++) {
    const { data } = await api.get(url, { params: { ...params, per_page: perPage, page } })
    rows.push(...data.data)
    if (page >= (data.meta?.last_page ?? data.last_page ?? 1)) return rows
  }
}
