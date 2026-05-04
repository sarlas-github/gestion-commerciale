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
    site_web: string | null
    ice: string | null
    if_number: string | null
    rc: string | null
    tp_number: string | null
    rib: string | null
    logo_url: string | null
    couleur_marque: string
  }
  client: {
    name: string | null
    address: string | null
    phone: string | null
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
 * IMPORTANT: All brand-colored elements (green bars) use SIMPLE div+padding,
 * NOT display:flex. html2canvas has known bugs rendering backgrounds on flex
 * containers. By keeping colored elements as plain block divs, the PDF/print
 * output matches the browser preview pixel-for-pixel.
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

    // Column widths for the table (fixed px values — no flex!)
    const colQty = 70
    const colPU = 130
    const colTotal = 140
    const colPad = 12

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
            {company.site_web && <div style={{ fontSize: '13px', color: C.gray500 }}>{company.site_web}</div>}
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
        <div style={{ textAlign: 'right', marginBottom: '28px' }}>
          <div
            style={{
              display: 'inline-block',
              width: '280px',
              textAlign: 'left',
              overflow: 'hidden',
              border: `1px solid ${C.gray200}`,
            }}
          >
            {/* Header — simple block div, NO flex */}
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
              {client.phone && <div style={{ fontSize: '13px', color: C.gray500 }}>{client.phone}</div>}
              {client.ice && <div style={{ fontSize: '13px', color: C.gray500 }}>ICE : {client.ice}</div>}
            </div>
          </div>
        </div>

        {/* ── Tableau des articles ─────────────────────────────────────────
             NO flex on colored elements. Using a real <table> with background
             on <thead> (single element) instead of per-cell backgrounds.
             html2canvas handles <thead> background correctly.
        ──────────────────────────────────────────────────────────────────── */}
        <table
          style={{
            width: '100%',
            marginBottom: '28px',
            fontSize: '14px',
            borderCollapse: 'separate',
            borderSpacing: 0,
            tableLayout: 'fixed',
          }}
        >
          <colgroup>
            <col />
            <col style={{ width: `${colQty}px` }} />
            <col style={{ width: `${colPU}px` }} />
            <col style={{ width: `${colTotal}px` }} />
          </colgroup>
          <thead>
            <tr>
              <th style={{ textAlign: 'left', padding: `10px ${colPad}px`, fontWeight: 600, backgroundColor: brandColor, color: C.white }}>Produit</th>
              <th style={{ textAlign: 'center', padding: `10px ${colPad}px`, fontWeight: 600, backgroundColor: brandColor, color: C.white }}>Qté</th>
              <th style={{ textAlign: 'right', padding: `10px ${colPad}px`, fontWeight: 600, backgroundColor: brandColor, color: C.white }}>P.U. HT</th>
              <th style={{ textAlign: 'right', padding: `10px ${colPad}px`, fontWeight: 600, backgroundColor: brandColor, color: C.white }}>Montant HT</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, i) => (
              <tr key={i}>
                <td style={{ padding: `8px ${colPad}px`, color: C.gray800, backgroundColor: i % 2 === 0 ? C.white : C.gray50, borderBottom: `1px solid ${C.gray100}` }}>{item.productName}</td>
                <td style={{ padding: `8px ${colPad}px`, textAlign: 'center', color: C.gray700, fontVariantNumeric: 'tabular-nums', backgroundColor: i % 2 === 0 ? C.white : C.gray50, borderBottom: `1px solid ${C.gray100}` }}>
                  {item.quantity}
                </td>
                <td style={{ padding: `8px ${colPad}px`, textAlign: 'right', color: C.gray700, fontVariantNumeric: 'tabular-nums', backgroundColor: i % 2 === 0 ? C.white : C.gray50, borderBottom: `1px solid ${C.gray100}` }}>
                  {formatCurrency(item.unitPrice)}
                </td>
                <td style={{ padding: `8px ${colPad}px`, textAlign: 'right', fontWeight: 500, color: C.gray800, fontVariantNumeric: 'tabular-nums', backgroundColor: i % 2 === 0 ? C.white : C.gray50, borderBottom: `1px solid ${C.gray100}` }}>
                  {formatCurrency(item.subtotal)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* ── Totaux ──────────────────────────────────────────────────────
             NO flex on the Total TTC bar. Using a simple table layout
             for the totals section to ensure html2canvas alignment.
        ──────────────────────────────────────────────────────────────────── */}
        <div style={{ textAlign: 'right', marginBottom: '24px' }}>
          <div style={{ display: 'inline-block', width: '260px', textAlign: 'left' }}>
            {/* Total HT */}
            <div style={{ overflow: 'hidden', fontSize: '14px', padding: '4px 0', color: C.gray600 }}>
              <span style={{ float: 'left' }}>Total HT</span>
              <span style={{ float: 'right', fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(totalHT)}</span>
            </div>
            {/* TVA */}
            {tvaRate > 0 && (
              <div style={{ overflow: 'hidden', fontSize: '14px', padding: '4px 0', color: C.gray600 }}>
                <span style={{ float: 'left' }}>TVA ({tvaRate}%)</span>
                <span style={{ float: 'right', fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(tvaAmount)}</span>
              </div>
            )}
            {/* Total TTC — simple block div with background, NO flex */}
            <div
              style={{
                overflow: 'hidden',
                fontSize: '16px',
                fontWeight: 700,
                padding: '8px 12px',
                marginTop: '8px',
                color: C.white,
                backgroundColor: brandColor,
              }}
            >
              <span style={{ float: 'left' }}>Total TTC</span>
              <span style={{ float: 'right', fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(totalTTC)}</span>
            </div>
          </div>
        </div>

        {/* ── Spacer: pushes footer to bottom of A4 page ─────────────────── */}
        <div style={{ flexGrow: 1 }} />

        {/* ── Pied de page ────────────────────────────────────────────────── */}
        {(company.name || legalInfoParts.length > 0 || company.rib) && (
          <div>
            {company.name && (
              <div style={{ fontSize: '12px', fontWeight: 600, color: C.gray600, textAlign: 'center', marginBottom: '8px', letterSpacing: '0.04em' }}>
                {company.name}
              </div>
            )}
            <div style={{ height: '1px', backgroundColor: C.gray200, marginBottom: '10px' }} />
            {legalInfoParts.length > 0 && (
              <div style={{ fontSize: '11px', color: C.gray400, textAlign: 'center', marginBottom: company.rib ? '4px' : 0 }}>
                {legalInfoParts.join('  ·  ')}
              </div>
            )}
            {company.rib && (
              <div style={{ fontSize: '11px', color: C.gray400, textAlign: 'center' }}>
                RIB : {company.rib}
              </div>
            )}
          </div>
        )}
      </div>
    )
  }
)

InvoicePreview.displayName = 'InvoicePreview'
