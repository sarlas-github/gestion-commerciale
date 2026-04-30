import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export interface SupplierPaymentRow {
  id: string
  date: string
  amount: number
  note: string | null
  methode_paiement: string | null
  purchase_id: string
  supplier_name: string
  purchase_reference: string | null
}

export const useAllSupplierPayments = () =>
  useQuery({
    queryKey: ['supplier-payments-all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('supplier_payments')
        .select('*, purchases(id, reference, suppliers(id, name))')
        .order('date', { ascending: false })

      if (error) throw error

      return (data ?? []).map(p => {
        const purchase = Array.isArray(p.purchases) ? p.purchases[0] : p.purchases
        const supplier = Array.isArray(purchase?.suppliers) ? purchase?.suppliers[0] : purchase?.suppliers
        return {
          id: p.id,
          date: p.date,
          amount: p.amount,
          note: p.note ?? null,
          methode_paiement: p.methode_paiement ?? null,
          purchase_id: p.purchase_id,
          supplier_name: supplier?.name ?? '—',
          purchase_reference: purchase?.reference ?? null,
        } as SupplierPaymentRow
      })
    },
  })
