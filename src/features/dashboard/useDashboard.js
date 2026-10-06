import { useQuery } from '@tanstack/react-query'
import api from '@/lib/api'

// year/month are optional: the API defaults to the latest KPI year and latest entered month.
export function useDashboard({ year, month } = {}) {
  return useQuery({
    queryKey: ['dashboard', year ?? null, month ?? null],
    queryFn: async () => {
      const { data } = await api.get('/dashboard', { params: { year, month } })
      return data.data
    },
    placeholderData: (prev) => prev,
  })
}
