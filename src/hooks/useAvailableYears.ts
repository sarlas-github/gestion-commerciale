import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export const useAvailableYears = (table: 'sales' | 'purchases') => {
  return useQuery({
    queryKey: ['available-years', table],
    staleTime: 10 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_available_years', { p_table: table })
      if (error) throw error
      const currentYear = new Date().getFullYear()
      const years: number[] = data ?? []
      if (!years.includes(currentYear)) years.unshift(currentYear)
      return years
    },
  })
}
