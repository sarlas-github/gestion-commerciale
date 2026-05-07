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
  products: Pick<Product, 'id' | 'name'> | null
  refLabel: string | null // référence lisible ex. "ACH-001" pour les achats
}

export const useStockMovements = () =>
  useQuery({
    queryKey: ['stock-movements'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('stock_movements')
        .select('*, products(id, name)')
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
