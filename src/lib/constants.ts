export const APP_NAME = 'PilotCommerce'
export const DEFAULT_BRAND_COLOR = '#4f46e5'

export const PAYMENT_METHODS = [
  { value: 'especes',       label: 'Espèces'       },
  { value: 'virement',      label: 'Virement'      },
  { value: 'carte_bancaire',label: 'Carte Bancaire'},
  { value: 'mobile_money',  label: 'Mobile Money'  },
  { value: 'cheque',        label: 'Chèque'        },
  { value: 'credit',        label: 'Crédit'        },
] as const

/** Retourne le libellé affichable d'une méthode de paiement.
 *  Gère aussi les anciennes valeurs textuelles (rétrocompatibilité). */
export function getPaymentMethodLabel(value: string | null | undefined): string {
  if (!value) return '—'
  return PAYMENT_METHODS.find(m => m.value === value)?.label ?? value
}
