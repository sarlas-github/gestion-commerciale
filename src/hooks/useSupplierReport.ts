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
  const startDate = month === 0
    ? `${year}-01-01`
    : `${year}-${String(month).padStart(2, '0')}-01`
  const endDate = month === 0
    ? `${year}-12-31`
    : `${year}-${String(month).padStart(2, '0')}-${new Date(year, month, 0).getDate()}`

  return useQuery({
    queryKey: ['supplier-report', year, month],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('purchases')
        .select('total, paid, remaining, suppliers(id, name)')
        .gte('date', startDate)
        .lte('date', endDate)

      if (error) throw error

      const map = new Map<string, SupplierReportRow>()

      for (const purchase of data ?? []) {
        const supplier = Array.isArray(purchase.suppliers) ? purchase.suppliers[0] : purchase.suppliers
        const supplierId = supplier?.id ?? '__unknown__'
        const supplierName = supplier?.name ?? '—'

        if (!map.has(supplierId)) {
          map.set(supplierId, { supplier_id: supplierId, supplier_name: supplierName, total_achats: 0, total_paye: 0, reste: 0 })
        }

        const row = map.get(supplierId)!
        row.total_achats += purchase.total
        row.total_paye += purchase.paid
        row.reste += purchase.remaining
      }

      const rows = Array.from(map.values()).sort((a, b) =>
        a.supplier_name.localeCompare(b.supplier_name, 'fr')
      )

      const totals = rows.reduce(
        (acc, r) => ({
          total_achats: acc.total_achats + r.total_achats,
          total_paye: acc.total_paye + r.total_paye,
          reste: acc.reste + r.reste,
        }),
        { total_achats: 0, total_paye: 0, reste: 0 }
      )

      return { rows, totals } as SupplierReportData
    },
  })
}
