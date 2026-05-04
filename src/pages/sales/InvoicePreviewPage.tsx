import { useRef, useState, useLayoutEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'
import { Loader2, FileText, Printer, Download, ArrowLeft } from 'lucide-react'
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
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false)
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
        // Remove all stylesheets to avoid oklch() parsing errors
        clonedDoc.querySelectorAll('link[rel="stylesheet"], style').forEach(s => s.remove())
        // Re-inject the critical box-sizing reset (lost when stylesheets were removed).
        // Without this, elements with width+padding compute wider → layout shifts.
        const reset = clonedDoc.createElement('style')
        reset.textContent = '*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}'
        clonedDoc.head.appendChild(reset)
        // Reset the scale transform so we capture at 1:1
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
      // Always fit on exactly one A4 page — content is already A4-proportioned
      pdf.addImage(imgData, 'PNG', 0, 0, pageW, pageH)
      pdf.save(`${previewData?.invoiceNumber ?? 'facture'}.pdf`)
    } catch (err) {
      console.error('PDF error:', err)
      toast.error('Erreur lors de la génération du PDF')
    } finally {
      setIsGeneratingPdf(false)
    }
  }

  // Print via hidden iframe
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

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1)
    } else {
      navigate('/sales')
    }
  }

  const canExport = Boolean(existingInvoice)
  const isWorking = createInvoice.isPending || isGeneratingPdf || isPrinting

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
            <span className="hidden sm:inline">Imprimer</span>
            <span className="sm:hidden">Imp.</span>
          </Button>
          <Button size="sm" variant="outline" disabled={!canExport || isWorking} onClick={handleDownloadPdf}>
            {isGeneratingPdf ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Download className="mr-1.5 h-3.5 w-3.5" />}
            PDF
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
