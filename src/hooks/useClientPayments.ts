import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export interface ClientPaymentRow {
  id: string
  date: string
  amount: number
  note: string | null
  sale_id: string
  client_name: string
  doc_number: string | null
}

export const useAllClientPayments = () =>
  useQuery({
    queryKey: ['client-payments-all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('client_payments')
        .select('*, sales(id, clients(id, name))')
        .order('date', { ascending: false })

      if (error) throw error
      const payments = data ?? []

      const saleIds = [...new Set(payments.map(p => p.sale_id).filter(Boolean))]
      const docMap: Record<string, string | null> = {}

      if (saleIds.length > 0) {
        const { data: docs } = await supabase
          .from('documents')
          .select('sale_id, number')
          .in('sale_id', saleIds)
          .eq('type', 'invoice')

        docs?.forEach(d => { docMap[d.sale_id] = d.number })
      }

      return payments.map(p => {
        const sale = Array.isArray(p.sales) ? p.sales[0] : p.sales
        const client = Array.isArray(sale?.clients) ? sale?.clients[0] : sale?.clients
        return {
          id: p.id,
          date: p.date,
          amount: p.amount,
          note: p.note ?? null,
          sale_id: p.sale_id,
          client_name: client?.name ?? '—',
          doc_number: docMap[p.sale_id] ?? null,
        } as ClientPaymentRow
      })
    },
  })
