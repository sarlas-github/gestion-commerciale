import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import type { Product, ProductWithStock, CreateProductInput, UpdateProductInput } from '@/types'
import { getStockStatus } from '@/lib/utils'

// ── Types internes ────────────────────────────────────────────────────────────

interface StockRow {
  id: string
  user_id: string
  product_id: string
  quantity: number
  updated_at: string
}

export interface AdjustStockInput {
  productId: string
  currentStockId: string
  currentQuantity: number
  direction: 'in' | 'out'
  quantity: number
  note: string
}

// ── Helper ────────────────────────────────────────────────────────────────────

async function getCurrentUser() {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Non authentifié')
  return user
}

function toProductWithStock(p: Record<string, unknown>): ProductWithStock {
  const stockArr = (p.stock ?? []) as StockRow[]
  const stock = stockArr[0] ?? null
  return {
    ...(p as unknown as Product),
    stock,
    stockStatus: getStockStatus(stock?.quantity ?? 0, (p.stock_alert as number) ?? 0),
  }
}

// ── Queries ───────────────────────────────────────────────────────────────────

export const useProducts = () =>
  useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*, stock(*)')
        .order('name')

      if (error) throw error
      return (data ?? []).map(p => toProductWithStock(p as Record<string, unknown>))
    },
  })

export const useProduct = (id: string) =>
  useQuery({
    queryKey: ['products', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*, stock(*)')
        .eq('id', id)
        .single()

      if (error) throw error
      return toProductWithStock(data as Record<string, unknown>)
    },
    enabled: Boolean(id),
  })

export const useStockAlertCount = () =>
  useQuery({
    queryKey: ['stock-alerts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('stock_alert, stock(quantity)')

      if (error) throw error

      return (data ?? []).filter(p => {
        const qty = ((p.stock ?? []) as Array<{ quantity: number }>)[0]?.quantity ?? 0
        return qty === 0 || qty <= (p.stock_alert ?? 0)
      }).length
    },
    staleTime: 60_000,
  })

// ── Mutations ─────────────────────────────────────────────────────────────────

export const useCreateProduct = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: CreateProductInput) => {
      const user = await getCurrentUser()

      const { data: product, error } = await supabase
        .from('products')
        .insert({ ...input, user_id: user.id })
        .select()
        .single()

      if (error) throw error

      const { error: stockErr } = await supabase
        .from('stock')
        .insert({ product_id: product.id, user_id: user.id, quantity: 0 })

      if (stockErr) throw stockErr

      return product as Product
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['products'] })
      qc.invalidateQueries({ queryKey: ['stock-alerts'] })
      toast.success('Produit créé avec succès')
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Erreur lors de la création du produit')
    },
  })
}

export const useUpdateProduct = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...input }: UpdateProductInput & { id: string }) => {
      const { data, error } = await supabase
        .from('products')
        .update(input)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data as Product
    },
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ['products'] })
      qc.invalidateQueries({ queryKey: ['products', id] })
      qc.invalidateQueries({ queryKey: ['stock-alerts'] })
      toast.success('Produit mis à jour')
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Erreur lors de la mise à jour')
    },
  })
}

export const useDeleteProduct = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { count: saleCount, error: saleErr } = await supabase
        .from('sale_items')
        .select('id', { count: 'exact', head: true })
        .eq('product_id', id)

      if (saleErr) throw saleErr
      if ((saleCount ?? 0) > 0) {
        throw new Error('Ce produit est utilisé dans des ventes et ne peut pas être supprimé.')
      }

      const { count: purchaseCount, error: purchaseErr } = await supabase
        .from('purchase_items')
        .select('id', { count: 'exact', head: true })
        .eq('product_id', id)

      if (purchaseErr) throw purchaseErr
      if ((purchaseCount ?? 0) > 0) {
        throw new Error('Ce produit est utilisé dans des achats et ne peut pas être supprimé.')
      }

      const { error } = await supabase.from('products').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['products'] })
      qc.invalidateQueries({ queryKey: ['stock-alerts'] })
      toast.success('Produit supprimé')
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Erreur lors de la suppression')
    },
  })
}

export const useAdjustStock = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: AdjustStockInput) => {
      const user = await getCurrentUser()

      const delta = input.direction === 'in' ? input.quantity : -input.quantity
      const newQty = input.currentQuantity + delta

      if (newQty < 0) {
        throw new Error(`Stock insuffisant (disponible : ${input.currentQuantity})`)
      }

      const { error: stockErr } = await supabase
        .from('stock')
        .update({ quantity: newQty })
        .eq('id', input.currentStockId)

      if (stockErr) throw stockErr

      // Note : DB utilise lowercase 'adjust', 'in', 'out' dans la contrainte CHECK
      const { error: movErr } = await supabase.from('stock_movements').insert({
        user_id: user.id,
        product_id: input.productId,
        type: 'adjust',
        quantity: delta,
        reference_type: 'manual',
        note: input.note,
        date: new Date().toISOString().split('T')[0],
      })

      if (movErr) throw movErr
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['products'] })
      qc.invalidateQueries({ queryKey: ['stock-alerts'] })
      qc.invalidateQueries({ queryKey: ['stock-movements'] })
      toast.success('Stock corrigé')
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Erreur lors de la correction stock')
    },
  })
}
