import { useState } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import { ArrowLeft, Loader2, FileText } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/shared/PageHeader'
import { SaleForm, type SaleFormValues } from '@/features/sales/SaleForm'
import { useSale, useUpdateSale } from '@/hooks/useSales'
import { useGetSaleInvoice } from '@/hooks/useDocuments'

export const SaleEditPage = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const backTo = (location.state as { from?: string } | null)?.from ?? '/sales'
  const [isFormDirty, setIsFormDirty] = useState(false)
  const { data: sale, isLoading } = useSale(id!)
  const updateSale = useUpdateSale()
  const { data: existingInvoice } = useGetSaleInvoice(id)

  const handleOpenApercu = () => {
    if (isFormDirty && !existingInvoice) {
      toast.warning('Enregistrez vos modifications avant de prévisualiser')
      return
    }
    navigate(`/sales/${id}/invoice`)
  }

  const handleSubmit = async (values: SaleFormValues) => {
    await updateSale.mutateAsync({
      id: id!,
      ...values,
    })
  }

  if (isLoading) {
    return (
      <div className="flex h-60 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!sale) {
    return <div className="text-center text-muted-foreground py-20">Vente introuvable.</div>
  }

  const formId = "sale-edit-form"

  return (
    <div className="space-y-6 max-w-3xl pb-12 md:pb-0">
      <PageHeader
        title={`Vente — ${sale.clients?.name ?? 'Client inconnu'}`}
        leftAction={
          <Button variant="ghost" size="icon" onClick={() => navigate(backTo)} className="mr-1 shrink-0">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        }
        actions={
          <div className="hidden md:flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={handleOpenApercu}>
              <FileText className="mr-2 h-4 w-4" />
              {existingInvoice ? 'Voir facture' : 'Aperçu facture'}
            </Button>
            {sale.status !== 'cancelled' && (
              <>
                <Button variant="outline" onClick={() => navigate(backTo)} disabled={updateSale.isPending}>
                  Annuler
                </Button>
                <Button type="submit" form={formId} disabled={updateSale.isPending}>
                  Enregistrer
                </Button>
              </>
            )}
          </div>
        }
      />
      <SaleForm
        id={formId}
        key={sale.id}
        existing={sale}
        onSubmit={handleSubmit}
        hasInvoice={Boolean(existingInvoice)}
        savedPayments={sale.client_payments ?? []}
        onDirtyChange={setIsFormDirty}
      />

      {/* Mobile Sticky Bar */}
      <div className="fixed bottom-0 left-0 right-0 h-16 px-4 bg-card border-t md:hidden flex items-center justify-end gap-3 z-50 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
        <Button variant="outline" size="sm" onClick={handleOpenApercu} className="bg-card">
          <FileText className="mr-1.5 h-4 w-4" />
          {existingInvoice ? 'Facture' : 'Aperçu'}
        </Button>
        {sale.status !== 'cancelled' && (
          <>
            <Button variant="outline" className="bg-card" onClick={() => navigate(-1)} disabled={updateSale.isPending}>
              Annuler
            </Button>
            <Button type="submit" form={formId} disabled={updateSale.isPending}>
              Enregistrer
            </Button>
          </>
        )}
      </div>
    </div>
  )
}
