import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export type TableWithDate = 'sales' | 'purchases' | 'stock_movements' | 'client_payments' | 'supplier_payments'

export const useAvailableYears = (table: TableWithDate) => {
  return useQuery({
    queryKey: ['available-years', table],
    staleTime: 10 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from(table)
        .select('date')
        .order('date', { ascending: true })
        .limit(1)
        .maybeSingle()

      if (error) throw error

      const currentYear = new Date().getFullYear()
      if (!data) return [currentYear]

      const firstYear = new Date(data.date).getFullYear()
      const years: number[] = []
      for (let y = currentYear; y >= firstYear; y--) {
        years.push(y)
      }

      return years
    },
  })
}
