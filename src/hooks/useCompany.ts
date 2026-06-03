import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { DEFAULT_BRAND_COLOR } from '@/lib/constants'
import { getApiErrorMessage } from '@/lib/apiError'
import type { Company } from '@/types'

const ALLOWED_LOGO_MIME = ['image/png', 'image/jpeg', 'image/webp']
const MAX_LOGO_SIZE = 2 * 1024 * 1024

async function getCurrentUser() {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Non authentifié')
  return user
}

export const useCompany = () =>
  useQuery({
    queryKey: ['company'],
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const user = await getCurrentUser()
      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle()
      if (error) throw error
      return data as Company | null
    },
  })

export interface UpsertCompanyInput {
  name: string
  forme_juridique: string
  email: string
  phone: string
  site_web: string
  address: string
  ice: string
  if_number: string
  rc: string
  tp_number: string
  rib: string
  taux_tva_defaut: number
  couleur_marque: string
  label_quantity: string
  logo_url?: string | null
  logoFile?: File
}

export const useUpsertCompany = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: UpsertCompanyInput) => {
      const user = await getCurrentUser()

      let logo_url = input.logo_url ?? null

      if (input.logoFile) {
        if (!ALLOWED_LOGO_MIME.includes(input.logoFile.type))
          throw new Error('Format non autorisé. Utilisez PNG, JPG ou WebP.')
        if (input.logoFile.size > MAX_LOGO_SIZE)
          throw new Error('Logo trop lourd. Maximum 2 Mo.')

        const ext = input.logoFile.name.split('.').pop()?.toLowerCase() ?? 'png'
        const path = `${user.id}/logo.${ext}`
        const { error: uploadErr } = await supabase.storage
          .from('logos')
          .upload(path, input.logoFile, { upsert: true, contentType: input.logoFile.type })
        if (uploadErr) throw uploadErr
        const { data: urlData } = supabase.storage.from('logos').getPublicUrl(path)
        logo_url = urlData.publicUrl
      }

      // Stocker uniquement les chiffres (UX_RULES §13)
      const phoneDigits = (input.phone ?? '').replace(/\D/g, '') || null

      const payload = {
        user_id: user.id,
        name: input.name,
        forme_juridique: input.forme_juridique || null,
        address: input.address || null,
        phone: phoneDigits,
        email: input.email || null,
        site_web: input.site_web || null,
        ice: input.ice || null,
        if_number: input.if_number || null,
        rc: input.rc || null,
        tp_number: input.tp_number || null,
        rib: input.rib || null,
        taux_tva_defaut: input.taux_tva_defaut ?? 10,
        couleur_marque: input.couleur_marque || DEFAULT_BRAND_COLOR,
        label_quantity: input.label_quantity || 'Quantité',
        logo_url,
      }

      const existingCompany = qc.getQueryData<Company | null>(['company'])

      if (existingCompany?.id) {
        const { user_id: _, ...updatePayload } = payload
        const { error } = await supabase
          .from('companies')
          .update(updatePayload)
          .eq('id', existingCompany.id)
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('companies')
          .insert(payload)
        if (error) throw error
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['company'] })
      toast.success('Paramètres enregistrés')
    },
    onError: (err: Error) => {
      toast.error(getApiErrorMessage(err, 'Erreur lors de la sauvegarde'))
    },
  })
}
