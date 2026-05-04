import { useRef, useState, useLayoutEffect, useCallback } from 'react'
import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'
import { Loader2, FileText, Printer, Download } from 'lucide-react'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { useSale } from '@/hooks/useSales'
import { useCompany } from '@/hooks/useCompany'
import { useGetSaleInvoice, useCreateInvoice } from '@/hooks/useDocuments'
import { InvoicePreview } from './InvoicePreview'
import type { InvoicePreviewData } from './InvoicePreview'

interface InvoicePreviewModalProps {
  saleId: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export const InvoicePreviewModal = ({ saleId, open, onOpenChange }: InvoicePreviewModalProps) => {
  // Transform wrapper — used to measure natural height and cloneNode for capture
  const scaleWrapRef = useRef<HTMLDivElement>(null)
  // Scroll area — MUST have overflow-x:hidden so clientWidth = dialog width (not content width)
  const containerRef = useRef<HTMLDivElement>(null)

  const [scale, setScale] = useState(1)
  const [previewHeight, setPreviewHeight] = useState(1200)
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false)
  const [isPrinting, setIsPrinting] = useState(false)

  const { data: sale, isLoading: loadingSale } = useSale(saleId ?? '')
  const { data: company, isLoading: loadingCompany } = useCompany()
  const { data: existingInvoice, isLoading: loadingInvoice } = useGetSaleInvoice(saleId)
  const createInvoice = useCreateInvoice()

  const isLoading = loadingSale || loadingCompany || loadingInvoice

  // Recompute scale from window width.
  // Mobile: use full viewport width (no dialog padding overhead — we use w-[100vw] on mobile).
  // Desktop: dialog is w-[95vw] capped at 950px; container has p-4 (16px each side) = 32px.
  const updateScale = useCallback(() => {
    if (!scaleWrapRef.current) return
    const vw = window.innerWidth
    let available: number
    if (vw < 640) {
      // Mobile — full screen modal, 8px padding each side
      available = vw - 16
    } else {
      const dialogW = Math.min(vw * 0.95, 950)
      available = dialogW - 32
    }
    const newScale = Math.min(1, available / 794)
    setScale(newScale)
    // scrollHeight is the NATURAL (unscaled) height — transform doesn't affect layout dimensions
    setPreviewHeight(scaleWrapRef.current.scrollHeight)
  }, [])

  useLayoutEffect(() => {
    updateScale()
    window.addEventListener('resize', updateScale)
    return () => window.removeEventListener('resize', updateScale)
  }, [updateScale])

  // Re-measure once invoice data has rendered into the DOM
  useLayoutEffect(() => {
    if (!isLoading) {
      const t = setTimeout(updateScale, 80)
      return () => clearTimeout(t)
    }
  }, [isLoading, updateScale])

  // ── Preview data ─────────────────────────────────────────────────────────────

  const previewData: InvoicePreviewData | null = (() => {
    if (!sale) return null

    if (existingInvoice) {
      const tvaAmount = sale.tva_amount ?? 0
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
          logo_url: existingInvoice.company_logo_url,
          couleur_marque: company?.couleur_marque ?? '#1e40af',
        },
        client: {
          name: existingInvoice.client_name,
          address: existingInvoice.client_address,
          ice: existingInvoice.client_ice,
        },
        items: (existingInvoice.document_items ?? []).map(item => ({
          productName: item.product_name,
          quantity: item.quantity,
          unitPrice: item.unit_price,
          subtotal: item.subtotal,
        })),
        totalHT: existingInvoice.total - tvaAmount,
        tvaRate: sale.tva_rate ?? 0,
        tvaAmount,
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
        logo_url: company?.logo_url ?? null,
        couleur_marque: company?.couleur_marque ?? '#1e40af',
      },
      client: { name: sale.clients?.name ?? null, address: null, ice: null },
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

  // Render the clone inside a clean iframe that has NO stylesheets.
  // html2canvas parses all stylesheets on the document it captures from;
  // the main page's index.css uses oklch() which html2canvas can't parse.
  // By isolating in a blank iframe, html2canvas only sees inline styles (hex colors).
  const doCapture = async (): Promise<HTMLCanvasElement> => {
    const el = scaleWrapRef.current
    if (!el) throw new Error('Aperçu introuvable')

    return await html2canvas(el, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff',
      logging: false,
      width: 794,
      windowWidth: 794,
      onclone: (clonedDoc, clonedEl) => {
        clonedDoc.querySelectorAll('link[rel="stylesheet"], style').forEach(s => s.remove())
        const reset = clonedDoc.createElement('style')
        reset.textContent = '*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}'
        clonedDoc.head.appendChild(reset)
        clonedEl.style.transform = 'none'
        clonedEl.style.width = '794px'
      },
    })
  }

  const handleDownloadPdf = async () => {
    setIsGeneratingPdf(true)
    try {
      const canvas = await doCapture()
      const imgData = canvas.toDataURL('image/png')
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
      const pageW = pdf.internal.pageSize.getWidth()
      const pageH = pdf.internal.pageSize.getHeight()
      // Always fit on exactly one A4 page
      pdf.addImage(imgData, 'PNG', 0, 0, pageW, pageH)
      pdf.save(`${previewData?.invoiceNumber ?? 'facture'}.pdf`)
    } catch (err) {
      console.error('PDF error:', err)
      toast.error('Erreur lors de la génération du PDF')
    } finally {
      setIsGeneratingPdf(false)
    }
  }

  // Print via hidden iframe — avoids popup blocker
  const handlePrint = async () => {
    setIsPrinting(true)
    try {
      const canvas = await doCapture()
      const dataUrl = canvas.toDataURL('image/png')
      const iframe = document.createElement('iframe')
      iframe.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0'
      document.body.appendChild(iframe)
      const doc = iframe.contentWindow?.document
      if (!doc) { document.body.removeChild(iframe); return }
      doc.open()
      doc.write(
        `<!DOCTYPE html><html><head><title>${previewData?.invoiceNumber ?? 'Facture'}</title>` +
        `<style>@page{size:A4;margin:0}html,body{margin:0;padding:0;width:210mm;height:297mm}img{width:210mm;height:297mm;display:block;object-fit:fill}</style></head>` +
        `<body><img src="${dataUrl}"/></body></html>`
      )
      doc.close()
      setTimeout(() => {
        iframe.contentWindow?.print()
        setTimeout(() => { if (document.body.contains(iframe)) document.body.removeChild(iframe) }, 2000)
      }, 300)
    } catch (err) {
      console.error('Print error:', err)
      toast.error("Erreur lors de l'impression")
    } finally {
      setIsPrinting(false)
    }
  }

  const canExport = Boolean(existingInvoice)
  const isWorking = createInvoice.isPending || isGeneratingPdf || isPrinting

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[100vw] sm:max-w-[950px] w-[100vw] sm:w-[95vw] p-0 gap-0 overflow-hidden flex flex-col max-h-[100dvh] sm:max-h-[95vh] rounded-none sm:rounded-lg">
        <DialogHeader className="px-4 sm:px-6 py-3 sm:py-4 border-b shrink-0">
          <DialogTitle className="flex items-center gap-2 text-sm sm:text-base">
            <FileText className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />
            {existingInvoice ? `Facture ${existingInvoice.number}` : 'Aperçu facture — brouillon'}
          </DialogTitle>
        </DialogHeader>

        {/* overflow-x:hidden is critical — prevents content from stretching clientWidth */}
        <div ref={containerRef} className="flex-1 overflow-y-auto overflow-x-hidden bg-gray-100 p-2 sm:p-4">
          {isLoading ? (
            <div className="flex h-40 items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : !previewData ? (
            <div className="text-center text-muted-foreground py-20">Vente introuvable.</div>
          ) : (
            // Outer container: visual footprint of the SCALED preview
            <div
              className="mx-auto shadow-lg overflow-hidden"
              style={{
                width: `${Math.floor(794 * scale)}px`,
                height: `${Math.floor(previewHeight * scale)}px`,
              }}
            >
              {/* Inner: actual InvoicePreview at 794px, scaled down via transform */}
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

        <div className="px-3 sm:px-4 py-2 sm:py-3 border-t bg-background shrink-0 flex items-center justify-between gap-2 sm:gap-3 flex-wrap">
          <p className="text-xs text-muted-foreground">
            {!existingInvoice && !isLoading && 'Le numéro sera attribué à la génération.'}
          </p>
          <div className="flex gap-2 flex-wrap">
            {!existingInvoice && !isLoading && (
              <Button size="sm" onClick={handleGenerate} disabled={isWorking || !previewData}>
                {createInvoice.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Générer la facture
              </Button>
            )}
            <Button size="sm" variant="outline" disabled={!canExport || isWorking} onClick={handlePrint}>
              {isPrinting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Printer className="mr-2 h-4 w-4" />}
              Imprimer
            </Button>
            <Button size="sm" variant="outline" disabled={!canExport || isWorking} onClick={handleDownloadPdf}>
              {isGeneratingPdf ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
              PDF
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
