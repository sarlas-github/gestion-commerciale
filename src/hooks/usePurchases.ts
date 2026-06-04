import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { getApiErrorMessage } from '@/lib/apiError'
import { supabase } from '@/lib/supabase'
import type { Purchase } from '@/types'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface PurchaseItemInput {
  original_id?: string
  product_id: string
  quantity: number
  unit_price: number
  pieces_count: number
}

export interface SupplierPaymentInput {
  date: string
  amount: number
  note?: string
  methode_paiement?: string | null
}

export interface CreatePurchasePayload {
  supplier_id: string
  date: string
  note?: string
  tva_rate?: number
  items: PurchaseItemInput[]
  payments: SupplierPaymentInput[]
}

export interface UpdatePurchasePayload extends CreatePurchasePayload {
  id: string
}

// ── Queries ───────────────────────────────────────────────────────────────────

export const usePurchases = (month?: string, year?: string) =>
  useQuery({
    queryKey: ['purchases', month, year],
    staleTime: 60_000,
    queryFn: async () => {
      let query = supabase
        .from('purchases')
        .select('*, suppliers(id, name)')

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
      return (data ?? []) as Purchase[]
    },
  })

export const usePurchaseYears = () =>
  useQuery({
    queryKey: ['purchases-years'],
    staleTime: 10 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('purchases')
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

export const usePurchase = (id: string) =>
  useQuery({
    queryKey: ['purchases', id],
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('purchases')
        .select('*, suppliers(id, name), purchase_items(*, products(id, name, pieces_count)), supplier_payments(*)')
        .eq('id', id)
        .single()

      if (error) throw error
      return data as Purchase
    },
    enabled: Boolean(id),
  })

// ── Mutations ─────────────────────────────────────────────────────────────────

export const useCreatePurchase = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: CreatePurchasePayload) => {
      const { data: purchaseId, error } = await supabase.rpc('create_purchase', {
        p_supplier_id: payload.supplier_id,
        p_date:        payload.date,
        p_note:        payload.note || null,
        p_tva_rate:    payload.tva_rate ?? 0,
        p_items:       payload.items.map(i => ({
          product_id:   i.product_id,
          quantity:     i.quantity,
          pieces_count: i.pieces_count || 1,
          unit_price:   i.unit_price,
        })),
        p_payments:    payload.payments.map(p => ({
          date:             p.date,
          amount:           p.amount,
          note:             p.note || null,
          methode_paiement: p.methode_paiement || null,
        })),
      })
      if (error) throw error
      return { id: purchaseId as string }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['purchases'] })
      qc.invalidateQueries({ queryKey: ['suppliers'] })
      qc.invalidateQueries({ queryKey: ['unpaid-suppliers-count'] })
      qc.invalidateQueries({ queryKey: ['supplier-report'] })
      qc.invalidateQueries({ queryKey: ['products'] })
      qc.invalidateQueries({ queryKey: ['stock-movements'] })
      qc.invalidateQueries({ queryKey: ['stock-alerts'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
      toast.success('Achat enregistré avec succès')
    },
    onError: (err: Error) => {
      toast.error(getApiErrorMessage(err, "Erreur lors de l'enregistrement"))
    },
  })
}

export const useUpdatePurchase = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: UpdatePurchasePayload) => {
      const { error } = await supabase.rpc('update_purchase', {
        p_id:          payload.id,
        p_supplier_id: payload.supplier_id,
        p_date:        payload.date,
        p_note:        payload.note || null,
        p_tva_rate:    payload.tva_rate ?? 0,
        p_items:       payload.items.map(i => ({
          original_id:  i.original_id || null,
          product_id:   i.product_id,
          quantity:     i.quantity,
          pieces_count: i.pieces_count || 1,
          unit_price:   i.unit_price,
        })),
        p_payments:    payload.payments.map(p => ({
          date:             p.date,
          amount:           p.amount,
          note:             p.note || null,
          methode_paiement: p.methode_paiement || null,
        })),
      })
      if (error) throw error
    },
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ['purchases'] })
      qc.invalidateQueries({ queryKey: ['purchases', id] })
      qc.invalidateQueries({ queryKey: ['suppliers'] })
      qc.invalidateQueries({ queryKey: ['unpaid-suppliers-count'] })
      qc.invalidateQueries({ queryKey: ['supplier-report'] })
      qc.invalidateQueries({ queryKey: ['products'] })
      qc.invalidateQueries({ queryKey: ['stock-movements'] })
      qc.invalidateQueries({ queryKey: ['stock-alerts'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
      toast.success('Achat mis à jour')
    },
    onError: (err: Error) => {
      toast.error(getApiErrorMessage(err, 'Erreur lors de la mise à jour'))
    },
  })
}


export const useCancelPurchase = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.rpc('cancel_transaction', {
        p_id: id,
        p_type: 'purchase',
      })
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['purchases'] })
      qc.invalidateQueries({ queryKey: ['suppliers'] })
      qc.invalidateQueries({ queryKey: ['unpaid-suppliers-count'] })
      qc.invalidateQueries({ queryKey: ['supplier-report'] })
      qc.invalidateQueries({ queryKey: ['supplier-payments-all'] })
      qc.invalidateQueries({ queryKey: ['products'] })
      qc.invalidateQueries({ queryKey: ['stock-movements'] })
      qc.invalidateQueries({ queryKey: ['stock-alerts'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
      toast.success('Achat annulé avec succès')
    },
    onError: (err: Error) => {
      console.error('[useCancelPurchase] raw error:', err)
      toast.error(getApiErrorMessage(err, "Impossible d'annuler cet achat"))
    },
  })
}
