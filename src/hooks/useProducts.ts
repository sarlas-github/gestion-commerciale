import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { getApiErrorMessage } from '@/lib/apiError'
import { supabase } from '@/lib/supabase'
import type { Product, ProductWithStock, CreateProductInput, UpdateProductInput } from '@/types'
import { getStockStatus, isUniqueNameError } from '@/lib/utils'

// ── Types internes ────────────────────────────────────────────────────────────

interface StockRow {
  id: string
  user_id: string
  company_id: string
  product_id: string
  quantity: number
  updated_at: string
}

export interface AdjustStockInput {
  productId: string
  currentStockId: string | null
  currentQuantity: number
  type: 'in' | 'out'
  quantity: number
  note: string
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
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*, stock(*)')
        .order('created_at', { ascending: false })

      if (error) throw error
      return (data ?? []).map(p => toProductWithStock(p as Record<string, unknown>))
    },
  })

export const useProduct = (id: string) =>
  useQuery({
    queryKey: ['products', id],
    staleTime: 60_000,
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
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_stock_alert_count')
      if (error) throw error
      return (data as number) ?? 0
    },
  })

// ── Mutations ─────────────────────────────────────────────────────────────────

export const useCreateProduct = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: CreateProductInput) => {
      const { data: productId, error } = await supabase.rpc('create_product', {
        p_name:         input.name,
        p_type:         input.type,
        p_nature:       input.nature,
        p_pieces_count: input.pieces_count || 1,
        p_stock_alert:  input.stock_alert ?? 0,
      })
      if (error) throw error

      const { data, error: fetchErr } = await supabase
        .from('products')
        .select('*, stock(*)')
        .eq('id', productId as string)
        .single()
      if (fetchErr) throw fetchErr

      return toProductWithStock(data as Record<string, unknown>)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['products'] })
      qc.invalidateQueries({ queryKey: ['stock-alerts'] })
      toast.success('Produit créé avec succès')
    },
    onError: (err: Error) => {
      if (!isUniqueNameError(err)) {
        toast.error(getApiErrorMessage(err, 'Erreur lors de la création du produit'))
      }
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
      if (!isUniqueNameError(err)) {
        toast.error(getApiErrorMessage(err, 'Erreur lors de la mise à jour'))
      }
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
        throw new Error('Ce produit a de mouvements de stock associés et ne peut pas être supprimé.')
      }

      const { count: purchaseCount, error: purchaseErr } = await supabase
        .from('purchase_items')
        .select('id', { count: 'exact', head: true })
        .eq('product_id', id)

      if (purchaseErr) throw purchaseErr
      if ((purchaseCount ?? 0) > 0) {
        throw new Error('Ce produit a des achats associés et ne peut pas être supprimé.')
      }

      const { count: movCount, error: movErr } = await supabase
        .from('stock_movements')
        .select('id', { count: 'exact', head: true })
        .eq('product_id', id)

      if (movErr) throw movErr
      if ((movCount ?? 0) > 0) {
        throw new Error('Ce produit a des mouvements de stock associés et ne peut pas être supprimé.')
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
      toast.error(getApiErrorMessage(err, 'Erreur lors de la suppression'))
    },
  })
}

export const useAdjustStock = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: AdjustStockInput) => {
      const { error } = await supabase.rpc('adjust_stock', {
        p_stock_id:   input.currentStockId,
        p_product_id: input.productId,
        p_type:       input.type,
        p_quantity:   input.quantity,
        p_note:       input.note || null,
        p_date:       new Date().toISOString().split('T')[0],
      })
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['products'] })
      qc.invalidateQueries({ queryKey: ['stock-alerts'] })
      qc.invalidateQueries({ queryKey: ['stock-movements'] })
      toast.success('Stock corrigé')
    },
    onError: (err: Error) => {
      toast.error(getApiErrorMessage(err, 'Erreur lors de la correction stock'))
    },
  })
}
