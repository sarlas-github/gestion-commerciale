import { supabase } from './supabase'

let _companyId: string | null = null

supabase.auth.onAuthStateChange((event) => {
  if (event === 'SIGNED_OUT') _companyId = null
})

export async function getCompanyId(): Promise<string> {
  if (_companyId) return _companyId
  const { data, error } = await supabase.rpc('get_my_company_id')
  if (error || !data) throw new Error('Aucune entreprise associée')
  _companyId = data as string
  return _companyId
}
