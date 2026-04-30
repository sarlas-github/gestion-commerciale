import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { getPaymentStatus } from '@/lib/utils'
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
  reference?: string
  note?: string
  items: PurchaseItemInput[]
  payments: SupplierPaymentInput[]
}

export interface UpdatePurchasePayload extends CreatePurchasePayload {
  id: string
}

// ── Helper ────────────────────────────────────────────────────────────────────

async function getCurrentUser() {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Non authentifié')
  return user
}

export async function getNextPurchaseNumber(
  userId: string,
  year: number
): Promise<string> {
  const { data: existing } = await supabase
    .from('document_sequences')
    .select('id, last_number')
    .eq('user_id', userId)
    .eq('type', 'purchase')
    .eq('year', year)
    .maybeSingle()

  let nextNumber: number

  if (existing) {
    nextNumber = existing.last_number + 1
    await supabase
      .from('document_sequences')
      .update({ last_number: nextNumber })
      .eq('id', existing.id)
  } else {
    nextNumber = 1
    await supabase
      .from('document_sequences')
      .insert({ user_id: userId, type: 'purchase', year, last_number: 1 })
  }

  return `ACH-${year}-${String(nextNumber).padStart(3, '0')}`
}

export const useNextPurchaseNumber = () => {
  return useQuery({
    queryKey: ['next-purchase-number'],
    queryFn: async () => {
      const user = await getCurrentUser()
      const year = new Date().getFullYear()
      // Note: On ne l'incrémente pas ici, juste lecture pour affichage
      const { data: existing } = await supabase
        .from('document_sequences')
        .select('last_number')
        .eq('user_id', user.id)
        .eq('type', 'purchase')
        .eq('year', year)
        .maybeSingle()
      
      const nextNumber = (existing?.last_number || 0) + 1
      return `ACH-${year}-${String(nextNumber).padStart(3, '0')}`
    },
    staleTime: 0, // Toujours revérifier à l'ouverture du formulaire
  })
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
        .order('created_at', { ascending: false })

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
      const user = await getCurrentUser()
      const uid = user.id
      const today = new Date().toISOString().split('T')[0]

      // 1. Calculs
      const total = payload.items.reduce((s, i) => s + i.quantity * (i.pieces_count || 1) * i.unit_price, 0)
      const paid = payload.payments.reduce((s, p) => s + p.amount, 0)
      const status = getPaymentStatus(paid, total)

      // 2. INSERT purchase
      const year = new Date(payload.date).getFullYear()
      const reference = payload.reference || (await getNextPurchaseNumber(uid, year))

      const { data: purchase, error: pErr } = await supabase
        .from('purchases')
        .insert({
          user_id: uid,
          supplier_id: payload.supplier_id,
          reference: reference,
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
              // pieces_count supprimé car colonne absente en BDD
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
          .maybeSingle()

        if (sErr) throw sErr

        const newQty = Number(item.quantity)
        
        if (stockRow) {
          // Mise à jour si existe
          const { error: upStkErr } = await supabase
            .from('stock')
            .update({ quantity: (stockRow.quantity || 0) + newQty })
            .eq('id', stockRow.id)
          if (upStkErr) throw upStkErr
        } else {
          // Création si n'existe pas
          const { error: insStkErr } = await supabase
            .from('stock')
            .insert({
              user_id: uid,
              product_id: item.product_id,
              quantity: newQty,
            })
          if (insStkErr) throw insStkErr
        }

        const { error: moveErr } = await supabase
          .from('stock_movements')
          .insert({
            user_id: uid,
            product_id: item.product_id,
            type: 'in',
            quantity: newQty,
            reference_type: 'purchase',
            reference_id: purchase.id,
            note: null,
            date: payload.date || today,
          })
        if (moveErr) throw moveErr
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
              methode_paiement: p.methode_paiement || null,
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
    mutationFn: async (payload: UpdatePurchasePayload) => {
      const { id, supplier_id, date, reference, note, items, payments } = payload
      const user = await getCurrentUser()

      // 1. Récupère l'achat actuel (pour le rollback ou calculs)
      const { data: oldPurchase, error: pErr } = await supabase
        .from('purchases')
        .select('*, purchase_items(*)')
        .eq('id', id)
        .single()

      if (pErr) throw pErr

      // 2. Calculs
      const total = items.reduce((s, i) => s + i.quantity * (i.pieces_count || 1) * i.unit_price, 0)
      const paid = payments.reduce((s, p) => s + p.amount, 0)
      const status = getPaymentStatus(paid, total)

      // 3. UPDATE purchase (header)
      const { error: updErr } = await supabase
        .from('purchases')
        .update({
          supplier_id,
          date,
          reference: reference || oldPurchase.reference,
          note: note || null,
          total,
          paid,
          status,
        })
        .eq('id', id)

      if (updErr) throw updErr

      // 4. Traitement des articles
      const newItems = items.filter(i => !i.original_id)
      const existingItems = items.filter(i => !!i.original_id)
      
      // a. Mettre à jour les prix des articles existants
      for (const item of existingItems) {
        const { error: updItemErr } = await supabase
          .from('purchase_items')
          .update({ unit_price: item.unit_price })
          .eq('id', item.original_id)
        if (updItemErr) throw updItemErr
      }

      if (newItems.length > 0) {
        // a. Insérer les nouveaux items
        const { error: insItemErr } = await supabase.from('purchase_items').insert(
          newItems.map(i => ({
            purchase_id: id,
            product_id: i.product_id,
            quantity: i.quantity,
            unit_price: i.unit_price,
            // pieces_count supprimé car colonne absente en BDD
          }))
        )
        if (insItemErr) throw insItemErr

        // b. Appliquer stock pour les nouveaux items
        const today = new Date().toISOString().split('T')[0]
        for (const item of newItems) {
          const { data: stockRow, error: sErr } = await supabase.from('stock').select('id, quantity').eq('product_id', item.product_id).maybeSingle()
          if (sErr) throw sErr
          
          const qtyToAdd = Number(item.quantity)
          
          if (stockRow) {
            const { error: upStkErr } = await supabase.from('stock').update({ quantity: (stockRow.quantity || 0) + qtyToAdd }).eq('id', stockRow.id)
            if (upStkErr) throw upStkErr
          } else {
            const { error: insStkErr } = await supabase.from('stock').insert({
              user_id: user.id,
              product_id: item.product_id,
              quantity: qtyToAdd,
            })
            if (insStkErr) throw insStkErr
          }
            
          const { error: insMovErr } = await supabase.from('stock_movements').insert({
            user_id: user.id,
            product_id: item.product_id,
            type: 'in',
            quantity: qtyToAdd,
            reference_type: 'purchase',
            reference_id: id,
            note: 'Ajout nouvel article à l\'achat',
            date: date || today,
          })
          if (insMovErr) throw insMovErr
        }
      }

      // 5. Mise à jour des Paiements (Header et paiements uniquement)
      const { error: delPayErr } = await supabase.from('supplier_payments').delete().eq('purchase_id', id)
      if (delPayErr) throw delPayErr
      
      if (payments.length > 0) {
        const { error: insPayErr } = await supabase.from('supplier_payments').insert(
          payments.map(p => ({
            user_id: user.id,
            purchase_id: id,
            amount: p.amount,
            date: p.date,
            note: p.note || null,
            methode_paiement: p.methode_paiement || null,
          }))
        )
        if (insPayErr) throw insPayErr
      }
    },
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ['purchases'] })
      qc.invalidateQueries({ queryKey: ['purchases', id] })
      qc.invalidateQueries({ queryKey: ['suppliers'] })
      qc.invalidateQueries({ queryKey: ['products'] })
      qc.invalidateQueries({ queryKey: ['stock-movements'] })
      qc.invalidateQueries({ queryKey: ['stock-alerts'] })
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
