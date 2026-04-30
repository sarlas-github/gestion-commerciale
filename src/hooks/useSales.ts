import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { getPaymentStatus, toISODate } from '@/lib/utils'
import type { Sale } from '@/types'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface SaleItemInput {
  product_id: string
  quantity: number
  pieces_count: number
  unit_price: number
}

export interface SalePaymentInput {
  date: string
  amount: number
  note: string
}

export interface CreateSalePayload {
  client_id: string
  date: string
  reference?: string
  note: string
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

async function getNextDocumentNumber(
  userId: string,
  type: 'invoice' | 'receipt',
  year: number
): Promise<string> {
  const prefix = type === 'invoice' ? 'FAC' : 'REC'

  const { data: existing } = await supabase
    .from('document_sequences')
    .select('id, last_number')
    .eq('user_id', userId)
    .eq('type', type)
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
      .insert({ user_id: userId, type, year, last_number: 1 })
  }

  return `${prefix}-${year}-${String(nextNumber).padStart(3, '0')}`
}

export async function getNextSaleNumber(
  userId: string,
  year: number
): Promise<string> {
  const { data: existing } = await supabase
    .from('document_sequences')
    .select('id, last_number')
    .eq('user_id', userId)
    .eq('type', 'sale')
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
      .insert({ user_id: userId, type: 'sale', year, last_number: 1 })
  }

  return `VEN-${year}-${String(nextNumber).padStart(3, '0')}`
}

export const useNextSaleNumber = () => {
  return useQuery({
    queryKey: ['next-sale-number'],
    queryFn: async () => {
      const user = await getCurrentUser()
      const year = new Date().getFullYear()
      const { data: existing } = await supabase
        .from('document_sequences')
        .select('last_number')
        .eq('user_id', user.id)
        .eq('type', 'sale')
        .eq('year', year)
        .maybeSingle()
      
      const nextNumber = (existing?.last_number || 0) + 1
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
        .select('*, clients(id, name)')
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
      const total = payload.items.reduce((s, i) => s + i.quantity * (i.pieces_count || 1) * i.unit_price, 0)
      const paid = payload.payments.reduce((s, p) => s + p.amount, 0)
      const status = getPaymentStatus(paid, total)

      // 2. INSERT sale (remaining est GENERATED — GOTCHA #6)
      const { data: sale, error: sErr } = await supabase
        .from('sales')
        .insert({
          user_id: uid,
          client_id: payload.client_id,
          date: saleDate,
          reference: payload.reference || (await getNextSaleNumber(uid, year)),
          total,
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
            }))
          )
        if (payErr) throw payErr
      }

      // 6. Numérotation document + snapshots
      const docNumber = await getNextDocumentNumber(uid, 'invoice', year)

      const [{ data: company }, { data: client }] = await Promise.all([
        supabase.from('companies').select('*').eq('user_id', uid).maybeSingle(),
        supabase.from('clients').select('name, address, ice').eq('id', payload.client_id).single(),
      ])

      const { data: document, error: docErr } = await supabase
        .from('documents')
        .insert({
          user_id: uid,
          client_id: payload.client_id,
          sale_id: sale.id,
          payment_id: null,
          parent_id: null,
          type: 'invoice',
          number: docNumber,
          date: saleDate,
          status: 'confirmed',
          payment_status: status,
          total,
          paid,
          note: payload.note || null,
          client_name: client?.name ?? null,
          client_address: client?.address ?? null,
          client_ice: client?.ice ?? null,
          company_name: company?.name ?? null,
          company_address: company?.address ?? null,
          company_phone: company?.phone ?? null,
          company_email: company?.email ?? null,
          company_ice: company?.ice ?? null,
          company_if: company?.if_number ?? null,
          company_rc: company?.rc ?? null,
          company_tp: company?.tp_number ?? null,
          company_logo_url: company?.logo_url ?? null,
        })
        .select()
        .single()
      if (docErr) throw docErr

      // 7. INSERT document_items (product_name snapshot)
      if (payload.items.length > 0) {
        const { data: products } = await supabase
          .from('products')
          .select('id, name')
          .in('id', payload.items.map(i => i.product_id))

        const productMap = Object.fromEntries((products ?? []).map(p => [p.id, p]))

        const { error: diErr } = await supabase
          .from('document_items')
          .insert(
            payload.items.map(i => ({
              document_id: document.id,
              product_id: i.product_id,
              product_name: productMap[i.product_id]?.name ?? 'Produit inconnu',
              quantity: i.quantity,
              unit_price: i.unit_price,
            }))
          )
        if (diErr) throw diErr
      }

      return sale
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sales'] })
      qc.invalidateQueries({ queryKey: ['clients'] })
      qc.invalidateQueries({ queryKey: ['products'] })
      qc.invalidateQueries({ queryKey: ['stock-movements'] })
      qc.invalidateQueries({ queryKey: ['stock-alerts'] })
      qc.invalidateQueries({ queryKey: ['documents'] })
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
      const { id, client_id, date, note, items, payments } = payload
      const user = await getCurrentUser()

      // 1. Récupère la vente actuelle (avec items)
      const { data: oldSale, error: sErr } = await supabase
        .from('sales')
        .select('*, sale_items(*)')
        .eq('id', id)
        .single()
      if (sErr) throw sErr

      // 2. Calculs financiers
      const total = items.reduce((s, i) => s + i.quantity * (i.pieces_count || 1) * i.unit_price, 0)
      const paid = payments.reduce((s, p) => s + p.amount, 0)
      const status = getPaymentStatus(paid, total)

      // 3. UPDATE sale (header)
      const { error: updErr } = await supabase
        .from('sales')
        .update({
          client_id,
          date,
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

        // c. Mettre à jour les items du document si une facture existe
        const { data: document } = await supabase.from('documents').select('id').eq('sale_id', id).eq('type', 'invoice').maybeSingle()
        if (document) {
           const { data: products } = await supabase.from('products').select('id, name').in('id', newItems.map(ni => ni.product_id))
           const prodMap = Object.fromEntries((products || []).map(p => [p.id, p]))

           await supabase.from('document_items').insert(
             newItems.map(i => ({
               document_id: document.id,
               product_id: i.product_id,
               product_name: prodMap[i.product_id]?.name ?? 'Produit inconnu',
               quantity: i.quantity,
               unit_price: i.unit_price,
             }))
           )
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
          }))
        )
        if (insPayErr) throw insPayErr
      }

      // 6. UPDATE Document (facture)
      const { data: client, error: clErr } = await supabase.from('clients').select('name, address, ice').eq('id', client_id).single()
      if (clErr) throw clErr
      
      const { data: document, error: docFetchErr } = await supabase
        .from('documents')
        .select('id')
        .eq('sale_id', id)
        .eq('type', 'invoice')
        .maybeSingle()

      if (document) {
        const { error: upDocErr } = await supabase
          .from('documents')
          .update({
            client_id,
            date,
            payment_status: status,
            total,
            paid,
            note: note || null,
            client_name: client?.name ?? null,
            client_address: client?.address ?? null,
            client_ice: client?.ice ?? null,
          })
          .eq('id', document.id)
        if (upDocErr) throw upDocErr

        // Update document items if items changed
        if (itemsChanged) {
          const { error: delDiErr } = await supabase.from('document_items').delete().eq('document_id', document.id)
          if (delDiErr) throw delDiErr
          
          const { data: products, error: prodErr } = await supabase
            .from('products')
            .select('id, name')
            .in('id', items.map(i => i.product_id))
          if (prodErr) throw prodErr
          const productMap = Object.fromEntries((products ?? []).map(p => [p.id, p]))

          const { error: insDiErr } = await supabase.from('document_items').insert(
            items.map(i => ({
              document_id: document.id,
              product_id: i.product_id,
              product_name: productMap[i.product_id]?.name ?? 'Produit inconnu',
              quantity: i.quantity,
              unit_price: i.unit_price,
              // pieces_count supprimé car colonne absente en BDD
            }))
          )
          if (insDiErr) throw insDiErr
        }
      }
    },
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ['sales'] })
      qc.invalidateQueries({ queryKey: ['sales', id] })
      qc.invalidateQueries({ queryKey: ['clients'] })
      qc.invalidateQueries({ queryKey: ['products'] })
      qc.invalidateQueries({ queryKey: ['stock-movements'] })
      qc.invalidateQueries({ queryKey: ['stock-alerts'] })
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
      qc.invalidateQueries({ queryKey: ['clients'] })
      qc.invalidateQueries({ queryKey: ['products'] })
      qc.invalidateQueries({ queryKey: ['stock-alerts'] })
      toast.success('Vente supprimée')
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Erreur lors de la suppression')
    },
  })
}
