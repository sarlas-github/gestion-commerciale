export function getApiErrorMessage(err: Error, fallback: string): string {
  const msg = err?.message ?? ''
  if (msg.includes('unique') || msg.includes('duplicate'))
    return 'Cette valeur existe déjà.'
  if (msg.includes('foreign key') || msg.includes('violates'))
    return 'Opération impossible — des données liées existent.'
  if (msg.includes('Unauthorized') || msg.includes('JWT') || msg.includes('auth'))
    return 'Session expirée. Reconnectez-vous.'
  if (msg.includes('network') || msg.includes('fetch') || msg.includes('Failed'))
    return 'Erreur réseau. Vérifiez votre connexion.'
  return fallback
}
