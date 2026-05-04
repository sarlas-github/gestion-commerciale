import { useRef, useState, useLayoutEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Loader2, FileText, Printer, ArrowLeft } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { useSale } from '@/hooks/useSales'
import { useCompany } from '@/hooks/useCompany'
import { useGetSaleInvoice, useCreateInvoice } from '@/hooks/useDocuments'
import { InvoicePreview } from '@/features/sales/InvoicePreview'
import type { InvoicePreviewData } from '@/features/sales/InvoicePreview'

export const InvoicePreviewPage = () => {
  const { id: saleId } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const scaleWrapRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)
  const [previewHeight, setPreviewHeight] = useState(1200)
  const [isPrinting, setIsPrinting] = useState(false)

  const { data: sale, isLoading: loadingSale } = useSale(saleId ?? '')
  const { data: company, isLoading: loadingCompany } = useCompany()
  const { data: existingInvoice, isLoading: loadingInvoice } = useGetSaleInvoice(saleId)
  const createInvoice = useCreateInvoice()

  const isLoading = loadingSale || loadingCompany || loadingInvoice

  // Measure the actual container width (accounts for sidebar, main padding, container padding)
  const updateScale = useCallback(() => {
    if (!scaleWrapRef.current) return
    const container = containerRef.current
    // container clientWidth = actual available width inside the scroll area (minus its own padding via CSS)
    const available = container ? container.clientWidth - 32 : window.innerWidth - 64 // 16px padding each side
    const newScale = Math.min(1, available / 794)
    setScale(newScale)
    setPreviewHeight(scaleWrapRef.current.scrollHeight)
  }, [])

  useLayoutEffect(() => {
    updateScale()
    window.addEventListener('resize', updateScale)
    return () => window.removeEventListener('resize', updateScale)
  }, [updateScale])

  useLayoutEffect(() => {
    if (!isLoading) {
      const t = setTimeout(updateScale, 80)
      return () => clearTimeout(t)
    }
  }, [isLoading, updateScale])

  // ── Preview data ───────────────────────────────────────────────────────────

  const previewData: InvoicePreviewData | null = (() => {
    if (!sale) return null

    if (existingInvoice) {
      return {
        invoiceNumber: existingInvoice.number,
        date: existingInvoice.date,
        company: {
          name: existingInvoice.company_name,
          address: existingInvoice.company_address,
          phone: existingInvoice.company_phone,
          email: existingInvoice.company_email,
          ice: existingInvoice.company_ice,
          if_number: existingInvoice.company_if,
          rc: existingInvoice.company_rc,
          tp_number: existingInvoice.company_tp,
          rib: existingInvoice.company_rib,
          site_web: existingInvoice.company_site_web,
          logo_url: existingInvoice.company_logo_url,
          couleur_marque: existingInvoice.company_couleur_marque ?? '#1e40af',
        },
        client: {
          name: existingInvoice.client_name,
          address: existingInvoice.client_address,
          phone: existingInvoice.client_phone,
          ice: existingInvoice.client_ice,
        },
        items: (existingInvoice.document_items ?? []).map(item => ({
          productName: item.product_name,
          quantity: item.quantity,
          unitPrice: item.unit_price,
          subtotal: item.subtotal,
        })),
        totalHT: existingInvoice.total - existingInvoice.tva_amount,
        tvaRate: existingInvoice.tva_rate,
        tvaAmount: existingInvoice.tva_amount,
        totalTTC: existingInvoice.total,
        note: existingInvoice.note,
      }
    }

    // Draft — live sale data
    const tvaRate = sale.tva_rate ?? 0
    const tvaAmount = sale.tva_amount ?? 0
    const items = (sale.sale_items ?? []).map(item => {
      const qty = item.quantity * (item.pieces_count || 1)
      return {
        productName: item.products?.name ?? 'Produit inconnu',
        quantity: qty,
        unitPrice: item.unit_price,
        subtotal: qty * item.unit_price,
      }
    })
    return {
      invoiceNumber: undefined,
      date: sale.date,
      company: {
        name: company?.name ?? null,
        address: company?.address ?? null,
        phone: company?.phone ?? null,
        email: company?.email ?? null,
        ice: company?.ice ?? null,
        if_number: company?.if_number ?? null,
        rc: company?.rc ?? null,
        tp_number: company?.tp_number ?? null,
        rib: company?.rib ?? null,
        site_web: company?.site_web ?? null,
        logo_url: company?.logo_url ?? null,
        couleur_marque: company?.couleur_marque ?? '#1e40af',
      },
      client: { name: sale.clients?.name ?? null, address: null, phone: null, ice: null },
      items,
      totalHT: sale.total - tvaAmount,
      tvaRate,
      tvaAmount,
      totalTTC: sale.total,
      note: sale.note,
    }
  })()

  // ── Actions ──────────────────────────────────────────────────────────────────

  const handleGenerate = async () => {
    if (!sale || !saleId) return
    await createInvoice.mutateAsync({
      sale_id: saleId,
      client_id: sale.client_id,
      date: sale.date,
      note: sale.note,
      total: sale.total,
      paid: sale.paid,
      tva_rate: sale.tva_rate ?? 0,
      tva_amount: sale.tva_amount ?? 0,
      items: (sale.sale_items ?? []).map(item => ({
        product_id: item.product_id,
        product_name: item.products?.name ?? 'Produit inconnu',
        quantity: item.quantity,
        pieces_count: item.pieces_count || 1,
        unit_price: item.unit_price,
      })),
    })
  }

  /**
   * Opens native print dialog using the invoice HTML.
   * The browser's own rendering engine handles the output,
   * guaranteeing pixel-perfect rendering identical to the preview.
   * User can choose to Print or "Save as PDF" from the dialog.
   */
  const openPrintDialog = async () => {
    const invoiceEl = document.getElementById('invoice-preview-content')
    if (!invoiceEl) throw new Error('Aperçu introuvable')

    const iframe = document.createElement('iframe')
    iframe.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0'
    document.body.appendChild(iframe)
    const doc = iframe.contentWindow?.document
    if (!doc) { document.body.removeChild(iframe); return }
    doc.open()
    doc.write(
      `<!DOCTYPE html><html><head><title>${previewData?.invoiceNumber ?? 'Facture'}</title>` +
      `<style>` +
      `*,*::before,*::after{box-sizing:border-box}` +
      `@page{size:A4;margin:0}` +
      `html,body{margin:0;padding:0;width:210mm}` +
      `#invoice-preview-content{width:210mm!important;min-height:297mm!important}` +
      `*{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}` +
      `</style></head>` +
      `<body>${invoiceEl.outerHTML}</body></html>`
    )
    doc.close()
    // Chrome uses the parent window's document.title as the PDF filename suggestion,
    // not the iframe's <title>. Swap it temporarily then restore.
    const fileName = previewData?.invoiceNumber ?? 'Facture'
    const prevTitle = document.title
    document.title = fileName
    setTimeout(() => {
      iframe.contentWindow?.print()
      setTimeout(() => {
        document.title = prevTitle
        if (document.body.contains(iframe)) document.body.removeChild(iframe)
      }, 2000)
    }, 300)
  }

  const handlePrint = async () => {
    setIsPrinting(true)
    try {
      await openPrintDialog()
    } catch (err) {
      console.error('Print error:', err)
      toast.error("Erreur lors de l'impression")
    } finally {
      setIsPrinting(false)
    }
  }

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1)
    } else {
      navigate('/sales')
    }
  }

  const canExport = Boolean(existingInvoice)
  const isWorking = createInvoice.isPending || isPrinting

  const waPhone = (() => {
    const raw = previewData?.client?.phone ?? null
    if (!raw) return null
    const d = raw.replace(/\D/g, '')
    if (d.startsWith('0') && d.length === 10) return '212' + d.slice(1)
    if (d.length === 9) return '212' + d
    if (d.startsWith('212') && d.length === 12) return d
    return null
  })()
  const waMessage = previewData
    ? `Bonjour Mme/M. ${previewData.client.name ?? ''},\n\nVeuillez trouver ci-joint votre facture.\nN'hésitez pas à nous contacter pour toute question.\n\nMerci pour votre confiance.`
    : ''
  const waUrl = waPhone ? `https://wa.me/${waPhone}?text=${encodeURIComponent(waMessage)}` : null

  return (
    <div className="flex flex-col h-full -m-4 lg:-m-6">
      {/* Top bar */}
      <div className="shrink-0 flex items-center justify-between gap-2 px-4 py-3 border-b bg-background">
        <div className="flex items-center gap-2 min-w-0">
          <Button variant="ghost" size="icon-sm" onClick={handleBack}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
          <span className="font-medium text-sm truncate">
            {existingInvoice ? `Facture ${existingInvoice.number}` : 'Aperçu facture — brouillon'}
          </span>
        </div>

        <div className="flex gap-2 shrink-0">
          {!existingInvoice && !isLoading && (
            <Button size="sm" onClick={handleGenerate} disabled={isWorking || !previewData}>
              {createInvoice.isPending && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
              <span className="hidden sm:inline">Générer</span>
              <span className="sm:hidden">Gen.</span>
            </Button>
          )}
          <Button size="sm" variant="outline" disabled={!canExport || isWorking} onClick={handlePrint}>
            {isPrinting ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Printer className="mr-1.5 h-3.5 w-3.5" />}
            <span className="hidden sm:inline">Imprimer / PDF</span>
            <span className="sm:hidden">Imp.</span>
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={!canExport || !waUrl}
            onClick={() => waUrl && window.open(waUrl, '_blank', 'noopener,noreferrer')}
            className="border-[#25D366] text-[#25D366] hover:bg-[#25D366]/10 hover:text-[#25D366] disabled:border-input disabled:text-muted-foreground"
          >
            <svg className="mr-1.5 h-3.5 w-3.5 shrink-0" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
            <span className="hidden sm:inline">WhatsApp</span>
          </Button>
        </div>
      </div>

      {/* Preview area — ref used to measure actual available width */}
      <div ref={containerRef} className="flex-1 overflow-y-auto overflow-x-hidden bg-gray-100 p-4">
        {isLoading ? (
          <div className="flex h-40 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : !previewData ? (
          <div className="text-center text-muted-foreground py-20">Vente introuvable.</div>
        ) : (
          <div
            className="mx-auto shadow-lg overflow-hidden"
            style={{
              width: `${Math.floor(794 * scale)}px`,
              height: `${Math.floor(previewHeight * scale)}px`,
            }}
          >
            <div
              ref={scaleWrapRef}
              style={{
                width: '794px',
                transformOrigin: 'top left',
                transform: `scale(${scale})`,
              }}
            >
              <InvoicePreview data={previewData} />
            </div>
          </div>
        )}
      </div>

      {/* Bottom info (mobile only — draft notice) */}
      {!existingInvoice && !isLoading && (
        <div className="sm:hidden shrink-0 px-4 py-2 border-t bg-background">
          <p className="text-xs text-muted-foreground text-center">
            Le numéro sera attribué à la génération.
          </p>
        </div>
      )}
    </div>
  )
}
