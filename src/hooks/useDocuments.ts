import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { formatDocumentNumber, getPaymentStatus } from '@/lib/utils'
import type { Document } from '@/types'

async function getCurrentUser() {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Non authentifié')
  return user
}

export interface CreateInvoicePayload {
  sale_id: string
  client_id: string
  date: string
  note: string | null
  total: number
  paid: number
  tva_rate: number
  tva_amount: number
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
      const user = await getCurrentUser()
      const year = new Date(payload.date).getFullYear()

      // Atomic sequence via Supabase RPC — no race conditions
      const { data: seq, error: seqErr } = await supabase.rpc('get_next_doc_sequence', {
        p_user_id: user.id,
        p_type: 'invoice',
        p_year: year,
      })
      if (seqErr) throw seqErr

      const docNumber = formatDocumentNumber('invoice', year, seq as number)
      const paymentStatus = getPaymentStatus(payload.paid, payload.total)

      // Snapshots captured at generation time
      const [{ data: company }, { data: client, error: clErr }] = await Promise.all([
        supabase.from('companies').select('*').eq('user_id', user.id).maybeSingle(),
        supabase.from('clients').select('name, address, ice, phone').eq('id', payload.client_id).single(),
      ])
      if (clErr) throw clErr

      const { data: document, error: docErr } = await supabase
        .from('documents')
        .insert({
          user_id: user.id,
          client_id: payload.client_id,
          sale_id: payload.sale_id,
          type: 'invoice',
          number: docNumber,
          date: payload.date,
          status: 'confirmed',
          payment_status: paymentStatus,
          total: payload.total,
          tva_rate: payload.tva_rate,
          tva_amount: payload.tva_amount,
          paid: payload.paid,
          note: payload.note,
          client_name: client?.name ?? null,
          client_address: client?.address ?? null,
          client_ice: client?.ice ?? null,
          client_phone: client?.phone ?? null,
          company_name: company?.name ?? null,
          company_address: company?.address ?? null,
          company_phone: company?.phone ?? null,
          company_email: company?.email ?? null,
          company_ice: company?.ice ?? null,
          company_if: company?.if_number ?? null,
          company_rc: company?.rc ?? null,
          company_tp: company?.tp_number ?? null,
          company_rib: company?.rib ?? null,
          company_site_web: company?.site_web ?? null,
          company_couleur_marque: company?.couleur_marque ?? null,
          company_logo_url: company?.logo_url ?? null,
        })
        .select()
        .single()
      if (docErr) throw docErr

      // Items — quantity is converted to total pieces so subtotal = qty * pu = totalHT line
      if (payload.items.length > 0) {
        const { error: diErr } = await supabase.from('document_items').insert(
          payload.items.map(i => ({
            document_id: document.id,
            product_id: i.product_id,
            product_name: i.product_name,
            quantity: i.quantity * (i.pieces_count || 1),
            pieces_count: 1,
            unit_price: i.unit_price,
          }))
        )
        if (diErr) throw diErr
      }

      return document as Document
    },
    onSuccess: (_, { sale_id }) => {
      qc.invalidateQueries({ queryKey: ['sale-invoice', sale_id] })
      qc.invalidateQueries({ queryKey: ['documents'] })
      toast.success('Facture générée avec succès')
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Erreur lors de la génération de la facture')
    },
  })
}
