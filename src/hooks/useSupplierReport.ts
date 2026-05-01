import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export interface SupplierReportRow {
  supplier_id: string
  supplier_name: string
  total_achats: number
  total_paye: number
  reste: number
}

export interface SupplierReportData {
  rows: SupplierReportRow[]
  totals: { total_achats: number; total_paye: number; reste: number }
}

// month=0 signifie toute l'année
export const useSupplierReport = (year: number, month: number) => {
  return useQuery({
    queryKey: ['supplier-report', year, month],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_supplier_report', {
        p_year:  year,
        p_month: month,
      })
      if (error) throw error
      return data as unknown as SupplierReportData
    },
  })
}
