import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { getPaymentStatus, toISODate } from '@/lib/utils'
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
  reference?: string
  note?: string
  tva_rate?: number
  items: SaleItemInput[]
  payments: SalePaymentInput[]
}

export interface UpdateSalePayload extends CreateSalePayload {
  id: string
}

// ── Helpers ───────────────────────────────────────────────────────────────────

async function getCurrentUser() {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Non authentifié')
  return user
}

export async function getNextSaleNumber(
  userId: string,
  year: number,
  providedRef?: string
): Promise<string> {
  const { data: existing } = await supabase
    .from('document_sequences')
    .select('id, last_number')
    .eq('user_id', userId)
    .eq('type', 'sale')
    .eq('year', year)
    .maybeSingle()

  let nextNumber: number
  let providedNumber = 0

  if (providedRef && providedRef.startsWith(`VEN-${year}-`)) {
    const match = providedRef.match(/-(\d+)$/)
    if (match) providedNumber = parseInt(match[1], 10)
  }

  if (existing) {
    if (providedNumber > 0) {
      nextNumber = Math.max(existing.last_number, providedNumber)
    } else {
      nextNumber = existing.last_number + 1
    }
    await supabase
      .from('document_sequences')
      .update({ last_number: nextNumber })
      .eq('id', existing.id)
  } else {
    nextNumber = providedNumber > 0 ? providedNumber : 1
    await supabase
      .from('document_sequences')
      .insert({ user_id: userId, type: 'sale', year, last_number: nextNumber })
  }

  if (providedRef) return providedRef
  return `VEN-${year}-${String(nextNumber).padStart(3, '0')}`
}

export const useNextSaleNumber = () => {
  return useQuery({
    queryKey: ['next-sale-number'],
    queryFn: async () => {
      const user = await getCurrentUser()
      const year = new Date().getFullYear()
      const { data: existing, error: seqErr } = await supabase
        .from('document_sequences')
        .select('last_number')
        .eq('user_id', user.id)
        .eq('type', 'sale')
        .eq('year', year)
        .maybeSingle()
      
      if (seqErr) console.error("Error fetching sequence", seqErr)

      let nextNumber = (existing?.last_number || 0) + 1

      // Auto-heal: Check actual sales in case sequence is out of sync
      if (nextNumber === 1) {
        const { data: maxSale } = await supabase
          .from('sales')
          .select('reference')
          .eq('user_id', user.id)
          .ilike('reference', `VEN-${year}-%`)
          .order('reference', { ascending: false })
          .limit(1)
          .maybeSingle()
          
        if (maxSale && maxSale.reference) {
          const match = maxSale.reference.match(/-(\d+)$/)
          if (match) {
            const maxNum = parseInt(match[1], 10)
            if (maxNum >= nextNumber) {
              nextNumber = maxNum + 1
            }
          }
        }
      }

      return `VEN-${year}-${String(nextNumber).padStart(3, '0')}`
    },
    staleTime: 0,
  })
}

// ── Queries ───────────────────────────────────────────────────────────────────

export const useSales = () =>
  useQuery({
    queryKey: ['sales'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sales')
        .select('*, clients(id, name), documents!sale_id(id, type)')
        .order('date', { ascending: false })
        .order('created_at', { ascending: false })

      if (error) throw error
      return (data ?? []) as Sale[]
    },
  })

export const useSale = (id: string) =>
  useQuery({
    queryKey: ['sales', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sales')
        .select('*, clients(id, name), sale_items(*, products(id, name, pieces_count)), client_payments(*)')
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
      const user = await getCurrentUser()
      const uid = user.id
      const today = toISODate(new Date())
      const year = new Date().getFullYear()
      const saleDate = payload.date || today

      // 1. Calculs financiers
      const tvaRate = payload.tva_rate ?? 0
      const totalHT = payload.items.reduce((s, i) => s + i.quantity * (i.pieces_count || 1) * i.unit_price, 0)
      const tvaAmount = totalHT * tvaRate / 100
      const total = totalHT + tvaAmount
      const paid = payload.payments.reduce((s, p) => s + p.amount, 0)
      const status = getPaymentStatus(paid, total)

      // 2. INSERT sale (remaining est GENERATED — GOTCHA #6)
      const reference = await getNextSaleNumber(uid, year, payload.reference)

      const { data: sale, error: sErr } = await supabase
        .from('sales')
        .insert({
          user_id: uid,
          client_id: payload.client_id,
          date: saleDate,
          reference: reference,
          total,
          tva_rate: tvaRate,
          tva_amount: tvaAmount,
          paid,
          status,
          note: payload.note || null,
        })
        .select()
        .single()
      if (sErr) throw sErr

      const rollback = async () => supabase.from('sales').delete().eq('id', sale.id)

      // 3. INSERT sale_items (subtotal est GENERATED — GOTCHA #6)
      if (payload.items.length > 0) {
        const { error: itemErr } = await supabase
          .from('sale_items')
          .insert(
            payload.items.map(i => ({
              sale_id: sale.id,
              product_id: i.product_id,
              quantity: i.quantity,
              unit_price: i.unit_price,
            }))
          )
        if (itemErr) { await rollback(); throw itemErr }
      }

      // 4. UPDATE stock (-) + INSERT stock_movements (type: 'out' minuscule — GOTCHA #3)
      for (const item of payload.items) {
        const { data: stockRow, error: stkErr } = await supabase
          .from('stock')
          .select('id, quantity')
          .eq('product_id', item.product_id)
          .maybeSingle()
        if (stkErr) throw stkErr
        const newQty = Number(item.quantity)
        
        if (stockRow) {
          const { error: updErr } = await supabase
            .from('stock')
            .update({ quantity: (stockRow.quantity ?? 0) - newQty })
            .eq('id', stockRow.id)
          if (updErr) throw updErr
        } else {
          const { error: insStkErr } = await supabase
            .from('stock')
            .insert({
              user_id: uid,
              product_id: item.product_id,
              quantity: -newQty,
            })
          if (insStkErr) throw insStkErr
        }

        const { error: movErr } = await supabase
          .from('stock_movements')
          .insert({
            user_id: uid,
            product_id: item.product_id,
            type: 'out',
            quantity: -newQty,
            reference_type: 'sale',
            reference_id: sale.id,
            note: null,
            date: saleDate,
          })
        if (movErr) throw movErr
      }

      // 5. INSERT client_payments
      if (payload.payments.length > 0) {
        const { error: payErr } = await supabase
          .from('client_payments')
          .insert(
            payload.payments.map(p => ({
              user_id: uid,
              sale_id: sale.id,
              amount: p.amount,
              date: p.date,
              note: p.note || null,
              methode_paiement: p.methode_paiement || null,
            }))
          )
        if (payErr) throw payErr
      }

      return sale
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sales'] })
      qc.invalidateQueries({ queryKey: ['next-sale-number'] })
      qc.invalidateQueries({ queryKey: ['clients'] })
      qc.invalidateQueries({ queryKey: ['products'] })
      qc.invalidateQueries({ queryKey: ['stock-movements'] })
      qc.invalidateQueries({ queryKey: ['stock-alerts'] })
      qc.invalidateQueries({ queryKey: ['documents'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
      toast.success('Vente enregistrée avec succès')
    },
    onError: (err: Error) => {
      toast.error(err.message || "Erreur lors de l'enregistrement")
    },
  })
}

export const useUpdateSale = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: UpdateSalePayload) => {
      const { id, client_id, date, reference, note, items, payments, tva_rate } = payload
      const user = await getCurrentUser()

      // 1. Récupère la vente actuelle (avec items)
      const { data: oldSale, error: sErr } = await supabase
        .from('sales')
        .select('id, reference')
        .eq('id', id)
        .single()
      if (sErr) throw sErr

      // 2. Calculs financiers
      const tvaRate = tva_rate ?? 0
      const totalHT = items.reduce((s, i) => s + i.quantity * (i.pieces_count || 1) * i.unit_price, 0)
      const tvaAmount = totalHT * tvaRate / 100
      const total = totalHT + tvaAmount
      const paid = payments.reduce((s, p) => s + p.amount, 0)
      const status = getPaymentStatus(paid, total)

      // 3. UPDATE sale (header)
      const { error: updErr } = await supabase
        .from('sales')
        .update({
          client_id,
          date,
          reference: reference || oldSale.reference,
          note: note || null,
          total,
          tva_rate: tvaRate,
          tva_amount: tvaAmount,
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
          .from('sale_items')
          .update({ unit_price: item.unit_price })
          .eq('id', item.original_id)
        if (updItemErr) throw updItemErr
      }
      
      if (newItems.length > 0) {
        // a. Insérer les nouveaux items
        const { error: insItemErr } = await supabase.from('sale_items').insert(
          newItems.map(i => ({
            sale_id: id,
            product_id: i.product_id,
            quantity: i.quantity,
            unit_price: i.unit_price,
          }))
        )
        if (insItemErr) throw insItemErr

        // b. Appliquer stock pour les nouveaux items
        for (const item of newItems) {
          const { data: stockRow, error: sErr2 } = await supabase.from('stock').select('id, quantity').eq('product_id', item.product_id).maybeSingle()
          if (sErr2) throw sErr2
          
          const qtyToSub = Number(item.quantity)
          
          if (stockRow) {
            const { error: upStkErr } = await supabase.from('stock').update({ quantity: (stockRow.quantity || 0) - qtyToSub }).eq('id', stockRow.id)
            if (upStkErr) throw upStkErr
          } else {
            const { error: insStkErr } = await supabase.from('stock').insert({
              user_id: user.id,
              product_id: item.product_id,
              quantity: -qtyToSub,
            })
            if (insStkErr) throw insStkErr
          }
            
          const { error: insMovErr } = await supabase.from('stock_movements').insert({
            user_id: user.id,
            product_id: item.product_id,
            type: 'out',
            quantity: -qtyToSub,
            reference_type: 'sale',
            reference_id: id,
            note: 'Ajout nouvel article à la vente',
            date: date,
          })
          if (insMovErr) throw insMovErr
        }

      }

      // 5. UPDATE Payments (Header et paiements uniquement)
      const { error: delPayErr } = await supabase.from('client_payments').delete().eq('sale_id', id)
      if (delPayErr) throw delPayErr
      if (payments.length > 0) {
        const { error: insPayErr } = await supabase.from('client_payments').insert(
          payments.map(p => ({
            user_id: user.id,
            sale_id: id,
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
      qc.invalidateQueries({ queryKey: ['sales'] })
      qc.invalidateQueries({ queryKey: ['sales', id] })
      qc.invalidateQueries({ queryKey: ['clients'] })
      qc.invalidateQueries({ queryKey: ['products'] })
      qc.invalidateQueries({ queryKey: ['stock-movements'] })
      qc.invalidateQueries({ queryKey: ['stock-alerts'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
      toast.success('Vente mise à jour')
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Erreur lors de la mise à jour')
    },
  })
}

export const useDeleteSale = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('sales').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sales'] })
      qc.invalidateQueries({ queryKey: ['next-sale-number'] })
      qc.invalidateQueries({ queryKey: ['clients'] })
      qc.invalidateQueries({ queryKey: ['products'] })
      qc.invalidateQueries({ queryKey: ['stock-alerts'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
      toast.success('Vente supprimée')
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Erreur lors de la suppression')
    },
  })
}
