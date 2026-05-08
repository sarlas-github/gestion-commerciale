import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/shared/PageHeader'
import { SaleForm, type SaleFormValues } from '@/features/sales/SaleForm'
import { useCreateSale } from '@/hooks/useSales'

export const SaleNewPage = () => {
  const navigate = useNavigate()
  const createSale = useCreateSale()

  const handleSubmit = async (values: SaleFormValues) => {
    const sale = await createSale.mutateAsync({
      client_id: values.client_id,
      date: values.date,
      reference: values.reference ?? '',
      note: values.note ?? '',
      tva_rate: values.tva_rate ?? 0,
      items: values.items.map(i => ({
        product_id: i.product_id,
        quantity: Number(i.quantity),
        pieces_count: Number(i.pieces_count),
        unit_price: Number(i.unit_price),
      })),
      payments: values.payments.map(p => ({
        date: p.date,
        amount: Number(p.amount),
        note: p.note ?? '',
        methode_paiement: p.methode_paiement ?? '',
      })),
    })
    navigate(`/sales/${sale.id}/edit`)
  }

  const formId = "sale-new-form"

  return (
    <div className="space-y-6 max-w-3xl pb-12 md:pb-0">
      <PageHeader
        title="Nouvelle vente"
        leftAction={
          <Button variant="ghost" size="icon" onClick={() => navigate('/sales')} className="mr-1 shrink-0">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        }
        actions={
          <div className="hidden md:flex gap-3">
            <Button variant="outline" onClick={() => navigate('/sales')} disabled={createSale.isPending}>
              Annuler
            </Button>
            <Button type="submit" form={formId} disabled={createSale.isPending}>
              Enregistrer
            </Button>
          </div>
        }
      />
      <SaleForm id={formId} onSubmit={handleSubmit} />

      {/* Mobile Sticky Bar */}
      <div className="fixed bottom-0 left-0 right-0 h-16 px-4 bg-card border-t md:hidden flex items-center justify-end gap-3 z-50 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
        <Button variant="outline" className="bg-card" onClick={() => navigate('/sales')} disabled={createSale.isPending}>
          Annuler
        </Button>
        <Button type="submit" form={formId} disabled={createSale.isPending}>
          Enregistrer
        </Button>
      </div>
    </div>
  )
}





