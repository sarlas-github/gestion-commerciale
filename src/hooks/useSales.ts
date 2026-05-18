import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { getApiErrorMessage } from '@/lib/apiError'
import { supabase } from '@/lib/supabase'
import { toISODate } from '@/lib/utils'
import type { Sale } from '@/types'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface SaleItemInput {
  original_id?: string
  product_id: string
  quantity: number
  pieces_count: number
  unit_price: number
}

export interface SalePaymentInput {
  date: string
  amount: number
  note?: string
  methode_paiement?: string | null
}

export interface CreateSalePayload {
  client_id: string
  date: string
  note?: string
  tva_rate?: number
  items: SaleItemInput[]
  payments: SalePaymentInput[]
}

export interface UpdateSalePayload extends CreateSalePayload {
  id: string
}

// ── Queries ───────────────────────────────────────────────────────────────────

export const useSales = (month?: string, year?: string) =>
  useQuery({
    queryKey: ['sales', month, year],
    staleTime: 60_000,
    queryFn: async () => {
      let query = supabase
        .from('sales')
        .select('*, clients(id, name), documents!sale_id(id, type)')

      if (year && year !== '') {
        if (month && month !== '') {
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
      return (data ?? []) as Sale[]
    },
  })

export const useSalesYears = () =>
  useQuery({
    queryKey: ['sales-years'],
    staleTime: 10 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sales')
        .select('date')
        .order('date', { ascending: true })
        .limit(1)
        .maybeSingle()

      if (error) throw error
      
      const currentYear = new Date().getFullYear()
      if (!data) return [currentYear]
      
      const firstYear = new Date(data.date).getFullYear()
      const years = []
      for (let y = currentYear; y >= firstYear; y--) {
        years.push(y)
      }
      return years
    },
  })

export const useSale = (id: string) =>
  useQuery({
    queryKey: ['sales', id],
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sales')
        .select('*, clients(id, name, address, phone, ice), sale_items(*, products(id, name, pieces_count)), client_payments(*)')
        .eq('id', id)
        .single()

      if (error) throw error
      return data as Sale
    },
    enabled: Boolean(id),
  })

// ── Mutations ─────────────────────────────────────────────────────────────────

export const useCreateSale = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: CreateSalePayload) => {
      const { data: saleId, error } = await supabase.rpc('create_sale', {
        p_client_id: payload.client_id,
        p_date:      payload.date || toISODate(new Date()),
        p_note:      payload.note || null,
        p_tva_rate:  payload.tva_rate ?? 0,
        p_items:     payload.items.map(i => ({
          product_id:   i.product_id,
          quantity:     i.quantity,
          pieces_count: i.pieces_count || 1,
          unit_price:   i.unit_price,
        })),
        p_payments:  payload.payments.map(p => ({
          date:             p.date,
          amount:           p.amount,
          note:             p.note || null,
          methode_paiement: p.methode_paiement || null,
        })),
      })
      if (error) throw error
      return { id: saleId as string }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sales'] })
      qc.invalidateQueries({ queryKey: ['clients'] })
      qc.invalidateQueries({ queryKey: ['unpaid-clients-count'] })
      qc.invalidateQueries({ queryKey: ['products'] })
      qc.invalidateQueries({ queryKey: ['stock-movements'] })
      qc.invalidateQueries({ queryKey: ['stock-alerts'] })
      qc.invalidateQueries({ queryKey: ['documents'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
      toast.success('Vente enregistrée avec succès')
    },
    onError: (err: Error) => {
      toast.error(getApiErrorMessage(err, "Erreur lors de l'enregistrement"))
    },
  })
}

export const useUpdateSale = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: UpdateSalePayload) => {
      const { error } = await supabase.rpc('update_sale', {
        p_id:        payload.id,
        p_client_id: payload.client_id,
        p_date:      payload.date,
        p_note:      payload.note || null,
        p_tva_rate:  payload.tva_rate ?? 0,
        p_items:     payload.items.map(i => ({
          original_id:  i.original_id || null,
          product_id:   i.product_id,
          quantity:     i.quantity,
          pieces_count: i.pieces_count || 1,
          unit_price:   i.unit_price,
        })),
        p_payments:  payload.payments.map(p => ({
          date:             p.date,
          amount:           p.amount,
          note:             p.note || null,
          methode_paiement: p.methode_paiement || null,
        })),
      })
      if (error) throw error
    },
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ['sales'] })
      qc.invalidateQueries({ queryKey: ['sales', id] })
      qc.invalidateQueries({ queryKey: ['clients'] })
      qc.invalidateQueries({ queryKey: ['unpaid-clients-count'] })
      qc.invalidateQueries({ queryKey: ['products'] })
      qc.invalidateQueries({ queryKey: ['stock-movements'] })
      qc.invalidateQueries({ queryKey: ['stock-alerts'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
      toast.success('Vente mise à jour')
    },
    onError: (err: Error) => {
      toast.error(getApiErrorMessage(err, 'Erreur lors de la mise à jour'))
    },
  })
}


export const useCancelSale = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.rpc('cancel_transaction', {
        p_id: id,
        p_type: 'sale',
      })
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sales'] })
      qc.invalidateQueries({ queryKey: ['clients'] })
      qc.invalidateQueries({ queryKey: ['unpaid-clients-count'] })
      qc.invalidateQueries({ queryKey: ['products'] })
      qc.invalidateQueries({ queryKey: ['stock-movements'] })
      qc.invalidateQueries({ queryKey: ['stock-alerts'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
      toast.success('Vente annulée avec succès')
    },
    onError: (err: Error) => {
      console.error('[useCancelSale] raw error:', err)
      toast.error(getApiErrorMessage(err, "Impossible d'annuler cette vente"))
    },
  })
}
