import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { getApiErrorMessage } from '@/lib/apiError'
import { supabase } from '@/lib/supabase'
import type { ClientPayment } from '@/types'

export interface AddClientPaymentPayload {
  sale_id: string
  date: string
  amount: number
  note?: string
  methode_paiement?: string | null
}

export interface ClientPaymentRow {
  id: string
  date: string
  amount: number
  note: string | null
  methode_paiement: string | null
  sale_id: string
  client_id: string | null
  client_name: string
  sale_reference: string | null
}

export const useAllClientPayments = (month?: string, year?: string) =>
  useQuery({
    queryKey: ['client-payments-all', month, year],
    staleTime: 60_000,
    queryFn: async () => {
      let query = supabase
        .from('client_payments')
        .select('*, sales!sale_id(id, reference, clients!client_id(id, name))')

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
      const payments = data ?? []

      return payments.map(p => {
        const sale = Array.isArray(p.sales) ? p.sales[0] : p.sales
        const client = Array.isArray(sale?.clients) ? sale?.clients[0] : sale?.clients
        return {
          id: p.id,
          date: p.date,
          amount: p.amount,
          note: p.note ?? null,
          methode_paiement: p.methode_paiement ?? null,
          sale_id: p.sale_id,
          client_id: client?.id ?? null,
          client_name: client?.name ?? '—',
          sale_reference: sale?.reference ?? null,
        } as ClientPaymentRow
      })
    },
  })

export const useClientPayment = (paymentId: string | null | undefined) =>
  useQuery({
    queryKey: ['client-payment', paymentId],
    staleTime: 60_000,
    queryFn: async () => {
      if (!paymentId) return null
      const { data, error } = await supabase
        .from('client_payments')
        .select('*')
        .eq('id', paymentId)
        .single()
      if (error) throw error
      return data as ClientPayment
    },
    enabled: Boolean(paymentId),
  })

export const useAddClientPayment = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: AddClientPaymentPayload) => {
      const { data: paymentId, error } = await supabase.rpc('create_client_payment', {
        p_sale_id:          payload.sale_id,
        p_date:             payload.date,
        p_amount:           payload.amount,
        p_note:             payload.note || null,
        p_methode_paiement: payload.methode_paiement || null,
      })
      if (error) throw error
      return { id: paymentId as string }
    },
    onSuccess: (_, { sale_id }) => {
      qc.invalidateQueries({ queryKey: ['sales'] })
      qc.invalidateQueries({ queryKey: ['sales', sale_id] })
      qc.invalidateQueries({ queryKey: ['clients'] })
      qc.invalidateQueries({ queryKey: ['unpaid-clients-count'] })
      qc.invalidateQueries({ queryKey: ['client-payments-all'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
      toast.success('Paiement enregistré')
    },
    onError: (err: Error) => {
      toast.error(getApiErrorMessage(err, "Erreur lors de l'enregistrement du paiement"))
    },
  })
}
