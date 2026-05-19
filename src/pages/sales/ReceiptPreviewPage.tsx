import { useRef, useState, useEffect, useLayoutEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { Loader2, Printer, ArrowLeft } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/shared/PageHeader'
import { useSale } from '@/hooks/useSales'
import { useCompany } from '@/hooks/useCompany'
import { useClientPayment } from '@/hooks/useClientPayments'
import { useGetPaymentReceipt, useCreateReceipt } from '@/hooks/useDocuments'
import { ReceiptPreview } from '@/features/sales/ReceiptPreview'
import type { ReceiptPreviewData } from '@/features/sales/ReceiptPreview'

export const ReceiptPreviewPage = () => {
  const { id: saleId, paymentId } = useParams<{ id: string; paymentId: string }>()
  const navigate = useNavigate()

  const scaleWrapRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)
  const [previewHeight, setPreviewHeight] = useState(1400)
  const [isPrinting, setIsPrinting] = useState(false)

  const queryClient = useQueryClient()
  const { data: sale, isLoading: loadingSale, isFetching: fetchingSale } = useSale(saleId ?? '')
  const { data: company, isLoading: loadingCompany } = useCompany()
  const { data: payment, isLoading: loadingPayment } = useClientPayment(paymentId)
  const { data: existingReceipt, isLoading: loadingReceipt } = useGetPaymentReceipt(paymentId)
  const createReceipt = useCreateReceipt()

  // Force a fresh fetch on mount so draft preview never shows stale cached data
  useEffect(() => {
    if (saleId) {
      queryClient.invalidateQueries({ queryKey: ['sales', saleId] })
    }
  }, [saleId, queryClient])

  // In draft mode, keep the spinner while the fresh sale data is being fetched
  const isLoading = loadingSale || loadingCompany || loadingPayment || loadingReceipt || (!loadingReceipt && !existingReceipt && fetchingSale)

  const updateScale = useCallback(() => {
    if (!scaleWrapRef.current) return
    const container = containerRef.current
    const available = container ? container.clientWidth - 32 : window.innerWidth - 64
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

  const previewData: ReceiptPreviewData | null = (() => {
    if (!sale || !payment) return null

    if (existingReceipt) {
      return {
        receiptNumber: existingReceipt.number,
        date: existingReceipt.date,
        company: {
          name: existingReceipt.company_name,
          address: existingReceipt.company_address,
          phone: existingReceipt.company_phone,
          email: existingReceipt.company_email,
          logo_url: existingReceipt.company_logo_url,
          couleur_marque: existingReceipt.company_couleur_marque ?? '#1e40af',
        },
        items: (existingReceipt.document_items ?? []).map(item => ({
          productName: item.product_name,
          quantity: item.quantity,
          unitPrice: item.unit_price,
          subtotal: item.subtotal,
        })),
        totalHT: existingReceipt.total - existingReceipt.tva_amount,
        tvaRate: existingReceipt.tva_rate,
        tvaAmount: existingReceipt.tva_amount,
        totalTTC: existingReceipt.total,
        modePaiement: existingReceipt.mode_paiement,
      }
    }

    // Brouillon — données live
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
      receiptNumber: undefined,
      date: payment.date,
      company: {
        name: company?.name ?? null,
        address: company?.address ?? null,
        phone: company?.phone ?? null,
        email: company?.email ?? null,
        logo_url: company?.logo_url ?? null,
        couleur_marque: company?.couleur_marque ?? '#1e40af',
      },
      items,
      totalHT: sale.total - tvaAmount,
      tvaRate,
      tvaAmount,
      totalTTC: sale.total,
      modePaiement: payment.methode_paiement ?? null,
    }
  })()

  // ── Actions ──────────────────────────────────────────────────────────────────

  const handleGenerate = async () => {
    if (!sale || !saleId || !paymentId || !payment) return
    await createReceipt.mutateAsync({
      payment_id: paymentId,
      sale_id: saleId,
      client_id: sale.client_id,
      date: payment.date,
      total: sale.total,
      paid: payment.amount,
      tva_rate: sale.tva_rate ?? 0,
      tva_amount: sale.tva_amount ?? 0,
      mode_paiement: payment.methode_paiement ?? null,
      items: (sale.sale_items ?? []).map(item => ({
        product_id: item.product_id,
        product_name: item.products?.name ?? 'Produit inconnu',
        quantity: item.quantity * (item.pieces_count || 1),
        unit_price: item.unit_price,
      })),
    })
  }

  const openPrintDialog = async () => {
    const el = document.getElementById('receipt-preview-content')
    if (!el) throw new Error('Aperçu introuvable')

    const iframe = document.createElement('iframe')
    iframe.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0'
    document.body.appendChild(iframe)
    const doc = iframe.contentWindow?.document
    if (!doc) { document.body.removeChild(iframe); return }
    doc.open()
    doc.write(
      `<!DOCTYPE html><html><head><title>${previewData?.receiptNumber ?? 'Reçu'}</title>` +
      `<style>` +
      `*,*::before,*::after{box-sizing:border-box}` +
      `@page{size:A4;margin:0}` +
      `html,body{margin:0;padding:0;width:210mm}` +
      `#receipt-preview-content{width:210mm!important}` +
      `*{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}` +
      `</style></head>` +
      `<body>${el.outerHTML}</body></html>`
    )
    doc.close()
    const fileName = previewData?.receiptNumber ?? 'Reçu'
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
    if (window.history.length > 1) navigate(-1)
    else navigate('/sales')
  }

  const canExport = Boolean(existingReceipt)
  const isWorking = createReceipt.isPending || isPrinting

  const waPhone = (() => {
    const raw = sale?.clients?.phone ?? null
    if (!raw) return null
    const d = raw.replace(/\D/g, '')
    if (d.startsWith('0') && d.length === 10) return '212' + d.slice(1)
    if (d.length === 9) return '212' + d
    if (d.startsWith('212') && d.length === 12) return d
    return null
  })()
  const waMessage = sale?.clients?.name
    ? `Bonjour Mme/M. ${sale.clients.name},\n\nVeuillez trouver ci-joint votre reçu de paiement.\nN'hésitez pas à nous contacter pour toute question.\n\nMerci pour votre confiance.`
    : ''
  const waUrl = waPhone && waMessage ? `https://wa.me/${waPhone}?text=${encodeURIComponent(waMessage)}` : null

  return (
    <div className="flex flex-col h-full -m-4 lg:-m-6">
      <PageHeader
        title={existingReceipt ? `Reçu ${existingReceipt.number}` : 'Aperçu reçu — brouillon'}
        leftAction={
          <Button variant="ghost" size="icon" onClick={handleBack} className="mr-1 shrink-0">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        }
        actions={
          !isLoading && (
            <div className="hidden md:flex items-center gap-3">
              {!existingReceipt && (
                <Button size="sm" onClick={handleGenerate} disabled={isWorking || !previewData}>
                  {createReceipt.isPending && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                  Générer
                </Button>
              )}

              <Button size="sm" variant="outline" className="bg-card" disabled={!canExport || isWorking} onClick={handlePrint}>
                {isPrinting ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Printer className="mr-1.5 h-3.5 w-3.5" />}
                Imprimer / PDF
              </Button>

              <Button
                size="sm"
                variant="outline"
                disabled={!canExport || !waUrl}
                onClick={() => waUrl && window.open(waUrl, '_blank', 'noopener,noreferrer')}
                className="border-[#25D366] text-[#25D366] hover:bg-[#25D366]/10 hover:text-[#25D366] disabled:border-input disabled:text-muted-foreground bg-card"
              >
                WhatsApp
              </Button>
            </div>
          )
        }
      />

      {/* Preview area */}
      <div ref={containerRef} className="flex-1 overflow-y-auto overflow-x-hidden bg-gray-100 p-4">
        {isLoading ? (
          <div className="flex h-40 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : !previewData ? (
          <div className="text-center text-muted-foreground py-20">Paiement introuvable.</div>
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
              <ReceiptPreview data={previewData} />
            </div>
          </div>
        )}
      </div>

      {!existingReceipt && !isLoading && (
        <div className="sm:hidden shrink-0 px-4 py-2 border-t bg-background">
          <p className="text-xs text-muted-foreground text-center">
            Le numéro sera attribué à la génération.
          </p>
        </div>
      )}

      {/* Mobile Sticky Bar */}
      <div className="fixed bottom-0 left-0 right-0 h-16 px-4 bg-card border-t md:hidden flex items-center justify-end gap-3 z-50 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
        {!existingReceipt && (
          <Button size="sm" onClick={handleGenerate} disabled={isWorking || !previewData}>
            {createReceipt.isPending && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
            Gén.
          </Button>
        )}

        <Button size="sm" variant="outline" className="bg-card" disabled={!canExport || isWorking} onClick={handlePrint} title="Imprimer / PDF">
          {isPrinting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Printer className="h-4 w-4" />}
        </Button>

        <Button
          size="icon"
          variant="outline"
          disabled={!canExport || !waUrl}
          onClick={() => waUrl && window.open(waUrl, '_blank', 'noopener,noreferrer')}
          className="border-[#25D366] text-[#25D366] hover:bg-[#25D366]/10 hover:text-[#25D366] disabled:border-input disabled:text-muted-foreground bg-card"
          title="WhatsApp"
        >
          <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
          </svg>
        </Button>
      </div>
    </div>
  )
}
