export function getApiErrorMessage(err: Error, fallback: string): string {
  const msg = err?.message ?? ''
  if (msg.includes('unique') || msg.includes('duplicate'))
    return 'Cette valeur existe déjà.'
  if (msg.includes('foreign key') || msg.includes('violates'))
    return 'Suppression impossible : cet élément est utilisé dans d\'autres documents (ventes, achats ou stock).'
  if (msg.includes('Unauthorized') || msg.includes('JWT') || msg.includes('auth'))
    return 'Session expirée. Reconnectez-vous.'
  if (msg.includes('network') || msg.includes('fetch') || msg.includes('Failed'))
    return 'Erreur réseau. Vérifiez votre connexion.'
  
  // Si le message semble être une phrase en français (déjà traduit/propre), on le garde
  if (msg && !msg.includes('violates') && !msg.includes('constraint')) {
    return msg
  }

  return fallback
}
