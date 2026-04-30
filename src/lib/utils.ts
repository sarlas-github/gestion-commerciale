import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Format monnaie MAD — Format : 1 200,00 MAD
export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('fr-FR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount) + ' MAD'
}

// Format date en français
export const formatDate = (date: string | Date): string => {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleDateString('fr-FR')
}

// Format date ISO YYYY-MM-DD
export const toISODate = (date: Date): string => {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

// Calcule le statut de paiement
export const getPaymentStatus = (
  paid: number,
  total: number
): 'paid' | 'partial' | 'unpaid' => {
  if (paid === 0) return 'unpaid'
  if (paid >= total) return 'paid'
  return 'partial'
}

// Calcule le statut du stock
export const getStockStatus = (
  quantity: number,
  stockAlert: number
): 'ok' | 'faible' | 'rupture' => {
  if (quantity === 0) return 'rupture'
  if (quantity <= stockAlert) return 'faible'
  return 'ok'
}

// Format numéro document
export const formatDocumentNumber = (
  type: 'invoice' | 'receipt' | 'quote' | 'order' | 'delivery',
  year: number,
  sequence: number
): string => {
  const prefix: Record<string, string> = {
    invoice: 'FAC',
    receipt: 'REC',
    quote: 'DEV',
    order: 'BC',
    delivery: 'BL',
  }
  return `${prefix[type]}-${year}-${String(sequence).padStart(3, '0')}`
}

export const DEFAULT_PAGE_SIZE = 10

// Format numéro de téléphone marocain : XX XX XX XX XX
export const formatPhone = (phone: string | null | undefined): string => {
  if (!phone) return ''
  // Garder uniquement les chiffres
  const cleaned = phone.replace(/\D/g, '')
  // Limiter à 10 chiffres (standard marocain)
  const truncated = cleaned.slice(0, 10)
  // Ajouter les espaces tous les 2 chiffres
  const match = truncated.match(/.{1,2}/g)
  return match ? match.join(' ') : truncated
}

// Supprime les espaces pour stockage/validation
export const unformatPhone = (phone: string | null | undefined): string => {
  if (!phone) return ''
  return phone.replace(/\D/g, '')
}
