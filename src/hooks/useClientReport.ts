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

export const useClientReport = (year: number, month: number) => {
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`
  const lastDay = new Date(year, month, 0).getDate()
  const endDate = `${year}-${String(month).padStart(2, '0')}-${lastDay}`

  return useQuery({
    queryKey: ['client-report', year, month],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sales')
        .select('total, paid, remaining, clients(id, name)')
        .gte('date', startDate)
        .lte('date', endDate)

      if (error) throw error

      const map = new Map<string, ClientReportRow>()

      for (const sale of data ?? []) {
        const client = Array.isArray(sale.clients) ? sale.clients[0] : sale.clients
        const clientId = client?.id ?? '__unknown__'
        const clientName = client?.name ?? '—'

        if (!map.has(clientId)) {
          map.set(clientId, { client_id: clientId, client_name: clientName, total_ventes: 0, total_paye: 0, reste: 0 })
        }

        const row = map.get(clientId)!
        row.total_ventes += sale.total
        row.total_paye += sale.paid
        row.reste += sale.remaining
      }

      const rows = Array.from(map.values()).sort((a, b) =>
        a.client_name.localeCompare(b.client_name, 'fr')
      )

      const totals = rows.reduce(
        (acc, r) => ({
          total_ventes: acc.total_ventes + r.total_ventes,
          total_paye: acc.total_paye + r.total_paye,
          reste: acc.reste + r.reste,
        }),
        { total_ventes: 0, total_paye: 0, reste: 0 }
      )

      return { rows, totals } as ClientReportData
    },
  })
}
