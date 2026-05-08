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
  if (quantity <= 0) return 'rupture'
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

export function isUniqueNameError(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    (err as Record<string, unknown>).code === '23505'
  )
}

// Convertit un montant en lettres (français, dirhams marocains)
// Exemple : 2300.50 → "Deux mille trois cents dirhams et cinquante centimes"
export function numberToWords(amount: number): string {
  const ONES = ['', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf',
    'dix', 'onze', 'douze', 'treize', 'quatorze', 'quinze', 'seize', 'dix-sept', 'dix-huit', 'dix-neuf']
  const TENS = ['', '', 'vingt', 'trente', 'quarante', 'cinquante', 'soixante', 'soixante', 'quatre-vingt', 'quatre-vingt']

  function belowHundred(n: number): string {
    if (n < 20) return ONES[n]
    const t = Math.floor(n / 10)
    const o = n % 10
    if (t === 7) return o === 1 ? 'soixante et onze' : `soixante-${ONES[10 + o]}`
    if (t === 9) return o === 0 ? 'quatre-vingt-dix' : `quatre-vingt-${ONES[10 + o]}`
    if (o === 0) return t === 8 ? 'quatre-vingts' : TENS[t]
    if (o === 1 && t !== 8) return `${TENS[t]} et un`
    return `${TENS[t]}-${ONES[o]}`
  }

  function belowThousand(n: number): string {
    if (n < 100) return belowHundred(n)
    const h = Math.floor(n / 100)
    const r = n % 100
    const prefix = h === 1 ? 'cent' : `${ONES[h]} cent`
    if (r === 0) return h === 1 ? 'cent' : `${ONES[h]} cents`
    return `${prefix} ${belowHundred(r)}`
  }

  function convert(n: number): string {
    if (n === 0) return 'zéro'
    if (n < 1000) return belowThousand(n)
    if (n < 1_000_000) {
      const k = Math.floor(n / 1000)
      const r = n % 1000
      const prefix = k === 1 ? 'mille' : `${belowThousand(k)} mille`
      return r === 0 ? prefix : `${prefix} ${belowThousand(r)}`
    }
    return String(n)
  }

  const rounded = Math.round(amount * 100)
  const dirhams = Math.floor(rounded / 100)
  const centimes = rounded % 100

  const dirhamPart = `${capitalize(convert(dirhams))} dirham${dirhams > 1 ? 's' : ''}`
  if (centimes === 0) return dirhamPart
  return `${dirhamPart} et ${convert(centimes)} centime${centimes > 1 ? 's' : ''}`
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

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
