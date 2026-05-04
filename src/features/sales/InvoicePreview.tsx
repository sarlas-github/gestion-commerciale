import { forwardRef } from 'react'
import { formatCurrency, formatDate } from '@/lib/utils'

export interface InvoicePreviewData {
  invoiceNumber?: string // undefined = brouillon (affiche "****")
  date: string
  company: {
    name: string | null
    address: string | null
    phone: string | null
    email: string | null
    ice: string | null
    if_number: string | null
    rc: string | null
    tp_number: string | null
    logo_url: string | null
    couleur_marque: string
  }
  client: {
    name: string | null
    address: string | null
    ice: string | null
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
  note?: string | null
}

interface InvoicePreviewProps {
  data: InvoicePreviewData
}

/**
 * Pure invoice template — uses ONLY inline styles and hardcoded hex colors.
 * Zero Tailwind classes → zero oklch() references → html2canvas works perfectly.
 *
 * Layout: flexbox column with minHeight=1123px (A4 at 96dpi).
 * A flex-grow spacer pushes the footer to the bottom without using position:absolute.
 */
export const InvoicePreview = forwardRef<HTMLDivElement, InvoicePreviewProps>(
  ({ data }, ref) => {
    const { invoiceNumber, date, company, client, items, totalHT, tvaRate, tvaAmount, totalTTC } = data
    const isDraft = !invoiceNumber
    const displayNumber = invoiceNumber ?? 'FAC-****'
    const brandColor = company.couleur_marque || '#1e40af'

    const legalInfoParts = [
      company.ice && `ICE : ${company.ice}`,
      company.if_number && `IF : ${company.if_number}`,
      company.rc && `RC : ${company.rc}`,
      company.tp_number && `TP : ${company.tp_number}`,
    ].filter(Boolean)

    // Color palette — all hardcoded hex, no CSS variables
    const C = {
      white: '#ffffff',
      black: '#111827',    // gray-900
      gray800: '#1f2937',
      gray700: '#374151',
      gray600: '#4b5563',
      gray500: '#6b7280',
      gray400: '#9ca3af',
      gray200: '#e5e7eb',
      gray100: '#f3f4f6',
      gray50: '#f9fafb',
    }

    return (
      <div
        ref={ref}
        id="invoice-preview-content"
        style={{
          width: '794px',
          minHeight: '1118px',
          padding: '48px',
          backgroundColor: C.white,
          color: C.black,
          fontFamily: "'Inter', system-ui, sans-serif",
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
        }}
      >
        {/* Brouillon watermark */}
        {isDraft && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              pointerEvents: 'none',
              opacity: 0.06,
            }}
          >
            <span
              style={{
                color: C.black,
                fontWeight: 700,
                fontSize: '120px',
                transform: 'rotate(-35deg)',
                whiteSpace: 'nowrap',
                userSelect: 'none',
              }}
            >
              BROUILLON
            </span>
          </div>
        )}

        {/* ── En-tête ─────────────────────────────────────────────────────── */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '40px' }}>
          {/* Société */}
          <div style={{ flex: 1 }}>
            {company.logo_url ? (
              <img
                src={company.logo_url}
                alt={company.name ?? ''}
                crossOrigin="anonymous"
                style={{ marginBottom: '12px', objectFit: 'contain', maxHeight: '64px', maxWidth: '180px', display: 'block' }}
              />
            ) : (
              <div
                style={{
                  marginBottom: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '4px',
                  fontWeight: 700,
                  color: C.white,
                  fontSize: '18px',
                  width: '64px',
                  height: '64px',
                  backgroundColor: brandColor,
                }}
              >
                {(company.name ?? 'S').charAt(0).toUpperCase()}
              </div>
            )}
            <div style={{ fontSize: '16px', fontWeight: 700, color: C.black }}>{company.name ?? '—'}</div>
            {company.address && (
              <div style={{ fontSize: '13px', color: C.gray500, whiteSpace: 'pre-line' }}>{company.address}</div>
            )}
            {company.phone && <div style={{ fontSize: '13px', color: C.gray500 }}>{company.phone}</div>}
            {company.email && <div style={{ fontSize: '13px', color: C.gray500 }}>{company.email}</div>}
          </div>

          {/* Titre facture */}
          <div style={{ textAlign: 'right', marginLeft: '32px' }}>
            <div
              style={{
                fontSize: '30px',
                fontWeight: 800,
                letterSpacing: '-0.025em',
                marginBottom: '4px',
                color: brandColor,
              }}
            >
              FACTURE
            </div>
            <div style={{ fontSize: '18px', fontWeight: 700, fontFamily: "'Roboto Mono', monospace", color: C.gray800 }}>
              {displayNumber}
            </div>
            <div style={{ fontSize: '14px', color: C.gray500, marginTop: '4px' }}>
              Date : {formatDate(date)}
            </div>
          </div>
        </div>

        {/* Séparateur */}
        <div style={{ height: '1px', backgroundColor: C.gray200, marginBottom: '28px' }} />

        {/* ── Client (right-aligned card with brand header) ──────────────── */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '28px' }}>
          <div
            style={{
              width: '280px',
              overflow: 'hidden',
              border: `1px solid ${C.gray200}`,
            }}
          >
            {/* Header */}
            <div
              style={{
                backgroundColor: brandColor,
                color: C.white,
                fontSize: '12px',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                padding: '6px 14px',
              }}
            >
              Client
            </div>
            {/* Body */}
            <div style={{ padding: '12px 14px', backgroundColor: C.white }}>
              <div style={{ fontSize: '15px', fontWeight: 700, color: C.black, marginBottom: '2px' }}>
                {client.name ?? '—'}
              </div>
              {client.address && (
                <div style={{ fontSize: '13px', color: C.gray500, whiteSpace: 'pre-line' }}>{client.address}</div>
              )}
              {client.ice && <div style={{ fontSize: '13px', color: C.gray500 }}>ICE : {client.ice}</div>}
            </div>
          </div>
        </div>

        {/* ── Tableau des articles (div-based for html2canvas compatibility) ── */}
        <div style={{ marginBottom: '28px', fontSize: '14px' }}>
          {/* Header row */}
          <div
            style={{
              display: 'flex',
              backgroundColor: brandColor,
              color: C.white,
              fontWeight: 600,
              padding: '10px 0',
            }}
          >
            <div style={{ flex: 1, paddingLeft: '12px', paddingRight: '12px' }}>Produit</div>
            <div style={{ width: '70px', textAlign: 'center', paddingLeft: '12px', paddingRight: '12px' }}>Qté</div>
            <div style={{ width: '130px', textAlign: 'right', paddingLeft: '12px', paddingRight: '12px' }}>P.U. HT</div>
            <div style={{ width: '140px', textAlign: 'right', paddingLeft: '12px', paddingRight: '12px' }}>Montant HT</div>
          </div>
          {/* Data rows */}
          {items.map((item, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                padding: '8px 0',
                backgroundColor: i % 2 === 0 ? C.white : C.gray50,
                borderBottom: `1px solid ${C.gray100}`,
              }}
            >
              <div style={{ flex: 1, paddingLeft: '12px', paddingRight: '12px', color: C.gray800 }}>{item.productName}</div>
              <div style={{ width: '70px', textAlign: 'center', paddingLeft: '12px', paddingRight: '12px', color: C.gray700, fontVariantNumeric: 'tabular-nums' }}>{item.quantity}</div>
              <div style={{ width: '130px', textAlign: 'right', paddingLeft: '12px', paddingRight: '12px', color: C.gray700, fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(item.unitPrice)}</div>
              <div style={{ width: '140px', textAlign: 'right', paddingLeft: '12px', paddingRight: '12px', fontWeight: 500, color: C.gray800, fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(item.subtotal)}</div>
            </div>
          ))}
        </div>

        {/* ── Totaux ──────────────────────────────────────────────────────── */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '24px' }}>
          <div style={{ width: '260px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', padding: '4px 0', color: C.gray600 }}>
              <span>Total HT</span>
              <span style={{ fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(totalHT)}</span>
            </div>
            {tvaRate > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', padding: '4px 0', color: C.gray600 }}>
                <span>TVA ({tvaRate}%)</span>
                <span style={{ fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(tvaAmount)}</span>
              </div>
            )}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '16px',
                fontWeight: 700,
                padding: '8px 12px',
                marginTop: '4px',
                color: C.white,
                backgroundColor: brandColor,
              }}
            >
              <span>Total TTC</span>
              <span style={{ fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(totalTTC)}</span>
            </div>
          </div>
        </div>

        {/* ── Spacer: pushes footer to bottom of A4 page ─────────────────── */}
        <div style={{ flexGrow: 1 }} />

        {/* ── Pied de page ────────────────────────────────────────────────── */}
        {legalInfoParts.length > 0 && (
          <div>
            <div style={{ height: '1px', backgroundColor: C.gray200, marginBottom: '12px' }} />
            <div style={{ fontSize: '12px', color: C.gray400, textAlign: 'center' }}>
              {legalInfoParts.join('  ·  ')}
            </div>
          </div>
        )}
      </div>
    )
  }
)

InvoicePreview.displayName = 'InvoicePreview'
