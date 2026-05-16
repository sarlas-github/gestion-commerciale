import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Product } from '@/types'

// DB stocke les types en minuscules (voir GOTCHAS.md)
export interface StockMovementRow {
  id: string
  user_id: string
  product_id: string
  type: 'in' | 'out' | 'adjust'
  quantity: number
  reference_type: 'purchase' | 'sale' | 'manual'
  reference_id: string | null
  note: string | null
  date: string
  created_at: string
  products: Pick<Product, 'id' | 'name' | 'nature'> | null
  stock_avant: number | null
  stock_apres: number | null
  refLabel: string | null // référence lisible ex. "ACH-001" pour les achats
}

export const useStockMovements = (month?: string, year?: string) =>
  useQuery({
    queryKey: ['stock-movements', month, year],
    queryFn: async () => {
      let query = supabase
        .from('stock_movements')
        .select('*, products(id, name, nature)')

      if (year && year !== '') {
        if (month && month !== '0' && month !== '') {
          const m = parseInt(month)
          const y = parseInt(year)
          const startDate = `${y}-${String(m).padStart(2, '0')}-01`
          const endDateObj = new Date(y, m, 0)
          const endDate = `${y}-${String(m).padStart(2, '0')}-${String(endDateObj.getDate()).padStart(2, '0')}`
          query = query.gte('date', startDate).lte('date', endDate)
        } else {
          const startDate = `${year}-01-01`
          const endDate = `${year}-12-31`
          query = query.gte('date', startDate).lte('date', endDate)
        }
      }

      const { data, error } = await query
        .order('date', { ascending: false })
        .order('created_at', { ascending: false })

      if (error) throw error
      const movements = (data ?? []) as Omit<StockMovementRow, 'refLabel'>[]

      // Batch-fetch les références (Achats et Ventes) pour afficher ex. "ACH-001" ou "VEN-001"
      const purchaseIds = [
        ...new Set(
          movements
            .filter(m => m.reference_type === 'purchase' && m.reference_id)
            .map(m => m.reference_id!)
        ),
      ]
      const saleIds = [
        ...new Set(
          movements
            .filter(m => m.reference_type === 'sale' && m.reference_id)
            .map(m => m.reference_id!)
        ),
      ]

      let refMap: Record<string, string | null> = {}
      
      if (purchaseIds.length > 0) {
        const { data: purchases } = await supabase
          .from('purchases')
          .select('id, reference')
          .in('id', purchaseIds)
        purchases?.forEach(p => {
          refMap[p.id] = p.reference ?? null
        })
      }

      if (saleIds.length > 0) {
        const { data: sales } = await supabase
          .from('sales')
          .select('id, reference')
          .in('id', saleIds)
        sales?.forEach(s => {
          refMap[s.id] = s.reference ?? null
        })
      }

      return movements.map(m => ({
        ...m,
        refLabel:
          (m.reference_type === 'purchase' || m.reference_type === 'sale') && m.reference_id
            ? (refMap[m.reference_id] ?? null)
            : null,
      })) as StockMovementRow[]
    },
  })
