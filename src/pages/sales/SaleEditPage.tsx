import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Loader2, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/shared/PageHeader'
import { SaleForm, type SaleFormValues } from '@/features/sales/SaleForm'
import { useSale, useUpdateSale } from '@/hooks/useSales'
import { useGetSaleInvoice } from '@/hooks/useDocuments'

export const SaleEditPage = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: sale, isLoading } = useSale(id!)
  const updateSale = useUpdateSale()
  const { data: existingInvoice } = useGetSaleInvoice(id)

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
    <div className="space-y-6 max-w-3xl pb-24 md:pb-0">
      <PageHeader
        title={`Vente — ${sale.clients?.name ?? 'Client inconnu'}`}
        leftAction={
          <Button variant="ghost" size="icon" onClick={() => navigate('/sales')} className="mr-1 shrink-0">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        }
        actions={
          <div className="hidden md:flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={() => navigate(`/sales/${id}/invoice`)}>
              <FileText className="mr-2 h-4 w-4" />
              {existingInvoice ? 'Voir facture' : 'Aperçu facture'}
            </Button>
            <Button variant="outline" onClick={() => navigate(-1)} disabled={updateSale.isPending}>
              Annuler
            </Button>
            <Button type="submit" form={formId} disabled={updateSale.isPending}>
              Enregistrer
            </Button>
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
      />

      {/* Mobile Sticky Bar */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-card border-t md:hidden flex justify-end gap-3 z-50 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
        <Button variant="outline" size="sm" onClick={() => navigate(`/sales/${id}/invoice`)} className="bg-card">
          <FileText className="mr-1.5 h-4 w-4" />
          {existingInvoice ? 'Facture' : 'Aperçu'}
        </Button>
        <Button variant="outline" className="bg-card" onClick={() => navigate(-1)} disabled={updateSale.isPending}>
          Annuler
        </Button>
        <Button type="submit" form={formId} disabled={updateSale.isPending}>
          Enregistrer
        </Button>
      </div>
    </div>
  )
}
