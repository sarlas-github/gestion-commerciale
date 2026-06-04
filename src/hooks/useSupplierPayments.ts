import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { getApiErrorMessage } from '@/lib/apiError'
import { supabase } from '@/lib/supabase'

export interface AddSupplierPaymentPayload {
  purchase_id: string
  date: string
  amount: number
  note?: string
  methode_paiement?: string | null
}

export interface SupplierPaymentRow {
  id: string
  date: string
  amount: number
  note: string | null
  methode_paiement: string | null
  purchase_id: string
  supplier_id: string | null
  supplier_name: string
  purchase_reference: string | null
}

export const useAllSupplierPayments = (month?: string, year?: string) =>
  useQuery({
    queryKey: ['supplier-payments-all', month, year],
    staleTime: 60_000,
    queryFn: async () => {
      let query = supabase
        .from('supplier_payments')
        .select('*, purchases(id, reference, suppliers(id, name))')

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

      const { data, error } = await query.order('date', { ascending: false })

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
          supplier_id: supplier?.id ?? null,
          supplier_name: supplier?.name ?? '—',
          purchase_reference: purchase?.reference ?? null,
        } as SupplierPaymentRow
      })
    },
  })

export const useAddSupplierPayment = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: AddSupplierPaymentPayload) => {
      const { data: paymentId, error } = await supabase.rpc('create_supplier_payment', {
        p_purchase_id:      payload.purchase_id,
        p_date:             payload.date,
        p_amount:           payload.amount,
        p_note:             payload.note || null,
        p_methode_paiement: payload.methode_paiement || null,
      })
      if (error) throw error
      return { id: paymentId as string }
    },
    onSuccess: (_, { purchase_id }) => {
      qc.invalidateQueries({ queryKey: ['purchases'] })
      qc.invalidateQueries({ queryKey: ['purchases', purchase_id] })
      qc.invalidateQueries({ queryKey: ['suppliers'] })
      qc.invalidateQueries({ queryKey: ['unpaid-suppliers-count'] })
      qc.invalidateQueries({ queryKey: ['supplier-report'] })
      qc.invalidateQueries({ queryKey: ['supplier-payments-all'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
      toast.success('Paiement enregistré')
    },
    onError: (err: Error) => {
      toast.error(getApiErrorMessage(err, "Erreur lors de l'enregistrement du paiement"))
    },
  })
}
