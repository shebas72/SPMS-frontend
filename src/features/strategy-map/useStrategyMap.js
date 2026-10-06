import { useQuery } from '@tanstack/react-query'
import api from '@/lib/api'

// Objectives and KPIs share the dashboard's period: empty params let the API pick its defaults.
export function useStrategyMap({ year, month } = {}) {
  const params = { year, month }
  const key = [year ?? null, month ?? null]
  const objectives = useQuery({
    queryKey: ['objectives', ...key],
    queryFn: async () => (await api.get('/dashboard/objectives', { params })).data.data,
    placeholderData: (prev) => prev,
  })
  const kpis = useQuery({
    queryKey: ['classification', ...key],
    queryFn: async () => {
      const { groups } = (await api.get('/dashboard/classification', { params })).data.data
      return Object.values(groups).flat()
    },
    placeholderData: (prev) => prev,
  })
  return { objectives, kpis }
}
