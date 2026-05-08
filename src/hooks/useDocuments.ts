import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { getApiErrorMessage } from '@/lib/apiError'
import { supabase } from '@/lib/supabase'
import type { Document } from '@/types'


export interface CreateInvoicePayload {
  sale_id: string
  client_id: string
  date: string
  note: string | null
  total: number
  paid: number
  tva_rate: number
  tva_amount: number
  mode_paiement?: string | null
  items: Array<{
    product_id: string
    product_name: string
    quantity: number
    pieces_count: number
    unit_price: number
  }>
}

export const useGetSaleInvoice = (saleId: string | null | undefined) =>
  useQuery({
    queryKey: ['sale-invoice', saleId],
    queryFn: async () => {
      if (!saleId) return null
      const { data, error } = await supabase
        .from('documents')
        .select('*, document_items(*)')
        .eq('sale_id', saleId)
        .eq('type', 'invoice')
        .maybeSingle()
      if (error) throw error
      return data as Document | null
    },
    enabled: Boolean(saleId),
  })

export const useCreateInvoice = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: CreateInvoicePayload) => {
      const { data: docId, error } = await supabase.rpc('create_invoice', {
        p_sale_id:       payload.sale_id,
        p_client_id:     payload.client_id,
        p_date:          payload.date,
        p_note:          payload.note,
        p_total:         payload.total,
        p_paid:          payload.paid,
        p_tva_rate:      payload.tva_rate,
        p_tva_amount:    payload.tva_amount,
        p_mode_paiement: payload.mode_paiement ?? null,
        p_items:         payload.items,
      })
      if (error) throw error
      return docId as string
    },
    onSuccess: (_, { sale_id }) => {
      qc.invalidateQueries({ queryKey: ['sale-invoice', sale_id] })
      qc.invalidateQueries({ queryKey: ['documents'] })
      toast.success('Facture générée avec succès')
    },
    onError: (err: Error) => {
      toast.error(getApiErrorMessage(err, 'Erreur lors de la génération de la facture'))
    },
  })
}

export interface CreateReceiptPayload {
  payment_id: string
  sale_id: string
  client_id: string
  date: string
  total: number
  paid: number
  tva_rate: number
  tva_amount: number
  mode_paiement?: string | null
  items: Array<{
    product_id: string
    product_name: string
    quantity: number  // total pièces déjà calculé (quantity * pieces_count)
    unit_price: number
  }>
}

export const useGetPaymentReceipt = (paymentId: string | null | undefined) =>
  useQuery({
    queryKey: ['payment-receipt', paymentId],
    queryFn: async () => {
      if (!paymentId) return null
      const { data, error } = await supabase
        .from('documents')
        .select('*, document_items(*)')
        .eq('payment_id', paymentId)
        .eq('type', 'receipt')
        .maybeSingle()
      if (error) throw error
      return data as Document | null
    },
    enabled: Boolean(paymentId),
  })

export const useCreateReceipt = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: CreateReceiptPayload) => {
      const { data: docId, error } = await supabase.rpc('create_receipt', {
        p_payment_id:    payload.payment_id,
        p_sale_id:       payload.sale_id,
        p_client_id:     payload.client_id,
        p_date:          payload.date,
        p_total:         payload.total,
        p_paid:          payload.paid,
        p_tva_rate:      payload.tva_rate,
        p_tva_amount:    payload.tva_amount,
        p_mode_paiement: payload.mode_paiement ?? null,
        p_items:         payload.items,
      })
      if (error) throw error
      return docId as string
    },
    onSuccess: (_, { payment_id }) => {
      qc.invalidateQueries({ queryKey: ['payment-receipt', payment_id] })
      qc.invalidateQueries({ queryKey: ['documents'] })
      qc.invalidateQueries({ queryKey: ['payment-receipt'] })
      toast.success('Reçu généré avec succès')
    },
    onError: (err: Error) => {
      toast.error(getApiErrorMessage(err, 'Erreur lors de la génération du reçu'))
    },
  })
}

export const useUpdateInvoiceModePaiement = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, mode_paiement }: { id: string; mode_paiement: string | null }) => {
      const { error } = await supabase
        .from('documents')
        .update({ mode_paiement })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sale-invoice'] })
      qc.invalidateQueries({ queryKey: ['documents'] })
      toast.success('Mode de paiement mis à jour')
    },
    onError: (err: Error) => {
      toast.error(getApiErrorMessage(err, 'Erreur lors de la mise à jour'))
    },
  })
}
