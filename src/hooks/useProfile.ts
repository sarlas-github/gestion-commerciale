import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Profile, BusinessMode } from '@/types'

async function getCurrentUser() {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Non authentifié')
  return user
}

export const useProfile = () =>
  useQuery({
    queryKey: ['profile'],
    queryFn: async () => {
      const user = await getCurrentUser()
      
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle()

      if (error) {
        console.error('Erreur chargement profil:', error)
        throw error
      }
      
      // IMPORTANT: Si le profil n'existe pas en base, on le crée.
      // Mais si vous me dites qu'il existe déjà, cette partie ne devrait pas s'exécuter.
      if (!data) {
        const { data: newProfile, error: insertError } = await supabase
          .from('profiles')
          .insert({ id: user.id, business_mode: 'revente' })
          .select()
          .single()
        
        if (insertError) throw insertError
        return newProfile as Profile
      }

      return data as Profile
    },
    retry: 1,
    staleTime: 1000 * 60 * 5, // 5 minutes
  })

export const useUpdateProfileMode = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (mode: BusinessMode) => {
      const user = await getCurrentUser()
      const { error } = await supabase
        .from('profiles')
        .update({ business_mode: mode, updated_at: new Date().toISOString() })
        .eq('id', user.id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['profile'] })
    },
  })
}
