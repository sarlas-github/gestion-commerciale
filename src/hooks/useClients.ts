import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import type { Client, CreateClientInput, UpdateClientInput, Sale, ClientPayment } from '@/types'

// ── Types enrichis ────────────────────────────────────────────────────────────

export interface ClientWithStats extends Client {
  totalDu: number
  paymentStatus: 'ok' | 'partial' | 'unpaid'
}

// ── Helper ────────────────────────────────────────────────────────────────────

async function getCurrentUser() {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Non authentifié')
  return user
}

// ── Queries ───────────────────────────────────────────────────────────────────

/** Liste tous les clients avec totaux calculés depuis les ventes */
export const useClients = () =>
  useQuery({
    queryKey: ['clients'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clients')
        .select('*, sales(total, paid, remaining, status)')
        .order('name')

      if (error) throw error

      return (data ?? []).map(c => {
        const sales = (c.sales ?? []) as Array<{
          total: number
          paid: number
          remaining: number
          status: string
        }>
        const totalDu = sales.reduce((sum, s) => sum + (s.remaining ?? 0), 0)
        const hasUnpaid = sales.some(s => s.status === 'unpaid' || s.status === 'partial')

        return {
          ...c,
          totalDu,
          paymentStatus: totalDu === 0 ? 'ok' : hasUnpaid ? 'unpaid' : 'partial',
        } as ClientWithStats
      })
    },
  })

/** Client unique */
export const useClient = (id: string) =>
  useQuery({
    queryKey: ['clients', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('id', id)
        .single()

      if (error) throw error
      return data as Client
    },
    enabled: Boolean(id),
  })

/** Ventes d'un client */
export const useClientSales = (clientId: string) =>
  useQuery({
    queryKey: ['clients', clientId, 'sales'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sales')
        .select('*')
        .eq('client_id', clientId)
        .order('date', { ascending: false })

      if (error) throw error
      return (data ?? []) as Sale[]
    },
    enabled: Boolean(clientId),
  })

/** Paiements d'un client (via ses ventes) */
export const useClientPayments = (clientId: string) =>
  useQuery({
    queryKey: ['clients', clientId, 'payments'],
    queryFn: async () => {
      const { data: sales, error: sErr } = await supabase
        .from('sales')
        .select('id')
        .eq('client_id', clientId)

      if (sErr) throw sErr
      if (!sales || sales.length === 0) return []

      const saleIds = sales.map(s => s.id)

      const { data, error } = await supabase
        .from('client_payments')
        .select('*')
        .in('sale_id', saleIds)
        .order('date', { ascending: false })

      if (error) throw error
      return (data ?? []) as ClientPayment[]
    },
    enabled: Boolean(clientId),
  })

/** État mensuel d'un client */
export const useClientMonthlyState = (clientId: string, year: number, month: number) =>
  useQuery({
    queryKey: ['clients', clientId, 'state', year, month],
    queryFn: async () => {
      const startDate = `${year}-${String(month).padStart(2, '0')}-01`
      const endDate = new Date(year, month, 0).toISOString().split('T')[0]

      const { data: sales, error } = await supabase
        .from('sales')
        .select('total, paid, remaining')
        .eq('client_id', clientId)
        .gte('date', startDate)
        .lte('date', endDate)

      if (error) throw error

      const totalVentes = (sales ?? []).reduce((s, v) => s + (v.total ?? 0), 0)
      const totalPaye = (sales ?? []).reduce((s, v) => s + (v.paid ?? 0), 0)
      const resteAPayer = totalVentes - totalPaye

      return { totalVentes, totalPaye, resteAPayer }
    },
    enabled: Boolean(clientId),
  })

// ── Mutations ─────────────────────────────────────────────────────────────────

export const useCreateClient = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: CreateClientInput) => {
      const user = await getCurrentUser()
      const { data, error } = await supabase
        .from('clients')
        .insert({ ...input, user_id: user.id })
        .select()
        .single()

      if (error) throw error
      return data as Client
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['clients'] })
      toast.success('Client créé avec succès')
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Erreur lors de la création')
    },
  })
}

export const useUpdateClient = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...input }: UpdateClientInput & { id: string }) => {
      const { data, error } = await supabase
        .from('clients')
        .update(input)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data as Client
    },
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ['clients'] })
      qc.invalidateQueries({ queryKey: ['clients', id] })
      toast.success('Client mis à jour')
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Erreur lors de la mise à jour')
    },
  })
}

export const useDeleteClient = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { count, error: checkErr } = await supabase
        .from('sales')
        .select('id', { count: 'exact', head: true })
        .eq('client_id', id)

      if (checkErr) throw checkErr
      if ((count ?? 0) > 0) {
        throw new Error('Ce client a des ventes associées et ne peut pas être supprimé.')
      }

      const { error } = await supabase.from('clients').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['clients'] })
      toast.success('Client supprimé')
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Erreur lors de la suppression')
    },
  })
}
