import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { getPaymentStatus } from '@/lib/utils'
import type { Purchase } from '@/types'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface PurchaseItemInput {
  product_id: string
  quantity: number
  unit_price: number
}

export interface SupplierPaymentInput {
  date: string
  amount: number
  note: string
}

export interface CreatePurchasePayload {
  supplier_id: string
  date: string
  reference: string
  note: string
  items: PurchaseItemInput[]
  payments: SupplierPaymentInput[]
}

// ── Helper ────────────────────────────────────────────────────────────────────

async function getCurrentUser() {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Non authentifié')
  return user
}

// ── Queries ───────────────────────────────────────────────────────────────────

export const usePurchases = () =>
  useQuery({
    queryKey: ['purchases'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('purchases')
        .select('*, suppliers(id, name)')
        .order('date', { ascending: false })

      if (error) throw error
      return (data ?? []) as Purchase[]
    },
  })

export const usePurchase = (id: string) =>
  useQuery({
    queryKey: ['purchases', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('purchases')
        .select('*, suppliers(id, name), purchase_items(*, products(id, name)), supplier_payments(*)')
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
      const user = await getCurrentUser()
      const uid = user.id
      const today = new Date().toISOString().split('T')[0]

      // 1. Calculs
      const total = payload.items.reduce((s, i) => s + i.quantity * i.unit_price, 0)
      const paid = payload.payments.reduce((s, p) => s + p.amount, 0)
      const status = getPaymentStatus(paid, total)

      // 2. INSERT purchase
      const { data: purchase, error: pErr } = await supabase
        .from('purchases')
        .insert({
          user_id: uid,
          supplier_id: payload.supplier_id,
          reference: payload.reference || null,
          date: payload.date,
          total,
          paid,
          status,
          note: payload.note || null,
        })
        .select()
        .single()

      if (pErr) throw pErr

      // Helper rollback — supprime l'achat orphelin si une étape suivante échoue
      const rollback = async () => {
        await supabase.from('purchases').delete().eq('id', purchase.id)
      }

      // 3. INSERT purchase_items
      if (payload.items.length > 0) {
        const { error: itemErr } = await supabase
          .from('purchase_items')
          .insert(
            payload.items.map(i => ({
              purchase_id: purchase.id,
              product_id: i.product_id,
              quantity: i.quantity,
              unit_price: i.unit_price,
            }))
          )
        if (itemErr) { await rollback(); throw itemErr }
      }

      // 4. UPDATE stock + INSERT stock_movements pour chaque produit
      for (const item of payload.items) {
        // Récupère stock actuel
        const { data: stockRow, error: sErr } = await supabase
          .from('stock')
          .select('id, quantity')
          .eq('product_id', item.product_id)
          .single()

        if (sErr) throw sErr

        const newQty = (stockRow.quantity ?? 0) + item.quantity

        const { error: updErr } = await supabase
          .from('stock')
          .update({ quantity: newQty })
          .eq('id', stockRow.id)

        if (updErr) throw updErr

        // stock_movements — GOTCHA #3 : type en minuscules
        const { error: movErr } = await supabase
          .from('stock_movements')
          .insert({
            user_id: uid,
            product_id: item.product_id,
            type: 'in',
            quantity: item.quantity,
            reference_type: 'purchase',
            reference_id: purchase.id,
            note: null,
            date: payload.date || today,
          })

        if (movErr) throw movErr
      }

      // 5. INSERT supplier_payments
      if (payload.payments.length > 0) {
        const { error: payErr } = await supabase
          .from('supplier_payments')
          .insert(
            payload.payments.map(p => ({
              user_id: uid,
              purchase_id: purchase.id,
              amount: p.amount,
              date: p.date,
              note: p.note || null,
            }))
          )
        if (payErr) throw payErr
      }

      return purchase
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['purchases'] })
      qc.invalidateQueries({ queryKey: ['suppliers'] })
      qc.invalidateQueries({ queryKey: ['products'] })
      qc.invalidateQueries({ queryKey: ['stock-movements'] })
      qc.invalidateQueries({ queryKey: ['stock-alerts'] })
      toast.success('Achat enregistré avec succès')
    },
    onError: (err: Error) => {
      toast.error(err.message || "Erreur lors de l'enregistrement")
    },
  })
}

export const useUpdatePurchase = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, payments }: { id: string; payments: SupplierPaymentInput[] }) => {
      const user = await getCurrentUser()

      // Récupère l'achat actuel pour recalculer paid/status
      const { data: purchase, error: pErr } = await supabase
        .from('purchases')
        .select('total, paid')
        .eq('id', id)
        .single()

      if (pErr) throw pErr

      // Supprime les anciens paiements et reinsère
      const { error: delErr } = await supabase
        .from('supplier_payments')
        .delete()
        .eq('purchase_id', id)

      if (delErr) throw delErr

      const newPaid = payments.reduce((s, p) => s + p.amount, 0)

      if (payments.length > 0) {
        const { error: payErr } = await supabase
          .from('supplier_payments')
          .insert(
            payments.map(p => ({
              user_id: user.id,
              purchase_id: id,
              amount: p.amount,
              date: p.date,
              note: p.note || null,
            }))
          )
        if (payErr) throw payErr
      }

      const newStatus = getPaymentStatus(newPaid, purchase.total)

      const { error: updErr } = await supabase
        .from('purchases')
        .update({ paid: newPaid, status: newStatus })
        .eq('id', id)

      if (updErr) throw updErr
    },
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ['purchases'] })
      qc.invalidateQueries({ queryKey: ['purchases', id] })
      qc.invalidateQueries({ queryKey: ['suppliers'] })
      toast.success('Achat mis à jour')
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Erreur lors de la mise à jour')
    },
  })
}

export const useDeletePurchase = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('purchases').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['purchases'] })
      qc.invalidateQueries({ queryKey: ['suppliers'] })
      toast.success('Achat supprimé')
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Erreur lors de la suppression')
    },
  })
}
