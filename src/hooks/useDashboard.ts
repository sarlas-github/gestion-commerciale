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

const MONTHS_SHORT = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jui', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc']

// month=0 signifie toute l'année
export const useDashboard = (year: number, month: number) => {
  const startDate = month === 0
    ? `${year}-01-01`
    : `${year}-${String(month).padStart(2, '0')}-01`
  const endDate = month === 0
    ? `${year}-12-31`
    : `${year}-${String(month).padStart(2, '0')}-${new Date(year, month, 0).getDate()}`
  const lastDay = month === 0 ? 0 : new Date(year, month, 0).getDate()

  return useQuery({
    queryKey: ['dashboard', year, month],
    queryFn: async () => {
      const [salesRes, purchasesRes, alertsRes] = await Promise.all([
        supabase
          .from('sales')
          .select('date, total, paid, remaining, clients(id, name), sale_items(quantity, unit_price, products(id, name))')
          .gte('date', startDate)
          .lte('date', endDate),
        supabase
          .from('purchases')
          .select('total, paid, remaining')
          .gte('date', startDate)
          .lte('date', endDate),
        supabase
          .from('products')
          .select('id, name, stock_alert, stock(quantity)'),
      ])

      if (salesRes.error) throw salesRes.error
      if (purchasesRes.error) throw purchasesRes.error
      if (alertsRes.error) throw alertsRes.error

      const sales = salesRes.data ?? []
      const purchases = purchasesRes.data ?? []
      const allProducts = alertsRes.data ?? []

      // ── KPIs ──────────────────────────────────────────────────────────
      const ca = sales.reduce((s, x) => s + x.total, 0)
      const encaisse = sales.reduce((s, x) => s + x.paid, 0)
      const aRecevoir = sales.reduce((s, x) => s + x.remaining, 0)
      const totalAchats = purchases.reduce((s, x) => s + x.total, 0)
      const decaisse = purchases.reduce((s, x) => s + x.paid, 0)
      const aPayer = purchases.reduce((s, x) => s + x.remaining, 0)
      const nbVentes = sales.length
      const marge = ca - totalAchats
      const panierMoyen = nbVentes > 0 ? ca / nbVentes : 0

      // ── Évolution des ventes ──────────────────────────────────────────
      let ventesParJour: { day: string; total: number }[]

      if (month === 0) {
        // Vue annuelle : agrégation par mois
        const ventesMap = new Map<string, number>()
        for (const sale of sales) {
          const monthIdx = parseInt(sale.date.slice(5, 7)) - 1
          const key = MONTHS_SHORT[monthIdx]
          ventesMap.set(key, (ventesMap.get(key) ?? 0) + sale.total)
        }
        ventesParJour = MONTHS_SHORT.map((m) => ({ day: m, total: ventesMap.get(m) ?? 0 }))
      } else {
        // Vue mensuelle : agrégation par jour
        const ventesMap = new Map<string, number>()
        for (const sale of sales) {
          const day = sale.date.slice(8, 10)
          ventesMap.set(day, (ventesMap.get(day) ?? 0) + sale.total)
        }
        ventesParJour = Array.from({ length: lastDay }, (_, i) => {
          const day = String(i + 1).padStart(2, '0')
          return { day: String(i + 1), total: ventesMap.get(day) ?? 0 }
        })
      }

      // ── Top 5 clients ─────────────────────────────────────────────────
      const clientsMap = new Map<string, { name: string; total: number }>()
      for (const sale of sales) {
        const client = Array.isArray(sale.clients) ? sale.clients[0] : sale.clients
        const cid = client?.id ?? '__unknown__'
        if (!clientsMap.has(cid)) clientsMap.set(cid, { name: client?.name ?? '—', total: 0 })
        clientsMap.get(cid)!.total += sale.total
      }
      const top5Clients = Array.from(clientsMap.values())
        .sort((a, b) => b.total - a.total)
        .slice(0, 5)

      // ── Produits (top 5 + répartition) ───────────────────────────────
      const produitsMap = new Map<string, { name: string; total: number }>()
      for (const sale of sales) {
        const items = Array.isArray(sale.sale_items) ? sale.sale_items : []
        for (const item of items) {
          const product = Array.isArray(item.products) ? item.products[0] : item.products
          const pid = product?.id ?? '__unknown__'
          if (!produitsMap.has(pid)) produitsMap.set(pid, { name: product?.name ?? '—', total: 0 })
          produitsMap.get(pid)!.total += item.quantity * item.unit_price
        }
      }
      const sortedProduits = Array.from(produitsMap.values()).sort((a, b) => b.total - a.total)
      const top5Produits = sortedProduits.slice(0, 5)
      const repartitionProduits = sortedProduits.slice(0, 8).map(p => ({ name: p.name, value: p.total }))

      // ── Stock alerts ──────────────────────────────────────────────────
      const stockAlerts = allProducts
        .map(p => {
          const stockArr = Array.isArray(p.stock) ? p.stock : [p.stock].filter(Boolean)
          const qty = (stockArr as Array<{ quantity: number }>)[0]?.quantity ?? 0
          return {
            id: p.id,
            name: p.name,
            quantity: qty,
            stock_alert: p.stock_alert ?? 0,
            status: (qty === 0 ? 'rupture' : 'faible') as 'rupture' | 'faible',
          }
        })
        .filter(p => p.quantity === 0 || p.quantity <= p.stock_alert)
        .sort((a, b) => a.quantity - b.quantity)

      return {
        ca, encaisse, aRecevoir, totalAchats, decaisse, aPayer, nbVentes, marge, panierMoyen,
        ventesParJour, top5Produits, top5Clients, repartitionProduits,
        stockAlerts,
      } as DashboardData
    },
  })
}
