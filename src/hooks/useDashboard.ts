import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export interface StockAlertItem {
  id: string
  name: string
  quantity: number
  stock_alert: number
  status: 'rupture' | 'faible'
}

export interface DashboardData {
  ca: number
  encaisse: number
  aRecevoir: number
  totalAchats: number
  decaisse: number
  aPayer: number
  nbVentes: number
  marge: number
  panierMoyen: number
  ventesParJour: { day: string; total: number }[]
  top5Produits: { name: string; total: number }[]
  top5Clients: { name: string; total: number }[]
  repartitionProduits: { name: string; value: number }[]
  stockAlerts: StockAlertItem[]
}

// month=0 signifie toute l'année
export const useDashboard = (year: number, month: number) => {
  return useQuery({
    queryKey: ['dashboard', year, month],
    staleTime: 2 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_dashboard_stats', {
        p_year: year,
        p_month: month,
      })
      if (error) throw error
      return data as unknown as DashboardData
    },
  })
}
