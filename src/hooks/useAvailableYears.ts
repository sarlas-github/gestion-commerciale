import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export const useAvailableYears = (table: 'sales' | 'purchases') => {
  return useQuery({
    queryKey: ['available-years', table],
    queryFn: async () => {
      const { data, error } = await supabase.from(table).select('date')
      if (error) throw error
      const currentYear = new Date().getFullYear()
      const years = [
        ...new Set((data ?? []).map((r) => new Date(r.date).getFullYear())),
      ].sort((a, b) => b - a)
      if (!years.includes(currentYear)) years.unshift(currentYear)
      return years
    },
    staleTime: 5 * 60 * 1000,
  })
}
