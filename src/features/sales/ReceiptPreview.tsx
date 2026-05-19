import { forwardRef } from 'react'
import { formatCurrency, formatDate } from '@/lib/utils'
import { getPaymentMethodLabel } from '@/lib/constants'

export interface ReceiptPreviewData {
  receiptNumber?: string
  date: string
  company: {
    name: string | null
    address: string | null
    phone: string | null
    email: string | null
    logo_url: string | null
    couleur_marque: string
  }
  items: Array<{
    productName: string
    quantity: number
    unitPrice: number
    subtotal: number
  }>
  totalHT: number
  tvaRate: number
  tvaAmount: number
  totalTTC: number
  modePaiement?: string | null
}

interface ReceiptPreviewProps {
  data: ReceiptPreviewData
}

const C = {
  white: '#ffffff',
  black: '#111827',
  gray800: '#1f2937',
  gray700: '#374151',
  gray600: '#4b5563',
  gray500: '#6b7280',
  gray400: '#9ca3af',
  gray300: '#d1d5db',
  gray200: '#e5e7eb',
  gray100: '#f3f4f6',
  gray50: '#f9fafb',
}

interface CopyProps {
  data: ReceiptPreviewData
  isDuplicata: boolean
}

const ReceiptCopy = ({ data, isDuplicata }: CopyProps) => {
  const { receiptNumber, date, company, items, tvaRate, tvaAmount, totalTTC, modePaiement } = data
  const isDraft = !receiptNumber
  const displayNumber = receiptNumber ?? 'REC-****'
  const brandColor = company.couleur_marque || '#1e40af'

  const colQty = 60
  const colPrix = 140
  const colTotal = 140
  const colPad = 10

  return (
    <div style={{ padding: '28px 48px 24px', position: 'relative', backgroundColor: C.white }}>
      {isDraft && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none', opacity: 0.06 }}>
          <span style={{ color: C.black, fontWeight: 700, fontSize: '80px', transform: 'rotate(-35deg)', whiteSpace: 'nowrap', userSelect: 'none' }}>
            BROUILLON
          </span>
        </div>
      )}

      {/* En-tête */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '20px' }}>
        <div style={{ flex: 1 }}>
          {company.logo_url ? (
            <img
              src={company.logo_url}
              alt={company.name ?? ''}
              crossOrigin="anonymous"
              style={{ marginBottom: '8px', objectFit: 'contain', maxHeight: '48px', maxWidth: '140px', display: 'block' }}
            />
          ) : (
            <div style={{ marginBottom: '8px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', borderRadius: '4px', fontWeight: 700, color: C.white, fontSize: '16px', width: '48px', height: '48px', backgroundColor: brandColor }}>
              {(company.name ?? 'S').charAt(0).toUpperCase()}
            </div>
          )}
          <div style={{ fontSize: '15px', fontWeight: 700, color: C.black }}>{company.name ?? '—'}</div>
        </div>

        <div style={{ textAlign: 'right', marginLeft: '24px' }}>
          <div style={{ fontSize: '26px', fontWeight: 800, letterSpacing: '-0.025em', color: brandColor, lineHeight: 1 }}>
            REÇU{isDuplicata ? <span style={{ fontSize: '16px', fontWeight: 600 }}> — DUPLICATA</span> : null}
          </div>
          <div style={{ height: '3px', backgroundColor: brandColor, marginTop: '4px', marginBottom: '6px' }} />
          <div style={{ fontSize: '13px', fontWeight: 700, fontFamily: "'Roboto Mono', monospace", color: C.gray800 }}>
            N° {displayNumber}
          </div>
        </div>
      </div>

      {/* Séparateur */}
      <div style={{ height: '1px', backgroundColor: C.gray200, marginBottom: '14px' }} />

      {/* Date */}
      <div style={{ fontSize: '13px', color: C.gray700, marginBottom: '16px' }}>
        <span style={{ fontWeight: 600 }}>Date : </span>{formatDate(date)}
      </div>

      {/* Tableau */}
      <table style={{ width: '100%', marginBottom: '12px', fontSize: '13px', borderCollapse: 'separate', borderSpacing: 0, tableLayout: 'fixed' }}>
        <colgroup>
          <col />
          <col style={{ width: `${colQty}px` }} />
          <col style={{ width: `${colPrix}px` }} />
          <col style={{ width: `${colTotal}px` }} />
        </colgroup>
        <thead>
          <tr>
            <th style={{ textAlign: 'left', padding: `8px ${colPad}px`, fontWeight: 600, backgroundColor: brandColor, color: C.white }}>Description</th>
            <th style={{ textAlign: 'center', padding: `8px ${colPad}px`, fontWeight: 600, backgroundColor: brandColor, color: C.white }}>Qté</th>
            <th style={{ textAlign: 'right', padding: `8px ${colPad}px`, fontWeight: 600, backgroundColor: brandColor, color: C.white }}>Prix</th>
            <th style={{ textAlign: 'right', padding: `8px ${colPad}px`, fontWeight: 600, backgroundColor: brandColor, color: C.white }}>Total</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, i) => (
            <tr key={i}>
              <td style={{ padding: `6px ${colPad}px`, color: C.gray800, backgroundColor: i % 2 === 0 ? C.white : C.gray50, borderBottom: `1px solid ${C.gray100}` }}>{item.productName}</td>
              <td style={{ padding: `6px ${colPad}px`, textAlign: 'center', color: C.gray700, fontVariantNumeric: 'tabular-nums', backgroundColor: i % 2 === 0 ? C.white : C.gray50, borderBottom: `1px solid ${C.gray100}` }}>{item.quantity}</td>
              <td style={{ padding: `6px ${colPad}px`, textAlign: 'right', color: C.gray700, fontVariantNumeric: 'tabular-nums', backgroundColor: i % 2 === 0 ? C.white : C.gray50, borderBottom: `1px solid ${C.gray100}` }}>{formatCurrency(item.unitPrice)}</td>
              <td style={{ padding: `6px ${colPad}px`, textAlign: 'right', fontWeight: 500, color: C.gray800, fontVariantNumeric: 'tabular-nums', backgroundColor: i % 2 === 0 ? C.white : C.gray50, borderBottom: `1px solid ${C.gray100}` }}>{formatCurrency(item.subtotal)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Totaux */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
        <div style={{ display: 'inline-block', width: '240px' }}>
          {tvaAmount > 0 && (
            <div style={{ fontSize: '13px', padding: '4px 12px', borderBottom: `1px solid ${C.gray200}`, color: C.gray700 }}>
              <span style={{ float: 'left' }}>TVA ({tvaRate}%) :</span>
              <span style={{ float: 'right', fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(tvaAmount)}</span>
              <div style={{ clear: 'both' }} />
            </div>
          )}
          <div style={{ overflow: 'hidden', fontSize: '15px', fontWeight: 700, padding: '7px 12px', color: C.white, backgroundColor: brandColor }}>
            <span style={{ float: 'left' }}>TOTAL TTC</span>
            <span style={{ float: 'right', fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(totalTTC)}</span>
          </div>
        </div>
      </div>

      {/* Mode de paiement */}
      {modePaiement && (
        <div style={{ fontSize: '13px', color: C.gray600, marginBottom: '20px' }}>
          <span style={{ fontWeight: 600 }}>Mode de paiement : </span>{getPaymentMethodLabel(modePaiement)}
        </div>
      )}

      {/* Signatures */}
      <div style={{ display: 'flex', gap: '24px', marginTop: modePaiement ? '0' : '20px' }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: C.gray500, marginBottom: '6px' }}>
            {isDuplicata ? 'Signature Client' : 'Signature Émetteur'}
          </div>
          <div style={{ height: '64px', border: `1.5px dashed ${C.gray300}`, borderRadius: '4px' }} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: C.gray500, marginBottom: '6px' }}>
            {isDuplicata ? 'Signature Émetteur' : 'Signature Client'}
          </div>
          <div style={{ height: '64px', border: `1.5px dashed ${C.gray300}`, borderRadius: '4px' }} />
        </div>
      </div>
    </div>
  )
}

export const ReceiptPreview = forwardRef<HTMLDivElement, ReceiptPreviewProps>(
  ({ data }, ref) => {
    return (
      <div
        ref={ref}
        id="receipt-preview-content"
        style={{
          width: '794px',
          backgroundColor: C.white,
          color: C.black,
          fontFamily: "'Inter', system-ui, sans-serif",
          boxSizing: 'border-box',
        }}
      >
        {/* Copie 1 — Original */}
        <ReceiptCopy data={data} isDuplicata={false} />

        {/* Ligne de découpe */}
        <div style={{ position: 'relative', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ position: 'absolute', left: 0, right: 0, top: '50%', borderTop: '1.5px dashed #9ca3af' }} />
          <div style={{ position: 'relative', backgroundColor: C.white, padding: '0 8px', fontSize: '16px', color: '#9ca3af', userSelect: 'none' }}>✂</div>
        </div>

        {/* Copie 2 — Duplicata */}
        <ReceiptCopy data={data} isDuplicata={true} />
      </div>
    )
  }
)

ReceiptPreview.displayName = 'ReceiptPreview'
