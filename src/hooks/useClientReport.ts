import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export interface ClientReportRow {
  client_id: string
  client_name: string
  total_ventes: number
  total_paye: number
  reste: number
}

export interface ClientReportData {
  rows: ClientReportRow[]
  totals: { total_ventes: number; total_paye: number; reste: number }
}

// month=0 signifie toute l'année
export const useClientReport = (year: number, month: number) => {
  return useQuery({
    queryKey: ['client-report', year, month],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_client_report', {
        p_year:  year,
        p_month: month,
      })
      if (error) throw error
      return data as unknown as ClientReportData
    },
  })
}
