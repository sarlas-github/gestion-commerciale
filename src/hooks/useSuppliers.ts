import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import type { Supplier, CreateSupplierInput, UpdateSupplierInput } from '@/types'

// ── Helper ────────────────────────────────────────────────────────────────────

async function getCurrentUser() {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Non authentifié')
  return user
}

// ── Queries ───────────────────────────────────────────────────────────────────

/** Liste tous les fournisseurs avec totaux calculés depuis les achats */
export const useSuppliers = () =>
  useQuery({
    queryKey: ['suppliers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('suppliers')
        .select(`
          *,
          purchases(total, paid, remaining, status)
        `)
        .order('name')

      if (error) throw error

      return (data ?? []).map(s => {
        const purchases = (s.purchases ?? []) as Array<{
          total: number
          paid: number
          remaining: number
          status: string
        }>
        const totalDu = purchases.reduce((sum, p) => sum + (p.remaining ?? 0), 0)
        const hasUnpaid = purchases.some(p => p.status === 'unpaid' || p.status === 'partial')

        return {
          ...s,
          totalDu,
          paymentStatus: totalDu === 0 ? 'ok' : hasUnpaid ? 'unpaid' : 'partial',
        } as SupplierWithStats
      })
    },
  })

/** Fournisseur unique */
export const useSupplier = (id: string) =>
  useQuery({
    queryKey: ['suppliers', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('suppliers')
        .select('*')
        .eq('id', id)
        .single()

      if (error) throw error
      return data as Supplier
    },
    enabled: Boolean(id),
  })

/** Achats d'un fournisseur */
export const useSupplierPurchases = (supplierId: string) =>
  useQuery({
    queryKey: ['suppliers', supplierId, 'purchases'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('purchases')
        .select('*')
        .eq('supplier_id', supplierId)
        .order('date', { ascending: false })

      if (error) throw error
      return data ?? []
    },
    enabled: Boolean(supplierId),
  })

/** Paiements d'un fournisseur (via ses achats) */
export const useSupplierPayments = (supplierId: string) =>
  useQuery({
    queryKey: ['suppliers', supplierId, 'payments'],
    queryFn: async () => {
      // Récupère les IDs des achats du fournisseur
      const { data: purchases, error: pErr } = await supabase
        .from('purchases')
        .select('id')
        .eq('supplier_id', supplierId)

      if (pErr) throw pErr
      if (!purchases || purchases.length === 0) return []

      const purchaseIds = purchases.map(p => p.id)

      const { data, error } = await supabase
        .from('supplier_payments')
        .select('*, purchases(reference)')
        .in('purchase_id', purchaseIds)
        .order('date', { ascending: false })

      if (error) throw error
      return data ?? []
    },
    enabled: Boolean(supplierId),
  })

/** État mensuel d'un fournisseur */
export const useSupplierMonthlyState = (supplierId: string, year: number, month: number) =>
  useQuery({
    queryKey: ['suppliers', supplierId, 'state', year, month],
    queryFn: async () => {
      const startDate = `${year}-${String(month).padStart(2, '0')}-01`
      const endDate = new Date(year, month, 0).toISOString().split('T')[0]

      const { data: purchases, error } = await supabase
        .from('purchases')
        .select('total, paid, remaining, supplier_payments(amount, date)')
        .eq('supplier_id', supplierId)
        .gte('date', startDate)
        .lte('date', endDate)

      if (error) throw error

      const totalAchats = (purchases ?? []).reduce((s, p) => s + (p.total ?? 0), 0)
      const totalPaye = (purchases ?? []).reduce((s, p) => s + (p.paid ?? 0), 0)
      const resteAPayer = totalAchats - totalPaye

      return { totalAchats, totalPaye, resteAPayer }
    },
    enabled: Boolean(supplierId),
  })

// ── Mutations ─────────────────────────────────────────────────────────────────

export const useCreateSupplier = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: CreateSupplierInput) => {
      const user = await getCurrentUser()
      const { data, error } = await supabase
        .from('suppliers')
        .insert({ ...input, user_id: user.id })
        .select()
        .single()

      if (error) throw error
      return data as Supplier
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['suppliers'] })
      toast.success('Fournisseur créé avec succès')
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Erreur lors de la création')
    },
  })
}

export const useUpdateSupplier = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...input }: UpdateSupplierInput & { id: string }) => {
      const { data, error } = await supabase
        .from('suppliers')
        .update(input)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data as Supplier
    },
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ['suppliers'] })
      qc.invalidateQueries({ queryKey: ['suppliers', id] })
      toast.success('Fournisseur mis à jour')
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Erreur lors de la mise à jour')
    },
  })
}

export const useDeleteSupplier = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      // Vérification : fournisseur utilisé dans des achats ?
      const { count, error: checkErr } = await supabase
        .from('purchases')
        .select('id', { count: 'exact', head: true })
        .eq('supplier_id', id)

      if (checkErr) throw checkErr
      if ((count ?? 0) > 0) {
        throw new Error('Ce fournisseur a des achats associés et ne peut pas être supprimé.')
      }

      const { error } = await supabase.from('suppliers').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['suppliers'] })
      toast.success('Fournisseur supprimé')
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Erreur lors de la suppression')
    },
  })
}

// ── Types enrichis ────────────────────────────────────────────────────────────

export interface SupplierWithStats extends Supplier {
  totalDu: number
  paymentStatus: 'ok' | 'partial' | 'unpaid'
}
