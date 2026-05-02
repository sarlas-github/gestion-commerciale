import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

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

export const useAllClientPayments = () =>
  useQuery({
    queryKey: ['client-payments-all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('client_payments')
        .select('*, sales!sale_id(id, reference, clients!client_id(id, name))')
        .order('date', { ascending: false })

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
